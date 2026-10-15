"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  Filter,
  Plus,
  Search,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import Header from "@/components/shared/header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { useQueryParam } from "@/hooks/custom/use-query-param";
import { deleteService } from "@/lib/actions/service-actions";
import type { Service } from "@/types/service";
import ServiceFormDialog from "@/components/services/service-form-dialog";

const PAGE_SIZE = 8;
const PRICE_FILTERS = ["Any price", "Under ₦1,000", "₦1,000 and above"];

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(price);
}

function ServiceIcon({ category }: { category: string }) {
  const initials = category === "Printing" ? "Pr" : category.slice(0, 2);

  return (
    <Avatar className="size-9 rounded-lg border border-primary/15 bg-accent">
      <AvatarFallback className="rounded-lg bg-accent text-xs font-bold text-accent-foreground">
        {initials.toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

function ServicesPage() {
  const services = useLiveQuery(
    () => db.services.orderBy("name").toArray(),
    [],
    [],
  );
  const querySearch = useQueryParam("search");
  const [search, setSearch] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [priceFilter, setPriceFilter] = useState(PRICE_FILTERS[0]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [isDeletingService, setIsDeletingService] = useState(false);
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);

  const searchValue = search ?? querySearch;

  const categories = useMemo(
    () => [...new Set(services.map((service) => service.category))].sort(),
    [services],
  );

  const filteredServices = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    return services.filter((service) => {
      const matchesSearch =
        !query ||
        service.name.toLowerCase().includes(query) ||
        service.category.toLowerCase().includes(query);
      const matchesCategory =
        category === "all" || service.category === category;
      const matchesPrice =
        priceFilter === "Any price" ||
        (priceFilter === "Under ₦1,000" && service.price < 1000) ||
        (priceFilter === "₦1,000 and above" && service.price >= 1000);

      return matchesSearch && matchesCategory && matchesPrice;
    });
  }, [services, searchValue, category, priceFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredServices.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleServices = filteredServices.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const firstResult = filteredServices.length
    ? (currentPage - 1) * PAGE_SIZE + 1
    : 0;
  const lastResult = Math.min(currentPage * PAGE_SIZE, filteredServices.length);

  const openAddDialog = () => {
    setEditingService(null);
    setServiceDialogOpen(true);
  };

  const openEditDialog = (service: Service) => {
    setEditingService(service);
    setServiceDialogOpen(true);
    setOpenActionsId(null);
  };

  const handleDelete = async () => {
    if (!serviceToDelete) return;

    setIsDeletingService(true);

    try {
      await deleteService(serviceToDelete.id);
      toast.success("Service deleted", {
        description: `${serviceToDelete.name} has been removed.`,
      });
      setServiceToDelete(null);
    } catch (error) {
      console.error("Failed to delete service:", error);
      toast.error("Failed to delete service");
    } finally {
      setIsDeletingService(false);
      setOpenActionsId(null);
    }
  };

  return (
    <section className="space-y-6">
      <Header
        heading="Services"
        description="Manage your services and pricing."
      />

      <Card
        data-gsap-item
        className="overflow-visible rounded-xl border-border bg-card p-4 shadow-sm sm:p-5"
      >
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchValue}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search services..."
              aria-label="Search services"
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:ring-3 focus-visible:ring-primary/10"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
              aria-label="Filter services by category"
              className="h-10 min-w-40 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-primary/50 focus-visible:ring-3 focus-visible:ring-primary/10"
            >
              <option value="all">All Categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <div className="relative">
              <Button
                type="button"
                variant="outline"
                className="h-10 gap-2"
                aria-expanded={filterOpen}
                aria-controls="service-price-filters"
                onClick={() => setFilterOpen((open) => !open)}
              >
                <Filter className="size-4" />
                Filter
              </Button>
              {filterOpen && (
                <div
                  id="service-price-filters"
                  className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-border bg-popover p-3 shadow-lg"
                >
                  <label
                    htmlFor="service-price-filter"
                    className="mb-2 block text-sm font-medium"
                  >
                    Price range
                  </label>
                  <select
                    id="service-price-filter"
                    value={priceFilter}
                    onChange={(event) => {
                      setPriceFilter(event.target.value);
                      setPage(1);
                    }}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-primary/10"
                  >
                    {PRICE_FILTERS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <Button
              type="button"
              className="h-10 gap-2"
              onClick={openAddDialog}
            >
              <Plus className="size-4" />
              Add Service
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow>
                <TableHead className="h-11 pl-4">Service Name</TableHead>
                <TableHead className="h-11">Category</TableHead>
                <TableHead className="h-11 text-right">Price</TableHead>
                <TableHead className="h-11 pr-4 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleServices.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="py-3 pl-4">
                    <div className="flex items-center gap-3">
                      <ServiceIcon category={service.category} />
                      <span className="font-medium text-foreground">
                        {service.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {service.category}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatPrice(service.price)}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <div className="relative inline-block">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label={`Actions for ${service.name}`}
                        aria-expanded={openActionsId === service.id}
                        onClick={() =>
                          setOpenActionsId((id) =>
                            id === service.id ? null : service.id,
                          )
                        }
                      >
                        <Ellipsis className="size-4" />
                      </Button>
                      {openActionsId === service.id && (
                        <div
                          role="menu"
                          className="absolute right-0 z-10 mt-1 w-36 rounded-lg border border-border bg-popover p-1 text-left shadow-lg flex flex-col"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => openEditDialog(service)}
                          >
                            Edit service
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="w-full rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setServiceToDelete(service);
                              setOpenActionsId(null);
                            }}
                          >
                            Delete service
                          </button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {visibleServices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-56 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                        <Wrench className="size-5" />
                      </div>
                      <p className="font-semibold">
                        {services.length === 0
                          ? "No services yet"
                          : "No services match these filters"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {services.length === 0
                          ? "Add your first service to start managing your pricing."
                          : "Try another search or adjust the selected filters."}
                      </p>
                      {services.length === 0 && (
                        <Button
                          type="button"
                          className="mt-4 gap-2"
                          onClick={openAddDialog}
                        >
                          <Plus className="size-4" />
                          Add Service
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing {firstResult} to {lastResult} of {filteredServices.length}{" "}
            services
          </p>
          <nav
            className="flex items-center justify-end gap-1"
            aria-label="Service pages"
          >
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Previous page"
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map(
              (pageNumber) => (
                <Button
                  key={pageNumber}
                  type="button"
                  variant={pageNumber === currentPage ? "default" : "outline"}
                  size="icon-sm"
                  aria-label={`Page ${pageNumber}`}
                  aria-current={pageNumber === currentPage ? "page" : undefined}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </Button>
              ),
            )}
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Next page"
              disabled={currentPage >= pageCount}
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </nav>
        </div>
      </Card>

      <ServiceFormDialog
        open={serviceDialogOpen}
        onOpenChange={setServiceDialogOpen}
        service={editingService}
      />

      <Dialog
        open={serviceToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !isDeletingService) setServiceToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete service?</DialogTitle>
            <DialogDescription>
              {serviceToDelete
                ? `Delete ${serviceToDelete.name}? This action cannot be undone.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="outline"
                  disabled={isDeletingService}
                >
                  Cancel
                </Button>
              }
            />
            <Button
              type="button"
              variant="destructive"
              disabled={isDeletingService}
              onClick={() => void handleDelete()}
            >
              {isDeletingService ? "Deleting..." : "Delete service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default ServicesPage;
