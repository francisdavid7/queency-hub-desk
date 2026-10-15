import { db, type PaymentMethod } from "@/db/db";
import type { Receipt } from "@/types/receipt";
import type { ReceiptItem } from "@/types/receipt-item";

interface CreateReceiptInput {
  customerId?: string;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  notes?: string;
  items: Array<{
    serviceId: string;
    serviceName: string;
    serviceCategory: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export async function createReceipt(input: CreateReceiptInput) {
  if (input.items.length === 0) {
    throw new Error("A receipt must contain at least one service.");
  }
  if (
    input.items.some(
      (item) =>
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0 ||
        !Number.isFinite(item.unitPrice) ||
        item.unitPrice < 0,
    )
  ) {
    throw new Error("Receipt items must have valid quantities and prices.");
  }

  const now = new Date().toISOString();
  const total = input.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );

  if (!Number.isFinite(total) || total < 0) {
    throw new Error("The receipt total must be a valid non-negative amount.");
  }

  if (!Number.isFinite(input.amountPaid) || input.amountPaid < 0) {
    throw new Error("The amount paid must be a valid non-negative amount.");
  }

  const receipt: Receipt = {
    id: crypto.randomUUID(),
    receiptNumber: `QFLC-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
    customerId: input.customerId,
    date: now,
    total,
    amountPaid: input.amountPaid,
    notes: input.notes?.trim() || undefined,
    paymentMethod: input.paymentMethod,
    status: input.amountPaid >= total ? "Completed" : "Pending",
    createdAt: now,
    updatedAt: now,
    syncStatus: "pending",
  };

  const receiptItems: ReceiptItem[] = input.items.map((item) => ({
    id: crypto.randomUUID(),
    receiptId: receipt.id,
    serviceId: item.serviceId,
    serviceName: item.serviceName,
    serviceCategory: item.serviceCategory,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    amount: item.quantity * item.unitPrice,
    createdAt: now,
    updatedAt: now,
    syncStatus: "pending",
  }));

  await db.transaction(
    "rw",
    db.customers,
    db.receipts,
    db.receiptItems,
    async () => {
      if (input.customerId && !(await db.customers.get(input.customerId))) {
        throw new Error("The selected customer could not be found.");
      }

      await db.receipts.add(receipt);
      await db.receiptItems.bulkAdd(receiptItems);
    },
  );

  return { receipt, receiptItems };
}

export async function updateReceiptPayment(
  receiptId: string,
  paymentMethod: PaymentMethod,
  amountPaid: number,
  notes?: string,
) {
  if (!Number.isFinite(amountPaid) || amountPaid < 0) {
    throw new Error("The amount paid must be a valid non-negative amount.");
  }

  const receipt = await db.receipts.get(receiptId);
  if (!receipt) {
    throw new Error(`Receipt ${receiptId} was not found.`);
  }

  await db.receipts.update(receiptId, {
    paymentMethod,
    amountPaid,
    notes: notes?.trim() || undefined,
    status: amountPaid >= receipt.total ? "Completed" : "Pending",
    updatedAt: new Date().toISOString(),
    syncStatus: "pending",
    syncedAt: undefined,
  });

  const updatedReceipt = await db.receipts.get(receiptId);
  if (!updatedReceipt) {
    throw new Error(`Receipt ${receiptId} could not be loaded after update.`);
  }

  return updatedReceipt;
}
