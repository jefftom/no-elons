import { beforeEach, describe, expect, it } from "vitest";
import { createPost, setRepost } from "@/server/services/posts";
import { everyoneFeed, getThread, hashtagFeed, homeFeed, photosFeed, profileFeed, searchPosts } from "@/server/services/feeds";
import { block, follow, mute } from "@/server/services/relationships";
import { dbAvailable, makeUser, png, truncateAll } from "./helpers";

const bodies = (page: { items: { post: { body: string } }[] }) => page.items.map((i) => i.post.body);
const hoursAgo = (h: number) => ({ createdAt: new Date(Date.now() - h * 3600_000) });

describe.skipIf(!dbAvailable())("feeds", () => {
  beforeEach(truncateAll);

  it("home is you + people you follow, strictly newest first", async () => {
    const me = await makeUser();
    const friend = await makeUser();
    const stranger = await makeUser();
    await follow(me.id, friend.id);
    await createPost(friend.id, { body: "friend old" }, hoursAgo(3));
    await createPost(stranger.id, { body: "stranger" }, hoursAgo(2));
    await createPost(me.id, { body: "mine" }, hoursAgo(1));
    await createPost(friend.id, { body: "friend new" });
    expect(bodies(await homeFeed(me.id, null))).toEqual(["friend new", "mine", "friend old"]);
  });

  it("applies the old-Twitter reply rule", async () => {
    const me = await makeUser();
    const friend = await makeUser();
    const stranger = await makeUser();
    await follow(me.id, friend.id);
    const strangerPost = await createPost(stranger.id, { body: "stranger post" });
    const friendPost = await createPost(friend.id, { body: "friend post" });
    await createPost(friend.id, { body: "friend → stranger", replyToId: strangerPost });
    await createPost(friend.id, { body: "friend → self", replyToId: friendPost });
    const home = bodies(await homeFeed(me.id, null));
    expect(home).toContain("friend → self");
    expect(home).not.toContain("friend → stranger");
  });

  it("shows reposts from people you follow, once", async () => {
    const me = await makeUser();
    const a = await makeUser();
    const b = await makeUser();
    const author = await makeUser();
    await follow(me.id, a.id);
    await follow(me.id, b.id);
    const id = await createPost(author.id, { body: "viral" });
    await setRepost(a.id, id, true);
    await setRepost(b.id, id, true);
    const page = await homeFeed(me.id, null);
    expect(bodies(page)).toEqual(["viral"]);
    expect(page.items[0].repostedBy?.id).toBe(b.id);
  });

  it("paginates with cursors and no duplicates", async () => {
    const me = await makeUser();
    for (let i = 0; i < 7; i++) await createPost(me.id, { body: `p${i}` }, hoursAgo(7 - i));
    const first = await homeFeed(me.id, null, 3);
    const second = await homeFeed(me.id, first.nextCursor, 3);
    const third = await homeFeed(me.id, second.nextCursor, 3);
    expect([...bodies(first), ...bodies(second), ...bodies(third)]).toEqual(["p6", "p5", "p4", "p3", "p2", "p1", "p0"]);
    expect(third.nextCursor).toBeNull();
  });

  it("blocks hide content both ways; mutes hide it one way", async () => {
    const me = await makeUser();
    const blocked = await makeUser();
    const muted = await makeUser();
    await createPost(blocked.id, { body: "from blocked" });
    await createPost(muted.id, { body: "from muted" });
    await createPost(me.id, { body: "from me" });
    await block(me.id, blocked.id);
    await mute(me.id, muted.id);
    expect(bodies(await everyoneFeed(me.id, null))).toEqual(["from me"]);
    expect(bodies(await everyoneFeed(blocked.id, null))).not.toContain("from me");
    expect(bodies(await everyoneFeed(muted.id, null))).toContain("from me");
  });

  it("everyone excludes replies and reposts; photos only has photo posts", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const root = await createPost(a.id, { body: "root" });
    await createPost(b.id, { body: "reply", replyToId: root });
    await setRepost(b.id, root, true);
    await createPost(a.id, { body: "pic", media: [{ data: await png(), alt: "" }] });
    expect(bodies(await everyoneFeed(null, null))).toEqual(["pic", "root"]);
    expect((await photosFeed(null, "everyone", null)).posts.map((p) => p.body)).toEqual(["pic"]);
  });

  it("profile tabs: posts (with reposts) vs replies", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const other = await createPost(b.id, { body: "other" }, hoursAgo(3));
    await createPost(a.id, { body: "top" }, hoursAgo(2));
    await createPost(a.id, { body: "a reply", replyToId: other }, hoursAgo(1));
    await setRepost(a.id, other, true);
    expect(bodies(await profileFeed(a.id, null, "posts", null))).toEqual(["other", "top"]);
    expect(bodies(await profileFeed(a.id, null, "replies", null))).toEqual(["a reply", "top"]);
  });

  it("finds posts by hashtag and full-text search", async () => {
    const a = await makeUser();
    await createPost(a.id, { body: "The 14 bus is frequent now #Transit" });
    await createPost(a.id, { body: "sourdough day" });
    expect(bodies(await hashtagFeed("transit", null, null))).toHaveLength(1);
    expect(bodies(await searchPosts("bus frequent", null, null))).toHaveLength(1);
    expect(bodies(await searchPosts("-sourdough day", null, null))).toHaveLength(0);
  });

  it("builds threads: ancestors, the author's self-thread, then other replies", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const root = await createPost(a.id, { body: "root" }, hoursAgo(5));
    const focus = await createPost(a.id, { body: "focus", replyToId: root }, hoursAgo(4));
    const self1 = await createPost(a.id, { body: "self 1", replyToId: focus }, hoursAgo(3));
    await createPost(a.id, { body: "self 2", replyToId: self1 }, hoursAgo(2));
    await createPost(b.id, { body: "other reply", replyToId: focus }, hoursAgo(1));
    const thread = await getThread(focus, null);
    expect(thread?.ancestors.map((p) => p.body)).toEqual(["root"]);
    expect(thread?.post.body).toBe("focus");
    expect(thread?.selfThread.map((p) => p.body)).toEqual(["self 1", "self 2"]);
    expect(thread!.replies.map((i) => i.post.body)).toEqual(["other reply"]);
  });
});
