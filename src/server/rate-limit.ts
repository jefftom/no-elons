/**
 * Fixed-window rate limiter.
 *
 * In-memory is fine for a single instance. The interface is deliberately
 * tiny so it can be swapped for Redis (INCR + EXPIRE) when we run more than
 * one app server — see docs/ARCHITECTURE.md § Scaling.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  if (process.env.NOELONS_DISABLE_RATE_LIMIT === "1") return { ok: true };
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    lastSweep = now;
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count++;
  return { ok: true };
}

export const LIMITS_PER_ACTION = {
  login: { limit: 10, windowMs: 15 * 60_000 },
  loginAccount: { limit: 30, windowMs: 15 * 60_000 },
  signup: { limit: 5, windowMs: 60 * 60_000 },
  post: { limit: 60, windowMs: 15 * 60_000 },
  interact: { limit: 600, windowMs: 15 * 60_000 },
  report: { limit: 20, windowMs: 60 * 60_000 },
} as const;
