"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  ReceiptText,
  Users,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db/db";
import type { Receipt } from "@/types/receipt";

const formatPrice = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(amount);

const dayStart = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

function receiptRevenue(receipt: Receipt) {
  if (receipt.status === "Cancelled") return 0;
  return Math.min(
    receipt.total,
    receipt.amountPaid ?? (receipt.status === "Completed" ? receipt.total : 0),
  );
}

function changeLabel(current: number, previous: number) {
  if (current === 0 && previous === 0) return "No change this week";
  if (previous === 0)
    return current > 0 ? "New this week" : "No change this week";
  const change = ((current - previous) / previous) * 100;
  const rounded = Math.round(Math.abs(change));

  return `${change >= 0 ? "+" : "−"}${rounded}% from last week`;
}

function DashboardOverview() {
  const receipts = useLiveQuery(() => db.receipts.toArray(), [], []);
  const customers = useLiveQuery(() => db.customers.toArray(), [], []);
  const services = useLiveQuery(() => db.services.toArray(), [], []);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  useEffect(() => {
    const updateDate = () => setCurrentDate(new Date());
    updateDate();
    const timer = window.setInterval(updateDate, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const metrics = useMemo(() => {
    const now = currentDate ?? new Date();
    const today = dayStart(now).getTime();
    const week = 7 * 24 * 60 * 60 * 1000;
    const thisWeekStart = today - 6 * 24 * 60 * 60 * 1000;
    const lastWeekStart = thisWeekStart - week;

    const receiptsThisWeek = receipts.filter((receipt) => {
      const time = new Date(receipt.date).getTime();
      return time >= thisWeekStart && time <= now.getTime();
    });
    const receiptsLastWeek = receipts.filter((receipt) => {
      const time = new Date(receipt.date).getTime();
      return time >= lastWeekStart && time < thisWeekStart;
    });
    const customersThisWeek = customers.filter((customer) => {
      const time = new Date(customer.createdAt).getTime();
      return time >= thisWeekStart && time <= now.getTime();
    });
    const customersLastWeek = customers.filter((customer) => {
      const time = new Date(customer.createdAt).getTime();
      return time >= lastWeekStart && time < thisWeekStart;
    });
    const servicesThisWeek = services.filter((service) => {
      const time = new Date(service.createdAt).getTime();
      return time >= thisWeekStart && time <= now.getTime();
    });
    const servicesLastWeek = services.filter((service) => {
      const time = new Date(service.createdAt).getTime();
      return time >= lastWeekStart && time < thisWeekStart;
    });

    return {
      totalRevenue: receipts.reduce(
        (sum, receipt) => sum + receiptRevenue(receipt),
        0,
      ),
      totalReceipts: receipts.length,
      totalCustomers: customers.length,
      totalServices: services.length,
      revenueThisWeek: receiptsThisWeek.reduce(
        (sum, receipt) => sum + receiptRevenue(receipt),
        0,
      ),
      revenueLastWeek: receiptsLastWeek.reduce(
        (sum, receipt) => sum + receiptRevenue(receipt),
        0,
      ),
      receiptsThisWeek: receiptsThisWeek.length,
      receiptsLastWeek: receiptsLastWeek.length,
      customersThisWeek: customersThisWeek.length,
      customersLastWeek: customersLastWeek.length,
      servicesThisWeek: servicesThisWeek.length,
      servicesLastWeek: servicesLastWeek.length,
    };
  }, [currentDate, customers, receipts, services]);

  const greeting = currentDate
    ? currentDate.getHours() < 12
      ? "Good morning,"
      : currentDate.getHours() < 18
        ? "Good afternoon,"
        : "Good evening,"
    : "Welcome,";
  const dateLabel = currentDate
    ? new Intl.DateTimeFormat("en-NG", { dateStyle: "full" }).format(
        currentDate,
      )
    : "";

  const stats = [
    {
      title: "Total Receipts",
      value: metrics.totalReceipts.toLocaleString("en-NG"),
      icon: ReceiptText,
      iconClass: "bg-info-muted text-info",
      footer: changeLabel(metrics.receiptsThisWeek, metrics.receiptsLastWeek),
      trend: metrics.receiptsThisWeek - metrics.receiptsLastWeek,
    },
    {
      title: "Total Customers",
      value: metrics.totalCustomers.toLocaleString("en-NG"),
      icon: Users,
      iconClass: "bg-success-muted text-success",
      footer: changeLabel(metrics.customersThisWeek, metrics.customersLastWeek),
      trend: metrics.customersThisWeek - metrics.customersLastWeek,
    },
    {
      title: "Total Revenue",
      value: formatPrice(metrics.totalRevenue),
      icon: Banknote,
      iconClass: "bg-purple-muted text-purple",
      footer: changeLabel(metrics.revenueThisWeek, metrics.revenueLastWeek),
      trend: metrics.revenueThisWeek - metrics.revenueLastWeek,
    },
    {
      title: "Total Services",
      value: metrics.totalServices.toLocaleString("en-NG"),
      icon: BriefcaseBusiness,
      iconClass: "bg-warning-muted text-warning",
      footer:
        metrics.servicesThisWeek || metrics.servicesLastWeek
          ? changeLabel(metrics.servicesThisWeek, metrics.servicesLastWeek)
          : "No change this week",
      trend: metrics.servicesThisWeek - metrics.servicesLastWeek,
    },
  ];

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">
            {greeting} Cashier!
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Your business overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quickly manage receipts, customers and services. Keep your business
            running smoothly.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 self-start rounded-xl border border-border bg-card px-3 py-2.5 sm:self-auto">
          <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <CalendarDays className="size-4" />
          </span>
          <span className="text-sm font-medium">
            {dateLabel}
            <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
              {currentDate
                ? new Intl.DateTimeFormat("en-NG", {
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(currentDate)
                : ""}
            </span>
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const TrendIcon =
            stat.trend > 0
              ? ArrowUpRight
              : stat.trend < 0
                ? ArrowDownRight
                : null;

          return (
            <Card
              key={stat.title}
              data-gsap-item
              className="rounded-xl border-border bg-card shadow-sm"
            >
              <CardContent className="flex min-h-27 flex-col justify-between p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${stat.iconClass}`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="mt-1 truncate text-xl font-bold tracking-tight text-foreground">
                      {stat.value}
                    </p>
                  </div>
                </div>
                <p
                  className={`mt-4 flex items-center gap-1 text-xs ${
                    stat.trend > 0
                      ? "text-success"
                      : stat.trend < 0
                        ? "text-destructive"
                        : "text-muted-foreground"
                  }`}
                >
                  {TrendIcon && <TrendIcon className="size-3.5" />}
                  <span>{stat.footer}</span>
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export default DashboardOverview;
