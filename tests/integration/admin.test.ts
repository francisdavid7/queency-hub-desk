import { beforeEach, describe, expect, it } from "vitest";

import { createCustomer } from "@/lib/actions/edge-functions";
import { createReceipt, recordPayment, voidReceipt } from "@/lib/actions/receipt-actions";
import { resolveRange } from "@/lib/admin/date-range";
import {
  getCashierActivity,
  getOverview,
  getReport,
  getTransactions,
} from "@/lib/admin/queries";
import { setCashierSession } from "@/lib/auth/cashier-session";
import { signInToTill, signOutOfTill } from "@/lib/auth/till-auth";
import { deleteMeta } from "@/lib/meta";
import { syncNow } from "@/lib/sync/client";
import { createUser, hasDatabase } from "./setup";

const line = (serviceName: string, quantity: number, unitPrice: number, serviceCategory = "Printing") => ({
  serviceId: `svc-${serviceName}`,
  serviceName,
  serviceCategory,
  quantity,
  unitPrice,
});

describe.skipIf(!hasDatabase)("admin dashboard queries", () => {
  beforeEach(async () => {
    setCashierSession(null);
    await deleteMeta("device");
    await createUser("boss", "admin-pass", "ADMIN", "The Boss");
    await createUser("ada", "cashier-pass", "CASHIER", "Ada");
    await signInToTill("boss", "admin-pass");
    signOutOfTill();
    await signInToTill("ada", "cashier-pass");

    const customer = await createCustomer({ name: "Chidi Okeke", phone: "08030000000" });
    // 1) Fully paid, with discount: total 1,100 (1,200 − 100)
    await createReceipt({
      customerId: customer.id,
      paymentMethod: "CASH",
      amountPaid: 1100,
      discount: 100,
      items: [line("A4 Printing", 8, 150)],
    });
    // 2) Partly paid then topped up: total 5,000, 2,000 + 1,000 paid → 2,000 outstanding
    const partial = await createReceipt({
      paymentMethod: "TRANSFER",
      amountPaid: 2000,
      items: [line("Logo design", 1, 5000, "Design")],
    });
    await recordPayment(partial.receipt.id, "POS", 1000);
    // 3) Voided by an admin: excluded from sales and collections
    const voided = await createReceipt({
      paymentMethod: "CASH",
      amountPaid: 300,
      items: [line("Lamination", 2, 150, "Finishing")],
    });
    signOutOfTill();
    await signInToTill("boss", "admin-pass");
    await voidReceipt(voided.receipt.id, "Entered twice");
    await syncNow();
  });

  it("summarises today's sales, collections, balances and voids", async () => {
    const overview = await getOverview(resolveRange({ range: "today" }));
    expect(overview.receiptCount).toBe(2);
    expect(overview.voidCount).toBe(1);
    expect(overview.sales).toBe(6100);
    expect(overview.collected).toBe(4100);
    expect(overview.discounts).toBe(100);
    expect(overview.outstanding).toBe(2000);
    expect(overview.outstandingCount).toBe(1);
    expect(overview.byMethod).toEqual([
      { method: "TRANSFER", amount: 2000 },
      { method: "CASH", amount: 1100 },
      { method: "POS", amount: 1000 },
    ]);
    expect(overview.topServices[0]).toMatchObject({ name: "Logo design", amount: 5000 });
    expect(overview.daily.at(-1)?.amount).toBe(4100);
  });

  it("attributes activity to the right cashier", async () => {
    const rows = await getCashierActivity(resolveRange({ range: "today" }));
    const ada = rows.find((row) => row.userName === "ada")!;
    const boss = rows.find((row) => row.userName === "boss")!;
    expect(ada).toMatchObject({ receiptCount: 2, sales: 6100, collected: 4100, voidedReceipts: 1, discounts: 100 });
    expect(boss).toMatchObject({ receiptCount: 0, voidsPerformed: 1 });
  });

  it("breaks sales down by category and filters transactions", async () => {
    const report = await getReport(resolveRange({ range: "7d" }));
    expect(report.categories.map((row) => row.name)).toEqual(["Design", "Printing"]);
    expect(report.days.at(-1)).toMatchObject({ receipts: 2, sales: 6100, collected: 4100 });

    const range = resolveRange({ range: "today" });
    expect((await getTransactions(range, {})).count).toBe(3);
    expect((await getTransactions(range, { q: "chidi" })).count).toBe(1);
    expect((await getTransactions(range, { status: "cancelled" })).count).toBe(1);
    expect((await getTransactions(range, { status: "pending" })).total).toBe(5000);
  });
});
