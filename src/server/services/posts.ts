/**
 * Post write path: create, edit, delete, like, repost, bookmark, pin.
 *
 * Each mutation is one transaction that also maintains the denormalised
 * counters, the hashtag/mention indexes and notifications, so readers never
 * have to compute anything expensive.
 */
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { uuidv7 } from "@/lib/ids";
import { LIMITS, editWindowOpen } from "@/lib/limits";
import { extractHashtags, extractMentions } from "@/lib/text";
import { altTextSchema, contentWarningSchema, firstError, postBodySchema } from "@/lib/validation";
import { db, type Executor } from "../db";
import {
  bookmarks,
  likes,
  mentions,
  notifications,
  postHashtags,
  postMedia,
  postRevisions,
  posts,
  users,
} from "../db/schema";
import { AppError } from "../errors";
import { deleteBlobs, storePostPhoto, type StoredPhoto } from "../media";
import { notify, unnotify } from "./notify";
import { isBlockedEitherWay } from "./relationships";

export type NewPostInput = {
  body: string;
  contentWarning?: string | null;
  replyToId?: string | null;
  quoteOfId?: string | null;
  media?: Array<{ data: Buffer; alt: string }>;
};

type PostRow = typeof posts.$inferSelect;

/** Load a post that can be interacted with (exists, not deleted/removed, author active). */
async function loadLivePost(postId: string, exec: Executor = db): Promise<PostRow> {
  const [row] = await exec
    .select({ post: posts, suspendedAt: users.suspendedAt })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.id, postId))
    .limit(1);
  if (!row || row.post.deletedAt || row.post.removedAt || row.suspendedAt) {
    throw new AppError("That post isn't available any more.", "not_found");
  }
  return row.post;
}

/** Interactions on a repost row apply to the original. */
async function loadInteractionTarget(postId: string, viewerId: string, exec: Executor = db): Promise<PostRow> {
  let post = await loadLivePost(postId, exec);
  if (post.repostOfId) post = await loadLivePost(post.repostOfId, exec);
  if (await isBlockedEitherWay(viewerId, post.authorId, exec)) {
    throw new AppError("You can't interact with this post.", "forbidden");
  }
  return post;
}

async function indexText(tx: Executor, postId: string, authorId: string, body: string, createdAt: Date) {
  const tags = extractHashtags(body);
  if (tags.length) {
    await tx
      .insert(postHashtags)
      .values(tags.map((tag) => ({ postId, tag, authorId, createdAt })))
      .onConflictDoNothing();
  }
  const names = extractMentions(body);
  if (!names.length) return [] as string[];
  const mentioned = await tx
    .select({ id: users.id })
    .from(users)
    .where(and(inArray(users.username, names), sql`${users.suspendedAt} is null`));
  if (mentioned.length) {
    await tx
      .insert(mentions)
      .values(mentioned.map((u) => ({ postId, userId: u.id })))
      .onConflictDoNothing();
  }
  return mentioned.map((u) => u.id);
}

async function clearTextIndex(tx: Executor, postId: string) {
  await tx.delete(postHashtags).where(eq(postHashtags.postId, postId));
  await tx.delete(mentions).where(eq(mentions.postId, postId));
}

