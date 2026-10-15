import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { PaymentMethod, ReceiptStatus } from "@/db/db";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export interface RecentTransactionType {
  receiptNo: string;
  customer: string;
  amount: string | number;
  paymentMethod: PaymentMethod;
  time: string;
  status: ReceiptStatus;
}

function RecentTransaction({
  recentTransactions,
}: {
  recentTransactions: RecentTransactionType[];
}) {
  return (
    <Card className="rounded-xl ring-0 bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">
          Recent Transactions
        </CardTitle>

        <Link href="/receipts">
          <Button
            variant="link"
            className="h-auto p-0 text-sm font-medium text-primary"
          >
            View all receipts
            <ArrowRight className="ml-1 size-4" />
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-medium text-foreground">
                Receipt No.
              </TableHead>

              <TableHead className="font-medium text-foreground">
                Customer
              </TableHead>

              <TableHead className="font-medium text-foreground">
                Amount
              </TableHead>

              <TableHead className="font-medium text-foreground">
                Payment
              </TableHead>

              <TableHead className="font-medium text-foreground">
                Time
              </TableHead>

              <TableHead className="font-medium text-foreground">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {recentTransactions.map((transaction) => (
              <TableRow
                key={transaction.receiptNo}
                className="hover:bg-muted/30"
              >
                <TableCell className="font-medium">
                  {transaction.receiptNo}
                </TableCell>

                <TableCell>{transaction.customer}</TableCell>

                <TableCell className="font-medium">
                  {transaction.amount}
                </TableCell>

                <TableCell className="text-muted-foreground">
                  {transaction.paymentMethod}
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
              </TableRow>
            ))}
            {recentTransactions.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-muted-foreground"
                >
                  No transactions yet. Create a receipt to see activity here.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default RecentTransaction;
