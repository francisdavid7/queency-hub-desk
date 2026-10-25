"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { audit, clientIp } from "@/lib/audit";
import { checkCredentials } from "@/lib/auth/login";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { createSession, destroySession, getSessionUser, requireAdmin } from "@/lib/auth/session";
import { roundMoney } from "@/lib/money";
import prisma from "@/lib/prisma/prisma";
import { refreshReceiptBalance } from "@/lib/sync/server";

export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
}

const ipAddress = async () => clientIp(await headers());

const fail = (error: string): ActionState => ({ ok: false, error });
const done = (message: string): ActionState => ({ ok: true, message });

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const ip = await ipAddress();
  const result = await checkCredentials(
    String(formData.get("userName") ?? ""),
    String(formData.get("password") ?? ""),
    ip,
  );
  if (!result.ok) return fail(result.error);
  if (result.user.role !== "ADMIN") {
    return fail("This dashboard is for administrators. Cashiers sign in on the till.");
  }

  await createSession(result.user.id, (await headers()).get("user-agent"));
  await audit("auth.login", { actorId: result.user.id, ipAddress: ip });
  redirect("/admin");
}

export async function logoutAction() {
  const user = await getSessionUser();
  await destroySession();
  if (user) await audit("auth.logout", { actorId: user.id, ipAddress: await ipAddress() });
  redirect("/admin/login");
}

export async function voidReceiptAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const receiptId = String(formData.get("receiptId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 3) return fail("Enter a reason for voiding this receipt.");

  const receipt = await prisma.receipt.findUnique({ where: { id: receiptId } });
  if (!receipt) return fail("Receipt not found.");
  if (receipt.voidedAt) return fail("This receipt is already voided.");

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.receipt.update({
      where: { id: receiptId },
      data: { voidedAt: now, voidedById: admin.id, voidReason: reason, updatedAt: now },
    });
    await refreshReceiptBalance(tx, receiptId);
  });
  await audit("receipt.voided", {
    actorId: admin.id,
    entityType: "Receipt",
    entityId: receiptId,
    details: { receiptNumber: receipt.receiptNumber, reason, source: "web" },
    ipAddress: await ipAddress(),
  });
  revalidatePath("/admin", "layout");
  return done(`Receipt ${receipt.receiptNumber} voided.`);
}

const userSchema = z.object({
  userName: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,32}$/, "Username: 3–32 letters, numbers, dots, dashes."),
  name: z.string().trim().min(2, "Enter the person's name.").max(80),
  role: z.enum(["ADMIN", "CASHIER"]),
  password: z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`).max(200),
});

export async function createUserAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = userSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { userName, name, role, password } = parsed.data;

  if (await prisma.user.findUnique({ where: { userName } })) {
    return fail(`The username "${userName}" is taken.`);
  }
  const user = await prisma.user.create({
    data: { userName, name, role, passwordHash: await hashPassword(password) },
  });
  await audit("user.created", {
    actorId: admin.id,
    entityType: "User",
    entityId: user.id,
    details: { userName, role },
    ipAddress: await ipAddress(),
  });
  revalidatePath("/admin/users");
  return done(`${name} can now sign in as "${userName}".`);
}

export async function setUserActiveAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const isActive = formData.get("isActive") === "true";
  if (userId === admin.id && !isActive) return;

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { isActive } }),
    // Deactivation ends any open web sessions immediately.
    ...(isActive ? [] : [prisma.session.deleteMany({ where: { userId } })]),
  ]);
  await audit("user.updated", {
    actorId: admin.id,
    entityType: "User",
    entityId: userId,
    details: { isActive },
    ipAddress: await ipAddress(),
  });
  revalidatePath("/admin/users");
}

export async function resetPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < MIN_PASSWORD_LENGTH) {
    return fail(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password) } }),
    prisma.session.deleteMany({ where: { userId, NOT: { userId: admin.id } } }),
  ]);
  await audit("user.password_reset", {
    actorId: admin.id,
    entityType: "User",
    entityId: userId,
    ipAddress: await ipAddress(),
  });
  return done("Password updated. The till accepts it at the next online sign-in.");
}

export async function revokeDeviceAction(formData: FormData) {
  const admin = await requireAdmin();
  const deviceId = String(formData.get("deviceId") ?? "");
  await prisma.device.update({ where: { id: deviceId }, data: { revokedAt: new Date() } });
  await audit("device.revoked", {
    actorId: admin.id,
    entityType: "Device",
    entityId: deviceId,
    ipAddress: await ipAddress(),
  });
  revalidatePath("/admin/users");
}

const settingsSchema = z.object({
  businessName: z.string().trim().min(2).max(100),
  address: z.string().trim().max(200),
  phone: z.string().trim().max(40),
  email: z.string().trim().max(120),
  receiptFooter: z.string().trim().max(200),
});

export async function saveSettingsAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Check the business details and try again.");
  const data = Object.fromEntries(
    Object.entries(parsed.data).map(([key, value]) => [key, value || null]),
  ) as { businessName: string; address: string | null; phone: string | null; email: string | null; receiptFooter: string | null };

  await prisma.businessSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });
  await audit("settings.updated", { actorId: admin.id, details: data, ipAddress: await ipAddress() });
  revalidatePath("/admin/settings");
  return done("Saved. Tills pick up the new details on their next sync.");
}

const serviceSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Enter a service name.").max(200),
  category: z.string().trim().min(1, "Enter a category.").max(100),
  price: z.coerce.number().finite().min(0, "Enter a valid price.").max(1_000_000_000),
});

export async function saveServiceAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = serviceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { id, name, category } = parsed.data;
  const price = roundMoney(parsed.data.price);
  // updatedAt drives last-write-wins on the tills.
  const now = new Date();

  const service = id
    ? await prisma.service.update({ where: { id }, data: { name, category, price, updatedAt: now } })
    : await prisma.service.create({
        data: { id: crypto.randomUUID(), name, category, price, createdAt: now, updatedAt: now },
      });
  await audit("service.updated", {
    actorId: admin.id,
    entityType: "Service",
    entityId: service.id,
    details: { name, category, price, created: !id },
    ipAddress: await ipAddress(),
  });
  revalidatePath("/admin/services");
  return done(id ? `${name} updated.` : `${name} added.`);
}

export async function archiveServiceAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("serviceId") ?? "");
  const archive = formData.get("archive") === "true";
  const now = new Date();
  await prisma.service.update({
    where: { id },
    data: { deletedAt: archive ? now : null, updatedAt: now },
  });
  await audit("service.updated", {
    actorId: admin.id,
    entityType: "Service",
    entityId: id,
    details: { archived: archive },
    ipAddress: await ipAddress(),
  });
  revalidatePath("/admin/services");
}
