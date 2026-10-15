"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Printer,
  Plus,
  ReceiptText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Customer } from "@/types/customer";
import type { Receipt } from "@/types/receipt";
import type { ReceiptItem } from "@/types/receipt-item";
import type { Service } from "@/types/service";
import Image from "next/image";
import logo from "../../public/logo-blue.png";

interface ReceiptGeneratedProps {
  receipt: Receipt;
  customer: Customer | null;
  isWalkIn: boolean;
  services: Service[];
  receiptItems: ReceiptItem[];
  onBack: () => void;
  onNewReceipt: () => void;
  backLabel?: string;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(price);

function getReceiptFilename(customerName: string | undefined) {
  const safeCustomerName = (customerName || "Walk-in Customer")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "");

  return `QFLC-REC-${safeCustomerName || "Walk-in Customer"}`;
}

function ReceiptGenerated({
  receipt,
  customer,
  isWalkIn,
  services,
  receiptItems,
  onBack,
  onNewReceipt,
  backLabel = "Back to payment",
}: ReceiptGeneratedProps) {
  const amountPaid = receipt.amountPaid ?? 0;
  const balance = Math.max(receipt.total - amountPaid, 0);
  const change = Math.max(amountPaid - receipt.total, 0);

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = getReceiptFilename(
      isWalkIn ? "Walk-in Customer" : customer?.name,
    );

    window.addEventListener(
      "afterprint",
      () => {
        document.title = originalTitle;
      },
      { once: true },
    );

    window.print();
  };

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
      <Card
        id="receipt-print"
        className="relative isolate print:mx-auto print:max-w-2xl print:border-0 print:shadow-none"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 z-0 flex items-center justify-center overflow-hidden"
        >
          <Image
            src={logo}
            alt=""
            className="h-auto w-[80%] opacity-[0.055] print:opacity-[0.07]"
            priority
          />
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 z-0 flex items-center justify-center overflow-hidden"
        >
          <Image
            src={logo}
            alt=""
            className="h-auto w-[80%] opacity-[0.055] print:opacity-[0.07]"
            priority
          />
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden"
        >
          <Image
            src={logo}
            alt=""
            className="h-auto w-[82%] opacity-[0.055] print:opacity-[0.07]"
            priority
          />
        </div>
        <CardHeader className="relative z-10 items-center border-b border-dashed border-border pb-5 text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-accent text-primary">
            <ReceiptText className="size-6" />
          </div>
          <CardTitle className="text-xl w-fit mx-auto">
            <Image
              src={logo}
              alt="queency-logo"
              className="w-34"
              loading="eager"
            />
          </CardTitle>
          <p className="text-sm text-muted-foreground">Sales receipt</p>
        </CardHeader>
        <CardContent className="relative z-10 space-y-5 pt-5">
          <div className="flex items-start justify-between gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Receipt number</p>
              <p className="mt-1 font-bold">{receipt.receiptNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Date</p>
              <p className="mt-1 font-medium">
                {new Intl.DateTimeFormat("en-NG", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(receipt.date))}
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-muted/40 p-3 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Customer
            </p>
            <p className="mt-1 font-semibold">
              {isWalkIn ? "Walk-in Customer" : customer?.name}
            </p>
            {!isWalkIn && customer?.phone && (
              <p className="text-muted-foreground">{customer.phone}</p>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 bg-muted/50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Service</span>
              <span>Qty</span>
              <span className="text-right">Amount</span>
            </div>
            {receiptItems.map((item) => {
              const service = services.find(
                (currentService) => currentService.id === item.serviceId,
              );

              return (
                <div
                  key={item.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 border-t border-border px-3 py-3 text-sm"
                >
                  <span className="font-medium">
                    {item.serviceName ?? service?.name ?? "Service"}
                  </span>
                  <span>{item.quantity}</span>
                  <span className="text-right font-medium tabular-nums">
                    {formatPrice(item.amount)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="space-y-2 border-t border-dashed border-border pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{formatPrice(receipt.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment method</span>
              <span className="font-medium">
                {receipt.paymentMethod === "POS"
                  ? "POS"
                  : receipt.paymentMethod === "OTHER"
                    ? "Other"
                    : receipt.paymentMethod === "TRANSFER"
                      ? "Bank transfer"
                      : "Cash"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount received</span>
              <span className="tabular-nums">{formatPrice(amountPaid)}</span>
            </div>
            {change > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Change</span>
                <span className="tabular-nums">{formatPrice(change)}</span>
              </div>
            )}
            {balance > 0 && (
              <div className="flex justify-between font-semibold text-warning">
                <span>Balance due</span>
                <span className="tabular-nums">{formatPrice(balance)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(receipt.total)}</span>
            </div>
          </div>

          {receipt.notes && (
            <p className="rounded-lg bg-muted/40 p-3 text-sm">
              <span className="font-semibold">Note: </span>
              {receipt.notes}
            </p>
          )}
          <p className="border-t border-dashed border-border pt-4 text-center text-sm text-muted-foreground">
            Thank you for your Patronage.
          </p>
        </CardContent>
      </Card>

      <Card className="h-fit print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="size-5 text-success" />
            Receipt generated
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {receipt.status === "Completed"
              ? "Payment has been completed and saved."
              : "Receipt saved with an outstanding balance."}
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            type="button"
            className="w-full gap-2"
            onClick={handlePrint}
          >
            <Printer className="size-4" />
            Print receipt
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={onBack}
          >
            <ArrowLeft className="size-4" />
            {backLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full gap-2"
            onClick={onNewReceipt}
          >
            <Plus className="size-4" />
            Create another receipt
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default ReceiptGenerated;
