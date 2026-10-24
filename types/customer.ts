import type { SyncStatus } from "@/db/db";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;

  /** Soft delete marker so the deletion can sync. */
  deletedAt?: string;

  createdAt: string;
  updatedAt: string;

  syncStatus: SyncStatus;
  syncedAt?: string;
  syncError?: string;
}
