import Dexie from "dexie";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/db/db";
import { createCustomer } from "@/lib/actions/edge-functions";
import {
  createReceipt,
  recordPayment,
  voidReceipt,
} from "@/lib/actions/receipt-actions";
import { getCashierSession, setCashierSession } from "@/lib/auth/cashier-session";
import { signInToTill, signOutOfTill } from "@/lib/auth/till-auth";
import { deleteMeta, getMeta } from "@/lib/meta";
import prisma from "@/lib/prisma/prisma";
import { getSyncState, syncNow } from "@/lib/sync/client";
import { createUser, hasDatabase } from "./setup";

const item = {
  serviceId: "svc-print",
  serviceName: "A4 Printing",
  serviceCategory: "Printing",
  quantity: 4,
  unitPrice: 150,
};

describe.skipIf(!hasDatabase)("till sign-in", () => {
  beforeEach(async () => {
    setCashierSession(null);
    await deleteMeta("device");
  });

  it("refuses to register a till for a cashier", async () => {
    await createUser("ada", "cashier-pass", "CASHIER");
    await expect(signInToTill("ada", "cashier-pass")).rejects.toThrow(/administrator/);
    expect(await prisma.device.count()).toBe(0);
  });

  it("registers the till on an admin's first sign-in, then lets cashiers in", async () => {
    await createUser("boss", "admin-pass", "ADMIN", "The Boss");
    await createUser("ada", "cashier-pass", "CASHIER", "Ada");

    await signInToTill("Boss ", "admin-pass");
    const device = await getMeta("device");
    expect(device?.code).toBe("T1");
    expect(getCashierSession()?.role).toBe("ADMIN");

    signOutOfTill();
    await signInToTill("ada", "cashier-pass");
    expect(getCashierSession()?.name).toBe("Ada");
    expect(await prisma.device.count()).toBe(1);
    expect(await prisma.auditLog.count({ where: { action: "device.registered" } })).toBe(1);
  });

  it("rejects bad passwords and locks out after repeated failures", async () => {
    await createUser("boss", "admin-pass", "ADMIN");
    await expect(signInToTill("boss", "wrong")).rejects.toThrow(/Incorrect/);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await signInToTill("boss", "wrong").catch(() => undefined);
    }
    await expect(signInToTill("boss", "admin-pass")).rejects.toThrow(/Too many/);
  });

  it("unlocks offline only for users who signed in on this till before", async () => {
    await createUser("boss", "admin-pass", "ADMIN");
    await signInToTill("boss", "admin-pass");
    signOutOfTill();

    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof fetch;
    try {
      await expect(signInToTill("boss", "nope")).rejects.toThrow(/Incorrect/);
      await signInToTill("boss", "admin-pass");
      expect(getCashierSession()?.userName).toBe("boss");
      signOutOfTill();
      await expect(signInToTill("ada", "whatever")).rejects.toThrow(/hasn't signed in/);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

describe.skipIf(!hasDatabase)("sync", () => {
  beforeEach(async () => {
    setCashierSession(null);
    await deleteMeta("device");
    await createUser("boss", "admin-pass", "ADMIN", "The Boss");
    await createUser("ada", "cashier-pass", "CASHIER", "Ada");
    await signInToTill("boss", "admin-pass");
    signOutOfTill();
    await signInToTill("ada", "cashier-pass");
  });

  it("pushes receipts with server-verified totals and cashier attribution", async () => {
    const customer = await createCustomer({ name: "Chidi", phone: "08030000000" });
    const { receipt } = await createReceipt({
      customerId: customer.id,
      paymentMethod: "CASH",
      amountPaid: 200,
      discount: 100,
      items: [item],
    });

    await syncNow();
    expect(getSyncState().phase).toBe("idle");

    const server = await prisma.receipt.findUniqueOrThrow({
      where: { id: receipt.id },
      include: { items: true, payments: true, cashier: true, device: true },
    });
    expect(server.receiptNumber).toBe("QFLC-T1-000001");
    expect(Number(server.subtotal)).toBe(600);
    expect(Number(server.total)).toBe(500);
    expect(Number(server.amountPaid)).toBe(200);
    expect(server.status).toBe("PENDING");
    expect(server.cashier?.userName).toBe("ada");
    expect(server.device?.code).toBe("T1");
    expect(server.customerId).toBe(customer.id);
    expect(server.items).toHaveLength(1);

    const local = await db.receipts.get(receipt.id);
    expect(local?.syncStatus).toBe("synced");
    expect(await db.payments.where("syncStatus").equals("pending").count()).toBe(0);

    // Later payment clears the balance on the server too.
    await recordPayment(receipt.id, "TRANSFER", 300);
    await syncNow();
    const paid = await prisma.receipt.findUniqueOrThrow({ where: { id: receipt.id } });
    expect(paid.status).toBe("COMPLETED");
    expect(Number(paid.amountPaid)).toBe(500);
    expect(await prisma.payment.count({ where: { receiptId: receipt.id } })).toBe(2);
  });

  it("rejects tampered totals and marks the receipt failed locally", async () => {
    const { receipt } = await createReceipt({
      paymentMethod: "CASH",
      amountPaid: 600,
      items: [item],
    });
    await db.receipts.update(receipt.id, { total: 1, subtotal: 1 });

    await syncNow();
    expect(await prisma.receipt.count()).toBe(0);
    const local = await db.receipts.get(receipt.id);
    expect(local?.syncStatus).toBe("failed");
    expect(local?.syncError).toMatch(/Subtotal/);
    expect(await prisma.auditLog.count({ where: { action: "receipt.rejected" } })).toBe(1);
  });

  it("syncs an admin void and refuses one forged by a cashier", async () => {
    const { receipt } = await createReceipt({ paymentMethod: "CASH", amountPaid: 600, items: [item] });
    await syncNow();

    // A cashier can't void locally...
    await expect(voidReceipt(receipt.id, "Oops")).rejects.toThrow(/administrator/);
    // ...and a forged void from a cashier is refused by the server.
    const ada = getCashierSession()!;
    await db.receipts.update(receipt.id, {
      voidedAt: new Date().toISOString(),
      voidedById: ada.userId,
      voidReason: "forged",
      status: "Cancelled",
      updatedAt: new Date().toISOString(),
      syncStatus: "pending",
    });
    await syncNow();
    expect((await prisma.receipt.findUniqueOrThrow({ where: { id: receipt.id } })).voidedAt).toBeNull();
    expect((await db.receipts.get(receipt.id))?.syncStatus).toBe("failed");

    // A real admin void goes through and is audited.
    await db.receipts.update(receipt.id, {
      voidedAt: undefined,
      voidedById: undefined,
      voidReason: undefined,
      status: "Completed",
      syncStatus: "synced",
    });
    signOutOfTill();
    await signInToTill("boss", "admin-pass");
    await voidReceipt(receipt.id, "Customer cancelled order");
    await syncNow();
    const voided = await prisma.receipt.findUniqueOrThrow({ where: { id: receipt.id } });
    expect(voided.status).toBe("CANCELLED");
    expect(voided.voidReason).toBe("Customer cancelled order");
    expect(await prisma.auditLog.count({ where: { action: "receipt.voided" } })).toBe(1);
  });

  it("restores history onto a freshly installed till", async () => {
    await createCustomer({ name: "Chidi", phone: "08030000000" });
    const { receipt } = await createReceipt({ paymentMethod: "POS", amountPaid: 600, items: [item] });
    await syncNow();

    // Simulate a wiped browser: new local database, same server.
    db.close();
    await Dexie.delete("HubFlowDB");
    await db.open();
    setCashierSession(null);
    await signInToTill("boss", "admin-pass");
    expect((await getMeta("device"))?.code).toBe("T2");

    await syncNow();
    const restored = await db.receipts.get(receipt.id);
    expect(restored).toMatchObject({ total: 600, status: "Completed", syncStatus: "synced" });
    expect(await db.receiptItems.where("receiptId").equals(receipt.id).count()).toBe(1);
    expect(await db.payments.where("receiptId").equals(receipt.id).count()).toBe(1);
    expect(await db.customers.count()).toBe(1);
    expect((await getMeta("staff"))?.map((member) => member.name).sort()).toEqual(["Ada", "The Boss"]);

    // New receipts on the new till can't collide with the old till's numbers.
    const next = await createReceipt({ paymentMethod: "CASH", amountPaid: 600, items: [item] });
    expect(next.receipt.receiptNumber).toBe("QFLC-T2-000001");
  });

  it("keeps the newer customer edit (last write wins)", async () => {
    const customer = await createCustomer({ name: "Chidi", phone: "08030000000" });
    await syncNow();
    await prisma.customer.update({
      where: { id: customer.id },
      data: { name: "Chidi (server)", updatedAt: new Date(Date.now() + 60_000) },
    });
    await syncNow();
    expect((await db.customers.get(customer.id))?.name).toBe("Chidi (server)");
  });

  it("locks the till when its access is revoked", async () => {
    await prisma.device.updateMany({ data: { revokedAt: new Date() } });
    await syncNow();
    expect(getSyncState().phase).toBe("unauthorised");
    expect(getCashierSession()).toBeNull();
    expect(await getMeta("device")).toBeUndefined();
  });
});
