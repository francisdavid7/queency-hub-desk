"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Minus, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { db } from "@/db/db";
import type { Service } from "@/types/service";

export type ReceiptCart = Record<string, number>;

interface ReceiptServicesStepProps {
  cart: ReceiptCart;
  onChange: (cart: ReceiptCart) => void;
  onContinue: () => void;
  onBack: () => void;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(price);

function ReceiptServicesStep({
  cart,
  onChange,
  onContinue,
  onBack,
}: ReceiptServicesStepProps) {
  const services = useLiveQuery(
    () => db.services.orderBy("name").toArray(),
    [],
    [],
  );
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const categories = useMemo(
    () => ["All", ...new Set(services.map((service) => service.category))],
    [services],
  );
  const filteredServices = useMemo(() => {
    const search = query.trim().toLowerCase();
    return services.filter((service) => {
      const matchesQuery =
        !search ||
        service.name.toLowerCase().includes(search) ||
        service.category.toLowerCase().includes(search);
      return matchesQuery && (category === "All" || category === service.category);
    });
  }, [services, query, category]);
  const cartServices = services.filter((service) => cart[service.id]);
  const itemCount = cartServices.reduce(
    (sum, service) => sum + cart[service.id],
    0,
  );
  const total = cartServices.reduce(
    (sum, service) => sum + service.price * cart[service.id],
    0,
  );

  const setQuantity = (service: Service, quantity: number) => {
    const next = { ...cart };
    if (quantity <= 0) {
      delete next[service.id];
    } else {
      next[service.id] = quantity;
    }
    onChange(next);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
      <Card className="gap-4">
        <CardHeader className="pb-0">
          <CardTitle>Select services</CardTitle>
          <p className="text-sm text-muted-foreground">
            Add services from your catalog to this receipt.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search services..."
              aria-label="Search services"
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((item) => (
              <Button
                key={item}
                type="button"
                size="sm"
                variant={category === item ? "default" : "outline"}
                onClick={() => setCategory(item)}
              >
                {item}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            {filteredServices.map((service) => (
              <div
                key={service.id}
                className="flex items-center gap-3 rounded-xl border border-border p-3"
              >
                <Avatar className="size-10 rounded-lg border border-primary/15 bg-accent">
                  <AvatarFallback className="rounded-lg bg-accent text-xs font-bold text-accent-foreground">
                    {service.category.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{service.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {service.category} · {formatPrice(service.price)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant={cart[service.id] ? "secondary" : "outline"}
                  size="icon-sm"
                  aria-label={`Add ${service.name}`}
                  onClick={() =>
                    setQuantity(service, (cart[service.id] ?? 0) + 1)
                  }
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            ))}

            {filteredServices.length === 0 && (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <p className="font-medium">
                  {services.length === 0 ? "No services available" : "No matching services"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {services.length === 0
                    ? "Add services from the Services page before creating this receipt."
                    : "Try a different search or category."}
                </p>
              </div>
            )}
          </div>

          <Button type="button" variant="outline" onClick={onBack}>
            Back to Customer
          </Button>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="size-5 text-primary" />
            Current receipt
          </CardTitle>
          {itemCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange({})}
            >
              Clear all
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {cartServices.map((service) => (
            <div
              key={service.id}
              className="rounded-xl border border-border p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{service.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatPrice(service.price)} each
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatPrice(service.price * cart[service.id])}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-xs"
                    aria-label={`Decrease ${service.name} quantity`}
                    onClick={() => setQuantity(service, cart[service.id] - 1)}
                  >
                    <Minus className="size-3" />
                  </Button>
                  <span className="min-w-6 text-center text-sm font-medium">
                    {cart[service.id]}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-xs"
                    aria-label={`Increase ${service.name} quantity`}
                    onClick={() => setQuantity(service, cart[service.id] + 1)}
                  >
                    <Plus className="size-3" />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Remove ${service.name}`}
                  onClick={() => setQuantity(service, 0)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}

          {itemCount === 0 && (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Your receipt is empty. Add one or more services to continue.
            </p>
          )}

          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-bold tabular-nums">
              {formatPrice(total)}
            </span>
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={itemCount === 0}
            onClick={onContinue}
          >
            Review Order
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default ReceiptServicesStep;
