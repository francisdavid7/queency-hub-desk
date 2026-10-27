import Dexie, { type EntityTable } from "dexie";
import type { Customer } from "@/types/customer";
import type { LocalUser } from "@/types/local-user";
import type { MetaEntry } from "@/types/meta";
import type { Payment } from "@/types/payment";
import type { Receipt } from "@/types/receipt";
import type { Service } from "@/types/service";
import type { ReceiptItem } from "@/types/receipt-item";

export type PaymentMethod = "CASH" | "TRANSFER" | "POS" | "OTHER";
export type ReceiptStatus = "Completed" | "Pending" | "Cancelled";
export type SyncStatus = "pending" | "synced" | "failed";

const db = new Dexie("HubFlowDB") as Dexie & {
  users: EntityTable<LocalUser, "id">;
  customers: EntityTable<Customer, "id">;
  receipts: EntityTable<Receipt, "id">;
  receiptItems: EntityTable<ReceiptItem, "id">;
  services: EntityTable<Service, "id">;
  payments: EntityTable<Payment, "id">;
  meta: EntityTable<MetaEntry, "key">;
};

db.version(1).stores({
  users: "id, role",
  customers: "id, name, phone, syncStatus, updatedAt",
  services: "id, name, category, syncStatus, updatedAt",
  receipts:
    "id, receiptNumber, customerId, date, status, syncStatus, updatedAt",
  receiptItems: "id, receiptId, serviceId, syncStatus, updatedAt",
});

// v2: payments history, discounts, cashier attribution, soft deletes, and
// local metadata (device registration, receipt counter, sync cursor).
db.version(2)
  .stores({
    users: "id, &userName, role",
    customers: "id, name, phone, syncStatus, updatedAt",
    services: "id, name, category, syncStatus, updatedAt",
    receipts:
      "id, receiptNumber, customerId, cashierId, date, status, syncStatus, updatedAt",
    receiptItems: "id, receiptId, serviceId, syncStatus, updatedAt",
    payments: "id, receiptId, receivedAt, syncStatus",
    meta: "key",
  })
  .upgrade(async (tx) => {
    // v1 users were never populated; local users are now cached sign-ins.
    await tx.table("users").clear();

    const receipts = tx.table<Receipt, string>("receipts");
    const payments = tx.table<Payment, string>("payments");
    await receipts.toCollection().modify((receipt) => {
      receipt.subtotal ??= receipt.total;
      receipt.discount ??= 0;
      receipt.amountPaid ??= receipt.status === "Completed" ? receipt.total : 0;
      receipt.syncStatus = "pending";
    });

    const legacyPayments: Payment[] = [];
    await receipts.each((receipt) => {
      if (!receipt.amountPaid || receipt.amountPaid <= 0) return;
      legacyPayments.push({
        id: crypto.randomUUID(),
        receiptId: receipt.id,
        amount: receipt.amountPaid,
        method: receipt.paymentMethod,
        receivedAt: receipt.date,
        createdAt: receipt.createdAt,
        updatedAt: receipt.updatedAt,
        syncStatus: "pending",
      });
    });
    await payments.bulkAdd(legacyPayments);
  });

// IndexedDB only exists in the browser; skip opening during server prerender.
if (typeof indexedDB !== "undefined") {
  db.open().catch((err) => {
    console.error("Error occurred establishing db", err);
  });
}

/** Customers that have not been soft-deleted. */
export const activeCustomers = () =>
  db.customers.filter((customer) => !customer.deletedAt);

/** Services that have not been archived. */
export const activeServices = () =>
  db.services.filter((service) => !service.deletedAt);

export { db };
