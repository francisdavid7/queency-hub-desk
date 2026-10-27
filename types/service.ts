import type { SyncStatus } from "@/db/db";

export interface Service {
  id: string;
  name: string;
  category: string;
  price: number;

  /** Soft delete marker so the deletion can sync. */
  deletedAt?: string;

  createdAt: string;
  updatedAt: string;

  syncStatus: SyncStatus;
  syncedAt?: string;
  syncError?: string;
}
