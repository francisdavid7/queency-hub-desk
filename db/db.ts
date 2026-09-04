import Dexie, { type EntityTable } from "dexie";
import type { Customer } from "@/types/customer";
import type { Receipt } from "@/types/receipt";
import type { Service } from "@/types/service";
import type { ReceiptItem } from "@/types/receipt-item";

export type PaymentMethod = "CASH" | "TRANSFER" | "POS";
export type ReceiptStatus = "Completed" | "Pending" | "Cancelled";
export type SyncStatus = "pending" | "synced" | "failed";

const db = new Dexie("HubFlowDB") as Dexie & {
  customers: EntityTable<Customer, "id">;
  receipts: EntityTable<Receipt, "id">;
  receiptItems: EntityTable<ReceiptItem, "id">;
  services: EntityTable<Service, "id">;
};

db.version(1).stores({
  customers: "id, name, phone, syncStatus, updatedAt",
  services: "id, name, category, syncStatus, updatedAt",
  receipts:
    "id, receiptNumber, customerId, date, status, syncStatus, updatedAt",
  receiptItems: "id, receiptId, serviceId, syncStatus, updatedAt",
});
