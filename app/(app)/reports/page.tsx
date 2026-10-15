"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { BarChart3, Download, ReceiptText, Users, Wallet } from "lucide-react";

import Header from "@/components/shared/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db, type PaymentMethod } from "@/db/db";
import type { Receipt } from "@/types/receipt";

type ReportPeriod = "7d" | "30d" | "90d" | "all";

const periodOptions: Array<{ value: ReportPeriod; label: string }> = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

const paymentLabels: Record<PaymentMethod, string> = {
  CASH: "Cash",
  TRANSFER: "Bank transfer",
  POS: "POS",
  OTHER: "Other",
};

const formatPrice = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(amount);

function getReceiptRevenue(
  receipt: Pick<Receipt, "status" | "total" | "amountPaid">,
) {
  if (receipt.status === "Cancelled") return 0;
  return Math.min(
    receipt.total,
    receipt.amountPaid ?? (receipt.status === "Completed" ? receipt.total : 0),
  );
}

function csvValue(value: string | number) {
  const text = String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function ReportsPage() {
  const receipts = useLiveQuery(() => db.receipts.toArray(), [], []);
  const customers = useLiveQuery(() => db.customers.toArray(), [], []);
  const services = useLiveQuery(() => db.services.toArray(), [], []);
  const receiptItems = useLiveQuery(() => db.receiptItems.toArray(), [], []);
  const [period, setPeriod] = useState<ReportPeriod>("30d");
  const [now] = useState(() => new Date());

  const periodStart = useMemo(() => {
    if (period === "all") return null;
    const days = Number(period.slice(0, -1));
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - days + 1);
    return start;
  }, [period]);

  const filteredReceipts = useMemo(
    () =>
      receipts.filter(
        (receipt) =>
          periodStart === null || new Date(receipt.date) >= periodStart,
      ),
    [periodStart, receipts],
  );

  const report = useMemo(() => {
    const receiptIds = new Set(
      filteredReceipts
        .filter((receipt) => receipt.status !== "Cancelled")
        .map((receipt) => receipt.id),
    );
    const revenue = filteredReceipts.reduce(
      (sum, receipt) => sum + getReceiptRevenue(receipt),
      0,
    );
    const averageReceipt = filteredReceipts.length
      ? revenue / filteredReceipts.length
      : 0;
    const uniqueCustomerCount = new Set(
      filteredReceipts
        .map((receipt) => receipt.customerId)
        .filter((customerId): customerId is string => Boolean(customerId)),
    ).size;

    const serviceMap = new Map<
      string,
      { name: string; quantity: number; revenue: number }
    >();
    for (const item of receiptItems) {
      if (!receiptIds.has(item.receiptId)) continue;
      const name =
        item.serviceName ??
        services.find((service) => service.id === item.serviceId)?.name ??
        "Service";
      const current = serviceMap.get(item.serviceId) ?? {
        name,
        quantity: 0,
        revenue: 0,
      };
      current.quantity += item.quantity;
      current.revenue += item.amount;
      serviceMap.set(item.serviceId, current);
    }

    const paymentMap = new Map<PaymentMethod, number>();
    for (const receipt of filteredReceipts) {
      if (receipt.status === "Cancelled") continue;
      paymentMap.set(
        receipt.paymentMethod,
        (paymentMap.get(receipt.paymentMethod) ?? 0) +
          Math.min(
            receipt.total,
            receipt.amountPaid ??
              (receipt.status === "Completed" ? receipt.total : 0),
          ),
      );
    }

    return {
      revenue,
      averageReceipt,
      uniqueCustomerCount,
      serviceRows: [...serviceMap.values()].sort(
        (left, right) => right.revenue - left.revenue,
      ),
      paymentRows: [...paymentMap.entries()].sort(
        (left, right) => right[1] - left[1],
      ),
    };
  }, [filteredReceipts, receiptItems, services]);

  const chart = useMemo(() => {
    const count = period === "7d" ? 7 : period === "30d" ? 10 : 12;
    let rangeStart: Date;
    let bucketDuration: number;

    if (period === "all") {
      rangeStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      bucketDuration = 0;
    } else {
      rangeStart = new Date(periodStart ?? now);
      bucketDuration =
        ((now.getTime() - rangeStart.getTime()) / count) || 1;
    }

    const buckets = Array.from({ length: count }, (_, index) => {
      let start: Date;
      let end: Date;
      if (period === "all") {
        start = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
        end = new Date(now.getFullYear(), now.getMonth() - 10 + index, 1);
      } else {
        start = new Date(rangeStart.getTime() + bucketDuration * index);
        end =
          index === count - 1
            ? new Date(now.getTime() + 1)
            : new Date(rangeStart.getTime() + bucketDuration * (index + 1));
      }
      const value = filteredReceipts
        .filter((receipt) => {
          const time = new Date(receipt.date).getTime();
          return time >= start.getTime() && time < end.getTime();
        })
        .reduce((sum, receipt) => sum + getReceiptRevenue(receipt), 0);
      const label =
        period === "7d"
          ? new Intl.DateTimeFormat("en-NG", { weekday: "short" }).format(start)
          : period === "all"
            ? new Intl.DateTimeFormat("en-NG", { month: "short" }).format(start)
            : new Intl.DateTimeFormat("en-NG", {
                day: "numeric",
                month: "short",
              }).format(start);
      return { label, value };
    });

    return {
      buckets,
      max: Math.max(...buckets.map((bucket) => bucket.value), 1),
    };
  }, [filteredReceipts, now, period, periodStart]);

  const downloadReport = () => {
    const customerById = new Map(
      customers.map((customer) => [customer.id, customer.name]),
    );
    const rows = [
      ["Date", "Receipt", "Customer", "Payment method", "Status", "Total", "Paid"],
      ...filteredReceipts.map((receipt) => [
        new Date(receipt.date).toLocaleString("en-NG"),
        receipt.receiptNumber,
        receipt.customerId
          ? (customerById.get(receipt.customerId) ?? "Customer unavailable")
          : "Walk-in Customer",
        paymentLabels[receipt.paymentMethod],
        receipt.status,
        receipt.total.toFixed(2),
        (receipt.amountPaid ?? 0).toFixed(2),
      ]),
    ];
    const csv = rows.map((row) => row.map(csvValue).join(",")).join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hubdesk-report-${period}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const stats = [
    {
      title: "Revenue collected",
      value: formatPrice(report.revenue),
      icon: Wallet,
      iconClass: "bg-success-muted text-success",
    },
    {
      title: "Transactions",
      value: filteredReceipts.length.toLocaleString("en-NG"),
      icon: ReceiptText,
      iconClass: "bg-info-muted text-info",
    },
    {
      title: "Average receipt",
      value: formatPrice(report.averageReceipt),
      icon: BarChart3,
      iconClass: "bg-purple-muted text-purple",
    },
    {
      title: "Customers served",
      value: report.uniqueCustomerCount.toLocaleString("en-NG"),
      icon: Users,
      iconClass: "bg-warning-muted text-warning",
    },
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Header
          heading="Reports"
          description="Understand your sales, services and payment activity."
        />
        <div className="flex flex-wrap gap-2">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as ReportPeriod)}
            aria-label="Report date range"
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-primary/50 focus-visible:ring-3 focus-visible:ring-primary/10"
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={downloadReport}
          >
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} data-gsap-item>
              <CardContent className="flex min-h-28 items-center gap-3 p-4 sm:p-5">
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${stat.iconClass}`}
                >
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="mt-1 truncate text-xl font-bold tabular-nums">
                    {stat.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card data-gsap-item>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Revenue over time</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Collected revenue for {periodOptions.find((item) => item.value === period)?.label.toLowerCase()}.
              </p>
            </div>
            <span className="rounded-lg bg-success-muted px-2.5 py-1.5 text-xs font-semibold text-success">
              {formatPrice(report.revenue)}
            </span>
          </CardHeader>
          <CardContent>
            {filteredReceipts.length ? (
              <div
                className="grid h-56 items-end gap-1.5 border-b border-border pb-2 sm:gap-2"
                style={{
                  gridTemplateColumns: `repeat(${chart.buckets.length}, minmax(0, 1fr))`,
                }}
                role="img"
                aria-label={`Revenue chart, total ${formatPrice(report.revenue)}`}
              >
                {chart.buckets.map((bucket, index) => (
                  <div
                    key={`${bucket.label}-${index}`}
                    className="group flex h-full min-w-0 flex-col items-center justify-end gap-2"
                    title={`${bucket.label}: ${formatPrice(bucket.value)}`}
                  >
                    <div className="flex h-full w-full items-end">
                      <span
                        className="w-full rounded-t-md bg-primary/80 transition-colors group-hover:bg-primary"
                        style={{
                          height: `${Math.max((bucket.value / chart.max) * 100, bucket.value ? 4 : 1)}%`,
                        }}
                      />
                    </div>
                    {(period === "7d" || index % 2 === 0) && (
                      <span className="w-full truncate text-center text-[10px] text-muted-foreground">
                        {bucket.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                No receipt data available for this period.
              </p>
            )}
          </CardContent>
        </Card>

        <Card data-gsap-item>
          <CardHeader>
            <CardTitle>Payment methods</CardTitle>
            <p className="text-sm text-muted-foreground">
              Collected amounts by payment type
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.paymentRows.length ? (
              report.paymentRows.map(([method, amount], index) => {
                const share = report.revenue
                  ? (amount / report.revenue) * 100
                  : 0;
                const barClass =
                  index % 3 === 0
                    ? "bg-primary"
                    : index % 3 === 1
                      ? "bg-success"
                      : "bg-purple";
                return (
                  <div key={method}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium">
                        {paymentLabels[method]}
                      </span>
                      <span className="text-right tabular-nums text-muted-foreground">
                        {formatPrice(amount)} · {Math.round(share)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${barClass}`}
                        style={{ width: `${Math.min(share, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No payment activity for this period.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-gsap-item>
        <CardHeader>
          <CardTitle>Top services</CardTitle>
          <p className="text-sm text-muted-foreground">
            Services ranked by receipt value for this period.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Service</th>
                  <th className="px-3 py-2 text-right font-medium">Quantity</th>
                  <th className="px-3 py-2 text-right font-medium">Revenue</th>
                  <th className="px-3 py-2 text-right font-medium">Share</th>
                </tr>
              </thead>
              <tbody>
                {report.serviceRows.map((service) => (
                  <tr
                    key={service.name}
                    className="border-b border-border/70 last:border-0"
                  >
                    <td className="px-3 py-3 font-medium">{service.name}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {service.quantity}
                    </td>
                    <td className="px-3 py-3 text-right font-medium tabular-nums">
                      {formatPrice(service.revenue)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                      {report.revenue
                        ? `${Math.round((service.revenue / report.revenue) * 100)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
                {!report.serviceRows.length && (
                  <tr>
                    <td
                      colSpan={4}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No service data for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export default ReportsPage;