export async function createPost(
  authorId: string,
  input: NewPostInput,
  options: { createdAt?: Date } = {},
): Promise<string> {
  const parsedBody = postBodySchema.safeParse(input.body ?? "");
  if (!parsedBody.success) throw new AppError(firstError(parsedBody.error));
  const parsedCw = contentWarningSchema.safeParse(input.contentWarning ?? "");
  if (!parsedCw.success) throw new AppError(firstError(parsedCw.error));
  const body = parsedBody.data;
  const contentWarning = parsedCw.data;
  const media = input.media ?? [];

  if (media.length > LIMITS.mediaPerPost) throw new AppError(`Up to ${LIMITS.mediaPerPost} photos per post.`);
  if (!body && !media.length) throw new AppError("Write something or add a photo.");
  const alts = media.map((m) => {
    const alt = altTextSchema.safeParse(m.alt ?? "");
    if (!alt.success) throw new AppError(`Alt text is ${LIMITS.altTextChars} characters max.`);
    return alt.data;
  });

  const [author] = await db.select().from(users).where(eq(users.id, authorId));
  if (!author || author.suspendedAt) throw new AppError("Your account can't post right now.", "forbidden");

  let parent: PostRow | null = null;
  if (input.replyToId) {
    parent = await loadLivePost(input.replyToId);
    if (parent.repostOfId) parent = await loadLivePost(parent.repostOfId);
    if (await isBlockedEitherWay(authorId, parent.authorId)) {
      throw new AppError("You can't reply to this post.", "forbidden");
    }
  }
  let quoted: PostRow | null = null;
  if (input.quoteOfId) {
    quoted = await loadLivePost(input.quoteOfId);
    if (quoted.repostOfId) quoted = await loadLivePost(quoted.repostOfId);
    if (await isBlockedEitherWay(authorId, quoted.authorId)) {
      throw new AppError("You can't quote this post.", "forbidden");
    }
  }

  // Images are processed before the transaction (slow, CPU-bound) and
  // cleaned up if the transaction fails.
  const stored: StoredPhoto[] = [];
  try {
    for (const m of media) stored.push(await storePostPhoto(m.data));
  } catch (err) {
    await deleteBlobs(stored.flatMap((s) => [s.storageKey, s.thumbKey]));
    throw err;
  }

  const createdAt = options.createdAt ?? new Date();
  const postId = uuidv7(createdAt.getTime());

  try {
    await db.transaction(async (tx) => {
      await tx.insert(posts).values({
        id: postId,
        authorId,
        body,
        contentWarning,
        replyToId: parent?.id ?? null,
        replyToAuthorId: parent?.authorId ?? null,
        threadRootId: parent ? (parent.threadRootId ?? parent.id) : null,
        quoteOfId: quoted?.id ?? null,
        mediaCount: stored.length,
        createdAt,
      });
      if (stored.length) {
        await tx.insert(postMedia).values(
          stored.map((s, i) => ({
            postId,
            position: i,
            storageKey: s.storageKey,
            thumbKey: s.thumbKey,
            width: s.width,
            height: s.height,
            color: s.color,
            altText: alts[i],
            createdAt,
          })),
        );
      }
      const mentionedIds = await indexText(tx, postId, authorId, body, createdAt);

      await tx.update(users).set({ postCount: sql`${users.postCount} + 1` }).where(eq(users.id, authorId));
      const alreadyNotified = new Set<string>();
      if (parent) {
        await tx.update(posts).set({ replyCount: sql`${posts.replyCount} + 1` }).where(eq(posts.id, parent.id));
        await notify(tx, { recipientId: parent.authorId, actorId: authorId, type: "reply", postId, at: createdAt });
        alreadyNotified.add(parent.authorId);
      }
      if (quoted) {
        await tx.update(posts).set({ quoteCount: sql`${posts.quoteCount} + 1` }).where(eq(posts.id, quoted.id));
        if (!alreadyNotified.has(quoted.authorId)) {
          await notify(tx, { recipientId: quoted.authorId, actorId: authorId, type: "quote", postId, at: createdAt });
          alreadyNotified.add(quoted.authorId);
        }
      }
      for (const userId of mentionedIds) {
        if (alreadyNotified.has(userId)) continue;
        await notify(tx, { recipientId: userId, actorId: authorId, type: "mention", postId, at: createdAt });
      }
    });
  } catch (err) {
    await deleteBlobs(stored.flatMap((s) => [s.storageKey, s.thumbKey]));
    throw err;
  }
  return postId;
}

