import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { DateRange } from "@/lib/admin/date-range";
import { formatPrice } from "@/lib/money";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {actions}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

/** Lightweight bar chart (no chart library needed for one series). */
export function BarChart({
  data,
  ariaLabel,
}: {
  data: Array<{ label: string; value: number }>;
  ariaLabel: string;
}) {
  const max = Math.max(...data.map((point) => point.value), 1);
  const labelEvery = Math.ceil(data.length / 10);
  return (
    <figure aria-label={ariaLabel} className="space-y-2">
      <div className="flex h-48 items-end gap-[2px]">
        {data.map((point) => (
          <div
            key={point.label}
            className="group relative flex-1 rounded-t bg-primary/80 transition-colors hover:bg-primary"
            style={{ height: `${Math.max((point.value / max) * 100, point.value > 0 ? 2 : 0)}%` }}
            title={`${point.label}: ${formatPrice(point.value)}`}
          />
        ))}
      </div>
      <div className="flex gap-[2px] text-[10px] text-muted-foreground">
        {data.map((point, index) => (
          <span key={point.label} className="flex-1 truncate text-center">
            {index % labelEvery === 0 ? point.label : ""}
          </span>
        ))}
      </div>
    </figure>
  );
}

const statusStyles: Record<string, string> = {
  COMPLETED: "bg-success/15 text-success",
  PENDING: "bg-warning/15 text-warning-foreground dark:text-warning",
  CANCELLED: "bg-destructive/10 text-destructive",
};
const statusLabels: Record<string, string> = {
  COMPLETED: "Completed",
  PENDING: "Balance due",
  CANCELLED: "Void",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge className={statusStyles[status]}>{statusLabels[status] ?? status}</Badge>;
}

export const methodLabels: Record<string, string> = {
  CASH: "Cash",
  TRANSFER: "Bank transfer",
  POS: "POS",
  OTHER: "Other",
};

export const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(date);

const presets = [
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["7d", "7 days"],
  ["30d", "30 days"],
  ["month", "This month"],
  ["90d", "90 days"],
] as const;

const fieldClass =
  "h-9 rounded-md border border-input bg-background px-2 text-sm";

/** GET form so filters live in the URL (shareable, back-button friendly). */
export function RangeFilter({
  range,
  extra,
}: {
  range: DateRange;
  extra?: ReactNode;
}) {
  return (
    <form className="flex flex-wrap items-end gap-2" method="get">
      <label className="space-y-1 text-xs text-muted-foreground">
        <span className="block">Period</span>
        <select name="range" defaultValue={range.preset} className={fieldClass}>
          {presets.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
          <option value="custom">Custom…</option>
        </select>
      </label>
      <label className="space-y-1 text-xs text-muted-foreground">
        <span className="block">From</span>
        <input type="date" name="from" className={fieldClass} />
      </label>
      <label className="space-y-1 text-xs text-muted-foreground">
        <span className="block">To</span>
        <input type="date" name="to" className={fieldClass} />
      </label>
      {extra}
      <button
        type="submit"
        className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
      >
        Apply
      </button>
    </form>
  );
}

export function Pagination({
  page,
  pageCount,
  params,
}: {
  page: number;
  pageCount: number;
  params: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;
  const href = (target: number) => {
    const search = new URLSearchParams(
      Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])),
    );
    search.set("page", String(target));
    return `?${search}`;
  };
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        Page {page} of {pageCount}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link className="rounded-md border border-border px-3 py-1.5 hover:bg-muted" href={href(page - 1)}>
            Previous
          </Link>
        )}
        {page < pageCount && (
          <Link className="rounded-md border border-border px-3 py-1.5 hover:bg-muted" href={href(page + 1)}>
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
