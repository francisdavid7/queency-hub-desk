import Link from "next/link";

import { formatDateTime, PageHeader, RangeFilter } from "@/components/admin/widgets";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { resolveRange } from "@/lib/admin/date-range";
import { getCashierActivity } from "@/lib/admin/queries";
import { formatPrice } from "@/lib/money";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

export default async function CashierActivityPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const range = resolveRange({ range: one(params.range) ?? "7d", from: one(params.from), to: one(params.to) });
  const rows = await getCashierActivity(range);

  return (
    <>
      <PageHeader
        title="Cashier activity"
        description={`Sales, collections, discounts and voids per staff member — ${range.label.toLowerCase()}.`}
        actions={<RangeFilter range={range} />}
      />
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff</TableHead>
              <TableHead className="text-right">Receipts</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead className="text-right">Collected</TableHead>
              <TableHead className="text-right">Discounts given</TableHead>
              <TableHead className="text-right">Their receipts voided</TableHead>
              <TableHead className="text-right">Voids performed</TableHead>
              <TableHead>Last sale</TableHead>
              <TableHead>Last sign-in</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Link
                    href={`/admin/transactions?cashier=${row.id}&range=${range.preset}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {row.name}
                  </Link>
                  <span className="ml-2 inline-flex gap-1">
                    <Badge variant="outline">{row.role.toLowerCase()}</Badge>
                    {!row.isActive && <Badge variant="destructive">inactive</Badge>}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">{row.receiptCount}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPrice(row.sales)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPrice(row.collected)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPrice(row.discounts)}</TableCell>
                <TableCell className={`text-right tabular-nums ${row.voidedReceipts > 0 ? "font-semibold text-destructive" : ""}`}>
                  {row.voidedReceipts}
                </TableCell>
                <TableCell className="text-right tabular-nums">{row.voidsPerformed}</TableCell>
                <TableCell className="whitespace-nowrap">{row.lastSale ? formatDateTime(row.lastSale) : "—"}</TableCell>
                <TableCell className="whitespace-nowrap">{row.lastLoginAt ? formatDateTime(row.lastLoginAt) : "Never"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <p className="text-xs text-muted-foreground">
        “Their receipts voided” counts receipts this person issued that were later voided — a
        high number is worth reviewing in the audit log.
      </p>
    </>
  );
}
