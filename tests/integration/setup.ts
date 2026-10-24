import { afterAll, beforeEach } from "vitest";

import { POST as tillLogin } from "@/app/api/auth/till-login/route";
import { GET as syncPull } from "@/app/api/sync/pull/route";
import { POST as syncPush } from "@/app/api/sync/push/route";
import { hashPassword } from "@/lib/auth/password";
import prisma from "@/lib/prisma/prisma";

export const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);

const TABLES = [
  "AuditLog",
  "Payment",
  "ReceiptItem",
  "Receipt",
  "Device",
  "Session",
  "Customer",
  "Service",
  "BusinessSettings",
  "User",
];

/** Route fetches from the till code straight to the Next route handlers. */
const routes: Record<string, (request: Request) => Promise<Response>> = {
  "POST /api/auth/till-login": tillLogin,
  "POST /api/sync/push": syncPush,
  "GET /api/sync/pull": syncPull,
};

export const fetchLog: string[] = [];

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const request = new Request(new URL(String(input), "http://localhost"), init);
  const key = `${request.method} ${new URL(request.url).pathname}`;
  fetchLog.push(key);
  const handler = routes[key];
  if (!handler) throw new TypeError(`No test route for ${key}`);
  return handler(request);
}) as typeof fetch;

export async function createUser(
  userName: string,
  password: string,
  role: "ADMIN" | "CASHIER",
  name = userName,
) {
  return prisma.user.create({
    data: { userName, name, role, passwordHash: await hashPassword(password) },
  });
}

if (hasDatabase) {
  beforeEach(async () => {
    fetchLog.length = 0;
    await prisma.$executeRawUnsafe(
      `TRUNCATE ${TABLES.map((table) => `"${table}"`).join(", ")} CASCADE`,
    );
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });
}
