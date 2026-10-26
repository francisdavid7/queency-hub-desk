import { z } from "zod";

/** Wire format shared by the till (client) and the sync API (server). */

const id = z.string().min(1).max(100);
const isoDate = z.iso.datetime({ offset: true });
const money = z.number().finite().min(0).max(1_000_000_000);
const optionalText = (max: number) => z.string().max(max).nullish();

export const paymentMethodSchema = z.enum(["CASH", "TRANSFER", "POS", "OTHER"]);
export const receiptStatusSchema = z.enum(["Completed", "Pending", "Cancelled"]);

export const syncCustomerSchema = z.object({
  id,
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(40),
  email: optionalText(200),
  deletedAt: isoDate.nullish(),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export const syncServiceSchema = z.object({
  id,
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(100),
  price: money,
  deletedAt: isoDate.nullish(),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export const syncReceiptItemSchema = z.object({
  id,
  serviceId: z.string().max(100).nullish(),
  serviceName: z.string().trim().min(1).max(200),
  serviceCategory: z.string().trim().min(1).max(100),
  quantity: z.number().int().positive().max(1_000_000),
  unitPrice: money,
  amount: money,
  createdAt: isoDate,
});

export const syncReceiptSchema = z.object({
  id,
  receiptNumber: z.string().min(1).max(60),
  customerId: id.nullish(),
  cashierId: id.nullish(),
  date: isoDate,
  subtotal: money,
  discount: money,
  total: money,
  paymentMethod: paymentMethodSchema,
  status: receiptStatusSchema,
  notes: optionalText(500),
  voidedAt: isoDate.nullish(),
  voidedById: id.nullish(),
  voidReason: optionalText(300),
  createdAt: isoDate,
  updatedAt: isoDate,
  items: z.array(syncReceiptItemSchema).min(1).max(200),
});

export const syncPaymentSchema = z.object({
  id,
  receiptId: id,
  amount: money.positive(),
  method: paymentMethodSchema,
  cashierId: id.nullish(),
  receivedAt: isoDate,
  createdAt: isoDate,
});

export const MAX_PUSH_BATCH = 200;

export const pushRequestSchema = z.object({
  customers: z.array(syncCustomerSchema).max(MAX_PUSH_BATCH).default([]),
  services: z.array(syncServiceSchema).max(MAX_PUSH_BATCH).default([]),
  receipts: z.array(syncReceiptSchema).max(MAX_PUSH_BATCH).default([]),
  payments: z.array(syncPaymentSchema).max(MAX_PUSH_BATCH * 2).default([]),
});

export type SyncCustomer = z.infer<typeof syncCustomerSchema>;
export type SyncService = z.infer<typeof syncServiceSchema>;
export type SyncReceipt = z.infer<typeof syncReceiptSchema>;
export type SyncReceiptItem = z.infer<typeof syncReceiptItemSchema>;
export type SyncPayment = z.infer<typeof syncPaymentSchema>;
export type PushRequest = z.infer<typeof pushRequestSchema>;

export type PushResult =
  | { id: string; ok: true }
  /** retryable: leave the record pending and try again on the next sync. */
  | { id: string; ok: false; error: string; retryable: boolean };

export interface PushResponse {
  customers: PushResult[];
  services: PushResult[];
  receipts: PushResult[];
  payments: PushResult[];
}

export interface PullCursors {
  customers: string | null;
  services: string | null;
  receipts: string | null;
}

export interface PulledReceipt extends Omit<SyncReceipt, "items"> {
  deviceId: string | null;
  amountPaid: number;
  items: SyncReceiptItem[];
  payments: SyncPayment[];
}

export interface PullResponse {
  customers: SyncCustomer[];
  services: SyncService[];
  receipts: PulledReceipt[];
  staff: Array<{ id: string; name: string; role: "ADMIN" | "CASHIER"; isActive: boolean }>;
  settings: {
    businessName: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    receiptFooter: string | null;
  };
  cursors: PullCursors;
  hasMore: boolean;
}
