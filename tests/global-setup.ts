/**
 * Prepares a throwaway database for the integration tests. If Postgres isn't
 * reachable, DB-backed suites are skipped (unit tests still run) — unless
 * CI=true, where a missing database is a hard failure.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "node:path";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    dbAvailable: boolean;
  }
}

export default async function setup(project: TestProject) {
  const url = process.env.TEST_DATABASE_URL ?? "postgres://noelons:noelons@localhost:5432/noelons_test";
  const sql = postgres(url, { max: 1, onnotice: () => {}, connect_timeout: 5 });
  try {
    await sql`drop schema if exists public cascade`;
    await sql`drop schema if exists drizzle cascade`;
    await sql`create schema public`;
    await migrate(drizzle(sql), { migrationsFolder: path.resolve(import.meta.dirname, "../drizzle") });
    project.provide("dbAvailable", true);
  } catch (err) {
    if (process.env.CI) throw err;
    console.warn(`\n⚠ Skipping database tests: can't prepare ${url.replace(/:[^:@/]+@/, ":***@")} (${(err as Error).message})\n`);
    project.provide("dbAvailable", false);
  } finally {
    await sql.end();
  }
}
