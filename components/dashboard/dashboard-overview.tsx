"use client";

import {
  Banknote,
  ReceiptText,
  BriefcaseBusiness,
  Users,
  CalendarDays,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const stats = [
  {
    title: "Today's Revenue",
    value: 0,
    icon: Banknote,
    iconClass: "bg-info-muted text-info",
    footer: (
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-success">+18.2%</span> vs yesterday
      </p>
    ),
  },
  {
    title: "Receipts Today",
    value: 0,
    icon: ReceiptText,
    iconClass: "bg-purple-muted text-purple",
    footer: (
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-success">+8</span> vs yesterday
      </p>
    ),
  },
  {
    title: "Pending Jobs",
    value: 0,
    icon: BriefcaseBusiness,
    iconClass: "bg-warning-muted text-warning",
    footer: (
      <button className="text-xs font-medium text-primary transition hover:underline cursor-pointer">
        View pending jobs →
      </button>
    ),
  },
  {
    title: "New Customers",
    value: "6",
    icon: Users,
    iconClass: "bg-success-muted text-success",
    footer: (
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-success">+2</span> vs yesterday
      </p>
    ),
  },
];

function DashboardOverview() {
  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Welcome back, Cashier!
          </h1>

          <p className="text-sm text-muted-foreground">
            Here's what's happening at your tech hub today.
          </p>
        </div>

        <Button
          variant="outline"
          className="h-10 w-fit gap-3 rounded-lg bg-card px-4 font-medium shadow-none"
        >
          <span>May 24, 2025</span>
          <CalendarDays className="size-4 text-muted-foreground" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Card key={stat.title} className="rounded-xl bg-card ring-0">
              <CardContent className="flex min-h-30 flex-col justify-between p-5">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full ${stat.iconClass}`}
                  >
                    <Icon className="size-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>

                    <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                      {stat.value}
                    </p>
                  </div>
                </div>

                <div className="ml-13 mt-4">
                  {stat.title !== "Pending Jobs" ? (
                    <>{stat.footer}</>
                  ) : stat.value === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No pending job available
                    </p>
                  ) : (
                    <>{stat.footer}</>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export default DashboardOverview;
