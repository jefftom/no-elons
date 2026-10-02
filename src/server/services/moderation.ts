/**
 * Moderation with receipts.
 *
 * Members report posts or accounts against a specific rule. Moderators act
 * from a queue. Every action is written to `moderation_actions`, which is
 * rendered publicly at /transparency — that log *is* the product promise
 * "no owner override" made concrete.
 */
import { and, count, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { RULE_CODES } from "@/lib/rules";
import { firstError, reportSchema } from "@/lib/validation";
import { db } from "../db";
import { moderationActions, posts, reports, sessions, users } from "../db/schema";
import { AppError } from "../errors";
import { toUserSummary, type PostView, type UserSummary } from "../views";
import { hydratePosts } from "./hydration";

function isModerator(role: string) {
  return role === "moderator" || role === "admin";
}

async function requireModeratorRow(moderatorId: string) {
  const [mod] = await db.select().from(users).where(eq(users.id, moderatorId));
  if (!mod || !isModerator(mod.role) || mod.suspendedAt) throw new AppError("Moderators only.", "forbidden");
  return mod;
}

export async function reportContent(
  reporterId: string,
  target: { postId?: string | null; userId?: string | null },
  input: { rule: string; details: string },
): Promise<void> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) throw new AppError(firstError(parsed.error));

  let subjectUserId = target.userId ?? null;
  let postId: string | null = null;
  if (target.postId) {
    const [post] = await db.select({ id: posts.id, authorId: posts.authorId, repostOfId: posts.repostOfId }).from(posts).where(eq(posts.id, target.postId));
    if (!post) throw new AppError("That post doesn't exist.", "not_found");
    if (post.repostOfId) {
      const [original] = await db.select({ id: posts.id, authorId: posts.authorId }).from(posts).where(eq(posts.id, post.repostOfId));
      if (!original) throw new AppError("That post doesn't exist.", "not_found");
      postId = original.id;
      subjectUserId = original.authorId;
    } else {
      postId = post.id;
      subjectUserId = post.authorId;
    }
  }
  if (!subjectUserId) throw new AppError("Nothing to report.");
  if (subjectUserId === reporterId) throw new AppError("You can't report yourself.");

  await db.insert(reports).values({
    reporterId,
    postId,
    subjectUserId,
    rule: parsed.data.rule,
    details: parsed.data.details,
  });
}

export type ReportView = {
  id: string;
  rule: string;
  details: string;
  createdAt: Date;
  reporter: UserSummary | null;
  subject: UserSummary & { suspended: boolean };
  post: PostView | null;
  /** How many open reports exist for the same target (dupes are grouped in the UI). */
  sameTargetCount: number;
};

export async function openReports(moderatorId: string, cursor: string | null, limit = 30): Promise<{ items: ReportView[]; nextCursor: string | null }> {
  await requireModeratorRow(moderatorId);
  const rows = await db
    .select()
    .from(reports)
    .where(and(eq(reports.status, "open"), cursor ? lt(reports.id, cursor) : undefined))
    .orderBy(desc(reports.id))
    .limit(limit + 1);
  const slice = rows.slice(0, limit);
  const userIds = [...new Set(slice.flatMap((r) => [r.subjectUserId, r.reporterId]).filter((x): x is string => !!x))];
  const people = userIds.length ? await db.select().from(users).where(inArray(users.id, userIds)) : [];
  const byId = new Map(people.map((u) => [u.id, u]));
  // Moderators see reported content even if they've blocked the author or it's already removed.
  const views = await hydratePosts(
    slice.map((r) => r.postId).filter((x): x is string => !!x),
    moderatorId,
    { hidden: new Set(), reveal: true },
  );
  const counts = await db
    .select({ subject: reports.subjectUserId, postId: reports.postId, n: count() })
    .from(reports)
    .where(eq(reports.status, "open"))
    .groupBy(reports.subjectUserId, reports.postId);
  const countFor = (r: (typeof slice)[number]) =>
    counts.find((c) => c.subject === r.subjectUserId && c.postId === r.postId)?.n ?? 1;

  const items: ReportView[] = [];
  for (const r of slice) {
    const subject = byId.get(r.subjectUserId);
    if (!subject) continue;
    const reporter = r.reporterId ? byId.get(r.reporterId) : null;
    items.push({
      id: r.id,
      rule: r.rule,
      details: r.details,
      createdAt: r.createdAt,
      reporter: reporter ? toUserSummary(reporter) : null,
      subject: { ...toUserSummary(subject), suspended: !!subject.suspendedAt },
      post: r.postId ? (views.get(r.postId) ?? null) : null,
      sameTargetCount: countFor(r),
    });
  }
  return { items, nextCursor: rows.length > limit ? slice[slice.length - 1].id : null };
}

