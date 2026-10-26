import { db, type PaymentMethod, type ReceiptStatus } from "@/db/db";
import { requireCashierSession } from "@/lib/auth/cashier-session";
import { getMeta } from "@/lib/meta";
import { isValidAmount, roundMoney } from "@/lib/money";
import { RECEIPT_PREFIX } from "@/lib/receipt-number";
import { syncNow } from "@/lib/sync/client";
import type { Payment } from "@/types/payment";
import type { Receipt } from "@/types/receipt";
import type { ReceiptItem } from "@/types/receipt-item";

export { RECEIPT_PREFIX };

interface CreateReceiptInput {
  customerId?: string;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  discount?: number;
  notes?: string;
  items: Array<{
    serviceId: string;
    serviceName: string;
    serviceCategory: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export function receiptStatusFor(total: number, amountPaid: number): ReceiptStatus {
  return roundMoney(amountPaid) >= roundMoney(total) ? "Completed" : "Pending";
}

/** Next sequential number for this till, e.g. QFLC-T1-000042. */
async function nextReceiptNumber(deviceCode: string) {
  const entry = await db.meta.get("receiptCounter");
  const next = ((entry?.value as number | undefined) ?? 0) + 1;
  await db.meta.put({ key: "receiptCounter", value: next });
  return `${RECEIPT_PREFIX}-${deviceCode}-${String(next).padStart(6, "0")}`;
}

export async function createReceipt(input: CreateReceiptInput) {
  const session = requireCashierSession();

  if (input.items.length === 0) {
    throw new Error("A receipt must contain at least one service.");
  }
  if (
    input.items.some(
      (item) =>
        !item.serviceId.trim() ||
        !item.serviceName.trim() ||
        !item.serviceCategory.trim() ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity <= 0 ||
        !isValidAmount(item.unitPrice) ||
        !Number.isFinite(item.quantity * item.unitPrice),
    )
  ) {
    throw new Error(
      "Receipt items must have a name, category, valid quantity, and price.",
    );
  }

  const subtotal = roundMoney(
    input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
  );
  const discount = roundMoney(input.discount ?? 0);

  if (!Number.isFinite(subtotal) || subtotal < 0) {
    throw new Error("The receipt total must be a valid non-negative amount.");
  }
  if (!isValidAmount(discount) || discount > subtotal) {
    throw new Error("The discount must be between zero and the subtotal.");
  }
  if (!isValidAmount(input.amountPaid)) {
    throw new Error("The amount paid must be a valid non-negative amount.");
  }

  const device = await getMeta("device");
  if (!device) {
    throw new Error("This till is not registered. Sign in while online first.");
  }

  const now = new Date().toISOString();
  const total = roundMoney(subtotal - discount);
  const amountPaid = roundMoney(input.amountPaid);

  const receipt: Receipt = {
    id: crypto.randomUUID(),
    receiptNumber: "",
    customerId: input.customerId,
    cashierId: session.userId,
    deviceId: device.id,
    date: now,
    subtotal,
    discount,
    total,
    amountPaid,
    notes: input.notes?.trim() || undefined,
    paymentMethod: input.paymentMethod,
    status: receiptStatusFor(total, amountPaid),
    createdAt: now,
    updatedAt: now,
    syncStatus: "pending",
  };

  const receiptItems: ReceiptItem[] = input.items.map((item) => ({
    id: crypto.randomUUID(),
    receiptId: receipt.id,
    serviceId: item.serviceId,
    serviceName: item.serviceName.trim(),
    serviceCategory: item.serviceCategory.trim(),
    quantity: item.quantity,
    unitPrice: roundMoney(item.unitPrice),
    amount: roundMoney(item.quantity * item.unitPrice),
    createdAt: now,
    updatedAt: now,
    syncStatus: "pending",
  }));

  const payments: Payment[] =
    amountPaid > 0
      ? [
          {
            id: crypto.randomUUID(),
            receiptId: receipt.id,
            amount: amountPaid,
            method: input.paymentMethod,
            cashierId: session.userId,
            receivedAt: now,
            createdAt: now,
            updatedAt: now,
            syncStatus: "pending",
          },
        ]
      : [];

  await db.transaction(
    "rw",
    [db.customers, db.receipts, db.receiptItems, db.payments, db.meta],
    async () => {
      if (input.customerId) {
        const customer = await db.customers.get(input.customerId);
        if (!customer || customer.deletedAt) {
          throw new Error("The selected customer could not be found.");
        }
      }

      receipt.receiptNumber = await nextReceiptNumber(device.code);
      await db.receipts.add(receipt);
      await db.receiptItems.bulkAdd(receiptItems);
      await db.payments.bulkAdd(payments);
    },
  );

  return { receipt, receiptItems, payments };
}

/**
 * Correct the payment entered while creating a receipt (the wizard's
 * "Back to payment" step). Only allowed before the receipt has synced and
 * while it has at most one payment; afterwards use recordPayment.
 */
export async function updateReceiptPayment(
  receiptId: string,
  paymentMethod: PaymentMethod,
  amountPaid: number,
  notes?: string,
) {
  const session = requireCashierSession();
  if (!isValidAmount(amountPaid)) {
    throw new Error("The amount paid must be a valid non-negative amount.");
  }
  const amount = roundMoney(amountPaid);

  await db.transaction("rw", db.receipts, db.payments, async () => {
    const receipt = await db.receipts.get(receiptId);
    if (!receipt) {
      throw new Error(`Receipt ${receiptId} was not found.`);
    }
    const existing = await db.payments
      .where("receiptId")
      .equals(receiptId)
      .toArray();
    if (receipt.syncedAt || receipt.voidedAt || existing.length > 1) {
      throw new Error(
        "This receipt can no longer be edited. Record an additional payment instead.",
      );
    }

    const now = new Date().toISOString();
    await db.payments.where("receiptId").equals(receiptId).delete();
    if (amount > 0) {
      await db.payments.add({
        id: existing[0]?.id ?? crypto.randomUUID(),
        receiptId,
        amount,
        method: paymentMethod,
        cashierId: session.userId,
        receivedAt: now,
        createdAt: existing[0]?.createdAt ?? now,
        updatedAt: now,
        syncStatus: "pending",
      });
    }

    await db.receipts.update(receiptId, {
      paymentMethod,
      amountPaid: amount,
      notes: notes?.trim() || undefined,
      status: receiptStatusFor(receipt.total, amount),
      updatedAt: now,
      syncStatus: "pending",
    });
  });

  const updatedReceipt = await db.receipts.get(receiptId);
  if (!updatedReceipt) {
    throw new Error(`Receipt ${receiptId} could not be loaded after update.`);
  }
  return updatedReceipt;
}

/** Record an additional payment against an outstanding balance. */
export async function recordPayment(
  receiptId: string,
  method: PaymentMethod,
  amount: number,
) {
  const session = requireCashierSession();
  if (!isValidAmount(amount) || amount <= 0) {
    throw new Error("Enter a payment amount greater than zero.");
  }
  const paymentAmount = roundMoney(amount);
  const now = new Date().toISOString();

  await db.transaction("rw", db.receipts, db.payments, async () => {
    const receipt = await db.receipts.get(receiptId);
    if (!receipt) throw new Error(`Receipt ${receiptId} was not found.`);
    if (receipt.voidedAt) throw new Error("This receipt has been voided.");

    const paid = receipt.amountPaid ?? 0;
    if (paid >= receipt.total) {
      throw new Error("This receipt is already fully paid.");
    }

    const amountPaid = roundMoney(paid + paymentAmount);
    await db.payments.add({
      id: crypto.randomUUID(),
      receiptId,
      amount: paymentAmount,
      method,
      cashierId: session.userId,
      receivedAt: now,
      createdAt: now,
      updatedAt: now,
      syncStatus: "pending",
    });
    await db.receipts.update(receiptId, {
      amountPaid,
      status: receiptStatusFor(receipt.total, amountPaid),
      updatedAt: now,
      syncStatus: "pending",
    });
  });

  return db.receipts.get(receiptId);
}

/**
 * Void a receipt (manager override). Receipts are never deleted so every
 * issued number stays accounted for. The admin re-enters their password and
 * the server verifies it, so this needs an internet connection.
 */
export async function voidReceipt(
  receiptId: string,
  reason: string,
  admin: { userName: string; password: string },
) {
  requireCashierSession();
  const trimmedReason = reason.trim();
  if (trimmedReason.length < 3) {
    throw new Error("Enter a reason for voiding this receipt.");
  }

  let receipt = await db.receipts.get(receiptId);
  if (!receipt) throw new Error(`Receipt ${receiptId} was not found.`);
  if (receipt.voidedAt) throw new Error("This receipt is already voided.");

  const device = await getMeta("device");
  if (!device) throw new Error("This till is not registered.");

  // The server can only void what it has; upload the receipt first if needed.
  if (receipt.syncStatus !== "synced") {
    await syncNow();
    receipt = await db.receipts.get(receiptId);
    if (receipt?.syncStatus !== "synced") {
      throw new Error("Couldn't upload this receipt yet. Check the internet connection and try again.");
    }
  }

  let response: Response;
  try {
    response = await fetch("/api/receipts/void", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${device.token}`,
      },
      body: JSON.stringify({
        receiptId,
        userName: admin.userName.trim().toLowerCase(),
        password: admin.password,
        reason: trimmedReason,
      }),
    });
  } catch {
    throw new Error("Voiding needs an internet connection.");
  }
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    voidedAt?: string;
    voidedById?: string;
    voidReason?: string;
  };
  if (!response.ok) throw new Error(body.error ?? "Unable to void this receipt.");

  const now = new Date().toISOString();
  await db.receipts.update(receiptId, {
    status: "Cancelled",
    voidedAt: body.voidedAt,
    voidedById: body.voidedById,
    voidReason: body.voidReason,
    updatedAt: body.voidedAt ?? now,
    syncStatus: "synced",
    syncedAt: now,
  });
  return db.receipts.get(receiptId);
}
