import { describe, expect, it } from "vitest";

import { db } from "@/db/db";
import { setCashierSession } from "@/lib/auth/cashier-session";
import { createCustomer, deleteCustomer } from "@/lib/actions/edge-functions";
import {
  createReceipt,
  recordPayment,
  updateReceiptPayment,
  voidReceipt,
} from "@/lib/actions/receipt-actions";
import { deleteMeta } from "@/lib/meta";
import { TEST_CASHIER } from "./setup";

const item = (overrides = {}) => ({
  serviceId: "svc-1",
  serviceName: "A4 Printing",
  serviceCategory: "Printing",
  quantity: 3,
  unitPrice: 150,
  ...overrides,
});

const baseInput = {
  paymentMethod: "CASH" as const,
  amountPaid: 450,
  items: [item()],
};

describe("createReceipt", () => {
  it("saves the receipt, items and payment with computed totals", async () => {
    const { receipt, receiptItems, payments } = await createReceipt({
      paymentMethod: "CASH",
      amountPaid: 1000,
      items: [item(), item({ serviceId: "svc-2", quantity: 1, unitPrice: 500 })],
    });

    expect(receipt.subtotal).toBe(950);
    expect(receipt.total).toBe(950);
    expect(receipt.status).toBe("Completed");
    expect(receipt.syncStatus).toBe("pending");
    expect(receipt.cashierId).toBe(TEST_CASHIER.userId);
    expect(receipt.deviceId).toBe("device-1");
    expect(receiptItems.map((i) => i.amount)).toEqual([450, 500]);
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({ amount: 1000, method: "CASH" });
    expect(await db.receiptItems.where("receiptId").equals(receipt.id).count()).toBe(2);
  });

  it("applies a discount to the total", async () => {
    const { receipt } = await createReceipt({ ...baseInput, discount: 50 });
    expect(receipt.subtotal).toBe(450);
    expect(receipt.discount).toBe(50);
    expect(receipt.total).toBe(400);
    expect(receipt.status).toBe("Completed");
  });

  it("rounds fractional prices to kobo", async () => {
    const { receipt } = await createReceipt({
      ...baseInput,
      amountPaid: 0,
      items: [item({ quantity: 3, unitPrice: 0.1 })],
    });
    expect(receipt.total).toBe(0.3);
  });

  it("marks underpaid receipts as pending and records no zero payment", async () => {
    const { receipt, payments } = await createReceipt({ ...baseInput, amountPaid: 0 });
    expect(receipt.status).toBe("Pending");
    expect(payments).toHaveLength(0);
  });

  it("numbers receipts sequentially per till", async () => {
    const a = await createReceipt(baseInput);
    const b = await createReceipt(baseInput);
    expect(a.receipt.receiptNumber).toBe("QFLC-T1-000001");
    expect(b.receipt.receiptNumber).toBe("QFLC-T1-000002");
  });

  it.each([
    ["no items", { items: [] }],
    ["zero quantity", { items: [item({ quantity: 0 })] }],
    ["fractional quantity", { items: [item({ quantity: 1.5 })] }],
    ["negative price", { items: [item({ unitPrice: -1 })] }],
    ["blank name", { items: [item({ serviceName: "  " })] }],
    ["negative payment", { amountPaid: -5 }],
    ["discount above subtotal", { discount: 451 }],
    ["negative discount", { discount: -1 }],
  ])("rejects %s", async (_label, overrides) => {
    await expect(createReceipt({ ...baseInput, ...overrides })).rejects.toThrow();
    expect(await db.receipts.count()).toBe(0);
  });

  it("requires a signed-in cashier", async () => {
    setCashierSession(null);
    await expect(createReceipt(baseInput)).rejects.toThrow(/Sign in/);
  });

  it("requires a registered till", async () => {
    await deleteMeta("device");
    await expect(createReceipt(baseInput)).rejects.toThrow(/not registered/);
  });

  it("rejects an unknown or deleted customer without writing anything", async () => {
    await expect(
      createReceipt({ ...baseInput, customerId: "missing" }),
    ).rejects.toThrow(/customer could not be found/);

    const customer = await createCustomer({ name: "Ada Obi", phone: "08012345678" });
    await deleteCustomer(customer.id);
    await expect(
      createReceipt({ ...baseInput, customerId: customer.id }),
    ).rejects.toThrow(/customer could not be found/);

    expect(await db.receipts.count()).toBe(0);
    expect(await db.receiptItems.count()).toBe(0);
    expect(await db.payments.count()).toBe(0);
  });

  it("does not consume a receipt number when saving fails", async () => {
    await expect(
      createReceipt({ ...baseInput, customerId: "missing" }),
    ).rejects.toThrow();
    const { receipt } = await createReceipt(baseInput);
    expect(receipt.receiptNumber).toBe("QFLC-T1-000001");
  });
});

