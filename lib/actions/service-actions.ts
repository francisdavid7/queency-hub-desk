import { db } from "@/db/db";
import type { Service } from "@/types/service";

export type ServiceInput = Pick<Service, "name" | "category" | "price">;

export async function createService(input: ServiceInput) {
  const now = new Date().toISOString();
  const service: Service = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    category: input.category,
    price: input.price,
    createdAt: now,
    updatedAt: now,
    syncStatus: "pending",
  };

  await db.services.add(service);
  return service;
}

export async function updateService(id: string, input: ServiceInput) {
  const updated = await db.services.update(id, {
    name: input.name.trim(),
    category: input.category,
    price: input.price,
    updatedAt: new Date().toISOString(),
    syncStatus: "pending",
    syncedAt: undefined,
  });

  if (updated === 0) {
    throw new Error(`Service ${id} was not found.`);
  }

  return db.services.get(id);
}

export async function deleteService(id: string) {
  const service = await db.services.get(id);

  if (!service) {
    throw new Error(`Service ${id} was not found.`);
  }

  await db.services.delete(id);
}
