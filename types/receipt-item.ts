import type { SyncStatus } from "@/db/db";

export interface ReceiptItem {
  id: string;
  receiptId: string;
  serviceId: string;
  serviceName?: string;
  serviceCategory?: string;

  quantity: number;
  unitPrice: number;
  amount: number;

  createdAt: string;
  updatedAt: string;

  syncStatus: SyncStatus;
  syncedAt?: string;
  syncError?: string;
}
