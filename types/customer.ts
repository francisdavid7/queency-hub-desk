import type { SyncStatus } from "@/db/db";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;

  createdAt: string;
  updatedAt: string;

  syncStatus: SyncStatus;
  syncedAt?: string;
}
