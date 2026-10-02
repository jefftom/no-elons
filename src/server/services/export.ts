/**
 * "Your data leaves with you." A complete, documented JSON export of
 * everything a member has created. Format version lets importers (including
 * a future ActivityPub migration tool) evolve safely.
 */
import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { blocks, bookmarks, follows, likes, listMembers, lists, mutes, postMedia, postRevisions, posts, users } from "../db/schema";
import { mediaUrl } from "../storage";

export async function exportUserData(userId: string, origin: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return null;
  const abs = (key: string | null) => {
    const url = mediaUrl(key);
    return url ? new URL(url, origin).toString() : null;
  };

  const myPosts = await db.select().from(posts).where(eq(posts.authorId, userId)).orderBy(asc(posts.id));
  const live = myPosts.filter((p) => !p.deletedAt);
  const postIds = live.map((p) => p.id);
  const [media, revisions, myLikes, myBookmarks, following, followers, myBlocks, myMutes, myLists] = await Promise.all([
    postIds.length ? db.select().from(postMedia).where(inArray(postMedia.postId, postIds)).orderBy(asc(postMedia.position)) : [],
    postIds.length ? db.select().from(postRevisions).where(inArray(postRevisions.postId, postIds)).orderBy(asc(postRevisions.id)) : [],
    db.select({ postId: likes.postId, at: likes.createdAt }).from(likes).where(eq(likes.userId, userId)).orderBy(desc(likes.id)),
    db.select({ postId: bookmarks.postId, at: bookmarks.createdAt }).from(bookmarks).where(eq(bookmarks.userId, userId)).orderBy(desc(bookmarks.id)),
    db.select({ username: users.username, at: follows.createdAt }).from(follows).innerJoin(users, eq(users.id, follows.followeeId)).where(eq(follows.followerId, userId)),
    db.select({ username: users.username, at: follows.createdAt }).from(follows).innerJoin(users, eq(users.id, follows.followerId)).where(eq(follows.followeeId, userId)),
    db.select({ username: users.username }).from(blocks).innerJoin(users, eq(users.id, blocks.blockedId)).where(eq(blocks.blockerId, userId)),
    db.select({ username: users.username }).from(mutes).innerJoin(users, eq(users.id, mutes.mutedId)).where(eq(mutes.muterId, userId)),
    db.select().from(lists).where(eq(lists.ownerId, userId)),
  ]);
  const listIds = myLists.map((l) => l.id);
  const members = listIds.length
    ? await db.select({ listId: listMembers.listId, username: users.username }).from(listMembers).innerJoin(users, eq(users.id, listMembers.userId)).where(inArray(listMembers.listId, listIds))
    : [];

  return {
    format: "noelons-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      bio: user.bio,
      location: user.location,
      website: user.website,
      avatar: abs(user.avatarKey),
      banner: abs(user.bannerKey),
      createdAt: user.createdAt.toISOString(),
    },
    posts: live.map((p) => ({
      id: p.id,
      url: new URL(`/p/${p.id}`, origin).toString(),
      type: p.repostOfId ? "repost" : p.replyToId ? "reply" : p.quoteOfId ? "quote" : "post",
      body: p.body,
      contentWarning: p.contentWarning,
      replyTo: p.replyToId,
      quoteOf: p.quoteOfId,
      repostOf: p.repostOfId,
      createdAt: p.createdAt.toISOString(),
      editedAt: p.editedAt?.toISOString() ?? null,
      removedByModerators: p.removedAt ? { at: p.removedAt.toISOString(), rule: p.removalRule } : null,
      media: media.filter((m) => m.postId === p.id).map((m) => ({ url: abs(m.storageKey), alt: m.altText, width: m.width, height: m.height })),
      previousVersions: revisions.filter((r) => r.postId === p.id).map((r) => ({ body: r.body, contentWarning: r.contentWarning, publishedAt: r.publishedAt.toISOString() })),
    })),
    likes: myLikes.map((l) => ({ postId: l.postId, at: l.at.toISOString() })),
    bookmarks: myBookmarks.map((b) => ({ postId: b.postId, at: b.at.toISOString() })),
    following: following.map((f) => ({ username: f.username, since: f.at.toISOString() })),
    followers: followers.map((f) => ({ username: f.username, since: f.at.toISOString() })),
    blocks: myBlocks.map((b) => b.username),
    mutes: myMutes.map((m) => m.username),
    lists: myLists.map((l) => ({
      name: l.name,
      description: l.description,
      private: l.isPrivate,
      members: members.filter((m) => m.listId === l.id).map((m) => m.username),
    })),
  };
}
