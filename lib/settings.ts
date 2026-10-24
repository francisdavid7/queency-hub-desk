import "server-only";

import prisma from "@/lib/prisma/prisma";

export async function getBusinessSettings() {
  const settings = await prisma.businessSettings.findUnique({ where: { id: 1 } });
  return {
    businessName: settings?.businessName ?? "Queency Hub",
    address: settings?.address ?? null,
    phone: settings?.phone ?? null,
    email: settings?.email ?? null,
    receiptFooter: settings?.receiptFooter ?? "Thank you for your patronage.",
  };
}
