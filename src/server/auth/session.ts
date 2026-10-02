/**
 * Database-backed sessions (the approach from lucia-auth.com's guide).
 * The cookie holds a random token; the database stores only its SHA-256, so
 * a leaked sessions table can't be replayed.
 */
import { sha256 } from "@oslojs/crypto/sha2";
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from "@oslojs/encoding";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { sessions, users } from "../db/schema";

export const SESSION_COOKIE = "noelons_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RENEW_WHEN_LEFT_MS = 15 * 24 * 60 * 60 * 1000;

export type SessionUser = typeof users.$inferSelect;

export function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return encodeBase32LowerCaseNoPadding(bytes);
}

function sessionIdFromToken(token: string): string {
  return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}

export async function createSession(token: string, userId: string, userAgent = "") {
  const session = {
    id: sessionIdFromToken(token),
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    userAgent: userAgent.slice(0, 300),
  };
  await db.insert(sessions).values(session);
  return session;
}

export async function validateSessionToken(
  token: string,
): Promise<{ user: SessionUser; expiresAt: Date; renewed: boolean } | null> {
  if (!/^[a-z2-7]{32}$/.test(token)) return null;
  const sessionId = sessionIdFromToken(token);
  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);
  if (!row) return null;

  const now = Date.now();
  if (row.session.expiresAt.getTime() <= now || row.user.suspendedAt) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }

  // Sliding expiry: extend active sessions once they're halfway to expiring.
  let expiresAt = row.session.expiresAt;
  let renewed = false;
  if (expiresAt.getTime() - now < RENEW_WHEN_LEFT_MS) {
    expiresAt = new Date(now + SESSION_TTL_MS);
    renewed = true;
    await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, sessionId));
  }
  return { user: row.user, expiresAt, renewed };
}

export async function invalidateSessionToken(token: string) {
  await db.delete(sessions).where(eq(sessions.id, sessionIdFromToken(token)));
}

export async function invalidateAllSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
