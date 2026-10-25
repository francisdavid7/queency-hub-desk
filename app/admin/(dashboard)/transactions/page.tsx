import Link from "next/link";
import { Download } from "lucide-react";

import {
  formatDateTime,
  methodLabels,
  PageHeader,
  Pagination,
  RangeFilter,
  StatusBadge,
} from "@/components/admin/widgets";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { resolveRange } from "@/lib/admin/date-range";
import { getStaffList, getTransactions } from "@/lib/admin/queries";
import { formatPrice } from "@/lib/money";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);
const fieldClass = "h-9 rounded-md border border-input bg-background px-2 text-sm";

export default async function AdminTransactionsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filters = {
    range: one(params.range),
    from: one(params.from),
    to: one(params.to),
    q: one(params.q),
    status: one(params.status),
    cashier: one(params.cashier),
    method: one(params.method),
  };
  const range = resolveRange(filters);
  const page = Number(one(params.page)) || 1;
  const [result, staff] = await Promise.all([
    getTransactions(range, { ...filters, page }),
    getStaffList(),
  ]);
  const exportParams = new URLSearchParams(
    Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );

  return (
    <>
      <PageHeader
        title="Transactions"
        description={`${result.count} receipt${result.count === 1 ? "" : "s"} · ${range.label.toLowerCase()} · ${formatPrice(result.total)} in valid sales`}
        actions={
          <a
            href={`/admin/export/transactions?${exportParams}`}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"
          >
            <Download className="size-4" />
            Export CSV
          </a>
        }
      />

      <RangeFilter
        range={range}
        extra={
          <>
            <label className="space-y-1 text-xs text-muted-foreground">
              <span className="block">Search</span>
              <input
                name="q"
                defaultValue={filters.q}
                placeholder="Receipt no., customer, phone"
                className={`${fieldClass} w-56`}
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              <span className="block">Status</span>
              <select name="status" defaultValue={filters.status ?? ""} className={fieldClass}>
                <option value="">All</option>
                <option value="completed">Completed</option>
                <option value="pending">Balance due</option>
                <option value="cancelled">Void</option>
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              <span className="block">Cashier</span>
              <select name="cashier" defaultValue={filters.cashier ?? ""} className={fieldClass}>
                <option value="">All</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              <span className="block">Method</span>
              <select name="method" defaultValue={filters.method ?? ""} className={fieldClass}>
                <option value="">All</option>
                {Object.entries(methodLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </>
        }
      />

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Cashier</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.map((receipt) => (
              <TableRow key={receipt.id}>
                <TableCell className="font-medium">
                  <Link href={`/admin/transactions/${receipt.id}`} className="text-primary hover:underline">
                    {receipt.receiptNumber}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatDateTime(receipt.date)}</TableCell>
                <TableCell>{receipt.customer?.name ?? "Walk-in"}</TableCell>
                <TableCell>{receipt.cashier?.name ?? "—"}</TableCell>
                <TableCell>{methodLabels[receipt.paymentMethod]}</TableCell>
                <TableCell>
                  <StatusBadge status={receipt.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatPrice(Number(receipt.total))}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPrice(Number(receipt.amountPaid))}</TableCell>
              </TableRow>
            ))}
            {result.rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  No transactions match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Pagination page={result.page} pageCount={result.pageCount} params={filters} />
    </>
  );
}
