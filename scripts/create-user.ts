/**
 * Create or reset a HubDesk user.
 *
 *   pnpm user:create --username boss --name "Queency Admin" --role ADMIN
 *
 * The password is read from HUBDESK_PASSWORD or prompted for interactively.
 * Running it for an existing username resets that user's password and role.
 */
import "dotenv/config";

import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";

import { hashPassword, MIN_PASSWORD_LENGTH } from "../lib/auth/password";
import prisma from "../lib/prisma/prisma";

async function main() {
  const { values } = parseArgs({
    options: {
      username: { type: "string" },
      name: { type: "string" },
      role: { type: "string", default: "CASHIER" },
    },
  });

  const userName = values.username?.trim().toLowerCase();
  const role = values.role?.toUpperCase();
  if (!userName || (role !== "ADMIN" && role !== "CASHIER")) {
    console.error(
      'Usage: pnpm user:create --username <name> [--name "Full Name"] [--role ADMIN|CASHIER]',
    );
    process.exit(1);
  }

  let password = process.env.HUBDESK_PASSWORD;
  if (!password) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    password = await rl.question(`Password for ${userName}: `);
    rl.close();
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { userName },
    create: { userName, name: values.name ?? userName, role, passwordHash },
    update: { passwordHash, role, isActive: true, ...(values.name ? { name: values.name } : {}) },
  });
  console.log(`Saved ${user.role} "${user.userName}" (${user.name}).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
