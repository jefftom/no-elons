/**
 * Feed skeletons. Each function answers "which posts, in what order?" with a
 * single indexed query, then hands the ids to hydration (see hydration.ts).
 *
 * The home timeline is fan-out-on-read: we ask Postgres for recent posts by
 * the people you follow. That's simple and correct up to a surprising scale;
 * docs/ARCHITECTURE.md § Timelines describes the hybrid fan-out-on-write
 * design we switch to when it isn't.
 *
 * Every feed is strictly reverse-chronological. That's a product promise
 * (see the Charter), not an implementation shortcut.
 */
import { and, asc, desc, eq, gt, inArray, isNull, lt, notInArray, or, sql, type SQL } from "drizzle-orm";
import { LIMITS } from "@/lib/limits";
import { db } from "../db";
import { bookmarks, follows, likes, listMembers, postHashtags, posts, users } from "../db/schema";
import type { FeedItem, FeedPage, PostView } from "../views";
import { assembleFeed, hydratePosts, type SkeletonRow } from "./hydration";
import { hiddenAuthorIds } from "./relationships";

const live = () => and(isNull(posts.deletedAt), isNull(posts.removedAt));
const skeletonColumns = { id: posts.id, authorId: posts.authorId, repostOfId: posts.repostOfId };

function hiddenFilter(hidden: Set<string>): SQL | undefined {
  return hidden.size ? notInArray(posts.authorId, [...hidden]) : undefined;
}

async function page(
  rows: SkeletonRow[],
  limit: number,
  viewerId: string | null,
  hidden: Set<string>,
): Promise<FeedPage> {
  const slice = rows.slice(0, limit);
  const items = await assembleFeed(slice, viewerId, { hidden });
  return { items, nextCursor: rows.length > limit ? slice[slice.length - 1].id : null };
}

/** Home: you + everyone you follow, posts and reposts, newest first. */
export async function homeFeed(viewerId: string, cursor: string | null, limit: number = LIMITS.pageSize): Promise<FeedPage> {
  const hidden = await hiddenAuthorIds(viewerId);
  const followees = db.select({ id: follows.followeeId }).from(follows).where(eq(follows.followerId, viewerId));
  const rows = await db
    .select(skeletonColumns)
    .from(posts)
    .where(
      and(
        live(),
        or(eq(posts.authorId, viewerId), inArray(posts.authorId, followees)),
        // Old-Twitter reply rule: only show replies when you follow (or are) the person being replied to.
        or(
          isNull(posts.replyToId),
          eq(posts.authorId, viewerId),
          eq(posts.replyToAuthorId, viewerId),
          inArray(posts.replyToAuthorId, followees),
        ),
        hiddenFilter(hidden),
        cursor ? lt(posts.id, cursor) : undefined,
      ),
    )
    .orderBy(desc(posts.id))
    .limit(limit + 1);
  return page(rows, limit, viewerId, hidden);
}

/** Everyone: the public timeline. Original posts only (no replies, no reposts). */
export async function everyoneFeed(viewerId: string | null, cursor: string | null, limit: number = LIMITS.pageSize): Promise<FeedPage> {
  const hidden = await hiddenAuthorIds(viewerId);
  const rows = await db
    .select(skeletonColumns)
    .from(posts)
    .where(
      and(
        live(),
        isNull(posts.replyToId),
        isNull(posts.repostOfId),
        hiddenFilter(hidden),
        cursor ? lt(posts.id, cursor) : undefined,
      ),
    )
    .orderBy(desc(posts.id))
    .limit(limit + 1);
  return page(rows, limit, viewerId, hidden);
}

export type GridPage = { posts: PostView[]; nextCursor: string | null };

async function gridPage(rows: { id: string }[], limit: number, viewerId: string | null, hidden: Set<string>): Promise<GridPage> {
  const slice = rows.slice(0, limit);
  const views = await hydratePosts(
    slice.map((r) => r.id),
    viewerId,
    { hidden },
  );
  return {
    posts: slice.map((r) => views.get(r.id)).filter((p): p is PostView => !!p && p.state === "ok" && p.media.length > 0),
    nextCursor: rows.length > limit ? slice[slice.length - 1].id : null,
  };
}

