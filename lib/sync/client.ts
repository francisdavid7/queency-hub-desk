import type { Table } from "dexie";

import { db } from "@/db/db";
import { getCashierSession, setCashierSession } from "@/lib/auth/cashier-session";
import { deleteMeta, getMeta, setMeta } from "@/lib/meta";
import type {
  PullCursors,
  PullResponse,
  PushRequest,
  PushResponse,
  PushResult,
} from "@/lib/sync/contract";
import type { DeviceRegistration } from "@/types/meta";

export type SyncPhase = "idle" | "syncing" | "offline" | "error" | "unauthorised";

export interface SyncState {
  phase: SyncPhase;
  lastSyncAt?: string;
  error?: string;
}

const BATCH_SIZE = 100;
const MAX_PUSH_ROUNDS = 25;

let state: SyncState = { phase: "idle" };
const listeners = new Set<() => void>();
let running: Promise<void> | null = null;

function setState(next: Partial<SyncState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

export const getSyncState = () => state;
export function subscribeSyncState(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

class UnauthorisedError extends Error {}
class NetworkError extends Error {}

async function api<T>(device: DeviceRegistration, path: string, init?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${device.token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
  } catch {
    throw new NetworkError("Can't reach the server.");
  }
  if (response.status === 401) throw new UnauthorisedError("Till access was revoked.");
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Sync failed (${response.status}).`);
  }
  return (await response.json()) as T;
}

/** Undefined → null so optional fields serialise consistently. */
const orNull = <T>(value: T | undefined) => (value === undefined ? null : value);

async function buildPushBatch(): Promise<PushRequest> {
  const [customers, services, receipts, payments] = await Promise.all([
    db.customers.where("syncStatus").equals("pending").limit(BATCH_SIZE).toArray(),
    db.services.where("syncStatus").equals("pending").limit(BATCH_SIZE).toArray(),
    db.receipts.where("syncStatus").equals("pending").limit(BATCH_SIZE).toArray(),
    db.payments.where("syncStatus").equals("pending").limit(BATCH_SIZE * 2).toArray(),
  ]);
  const items = await db.receiptItems
    .where("receiptId")
    .anyOf(receipts.map((receipt) => receipt.id))
    .toArray();

  return {
    customers: customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: orNull(customer.email),
      deletedAt: orNull(customer.deletedAt),
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    })),
    services: services.map((service) => ({
      id: service.id,
      name: service.name,
      category: service.category,
      price: service.price,
      deletedAt: orNull(service.deletedAt),
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    })),
    receipts: receipts.map((receipt) => ({
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      customerId: orNull(receipt.customerId),
      cashierId: orNull(receipt.cashierId),
      date: receipt.date,
      subtotal: receipt.subtotal ?? receipt.total,
      discount: receipt.discount ?? 0,
      total: receipt.total,
      paymentMethod: receipt.paymentMethod,
      status: receipt.status,
      notes: orNull(receipt.notes),
      voidedAt: orNull(receipt.voidedAt),
      voidedById: orNull(receipt.voidedById),
      voidReason: orNull(receipt.voidReason),
      createdAt: receipt.createdAt,
      updatedAt: receipt.updatedAt,
      items: items
        .filter((item) => item.receiptId === receipt.id)
        .map((item) => ({
          id: item.id,
          serviceId: item.serviceId,
          // Very old receipts may predate the name/category snapshot.
          serviceName: item.serviceName?.trim() || "Service",
          serviceCategory: item.serviceCategory?.trim() || "General",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          createdAt: item.createdAt,
        })),
    })),
    payments: payments.map((payment) => ({
      id: payment.id,
      receiptId: payment.receiptId,
      amount: payment.amount,
      method: payment.method,
      cashierId: orNull(payment.cashierId),
      receivedAt: payment.receivedAt,
      createdAt: payment.createdAt,
    })),
  };
}

type SyncedTable = "customers" | "services" | "receipts" | "payments";
interface SyncTracked {
  id: string;
  updatedAt: string;
  syncStatus: string;
  syncedAt?: string;
  syncError?: string;
}

/** Apply server verdicts, ignoring records edited locally since they were sent. */
async function applyPushResults(
  table: SyncedTable,
  sent: Array<{ id: string; updatedAt?: string }>,
  results: PushResult[],
) {
  const sentUpdatedAt = new Map(sent.map((record) => [record.id, record.updatedAt]));
  const now = new Date().toISOString();
  let synced = 0;

  const store = db[table] as unknown as Table<SyncTracked, string>;
  await db.transaction("rw", store, db.receiptItems, async () => {
    for (const result of results) {
      const updatedAt = sentUpdatedAt.get(result.id);
      await store
        .where("id")
        .equals(result.id)
        .modify((record) => {
          if (updatedAt !== undefined && record.updatedAt !== updatedAt) return;
          if (result.ok) {
            record.syncStatus = "synced";
            record.syncedAt = now;
            delete record.syncError;
          } else {
            record.syncStatus = result.retryable ? "pending" : "failed";
            record.syncError = result.error;
          }
        });
      if (result.ok) {
        synced += 1;
        if (table === "receipts") {
          await db.receiptItems
            .where("receiptId")
            .equals(result.id)
            .modify({ syncStatus: "synced", syncedAt: now });
        }
      }
    }
  });
  return synced;
}

async function pushPending(device: DeviceRegistration) {
  for (let round = 0; round < MAX_PUSH_ROUNDS; round += 1) {
    const batch = await buildPushBatch();
    const total =
      batch.customers.length + batch.services.length + batch.receipts.length + batch.payments.length;
    if (total === 0) return;

    const response = await api<PushResponse>(device, "/api/sync/push", {
      method: "POST",
      body: JSON.stringify(batch),
    });

    const payments = await db.payments.bulkGet(batch.payments.map((payment) => payment.id));
    const synced =
      (await applyPushResults("customers", batch.customers, response.customers)) +
      (await applyPushResults("services", batch.services, response.services)) +
      (await applyPushResults("receipts", batch.receipts, response.receipts)) +
      (await applyPushResults(
        "payments",
        payments.filter((payment) => payment !== undefined),
        response.payments,
      ));

    // Only retryable failures left (e.g. a payment waiting on its receipt).
    if (synced === 0) return;
  }
}

async function applyPull(page: PullResponse) {
  const now = new Date().toISOString();
  await db.transaction(
    "rw",
    [db.customers, db.services, db.receipts, db.receiptItems, db.payments, db.meta, db.users],
    async () => {
      for (const remote of page.customers) {
        const local = await db.customers.get(remote.id);
        if (local && local.syncStatus !== "synced" && local.updatedAt > remote.updatedAt) continue;
        await db.customers.put({
          id: remote.id,
          name: remote.name,
          phone: remote.phone,
          email: remote.email ?? undefined,
          deletedAt: remote.deletedAt ?? undefined,
          createdAt: remote.createdAt,
          updatedAt: remote.updatedAt,
          syncStatus: "synced",
          syncedAt: now,
        });
      }

      for (const remote of page.services) {
        const local = await db.services.get(remote.id);
        if (local && local.syncStatus !== "synced" && local.updatedAt > remote.updatedAt) continue;
        await db.services.put({
          id: remote.id,
          name: remote.name,
          category: remote.category,
          price: remote.price,
          deletedAt: remote.deletedAt ?? undefined,
          createdAt: remote.createdAt,
          updatedAt: remote.updatedAt,
          syncStatus: "synced",
          syncedAt: now,
        });
      }

      for (const remote of page.receipts) {
        const local = await db.receipts.get(remote.id);
        // Local changes not yet accepted by the server win until they sync.
        if (local && local.syncStatus !== "synced") continue;
        await db.receipts.put({
          id: remote.id,
          receiptNumber: remote.receiptNumber,
          customerId: remote.customerId ?? undefined,
          cashierId: remote.cashierId ?? undefined,
          deviceId: remote.deviceId ?? undefined,
          date: remote.date,
          subtotal: remote.subtotal,
          discount: remote.discount,
          total: remote.total,
          amountPaid: remote.amountPaid,
          notes: remote.notes ?? undefined,
          paymentMethod: remote.paymentMethod,
          status: remote.status,
          voidedAt: remote.voidedAt ?? undefined,
          voidedById: remote.voidedById ?? undefined,
          voidReason: remote.voidReason ?? undefined,
          createdAt: remote.createdAt,
          updatedAt: remote.updatedAt,
          syncStatus: "synced",
          syncedAt: now,
        });
        await db.receiptItems.bulkPut(
          remote.items.map((item) => ({
            ...item,
            receiptId: remote.id,
            serviceId: item.serviceId ?? `manual-${item.id}`,
            updatedAt: item.createdAt,
            syncStatus: "synced" as const,
            syncedAt: now,
          })),
        );
        await db.payments.bulkPut(
          remote.payments.map((payment) => ({
            ...payment,
            cashierId: payment.cashierId ?? undefined,
            updatedAt: payment.createdAt,
            syncStatus: "synced" as const,
            syncedAt: now,
          })),
        );
      }

      // Deactivated or removed staff lose their offline sign-in on this till.
      const activeIds = new Set(page.staff.filter((member) => member.isActive).map((m) => m.id));
      await db.users.filter((user) => !activeIds.has(user.id)).delete();

      await db.meta.bulkPut([
        { key: "pullCursors", value: page.cursors },
        { key: "staff", value: page.staff },
        { key: "businessSettings", value: page.settings },
      ]);
    },
  );
}

async function pullChanges(device: DeviceRegistration) {
  let cursors: PullCursors = (await getMeta("pullCursors")) ?? {
    customers: null,
    services: null,
    receipts: null,
  };
  for (let page = 0; page < 100; page += 1) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(cursors)) {
      if (value) params.set(key, value);
    }
    if (page > 0) params.set("page", "next");
    const response = await api<PullResponse>(device, `/api/sync/pull?${params}`);
    await applyPull(response);
    cursors = response.cursors;
    if (!response.hasMore) return;
  }
}

async function runSync() {
  const device = await getMeta("device");
  if (!device) {
    setState({ phase: "error", error: "This till isn't registered." });
    return;
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    setState({ phase: "offline", error: undefined });
    return;
  }

  setState({ phase: "syncing", error: undefined });
  try {
    await pushPending(device);
    await pullChanges(device);
    // Sign out a cashier whose account was deactivated while they were in.
    const session = getCashierSession();
    if (session && !(await db.users.get(session.userId))) setCashierSession(null);
    const lastSyncAt = new Date().toISOString();
    await setMeta("lastSyncAt", lastSyncAt);
    setState({ phase: "idle", lastSyncAt });
  } catch (error) {
    if (error instanceof NetworkError) {
      setState({ phase: "offline" });
    } else if (error instanceof UnauthorisedError) {
      // The till was revoked by an admin: forget its token and lock it.
      await deleteMeta("device");
      setCashierSession(null);
      setState({ phase: "unauthorised", error: error.message });
    } else {
      setState({
        phase: "error",
        error: error instanceof Error ? error.message : "Sync failed.",
      });
    }
  }
}

/** Push local changes, then pull server changes. Concurrent calls share one run. */
export function syncNow() {
  running ??= runSync().finally(() => {
    running = null;
  });
  return running;
}
