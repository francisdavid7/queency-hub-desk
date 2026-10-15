"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowRight,
  BarChart3,
  FileText,
  Plus,
  ReceiptText,
  UserRoundPlus,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db/db";
import RecentTransaction from "./recent-transaction";

const quickActions = [
  {
    title: "Create receipt",
    description: "Start a new transaction",
    href: "/receipts/new",
    icon: ReceiptText,
    iconClass: "bg-info-muted text-info",
  },
  {
    title: "Add customer",
    description: "Register a new customer",
    href: "/customers?create=1",
    icon: UserRoundPlus,
    iconClass: "bg-success-muted text-success",
  },
  {
    title: "Manage services",
    description: "View and manage services",
    href: "/services",
    icon: Wrench,
    iconClass: "bg-purple-muted text-purple",
  },
  {
    title: "View reports",
    description: "Check business reports",
    href: "/reports",
    icon: BarChart3,
    iconClass: "bg-warning-muted text-warning",
  },
];

export default function RecentTransactionsSection() {
  const receipts = useLiveQuery(
    () => db.receipts.orderBy("date").reverse().limit(5).toArray(),
    [],
    [],
  );
  const customers = useLiveQuery(() => db.customers.toArray(), [], []);
  const services = useLiveQuery(() => db.services.toArray(), [], []);
  const receiptItems = useLiveQuery(() => db.receiptItems.toArray(), [], []);

  const transactions = useMemo(() => {
    const customerNames = new Map(
      customers.map((customer) => [customer.id, customer.name]),
    );
    const serviceNames = new Map(
      services.map((service) => [service.id, service.name]),
    );

    return receipts.map((receipt) => {
      const items = receiptItems.filter(
        (item) => item.receiptId === receipt.id,
      );
      const itemNames = [
        ...new Set(
          items.map(
            (item) =>
              item.serviceName ??
              serviceNames.get(item.serviceId) ??
              "Service",
          ),
        ),
      ];
      const servicesLabel =
        itemNames.length > 2
          ? `${itemNames.slice(0, 2).join(", ")} +${itemNames.length - 2}`
          : itemNames.join(", ") || "—";

      return {
        id: receipt.id,
        receiptNo: receipt.receiptNumber,
        customer: receipt.customerId
          ? (customerNames.get(receipt.customerId) ?? "Customer unavailable")
          : "Walk-in Customer",
        services: servicesLabel,
        amount: receipt.total,
        time: new Intl.DateTimeFormat("en-NG", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(receipt.date)),
        status: receipt.status,
      };
    });
  }, [customers, receiptItems, receipts, services]);

  return (
    <section className="mt-5 space-y-5">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card
          data-gsap-item
          className="relative min-h-48 overflow-hidden rounded-xl border-primary/10 bg-gradient-to-br from-accent via-card to-card shadow-sm"
        >
          <CardContent className="relative flex h-full min-h-48 items-center justify-between gap-4 p-5 sm:p-6">
            <div className="relative z-10 max-w-lg">
              <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                Welcome to HubDesk
              </span>
              <h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">
                Fast. Simple. Reliable.
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Create receipts, manage customers, track transactions and grow
                your business — all in one place.
              </p>
              <Button
                type="button"
                nativeButton={false}
                className="mt-4 gap-2"
                render={<Link href="/receipts/new" />}
              >
                <FileText className="size-4" />
                Create new receipt
                <ArrowRight className="size-4" />
              </Button>
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-4 -bottom-6 hidden size-44 items-center justify-center rounded-full bg-primary/5 text-primary/25 sm:flex"
            >
              <ReceiptText className="size-28 stroke-[1.2]" />
              <span className="absolute right-7 top-8 flex size-14 items-center justify-center rounded-2xl bg-card text-primary shadow-md ring-1 ring-border">
                <Plus className="size-7" />
              </span>
            </div>
          </CardContent>
        </Card>

        <Card
          data-gsap-item
          className="rounded-xl border-border bg-card shadow-sm"
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Quick actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2.5 pb-4 sm:grid-cols-2">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Button
                  key={action.href}
                  type="button"
                  nativeButton={false}
                  variant="outline"
                  className="h-auto min-h-14 justify-start gap-3 rounded-lg px-3 py-2.5 text-left"
                  render={<Link href={action.href} />}
                >
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${action.iconClass}`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {action.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
                      {action.description}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </Button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <RecentTransaction recentTransactions={transactions} />
    </section>
  );
}
