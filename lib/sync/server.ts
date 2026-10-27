import "server-only";

import {
  Prisma,
  type Device,
  type PAYMENTMETHOD,
  type RECEIPTSTATUS,
} from "@/app/generated/prisma/client";
import { audit } from "@/lib/audit";
import { RECEIPT_PREFIX } from "@/lib/receipt-number";
import { roundMoney } from "@/lib/money";
import prisma from "@/lib/prisma/prisma";
import { getBusinessSettings } from "@/lib/settings";
import type {
  PullCursors,
  PullResponse,
  PushRequest,
  PushResponse,
  PushResult,
  SyncReceipt,
} from "@/lib/sync/contract";

const MONEY_TOLERANCE = 0.01;
const PULL_LIMIT = 500;
/** Re-read a few seconds back so rows committed out of order aren't missed. */
const PULL_OVERLAP_MS = 5_000;

const toNumber = (value: Prisma.Decimal | number) => Number(value.toString());
const iso = (value: Date | null) => (value ? value.toISOString() : null);

const STATUS_FROM_DB: Record<RECEIPTSTATUS, SyncReceipt["status"]> = {
  COMPLETED: "Completed",
  PENDING: "Pending",
  CANCELLED: "Cancelled",
};

const ok = (id: string): PushResult => ({ id, ok: true });
const fail = (id: string, error: string, retryable = false): PushResult => ({
  id,
  ok: false,
  error,
  retryable,
});

/** Recompute line amounts and totals; the server never trusts client math. */
export function verifyReceiptTotals(receipt: SyncReceipt): string | null {
  let subtotal = 0;
  for (const item of receipt.items) {
    const amount = roundMoney(item.quantity * item.unitPrice);
    if (Math.abs(amount - item.amount) > MONEY_TOLERANCE) {
      return `Line "${item.serviceName}" amount doesn't match quantity × price.`;
    }
    subtotal += amount;
  }
  subtotal = roundMoney(subtotal);
  if (Math.abs(subtotal - receipt.subtotal) > MONEY_TOLERANCE) {
    return "Subtotal doesn't match the line items.";
  }
  if (receipt.discount > subtotal + MONEY_TOLERANCE) {
    return "Discount is larger than the subtotal.";
  }
  if (Math.abs(roundMoney(subtotal - receipt.discount) - receipt.total) > MONEY_TOLERANCE) {
    return "Total doesn't equal subtotal minus discount.";
  }
  return null;
}

async function existingUserIds(ids: Array<string | null | undefined>) {
  const unique = [...new Set(ids.filter((value): value is string => Boolean(value)))];
  if (unique.length === 0) return new Map<string, "ADMIN" | "CASHIER">();
  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, role: true },
  });
  return new Map(users.map((user) => [user.id, user.role]));
}

/** Recalculate paid amount and status from the payment ledger. */
export async function refreshReceiptBalance(tx: Prisma.TransactionClient, receiptId: string) {
  await lockReceipt(tx, receiptId);
  const receipt = await tx.receipt.findUnique({
    where: { id: receiptId },
    include: { payments: { orderBy: { receivedAt: "asc" } } },
  });
  if (!receipt) return;
  const amountPaid = roundMoney(
    receipt.payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0),
  );
  const status: RECEIPTSTATUS = receipt.voidedAt
    ? "CANCELLED"
    : amountPaid + MONEY_TOLERANCE >= toNumber(receipt.total)
      ? "COMPLETED"
      : "PENDING";
  await tx.receipt.update({
    where: { id: receiptId },
    data: {
      amountPaid,
      status,
      paymentMethod: receipt.payments[0]?.method ?? receipt.paymentMethod,
    },
  });
}

/**
 * Lock the receipt row for the rest of the transaction so concurrent payments
 * or voids on the same receipt are applied one at a time (no lost updates).
 */
async function lockReceipt(tx: Prisma.TransactionClient, receiptId: string) {
  await tx.$queryRaw`SELECT id FROM "Receipt" WHERE id = ${receiptId} FOR UPDATE`;
}

/** Client clocks may drift a little; anything further ahead is rejected. */
const MAX_CLOCK_SKEW_MS = 10 * 60 * 1000;
const isFromFuture = (...dates: Array<string | null | undefined>) =>
  dates.some((date) => date && new Date(date).getTime() > Date.now() + MAX_CLOCK_SKEW_MS);
const FUTURE_ERROR = "The till's clock is ahead of the server. Check the PC's date and time.";

/** Receipts made before per-till numbering: QFLC-<epoch ms>-<6 chars>. */
const LEGACY_RECEIPT_NUMBER = /^QFLC-\d{13}-[A-Z0-9]{6}$/;

