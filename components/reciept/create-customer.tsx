"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { customerSchema } from "@/lib/zod/schema";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from "../ui/dialog";
import { Loader2, Plus } from "lucide-react";
import type { Customer } from "@/types/customer";
import { createCustomer } from "@/lib/actions/edge-functions";
import { toast } from "sonner";
import { useSearchField } from "@/hooks/custom/use-search-field";

function CreateCustomer({
  customers,
  showTrigger = true,
  onCustomerCreated,
}: {
  customers: Customer[];
  showTrigger?: boolean;
  onCustomerCreated: (customer: Customer) => void;
}) {
  const { isDialogOpen, setIsDialogOpen } = useSearchField();
  const {
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting },
  } = useForm<z.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
    },
  });

  const { setSearchField } = useSearchField();

  const onSubmit = async (data: z.infer<typeof customerSchema>) => {
    const { name, phone, email } = data;

    try {
      const customer = await createCustomer({
        name,
        phone,
        email,
      });

      console.log("Customer created:", customer);
      onCustomerCreated(customer);
      reset();
      setIsDialogOpen(false);
      toast.success("Customer created successfully", {
        description: `${name} has been added and selected.`,
      });
      setSearchField(customer.phone);
    } catch (error) {
      toast.error("Failed to create customer");
      console.log("Failed to create customer:", error);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      {showTrigger && (
        <DialogTrigger
          render={
            <Button className="h-12 w-full rounded-lg text-sm font-semibold" />
          }
        >
          <Plus className="mr-2 size-5" />
          {customers.length > 0
            ? "Create New Customer"
            : "Create your first customer"}
        </DialogTrigger>
      )}
      <DialogContent className="p-0">
        <Card>
          <CardHeader>
            <CardTitle>Create New Customer</CardTitle>
            <CardDescription>
              Fill in the customer&apos;s information to continue.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form>
              <FieldGroup>
                <Controller
                  name="name"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <div className="flex gap-1">
                        <FieldLabel htmlFor={field.name}>Full Name</FieldLabel>
                        <span className="text-sm text-destructive">*</span>
                      </div>

                      <Input
                        {...field}
                        id={field.name}
                        type="text"
                        placeholder="e.g John Doe"
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
                      <div className="flex gap-1">
                        <FieldLabel htmlFor={field.name}>
                          Phone Number
                        </FieldLabel>
                        <span className="text-sm text-destructive">*</span>
                      </div>

                      <Input
                        {...field}
                        id={field.name}
                        type="number"
                        placeholder="e.g 08123456789"
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
                      <FieldLabel htmlFor={field.name}>
                        Email (Optional)
                      </FieldLabel>

                      <Input
                        {...field}
                        id={field.name}
                        type="email"
                        placeholder="e.g email@example.com"
                        aria-invalid={fieldState.invalid}
                      />

                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </FieldGroup>
            </form>
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
              <Button
                type="submit"
                onClick={handleSubmit(onSubmit)}
                className={`${isSubmitting ? "pointer-events-none rounded-full" : ""}`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin stroke-2" />
                  </>
                ) : (
                  "Save Customer"
                )}
              </Button>
            </Field>
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

export default CreateCustomer;