/** Photos: an Instagram-style grid of photo posts, from everyone or from people you follow. */
export async function photosFeed(
  viewerId: string | null,
  scope: "everyone" | "following",
  cursor: string | null,
  limit: number = LIMITS.gridPageSize,
): Promise<GridPage> {
  const hidden = await hiddenAuthorIds(viewerId);
  const followees =
    scope === "following" && viewerId
      ? db.select({ id: follows.followeeId }).from(follows).where(eq(follows.followerId, viewerId))
      : null;
  const rows = await db
    .select({ id: posts.id })
    .from(posts)
    .where(
      and(
        live(),
        sql`${posts.mediaCount} > 0`,
        isNull(posts.repostOfId),
        followees && viewerId ? or(eq(posts.authorId, viewerId), inArray(posts.authorId, followees)) : undefined,
        hiddenFilter(hidden),
        cursor ? lt(posts.id, cursor) : undefined,
      ),
    )
    .orderBy(desc(posts.id))
    .limit(limit + 1);
  return gridPage(rows, limit, viewerId, hidden);
}

export type ProfileTab = "posts" | "replies";

/** A profile's Posts tab (posts + reposts, no replies) or Replies tab (everything they wrote). */
export async function profileFeed(
  profileId: string,
  viewerId: string | null,
  tab: ProfileTab,
  cursor: string | null,
  limit: number = LIMITS.pageSize,
): Promise<FeedPage> {
  const hidden = await hiddenAuthorIds(viewerId);
  const rows = await db
    .select(skeletonColumns)
    .from(posts)
    .where(
      and(
        live(),
        eq(posts.authorId, profileId),
        tab === "posts" ? isNull(posts.replyToId) : isNull(posts.repostOfId),
        cursor ? lt(posts.id, cursor) : undefined,
      ),
    )
    .orderBy(desc(posts.id))
    .limit(limit + 1);
  return page(rows, limit, viewerId, hidden);
}

/** A profile's photo grid. */
export async function profileGrid(
  profileId: string,
  viewerId: string | null,
  cursor: string | null,
  limit: number = LIMITS.gridPageSize,
): Promise<GridPage> {
  const hidden = await hiddenAuthorIds(viewerId);
  const rows = await db
    .select({ id: posts.id })
    .from(posts)
    .where(
      and(
        live(),
        eq(posts.authorId, profileId),
        sql`${posts.mediaCount} > 0`,
        isNull(posts.repostOfId),
        cursor ? lt(posts.id, cursor) : undefined,
      ),
    )
    .orderBy(desc(posts.id))
    .limit(limit + 1);
  return gridPage(rows, limit, viewerId, hidden);
}

/** Posts a user liked — only ever shown to that user (likes are private on NoElons). */
export async function likesFeed(viewerId: string, cursor: string | null, limit: number = LIMITS.pageSize): Promise<FeedPage> {
  return savedFeed(viewerId, "likes", cursor, limit);
}

export async function bookmarksFeed(viewerId: string, cursor: string | null, limit: number = LIMITS.pageSize): Promise<FeedPage> {
  return savedFeed(viewerId, "bookmarks", cursor, limit);
}

async function savedFeed(viewerId: string, kind: "likes" | "bookmarks", cursor: string | null, limit: number): Promise<FeedPage> {
  const table = kind === "likes" ? likes : bookmarks;
  const hidden = await hiddenAuthorIds(viewerId);
  const rows = await db
    .select({ edgeId: table.id, postId: table.postId })
    .from(table)
    .where(and(eq(table.userId, viewerId), cursor ? lt(table.id, cursor) : undefined))
    .orderBy(desc(table.id))
    .limit(limit + 1);
  const slice = rows.slice(0, limit);
  const items = await assembleFeed(
    slice.map((r) => ({ id: r.postId, authorId: "", repostOfId: null })),
    viewerId,
    { hidden },
  );
  return { items, nextCursor: rows.length > limit ? slice[slice.length - 1].edgeId : null };
}

export async function hashtagFeed(tag: string, viewerId: string | null, cursor: string | null, limit: number = LIMITS.pageSize): Promise<FeedPage> {
  const hidden = await hiddenAuthorIds(viewerId);
  const rows = await db
    .select(skeletonColumns)
    .from(postHashtags)
    .innerJoin(posts, eq(posts.id, postHashtags.postId))
    .where(
      and(
        eq(postHashtags.tag, tag.toLowerCase()),
        live(),
        hiddenFilter(hidden),
        cursor ? lt(posts.id, cursor) : undefined,
      ),
    )
    .orderBy(desc(posts.id))
    .limit(limit + 1);
  return page(rows, limit, viewerId, hidden);
}

/** Full-text search over posts, newest first (we don't rank by "engagement"). */
export async function searchPosts(query: string, viewerId: string | null, cursor: string | null, limit: number = LIMITS.pageSize): Promise<FeedPage> {
  const q = query.trim();
  if (!q) return { items: [], nextCursor: null };
  const hidden = await hiddenAuthorIds(viewerId);
  const rows = await db
    .select(skeletonColumns)
    .from(posts)
    .where(
      and(
        live(),
        isNull(posts.repostOfId),
        sql`${posts.search} @@ websearch_to_tsquery('simple', ${q})`,
        hiddenFilter(hidden),
        cursor ? lt(posts.id, cursor) : undefined,
      ),
    )
    .orderBy(desc(posts.id))
    .limit(limit + 1);
  return page(rows, limit, viewerId, hidden);
}

