/**
 * Hydration: post ids → PostView.
 *
 * Every feed in NoElons is built in two steps:
 *   1. a *skeleton* query returns ordered post ids (cheap, index-only-ish)
 *   2. hydration batch-loads everything needed to render those ids
 *
 * Splitting them means feeds can later come from anywhere — a Redis
 * timeline, a search index, a third-party custom feed — and still render
 * identically. Hydration does a constant number of queries per page,
 * regardless of page size (no N+1).
 */
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../db";
import { bookmarks, likes, postMedia, posts, users } from "../db/schema";
import { mediaUrl } from "../storage";
import { toUserSummary, type FeedItem, type MediaView, type PostState, type PostView, type UserSummary } from "../views";
import { hiddenAuthorIds } from "./relationships";

type HydrateOptions = {
  /** Authors the viewer has blocked/muted (or been blocked by). Pass it in when you already have it. */
  hidden?: Set<string>;
  /** Internal: quotes are hydrated one level deep only. */
  depth?: number;
  /** Moderator view: show the content of removed/unavailable posts (never deleted ones — that content is gone). */
  reveal?: boolean;
};

export async function hydratePosts(
  ids: string[],
  viewerId: string | null,
  options: HydrateOptions = {},
): Promise<Map<string, PostView>> {
  const unique = [...new Set(ids)];
  const out = new Map<string, PostView>();
  if (!unique.length) return out;
  const depth = options.depth ?? 0;
  const hidden = options.hidden ?? (await hiddenAuthorIds(viewerId));

  const rows = await db
    .select({ post: posts, author: users })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(inArray(posts.id, unique));

  const quoteIds = depth === 0 ? rows.map((r) => r.post.quoteOfId).filter((x): x is string => !!x) : [];
  const replyAuthorIds = rows.map((r) => r.post.replyToAuthorId).filter((x): x is string => !!x);

  const [mediaRows, quoteViews, replyAuthors, likedRows, repostRows, bookmarkRows] = await Promise.all([
    db.select().from(postMedia).where(inArray(postMedia.postId, unique)).orderBy(asc(postMedia.postId), asc(postMedia.position)),
    hydratePosts(quoteIds, viewerId, { hidden, depth: depth + 1, reveal: options.reveal }),
    replyAuthorIds.length
      ? db.select({ id: users.id, username: users.username }).from(users).where(inArray(users.id, replyAuthorIds))
      : Promise.resolve([]),
    viewerId
      ? db.select({ postId: likes.postId }).from(likes).where(and(eq(likes.userId, viewerId), inArray(likes.postId, unique)))
      : Promise.resolve([]),
    viewerId
      ? db
          .select({ postId: posts.repostOfId })
          .from(posts)
          .where(and(eq(posts.authorId, viewerId), inArray(posts.repostOfId, unique), isNull(posts.deletedAt)))
      : Promise.resolve([]),
    viewerId
      ? db
          .select({ postId: bookmarks.postId })
          .from(bookmarks)
          .where(and(eq(bookmarks.userId, viewerId), inArray(bookmarks.postId, unique)))
      : Promise.resolve([]),
  ]);

  const mediaByPost = new Map<string, MediaView[]>();
  for (const m of mediaRows) {
    const list = mediaByPost.get(m.postId) ?? [];
    list.push({
      id: m.id,
      url: mediaUrl(m.storageKey)!,
      thumbUrl: mediaUrl(m.thumbKey)!,
      width: m.width,
      height: m.height,
      alt: m.altText,
      color: m.color,
    });
    mediaByPost.set(m.postId, list);
  }
  const replyAuthorName = new Map(replyAuthors.map((u) => [u.id, u.username]));
  const liked = new Set(likedRows.map((r) => r.postId));
  const reposted = new Set(repostRows.map((r) => r.postId));
  const bookmarked = new Set(bookmarkRows.map((r) => r.postId));

  for (const { post, author } of rows) {
    let state: PostState = "ok";
    if (post.deletedAt) state = "deleted";
    else if (post.removedAt) state = "removed";
    else if (author.suspendedAt || hidden.has(author.id)) state = "unavailable";

    let quote: PostView["quote"] = null;
    if (post.quoteOfId) {
      const q = quoteViews.get(post.quoteOfId);
      quote = q && q.state === "ok" ? q : "unavailable";
    }

    const visible = state === "ok" || (options.reveal === true && state !== "deleted");
    out.set(post.id, {
      id: post.id,
      author: toUserSummary(author),
      body: visible ? post.body : "",
      contentWarning: visible ? post.contentWarning : null,
      createdAt: post.createdAt,
      editedAt: post.editedAt,
      state,
      removalRule: post.removalRule,
      replyTo: post.replyToId || post.replyToAuthorId
        ? {
            postId: post.replyToId,
            username: post.replyToAuthorId ? (replyAuthorName.get(post.replyToAuthorId) ?? null) : null,
          }
        : null,
      threadRootId: post.threadRootId,
      quote: visible ? quote : null,
      media: visible ? (mediaByPost.get(post.id) ?? []) : [],
      counts: {
        likes: post.likeCount,
        reposts: post.repostCount,
        replies: post.replyCount,
        quotes: post.quoteCount,
      },
      viewer: viewerId
        ? { liked: liked.has(post.id), reposted: reposted.has(post.id), bookmarked: bookmarked.has(post.id) }
        : null,
    });
  }
  return out;
}

/** Skeleton rows: a post id, or a repost row pointing at its original. */
export type SkeletonRow = { id: string; authorId: string; repostOfId: string | null };

/**
 * Turn skeleton rows into renderable feed items: hydrate, attach "reposted
 * by", drop anything the viewer shouldn't see, and de-duplicate a post that
 * several people you follow reposted.
 */
export async function assembleFeed(
  rows: SkeletonRow[],
  viewerId: string | null,
  options: { hidden?: Set<string>; keepTombstones?: boolean } = {},
): Promise<FeedItem[]> {
  const hidden = options.hidden ?? (await hiddenAuthorIds(viewerId));
  const reposterIds = [...new Set(rows.filter((r) => r.repostOfId).map((r) => r.authorId))];
  const [views, reposters] = await Promise.all([
    hydratePosts(
      rows.map((r) => r.repostOfId ?? r.id),
      viewerId,
      { hidden },
    ),
    loadUserSummaries(reposterIds),
  ]);

  const seen = new Set<string>();
  const items: FeedItem[] = [];
  for (const row of rows) {
    const postId = row.repostOfId ?? row.id;
    const post = views.get(postId);
    if (!post) continue;
    if (post.state !== "ok" && !options.keepTombstones) continue;
    if (seen.has(postId)) continue;
    seen.add(postId);
    const repostedBy = row.repostOfId ? reposters.get(row.authorId) : undefined;
    if (row.repostOfId && !repostedBy) continue;
    items.push({ key: row.id, post, repostedBy });
  }
  return items;
}

export async function loadUserSummaries(ids: string[]): Promise<Map<string, UserSummary>> {
  if (!ids.length) return new Map();
  const rows = await db.select().from(users).where(inArray(users.id, ids));
  return new Map(rows.filter((u) => !u.suspendedAt).map((u) => [u.id, toUserSummary(u)]));
}
