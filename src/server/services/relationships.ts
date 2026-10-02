/**
 * The social graph: follows, blocks, mutes.
 *
 * Blocks are symmetric for visibility (neither side sees the other) and
 * break any follow in both directions. Mutes are one-way and silent.
 */
import { and, desc, eq, inArray, lt, notInArray, or, sql } from "drizzle-orm";
import { uuidv7 } from "@/lib/ids";
import { db, type Executor } from "../db";
import { blocks, follows, mutes, notifications, users } from "../db/schema";
import { AppError } from "../errors";
import { toUserSummary, type Relationship, type UserSummary } from "../views";
import { notify } from "./notify";

/** Authors whose content the viewer should never see: blocked either way, or muted. */
export async function hiddenAuthorIds(viewerId: string | null, exec: Executor = db): Promise<Set<string>> {
  if (!viewerId) return new Set();
  const rows = await exec.execute<{ id: string }>(sql`
    select blocked_id as id from blocks where blocker_id = ${viewerId}
    union select blocker_id from blocks where blocked_id = ${viewerId}
    union select muted_id from mutes where muter_id = ${viewerId}
  `);
  return new Set(rows.map((r) => r.id));
}

/** Blocked in either direction? (Mutes don't count — they're private.) */
export async function isBlockedEitherWay(a: string, b: string, exec: Executor = db): Promise<boolean> {
  const [row] = await exec
    .select({ id: blocks.id })
    .from(blocks)
    .where(
      or(
        and(eq(blocks.blockerId, a), eq(blocks.blockedId, b)),
        and(eq(blocks.blockerId, b), eq(blocks.blockedId, a)),
      ),
    )
    .limit(1);
  return !!row;
}

export async function getRelationship(viewerId: string | null, targetId: string): Promise<Relationship> {
  const none = { following: false, followedBy: false, blocking: false, blockedBy: false, muting: false };
  if (!viewerId || viewerId === targetId) return none;
  const [row] = await db.execute<{
    following: boolean;
    followed_by: boolean;
    blocking: boolean;
    blocked_by: boolean;
    muting: boolean;
  }>(sql`
    select
      exists(select 1 from follows where follower_id = ${viewerId} and followee_id = ${targetId}) as following,
      exists(select 1 from follows where follower_id = ${targetId} and followee_id = ${viewerId}) as followed_by,
      exists(select 1 from blocks where blocker_id = ${viewerId} and blocked_id = ${targetId}) as blocking,
      exists(select 1 from blocks where blocker_id = ${targetId} and blocked_id = ${viewerId}) as blocked_by,
      exists(select 1 from mutes where muter_id = ${viewerId} and muted_id = ${targetId}) as muting
  `);
  return {
    following: row.following,
    followedBy: row.followed_by,
    blocking: row.blocking,
    blockedBy: row.blocked_by,
    muting: row.muting,
  };
}

async function requireActiveUser(id: string, exec: Executor) {
  const [u] = await exec.select({ id: users.id, suspendedAt: users.suspendedAt }).from(users).where(eq(users.id, id));
  if (!u || u.suspendedAt) throw new AppError("That account isn't available.", "not_found");
}

export async function follow(viewerId: string, targetId: string, at?: Date): Promise<void> {
  if (viewerId === targetId) throw new AppError("You can't follow yourself (but we admire the confidence).");
  await db.transaction(async (tx) => {
    await requireActiveUser(targetId, tx);
    if (await isBlockedEitherWay(viewerId, targetId, tx)) throw new AppError("You can't follow this account.", "forbidden");
    const inserted = await tx
      .insert(follows)
      .values({ followerId: viewerId, followeeId: targetId, ...(at ? { id: uuidv7(at.getTime()), createdAt: at } : {}) })
      .onConflictDoNothing()
      .returning({ id: follows.id });
    if (!inserted.length) return;
    await tx.update(users).set({ followingCount: sql`${users.followingCount} + 1` }).where(eq(users.id, viewerId));
    await tx.update(users).set({ followerCount: sql`${users.followerCount} + 1` }).where(eq(users.id, targetId));
    await notify(tx, { recipientId: targetId, actorId: viewerId, type: "follow", at });
  });
}

async function removeFollow(tx: Executor, followerId: string, followeeId: string): Promise<void> {
  const deleted = await tx
    .delete(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followeeId, followeeId)))
    .returning({ id: follows.id });
  if (!deleted.length) return;
  await tx.update(users).set({ followingCount: sql`greatest(${users.followingCount} - 1, 0)` }).where(eq(users.id, followerId));
  await tx.update(users).set({ followerCount: sql`greatest(${users.followerCount} - 1, 0)` }).where(eq(users.id, followeeId));
  await tx
    .delete(notifications)
    .where(
      and(eq(notifications.type, "follow"), eq(notifications.actorId, followerId), eq(notifications.recipientId, followeeId)),
    );
}

