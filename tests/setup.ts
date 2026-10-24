import "fake-indexeddb/auto";
import { beforeEach } from "vitest";

import { db } from "@/db/db";
import { setCashierSession } from "@/lib/auth/cashier-session";
import { setMeta } from "@/lib/meta";

export const TEST_CASHIER = {
  userId: "user-cashier",
  userName: "cashier",
  name: "Test Cashier",
  role: "CASHIER" as const,
  signedInAt: new Date().toISOString(),
};

export const TEST_DEVICE = {
  id: "device-1",
  code: "T1",
  name: "Front desk",
  token: "test-token",
};

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
  setCashierSession(TEST_CASHIER);
  await setMeta("device", TEST_DEVICE);
});
