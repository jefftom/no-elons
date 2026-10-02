// Applies SQL migrations from ./drizzle. Plain JS so it also runs inside the
// slim production image (no TypeScript toolchain there).
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "node:path";
import { fileURLToPath } from "node:url";

const url = process.env.DATABASE_URL ?? "postgres://noelons:noelons@localhost:5432/noelons";
const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = process.env.MIGRATIONS_DIR ?? path.join(here, "..", "drizzle");

const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  await migrate(drizzle(sql), { migrationsFolder });
  console.log("✓ migrations applied");
} catch (err) {
  console.error("✗ migration failed:", err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