export async function editPost(
  viewerId: string,
  postId: string,
  input: { body: string; contentWarning?: string | null },
): Promise<void> {
  const post = await loadLivePost(postId);
  if (post.authorId !== viewerId) throw new AppError("You can only edit your own posts.", "forbidden");
  if (post.repostOfId) throw new AppError("Reposts can't be edited.");
  if (!editWindowOpen(post.createdAt)) {
    throw new AppError(`Posts can be edited for ${LIMITS.editWindowMinutes} minutes after posting.`, "forbidden");
  }
  const parsedBody = postBodySchema.safeParse(input.body ?? "");
  if (!parsedBody.success) throw new AppError(firstError(parsedBody.error));
  const parsedCw = contentWarningSchema.safeParse(input.contentWarning ?? "");
  if (!parsedCw.success) throw new AppError(firstError(parsedCw.error));
  const body = parsedBody.data;
  const contentWarning = parsedCw.data;
  if (!body && post.mediaCount === 0) throw new AppError("A post needs some words or a photo.");
  if (body === post.body && contentWarning === post.contentWarning) return;

  await db.transaction(async (tx) => {
    await tx.insert(postRevisions).values({
      postId,
      body: post.body,
      contentWarning: post.contentWarning,
      publishedAt: post.editedAt ?? post.createdAt,
    });
    await tx.update(posts).set({ body, contentWarning, editedAt: new Date() }).where(eq(posts.id, postId));

    const before = new Set(
      (await tx.select({ userId: mentions.userId }).from(mentions).where(eq(mentions.postId, postId))).map((m) => m.userId),
    );
    await clearTextIndex(tx, postId);
    const after = await indexText(tx, postId, viewerId, body, post.createdAt);
    for (const userId of after) {
      if (!before.has(userId) && userId !== post.replyToAuthorId) {
        await notify(tx, { recipientId: userId, actorId: viewerId, type: "mention", postId });
      }
    }
  });
}

/** Previous versions of a post, oldest first. */
export async function getRevisions(postId: string) {
  return db
    .select({ id: postRevisions.id, body: postRevisions.body, contentWarning: postRevisions.contentWarning, publishedAt: postRevisions.publishedAt })
    .from(postRevisions)
    .where(eq(postRevisions.postId, postId))
    .orderBy(asc(postRevisions.id));
}

export async function deletePost(viewerId: string, postId: string): Promise<void> {
  const [post] = await db.select().from(posts).where(eq(posts.id, postId));
  if (!post || post.deletedAt) throw new AppError("That post doesn't exist.", "not_found");
  if (post.authorId !== viewerId) throw new AppError("You can only delete your own posts.", "forbidden");
  if (post.repostOfId) {
    await setRepost(viewerId, post.repostOfId, false);
    return;
  }

  const blobKeys: string[] = [];
  await db.transaction(async (tx) => {
    const media = await tx.delete(postMedia).where(eq(postMedia.postId, postId)).returning();
    for (const m of media) blobKeys.push(m.storageKey, m.thumbKey);

    // Tombstone: the row stays so replies keep their context, the content goes.
    await tx
      .update(posts)
      .set({ deletedAt: new Date(), body: "", contentWarning: null, mediaCount: 0 })
      .where(eq(posts.id, postId));
    await clearTextIndex(tx, postId);
    await tx.delete(postRevisions).where(eq(postRevisions.postId, postId));
    await tx.delete(notifications).where(eq(notifications.postId, postId));
    await tx.delete(bookmarks).where(eq(bookmarks.postId, postId));
    // Reposts of a deleted post have nothing left to show.
    await tx.delete(posts).where(eq(posts.repostOfId, postId));

    await tx.update(users).set({ postCount: sql`greatest(${users.postCount} - 1, 0)` }).where(eq(users.id, viewerId));
    await tx.update(users).set({ pinnedPostId: null }).where(and(eq(users.id, viewerId), eq(users.pinnedPostId, postId)));
    if (post.replyToId) {
      await tx.update(posts).set({ replyCount: sql`greatest(${posts.replyCount} - 1, 0)` }).where(eq(posts.id, post.replyToId));
    }
    if (post.quoteOfId) {
      await tx.update(posts).set({ quoteCount: sql`greatest(${posts.quoteCount} - 1, 0)` }).where(eq(posts.id, post.quoteOfId));
    }
  });
  await deleteBlobs(blobKeys);
}

