import Dexie, { type EntityTable } from "dexie";

type PaymentMethod = "CASH" | "TRANSFER" | "POS";

type ReceiptStatus = "Completed" | "Pending" | "Cancelled";

interface Customer {
  id?: number;
  name: string;
  phone: string;
  email?: string;
}

interface Receipt {
  id?: number;
  receiptNumber: string;
  customerId: number;
  date: string;
  total: number;
  paymentMethod: PaymentMethod;
  status: ReceiptStatus;
}

interface ReceiptItem {
  id?: number;
  receiptId: number;
  serviceId: number;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface Service {
  id?: number;
  name: string;
  category: string;
  price: number;
}

const db = new Dexie("queencyHubDB") as Dexie & {
  customers: EntityTable<Customer, "id">;
  receipts: EntityTable<Receipt, "id">;
  receiptItems: EntityTable<ReceiptItem, "id">;
  services: EntityTable<Service, "id">;
};

db.version(1).stores({
  customers: "++id, name, email",
  receipts: "++id, receiptNumber, date",
  receiptItems: "++id, receiptId, serviceId",
});
