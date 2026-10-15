"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

import { customerSchema } from "@/lib/zod/schema";
import type { Customer } from "@/types/customer";
import { updateCustomer } from "@/lib/actions/edge-functions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";

function EditCustomerDialog({ customer }: { customer: Customer }) {
  const [open, setOpen] = useState(false);
  const {
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting },
  } = useForm<z.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
    values: {
      name: customer.name,
      phone: customer.phone,
      email: customer.email ?? "",
    },
  });

  const onSubmit = async (data: z.infer<typeof customerSchema>) => {
    try {
      await updateCustomer(customer.id, data);
      reset(data);
      setOpen(false);
      toast.success("Customer updated successfully", {
        description: `${data.name} has been updated.`,
      });
    } catch (error) {
      console.error("Failed to update customer:", error);
      toast.error("Failed to update customer");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 font-semibold text-blue-600 hover:bg-blue-50 hover:text-blue-700"
          />
        }
      >
        <Pencil className="size-4" />
        Edit
      </DialogTrigger>
      <DialogContent className="p-0">
        <Card>
          <CardHeader>
            <CardTitle>Edit Customer</CardTitle>
            <CardDescription>
              Update this customer&apos;s information.
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
                      <FieldLabel htmlFor={`edit-${customer.id}-name`}>
                        Full Name
                      </FieldLabel>
                      <Input
                        {...field}
                        id={`edit-${customer.id}-name`}
                        type="text"
                        aria-invalid={fieldState.invalid}
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
                      <FieldLabel htmlFor={`edit-${customer.id}-phone`}>
                        Phone Number
                      </FieldLabel>
                      <Input
                        {...field}
                        id={`edit-${customer.id}-phone`}
                        type="tel"
                        aria-invalid={fieldState.invalid}
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
                      <FieldLabel htmlFor={`edit-${customer.id}-email`}>
                        Email (Optional)
                      </FieldLabel>
                      <Input
                        {...field}
                        id={`edit-${customer.id}-email`}
                        type="email"
                        aria-invalid={fieldState.invalid}
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
                    <Button variant="outline" type="button">
                      Cancel
                    </Button>
                  }
                />
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="animate-spin stroke-2" />
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </Field>
            </CardFooter>
          </form>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

export default EditCustomerDialog;
