import "server-only";

import { createHash, randomBytes } from "node:crypto";

export const createToken = () => randomBytes(32).toString("base64url");

/** Tokens are stored hashed so a database leak doesn't expose live sessions. */
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
