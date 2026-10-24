export type UserRole = "CASHIER" | "ADMIN";

/**
 * A user who has signed in on this till at least once. The verifier lets them
 * unlock the till offline; it is a PBKDF2 hash, never the password itself.
 */
export interface LocalUser {
  id: string;
  userName: string;
  name: string;
  role: UserRole;
  passwordVerifier: string;
  salt: string;
  lastLoginAt: string;
}
