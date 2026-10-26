import { ActionForm, SubmitButton } from "@/components/admin/form-controls";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/admin/widgets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { archiveServiceAction, saveServiceAction } from "@/lib/admin/actions";
import { formatPrice } from "@/lib/money";
import prisma from "@/lib/prisma/prisma";

export default async function AdminServicesPage() {
  // Pages can render without their layout, so each checks auth itself.
  await requireAdmin();
  const services = await prisma.service.findMany({
    orderBy: [{ deletedAt: { sort: "asc", nulls: "first" } }, { category: "asc" }, { name: "asc" }],
  });

  return (
    <>
      <PageHeader
        title="Services & prices"
        description="Changes reach the till on its next sync. Past receipts keep the price they were sold at."
      />

      <Card>
        <CardHeader><CardTitle className="text-base">Add a service</CardTitle></CardHeader>
        <CardContent>
          <ActionForm action={saveServiceAction} className="grid gap-2 sm:grid-cols-[1fr_180px_140px_auto]">
            <Input name="name" placeholder="Service name" required />
            <Input name="category" placeholder="Category" required list="service-categories" />
            <Input name="price" placeholder="Price (₦)" inputMode="decimal" required />
            <SubmitButton>Add</SubmitButton>
          </ActionForm>
          <datalist id="service-categories">
            {[...new Set(services.map((service) => service.category))].map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {services.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">No services yet. Add one above or on the till.</p>
          )}
          {services.map((service) => (
            <div key={service.id} className="flex flex-col gap-2 px-4 py-3 lg:flex-row lg:items-center">
              <ActionForm
                action={saveServiceAction}
                resetOnSuccess={false}
                className="grid flex-1 gap-2 sm:grid-cols-[1fr_180px_140px_auto]"
              >
                <input type="hidden" name="id" value={service.id} />
                <Input name="name" defaultValue={service.name} aria-label="Name" required />
                <Input name="category" defaultValue={service.category} aria-label="Category" required />
                <Input
                  name="price"
                  defaultValue={Number(service.price).toFixed(2)}
                  aria-label={`Price, currently ${formatPrice(Number(service.price))}`}
                  inputMode="decimal"
                  required
                />
                <SubmitButton variant="outline">Save</SubmitButton>
              </ActionForm>
              <form action={archiveServiceAction} className="flex items-center gap-2">
                <input type="hidden" name="serviceId" value={service.id} />
                <input type="hidden" name="archive" value={service.deletedAt ? "false" : "true"} />
                {service.deletedAt && <Badge variant="secondary">Archived</Badge>}
                <Button type="submit" variant="ghost" size="sm">
                  {service.deletedAt ? "Restore" : "Archive"}
                </Button>
              </form>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
