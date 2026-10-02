/**
 * Give an account moderator or admin powers.
 *   npm run promote -- <username> [moderator|admin|user]
 */
import { eq } from "drizzle-orm";
import { db, sql } from "../src/server/db";
import { users } from "../src/server/db/schema";

const [username, role = "moderator"] = process.argv.slice(2);
if (!username || !["user", "moderator", "admin"].includes(role)) {
  console.error("Usage: npm run promote -- <username> [moderator|admin|user]");
  process.exit(1);
}
const updated = await db
  .update(users)
  .set({ role: role as "user" | "moderator" | "admin" })
  .where(eq(users.username, username.toLowerCase()))
  .returning({ id: users.id });
console.log(updated.length ? `✓ @${username} is now ${role}` : `✗ no user @${username}`);
await sql.end();
