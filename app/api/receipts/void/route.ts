import { NextResponse } from "next/server";
import { z } from "zod";

import { clientIp } from "@/lib/audit";
import { authenticateDevice } from "@/lib/auth/device";
import { checkCredentials } from "@/lib/auth/login";
import { voidReceiptOnServer } from "@/lib/sync/server";

const bodySchema = z.object({
  receiptId: z.string().min(1).max(100),
  userName: z.string().max(100),
  password: z.string().max(200),
  reason: z.string().trim().min(3).max(300),
});

/**
 * Manager override from the till: an admin re-enters their password to void a
 * receipt. Sync can't carry voids because it authenticates the till, not the
 * person standing at it.
 */
export async function POST(request: Request) {
  const device = await authenticateDevice(request);
  if (!device) {
    return NextResponse.json({ error: "Till not authorised." }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the admin's details and a reason." }, { status: 400 });
  }
  const { receiptId, userName, password, reason } = parsed.data;
  const ipAddress = clientIp(request.headers);

  const login = await checkCredentials(userName, password, ipAddress);
  if (!login.ok) {
    // 403 rather than 401 so the till doesn't mistake this for a revoked token.
    return NextResponse.json({ error: login.error }, { status: login.status === 401 ? 403 : login.status });
  }
  if (login.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only an administrator can void a receipt." }, { status: 403 });
  }

  const result = await voidReceiptOnServer(receiptId, login.user.id, reason, "till", ipAddress);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({
    receiptId,
    voidedAt: result.receipt.voidedAt.toISOString(),
    voidedById: login.user.id,
    voidReason: result.receipt.voidReason,
  });
}
