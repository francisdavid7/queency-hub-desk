import { NextResponse } from "next/server";
import { z } from "zod";

import { audit, clientIp } from "@/lib/audit";
import { authenticateDevice, nextDeviceCode } from "@/lib/auth/device";
import { checkCredentials } from "@/lib/auth/login";
import { createToken, hashToken } from "@/lib/auth/tokens";
import prisma from "@/lib/prisma/prisma";
import { getBusinessSettings } from "@/lib/settings";

const bodySchema = z.object({
  userName: z.string().max(100),
  password: z.string().max(200),
  deviceName: z.string().trim().max(60).optional(),
});

/**
 * Signs a user in on a till. If the till isn't registered yet (no valid
 * bearer token) an ADMIN signing in registers it and receives its token.
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { userName, password, deviceName } = parsed.data;
  const ipAddress = clientIp(request.headers);

  const result = await checkCredentials(userName, password, ipAddress);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const { user } = result;

  let device = await authenticateDevice(request);
  let newDevice: { id: string; code: string; name: string; token: string } | undefined;

  if (!device) {
    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "This till isn't set up yet. An administrator must sign in first." },
        { status: 403 },
      );
    }
    const token = createToken();
    device = await prisma.device.create({
      data: {
        id: crypto.randomUUID(),
        name: deviceName || "Front desk till",
        code: await nextDeviceCode(),
        tokenHash: hashToken(token),
        registeredById: user.id,
        lastSeenAt: new Date(),
      },
    });
    newDevice = { id: device.id, code: device.code, name: device.name, token };
    await audit("device.registered", {
      actorId: user.id,
      entityType: "Device",
      entityId: device.id,
      details: { code: device.code, name: device.name },
      ipAddress,
    });
  }

  await audit("auth.till_login", {
    actorId: user.id,
    entityType: "Device",
    entityId: device.id,
    ipAddress,
  });

  return NextResponse.json({
    user,
    device: newDevice,
    settings: await getBusinessSettings(),
  });
}
