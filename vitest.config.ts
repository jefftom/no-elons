import { defineConfig } from "vitest/config";
import path from "node:path";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://noelons:noelons@localhost:5432/noelons_test";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      MEDIA_DIR: path.resolve(import.meta.dirname, ".data/test-media"),
      NOELONS_DISABLE_RATE_LIMIT: "1",
    },
    // Integration tests share one database; run files one at a time.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
