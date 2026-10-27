"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Search, Trash2, UserRound, Users } from "lucide-react";
import { toast } from "sonner";

import CustomerFormDialog from "@/components/customers/customer-form-dialog";
import Header from "@/components/shared/header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/db/db";
import { removeQueryParam, useQueryParam } from "@/hooks/custom/use-query-param";
import { deleteCustomer } from "@/lib/actions/edge-functions";
import type { Customer } from "@/types/customer";

function CustomersPage() {
  const customers = useLiveQuery(
    () =>
      db.customers
        .orderBy("name")
        .filter((customer) => !customer.deletedAt)
        .toArray(),
    [],
    [],
  );
  const receipts = useLiveQuery(() => db.receipts.toArray(), [], []);
  const querySearch = useQueryParam("search");
  const createParam = useQueryParam("create");
  const [search, setSearch] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(
    null,
  );
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);

  const searchValue = search ?? querySearch;

  const filteredCustomers = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) ||
        customer.phone.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query),
    );
  }, [customers, searchValue]);

  const openAddDialog = () => {
    setEditingCustomer(null);
    setDialogOpen(true);
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!customerToDelete) return;
    setIsDeletingCustomer(true);
    try {
      await deleteCustomer(customerToDelete.id);
      toast.success("Customer deleted", {
        description: `${customerToDelete.name} has been removed.`,
      });
      setCustomerToDelete(null);
    } catch (error) {
      console.error("Failed to delete customer:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete customer",
      );
    } finally {
      setIsDeletingCustomer(false);
    }
  };

  return (
    <section className="space-y-6">
      <Header
        heading="Customers"
        description="Manage your customer directory and contact details."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card data-gsap-item>
          <CardHeader className="flex-row items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Users className="size-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total customers
              </CardTitle>
              <p className="mt-1 text-2xl font-bold">{customers.length}</p>
            </div>
          </CardHeader>
        </Card>
        <Card data-gsap-item>
          <CardHeader className="flex-row items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-success-muted text-success">
              <UserRound className="size-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Customers with receipts
              </CardTitle>
              <p className="mt-1 text-2xl font-bold">
                {new Set(receipts.map((receipt) => receipt.customerId).filter(Boolean)).size}
              </p>
            </div>
          </CardHeader>
        </Card>
      </div>

      <Card
        data-gsap-item
        className="overflow-visible rounded-xl border-border bg-card p-4 shadow-sm sm:p-5"
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchValue}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, phone, or email..."
              aria-label="Search customers"
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:ring-3 focus-visible:ring-primary/10"
            />
          </label>
          <Button type="button" className="h-10 gap-2" onClick={openAddDialog}>
            <Plus className="size-4" />
            Add Customer
          </Button>
        </div>

        <div className="space-y-3 2xl:hidden">
          {filteredCustomers.map((customer) => {
            const receiptCount = receipts.filter(
              (receipt) => receipt.customerId === customer.id,
            ).length;
            const initials = customer.name
              .trim()
              .split(/\s+/)
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <div
                key={customer.id}
                className="space-y-3 rounded-lg border border-border p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-9 shrink-0">
                    <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {customer.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {customer.phone}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                    {receiptCount} receipts
                  </span>
                </div>
                {customer.email && (
                  <p className="truncate text-xs text-muted-foreground">
                    {customer.email}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEditDialog(customer)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${customer.name}`}
                    onClick={() => setCustomerToDelete(customer)}
                    disabled={receiptCount > 0}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
          {filteredCustomers.length === 0 && (
            <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
              <p className="font-semibold">
                {customers.length === 0
                  ? "No customers yet"
                  : "No customers match your search"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {customers.length === 0
                  ? "Add a customer to begin keeping customer history."
                  : "Try another name, phone number, or email."}
              </p>
              {customers.length === 0 && (
                <Button
                  className="mt-4 gap-2"
                  onClick={openAddDialog}
                  type="button"
                >
                  <Plus className="size-4" />
                  Add Customer
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="hidden overflow-hidden rounded-lg border border-border 2xl:block">
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow>
                <TableHead className="h-11 pl-4">Customer</TableHead>
                <TableHead className="h-11">Phone</TableHead>
                <TableHead className="h-11">Email</TableHead>
                <TableHead className="h-11 text-right">Receipts</TableHead>
                <TableHead className="h-11 pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => {
                const receiptCount = receipts.filter(
                  (receipt) => receipt.customerId === customer.id,
                ).length;
                const initials = customer.name
                  .trim()
                  .split(/\s+/)
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <TableRow key={customer.id}>
                    <TableCell className="py-3 pl-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{customer.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer.email || "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {receiptCount}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(customer)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${customer.name}`}
                          onClick={() => setCustomerToDelete(customer)}
                          disabled={receiptCount > 0}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredCustomers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center">
                    <p className="font-semibold">
                      {customers.length === 0
                        ? "No customers yet"
                        : "No customers match your search"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {customers.length === 0
                        ? "Add a customer to begin keeping customer history."
                        : "Try another name, phone number, or email."}
                    </p>
                    {customers.length === 0 && (
                      <Button
                        className="mt-4 gap-2"
                        onClick={openAddDialog}
                        type="button"
                      >
                        <Plus className="size-4" />
                        Add Customer
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <CustomerFormDialog
        open={dialogOpen || createParam === "1"}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open && createParam === "1") removeQueryParam("create");
        }}
        customer={editingCustomer}
      />

      <Dialog
        open={customerToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !isDeletingCustomer) setCustomerToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete customer?</DialogTitle>
            <DialogDescription>
              {customerToDelete
                ? `Delete ${customerToDelete.name}? This action cannot be undone.`
                : ""}
              {" Customers with receipt history cannot be deleted."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="outline"
                  disabled={isDeletingCustomer}
                >
                  Cancel
                </Button>
              }
            />
            <Button
              type="button"
              variant="destructive"
              disabled={isDeletingCustomer}
              onClick={() => void handleDelete()}
            >
              {isDeletingCustomer ? "Deleting..." : "Delete customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default CustomersPage;