/** A list's timeline: posts and reposts by its members (old-Twitter Lists). */
export async function listFeed(listId: string, viewerId: string | null, cursor: string | null, limit: number = LIMITS.pageSize): Promise<FeedPage> {
  const hidden = await hiddenAuthorIds(viewerId);
  const members = db.select({ id: listMembers.userId }).from(listMembers).where(eq(listMembers.listId, listId));
  const rows = await db
    .select(skeletonColumns)
    .from(posts)
    .where(
      and(
        live(),
        inArray(posts.authorId, members),
        or(isNull(posts.replyToId), inArray(posts.replyToAuthorId, members)),
        hiddenFilter(hidden),
        cursor ? lt(posts.id, cursor) : undefined,
      ),
    )
    .orderBy(desc(posts.id))
    .limit(limit + 1);
  return page(rows, limit, viewerId, hidden);
}

export type ThreadView = {
  ancestors: PostView[];
  post: PostView;
  /** The author's own follow-up replies (a 🧵), shown straight after the post. */
  selfThread: PostView[];
  replies: FeedItem[];
  nextCursor: string | null;
};

/**
 * A conversation: the chain of parents above a post, the post itself, and
 * its direct replies oldest-first (so the conversation reads top to bottom).
 */
export async function getThread(postId: string, viewerId: string | null, cursor: string | null = null, limit = 50): Promise<ThreadView | null> {
  const hidden = await hiddenAuthorIds(viewerId);
  const ancestorRows = await db.execute<{ id: string; depth: number }>(sql`
    with recursive chain(id, reply_to_id, depth) as (
      select id, reply_to_id, 0 from posts where id = ${postId}
      union all
      select p.id, p.reply_to_id, c.depth + 1
      from posts p join chain c on p.id = c.reply_to_id
      where c.depth < 40
    )
    select id, depth from chain order by depth desc
  `);
  if (!ancestorRows.length) return null;

  const ids = ancestorRows.map((r) => r.id);
  const views = await hydratePosts(ids, viewerId, { hidden });
  const post = views.get(postId);
  if (!post) return null;

  // Self-thread: follow the author's earliest reply-to-themselves, then theirs, and so on.
  const chainRows =
    post.state === "ok" && !cursor
      ? await db.execute<{ id: string }>(sql`
          with recursive chain(id, depth) as (
            (select id, 1 from posts
              where reply_to_id = ${postId} and author_id = ${post.author.id}
                and deleted_at is null and removed_at is null
              order by id limit 1)
            union all
            select next.id, chain.depth + 1 from chain
            cross join lateral (
              select id from posts
              where reply_to_id = chain.id and author_id = ${post.author.id}
                and deleted_at is null and removed_at is null
              order by id limit 1
            ) next
            where chain.depth < 25
          )
          select id from chain order by depth
        `)
      : [];
  const chainIds = chainRows.map((r) => r.id);
  const chainViews = await hydratePosts(chainIds, viewerId, { hidden });
  const selfThread = chainIds.map((id) => chainViews.get(id)).filter((p): p is PostView => !!p && p.state === "ok");

  const replyRows = await db
    .select(skeletonColumns)
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .where(
      and(
        eq(posts.replyToId, postId),
        live(),
        isNull(users.suspendedAt),
        hiddenFilter(hidden),
        chainIds.length ? notInArray(posts.id, chainIds) : undefined,
        cursor ? gt(posts.id, cursor) : undefined,
      ),
    )
    .orderBy(asc(posts.id))
    .limit(limit + 1);
  const slice = replyRows.slice(0, limit);
  const replies = await assembleFeed(slice, viewerId, { hidden });

  return {
    ancestors: ids.filter((id) => id !== postId).map((id) => views.get(id)).filter((p): p is PostView => !!p),
    post,
    selfThread,
    replies,
    nextCursor: replyRows.length > limit ? slice[slice.length - 1].id : null,
  };
}

/** A single post (for quote previews in the composer, edit pages, etc.). */
export async function getPost(postId: string, viewerId: string | null): Promise<PostView | null> {
  const views = await hydratePosts([postId], viewerId);
  return views.get(postId) ?? null;
}

/** Repost rows have their own ids; links to them should land on the original. */
export async function resolveRepost(postId: string): Promise<string | null> {
  const [row] = await db.select({ repostOfId: posts.repostOfId }).from(posts).where(eq(posts.id, postId));
  return row?.repostOfId ?? null;
}
