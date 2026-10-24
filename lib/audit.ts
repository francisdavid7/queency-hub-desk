import "server-only";

import type { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma/prisma";

export type AuditAction =
  | "auth.login"
  | "auth.login_failed"
  | "auth.logout"
  | "auth.till_login"
  | "device.registered"
  | "device.revoked"
  | "user.created"
  | "user.updated"
  | "user.password_reset"
  | "receipt.voided"
  | "receipt.rejected"
  | "service.updated"
  | "settings.updated";

interface AuditInput {
  actorId?: string | null;
  entityType?: string;
  entityId?: string;
  details?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}

export async function audit(action: AuditAction, input: AuditInput = {}) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        actorId: input.actorId ?? null,
        entityType: input.entityType,
        entityId: input.entityId,
        details: input.details,
        ipAddress: input.ipAddress ?? null,
      },
    });
  } catch (error) {
    // Auditing must never break the action being audited.
    console.error("Failed to write audit log", action, error);
  }
}

export function clientIp(headers: Headers) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    null
  );
}
