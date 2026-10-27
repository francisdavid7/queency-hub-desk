import { db } from "@/db/db";
import { roundMoney } from "@/lib/money";
import type { Service } from "@/types/service";

export type ServiceInput = Pick<Service, "name" | "category" | "price">;

export async function createService(input: ServiceInput) {
  const now = new Date().toISOString();
  const service: Service = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    category: input.category,
    price: roundMoney(input.price),
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
    price: roundMoney(input.price),
    updatedAt: new Date().toISOString(),
    syncStatus: "pending",
  });

  if (updated === 0) {
    throw new Error(`Service ${id} was not found.`);
  }

  return db.services.get(id);
}

/**
 * Archive a service. Past receipts keep their own copy of the name and price,
 * and the archive is kept (rather than deleted) so it can sync.
 */
export async function deleteService(id: string) {
  const service = await db.services.get(id);

  if (!service || service.deletedAt) {
    throw new Error(`Service ${id} was not found.`);
  }

  const now = new Date().toISOString();
  await db.services.update(id, {
    deletedAt: now,
    updatedAt: now,
    syncStatus: "pending",
  });
}
