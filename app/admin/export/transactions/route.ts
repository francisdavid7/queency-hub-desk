import { NextResponse } from "next/server";

import { lagosDateKey, resolveRange } from "@/lib/admin/date-range";
import { transactionWhere } from "@/lib/admin/queries";
import { getSessionUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma/prisma";

const MAX_ROWS = 20_000;

/** Quote a CSV cell; prefix formula-like values so spreadsheets don't execute them. */
function cell(value: string | number | null | undefined) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const range = resolveRange(params);
  const receipts = await prisma.receipt.findMany({
    where: transactionWhere(range, params),
    orderBy: { date: "asc" },
    take: MAX_ROWS,
    include: {
      customer: { select: { name: true, phone: true } },
      cashier: { select: { name: true } },
      voidedBy: { select: { name: true } },
    },
  });

  const header = [
    "Date (Lagos)", "Receipt", "Customer", "Phone", "Cashier", "Method", "Status",
    "Subtotal", "Discount", "Total", "Paid", "Balance", "Void reason", "Voided by",
  ];
  const rows = receipts.map((receipt) => {
    const total = Number(receipt.total);
    const paid = Number(receipt.amountPaid);
    return [
      `${lagosDateKey(receipt.date)} ${new Date(receipt.date.getTime() + 3_600_000).toISOString().slice(11, 16)}`,
      receipt.receiptNumber,
      receipt.customer?.name ?? "Walk-in",
      receipt.customer?.phone ?? "",
      receipt.cashier?.name ?? "",
      receipt.paymentMethod,
      receipt.status,
      Number(receipt.subtotal).toFixed(2),
      Number(receipt.discount).toFixed(2),
      total.toFixed(2),
      paid.toFixed(2),
      (receipt.voidedAt ? 0 : Math.max(total - paid, 0)).toFixed(2),
      receipt.voidReason ?? "",
      receipt.voidedBy?.name ?? "",
    ];
  });

  const csv = [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
  const filename = `hubdesk-transactions-${lagosDateKey(range.from)}-to-${lagosDateKey(new Date(range.to.getTime() - 1))}.csv`;
  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