export async function openReportCount(): Promise<number> {
  const [row] = await db.select({ n: count() }).from(reports).where(eq(reports.status, "open"));
  return row?.n ?? 0;
}

function assertRule(rule: string) {
  if (!(RULE_CODES as readonly string[]).includes(rule)) throw new AppError("Pick the rule that was broken.");
}

export async function removePost(moderatorId: string, postId: string, rule: string, publicNote: string): Promise<void> {
  await requireModeratorRow(moderatorId);
  assertRule(rule);
  await db.transaction(async (tx) => {
    const [post] = await tx
      .update(posts)
      .set({ removedAt: new Date(), removalRule: rule })
      .where(and(eq(posts.id, postId), sql`${posts.removedAt} is null`))
      .returning();
    if (!post) throw new AppError("That post is already removed or doesn't exist.", "conflict");
    const [author] = await tx.select({ username: users.username }).from(users).where(eq(users.id, post.authorId));
    await tx
      .update(reports)
      .set({ status: "actioned", resolvedAt: new Date(), resolvedById: moderatorId })
      .where(and(eq(reports.postId, postId), eq(reports.status, "open")));
    await tx.insert(moderationActions).values({
      moderatorId,
      action: "remove_post",
      postId,
      subjectUserId: post.authorId,
      subjectUsername: author?.username ?? "unknown",
      rule,
      publicNote: publicNote.trim().slice(0, 500),
    });
  });
}

export async function restorePost(moderatorId: string, postId: string, publicNote: string): Promise<void> {
  await requireModeratorRow(moderatorId);
  await db.transaction(async (tx) => {
    const [post] = await tx
      .update(posts)
      .set({ removedAt: null, removalRule: null })
      .where(and(eq(posts.id, postId), sql`${posts.removedAt} is not null`))
      .returning();
    if (!post) throw new AppError("That post isn't removed.", "conflict");
    const [author] = await tx.select({ username: users.username }).from(users).where(eq(users.id, post.authorId));
    await tx.insert(moderationActions).values({
      moderatorId,
      action: "restore_post",
      postId,
      subjectUserId: post.authorId,
      subjectUsername: author?.username ?? "unknown",
      publicNote: publicNote.trim().slice(0, 500),
    });
  });
}

export async function suspendUser(moderatorId: string, userId: string, rule: string, publicNote: string): Promise<void> {
  const mod = await requireModeratorRow(moderatorId);
  assertRule(rule);
  if (userId === moderatorId) throw new AppError("You can't suspend yourself.");
  await db.transaction(async (tx) => {
    const [target] = await tx.select().from(users).where(eq(users.id, userId));
    if (!target) throw new AppError("Account not found.", "not_found");
    if (target.role === "admin" || (target.role === "moderator" && mod.role !== "admin")) {
      throw new AppError("Only an admin can suspend a moderator, and nobody can suspend an admin from here.", "forbidden");
    }
    if (target.suspendedAt) throw new AppError("Already suspended.", "conflict");
    await tx.update(users).set({ suspendedAt: new Date() }).where(eq(users.id, userId));
    await tx.delete(sessions).where(eq(sessions.userId, userId));
    await tx
      .update(reports)
      .set({ status: "actioned", resolvedAt: new Date(), resolvedById: moderatorId })
      .where(and(eq(reports.subjectUserId, userId), eq(reports.status, "open")));
    await tx.insert(moderationActions).values({
      moderatorId,
      action: "suspend_user",
      subjectUserId: userId,
      subjectUsername: target.username,
      rule,
      publicNote: publicNote.trim().slice(0, 500),
    });
  });
}

