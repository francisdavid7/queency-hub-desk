import { NextResponse } from "next/server";

import { authenticateDevice } from "@/lib/auth/device";
import { pushRequestSchema } from "@/lib/sync/contract";
import { handlePush } from "@/lib/sync/server";

export async function POST(request: Request) {
  const device = await authenticateDevice(request);
  if (!device) {
    return NextResponse.json({ error: "Till not authorised." }, { status: 401 });
  }

  const parsed = pushRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid sync payload.", issues: parsed.error.issues.slice(0, 10) },
      { status: 400 },
    );
  }

  return NextResponse.json(await handlePush(parsed.data, device));
}
