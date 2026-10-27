"use client";

import { useSyncExternalStore } from "react";

import {
  getCashierSession,
  subscribeCashierSession,
} from "@/lib/auth/cashier-session";

export function useCashierSession() {
  return useSyncExternalStore(
    subscribeCashierSession,
    getCashierSession,
    () => null,
  );
}
