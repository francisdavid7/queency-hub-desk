"use client";

import { Check, Plus, UserRound } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  isNew?: boolean;
}

interface CustomerListProps {
  customers: Customer[];
  selectedCustomerId: string | null;
  onSelect: (customer: Customer) => void;
  onCreateCustomer: () => void;
}

function CustomerList({
  customers,
  selectedCustomerId,
  onSelect,
  onCreateCustomer,
}: CustomerListProps) {
  return (
    <div className="w-full space-y-4">
      {customers.length > 0 ? (
        <>
          <p className="text-sm text-muted-foreground">
            {customers.length} {customers.length === 1 ? "result" : "results"}{" "}
            found
          </p>

          <div className="space-y-2">
            {customers.map((customer) => {
              const isSelected = selectedCustomerId === customer.id;

              const initials = customer.name
                .trim()
                .split(/\s+/)
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => onSelect(customer)}
                  aria-pressed={isSelected}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors ${
                    isSelected
                      ? "border-blue-300 bg-blue-50/70 ring-2 ring-blue-100/60"
                      : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                  }`}
                >
                  <Avatar className="size-12 shrink-0 border border-blue-100">
                    <AvatarFallback
                      className={`font-semibold ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {initials || <UserRound className="size-5" />}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {customer.name}
                    </p>

                    <p className="mt-0.5 text-sm text-slate-600">
                      {customer.phone}
                    </p>
                  </div>

                  {/* {customer.isNew && (
                    <Badge
                      variant="secondary"
                      className="shrink-0 bg-blue-100 text-xs text-blue-700"
                    >
                      New Customer
                    </Badge>
                  )} */}

                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full border ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-slate-300 bg-card text-transparent"
                    }`}
                  >
                    <Check className="size-4 stroke-3" />
                  </span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <UserRound className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="font-medium">No customers found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try another search or create a new customer.
          </p>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={onCreateCustomer}
        className="h-12 w-full gap-2 rounded-lg border-blue-100 bg-blue-50/70 font-semibold text-blue-700 hover:bg-blue-100"
      >
        <Plus className="size-5" />
        Create Another Customer
      </Button>
    </div>
  );
}

export default CustomerList;
