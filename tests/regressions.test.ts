/** Concurrency and visibility edge cases found in review. Each test pins one fix. */
import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { lists, posts, users } from "@/server/db/schema";
import { resetTrendCache, trendingHashtags } from "@/server/services/discovery";
import { addListMember, createList } from "@/server/services/lists";
import { removePost, suspendUser, unsuspendUser } from "@/server/services/moderation";
import { unreadCount } from "@/server/services/notifications";
import { createPost, deletePost, editPost, getRevisions, setLike } from "@/server/services/posts";
import { block, follow, mute } from "@/server/services/relationships";
import { deleteAccount } from "@/server/services/users";
import { dbAvailable, makeUser, truncateAll } from "./helpers";

async function withRole(role: "moderator" | "admin") {
  const u = await makeUser(role.slice(0, 5));
  await db.update(users).set({ role }).where(eq(users.id, u.id));
  return u;
}

describe.skipIf(!dbAvailable())("regressions", () => {
  beforeEach(truncateAll);

  it("concurrent deletes of the same post only decrement counters once", async () => {
    const a = await makeUser();
    const parent = await createPost(a.id, { body: "parent" });
    const reply = await createPost(a.id, { body: "reply", replyToId: parent });
    await Promise.all([deletePost(a.id, reply), deletePost(a.id, reply), deletePost(a.id, reply)].map((p) => p.catch(() => {})));
    const [author] = await db.select().from(users).where(eq(users.id, a.id));
    expect(author.postCount).toBe(1);
  });

  it("concurrent edits each keep the version they replaced", async () => {
    const a = await makeUser();
    const id = await createPost(a.id, { body: "v1" });
    await Promise.all([editPost(a.id, id, { body: "v2" }), editPost(a.id, id, { body: "v3" })]);
    const revisions = (await getRevisions(id)).map((r) => r.body);
    expect(revisions).toHaveLength(2);
    expect(revisions[0]).toBe("v1");
  });

  it("concurrent list adds keep member_count exact", async () => {
    const owner = await makeUser();
    const members = await Promise.all(Array.from({ length: 8 }, () => makeUser("m")));
    const listId = await createList(owner.id, { name: "busy", description: "", isPrivate: false });
    await Promise.all(members.map((m) => addListMember(owner.id, listId, m.username)));
    const [list] = await db.select().from(lists).where(eq(lists.id, listId));
    expect(list.memberCount).toBe(8);
  });

  it("you can't add someone to a list across a block", async () => {
    const owner = await makeUser();
    const other = await makeUser();
    const listId = await createList(owner.id, { name: "l", description: "", isPrivate: false });
    await block(other.id, owner.id);
    await expect(addListMember(owner.id, listId, other.username)).rejects.toThrow(/can't add/);
  });

  it("deleting an account updates member counts of lists it was on", async () => {
    const owner = await makeUser();
    const leaver = await makeUser();
    const listId = await createList(owner.id, { name: "l", description: "", isPrivate: false });
    await addListMember(owner.id, listId, leaver.username);
    await deleteAccount(leaver.id, leaver.username, "a-strong-password");
    const [list] = await db.select().from(lists).where(eq(lists.id, listId));
    expect(list.memberCount).toBe(0);
  });

  it("the unread badge ignores notifications the tab won't show", async () => {
    const me = await makeUser();
    const muted = await makeUser();
    const blocked = await makeUser();
    const id = await createPost(me.id, { body: "hi" });
    await setLike(muted.id, id, true);
    await setLike(blocked.id, id, true);
    expect(await unreadCount(me.id)).toBe(2);
    await mute(me.id, muted.id);
    await block(me.id, blocked.id);
    expect(await unreadCount(me.id)).toBe(0);
  });

  it("only an admin can lift a moderator's suspension", async () => {
    const admin = await withRole("admin");
    const mod1 = await withRole("moderator");
    const mod2 = await withRole("moderator");
    await suspendUser(admin.id, mod1.id, "spam", "");
    await expect(unsuspendUser(mod2.id, mod1.id, "")).rejects.toThrow(/admin/);
    await unsuspendUser(admin.id, mod1.id, "");
  });

  it("removed posts and suspended authors don't trend", async () => {
    const mod = await withRole("moderator");
    const a = await makeUser();
    const b = await makeUser();
    const bad = await createPost(a.id, { body: "#badtag" });
    await createPost(b.id, { body: "#goodtag" });
    await removePost(mod.id, bad, "spam", "");
    resetTrendCache();
    const tags = (await trendingHashtags(10)).map((t) => t.tag);
    expect(tags).toContain("goodtag");
    expect(tags).not.toContain("badtag");
  });

  it("blocking/muting a nonexistent account is a clean not-found error", async () => {
    const a = await makeUser();
    const ghost = "01900000-0000-7000-8000-000000000000";
    await expect(block(a.id, ghost)).rejects.toThrow(/doesn't exist/);
    await expect(mute(a.id, ghost)).rejects.toThrow(/doesn't exist/);
  });

  it("a follow racing a block never survives the block", async () => {
    const a = await makeUser();
    const b = await makeUser();
    await Promise.all([follow(a.id, b.id).catch(() => {}), block(b.id, a.id)]);
    const [ua] = await db.select().from(users).where(eq(users.id, a.id));
    const [ub] = await db.select().from(users).where(eq(users.id, b.id));
    expect(ua.followingCount).toBe(0);
    expect(ub.followerCount).toBe(0);
    expect(await db.select().from(posts)).toHaveLength(0);
  });
});