async function pushReceipt(
  receipt: SyncReceipt,
  device: Device,
  roles: Map<string, "ADMIN" | "CASHIER">,
): Promise<PushResult> {
  const existing = await prisma.receipt.findUnique({ where: { id: receipt.id } });

  // Voids are never accepted over sync: sync authenticates the till, not the
  // person. They go through /api/receipts/void with the admin's password.
  if ((receipt.voidedAt || receipt.voidedById) && !existing?.voidedAt) {
    return fail(receipt.id, "Voids must be confirmed online by an administrator.");
  }
  if (isFromFuture(receipt.date, receipt.createdAt, receipt.updatedAt)) {
    return fail(receipt.id, FUTURE_ERROR, true);
  }

  if (existing) {
    // Items, amounts and attribution are immutable once stored.
    return existing.deviceId === device.id
      ? ok(receipt.id)
      : fail(receipt.id, "This receipt belongs to another till.");
  }

  const ownPrefix = `${RECEIPT_PREFIX}-${device.code}-`;
  if (
    !receipt.receiptNumber.startsWith(ownPrefix) &&
    !LEGACY_RECEIPT_NUMBER.test(receipt.receiptNumber)
  ) {
    return fail(receipt.id, `Receipt numbers from this till must start with ${ownPrefix}.`);
  }

  const totalsError = verifyReceiptTotals(receipt);
  if (totalsError) {
    await audit("receipt.rejected", {
      entityType: "Receipt",
      entityId: receipt.id,
      details: { receiptNumber: receipt.receiptNumber, deviceId: device.id, error: totalsError },
    });
    return fail(receipt.id, totalsError);
  }
  const numberTaken = await prisma.receipt.findUnique({
    where: { receiptNumber: receipt.receiptNumber },
    select: { id: true },
  });
  if (numberTaken) {
    return fail(receipt.id, `Receipt number ${receipt.receiptNumber} is already used.`);
  }

  const customerExists = receipt.customerId
    ? Boolean(await prisma.customer.findUnique({ where: { id: receipt.customerId } }))
    : false;

  await prisma.$transaction(async (tx) => {
    await tx.receipt.create({
      data: {
        id: receipt.id,
        receiptNumber: receipt.receiptNumber,
        customerId: customerExists ? receipt.customerId : null,
        cashierId: receipt.cashierId && roles.has(receipt.cashierId) ? receipt.cashierId : null,
        // Attribute to the authenticated till, not whatever the client claims.
        deviceId: device.id,
        date: new Date(receipt.date),
        subtotal: receipt.subtotal,
        discount: receipt.discount,
        total: receipt.total,
        paymentMethod: receipt.paymentMethod,
        // Recomputed from payments by refreshReceiptBalance.
        status: "PENDING",
        notes: receipt.notes ?? null,
        createdAt: new Date(receipt.createdAt),
        updatedAt: new Date(receipt.updatedAt),
        items: {
          create: receipt.items.map((item) => ({
            id: item.id,
            serviceId: item.serviceId?.startsWith("manual-") ? null : (item.serviceId ?? null),
            serviceName: item.serviceName,
            serviceCategory: item.serviceCategory,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: roundMoney(item.quantity * item.unitPrice),
            createdAt: new Date(item.createdAt),
          })),
        },
      },
    });
    await refreshReceiptBalance(tx, receipt.id);
  });
  return ok(receipt.id);
}

export type VoidResult =
  | { ok: true; receipt: { id: string; receiptNumber: string; voidedAt: Date; voidReason: string } }
  | { ok: false; error: string; status: number };

/** Void a stored receipt on behalf of a verified admin (web, or till override). */
export async function voidReceiptOnServer(
  receiptId: string,
  adminId: string,
  reason: string,
  source: "web" | "till",
  ipAddress?: string | null,
): Promise<VoidResult> {
  const trimmed = reason.trim();
  if (trimmed.length < 3) return { ok: false, error: "Enter a reason for voiding.", status: 400 };

  const voidedAt = new Date();
  const outcome = await prisma.$transaction(
    async (tx): Promise<{ error: string; status: number } | { receiptNumber: string }> => {
      const found = await tx.receipt.findUnique({ where: { id: receiptId }, select: { id: true } });
      if (!found) return { error: "Receipt not found on the server. Sync the till and try again.", status: 404 };
      await lockReceipt(tx, receiptId);
      const receipt = await tx.receipt.findUniqueOrThrow({ where: { id: receiptId } });
      if (receipt.voidedAt) return { error: "This receipt is already voided.", status: 409 };
      await tx.receipt.update({
        where: { id: receiptId },
        data: { voidedAt, voidedById: adminId, voidReason: trimmed, updatedAt: voidedAt },
      });
      await refreshReceiptBalance(tx, receiptId);
      return { receiptNumber: receipt.receiptNumber };
    },
  );
  if ("error" in outcome) return { ok: false, ...outcome };

  await audit("receipt.voided", {
    actorId: adminId,
    entityType: "Receipt",
    entityId: receiptId,
    details: { receiptNumber: outcome.receiptNumber, reason: trimmed, source },
    ipAddress,
  });
  return {
    ok: true,
    receipt: { id: receiptId, receiptNumber: outcome.receiptNumber, voidedAt, voidReason: trimmed },
  };
}