export async function unsuspendUser(moderatorId: string, userId: string, publicNote: string): Promise<void> {
  await requireModeratorRow(moderatorId);
  await db.transaction(async (tx) => {
    const [target] = await tx
      .update(users)
      .set({ suspendedAt: null })
      .where(and(eq(users.id, userId), sql`${users.suspendedAt} is not null`))
      .returning();
    if (!target) throw new AppError("That account isn't suspended.", "conflict");
    await tx.insert(moderationActions).values({
      moderatorId,
      action: "unsuspend_user",
      subjectUserId: userId,
      subjectUsername: target.username,
      publicNote: publicNote.trim().slice(0, 500),
    });
  });
}

/** Dismissals are logged too, but without naming anyone — nobody was found to have broken a rule. */
export async function dismissReport(moderatorId: string, reportId: string): Promise<void> {
  await requireModeratorRow(moderatorId);
  await db.transaction(async (tx) => {
    const [report] = await tx
      .update(reports)
      .set({ status: "dismissed", resolvedAt: new Date(), resolvedById: moderatorId })
      .where(and(eq(reports.id, reportId), eq(reports.status, "open")))
      .returning();
    if (!report) throw new AppError("That report was already handled.", "conflict");
    await tx.insert(moderationActions).values({
      moderatorId,
      action: "dismiss_report",
      subjectUsername: "",
      rule: report.rule,
    });
  });
}

export type ModerationLogEntry = {
  id: string;
  action: (typeof moderationActions.$inferSelect)["action"];
  subjectUsername: string;
  postId: string | null;
  rule: string | null;
  publicNote: string;
  createdAt: Date;
};

/** The public log. Moderator identities are deliberately omitted. */
export async function transparencyLog(cursor: string | null, limit = 50): Promise<{ items: ModerationLogEntry[]; nextCursor: string | null }> {
  const rows = await db
    .select({
      id: moderationActions.id,
      action: moderationActions.action,
      subjectUsername: moderationActions.subjectUsername,
      postId: moderationActions.postId,
      rule: moderationActions.rule,
      publicNote: moderationActions.publicNote,
      createdAt: moderationActions.createdAt,
    })
    .from(moderationActions)
    .where(cursor ? lt(moderationActions.id, cursor) : undefined)
    .orderBy(desc(moderationActions.id))
    .limit(limit + 1);
  const slice = rows.slice(0, limit);
  return { items: slice, nextCursor: rows.length > limit ? slice[slice.length - 1].id : null };
}

export async function transparencyStats(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [byAction, byRule, reportsIn] = await Promise.all([
    db
      .select({ action: moderationActions.action, n: count() })
      .from(moderationActions)
      .where(gte(moderationActions.createdAt, since))
      .groupBy(moderationActions.action),
    db
      .select({ rule: moderationActions.rule, n: count() })
      .from(moderationActions)
      .where(and(gte(moderationActions.createdAt, since), inArray(moderationActions.action, ["remove_post", "suspend_user"])))
      .groupBy(moderationActions.rule)
      .orderBy(desc(count())),
    db.select({ n: count() }).from(reports).where(gte(reports.createdAt, since)),
  ]);
  return {
    days,
    reportsReceived: reportsIn[0]?.n ?? 0,
    byAction: Object.fromEntries(byAction.map((r) => [r.action, r.n])) as Record<string, number>,
    byRule: byRule.map((r) => ({ rule: r.rule ?? "other", n: r.n })),
  };
}
