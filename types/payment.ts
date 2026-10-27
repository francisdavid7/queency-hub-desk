import type { PaymentMethod, SyncStatus } from "@/db/db";

export interface Payment {
  id: string;
  receiptId: string;
  amount: number;
  method: PaymentMethod;
  cashierId?: string;
  receivedAt: string;

  createdAt: string;
  updatedAt: string;

  syncStatus: SyncStatus;
  syncedAt?: string;
  syncError?: string;
}
