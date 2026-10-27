import type { BusinessSettings } from "@/types/meta";
import type { Payment } from "@/types/payment";
import type { Receipt } from "@/types/receipt";
import type { ReceiptItem } from "@/types/receipt-item";

const money = (amount: number) =>
  new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

const methodLabels: Record<string, string> = {
  CASH: "Cash",
  TRANSFER: "Transfer",
  POS: "POS",
  OTHER: "Other",
};

interface ThermalReceiptProps {
  receipt: Receipt;
  items: ReceiptItem[];
  payments: Payment[];
  customerName: string;
  customerPhone?: string;
  cashierName?: string;
  settings?: BusinessSettings;
}

/**
 * Plain, monochrome layout for 58mm/80mm thermal printers. Hidden on screen;
 * cloned into the print portal when the till prints on roll paper.
 */
function ThermalReceipt({
  receipt,
  items,
  payments,
  customerName,
  customerPhone,
  cashierName,
  settings,
}: ThermalReceiptProps) {
  const paid = receipt.amountPaid ?? 0;
  const balance = Math.max(receipt.total - paid, 0);
  const change = Math.max(paid - receipt.total, 0);
  const subtotal = receipt.subtotal ?? receipt.total;

  return (
    <div className="thermal-receipt" data-thermal-source aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- plain img clones cleanly into the print portal */}
      <img src="/logo-blue.png" alt="" className="thermal-logo" />
      <p className="thermal-center thermal-bold">{settings?.businessName ?? "Queency Hub"}</p>
      {settings?.address && <p className="thermal-center">{settings.address}</p>}
      {settings?.phone && <p className="thermal-center">Tel: {settings.phone}</p>}
      <div className="thermal-rule" />

      {receipt.status === "Cancelled" && (
        <p className="thermal-center thermal-bold thermal-large">*** VOID ***</p>
      )}
      <p className="thermal-row"><span>Receipt</span><span className="thermal-bold">{receipt.receiptNumber}</span></p>
      <p className="thermal-row">
        <span>Date</span>
        <span>
          {new Intl.DateTimeFormat("en-NG", { dateStyle: "short", timeStyle: "short" }).format(new Date(receipt.date))}
        </span>
      </p>
      <p className="thermal-row"><span>Customer</span><span>{customerName}</span></p>
      {customerPhone && <p className="thermal-row"><span>Phone</span><span>{customerPhone}</span></p>}
      {cashierName && <p className="thermal-row"><span>Cashier</span><span>{cashierName}</span></p>}
      <div className="thermal-rule" />

      {items.map((item) => (
        <div key={item.id} className="thermal-item">
          <p className="thermal-item-name">{item.serviceName ?? "Service"}</p>
          <p className="thermal-row">
            <span>
              {item.quantity} x {money(item.unitPrice)}
            </span>
            <span>{money(item.amount)}</span>
          </p>
        </div>
      ))}
      <div className="thermal-rule" />

      <p className="thermal-row"><span>Subtotal</span><span>{money(subtotal)}</span></p>
      {(receipt.discount ?? 0) > 0 && (
        <p className="thermal-row"><span>Discount</span><span>-{money(receipt.discount)}</span></p>
      )}
      <p className="thermal-row thermal-bold thermal-large"><span>TOTAL (NGN)</span><span>{money(receipt.total)}</span></p>
      {payments.map((payment) => (
        <p key={payment.id} className="thermal-row">
          <span>Paid · {methodLabels[payment.method] ?? payment.method}</span>
          <span>{money(payment.amount)}</span>
        </p>
      ))}
      {change > 0 && <p className="thermal-row"><span>Change</span><span>{money(change)}</span></p>}
      {balance > 0 && receipt.status !== "Cancelled" && (
        <p className="thermal-row thermal-bold"><span>BALANCE DUE</span><span>{money(balance)}</span></p>
      )}
      {receipt.notes && (
        <>
          <div className="thermal-rule" />
          <p>Note: {receipt.notes}</p>
        </>
      )}
      <div className="thermal-rule" />
      <p className="thermal-center">{settings?.receiptFooter ?? "Thank you for your patronage."}</p>
    </div>
  );
}

export default ThermalReceipt;
