import { NextResponse } from "next/server";

import { authenticateDevice } from "@/lib/auth/device";
import { handlePull } from "@/lib/sync/server";

export async function GET(request: Request) {
  const device = await authenticateDevice(request);
  if (!device) {
    return NextResponse.json({ error: "Till not authorised." }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const response = await handlePull(
    {
      customers: params.get("customers"),
      services: params.get("services"),
      receipts: params.get("receipts"),
    },
    { firstPage: params.get("page") !== "next" },
  );
  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  });
}
