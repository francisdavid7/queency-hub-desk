"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  ReceiptText,
  Users,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/db/db";
import type { Receipt } from "@/types/receipt";

const formatPrice = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(amount);

function isSameDay(left: string | Date, right: Date) {
  return new Date(left).toDateString() === right.toDateString();
}

function receiptRevenue(receipt: Receipt) {
  if (receipt.status === "Cancelled") return 0;
  return Math.min(
    receipt.total,
    receipt.amountPaid ?? (receipt.status === "Completed" ? receipt.total : 0),
  );
}

function DashboardOverview() {
  const receipts = useLiveQuery(() => db.receipts.toArray(), [], []);
  const customers = useLiveQuery(() => db.customers.toArray(), [], []);
  const metrics = useMemo(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayReceipts = receipts.filter((receipt) =>
      isSameDay(receipt.date, today),
    );
    const yesterdayReceipts = receipts.filter((receipt) =>
      isSameDay(receipt.date, yesterday),
    );
    const todayRevenue = todayReceipts.reduce(
      (sum, receipt) => sum + receiptRevenue(receipt),
      0,
    );
    const yesterdayRevenue = yesterdayReceipts.reduce(
      (sum, receipt) => sum + receiptRevenue(receipt),
      0,
    );
    const newCustomersToday = customers.filter((customer) =>
      isSameDay(customer.createdAt, today),
    ).length;
    const newCustomersYesterday = customers.filter((customer) =>
      isSameDay(customer.createdAt, yesterday),
    ).length;

    return {
      todayRevenue,
      yesterdayRevenue,
      todayReceiptCount: todayReceipts.length,
      yesterdayReceiptCount: yesterdayReceipts.length,
      pendingReceiptCount: receipts.filter(
        (receipt) => receipt.status === "Pending",
      ).length,
      newCustomersToday,
      newCustomersYesterday,
    };
  }, [customers, receipts]);

  const dateLabel = new Intl.DateTimeFormat("en-NG", {
    dateStyle: "full",
  }).format(new Date());

  const stats = [
    {
      title: "Today's Revenue",
      value: formatPrice(metrics.todayRevenue),
      icon: Banknote,
      iconClass: "bg-info-muted text-info",
      footer: comparisonText(
        metrics.todayRevenue,
        metrics.yesterdayRevenue,
        formatPrice,
      ),
    },
    {
      title: "Receipts Today",
      value: metrics.todayReceiptCount,
      icon: ReceiptText,
      iconClass: "bg-purple-muted text-purple",
      footer: countComparisonText(
        metrics.todayReceiptCount,
        metrics.yesterdayReceiptCount,
        "receipt",
      ),
    },
    {
      title: "Pending Receipts",
      value: metrics.pendingReceiptCount,
      icon: BriefcaseBusiness,
      iconClass: "bg-warning-muted text-warning",
      footer: (
        <p className="text-xs text-muted-foreground">
          {metrics.pendingReceiptCount === 0
            ? "No outstanding payments"
            : "Receipts with a remaining balance"}
        </p>
      ),
    },
    {
      title: "New Customers Today",
      value: metrics.newCustomersToday,
      icon: Users,
      iconClass: "bg-success-muted text-success",
      footer: countComparisonText(
        metrics.newCustomersToday,
        metrics.newCustomersYesterday,
        "customer",
      ),
    },
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            An overview of your sales and activity today.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-10 w-fit gap-3 rounded-lg bg-card px-4 font-medium shadow-none"
        >
          <span>{dateLabel}</span>
          <CalendarDays className="size-4 text-muted-foreground" />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Card
              key={stat.title}
              data-gsap-item
              className="rounded-xl bg-card ring-0"
            >
              <CardContent className="flex min-h-30 flex-col justify-between p-5">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full ${stat.iconClass}`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                      {stat.value}
                    </p>
                  </div>
                </div>
                <div className="ml-13 mt-4">{stat.footer}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function comparisonText(
  current: number,
  previous: number,
  format: (value: number) => string,
) {
  const difference = current - previous;
  if (difference === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Same as yesterday ({format(current)})
      </p>
    );
  }

  return (
    <p className="text-xs text-muted-foreground">
      <span
        className={
          difference > 0
            ? "font-semibold text-success"
            : "font-semibold text-destructive"
        }
      >
        {difference > 0 ? "+" : "−"}
        {format(Math.abs(difference))}
      </span>{" "}
      vs yesterday
    </p>
  );
}

function countComparisonText(
  current: number,
  previous: number,
  item: string,
) {
  const difference = current - previous;
  if (difference === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Same as yesterday ({current})
      </p>
    );
  }

  return (
    <p className="text-xs text-muted-foreground">
      <span
        className={
          difference > 0
            ? "font-semibold text-success"
            : "font-semibold text-destructive"
        }
      >
        {difference > 0 ? "+" : "−"}
        {Math.abs(difference)}
      </span>{" "}
      {item}{Math.abs(difference) === 1 ? "" : "s"} vs yesterday
    </p>
  );
}

export default DashboardOverview;
