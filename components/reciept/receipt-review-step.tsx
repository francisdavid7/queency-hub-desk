"use client";

import { ArrowLeft, ArrowRight, UserRound } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Customer } from "@/types/customer";
import type { Service } from "@/types/service";
import type { ReceiptCart } from "./receipt-services-step";

interface ReceiptReviewStepProps {
  customer: Customer | null;
  isWalkIn: boolean;
  services: Service[];
  cart: ReceiptCart;
  notes: string;
  onNotesChange: (notes: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(price);

function ReceiptReviewStep({
  customer,
  isWalkIn,
  services,
  cart,
  notes,
  onNotesChange,
  onBack,
  onContinue,
}: ReceiptReviewStepProps) {
  const cartServices = services.filter((service) => cart[service.id]);
  const total = cartServices.reduce(
    (sum, service) => sum + service.price * cart[service.id],
    0,
  );

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
            {cartServices.map((service) => (
              <div
                key={service.id}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-t border-border px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{service.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatPrice(service.price)} each
                  </p>
                </div>
                <span className="text-muted-foreground">
                  {cart[service.id]}
                </span>
                <span className="text-right font-semibold tabular-nums">
                  {formatPrice(service.price * cart[service.id])}
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

          <div className="flex justify-between border-t border-border pt-4 text-lg font-bold">
            <span>Total</span>
            <span className="tabular-nums">{formatPrice(total)}</span>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={onBack}>
              <ArrowLeft className="size-4" />
              Back to Services
            </Button>
            <Button type="button" onClick={onContinue}>
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
