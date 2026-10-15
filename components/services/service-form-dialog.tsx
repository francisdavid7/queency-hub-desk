"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  createService,
  updateService,
} from "@/lib/actions/service-actions";
import type { Service } from "@/types/service";

const serviceFormSchema = z.object({
  name: z.string().trim().min(2, "Enter a service name."),
  category: z.string().min(1, "Choose a category."),
  price: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid price."),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

const categories = ["Printing", "Finishing", "Design", "Others"];

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service | null;
}

function ServiceFormDialog({
  open,
  onOpenChange,
  service,
}: ServiceFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: { name: "", category: "Printing", price: "" },
  });

  useEffect(() => {
    if (open) {
      reset(
        service
          ? {
              name: service.name,
              category: service.category,
              price: String(service.price),
            }
          : { name: "", category: "Printing", price: "" },
      );
    }
  }, [open, reset, service]);

  const onSubmit = async (values: ServiceFormValues) => {
    const input = {
      name: values.name,
      category: values.category,
      price: Number(values.price),
    };

    try {
      if (service) {
        await updateService(service.id, input);
        toast.success("Service updated", {
          description: `${input.name} has been updated.`,
        });
      } else {
        await createService(input);
        toast.success("Service added", {
          description: `${input.name} is ready to use.`,
        });
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save service:", error);
      toast.error(service ? "Failed to update service" : "Failed to add service");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 sm:max-w-lg">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle>{service ? "Edit Service" : "Add Service"}</CardTitle>
            <CardDescription>
              {service
                ? "Update the service name, category, or price."
                : "Add a service to your catalog with its category and price."}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={Boolean(errors.name)}>
                  <FieldLabel htmlFor="service-name">Service name</FieldLabel>
                  <Input
                    id="service-name"
                    placeholder="e.g. Document Printing (A4)"
                    aria-invalid={Boolean(errors.name)}
                    autoFocus
                    {...register("name")}
                  />
                  {errors.name && <FieldError errors={[errors.name]} />}
                </Field>

                <Field data-invalid={Boolean(errors.category)}>
                  <FieldLabel htmlFor="service-category">Category</FieldLabel>
                  <select
                    id="service-category"
                    aria-invalid={Boolean(errors.category)}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-primary/50 focus-visible:ring-3 focus-visible:ring-primary/10"
                    {...register("category")}
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <FieldError errors={[errors.category]} />
                  )}
                </Field>

                <Field data-invalid={Boolean(errors.price)}>
                  <FieldLabel htmlFor="service-price">Price (NGN)</FieldLabel>
                  <Input
                    id="service-price"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    aria-invalid={Boolean(errors.price)}
                    {...register("price")}
                  />
                  {errors.price && <FieldError errors={[errors.price]} />}
                </Field>
              </FieldGroup>
            </CardContent>

            <CardFooter>
              <Field orientation="horizontal">
                <DialogClose
                  render={
                    <Button variant="outline" type="button">
                      Cancel
                    </Button>
                  }
                />
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="animate-spin" />}
                  {service ? "Save Changes" : "Add Service"}
                </Button>
              </Field>
            </CardFooter>
          </form>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

export default ServiceFormDialog;
