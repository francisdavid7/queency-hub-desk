"use client";

import { useMemo } from "react";
import { ArrowLeft, ArrowRight, Banknote, CreditCard, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { PaymentMethod } from "@/db/db";

interface ReceiptPaymentStepProps {
  total: number;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  amountPaid: string;
  onAmountPaidChange: (amount: string) => void;
  isSaving: boolean;
  onBack: () => void;
  onGenerate: () => void;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(price);

const paymentMethods: Array<{
  id: PaymentMethod;
  label: string;
  icon: typeof Banknote;
}> = [
  { id: "CASH", label: "Cash", icon: Banknote },
  { id: "TRANSFER", label: "Bank transfer", icon: Wallet },
  { id: "POS", label: "POS", icon: CreditCard },
  { id: "OTHER", label: "Other", icon: Wallet },
];

function ReceiptPaymentStep({
  total,
  paymentMethod,
  onPaymentMethodChange,
  amountPaid,
  onAmountPaidChange,
  isSaving,
  onBack,
  onGenerate,
}: ReceiptPaymentStepProps) {
  const paid = Number(amountPaid) || 0;
  const balance = Math.max(total - paid, 0);
  const change = Math.max(paid - total, 0);
  const canGenerate = amountPaid.trim() !== "" && Number.isFinite(paid) && paid >= 0;
  const paymentState = useMemo(
    () => (balance === 0 ? "Fully paid" : paid > 0 ? "Partially paid" : "Unpaid"),
    [balance, paid],
  );

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Payment details</CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose a payment method and enter the amount received.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border border-primary/15 bg-accent/60 p-4">
            <p className="text-sm text-muted-foreground">Total amount</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-primary">
              {formatPrice(total)}
            </p>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Payment method</legend>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={paymentMethod === id}
                  onClick={() => onPaymentMethodChange(id)}
                  className={`flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors ${
                    paymentMethod === id
                      ? "border-primary bg-accent text-accent-foreground ring-1 ring-primary/30"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <label htmlFor="amount-paid" className="text-sm font-medium">
              Amount received
            </label>
            <Input
              id="amount-paid"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={amountPaid}
              onChange={(event) => onAmountPaidChange(event.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={onBack}>
              <ArrowLeft className="size-4" />
              Back to Review
            </Button>
            <Button
              type="button"
              onClick={onGenerate}
              disabled={!canGenerate || isSaving}
            >
              {isSaving ? "Saving..." : "Generate Receipt"}
              {!isSaving && <ArrowRight className="size-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Payment summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-muted-foreground">Total due</span>
            <span className="font-semibold tabular-nums">
              {formatPrice(total)}
            </span>
          </div>
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-muted-foreground">Amount received</span>
            <span className="font-semibold tabular-nums">
              {formatPrice(paid)}
            </span>
          </div>
          <div className="flex justify-between gap-4 border-t border-border pt-4 text-sm">
            <span className="font-semibold">
              {change ? "Change" : "Balance due"}
            </span>
            <span
              className={`font-bold tabular-nums ${
                change ? "text-success" : balance ? "text-warning" : "text-success"
              }`}
            >
              {formatPrice(change || balance)}
            </span>
          </div>
          <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
            Payment status: <span className="font-semibold">{paymentState}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ReceiptPaymentStep;
