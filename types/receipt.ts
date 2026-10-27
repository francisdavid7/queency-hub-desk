import type { PaymentMethod, ReceiptStatus, SyncStatus } from "@/db/db";

export interface Receipt {
  id: string;
  receiptNumber: string;
  customerId?: string;
  cashierId?: string;
  deviceId?: string;

  date: string;
  /** Sum of line items before discount. */
  subtotal: number;
  discount: number;
  /** Amount due after discount. */
  total: number;
  /** Sum of recorded payments. */
  amountPaid?: number;
  notes?: string;

  /** Method of the first payment. */
  paymentMethod: PaymentMethod;
  status: ReceiptStatus;

  voidedAt?: string;
  voidedById?: string;
  voidReason?: string;

  createdAt: string;
  updatedAt: string;

  syncStatus: SyncStatus;
  syncedAt?: string;
  syncError?: string;
}
