/** Read side of notifications. */
import { and, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { db } from "../db";
import { notifications, users } from "../db/schema";
import { toUserSummary, type PostView, type UserSummary } from "../views";
import type { NotificationType } from "./notify";
import { hydratePosts } from "./hydration";
import { hiddenAuthorIds } from "./relationships";

/**
 * One row in the notifications tab. Likes and reposts of the same post, and
 * new followers, are grouped ("Lena and 3 others liked your post") within a
 * page; replies, quotes and mentions are always shown individually.
 */
export type NotificationView = {
  /** Id of the newest notification in the group. */
  id: string;
  type: NotificationType;
  /** Newest first, de-duplicated. */
  actors: UserSummary[];
  post: PostView | null;
  createdAt: Date;
  unread: boolean;
  /** Every notification id folded into this row (for marking read). */
  ids: string[];
};

function groupKey(type: NotificationType, postId: string | null, id: string): string {
  if (type === "like" || type === "repost") return `${type}:${postId}`;
  if (type === "follow") return "follow";
  return id;
}

export async function listNotifications(
  userId: string,
  cursor: string | null,
  limit = 40,
): Promise<{ items: NotificationView[]; nextCursor: string | null }> {
  const hidden = await hiddenAuthorIds(userId);
  const rows = await db
    .select({ n: notifications, actor: users })
    .from(notifications)
    .innerJoin(users, eq(users.id, notifications.actorId))
    .where(and(eq(notifications.recipientId, userId), isNull(users.suspendedAt), cursor ? lt(notifications.id, cursor) : undefined))
    .orderBy(desc(notifications.id))
    .limit(limit + 1);
  const slice = rows.slice(0, limit);
  const posts = await hydratePosts(
    slice.map((r) => r.n.postId).filter((x): x is string => !!x),
    userId,
    { hidden },
  );
  const items: NotificationView[] = [];
  const groups = new Map<string, NotificationView>();
  for (const { n, actor } of slice) {
    if (hidden.has(actor.id)) continue;
    const post = n.postId ? (posts.get(n.postId) ?? null) : null;
    if (n.postId && (!post || post.state !== "ok")) continue;
    const key = groupKey(n.type, n.postId, n.id);
    const existing = groups.get(key);
    if (existing) {
      if (!existing.actors.some((a) => a.id === actor.id)) existing.actors.push(toUserSummary(actor));
      existing.ids.push(n.id);
      existing.unread ||= !n.readAt;
      continue;
    }
    const view: NotificationView = {
      id: n.id,
      type: n.type,
      actors: [toUserSummary(actor)],
      post,
      createdAt: n.createdAt,
      unread: !n.readAt,
      ids: [n.id],
    };
    groups.set(key, view);
    items.push(view);
  }
  return { items, nextCursor: rows.length > limit ? slice[slice.length - 1].n.id : null };
}

/**
 * Unread count for the badge. Applies the same visibility rules as the list
 * (suspended/blocked/muted actors, deleted/removed posts) so the badge never
 * counts something the notifications tab won't show.
 */
export async function unreadCount(userId: string): Promise<number> {
  const [row] = await db.execute<{ n: number }>(sql`
    select count(*)::int as n
    from notifications n
    join users a on a.id = n.actor_id and a.suspended_at is null
    left join posts p on p.id = n.post_id
    where n.recipient_id = ${userId}
      and n.read_at is null
      and (n.post_id is null or (p.deleted_at is null and p.removed_at is null))
      and not exists (
        select 1 from blocks b
        where (b.blocker_id = ${userId} and b.blocked_id = n.actor_id)
           or (b.blocker_id = n.actor_id and b.blocked_id = ${userId})
      )
      and not exists (select 1 from mutes m where m.muter_id = ${userId} and m.muted_id = n.actor_id)
  `);
  return Number(row?.n ?? 0);
}

export async function markRead(userId: string, ids?: string[]): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.recipientId, userId),
        isNull(notifications.readAt),
        ids ? inArray(notifications.id, ids) : undefined,
      ),
    );
}
