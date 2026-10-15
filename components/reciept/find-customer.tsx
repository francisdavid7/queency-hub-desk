"use client";

import { Search, Users, UserRound, X, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import CreateCustomer from "./create-customer";
import { useSearchField } from "@/hooks/custom/use-search-field";
import CustomerList from "./customer-list";

function FindCustomer({ onWalkIn }: { onWalkIn: () => void }) {
  const { searchField, setSearchField } = useSearchField();
  const isSearching = searchField.length > 0;
  const { setIsDialogOpen } = useSearchField();
  const { selectedCustomerId, setSelectedCustomerId } = useSearchField();

  const customers = useLiveQuery(() => db.customers.toArray(), [], []);
  const searchedCustomers = useLiveQuery(async () => {
    const query = searchField.trim().toLowerCase();
    if (!query) return [];

    return db.customers
      .filter((customer) => {
        const name =
          customer.name && customer.name.toLowerCase().includes(query);
        const phone =
          customer.phone && customer.phone.toLowerCase().includes(query);
        const email =
          customer.email && customer.email.toLowerCase().includes(query);

        return Boolean(name || phone || email);
      })
      .toArray();
  }, [searchField], []);

  return (
    <Card className="min-w-0 w-full rounded-xl p-4">
      {customers.length > 0 && (
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Find Customer
          </CardTitle>
        </CardHeader>
      )}

      <CardContent className="space-y-8">
        {/* Search Input */}
        {customers.length > 0 && (
          <div className="relative">
            <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />

            <Input
              type="text"
              placeholder="Search by name, phone number or email..."
              className="h-12 rounded-lg pl-12 pr-12 text-sm"
              value={searchField}
              onChange={(event) => setSearchField(event.target.value)}
            />

            {/* Clear search field btn */}
            {searchField.length > 0 && (
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                onClick={() => setSearchField("")}
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        )}

        {/* Empty State */}
        <div
          hidden={isSearching}
          className="flex flex-col items-center justify-center px-4 py-4 text-center"
        >
          {/* Icon Circle */}
          <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-accent">
            {customers.length > 0 ? (
              <Users className="size-10 text-primary" />
            ) : (
              <UserPlus className="size-10 text-accent-foreground" />
            )}
          </div>

          {/* Text */}
          <h2 className="text-xl font-semibold tracking-tight">
            {customers.length > 0 ? "Search for a customer" : "Add a customer"}
          </h2>

          {customers.length > 0 ? (
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Enter a name, phone number or email to find an existing customer,
              <br className="hidden sm:block" />
              or create a new one.
            </p>
          ) : (
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              There&apos;s currently no record of a customer in the database yet.
              Create one or proceed with{" "}
              <span className="font-bold">Walk-in Customer</span>.
            </p>
          )}

          {/* Actions */}
          <div className="mt-7 flex w-full flex-col gap-3">
            <CreateCustomer
              customers={customers}
              onCustomerCreated={(customer) => {
                setSelectedCustomerId(customer.id);
              }}
            />
            <Button
              onClick={onWalkIn}
              variant="outline"
              className="h-12 rounded-lg border-primary text-sm font-semibold text-primary hover:bg-accent hover:text-accent-foreground"
            >
              <UserRound className="mr-2 size-5" />
              Use Walk-in Customer
            </Button>
          </div>
        </div>

        {isSearching && (
          <CustomerList
            customers={searchedCustomers}
            selectedCustomerId={selectedCustomerId}
            onSelect={(customer) => setSelectedCustomerId(customer.id)}
            onCreateCustomer={() => setIsDialogOpen(true)}
          />
        )}
      </CardContent>
    </Card>
  );
}

export default FindCustomer;
