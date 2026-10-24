"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowUpRight, Eye, ReceiptText, Search } from "lucide-react";

import Header from "@/components/shared/header";
import ReceiptActionsPanel from "@/components/reciept/receipt-actions-panel";
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
import { db, type PaymentMethod } from "@/db/db";
import { useQueryParam } from "@/hooks/custom/use-query-param";
import type { Receipt } from "@/types/receipt";

const formatPrice = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(amount);

const paymentLabels: Record<PaymentMethod, string> = {
  CASH: "Cash",
  TRANSFER: "Bank transfer",
  POS: "POS",
  OTHER: "Other",
};

function TransactionsPage() {
  const router = useRouter();
  const receipts = useLiveQuery(
    () => db.receipts.orderBy("date").reverse().toArray(),
    [],
    [],
  );
  const customers = useLiveQuery(() => db.customers.toArray(), [], []);
  const services = useLiveQuery(() => db.services.toArray(), [], []);
  const receiptItems = useLiveQuery(() => db.receiptItems.toArray(), [], []);
  const querySearch = useQueryParam("search");
  const queryStatus = useQueryParam("status", "all");
  const [search, setSearch] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(
    null,
  );
  // Read from the live query so payments and voids show immediately.
  const selectedReceipt =
    receipts.find((receipt) => receipt.id === selectedReceiptId) ?? null;
  const setSelectedReceipt = (receipt: Receipt | null) =>
    setSelectedReceiptId(receipt?.id ?? null);
  const searchValue = search ?? querySearch;
  const statusValue = statusFilter ?? queryStatus;

  const customerById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  );
  const serviceById = useMemo(
    () => new Map(services.map((service) => [service.id, service])),
    [services],
  );
  const itemsByReceipt = useMemo(() => {
    const result = new Map<string, typeof receiptItems>();
    for (const item of receiptItems) {
      const items = result.get(item.receiptId) ?? [];
      items.push(item);
      result.set(item.receiptId, items);
    }
    return result;
  }, [receiptItems]);

  const filteredReceipts = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    return receipts.filter((receipt) => {
      const customer = receipt.customerId
        ? customerById.get(receipt.customerId)
        : undefined;
      const serviceText = (itemsByReceipt.get(receipt.id) ?? [])
        .map(
          (item) =>
            item.serviceName ?? serviceById.get(item.serviceId)?.name ?? "",
        )
        .join(" ")
        .toLowerCase();
      const matchesSearch =
        !query ||
        receipt.receiptNumber.toLowerCase().includes(query) ||
        customer?.name.toLowerCase().includes(query) ||
        customer?.phone.toLowerCase().includes(query) ||
        serviceText.includes(query);
      const matchesStatus =
        statusValue === "all" ||
        receipt.status.toLowerCase() === statusValue.toLowerCase();
      const matchesPayment =
        paymentFilter === "all" ||
        receipt.paymentMethod === paymentFilter.toUpperCase();
      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [
    customerById,
    itemsByReceipt,
    paymentFilter,
    receipts,
    searchValue,
    serviceById,
    statusValue,
  ]);

  const totalCollected = receipts.reduce(
    (sum, receipt) =>
      sum +
      (receipt.status === "Cancelled"
        ? 0
        : Math.min(
            receipt.total,
            receipt.amountPaid ??
              (receipt.status === "Completed" ? receipt.total : 0),
          )),
    0,
  );
  const pendingCount = receipts.filter(
    (receipt) => receipt.status === "Pending",
  ).length;

  return (
    <section className="space-y-6">
      <Header
        heading="Transactions"
        description="Track receipt sales, payment methods and outstanding balances."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card data-gsap-item>
          <CardHeader className="flex-row items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-info-muted text-info">
              <ReceiptText className="size-5" />
            </span>
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Transactions
              </CardTitle>
              <p className="mt-1 text-2xl font-bold">
                {receipts.length.toLocaleString("en-NG")}
              </p>
            </div>
          </CardHeader>
        </Card>
        <Card data-gsap-item>
          <CardHeader className="flex-row items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-success-muted text-success">
              <ArrowUpRight className="size-5" />
            </span>
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Collected
              </CardTitle>
              <p className="mt-1 text-xl font-bold tabular-nums">
                {formatPrice(totalCollected)}
              </p>
            </div>
          </CardHeader>
        </Card>
        <Card data-gsap-item>
          <CardHeader className="flex-row items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-warning-muted text-warning">
              <ReceiptText className="size-5" />
            </span>
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Outstanding receipts
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
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchValue}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search receipt, customer, or service..."
              aria-label="Search transactions"
              className="pl-9"
            />
          </label>
          <select
            value={statusValue}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by transaction status"
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-primary/50 focus-visible:ring-3 focus-visible:ring-primary/10"
          >
            <option value="all">All statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={paymentFilter}
            onChange={(event) => setPaymentFilter(event.target.value)}
            aria-label="Filter by payment method"
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-primary/50 focus-visible:ring-3 focus-visible:ring-primary/10"
          >
            <option value="all">All payment methods</option>
            <option value="cash">Cash</option>
            <option value="transfer">Bank transfer</option>
            <option value="pos">POS</option>
            <option value="other">Other</option>
          </select>
          <Button
            type="button"
            nativeButton={false}
            className="shrink-0"
            render={<Link href="/receipts/new" />}
          >
            Create receipt
          </Button>
        </div>

        <p className="mb-3 text-sm text-muted-foreground">
          Showing {filteredReceipts.length} of {receipts.length} transactions
        </p>
        <div className="space-y-3 2xl:hidden">
          {filteredReceipts.map((receipt) => {
            const customer = receipt.customerId
              ? customerById.get(receipt.customerId)
              : undefined;
            const items = itemsByReceipt.get(receipt.id) ?? [];
            const serviceNames = [
              ...new Set(
                items.map(
                  (item) =>
                    item.serviceName ??
                    serviceById.get(item.serviceId)?.name ??
                    "Service",
                ),
              ),
            ];
            const statusClass =
              receipt.status === "Completed"
                ? "bg-success-muted text-success"
                : receipt.status === "Pending"
                  ? "bg-warning-muted text-warning"
                  : "bg-muted text-muted-foreground";

            return (
              <div
                key={receipt.id}
                className="space-y-3 rounded-lg border border-border p-3"
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-primary">
                      {receipt.receiptNumber}
                    </p>
                    <p className="mt-1 truncate text-sm">
                      {customer?.name ?? "Walk-in Customer"}
                    </p>
                  </div>
                  <Badge className={statusClass}>{receipt.status}</Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {serviceNames.join(", ") || "No service details"}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="text-muted-foreground">Date</p>
                    <p className="mt-0.5 truncate">
                      {new Intl.DateTimeFormat("en-NG", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(receipt.date))}
                    </p>
                  </div>
                  <div className="min-w-0 text-right">
                    <p className="text-muted-foreground">Paid / total</p>
                    <p className="mt-0.5 truncate font-semibold tabular-nums">
                      {formatPrice(receipt.amountPaid ?? 0)}
                    </p>
                    <p className="truncate text-muted-foreground">
                      of {formatPrice(receipt.total)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-muted-foreground">Payment method</p>
                    <p className="mt-0.5 truncate">
                      {paymentLabels[receipt.paymentMethod]}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setSelectedReceipt(receipt)}
                >
                  <Eye className="size-4" />
                  View transaction
                </Button>
              </div>
            );
          })}
          {filteredReceipts.length === 0 && (
            <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
              <p className="font-semibold">
                {receipts.length === 0
                  ? "No transactions yet"
                  : "No transactions match these filters"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {receipts.length === 0
                  ? "Create a receipt to start tracking payment activity."
                  : "Try another search or adjust the selected filters."}
              </p>
              {receipts.length === 0 && (
                <Button
                  type="button"
                  className="mt-4"
                  nativeButton={false}
                  render={<Link href="/receipts/new" />}
                >
                  Create receipt
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="hidden overflow-hidden rounded-lg border border-border 2xl:block">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/60">
                <TableRow>
                  <TableHead className="h-11 min-w-36 pl-4">Receipt #</TableHead>
                  <TableHead className="h-11 min-w-32">Customer</TableHead>
                  <TableHead className="h-11 min-w-32">Services</TableHead>
                  <TableHead className="h-11 min-w-28 text-right">Paid / total</TableHead>
                  <TableHead className="h-11 min-w-28">Payment</TableHead>
                  <TableHead className="h-11 min-w-40">Date</TableHead>
                  <TableHead className="h-11">Status</TableHead>
                  <TableHead className="h-11 pr-4 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceipts.map((receipt) => {
                  const customer = receipt.customerId
                    ? customerById.get(receipt.customerId)
                    : undefined;
                  const items = itemsByReceipt.get(receipt.id) ?? [];
                  const serviceNames = [
                    ...new Set(
                      items.map(
                        (item) =>
                          item.serviceName ??
                          serviceById.get(item.serviceId)?.name ??
                          "Service",
                      ),
                    ),
                  ];
                  const statusClass =
                    receipt.status === "Completed"
                      ? "bg-success-muted text-success"
                      : receipt.status === "Pending"
                        ? "bg-warning-muted text-warning"
                        : "bg-muted text-muted-foreground";

                  return (
                    <TableRow key={receipt.id}>
                      <TableCell className="py-3 pl-4 font-medium text-primary">
                        {receipt.receiptNumber}
                      </TableCell>
                      <TableCell>
                        {customer?.name ?? "Walk-in Customer"}
                      </TableCell>
                      <TableCell className="max-w-48 truncate text-muted-foreground">
                        {serviceNames.length
                          ? serviceNames.join(", ")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatPrice(receipt.amountPaid ?? 0)}
                        <span className="block text-xs font-normal text-muted-foreground">
                          of {formatPrice(receipt.total)}
                        </span>
                      </TableCell>
                      <TableCell>{paymentLabels[receipt.paymentMethod]}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Intl.DateTimeFormat("en-NG", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(receipt.date))}
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
                    <TableCell colSpan={8} className="h-48 text-center">
                      <p className="font-semibold">
                        {receipts.length === 0
                          ? "No transactions yet"
                          : "No transactions match these filters"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {receipts.length === 0
                          ? "Create a receipt to start tracking payment activity."
                          : "Try another search or adjust the selected filters."}
                      </p>
                      {receipts.length === 0 && (
                        <Button
                          type="button"
                          nativeButton={false}
                          className="mt-4"
                          render={<Link href="/receipts/new" />}
                        >
                          Create receipt
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
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
              backLabel="Back to transactions"
              actions={<ReceiptActionsPanel receipt={selectedReceipt} />}
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

export default TransactionsPage;
