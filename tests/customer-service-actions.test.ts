import { describe, expect, it } from "vitest";

import { activeCustomers, activeServices, db } from "@/db/db";
import {
  createCustomer,
  deleteCustomer,
  updateCustomer,
} from "@/lib/actions/edge-functions";
import { createReceipt } from "@/lib/actions/receipt-actions";
import {
  createService,
  deleteService,
  updateService,
} from "@/lib/actions/service-actions";

describe("customer actions", () => {
  it("creates a trimmed customer marked for sync", async () => {
    const customer = await createCustomer({
      name: "  Ada Obi ",
      phone: " 08012345678 ",
      email: "",
    });
    expect(customer).toMatchObject({
      name: "Ada Obi",
      phone: "08012345678",
      email: undefined,
      syncStatus: "pending",
    });
  });

  it("updates a customer and resets sync status", async () => {
    const customer = await createCustomer({ name: "Ada", phone: "08012345678" });
    await db.customers.update(customer.id, { syncStatus: "synced" });
    const updated = await updateCustomer(customer.id, {
      name: "Ada Obi",
      phone: "08099999999",
    });
    expect(updated?.name).toBe("Ada Obi");
    expect(updated?.syncStatus).toBe("pending");
  });

  it("refuses to update a missing customer", async () => {
    await expect(
      updateCustomer("missing", { name: "x", phone: "y" }),
    ).rejects.toThrow(/not found/);
  });

  it("soft-deletes a customer with no receipts", async () => {
    const customer = await createCustomer({ name: "Ada", phone: "08012345678" });
    await deleteCustomer(customer.id);
    expect(await activeCustomers().count()).toBe(0);
    const stored = await db.customers.get(customer.id);
    expect(stored?.deletedAt).toBeDefined();
    expect(stored?.syncStatus).toBe("pending");
    await expect(deleteCustomer(customer.id)).rejects.toThrow(/not found/);
  });

  it("blocks deleting a customer with receipt history", async () => {
    const customer = await createCustomer({ name: "Ada", phone: "08012345678" });
    await createReceipt({
      customerId: customer.id,
      paymentMethod: "CASH",
      amountPaid: 100,
      items: [
        {
          serviceId: "svc",
          serviceName: "Typing",
          serviceCategory: "Documents",
          quantity: 1,
          unitPrice: 100,
        },
      ],
    });
    await expect(deleteCustomer(customer.id)).rejects.toThrow(/receipt history/);
    expect(await db.customers.count()).toBe(1);
  });
});

describe("service actions", () => {
  it("creates, updates and deletes a service", async () => {
    const service = await createService({
      name: " Lamination ",
      category: "Finishing",
      price: 300,
    });
    expect(service.name).toBe("Lamination");

    const updated = await updateService(service.id, {
      name: "Lamination A4",
      category: "Finishing",
      price: 350,
    });
    expect(updated?.price).toBe(350);

    await deleteService(service.id);
    expect(await activeServices().count()).toBe(0);
    expect((await db.services.get(service.id))?.deletedAt).toBeDefined();
  });

  it("throws when updating or deleting a missing service", async () => {
    const input = { name: "x", category: "y", price: 1 };
    await expect(updateService("missing", input)).rejects.toThrow();
    await expect(deleteService("missing")).rejects.toThrow();
  });
});
