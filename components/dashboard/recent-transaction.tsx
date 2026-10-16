import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ReceiptStatus } from "@/db/db";

export interface RecentTransactionType {
  id: string;
  receiptNo: string;
  customer: string;
  services: string;
  amount: number;
  time: string;
  status: ReceiptStatus;
}

const formatPrice = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(amount);

function RecentTransaction({
  recentTransactions,
}: {
  recentTransactions: RecentTransactionType[];
}) {
  return (
    <Card
      data-gsap-item
      className="rounded-xl border-border bg-card shadow-sm"
    >
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
        <div>
          <CardTitle className="text-base font-semibold">
            Recent transactions
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            The latest receipts and payment activity
          </p>
        </div>
        <Button
          type="button"
          nativeButton={false}
          variant="link"
          className="h-auto shrink-0 p-0 text-sm font-medium"
          render={<Link href="/transactions" />}
        >
          View all <ArrowRight className="ml-1 size-4" />
        </Button>
      </CardHeader>

      <CardContent className="px-3 pb-3 sm:px-4">
        <div className="space-y-3 2xl:hidden">
          {recentTransactions.map((transaction) => (
            <Link
              key={transaction.id}
              href={`/transactions?search=${encodeURIComponent(transaction.receiptNo)}`}
              className="block space-y-2 rounded-lg border border-border p-3 transition-colors hover:bg-muted/40"
            >
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-primary">
                    {transaction.receiptNo}
                  </p>
                  <p className="mt-0.5 truncate text-sm">
                    {transaction.customer}
                  </p>
                </div>
                <Badge
                  className={
                    transaction.status === "Completed"
                      ? "bg-success-muted text-success"
                      : transaction.status === "Pending"
                        ? "bg-warning-muted text-warning"
                        : "bg-muted text-muted-foreground"
                  }
                >
                  {transaction.status}
                </Badge>
              </div>
              <div className="flex min-w-0 items-end justify-between gap-2 text-xs">
                <span className="min-w-0 truncate text-muted-foreground">
                  {transaction.services}
                </span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {formatPrice(transaction.amount)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {transaction.time}
              </p>
            </Link>
          ))}
          {recentTransactions.length === 0 && (
            <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              No transactions yet. Create a receipt to see activity here.
            </p>
          )}
        </div>

        <div className="hidden overflow-x-auto 2xl:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="min-w-32 pl-3">Receipt #</TableHead>
                <TableHead className="min-w-32">Customer</TableHead>
                <TableHead className="min-w-36">Services</TableHead>
                <TableHead className="min-w-32 text-right">Total amount</TableHead>
                <TableHead className="min-w-40">Date</TableHead>
                <TableHead className="min-w-24">Status</TableHead>
                <TableHead className="w-8 pr-3" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {recentTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="py-3 pl-3 font-medium text-primary">
                    {transaction.receiptNo}
                  </TableCell>
                  <TableCell>{transaction.customer}</TableCell>
                  <TableCell className="max-w-48 truncate text-muted-foreground">
                    {transaction.services}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatPrice(transaction.amount)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {transaction.time}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        transaction.status === "Completed"
                          ? "bg-success-muted text-success"
                          : transaction.status === "Pending"
                            ? "bg-warning-muted text-warning"
                            : "bg-muted text-muted-foreground"
                      }
                    >
                      {transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-3 text-right">
                    <Link
                      href={`/transactions?search=${encodeURIComponent(transaction.receiptNo)}`}
                      aria-label={`View transaction ${transaction.receiptNo}`}
                      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <ArrowRight className="size-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {recentTransactions.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No transactions yet. Create a receipt to see activity here.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default RecentTransaction;
