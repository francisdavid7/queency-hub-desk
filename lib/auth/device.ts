import "server-only";

import { hashToken } from "@/lib/auth/tokens";
import prisma from "@/lib/prisma/prisma";

/** Resolve the till from its `Authorization: Bearer <token>` header. */
export async function authenticateDevice(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return null;

  const device = await prisma.device.findUnique({
    where: { tokenHash: hashToken(match[1].trim()) },
  });
  if (!device || device.revokedAt) return null;

  // Throttle lastSeenAt writes to once a minute.
  if (!device.lastSeenAt || Date.now() - device.lastSeenAt.getTime() > 60_000) {
    await prisma.device.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date() },
    });
  }
  return device;
}

/** Next unused till code (T1, T2, ...). Codes are unique and never reused. */
export async function nextDeviceCode() {
  const devices = await prisma.device.findMany({ select: { code: true } });
  const highest = devices.reduce((max, { code }) => {
    const number = Number(/^T(\d+)$/.exec(code)?.[1] ?? 0);
    return Math.max(max, number);
  }, 0);
  return `T${highest + 1}`;
}
