import { db } from "@/db/db";
import { setCashierSession } from "@/lib/auth/cashier-session";
import { getMeta, setMeta } from "@/lib/meta";
import type { LocalUser, UserRole } from "@/types/local-user";
import type { BusinessSettings, DeviceRegistration } from "@/types/meta";

const PBKDF2_ITERATIONS = 210_000;

const toBase64 = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)));
const fromBase64 = (value: string) =>
  Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

/** PBKDF2 verifier so the till can be unlocked offline without storing passwords. */
export async function deriveVerifier(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
    },
    key,
    256,
  );
  return toBase64(bits);
}

interface TillLoginResponse {
  user: { id: string; userName: string; name: string; role: UserRole };
  device?: DeviceRegistration;
  settings: BusinessSettings;
}

export class TillAuthError extends Error {}

async function rememberUser(user: TillLoginResponse["user"], password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const local: LocalUser = {
    ...user,
    salt: toBase64(salt),
    passwordVerifier: await deriveVerifier(password, salt),
    lastLoginAt: new Date().toISOString(),
  };
  await db.transaction("rw", db.users, async () => {
    // userName is unique; replace any stale record for the same login.
    await db.users.where("userName").equals(user.userName).delete();
    await db.users.put(local);
  });
}

async function offlineSignIn(userName: string, password: string) {
  const local = await db.users.where("userName").equals(userName).first();
  if (!local) {
    throw new TillAuthError(
      "Can't reach the server, and this user hasn't signed in on this till before.",
    );
  }
  const verifier = await deriveVerifier(password, fromBase64(local.salt));
  if (verifier !== local.passwordVerifier) {
    throw new TillAuthError("Incorrect username or password.");
  }
  return local;
}

/**
 * Sign in on the till. Tries the server first (which also registers the till
 * on an admin's first sign-in); falls back to the cached verifier offline.
 */
export async function signInToTill(rawUserName: string, password: string) {
  const userName = rawUserName.trim().toLowerCase();
  const device = await getMeta("device");

  let response: Response | null = null;
  try {
    response = await fetch("/api/auth/till-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(device ? { Authorization: `Bearer ${device.token}` } : {}),
      },
      body: JSON.stringify({ userName, password }),
    });
  } catch {
    response = null; // Network unavailable.
  }

  let user: Pick<LocalUser, "id" | "userName" | "name" | "role">;
  if (response && response.ok) {
    const data = (await response.json()) as TillLoginResponse;
    if (data.device) await setMeta("device", data.device);
    await setMeta("businessSettings", data.settings);
    await rememberUser(data.user, password);
    user = data.user;
  } else if (response && response.status < 500) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (response.status === 401) {
      // Password changed or user deactivated: drop the offline verifier.
      await db.users.where("userName").equals(userName).delete();
    }
    throw new TillAuthError(data.error ?? "Sign-in failed.");
  } else {
    user = await offlineSignIn(userName, password);
  }

  if (!(await getMeta("device"))) {
    throw new TillAuthError(
      "This till isn't set up yet. An administrator must sign in while online.",
    );
  }

  setCashierSession({
    userId: user.id,
    userName: user.userName,
    name: user.name,
    role: user.role,
    signedInAt: new Date().toISOString(),
  });
}

export function signOutOfTill() {
  setCashierSession(null);
}