export async function handlePush(body: PushRequest, device: Device): Promise<PushResponse> {
  const response: PushResponse = { customers: [], services: [], receipts: [], payments: [] };

  // Customers and services: last write wins on the client's updatedAt.
  for (const customer of body.customers) {
    if (isFromFuture(customer.updatedAt, customer.createdAt, customer.deletedAt)) {
      response.customers.push(fail(customer.id, FUTURE_ERROR, true));
      continue;
    }
    const existing = await prisma.customer.findUnique({
      where: { id: customer.id },
      select: { updatedAt: true },
    });
    if (!existing || existing.updatedAt < new Date(customer.updatedAt)) {
      const data = {
        name: customer.name,
        phone: customer.phone,
        email: customer.email || null,
        deletedAt: customer.deletedAt ? new Date(customer.deletedAt) : null,
        updatedAt: new Date(customer.updatedAt),
      };
      await prisma.customer.upsert({
        where: { id: customer.id },
        create: { id: customer.id, createdAt: new Date(customer.createdAt), ...data },
        update: data,
      });
    }
    response.customers.push(ok(customer.id));
  }

  for (const service of body.services) {
    if (isFromFuture(service.updatedAt, service.createdAt, service.deletedAt)) {
      response.services.push(fail(service.id, FUTURE_ERROR, true));
      continue;
    }
    const existing = await prisma.service.findUnique({
      where: { id: service.id },
      select: { updatedAt: true },
    });
    if (!existing || existing.updatedAt < new Date(service.updatedAt)) {
      const data = {
        name: service.name,
        category: service.category,
        price: service.price,
        deletedAt: service.deletedAt ? new Date(service.deletedAt) : null,
        updatedAt: new Date(service.updatedAt),
      };
      await prisma.service.upsert({
        where: { id: service.id },
        create: { id: service.id, createdAt: new Date(service.createdAt), ...data },
        update: data,
      });
    }
    response.services.push(ok(service.id));
  }

  const roles = await existingUserIds([
    ...body.receipts.map((receipt) => receipt.cashierId),
    ...body.payments.map((payment) => payment.cashierId),
  ]);

  for (const receipt of body.receipts) {
    try {
      response.receipts.push(await pushReceipt(receipt, device, roles));
    } catch (error) {
      console.error("Failed to sync receipt", receipt.id, error);
      response.receipts.push(fail(receipt.id, "Server error while saving receipt.", true));
    }
  }

  // Payments are append-only; replays of a known id are acknowledged.
  for (const payment of body.payments) {
    try {
      if (isFromFuture(payment.receivedAt, payment.createdAt)) {
        response.payments.push(fail(payment.id, FUTURE_ERROR, true));
        continue;
      }
      const result = await prisma.$transaction(async (tx): Promise<PushResult> => {
        const known = await tx.payment.findUnique({
          where: { id: payment.id },
          select: { receiptId: true },
        });
        if (known) {
          return known.receiptId === payment.receiptId
            ? ok(payment.id)
            : fail(payment.id, "Payment id already used on another receipt.");
        }
        const found = await tx.receipt.findUnique({
          where: { id: payment.receiptId },
          select: { id: true },
        });
        if (!found) return fail(payment.id, "Receipt not synced yet.", true);

        await lockReceipt(tx, payment.receiptId);
        const receipt = await tx.receipt.findUniqueOrThrow({
          where: { id: payment.receiptId },
          include: { payments: { select: { amount: true } } },
        });
        if (receipt.deviceId !== device.id) {
          return fail(payment.id, "This receipt belongs to another till.");
        }
        if (receipt.voidedAt) return fail(payment.id, "This receipt has been voided.");
        const paidSoFar = receipt.payments.reduce((sum, p) => sum + toNumber(p.amount), 0);
        if (receipt.payments.length > 0 && paidSoFar + MONEY_TOLERANCE >= toNumber(receipt.total)) {
          return fail(payment.id, "This receipt is already fully paid.");
        }

        await tx.payment.create({
          data: {
            id: payment.id,
            receiptId: payment.receiptId,
            amount: payment.amount,
            method: payment.method as PAYMENTMETHOD,
            cashierId: payment.cashierId && roles.has(payment.cashierId) ? payment.cashierId : null,
            receivedAt: new Date(payment.receivedAt),
            createdAt: new Date(payment.createdAt),
          },
        });
        await refreshReceiptBalance(tx, payment.receiptId);
        return ok(payment.id);
      });
      response.payments.push(result);
    } catch (error) {
      console.error("Failed to sync payment", payment.id, error);
      response.payments.push(fail(payment.id, "Server error while saving payment.", true));
    }
  }

  return response;
}

