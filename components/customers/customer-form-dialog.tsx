"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { createCustomer, updateCustomer } from "@/lib/actions/edge-functions";
import { customerSchema } from "@/lib/zod/schema";
import type { Customer } from "@/types/customer";

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
}: CustomerFormDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: "", phone: "", email: "" },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: customer?.name ?? "",
      phone: customer?.phone ?? "",
      email: customer?.email ?? "",
    });
  }, [customer, open, reset]);

  const onSubmit = async (values: CustomerFormValues) => {
    setIsSaving(true);
    try {
      if (customer) {
        await updateCustomer(customer.id, values);
        toast.success("Customer updated", {
          description: `${values.name} has been updated.`,
        });
      } else {
        await createCustomer(values);
        toast.success("Customer added", {
          description: `${values.name} has been added.`,
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save customer:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save customer",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 sm:max-w-lg">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle>{customer ? "Edit Customer" : "Add Customer"}</CardTitle>
            <CardDescription>
              {customer
                ? "Update the customer details below."
                : "Save customer details to find them quickly next time."}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent>
              <FieldGroup>
                <Controller
                  name="name"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="customer-name">Full name</FieldLabel>
                      <Input
                        {...field}
                        id="customer-name"
                        autoFocus
                        aria-invalid={fieldState.invalid}
                        placeholder="e.g. Jane Doe"
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="phone"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="customer-phone">
                        Phone number
                      </FieldLabel>
                      <Input
                        {...field}
                        id="customer-phone"
                        type="tel"
                        aria-invalid={fieldState.invalid}
                        placeholder="e.g. 08012345678"
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="email"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="customer-email">
                        Email (optional)
                      </FieldLabel>
                      <Input
                        {...field}
                        id="customer-email"
                        type="email"
                        aria-invalid={fieldState.invalid}
                        placeholder="name@example.com"
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </FieldGroup>
            </CardContent>
            <CardFooter>
              <Field orientation="horizontal">
                <DialogClose
                  render={
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  }
                />
                <Button type="submit" disabled={isSubmitting || isSaving}>
                  {(isSubmitting || isSaving) && (
                    <Loader2 className="animate-spin" />
                  )}
                  {customer ? "Save Changes" : "Add Customer"}
                </Button>
              </Field>
            </CardFooter>
          </form>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

export default CustomerFormDialog;
