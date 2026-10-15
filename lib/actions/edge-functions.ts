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

export const updateCustomer = async (
  customerId: string,
  customerData: CreateCustomerInput,
) => {
  const updated = await db.customers.update(customerId, {
    name: customerData.name.trim(),
    phone: customerData.phone.trim(),
    email: customerData.email?.trim() || undefined,
    updatedAt: new Date().toISOString(),
    syncStatus: "pending",
    syncedAt: undefined,
  });

  if (updated === 0) {
    throw new Error(`Customer ${customerId} was not found.`);
  }

  return db.customers.get(customerId);
};

export const deleteCustomer = async (customerId: string) => {
  await db.transaction("rw", db.customers, db.receipts, async () => {
    const customer = await db.customers.get(customerId);
    if (!customer) {
      throw new Error(`Customer ${customerId} was not found.`);
    }

    const linkedReceipts = await db.receipts
      .where("customerId")
      .equals(customerId)
      .count();
    if (linkedReceipts > 0) {
      throw new Error(
        "This customer has receipt history and cannot be deleted.",
      );
    }

    await db.customers.delete(customerId);
  });
};
