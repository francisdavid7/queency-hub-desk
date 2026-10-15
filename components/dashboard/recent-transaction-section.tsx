"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Blocks, Plus, ReceiptText, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db/db";
import RecentTransaction from "./recent-transaction";

const quickActions = [
  {
    title: "View All Receipts",
    href: "/receipts",
    icon: ReceiptText,
  },
  {
    title: "Manage Customers",
    href: "/customers",
    icon: Users,
  },
  {
    title: "Manage Services",
    href: "/services",
    icon: Blocks,
  },
];

export default function RecentTransactionsSection() {
  const receipts = useLiveQuery(
    () => db.receipts.orderBy("date").reverse().limit(5).toArray(),
    [],
    [],
  );
  const customers = useLiveQuery(() => db.customers.toArray(), [], []);
  const customerNames = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer.name])),
    [customers],
  );

  return (
    <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_240px]">
      <RecentTransaction
        recentTransactions={receipts.map((receipt) => ({
          receiptNo: receipt.receiptNumber,
          customer: receipt.customerId
            ? (customerNames.get(receipt.customerId) ?? "Customer unavailable")
            : "Walk-in Customer",
          amount: receipt.amountPaid ?? receipt.total,
          paymentMethod: receipt.paymentMethod,
          time: new Intl.DateTimeFormat("en-NG", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(receipt.date)),
          status: receipt.status,
        }))}
      />

      <Card
        data-gsap-item
        className="rounded-xl border-border bg-card shadow-sm"
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="h-11 w-full justify-start gap-3 rounded-lg"
            render={<Link href="/receipts/new" />}
          >
            <Plus className="size-5" />
            Create New Receipt
          </Button>

          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.title}
                variant="outline"
                className="h-11 w-full justify-start gap-3 rounded-lg border-input bg-card font-medium shadow-none hover:bg-muted/50"
                render={<Link href={action.href} />}
              >
                <Icon className="size-5 text-muted-foreground" />
                {action.title}
              </Button>
            );
          })}
        </CardContent>
      </Card>
    </section>
  );
}