/**
 * Cursors are "<serverUpdatedAt ISO>|<id>" so paging is exact even when many
 * rows share a timestamp. The first page of each sync re-reads a few seconds
 * back so rows committed slightly out of order aren't missed.
 */
function cursorWhere(cursor: string | null | undefined, overlap: boolean) {
  if (!cursor) return {};
  const [timestamp, lastId = ""] = cursor.split("|");
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return {};
  if (overlap) {
    return { serverUpdatedAt: { gte: new Date(date.getTime() - PULL_OVERLAP_MS) } };
  }
  return {
    OR: [
      { serverUpdatedAt: { gt: date } },
      { serverUpdatedAt: date, id: { gt: lastId } },
    ],
  };
}

const pageOrder = [{ serverUpdatedAt: "asc" as const }, { id: "asc" as const }];

export async function handlePull(
  cursors: Partial<PullCursors>,
  { firstPage = true }: { firstPage?: boolean } = {},
): Promise<PullResponse> {
  const [customers, services, receipts, staff, settings] = await Promise.all([
    prisma.customer.findMany({
      where: cursorWhere(cursors.customers, firstPage),
      orderBy: pageOrder,
      take: PULL_LIMIT,
    }),
    prisma.service.findMany({
      where: cursorWhere(cursors.services, firstPage),
      orderBy: pageOrder,
      take: PULL_LIMIT,
    }),
    prisma.receipt.findMany({
      where: cursorWhere(cursors.receipts, firstPage),
      orderBy: pageOrder,
      take: PULL_LIMIT,
      include: { items: true, payments: true },
    }),
    prisma.user.findMany({ select: { id: true, name: true, role: true, isActive: true } }),
    getBusinessSettings(),
  ]);

  const nextCursor = (
    rows: Array<{ id: string; serverUpdatedAt: Date }>,
    previous?: string | null,
  ) => {
    const last = rows[rows.length - 1];
    return last ? `${last.serverUpdatedAt.toISOString()}|${last.id}` : (previous ?? null);
  };

  return {
    customers: customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      deletedAt: iso(customer.deletedAt),
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
    })),
    services: services.map((service) => ({
      id: service.id,
      name: service.name,
      category: service.category,
      price: toNumber(service.price),
      deletedAt: iso(service.deletedAt),
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
    })),
    receipts: receipts.map((receipt) => ({
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      customerId: receipt.customerId,
      cashierId: receipt.cashierId,
      deviceId: receipt.deviceId,
      date: receipt.date.toISOString(),
      subtotal: toNumber(receipt.subtotal),
      discount: toNumber(receipt.discount),
      total: toNumber(receipt.total),
      amountPaid: toNumber(receipt.amountPaid),
      paymentMethod: receipt.paymentMethod,
      status: STATUS_FROM_DB[receipt.status],
      notes: receipt.notes,
      voidedAt: iso(receipt.voidedAt),
      voidedById: receipt.voidedById,
      voidReason: receipt.voidReason,
      createdAt: receipt.createdAt.toISOString(),
      updatedAt: receipt.updatedAt.toISOString(),
      items: receipt.items.map((item) => ({
        id: item.id,
        serviceId: item.serviceId,
        serviceName: item.serviceName,
        serviceCategory: item.serviceCategory,
        quantity: item.quantity,
        unitPrice: toNumber(item.unitPrice),
        amount: toNumber(item.amount),
        createdAt: item.createdAt.toISOString(),
      })),
      payments: receipt.payments.map((payment) => ({
        id: payment.id,
        receiptId: payment.receiptId,
        amount: toNumber(payment.amount),
        method: payment.method,
        cashierId: payment.cashierId,
        receivedAt: payment.receivedAt.toISOString(),
        createdAt: payment.createdAt.toISOString(),
      })),
    })),
    staff,
    settings,
    cursors: {
      customers: nextCursor(customers, cursors.customers),
      services: nextCursor(services, cursors.services),
      receipts: nextCursor(receipts, cursors.receipts),
    },
    hasMore:
      customers.length === PULL_LIMIT ||
      services.length === PULL_LIMIT ||
      receipts.length === PULL_LIMIT,
  };
}
