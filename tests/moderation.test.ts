import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { sessions, users } from "@/server/db/schema";
import { createSession, generateSessionToken, validateSessionToken } from "@/server/auth/session";
import { everyoneFeed, getPost } from "@/server/services/feeds";
import {
  dismissReport,
  openReports,
  removePost,
  reportContent,
  restorePost,
  suspendUser,
  transparencyLog,
} from "@/server/services/moderation";
import { createPost } from "@/server/services/posts";
import { authenticate, deleteAccount } from "@/server/services/users";
import { follow } from "@/server/services/relationships";
import { dbAvailable, makeUser, truncateAll } from "./helpers";

async function makeMod() {
  const mod = await makeUser("mod");
  await db.update(users).set({ role: "moderator" }).where(eq(users.id, mod.id));
  return mod;
}

describe.skipIf(!dbAvailable())("moderation", () => {
  beforeEach(truncateAll);

  it("report → queue → removal → public log", async () => {
    const mod = await makeMod();
    const author = await makeUser();
    const reporter = await makeUser();
    const id = await createPost(author.id, { body: "scam https://example.com" });
    await reportContent(reporter.id, { postId: id }, { rule: "spam", details: "obvious scam" });

    const queue = await openReports(mod.id, null);
    expect(queue.items).toHaveLength(1);
    expect(queue.items[0]).toMatchObject({ rule: "spam", subject: { id: author.id } });

    await removePost(mod.id, id, "spam", "Scam link.");
    expect((await openReports(mod.id, null)).items).toHaveLength(0);
    expect((await getPost(id, null))?.state).toBe("removed");
    expect((await everyoneFeed(null, null)).items).toHaveLength(0);

    const log = await transparencyLog(null);
    expect(log.items[0]).toMatchObject({ action: "remove_post", subjectUsername: author.username, rule: "spam", publicNote: "Scam link." });
    // The public log never exposes who the moderator was.
    expect(Object.keys(log.items[0])).not.toContain("moderatorId");

    await restorePost(mod.id, id, "Appeal upheld.");
    expect((await getPost(id, null))?.state).toBe("ok");
  });

  it("only moderators can moderate", async () => {
    const regular = await makeUser();
    const author = await makeUser();
    const id = await createPost(author.id, { body: "hi" });
    await expect(removePost(regular.id, id, "spam", "")).rejects.toThrow(/Moderators only/);
    await expect(openReports(regular.id, null)).rejects.toThrow(/Moderators only/);
  });

  it("suspension hides content, kills sessions and blocks login", async () => {
    const mod = await makeMod();
    const bad = await makeUser();
    await createPost(bad.id, { body: "spam spam spam" });
    const token = generateSessionToken();
    await createSession(token, bad.id);

    await suspendUser(mod.id, bad.id, "spam", "Bot.");
    expect(await db.select().from(sessions).where(eq(sessions.userId, bad.id))).toHaveLength(0);
    expect(await validateSessionToken(token)).toBeNull();
    expect((await everyoneFeed(null, null)).items).toHaveLength(0);
    await expect(authenticate(bad.username, "a-strong-password")).rejects.toThrow(/suspended/);
  });

  it("dismissals are logged without naming anyone", async () => {
    const mod = await makeMod();
    const a = await makeUser();
    const b = await makeUser();
    const id = await createPost(a.id, { body: "fine" });
    await reportContent(b.id, { postId: id }, { rule: "harassment", details: "" });
    const [report] = (await openReports(mod.id, null)).items;
    await dismissReport(mod.id, report.id);
    const [entry] = (await transparencyLog(null)).items;
    expect(entry).toMatchObject({ action: "dismiss_report", subjectUsername: "" });
  });

  it("rejects reports against unknown rules and self-reports", async () => {
    const a = await makeUser();
    const id = await createPost(a.id, { body: "x" });
    await expect(reportContent(a.id, { postId: id }, { rule: "spam", details: "" })).rejects.toThrow(/yourself/);
    const b = await makeUser();
    await expect(reportContent(b.id, { postId: id }, { rule: "vibes", details: "" })).rejects.toThrow();
  });
});

describe.skipIf(!dbAvailable())("accounts", () => {
  beforeEach(truncateAll);

  it("authenticates by username or email, case-insensitively", async () => {
    const a = await makeUser("Casey");
    expect((await authenticate(a.username.toUpperCase(), "a-strong-password"))?.id).toBe(a.id);
    expect((await authenticate(a.email, "a-strong-password"))?.id).toBe(a.id);
    expect(await authenticate(a.username, "wrong-password")).toBeNull();
    expect(await authenticate("nobody_here", "whatever")).toBeNull();
  });

  it("deleting an account fixes everyone else's counters", async () => {
    const leaver = await makeUser();
    const friend = await makeUser();
    await follow(leaver.id, friend.id);
    await follow(friend.id, leaver.id);
    await deleteAccount(leaver.id, leaver.username, "a-strong-password");
    const [f] = await db.select().from(users).where(eq(users.id, friend.id));
    expect(f).toMatchObject({ followerCount: 0, followingCount: 0 });
  });
});
