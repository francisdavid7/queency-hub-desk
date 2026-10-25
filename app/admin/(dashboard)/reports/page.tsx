import { Download } from "lucide-react";

import { BarChart, PageHeader, RangeFilter, StatCard } from "@/components/admin/widgets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { resolveRange } from "@/lib/admin/date-range";
import { getReport } from "@/lib/admin/queries";
import { formatPrice, roundMoney } from "@/lib/money";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

function Breakdown({ title, rows }: { title: string; rows: Array<{ name: string; quantity: number; amount: number }> }) {
  const total = rows.reduce((sum, row) => sum + row.amount, 0) || 1;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No sales in this period.</p>}
        {rows.map((row) => (
          <div key={row.name} className="flex justify-between gap-3 text-sm">
            <span className="truncate">
              {row.name} <span className="text-muted-foreground">× {row.quantity}</span>
            </span>
            <span className="shrink-0 tabular-nums">
              {formatPrice(row.amount)}{" "}
              <span className="text-xs text-muted-foreground">({Math.round((row.amount / total) * 100)}%)</span>
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const range = resolveRange({ range: one(params.range), from: one(params.from), to: one(params.to) });
  const report = await getReport(range);
  const totals = report.days.reduce(
    (acc, day) => ({
      receipts: acc.receipts + day.receipts,
      sales: acc.sales + day.sales,
      discounts: acc.discounts + day.discounts,
      collected: acc.collected + day.collected,
    }),
    { receipts: 0, sales: 0, discounts: 0, collected: 0 },
  );
  const exportQuery = new URLSearchParams({ range: range.preset, ...(one(params.from) ? { from: one(params.from)! } : {}), ...(one(params.to) ? { to: one(params.to)! } : {}) });

  return (
    <>
      <PageHeader
        title="Reports"
        description={`Daily sales and service breakdown — ${range.label.toLowerCase()}. Voided receipts are excluded.`}
        actions={
          <a
            href={`/admin/export/transactions?${exportQuery}`}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"
          >
            <Download className="size-4" />
            Export CSV
          </a>
        }
      />
      <RangeFilter range={range} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Receipts" value={String(totals.receipts)} />
        <StatCard label="Sales" value={formatPrice(roundMoney(totals.sales))} />
        <StatCard label="Collected" value={formatPrice(roundMoney(totals.collected))} />
        <StatCard label="Discounts" value={formatPrice(roundMoney(totals.discounts))} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Sales per day</CardTitle></CardHeader>
        <CardContent>
          <BarChart
            ariaLabel="Sales per day"
            data={report.days.map((day) => ({ label: day.day.slice(5), value: day.sales }))}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Breakdown title="By category" rows={report.categories} />
        <Breakdown title="By service" rows={report.services.slice(0, 20)} />
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Day</TableHead>
              <TableHead className="text-right">Receipts</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead className="text-right">Discounts</TableHead>
              <TableHead className="text-right">Collected</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...report.days].reverse().map((day) => (
              <TableRow key={day.day}>
                <TableCell>{day.day}</TableCell>
                <TableCell className="text-right tabular-nums">{day.receipts}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPrice(day.sales)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPrice(day.discounts)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPrice(day.collected)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
