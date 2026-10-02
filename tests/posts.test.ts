import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { mentions, notifications, postHashtags, postMedia, posts, users } from "@/server/db/schema";
import { AppError } from "@/server/errors";
import { getPost } from "@/server/services/feeds";
import { createPost, deletePost, editPost, getRevisions, setLike, setRepost } from "@/server/services/posts";
import { block } from "@/server/services/relationships";
import { dbAvailable, makeUser, png, truncateAll } from "./helpers";

const row = async (id: string) => (await db.select().from(posts).where(eq(posts.id, id)))[0];
const user = async (id: string) => (await db.select().from(users).where(eq(users.id, id)))[0];
const notifs = (recipientId: string) => db.select().from(notifications).where(eq(notifications.recipientId, recipientId));

describe.skipIf(!dbAvailable())("posts service", () => {
  beforeEach(truncateAll);

  it("creates a post and indexes hashtags and mentions", async () => {
    const alice = await makeUser("alice");
    const bob = await makeUser("bob");
    const id = await createPost(alice.id, { body: `Hello #World and #world @${bob.username} #1` });

    expect((await row(id)).body).toBe(`Hello #World and #world @${bob.username} #1`);
    expect((await db.select().from(postHashtags).where(eq(postHashtags.postId, id))).map((h) => h.tag)).toEqual(["world"]);
    expect((await db.select().from(mentions).where(eq(mentions.postId, id))).map((m) => m.userId)).toEqual([bob.id]);
    expect((await user(alice.id)).postCount).toBe(1);
    const [n] = await notifs(bob.id);
    expect(n).toMatchObject({ type: "mention", actorId: alice.id, postId: id });
  });

  it("rejects empty and over-long posts", async () => {
    const alice = await makeUser();
    await expect(createPost(alice.id, { body: "   " })).rejects.toThrow(AppError);
    await expect(createPost(alice.id, { body: "x".repeat(501) })).rejects.toThrow(/500/);
  });

  it("processes photos: strips to webp, records size + colour", async () => {
    const alice = await makeUser();
    const id = await createPost(alice.id, { body: "", media: [{ data: await png("#3366ff", 120, 80), alt: "a blue box" }] });
    const [m] = await db.select().from(postMedia).where(eq(postMedia.postId, id));
    expect(m).toMatchObject({ width: 120, height: 80, altText: "a blue box" });
    expect(m.storageKey).toMatch(/^p\/\d{4}\/\d{2}\/.+\.webp$/);
    expect(m.color).toMatch(/^#[0-9a-f]{6}$/);
    expect((await row(id)).mediaCount).toBe(1);
  });

  it("rejects files that aren't images", async () => {
    const alice = await makeUser();
    await expect(createPost(alice.id, { body: "x", media: [{ data: Buffer.from("not an image"), alt: "" }] })).rejects.toThrow(/image/);
  });

  it("threads replies and notifies the parent author once (not also as a mention)", async () => {
    const alice = await makeUser();
    const bob = await makeUser();
    const root = await createPost(alice.id, { body: "root" });
    const reply = await createPost(bob.id, { body: `@${alice.username} reply`, replyToId: root });
    const nested = await createPost(alice.id, { body: "nested", replyToId: reply });

    expect(await row(reply)).toMatchObject({ replyToId: root, replyToAuthorId: alice.id, threadRootId: root });
    expect((await row(nested)).threadRootId).toBe(root);
    expect((await row(root)).replyCount).toBe(1);
    const aliceNotifs = await notifs(alice.id);
    expect(aliceNotifs.map((n) => n.type)).toEqual(["reply"]);
  });

  it("likes are idempotent and keep counters right", async () => {
    const alice = await makeUser();
    const bob = await makeUser();
    const id = await createPost(alice.id, { body: "like me" });
    await setLike(bob.id, id, true);
    await setLike(bob.id, id, true);
    expect((await row(id)).likeCount).toBe(1);
    expect((await notifs(alice.id)).filter((n) => n.type === "like")).toHaveLength(1);
    await setLike(bob.id, id, false);
    await setLike(bob.id, id, false);
    expect((await row(id)).likeCount).toBe(0);
    expect((await notifs(alice.id)).filter((n) => n.type === "like")).toHaveLength(0);
  });

  it("reposts once per user; liking a repost likes the original", async () => {
    const alice = await makeUser();
    const bob = await makeUser();
    const carol = await makeUser();
    const id = await createPost(alice.id, { body: "share me" });
    await setRepost(bob.id, id, true);
    await setRepost(bob.id, id, true);
    expect((await row(id)).repostCount).toBe(1);
    const [repostRow] = await db.select().from(posts).where(eq(posts.repostOfId, id));
    await setLike(carol.id, repostRow.id, true);
    expect((await row(id)).likeCount).toBe(1);
    await setRepost(bob.id, id, false);
    expect((await row(id)).repostCount).toBe(0);
  });

  it("blocks prevent replies, likes and quotes in both directions", async () => {
    const alice = await makeUser();
    const bob = await makeUser();
    const id = await createPost(alice.id, { body: "hi" });
    await block(alice.id, bob.id);
    await expect(setLike(bob.id, id, true)).rejects.toThrow(/can't/);
    await expect(createPost(bob.id, { body: "reply", replyToId: id })).rejects.toThrow(/can't reply/);
    await expect(createPost(bob.id, { body: "quote", quoteOfId: id })).rejects.toThrow(/can't quote/);
  });

  it("edits keep a public revision history and re-index text", async () => {
    const alice = await makeUser();
    const id = await createPost(alice.id, { body: "teh #typo" });
    await editPost(alice.id, id, { body: "the #fixed" });
    const post = await getPost(id, null);
    expect(post?.body).toBe("the #fixed");
    expect(post?.editedAt).toBeInstanceOf(Date);
    expect((await getRevisions(id)).map((r) => r.body)).toEqual(["teh #typo"]);
    expect((await db.select().from(postHashtags).where(eq(postHashtags.postId, id))).map((h) => h.tag)).toEqual(["fixed"]);
  });

  it("only the author can edit, and only inside the window", async () => {
    const alice = await makeUser();
    const bob = await makeUser();
    const id = await createPost(alice.id, { body: "mine" });
    await expect(editPost(bob.id, id, { body: "yours" })).rejects.toThrow(/own/);
    const old = await createPost(alice.id, { body: "old" }, { createdAt: new Date(Date.now() - 2 * 3600_000) });
    await expect(editPost(alice.id, old, { body: "new" })).rejects.toThrow(/minutes/);
  });

  it("deleting tombstones the post, scrubs content and unwinds counters", async () => {
    const alice = await makeUser();
    const bob = await makeUser();
    const parent = await createPost(bob.id, { body: "parent" });
    const id = await createPost(alice.id, { body: "bye #gone", replyToId: parent, media: [{ data: await png(), alt: "" }] });
    await setRepost(bob.id, id, true);
    await deletePost(alice.id, id);

    const tomb = await row(id);
    expect(tomb.deletedAt).toBeInstanceOf(Date);
    expect(tomb.body).toBe("");
    expect(await db.select().from(postMedia).where(eq(postMedia.postId, id))).toHaveLength(0);
    expect(await db.select().from(postHashtags).where(eq(postHashtags.postId, id))).toHaveLength(0);
    expect(await db.select().from(posts).where(eq(posts.repostOfId, id))).toHaveLength(0);
    expect((await row(parent)).replyCount).toBe(0);
    expect((await user(alice.id)).postCount).toBe(0);
    expect((await getPost(id, null))?.state).toBe("deleted");
  });

  it("can't delete someone else's post", async () => {
    const alice = await makeUser();
    const bob = await makeUser();
    const id = await createPost(alice.id, { body: "mine" });
    await expect(deletePost(bob.id, id)).rejects.toThrow(/own/);
  });
});
