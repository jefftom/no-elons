// Drops everything in the database. Dev only.
import postgres from "postgres";

const url = process.env.DATABASE_URL ?? "postgres://noelons:noelons@localhost:5432/noelons";
if (process.env.NODE_ENV === "production") {
  console.error("Refusing to reset a production database.");
  process.exit(1);
}
const sql = postgres(url, { max: 1, onnotice: () => {} });
await sql`drop schema if exists public cascade`;
await sql`drop schema if exists drizzle cascade`;
await sql`create schema public`;
await sql.end();
console.log("✓ database reset");
