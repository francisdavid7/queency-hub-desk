"use client";

import Link from "next/link";
import { Plus, ReceiptText, Users, Blocks } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RecentTransaction, { RecentTransactionType } from "./recent-transaction";

const recentTransactions: RecentTransactionType[] = [
  {
    receiptNo: "REC-00042",
    customer: "Jane Doe",
    amount: "₦12,000.00",
    paymentMethod: "CASH",
    time: "10:24 AM",
    status: "Completed",
  },
  {
    receiptNo: "REC-00041",
    customer: "Emeka Nwosu",
    amount: "₦7,500.00",
    paymentMethod: "TRANSFER",
    time: "09:52 AM",
    status: "Completed",
  },
  {
    receiptNo: "REC-00040",
    customer: "Grace Okafor",
    amount: "₦25,000.00",
    paymentMethod: "POS",
    time: "09:21 AM",
    status: "Completed",
  },
  {
    receiptNo: "REC-00039",
    customer: "Daniel Smith",
    amount: "₦5,000.00",
    paymentMethod: "CASH",
    time: "08:45 AM",
    status: "Completed",
  },
  {
    receiptNo: "REC-00038",
    customer: "Peace Abiola",
    amount: "₦15,500.00",
    paymentMethod: "TRANSFER",
    time: "08:12 AM",
    status: "Completed",
  },
];

const quickActions = [
  {
    title: "View All Receipts",
    href: "/receipts",
    icon: ReceiptText,
  },
  {
    title: "Add New Customer",
    href: "/customers/create",
    icon: Users,
  },
  {
    title: "Manage Services",
    href: "/services",
    icon: Blocks,
  },
];

export default function RecentTransactionsSection() {
  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_240px] mt-4">
      {/* Recent Transactions */}
      <RecentTransaction recentTransactions={recentTransactions} />

      {/* Quick Actions */}
      <Card className="rounded-xl border-border bg-card shadow-sm">
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
                className="
                  h-11
                  w-full
                  justify-start
                  gap-3
                  rounded-lg
                  border-input
                  bg-white
                  font-medium
                  shadow-none
                  hover:bg-muted/50
                "
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
