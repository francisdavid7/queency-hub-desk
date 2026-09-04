import type { SyncStatus } from "@/db/db";

export interface ReceiptItem {
  id: string;
  receiptId: string;
  serviceId: string;

  quantity: number;
  unitPrice: number;
  amount: number;

  createdAt: string;
  updatedAt: string;

  ssyncStatus: SyncStatus;
  syncedAt?: string;
}
