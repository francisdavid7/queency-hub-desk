import Link from "next/link";

import { requireAdmin } from "@/lib/auth/session";
import {
  BarChart,
  formatDateTime,
  methodLabels,
  PageHeader,
  RangeFilter,
  StatCard,
  StatusBadge,
} from "@/components/admin/widgets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveRange } from "@/lib/admin/date-range";
import { getOverview } from "@/lib/admin/queries";
import { formatPrice } from "@/lib/money";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

export default async function AdminOverviewPage({ searchParams }: { searchParams: SearchParams }) {
  // Pages can render without their layout, so each checks auth itself.
  await requireAdmin();
  const params = await searchParams;
  const range = resolveRange({ range: one(params.range) ?? "today", from: one(params.from), to: one(params.to) });
  // Chart always shows at least the last 30 days for context.
  const chartRange = range.preset === "today" || range.preset === "yesterday" || range.preset === "7d"
    ? resolveRange({ range: "30d" })
    : range;
  const [overview, chart] = await Promise.all([
    getOverview(range),
    chartRange === range ? null : getOverview(chartRange),
  ]);
  const daily = (chart ?? overview).daily;

  return (
    <>
      <PageHeader
        title="Overview"
        description={`Business performance — ${range.label.toLowerCase()}.`}
        actions={<RangeFilter range={range} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Money collected" value={formatPrice(overview.collected)} hint="Payments received" />
        <StatCard
          label="Sales"
          value={formatPrice(overview.sales)}
          hint={`${overview.receiptCount} receipt${overview.receiptCount === 1 ? "" : "s"} · avg ${formatPrice(overview.averageSale)}`}
        />
        <StatCard
          label="Outstanding balances"
          value={formatPrice(overview.outstanding)}
          hint={`${overview.outstandingCount} unpaid receipt${overview.outstandingCount === 1 ? "" : "s"} (all time)`}
        />
        <StatCard
          label="Discounts · voids"
          value={formatPrice(overview.discounts)}
          hint={`${overview.voidCount} voided receipt${overview.voidCount === 1 ? "" : "s"}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Money collected per day — {chartRange.label.toLowerCase()}</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart
            ariaLabel="Money collected per day"
            data={daily.map((point) => ({ label: point.day.slice(5), value: point.amount }))}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment methods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.byMethod.length === 0 && (
              <p className="text-sm text-muted-foreground">No payments in this period.</p>
            )}
            {overview.byMethod.map((row) => (
              <div key={row.method} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{methodLabels[row.method]}</span>
                  <span className="tabular-nums">{formatPrice(row.amount)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${(row.amount / Math.max(overview.collected, 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overview.topServices.length === 0 && (
              <p className="text-sm text-muted-foreground">No sales in this period.</p>
            )}
            {overview.topServices.map((row) => (
              <div key={row.name} className="flex justify-between gap-3 text-sm">
                <span className="truncate">
                  {row.name} <span className="text-muted-foreground">× {row.quantity}</span>
                </span>
                <span className="tabular-nums">{formatPrice(row.amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Latest receipts</CardTitle>
          <Link href="/admin/transactions" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent className="divide-y divide-border p-0">
          {overview.recent.length === 0 && (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              No receipts have synced yet. Receipts appear here once a till syncs.
            </p>
          )}
          {overview.recent.map((receipt) => (
            <Link
              key={receipt.id}
              href={`/admin/transactions/${receipt.id}`}
              className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-muted/50"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {receipt.customer?.name ?? "Walk-in customer"}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {receipt.receiptNumber} · {formatDateTime(receipt.date)} · {receipt.cashier?.name ?? "Unknown cashier"}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <StatusBadge status={receipt.status} />
                <span className="text-sm font-semibold tabular-nums">
                  {formatPrice(Number(receipt.total))}
                </span>
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
