import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const DEFAULT_URL = "postgres://noelons:noelons@localhost:5432/noelons";

// Re-use one pool across hot reloads in dev; Next re-evaluates modules often.
const globalForDb = globalThis as unknown as { __noelonsSql?: postgres.Sql };

export const sql =
  globalForDb.__noelonsSql ??
  postgres(process.env.DATABASE_URL ?? DEFAULT_URL, {
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    // Quiet "NOTICE: relation already exists" chatter from migrations.
    onnotice: () => {},
  });

if (process.env.NODE_ENV !== "production") globalForDb.__noelonsSql = sql;

export const db = drizzle(sql, { schema, casing: undefined });

export type Database = typeof db;
/** A transaction handle — services accept either `db` or a `tx`. */
export type Executor = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

export { schema };
