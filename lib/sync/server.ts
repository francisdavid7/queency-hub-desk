import "server-only";

import {
  Prisma,
  type Device,
  type PAYMENTMETHOD,
  type RECEIPTSTATUS,
} from "@/app/generated/prisma/client";
import { audit } from "@/lib/audit";
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

async function pushReceipt(
  receipt: SyncReceipt,
  device: Device,
  roles: Map<string, "ADMIN" | "CASHIER">,
): Promise<PushResult> {
  const existing = await prisma.receipt.findUnique({ where: { id: receipt.id } });

  if (!existing) {
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
    const voidAllowed = Boolean(
      receipt.voidedAt && receipt.voidedById && roles.get(receipt.voidedById) === "ADMIN",
    );

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
          // Recomputed from payments and void state by refreshReceiptBalance.
          status: voidAllowed ? "CANCELLED" : "PENDING",
          notes: receipt.notes ?? null,
          voidedAt: voidAllowed ? new Date(receipt.voidedAt!) : null,
          voidedById: voidAllowed ? receipt.voidedById : null,
          voidReason: voidAllowed ? receipt.voidReason : null,
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
    if (voidAllowed) {
      await audit("receipt.voided", {
        actorId: receipt.voidedById,
        entityType: "Receipt",
        entityId: receipt.id,
        details: { receiptNumber: receipt.receiptNumber, reason: receipt.voidReason ?? null, source: "till" },
      });
    }
    return ok(receipt.id);
  }

  // Existing receipt: items and amounts are immutable. Only a void can change.
  if (receipt.voidedAt && !existing.voidedAt) {
    if (!receipt.voidedById || roles.get(receipt.voidedById) !== "ADMIN") {
      return fail(receipt.id, "Only an administrator can void a receipt.");
    }
    await prisma.$transaction(async (tx) => {
      await tx.receipt.update({
        where: { id: receipt.id },
        data: {
          voidedAt: new Date(receipt.voidedAt!),
          voidedById: receipt.voidedById,
          voidReason: receipt.voidReason ?? null,
          updatedAt: new Date(receipt.updatedAt),
        },
      });
      await refreshReceiptBalance(tx, receipt.id);
    });
    await audit("receipt.voided", {
      actorId: receipt.voidedById,
      entityType: "Receipt",
      entityId: receipt.id,
      details: { receiptNumber: existing.receiptNumber, reason: receipt.voidReason ?? null, source: "till" },
    });
  }
  return ok(receipt.id);
}

export async function handlePush(body: PushRequest, device: Device): Promise<PushResponse> {
  const response: PushResponse = { customers: [], services: [], receipts: [], payments: [] };

  // Customers and services: last write wins on the client's updatedAt.
  for (const customer of body.customers) {
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
    ...body.receipts.flatMap((receipt) => [receipt.cashierId, receipt.voidedById]),
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
      const existing = await prisma.payment.findUnique({
        where: { id: payment.id },
        select: { id: true },
      });
      if (existing) {
        response.payments.push(ok(payment.id));
        continue;
      }
      const receipt = await prisma.receipt.findUnique({
        where: { id: payment.receiptId },
        select: { id: true, voidedAt: true },
      });
      if (!receipt) {
        response.payments.push(fail(payment.id, "Receipt not synced yet.", true));
        continue;
      }
      await prisma.$transaction(async (tx) => {
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
      });
      response.payments.push(ok(payment.id));
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
    prisma.user.findMany({ select: { id: true, name: true, role: true } }),
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