/** `at` lets importers and the seed script backdate activity; normal callers omit it. */
export async function setLike(viewerId: string, postId: string, liked: boolean, at?: Date): Promise<void> {
  await db.transaction(async (tx) => {
    if (liked) {
      const post = await loadInteractionTarget(postId, viewerId, tx);
      const inserted = await tx
        .insert(likes)
        .values({ userId: viewerId, postId: post.id, ...(at ? { id: uuidv7(at.getTime()), createdAt: at } : {}) })
        .onConflictDoNothing()
        .returning({ id: likes.id });
      if (!inserted.length) return;
      await tx.update(posts).set({ likeCount: sql`${posts.likeCount} + 1` }).where(eq(posts.id, post.id));
      await notify(tx, { recipientId: post.authorId, actorId: viewerId, type: "like", postId: post.id, at });
    } else {
      const [post] = await tx.select().from(posts).where(eq(posts.id, postId));
      if (!post) return;
      const target = post.repostOfId ?? post.id;
      const deleted = await tx
        .delete(likes)
        .where(and(eq(likes.userId, viewerId), eq(likes.postId, target)))
        .returning({ id: likes.id });
      if (!deleted.length) return;
      const [original] = await tx
        .update(posts)
        .set({ likeCount: sql`greatest(${posts.likeCount} - 1, 0)` })
        .where(eq(posts.id, target))
        .returning({ authorId: posts.authorId });
      if (original) await unnotify(tx, { recipientId: original.authorId, actorId: viewerId, type: "like", postId: target });
    }
  });
}

export async function setRepost(viewerId: string, postId: string, reposted: boolean, at?: Date): Promise<void> {
  await db.transaction(async (tx) => {
    if (reposted) {
      const post = await loadInteractionTarget(postId, viewerId, tx);
      const inserted = await tx
        .insert(posts)
        .values({ authorId: viewerId, repostOfId: post.id, ...(at ? { id: uuidv7(at.getTime()), createdAt: at } : {}) })
        .onConflictDoNothing()
        .returning({ id: posts.id });
      if (!inserted.length) return;
      await tx.update(posts).set({ repostCount: sql`${posts.repostCount} + 1` }).where(eq(posts.id, post.id));
      await notify(tx, { recipientId: post.authorId, actorId: viewerId, type: "repost", postId: post.id, at });
    } else {
      const [post] = await tx.select().from(posts).where(eq(posts.id, postId));
      if (!post) return;
      const target = post.repostOfId ?? post.id;
      const deleted = await tx
        .delete(posts)
        .where(and(eq(posts.authorId, viewerId), eq(posts.repostOfId, target)))
        .returning({ id: posts.id });
      if (!deleted.length) return;
      const [original] = await tx
        .update(posts)
        .set({ repostCount: sql`greatest(${posts.repostCount} - 1, 0)` })
        .where(eq(posts.id, target))
        .returning({ authorId: posts.authorId });
      if (original) await unnotify(tx, { recipientId: original.authorId, actorId: viewerId, type: "repost", postId: target });
    }
  });
}

export async function setBookmark(viewerId: string, postId: string, bookmarked: boolean): Promise<void> {
  if (bookmarked) {
    const post = await loadInteractionTarget(postId, viewerId);
    await db.insert(bookmarks).values({ userId: viewerId, postId: post.id }).onConflictDoNothing();
  } else {
    const [post] = await db.select({ id: posts.id, repostOfId: posts.repostOfId }).from(posts).where(eq(posts.id, postId));
    const target = post?.repostOfId ?? postId;
    await db.delete(bookmarks).where(and(eq(bookmarks.userId, viewerId), eq(bookmarks.postId, target)));
  }
}

export async function setPinned(viewerId: string, postId: string, pinned: boolean): Promise<void> {
  if (!pinned) {
    await db.update(users).set({ pinnedPostId: null }).where(and(eq(users.id, viewerId), eq(users.pinnedPostId, postId)));
    return;
  }
  const post = await loadLivePost(postId);
  if (post.authorId !== viewerId || post.repostOfId) throw new AppError("You can only pin your own posts.", "forbidden");
  await db.update(users).set({ pinnedPostId: postId }).where(eq(users.id, viewerId));
}

/** Raw row for owner-only screens (edit form). */
export { editWindowOpen };

export async function getOwnPost(viewerId: string, postId: string): Promise<PostRow> {
  const post = await loadLivePost(postId);
  if (post.authorId !== viewerId) throw new AppError("That isn't your post.", "forbidden");
  return post;
}
