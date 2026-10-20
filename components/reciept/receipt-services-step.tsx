"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Minus, Plus, Search, ShoppingCart, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { db } from "@/db/db";
import type { Service } from "@/types/service";

export interface ReceiptCartItem {
  key: string;
  serviceId: string;
  serviceName: string;
  serviceCategory: string;
  quantity: number;
  unitPrice: number;
  custom?: boolean;
}

export type ReceiptCart = ReceiptCartItem[];

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
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>(
    {},
  );
  const [manualName, setManualName] = useState("");
  const [manualCategory, setManualCategory] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualQuantity, setManualQuantity] = useState("1");

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

  const selectedItems = cart.filter((item) => item.quantity > 0);
  const itemCount = selectedItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const total = selectedItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const cartItemForService = (serviceId: string) =>
    cart.find((item) => item.serviceId === serviceId);

  const updateQuantity = (key: string, rawQuantity: string) => {
    const quantity = rawQuantity === "" ? 0 : Number(rawQuantity);
    if (!Number.isSafeInteger(quantity) || quantity < 0) return;

    const currentItem = cart.find((item) => item.key === key);
    if (!currentItem) return;

    onChange(
      cart.map((item) =>
        item.key === key ? { ...item, quantity } : item,
      ),
    );
  };

  const setCatalogQuantity = (service: Service, quantity: number) => {
    if (!Number.isSafeInteger(quantity) || quantity < 0) return;

    const existing = cartItemForService(service.id);
    if (!existing && quantity <= 0) return;

    const nextItem: ReceiptCartItem = existing ?? {
      key: service.id,
      serviceId: service.id,
      serviceName: service.name,
      serviceCategory: service.category,
      unitPrice: service.price,
      quantity: 0,
    };
    if (existing) {
      onChange(
        cart.map((item) =>
          item.key === existing.key ? { ...item, quantity } : item,
        ),
      );
    } else {
      onChange([...cart, { ...nextItem, quantity }]);
    }
  };

  const addManualService = () => {
    const name = manualName.trim();
    const unitPrice = Number(manualPrice);
    const quantity = Number(manualQuantity);

    if (!name) {
      toast.error("Enter a service name");
      return;
    }
    if (manualPrice.trim() === "" || !Number.isFinite(unitPrice) || unitPrice < 0) {
      toast.error("Enter a valid service price");
      return;
    }
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      toast.error("Quantity must be a whole number greater than zero");
      return;
    }
    if (!Number.isFinite(unitPrice * quantity)) {
      toast.error("The service total is too large");
      return;
    }

    const key = `manual-${crypto.randomUUID()}`;
    onChange([
      ...cart,
      {
        key,
        serviceId: key,
        serviceName: name,
        serviceCategory: manualCategory.trim() || "Custom",
        unitPrice,
        quantity,
        custom: true,
      },
    ]);
    setManualName("");
    setManualCategory("");
    setManualPrice("");
    setManualQuantity("1");
    toast.success("Manual service added");
  };

  const clearCart = () => onChange([]);

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
      <div className="min-w-0 space-y-4">
        <Card className="min-w-0 gap-4">
          <CardHeader className="pb-0">
            <CardTitle>Select services</CardTitle>
            <p className="text-sm text-muted-foreground">
              Choose from your catalog and enter the quantity for each service.
            </p>
          </CardHeader>
          <CardContent className="min-w-0 space-y-4">
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
              {filteredServices.map((service) => {
                const selectedItem = cartItemForService(service.id);
                const quantity = selectedItem?.quantity ?? 0;

                return (
                  <div
                    key={service.id}
                    className="flex min-w-0 items-center gap-2 rounded-xl border border-border p-2.5 sm:gap-3 sm:p-3"
                  >
                    <Avatar className="size-9 shrink-0 rounded-lg border border-primary/15 bg-accent sm:size-10">
                      <AvatarFallback className="rounded-lg bg-accent text-xs font-bold text-accent-foreground">
                        {service.category.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {service.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {service.category} · {formatPrice(service.price)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        aria-label={`Quantity of ${service.name}`}
                        value={quantityDrafts[service.id] ?? String(quantity)}
                        onChange={(event) => {
                          const value = event.target.value;
                          setQuantityDrafts((drafts) => ({
                            ...drafts,
                            [service.id]: value,
                          }));
                          if (value === "" || /^\d+$/.test(value)) {
                            setCatalogQuantity(
                              service,
                              value === "" ? 0 : Number(value),
                            );
                          }
                        }}
                        onBlur={() =>
                          setQuantityDrafts((drafts) => {
                            const next = { ...drafts };
                            delete next[service.id];
                            return next;
                          })
                        }
                        className="h-9 w-16 px-1.5 text-center tabular-nums sm:w-20 sm:px-2"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label={
                          quantity > 0
                            ? `Increase ${service.name} quantity`
                            : `Add ${service.name}`
                        }
                        onClick={() => {
                          setCatalogQuantity(service, quantity + 1);
                          setQuantityDrafts((drafts) => ({
                            ...drafts,
                            [service.id]: String(quantity + 1),
                          }));
                        }}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {filteredServices.length === 0 && (
                <div className="rounded-xl border border-dashed p-8 text-center">
                  <p className="font-medium">
                    {services.length === 0
                      ? "No services available"
                      : "No matching services"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {services.length === 0
                      ? "Add a service below or create one from the Services page."
                      : "Try a different search or category."}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="size-5 text-primary" />
              Add a manual service
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Add a one-time service to this receipt without saving it to your
              service catalog.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="manual-service-name" className="text-sm font-medium">
                  Service name
                </label>
                <Input
                  id="manual-service-name"
                  value={manualName}
                  onChange={(event) => setManualName(event.target.value)}
                  placeholder="e.g. Urgent delivery"
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="manual-service-category" className="text-sm font-medium">
                  Category (optional)
                </label>
                <Input
                  id="manual-service-category"
                  value={manualCategory}
                  onChange={(event) => setManualCategory(event.target.value)}
                  placeholder="e.g. Delivery"
                  maxLength={80}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="manual-service-price" className="text-sm font-medium">
                  Unit price
                </label>
                <Input
                  id="manual-service-price"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={manualPrice}
                  onChange={(event) => setManualPrice(event.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="manual-service-quantity" className="text-sm font-medium">
                  Quantity
                </label>
                <Input
                  id="manual-service-quantity"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={manualQuantity}
                  onChange={(event) => setManualQuantity(event.target.value)}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 sm:w-auto"
              onClick={addManualService}
            >
              <Plus className="size-4" />
              Add to receipt
            </Button>
          </CardContent>
        </Card>

        <Button type="button" variant="outline" onClick={onBack}>
          Back to Customer
        </Button>
      </div>

      <Card className="h-fit min-w-0">
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle className="flex min-w-0 items-center gap-2">
            <ShoppingCart className="size-5 shrink-0 text-primary" />
            <span>Current receipt</span>
          </CardTitle>
          {itemCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={clearCart}
            >
              Clear all
            </Button>
          )}
        </CardHeader>
        <CardContent className="min-w-0 space-y-3">
          {selectedItems.map((item) => (
            <div
              key={item.key}
              className="min-w-0 rounded-xl border border-border p-3"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold">
                    {item.serviceName}
                    {item.custom && (
                      <span className="ml-2 inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Manual
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.serviceCategory} · {formatPrice(item.unitPrice)} each
                  </p>
                </div>
                <p className="shrink-0 text-right text-sm font-semibold tabular-nums">
                  {formatPrice(item.unitPrice * item.quantity)}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-xs"
                    aria-label={`Decrease ${item.serviceName} quantity`}
                    onClick={() =>
                      updateQuantity(item.key, String(item.quantity - 1))
                    }
                  >
                    <Minus className="size-3" />
                  </Button>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    aria-label={`Quantity of ${item.serviceName}`}
                    value={item.quantity}
                    onChange={(event) =>
                      updateQuantity(item.key, event.target.value)
                    }
                    className="h-8 w-20 px-2 text-center tabular-nums"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-xs"
                    aria-label={`Increase ${item.serviceName} quantity`}
                    onClick={() =>
                      updateQuantity(item.key, String(item.quantity + 1))
                    }
                  >
                    <Plus className="size-3" />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Remove ${item.serviceName}`}
                  onClick={() =>
                    onChange(cart.filter((cartItem) => cartItem.key !== item.key))
                  }
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}

          {selectedItems.length === 0 && (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Your receipt is empty. Add a catalog or manual service to continue.
            </p>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <span className="font-semibold">Total</span>
            <span className="text-right text-lg font-bold tabular-nums">
              {formatPrice(total)}
            </span>
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={selectedItems.length === 0}
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
