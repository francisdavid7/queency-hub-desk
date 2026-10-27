import "server-only";

import { audit } from "@/lib/audit";
import { burnPasswordCheck, verifyPassword } from "@/lib/auth/password";
import prisma from "@/lib/prisma/prisma";

const MAX_FAILURES = 5;
const MAX_FAILURES_PER_IP = 25;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

export type LoginResult =
  | {
      ok: true;
      user: { id: string; userName: string; name: string; role: "ADMIN" | "CASHIER" };
    }
  | { ok: false; error: string; status: number };

/**
 * Shared credential check for the admin web and the till. Locks a username
 * after repeated failures, using the audit log as the counter so it works
 * across serverless instances.
 */
export async function checkCredentials(
  rawUserName: string,
  password: string,
  ipAddress: string | null,
): Promise<LoginResult> {
  const userName = rawUserName.trim().toLowerCase();
  if (!userName || !password) {
    return { ok: false, error: "Enter your username and password.", status: 400 };
  }

  const recentFailures = await prisma.auditLog.count({
    where: {
      action: "auth.login_failed",
      createdAt: { gte: new Date(Date.now() - LOCKOUT_WINDOW_MS) },
      details: { path: ["userName"], equals: userName },
    },
  });
  // A looser per-address limit slows guessing across many usernames.
  const ipFailures = ipAddress
    ? await prisma.auditLog.count({
        where: {
          action: "auth.login_failed",
          ipAddress,
          createdAt: { gte: new Date(Date.now() - LOCKOUT_WINDOW_MS) },
        },
      })
    : 0;
  if (recentFailures >= MAX_FAILURES || ipFailures >= MAX_FAILURES_PER_IP) {
    return {
      ok: false,
      error: "Too many failed attempts. Try again in 15 minutes.",
      status: 429,
    };
  }

  const user = await prisma.user.findUnique({ where: { userName } });
  if (!user) await burnPasswordCheck(password);
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !valid || !user.isActive) {
    await audit("auth.login_failed", {
      actorId: user?.id,
      details: { userName, reason: user && valid ? "inactive" : "invalid" },
      ipAddress,
    });
    return { ok: false, error: "Incorrect username or password.", status: 401 };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  return {
    ok: true,
    user: { id: user.id, userName: user.userName, name: user.name, role: user.role },
  };
}
