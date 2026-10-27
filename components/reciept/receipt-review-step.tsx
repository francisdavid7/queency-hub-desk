"use client";

import { ArrowLeft, ArrowRight, UserRound } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Customer } from "@/types/customer";
import type { ReceiptCart } from "./receipt-services-step";

interface ReceiptReviewStepProps {
  customer: Customer | null;
  isWalkIn: boolean;
  cart: ReceiptCart;
  notes: string;
  onNotesChange: (notes: string) => void;
  discount: string;
  onDiscountChange: (discount: string) => void;
  /** The receipt is already saved; items and discount can no longer change. */
  locked?: boolean;
  onBack: () => void;
  onContinue: () => void;
}

import { formatPrice, roundMoney } from "@/lib/money";

function ReceiptReviewStep({
  customer,
  isWalkIn,
  cart,
  notes,
  onNotesChange,
  discount,
  onDiscountChange,
  locked = false,
  onBack,
  onContinue,
}: ReceiptReviewStepProps) {
  const cartServices = cart.filter((item) => item.quantity > 0);
  const subtotal = roundMoney(
    cartServices.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
  );
  const discountValue = Number(discount) || 0;
  const discountInvalid =
    discount.trim() !== "" &&
    (!/^\d+(\.\d{1,2})?$/.test(discount.trim()) || discountValue > subtotal);
  const total = roundMoney(subtotal - Math.min(discountValue, subtotal));

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Review order</CardTitle>
          <p className="text-sm text-muted-foreground">
            Confirm the customer and service quantities before taking payment.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
            <Avatar className="size-11">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {isWalkIn ? (
                  <UserRound className="size-5" />
                ) : (
                  customer?.name
                    .trim()
                    .split(/\s+/)
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                )}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">
                {isWalkIn ? "Walk-in Customer" : customer?.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {isWalkIn ? "No customer record" : customer?.phone}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 bg-muted/50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Service</span>
              <span>Qty</span>
              <span className="text-right">Amount</span>
            </div>
            {cartServices.map((item) => (
              <div
                key={item.key}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-t border-border px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.serviceName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.serviceCategory} · {formatPrice(item.unitPrice)} each
                  </p>
                </div>
                <span className="text-muted-foreground">
                  {item.quantity}
                </span>
                <span className="text-right font-semibold tabular-nums">
                  {formatPrice(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <label htmlFor="receipt-notes" className="text-sm font-medium">
              Notes (optional)
            </label>
            <Input
              id="receipt-notes"
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              placeholder="Add an order note"
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="receipt-discount" className="text-sm font-medium">
              Discount (₦, optional)
            </label>
            <Input
              id="receipt-discount"
              inputMode="decimal"
              value={discount}
              onChange={(event) => onDiscountChange(event.target.value)}
              placeholder="0.00"
              disabled={locked}
              aria-invalid={discountInvalid}
            />
            {discountInvalid && (
              <p className="text-sm text-destructive">
                Enter an amount up to {formatPrice(subtotal)}.
              </p>
            )}
          </div>

          <div className="space-y-1 border-t border-border pt-4">
            {discountValue > 0 && (
              <>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Discount</span>
                  <span className="tabular-nums">
                    −{formatPrice(Math.min(discountValue, subtotal))}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(total)}</span>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={onBack}>
              <ArrowLeft className="size-4" />
              Back to Services
            </Button>
            <Button type="button" onClick={onContinue} disabled={discountInvalid}>
              Continue to Payment
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="h-fit bg-accent/50">
        <CardHeader>
          <CardTitle className="text-base">Ready for payment</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            Check the selected services and quantities carefully. You can go
            back to make changes before recording the payment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default ReceiptReviewStep;
