"use client";

import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Mail,
  MapPin,
  UserRound,
  Wallet,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Customer } from "@/types/customer";
import EditCustomerDialog from "./edit-customer-dialog";

export type CustomerInformationData = Customer & {
  address?: string;
  totalTransactions?: number;
  totalSpent?: number;
};

interface CustomerInformationProps {
  customer: CustomerInformationData;
  onContinue?: () => void;
}

const currencyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
});

function formatCustomerDate(date?: string) {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsedDate);
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <Icon className="size-5" strokeWidth={2} />
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 wrap-break-word text-sm font-medium text-slate-800">
          {value}
        </p>
      </div>
    </div>
  );
}

function CustomerInformation({
  customer,
  onContinue,
}: CustomerInformationProps) {
  const initials = customer.name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card className="w-full gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-0 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <h2 className="text-base font-semibold tracking-tight text-slate-900">
          Customer Information
        </h2>

        <EditCustomerDialog customer={customer} />
      </div>

      {/* Customer identity */}
      <div className="mx-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
        <Avatar className="size-12 shrink-0">
          <AvatarFallback className="bg-blue-600 text-base font-semibold text-white">
            {initials || <UserRound className="size-5" />}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {customer.name}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">{customer.phone}</p>
        </div>
      </div>

      {/* Customer details */}
      <div className="space-y-4 px-5 py-4">
        <InfoRow
          icon={Mail}
          label="Email"
          value={customer.email || "Not provided"}
        />

        <InfoRow
          icon={MapPin}
          label="Address"
          value={customer.address || "Not provided"}
        />

        <InfoRow
          icon={CalendarDays}
          label="Customer Since"
          value={formatCustomerDate(customer.createdAt)}
        />

        <InfoRow
          icon={ClipboardList}
          label="Total Transactions"
          value={(customer.totalTransactions ?? 0).toLocaleString("en-NG")}
        />

        <InfoRow
          icon={Wallet}
          label="Total Spent"
          value={currencyFormatter.format(customer.totalSpent ?? 0)}
        />
      </div>

      <Separator />

      {/* Primary action */}
      <div className="p-3">
        <Button
          type="button"
          onClick={onContinue}
          className="h-12 w-full gap-2 rounded-lg bg-blue-600 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          Continue to Services
          <ArrowRight className="size-5" />
        </Button>
      </div>
    </Card>
  );
}

export default CustomerInformation;
