import { describe, expect, it } from "vitest";

import { db } from "@/db/db";
import { createCustomer } from "@/lib/actions/edge-functions";
import {
  createReceipt,
  deleteReceipt,
  updateReceiptPayment,
} from "@/lib/actions/receipt-actions";

const item = (overrides = {}) => ({
  serviceId: "svc-1",
  serviceName: "A4 Printing",
  serviceCategory: "Printing",
  quantity: 3,
  unitPrice: 150,
  ...overrides,
});

describe("createReceipt", () => {
  it("saves the receipt and its items with computed totals", async () => {
    const { receipt, receiptItems } = await createReceipt({
      paymentMethod: "CASH",
      amountPaid: 1000,
      items: [item(), item({ serviceId: "svc-2", quantity: 1, unitPrice: 500 })],
    });

    expect(receipt.total).toBe(950);
    expect(receipt.status).toBe("Completed");
    expect(receipt.syncStatus).toBe("pending");
    expect(receiptItems.map((i) => i.amount)).toEqual([450, 500]);
    expect(await db.receipts.count()).toBe(1);
    expect(await db.receiptItems.where("receiptId").equals(receipt.id).count()).toBe(2);
  });

  it("marks underpaid receipts as pending", async () => {
    const { receipt } = await createReceipt({
      paymentMethod: "TRANSFER",
      amountPaid: 100,
      items: [item()],
    });
    expect(receipt.status).toBe("Pending");
  });

  it("generates unique receipt numbers", async () => {
    const input = { paymentMethod: "CASH" as const, amountPaid: 450, items: [item()] };
    const a = await createReceipt(input);
    const b = await createReceipt(input);
    expect(a.receipt.receiptNumber).not.toBe(b.receipt.receiptNumber);
  });

  it.each([
    ["no items", { items: [] }],
    ["zero quantity", { items: [item({ quantity: 0 })] }],
    ["fractional quantity", { items: [item({ quantity: 1.5 })] }],
    ["negative price", { items: [item({ unitPrice: -1 })] }],
    ["blank name", { items: [item({ serviceName: "  " })] }],
    ["negative payment", { amountPaid: -5 }],
  ])("rejects %s", async (_label, overrides) => {
    await expect(
      createReceipt({
        paymentMethod: "CASH",
        amountPaid: 450,
        items: [item()],
        ...overrides,
      }),
    ).rejects.toThrow();
    expect(await db.receipts.count()).toBe(0);
  });

  it("rejects an unknown customer without writing anything", async () => {
    await expect(
      createReceipt({
        customerId: "missing",
        paymentMethod: "CASH",
        amountPaid: 450,
        items: [item()],
      }),
    ).rejects.toThrow(/customer could not be found/);
    expect(await db.receipts.count()).toBe(0);
    expect(await db.receiptItems.count()).toBe(0);
  });

  it("links an existing customer", async () => {
    const customer = await createCustomer({ name: "Ada Obi", phone: "08012345678" });
    const { receipt } = await createReceipt({
      customerId: customer.id,
      paymentMethod: "POS",
      amountPaid: 450,
      items: [item()],
    });
    expect(receipt.customerId).toBe(customer.id);
  });
});

describe("updateReceiptPayment", () => {
  it("recomputes status from the new amount", async () => {
    const { receipt } = await createReceipt({
      paymentMethod: "CASH",
      amountPaid: 0,
      items: [item()],
    });
    const updated = await updateReceiptPayment(receipt.id, "TRANSFER", 450, " paid later ");
    expect(updated.status).toBe("Completed");
    expect(updated.paymentMethod).toBe("TRANSFER");
    expect(updated.notes).toBe("paid later");
  });

  it("throws for a missing receipt", async () => {
    await expect(updateReceiptPayment("missing", "CASH", 10)).rejects.toThrow();
  });
});

describe("deleteReceipt", () => {
  it("removes the receipt and its items", async () => {
    const { receipt } = await createReceipt({
      paymentMethod: "CASH",
      amountPaid: 450,
      items: [item()],
    });
    await deleteReceipt(receipt.id);
    expect(await db.receipts.count()).toBe(0);
    expect(await db.receiptItems.count()).toBe(0);
  });
});
