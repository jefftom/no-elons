/**
 * Request-scoped auth glue for the Next.js layer. Services never import this;
 * they receive a viewer id as a plain argument so they stay framework-free.
 */
import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { ViewerInfo } from "@/components/types";
import { toUserSummary } from "../views";
import {
  SESSION_COOKIE,
  createSession,
  generateSessionToken,
  invalidateSessionToken,
  validateSessionToken,
  type SessionUser,
} from "./session";

export type Viewer = SessionUser;

/** The signed-in user for this request (memoised per request). */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const result = await validateSessionToken(token);
  return result?.user ?? null;
});

/** The subset of the viewer that UI components need (safe to pass to client components). */
export const getViewerInfo = cache(async (): Promise<ViewerInfo | null> => {
  const v = await getViewer();
  return v ? { ...toUserSummary(v), hideCounts: v.hideCounts } : null;
});

export async function requireViewer(nextPath?: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  return viewer;
}

export async function requireModerator(): Promise<Viewer> {
  const viewer = await requireViewer("/admin");
  if (viewer.role !== "moderator" && viewer.role !== "admin") redirect("/");
  return viewer;
}

export async function startSession(userId: string) {
  const token = generateSessionToken();
  const userAgent = (await headers()).get("user-agent") ?? "";
  await createSession(token, userId, userAgent);
  const store = await cookies();
  // The database owns expiry (30 days, sliding). The cookie just needs to
  // outlive it, because Server Components can't re-set cookies on renewal.
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: (process.env.PUBLIC_URL ?? "").startsWith("https://"),
    path: "/",
    maxAge: 400 * 24 * 60 * 60,
  });
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await invalidateSessionToken(token);
  store.delete(SESSION_COOKIE);
}

/**
 * Client IP for rate limiting.
 *
 * X-Forwarded-For is client-controlled except for the entries appended by
 * proxies we run. With TRUST_PROXY_HOPS=N (default 1: one load balancer/CDN in
 * front of the app) the real client is the Nth entry from the right; anything
 * to the left of it may be spoofed and is ignored. Deployments that expose the
 * app directly should put a reverse proxy in front — see docs/ARCHITECTURE.md §11.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const hops = Math.max(1, Number(process.env.TRUST_PROXY_HOPS ?? 1) || 1);
  const chain = (h.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return chain[Math.max(0, chain.length - hops)] ?? h.get("x-real-ip") ?? "local";
}