describe("updateReceiptPayment", () => {
  it("replaces the initial payment before sync", async () => {
    const { receipt } = await createReceipt({ ...baseInput, amountPaid: 0 });
    const updated = await updateReceiptPayment(receipt.id, "TRANSFER", 450, " paid later ");
    expect(updated.status).toBe("Completed");
    expect(updated.paymentMethod).toBe("TRANSFER");
    expect(updated.notes).toBe("paid later");
    const payments = await db.payments.where("receiptId").equals(receipt.id).toArray();
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({ amount: 450, method: "TRANSFER" });
  });

  it("refuses once the receipt has synced", async () => {
    const { receipt } = await createReceipt(baseInput);
    await db.receipts.update(receipt.id, { syncedAt: new Date().toISOString() });
    await expect(updateReceiptPayment(receipt.id, "CASH", 10)).rejects.toThrow(
      /no longer be edited/,
    );
  });

  it("throws for a missing receipt", async () => {
    await expect(updateReceiptPayment("missing", "CASH", 10)).rejects.toThrow();
  });
});

describe("recordPayment", () => {
  it("adds a payment and completes the receipt when the balance is cleared", async () => {
    const { receipt } = await createReceipt({ ...baseInput, amountPaid: 200 });
    const partial = await recordPayment(receipt.id, "POS", 100);
    expect(partial?.status).toBe("Pending");
    expect(partial?.amountPaid).toBe(300);

    const done = await recordPayment(receipt.id, "TRANSFER", 150);
    expect(done?.status).toBe("Completed");
    expect(await db.payments.where("receiptId").equals(receipt.id).count()).toBe(3);
  });

  it("rejects payments on paid or voided receipts", async () => {
    const { receipt } = await createReceipt(baseInput);
    await expect(recordPayment(receipt.id, "CASH", 10)).rejects.toThrow(/fully paid/);

    const pending = await createReceipt({ ...baseInput, amountPaid: 0 });
    await db.receipts.update(pending.receipt.id, {
      status: "Cancelled",
      voidedAt: new Date().toISOString(),
    });
    await expect(recordPayment(pending.receipt.id, "CASH", 10)).rejects.toThrow(/voided/);
  });

  it("rejects non-positive amounts", async () => {
    const { receipt } = await createReceipt({ ...baseInput, amountPaid: 0 });
    await expect(recordPayment(receipt.id, "CASH", 0)).rejects.toThrow();
  });
});

describe("voidReceipt", () => {
  it("validates locally before contacting the server", async () => {
    const { receipt } = await createReceipt(baseInput);
    const admin = { userName: "boss", password: "x" };
    await expect(voidReceipt(receipt.id, " ", admin)).rejects.toThrow(/reason/);
    await expect(voidReceipt("missing", "Mistake", admin)).rejects.toThrow(/not found/);

    await db.receipts.update(receipt.id, { voidedAt: new Date().toISOString() });
    await expect(voidReceipt(receipt.id, "Again", admin)).rejects.toThrow(/already voided/);
  });
});
