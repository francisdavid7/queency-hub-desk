import type { SyncStatus } from "@/db/db";

export interface Service {
  id: string;
  name: string;
  category: string;
  price: number;

  createdAt: string;
  updatedAt: string;

  syncStatus: SyncStatus;
  syncedAt?: string;
}