export async function unfollow(viewerId: string, targetId: string): Promise<void> {
  await db.transaction((tx) => removeFollow(tx, viewerId, targetId));
}

export async function block(viewerId: string, targetId: string): Promise<void> {
  if (viewerId === targetId) throw new AppError("You can't block yourself.");
  await db.transaction(async (tx) => {
    await tx.insert(blocks).values({ blockerId: viewerId, blockedId: targetId }).onConflictDoNothing();
    await removeFollow(tx, viewerId, targetId);
    await removeFollow(tx, targetId, viewerId);
  });
}

export async function unblock(viewerId: string, targetId: string): Promise<void> {
  await db.delete(blocks).where(and(eq(blocks.blockerId, viewerId), eq(blocks.blockedId, targetId)));
}

export async function mute(viewerId: string, targetId: string): Promise<void> {
  if (viewerId === targetId) throw new AppError("You can't mute yourself.");
  await db.insert(mutes).values({ muterId: viewerId, mutedId: targetId }).onConflictDoNothing();
}

export async function unmute(viewerId: string, targetId: string): Promise<void> {
  await db.delete(mutes).where(and(eq(mutes.muterId, viewerId), eq(mutes.mutedId, targetId)));
}

export type UserListPage = { users: Array<UserSummary & { bio: string }>; nextCursor: string | null };

/** Followers or following of a user, newest first. */
export async function listConnections(
  userId: string,
  direction: "followers" | "following",
  cursor: string | null,
  limit = 40,
): Promise<UserListPage> {
  const isFollowers = direction === "followers";
  const joinOn = isFollowers ? eq(users.id, follows.followerId) : eq(users.id, follows.followeeId);
  const rows = await db
    .select({ edgeId: follows.id, user: users })
    .from(follows)
    .innerJoin(users, joinOn)
    .where(
      and(
        isFollowers ? eq(follows.followeeId, userId) : eq(follows.followerId, userId),
        sql`${users.suspendedAt} is null`,
        cursor ? lt(follows.id, cursor) : undefined,
      ),
    )
    .orderBy(desc(follows.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  return {
    users: page.map((r) => ({ ...toUserSummary(r.user), bio: r.user.bio })),
    nextCursor: rows.length > limit ? page[page.length - 1].edgeId : null,
  };
}

/**
 * "Who to follow": people followed by people you follow (friends-of-friends),
 * falling back to the most-followed active accounts. Transparent and boring
 * on purpose.
 */
export async function whoToFollow(viewerId: string | null, limit = 3): Promise<Array<UserSummary & { bio: string }>> {
  const hidden = viewerId ? [...(await hiddenAuthorIds(viewerId))] : [];
  const exclude = viewerId ? [viewerId, ...hidden] : [];

  let candidates: Array<typeof users.$inferSelect> = [];
  if (viewerId) {
    const fof = await db.execute<{ id: string }>(sql`
      select f2.followee_id as id, count(*) as score
      from follows f1
      join follows f2 on f2.follower_id = f1.followee_id
      where f1.follower_id = ${viewerId}
        and f2.followee_id <> ${viewerId}
        and not exists (select 1 from follows f3 where f3.follower_id = ${viewerId} and f3.followee_id = f2.followee_id)
      group by f2.followee_id
      order by score desc
      limit 20
    `);
    const ids = fof.map((r) => r.id).filter((id) => !exclude.includes(id));
    if (ids.length) {
      const rows = await db.select().from(users).where(and(inArray(users.id, ids), sql`${users.suspendedAt} is null`));
      candidates = ids.map((id) => rows.find((r) => r.id === id)).filter((r): r is NonNullable<typeof r> => !!r);
    }
  }

  if (candidates.length < limit) {
    const already = new Set([...exclude, ...candidates.map((c) => c.id)]);
    const followingIds = viewerId
      ? (await db.select({ id: follows.followeeId }).from(follows).where(eq(follows.followerId, viewerId))).map((r) => r.id)
      : [];
    const skip = [...already, ...followingIds];
    const popular = await db
      .select()
      .from(users)
      .where(and(sql`${users.suspendedAt} is null`, skip.length ? notInArray(users.id, skip) : undefined))
      .orderBy(desc(users.followerCount), desc(users.id))
      .limit(limit);
    candidates = [...candidates, ...popular];
  }

  return candidates.slice(0, limit).map((u) => ({ ...toUserSummary(u), bio: u.bio }));
}
