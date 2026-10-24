import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import prisma from "@/lib/prisma/prisma";
import { createToken, hashToken } from "@/lib/auth/tokens";

export const SESSION_COOKIE = "hd_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export async function createSession(userId: string, userAgent?: string | null) {
  const token = createToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({
    data: { id: hashToken(token), userId, expiresAt, userAgent: userAgent ?? null },
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** The signed-in admin-web user, or null. Cached per request. */
export const getSessionUser = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { id: hashToken(token) },
    include: {
      user: {
        select: { id: true, userName: true, name: true, role: true, isActive: true },
      },
    },
  });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) {
    return null;
  }
  return session.user;
});

export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/admin/login?error=forbidden");
  return user;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { id: hashToken(token) } });
  }
  cookieStore.delete(SESSION_COOKIE);
}
