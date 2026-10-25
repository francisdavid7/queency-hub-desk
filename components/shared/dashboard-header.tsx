"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Bell, LogOut, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { activeCustomers, activeServices, db } from "@/db/db";
import SyncIndicator from "@/components/shared/sync-indicator";
import { useCashierSession } from "@/hooks/custom/use-cashier-session";
import { signOutOfTill } from "@/lib/auth/till-auth";

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function DashboardHeader() {
  const session = useCashierSession();
  const customers = useLiveQuery(() => activeCustomers().toArray(), [], []);
  const receipts = useLiveQuery(() => db.receipts.toArray(), [], []);
  const services = useLiveQuery(() => activeServices().toArray(), [], []);
  const [search, setSearch] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const query = search.trim().toLowerCase();

  const results = useMemo(() => {
    if (!query) return [];

    const customerResults = customers
      .filter(
        (customer) =>
          customer.name.toLowerCase().includes(query) ||
          customer.phone.toLowerCase().includes(query) ||
          customer.email?.toLowerCase().includes(query),
      )
      .slice(0, 3)
      .map((customer) => ({
        id: `customer-${customer.id}`,
        title: customer.name,
        description: customer.phone,
        kind: "Customer",
        href: `/customers?search=${encodeURIComponent(customer.name)}`,
      }));
    const receiptResults = receipts
      .filter((receipt) => receipt.receiptNumber.toLowerCase().includes(query))
      .slice(0, 3)
      .map((receipt) => ({
        id: `receipt-${receipt.id}`,
        title: receipt.receiptNumber,
        description: `${receipt.status} · ${new Intl.NumberFormat("en-NG", {
          style: "currency",
          currency: "NGN",
        }).format(receipt.total)}`,
        kind: "Receipt",
        href: `/transactions?search=${encodeURIComponent(receipt.receiptNumber)}`,
      }));
    const serviceResults = services
      .filter(
        (service) =>
          service.name.toLowerCase().includes(query) ||
          service.category.toLowerCase().includes(query),
      )
      .slice(0, 3)
      .map((service) => ({
        id: `service-${service.id}`,
        title: service.name,
        description: service.category,
        kind: "Service",
        href: `/services?search=${encodeURIComponent(service.name)}`,
      }));

    return [...customerResults, ...receiptResults, ...serviceResults].slice(
      0,
      7,
    );
  }, [customers, query, receipts, services]);

  const pendingReceipts = useMemo(
    () =>
      receipts
        .filter((receipt) => receipt.status === "Pending")
        .sort((left, right) => right.date.localeCompare(left.date)),
    [receipts],
  );

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("dashboard-global-search")?.focus();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  return (
    <header className="app-titlebar sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0 md:hidden"
        aria-label="Open navigation"
        render={<SidebarTrigger />}
      />

      <div className="relative w-full max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="dashboard-global-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search customers, receipts, or services..."
          aria-label="Search customers, receipts, or services"
          aria-expanded={Boolean(query)}
          aria-controls="global-search-results"
          className="h-10 bg-background pl-9 pr-14"
        />
        {search ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute right-2 top-1/2 -translate-y-1/2"
            aria-label="Clear search"
            onClick={() => setSearch("")}
          >
            <X className="size-4" />
          </Button>
        ) : (
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">
            Ctrl K
          </kbd>
        )}
        {query && (
          <div
            id="global-search-results"
            className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
            role="listbox"
            aria-label="Search results"
          >
            {results.length ? (
              results.map((result) => (
                <Button
                  key={result.id}
                  type="button"
                  nativeButton={false}
                  variant="ghost"
                  className="h-auto w-full justify-start gap-3 px-3 py-2.5 text-left"
                  render={
                    <Link
                      href={result.href}
                      onClick={() => setSearch("")}
                    />
                  }
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {result.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {result.description}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {result.kind}
                  </span>
                </Button>
              ))
            ) : (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                No matching customers, receipts, or services.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <Dialog
          open={notificationsOpen}
          onOpenChange={setNotificationsOpen}
        >
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="relative"
            aria-label={`Outstanding payments: ${pendingReceipts.length}`}
            onClick={() => setNotificationsOpen(true)}
          >
            <Bell className="size-4" />
            {pendingReceipts.length > 0 && (
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive ring-2 ring-card" />
            )}
          </Button>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Outstanding payments</DialogTitle>
              <DialogDescription>
                Receipts that still have a balance due.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {pendingReceipts.length ? (
                pendingReceipts.slice(0, 8).map((receipt) => {
                  const customer = customers.find(
                    (item) => item.id === receipt.customerId,
                  );
                  const balance = Math.max(
                    receipt.total - (receipt.amountPaid ?? 0),
                    0,
                  );

                  return (
                    <Link
                      key={receipt.id}
                      href={`/transactions?search=${encodeURIComponent(receipt.receiptNumber)}`}
                      onClick={() => setNotificationsOpen(false)}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {customer?.name ?? "Walk-in Customer"}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {receipt.receiptNumber}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {new Intl.NumberFormat("en-NG", {
                          style: "currency",
                          currency: "NGN",
                          minimumFractionDigits: 2,
                        }).format(balance)}
                      </span>
                    </Link>
                  );
                })
              ) : (
                <p className="rounded-lg bg-muted/60 px-4 py-8 text-center text-sm text-muted-foreground">
                  No outstanding payments. You’re all caught up.
                </p>
              )}
            </div>
            {pendingReceipts.length > 0 && (
              <Button
                type="button"
                nativeButton={false}
                variant="outline"
                className="w-full"
                render={
                  <Link
                    href="/transactions?status=pending"
                    onClick={() => setNotificationsOpen(false)}
                  />
                }
              >
                View all pending transactions
              </Button>
            )}
          </DialogContent>
        </Dialog>

        <SyncIndicator />

        <div className="flex items-center gap-2 border-l border-border pl-3">
          <span className="hidden size-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground sm:flex">
            {initials(session?.name ?? "")}
          </span>
          <span className="hidden lg:block">
            <span className="block text-sm font-semibold leading-tight">
              {session?.name}
            </span>
            <span className="block text-xs capitalize text-muted-foreground">
              {session?.role.toLowerCase()}
            </span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Lock till"
            title="Lock till (sign out)"
            onClick={signOutOfTill}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

export default DashboardHeader;
