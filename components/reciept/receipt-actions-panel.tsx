"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Ban, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { db, type PaymentMethod } from "@/db/db";
import { useCashierSession } from "@/hooks/custom/use-cashier-session";
import { recordPayment, voidReceipt } from "@/lib/actions/receipt-actions";
import { formatPrice, roundMoney } from "@/lib/money";
import type { Receipt } from "@/types/receipt";

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Cash",
  TRANSFER: "Bank transfer",
  POS: "POS",
  OTHER: "Other",
};

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

function ReceiptActionsPanel({ receipt }: { receipt: Receipt }) {
  const session = useCashierSession();
  const payments = useLiveQuery(
    () => db.payments.where("receiptId").equals(receipt.id).sortBy("receivedAt"),
    [receipt.id],
    [],
  );
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [amount, setAmount] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);

  const isVoided = receipt.status === "Cancelled";
  const balance = roundMoney(Math.max(receipt.total - (receipt.amountPaid ?? 0), 0));

  const handleRecordPayment = async () => {
    setIsPaying(true);
    try {
      await recordPayment(receipt.id, method, Number(amount));
      toast.success("Payment recorded", {
        description: `${formatPrice(Number(amount))} for ${receipt.receiptNumber}`,
      });
      setAmount("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to record payment");
    } finally {
      setIsPaying(false);
    }
  };

  const handleVoid = async () => {
    setIsVoiding(true);
    try {
      await voidReceipt(receipt.id, reason);
      toast.success("Receipt voided", { description: receipt.receiptNumber });
      setVoidOpen(false);
      setReason("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to void receipt");
    } finally {
      setIsVoiding(false);
    }
  };

  return (
    <div className="space-y-3 border-t border-border pt-3">
      {payments.length > 0 && (
        <div className="space-y-1 text-xs">
          <p className="font-semibold uppercase tracking-wide text-muted-foreground">
            Payments
          </p>
          {payments.map((payment) => (
            <div key={payment.id} className="flex justify-between gap-2">
              <span className="text-muted-foreground">
                {new Intl.DateTimeFormat("en-NG", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(payment.receivedAt))}{" "}
                · {paymentMethodLabels[payment.method]}
              </span>
              <span className="tabular-nums">{formatPrice(payment.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {!isVoided && balance > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Balance due:{" "}
            <span className="tabular-nums text-warning">{formatPrice(balance)}</span>
          </p>
          <select
            className={selectClassName}
            value={method}
            onChange={(event) => setMethod(event.target.value as PaymentMethod)}
            aria-label="Payment method"
          >
            {Object.entries(paymentMethodLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Input
              inputMode="decimal"
              placeholder={balance.toFixed(2)}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-label="Payment amount"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAmount(balance.toFixed(2))}
            >
              Full
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            disabled={isPaying || !(Number(amount) > 0)}
            onClick={() => void handleRecordPayment()}
          >
            <Wallet className="size-4" />
            {isPaying ? "Recording..." : "Record payment"}
          </Button>
        </div>
      )}

      {!isVoided && session?.role === "ADMIN" && (
        <Button
          type="button"
          variant="ghost"
          className="w-full gap-2 text-destructive hover:text-destructive"
          onClick={() => setVoidOpen(true)}
        >
          <Ban className="size-4" />
          Void receipt
        </Button>
      )}

      <Dialog
        open={voidOpen}
        onOpenChange={(open) => {
          if (!isVoiding) setVoidOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void receipt {receipt.receiptNumber}?</DialogTitle>
            <DialogDescription>
              The receipt stays in the history marked as VOID and no longer
              counts toward revenue. This is recorded in the audit log.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Reason (required)"
            value={reason}
            maxLength={300}
            onChange={(event) => setReason(event.target.value)}
          />
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline" disabled={isVoiding}>
                  Cancel
                </Button>
              }
            />
            <Button
              type="button"
              variant="destructive"
              disabled={isVoiding || reason.trim().length < 3}
              onClick={() => void handleVoid()}
            >
              {isVoiding ? "Voiding..." : "Void receipt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ReceiptActionsPanel;
