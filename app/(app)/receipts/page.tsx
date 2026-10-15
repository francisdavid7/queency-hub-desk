"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowUpRight, Eye, ReceiptText, Search } from "lucide-react";

import Header from "@/components/shared/header";
import ReceiptGenerated from "@/components/reciept/receipt-generated";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/db/db";
import type { Receipt } from "@/types/receipt";

const formatPrice = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(amount);

function ReceiptsPage() {
  const router = useRouter();
  const receipts = useLiveQuery(
    () => db.receipts.orderBy("date").reverse().toArray(),
    [],
    [],
  );
  const customers = useLiveQuery(() => db.customers.toArray(), [], []);
  const services = useLiveQuery(() => db.services.toArray(), [], []);
  const receiptItems = useLiveQuery(() => db.receiptItems.toArray(), [], []);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  const customerById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  );

  const filteredReceipts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return receipts.filter((receipt) => {
      const customer = receipt.customerId
        ? customerById.get(receipt.customerId)
        : undefined;
      const matchesSearch =
        !query ||
        receipt.receiptNumber.toLowerCase().includes(query) ||
        customer?.name.toLowerCase().includes(query) ||
        customer?.phone.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all" ||
        receipt.status.toLowerCase() === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [customerById, receipts, search, statusFilter]);

  const todayReceipts = receipts.filter(
    (receipt) =>
      new Date(receipt.date).toDateString() === new Date().toDateString(),
  );
  const completedTotal = receipts
    .filter((receipt) => receipt.status === "Completed")
    .reduce((sum, receipt) => sum + receipt.total, 0);
  const pendingCount = receipts.filter(
    (receipt) => receipt.status === "Pending",
  ).length;

  return (
    <section className="space-y-6">
      <Header
        heading="Receipts"
        description="View and print your receipt history."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card data-gsap-item>
          <CardHeader className="flex-row items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <ReceiptText className="size-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receipts today
              </CardTitle>
              <p className="mt-1 text-2xl font-bold">{todayReceipts.length}</p>
            </div>
          </CardHeader>
        </Card>
        <Card data-gsap-item>
          <CardHeader className="flex-row items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-success-muted text-success">
              <ArrowUpRight className="size-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed sales
              </CardTitle>
              <p className="mt-1 text-xl font-bold tabular-nums">
                {formatPrice(completedTotal)}
              </p>
            </div>
          </CardHeader>
        </Card>
        <Card data-gsap-item>
          <CardHeader className="flex-row items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-warning-muted text-warning">
              <ReceiptText className="size-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending payment
              </CardTitle>
              <p className="mt-1 text-2xl font-bold">{pendingCount}</p>
            </div>
          </CardHeader>
        </Card>
      </div>

      <Card
        data-gsap-item
        className="rounded-xl border-border bg-card p-4 shadow-sm sm:p-5"
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search receipt number or customer..."
              aria-label="Search receipts"
              className="pl-9"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by status"
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-primary/50 focus-visible:ring-3 focus-visible:ring-primary/10 sm:w-44"
          >
            <option value="all">All statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <Button render={<Link href="/receipts/new" />}>
            Create Receipt
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow>
                <TableHead className="h-11 pl-4">Receipt</TableHead>
                <TableHead className="h-11">Customer</TableHead>
                <TableHead className="h-11">Date</TableHead>
                <TableHead className="h-11">Payment</TableHead>
                <TableHead className="h-11 text-right">Total</TableHead>
                <TableHead className="h-11">Status</TableHead>
                <TableHead className="h-11 pr-4 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReceipts.map((receipt) => {
                const customer = receipt.customerId
                  ? customerById.get(receipt.customerId)
                  : undefined;
                const statusClass =
                  receipt.status === "Completed"
                    ? "bg-success-muted text-success"
                    : receipt.status === "Pending"
                      ? "bg-warning-muted text-warning"
                      : "bg-muted text-muted-foreground";

                return (
                  <TableRow key={receipt.id}>
                    <TableCell className="py-3 pl-4 font-medium">
                      {receipt.receiptNumber}
                    </TableCell>
                    <TableCell>
                      {customer?.name ?? "Walk-in Customer"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Intl.DateTimeFormat("en-NG", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(receipt.date))}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {receipt.paymentMethod === "TRANSFER"
                        ? "Bank transfer"
                        : receipt.paymentMethod === "OTHER"
                          ? "Other"
                          : receipt.paymentMethod}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatPrice(receipt.total)}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusClass}>{receipt.status}</Badge>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => setSelectedReceipt(receipt)}
                      >
                        <Eye className="size-4" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredReceipts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <p className="font-semibold">
                      {receipts.length === 0
                        ? "No receipts yet"
                        : "No receipts match your filters"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {receipts.length === 0
                        ? "Create a receipt to see your sales history here."
                        : "Try a different search or status filter."}
                    </p>
                    {receipts.length === 0 && (
                      <Button
                        className="mt-4"
                        render={<Link href="/receipts/new" />}
                      >
                        Create Receipt
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog
        open={selectedReceipt !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedReceipt(null);
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto p-4 sm:max-w-5xl">
          {selectedReceipt && (
            <ReceiptGenerated
              receipt={selectedReceipt}
              customer={
                selectedReceipt.customerId
                  ? customerById.get(selectedReceipt.customerId) ?? null
                  : null
              }
              isWalkIn={!selectedReceipt.customerId}
              services={services}
              receiptItems={receiptItems.filter(
                (item) => item.receiptId === selectedReceipt.id,
              )}
              onBack={() => setSelectedReceipt(null)}
              backLabel="Back to receipts"
              onNewReceipt={() => {
                setSelectedReceipt(null);
                router.push("/receipts/new");
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default ReceiptsPage;
