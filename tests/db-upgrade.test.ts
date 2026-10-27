import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import { db } from "@/db/db";

describe("Dexie v1 → v2 upgrade", () => {
  afterEach(async () => {
    if (!db.isOpen()) await db.open();
  });

  it("keeps existing receipts and backfills payments, subtotal and discount", async () => {
    db.close();
    await Dexie.delete("HubFlowDB");

    const legacy = new Dexie("HubFlowDB");
    legacy.version(1).stores({
      users: "id, role",
      customers: "id, name, phone, syncStatus, updatedAt",
      services: "id, name, category, syncStatus, updatedAt",
      receipts:
        "id, receiptNumber, customerId, date, status, syncStatus, updatedAt",
      receiptItems: "id, receiptId, serviceId, syncStatus, updatedAt",
    });
    const date = "2026-09-01T10:00:00.000Z";
    await legacy.table("receipts").bulkAdd([
      {
        id: "r-paid",
        receiptNumber: "QFLC-1-AAAAAA",
        date,
        total: 500,
        amountPaid: 600,
        paymentMethod: "CASH",
        status: "Completed",
        createdAt: date,
        updatedAt: date,
        syncStatus: "pending",
      },
      {
        id: "r-unpaid",
        receiptNumber: "QFLC-2-BBBBBB",
        date,
        total: 300,
        amountPaid: 0,
        paymentMethod: "TRANSFER",
        status: "Pending",
        createdAt: date,
        updatedAt: date,
        syncStatus: "pending",
      },
    ]);
    legacy.close();

    await db.open();

    const paid = await db.receipts.get("r-paid");
    expect(paid).toMatchObject({ subtotal: 500, discount: 0, total: 500 });
    expect(await db.receipts.count()).toBe(2);

    const payments = await db.payments.toArray();
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({
      receiptId: "r-paid",
      amount: 600,
      method: "CASH",
      receivedAt: date,
    });
  });
});
