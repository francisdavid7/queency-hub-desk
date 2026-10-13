import { db } from "@/db/db";

interface CreateCustomerInput {
  name: string;
  phone: string;
  email?: string;
}

export const createCustomer = async (customerData: CreateCustomerInput) => {
  const now = new Date().toISOString();

  const newCustomer = {
    id: crypto.randomUUID(),
    name: customerData.name.trim(),
    phone: customerData.phone.trim(),
    email: customerData.email?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
    syncStatus: "pending" as const,
  };

  await db.customers.add(newCustomer);

  return newCustomer;
};
