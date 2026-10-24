import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": root("./"),
      // `server-only` throws outside React Server Components; tests run in plain Node.
      "server-only": root("./tests/stubs/empty.ts"),
    },
  },
  test: {
    environment: "node",
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/*.test.ts"],
          setupFiles: ["./tests/setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          // Needs a disposable Postgres: TEST_DATABASE_URL=postgres://... pnpm test
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          setupFiles: ["./tests/setup.ts", "./tests/integration/setup.ts"],
          fileParallelism: false,
          // Password hashing and real database round-trips are slow by design.
          testTimeout: 30_000,
          env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? "" },
        },
      },
    ],
  },
});
