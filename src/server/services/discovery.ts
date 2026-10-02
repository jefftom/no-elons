/** Trending hashtags, people search, and other "find stuff" queries. */
import { and, desc, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { toUserSummary, type UserSummary } from "../views";

export type Trend = { tag: string; posts: number; people: number };

let trendCache: { at: number; value: Trend[] } | null = null;
const TREND_TTL_MS = 60_000;

/**
 * Hashtags used by the most *distinct people* in the last 24 hours.
 * Counting people instead of posts makes trends much harder to game with a
 * single spammy account. Cached in-process for a minute; at scale this
 * becomes a materialised view or a Redis sorted set (see ARCHITECTURE.md).
 */
export async function trendingHashtags(limit = 6): Promise<Trend[]> {
  const now = Date.now();
  if (trendCache && now - trendCache.at < TREND_TTL_MS) return trendCache.value.slice(0, limit);
  const rows = await db.execute<{ tag: string; posts: number; people: number }>(sql`
    select h.tag, count(*)::int as posts, count(distinct h.author_id)::int as people
    from post_hashtags h
    join posts p on p.id = h.post_id
    where h.created_at > now() - interval '24 hours'
      and p.deleted_at is null and p.removed_at is null
    group by h.tag
    order by people desc, posts desc, h.tag asc
    limit 20
  `);
  let value = rows.map((r) => ({ tag: r.tag, posts: Number(r.posts), people: Number(r.people) }));
  if (value.length < limit) {
    // Quiet day (or a fresh install): fall back to the all-time favourites.
    const allTime = await db.execute<{ tag: string; posts: number; people: number }>(sql`
      select tag, count(*)::int as posts, count(distinct author_id)::int as people
      from post_hashtags group by tag order by people desc, posts desc, tag asc limit 20
    `);
    const seen = new Set(value.map((v) => v.tag));
    value = [...value, ...allTime.filter((r) => !seen.has(r.tag)).map((r) => ({ tag: r.tag, posts: Number(r.posts), people: Number(r.people) }))];
  }
  trendCache = { at: now, value };
  return value.slice(0, limit);
}

export function resetTrendCache() {
  trendCache = null;
}

/** People search by username or display name (trigram-indexed ILIKE). */
export async function searchUsers(query: string, limit = 20): Promise<Array<UserSummary & { bio: string }>> {
  const q = query.trim().replace(/^@/, "");
  if (!q) return [];
  const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const rows = await db
    .select()
    .from(users)
    .where(and(isNull(users.suspendedAt), or(ilike(users.username, pattern), ilike(users.displayName, pattern))))
    .orderBy(sql`(${users.username} = lower(${q})) desc`, desc(users.followerCount))
    .limit(limit);
  return rows.map((u) => ({ ...toUserSummary(u), bio: u.bio }));
}
