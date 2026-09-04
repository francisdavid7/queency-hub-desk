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
                <TableCell>
                  <Link
                    href={`/receipts/${transaction.receiptNo}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {transaction.receiptNo}
                  </Link>
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
                  <Button variant="secondary" size="sm">
                    {transaction.status}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default RecentTransaction;
