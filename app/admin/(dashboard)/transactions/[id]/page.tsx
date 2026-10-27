import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ActionForm, SubmitButton } from "@/components/admin/form-controls";
import { formatDateTime, methodLabels, PageHeader, StatusBadge } from "@/components/admin/widgets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { voidReceiptAction } from "@/lib/admin/actions";
import { getReceiptDetail } from "@/lib/admin/queries";
import { formatPrice } from "@/lib/money";

export default async function AdminReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  // Pages can render without their layout, so each checks auth itself.
  await requireAdmin();
  const { id } = await params;
  const receipt = await getReceiptDetail(id);
  if (!receipt) notFound();

  const total = Number(receipt.total);
  const paid = Number(receipt.amountPaid);
  const balance = Math.max(total - paid, 0);

  return (
    <>
      <Link href="/admin/transactions" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Transactions
      </Link>
      <PageHeader
        title={`Receipt ${receipt.receiptNumber}`}
        description={`${formatDateTime(receipt.date)} · ${receipt.device ? `${receipt.device.name} (${receipt.device.code})` : "Unknown till"}`}
        actions={<StatusBadge status={receipt.status} />}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="divide-y divide-border rounded-lg border border-border">
              {receipt.items.map((item) => (
                <div key={item.id} className="flex justify-between gap-3 px-3 py-2 text-sm">
                  <span>
                    {item.serviceName}
                    <span className="block text-xs text-muted-foreground">
                      {item.serviceCategory} · {item.quantity} × {formatPrice(Number(item.unitPrice))}
                    </span>
                  </span>
                  <span className="tabular-nums">{formatPrice(Number(item.amount))}</span>
                </div>
              ))}
            </div>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular-nums">{formatPrice(Number(receipt.subtotal))}</dd></div>
              {Number(receipt.discount) > 0 && (
                <div className="flex justify-between"><dt className="text-muted-foreground">Discount</dt><dd className="tabular-nums">−{formatPrice(Number(receipt.discount))}</dd></div>
              )}
              <div className="flex justify-between font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatPrice(total)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Paid</dt><dd className="tabular-nums">{formatPrice(paid)}</dd></div>
              {balance > 0 && !receipt.voidedAt && (
                <div className="flex justify-between font-semibold text-warning"><dt>Balance due</dt><dd className="tabular-nums">{formatPrice(balance)}</dd></div>
              )}
            </dl>
            {receipt.notes && <p className="rounded-lg bg-muted/50 p-3 text-sm">Note: {receipt.notes}</p>}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-2 p-4 text-sm">
              <p><span className="text-muted-foreground">Customer: </span>{receipt.customer ? `${receipt.customer.name} · ${receipt.customer.phone}` : "Walk-in"}</p>
              <p><span className="text-muted-foreground">Cashier: </span>{receipt.cashier?.name ?? "Unknown"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Payments</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {receipt.payments.length === 0 && <p className="text-muted-foreground">No payments recorded.</p>}
              {receipt.payments.map((payment) => (
                <div key={payment.id} className="flex justify-between gap-2">
                  <span>
                    {methodLabels[payment.method]}
                    <span className="block text-xs text-muted-foreground">
                      {formatDateTime(payment.receivedAt)} · {payment.cashier?.name ?? "—"}
                    </span>
                  </span>
                  <span className="tabular-nums">{formatPrice(Number(payment.amount))}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {receipt.voidedAt ? (
            <Card className="border-destructive/40">
              <CardContent className="space-y-1 p-4 text-sm text-destructive">
                <p className="font-semibold">Voided {formatDateTime(receipt.voidedAt)}</p>
                <p>By {receipt.voidedBy?.name ?? "unknown"} — {receipt.voidReason}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-base">Void receipt</CardTitle></CardHeader>
              <CardContent>
                <ActionForm action={voidReceiptAction} className="space-y-2">
                  <input type="hidden" name="receiptId" value={receipt.id} />
                  <Input name="reason" placeholder="Reason (required)" required minLength={3} maxLength={300} />
                  <p className="text-xs text-muted-foreground">
                    The receipt stays on record marked VOID and stops counting toward revenue. The till
                    picks this up on its next sync.
                  </p>
                  <SubmitButton variant="destructive" className="w-full" pendingLabel="Voiding...">
                    Void receipt
                  </SubmitButton>
                </ActionForm>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
