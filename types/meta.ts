import type { PullCursors } from "@/lib/sync/contract";

export interface StaffMember {
  id: string;
  name: string;
  role: "ADMIN" | "CASHIER";
}

export interface DeviceRegistration {
  id: string;
  code: string;
  name: string;
  token: string;
}

export interface BusinessSettings {
  businessName: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  receiptFooter?: string | null;
}

export type PaperWidth = "80mm" | "58mm" | "A4";

export interface MetaValues {
  device: DeviceRegistration;
  receiptCounter: number;
  pullCursors: PullCursors;
  staff: StaffMember[];
  lastSyncAt: string;
  businessSettings: BusinessSettings;
  paperWidth: PaperWidth;
}

export type MetaKey = keyof MetaValues;

export interface MetaEntry<K extends MetaKey = MetaKey> {
  key: K;
  value: MetaValues[K];
}
