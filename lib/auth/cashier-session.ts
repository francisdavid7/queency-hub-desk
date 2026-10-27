import type { UserRole } from "@/types/local-user";

export interface CashierSession {
  userId: string;
  userName: string;
  name: string;
  role: UserRole;
  signedInAt: string;
}

// Session storage keeps the till unlocked across reloads but locks it again
// when the app window is closed, so each shift signs in.
const STORAGE_KEY = "hubdesk.cashier-session";
const listeners = new Set<() => void>();
let current: CashierSession | null | undefined;

function storage() {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

export function getCashierSession(): CashierSession | null {
  if (current === undefined) {
    const raw = storage()?.getItem(STORAGE_KEY);
    try {
      current = raw ? (JSON.parse(raw) as CashierSession) : null;
    } catch {
      current = null;
    }
  }
  return current;
}

export function setCashierSession(session: CashierSession | null) {
  current = session;
  const store = storage();
  if (session) store?.setItem(STORAGE_KEY, JSON.stringify(session));
  else store?.removeItem(STORAGE_KEY);
  listeners.forEach((listener) => listener());
}

export function subscribeCashierSession(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function requireCashierSession(): CashierSession {
  const session = getCashierSession();
  if (!session) throw new Error("Sign in to the till to continue.");
  return session;
}
