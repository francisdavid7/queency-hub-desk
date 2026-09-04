import type { PaymentMethod, ReceiptStatus, SyncStatus } from "@/db/db";

export interface Receipt {
  id: string;
  receiptNumber: string;
  customerId?: string;

  date: string;
  total: number;

  paymentMethod: PaymentMethod;
  status: ReceiptStatus;

  createdAt: string;
  updatedAt: string;

  syncStatus: SyncStatus;
  syncedAt?: string;
}
