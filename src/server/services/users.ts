/** Accounts and profiles. */
import { eq, or, sql } from "drizzle-orm";
import { firstError, passwordChangeSchema, profileSchema, signupSchema } from "@/lib/validation";
import { db } from "../db";
import { postMedia, posts, users } from "../db/schema";
import { invalidateAllSessions } from "../auth/session";
import { dummyPasswordHash, hashPassword, verifyPassword } from "../auth/password";
import { AppError, isUniqueViolation } from "../errors";
import { deleteBlobs, storeAvatar, storeBanner } from "../media";
import { toProfileView, type ProfileView } from "../views";

export type UserRow = typeof users.$inferSelect;

export async function createUser(input: { username: string; displayName: string; email: string; password: string }, options: { createdAt?: Date } = {}): Promise<UserRow> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) throw new AppError(firstError(parsed.error));
  const { username, displayName, email, password } = parsed.data;
  const passwordHash = await hashPassword(password);
  try {
    const [user] = await db
      .insert(users)
      .values({ username, displayName, email, passwordHash, createdAt: options.createdAt ?? new Date() })
      .returning();
    return user;
  } catch (err) {
    if (isUniqueViolation(err, "users_username_uq")) throw new AppError("That username is taken.", "conflict");
    if (isUniqueViolation(err, "users_email_uq")) throw new AppError("There's already an account with that email.", "conflict");
    throw err;
  }
}

/** Username-or-email + password. Constant-ish time whether or not the account exists. */
export async function authenticate(identifier: string, password: string): Promise<UserRow | null> {
  const id = identifier.trim().toLowerCase().replace(/^@/, "");
  const [user] = await db
    .select()
    .from(users)
    .where(or(eq(users.username, id), eq(users.email, id)))
    .limit(1);
  if (!user) {
    await verifyPassword(await dummyPasswordHash(), password);
    return null;
  }
  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) return null;
  if (user.suspendedAt) throw new AppError("This account is suspended. See the transparency log for details.", "forbidden");
  return user;
}

export async function getUserById(id: string): Promise<UserRow | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ?? null;
}

export async function getProfile(username: string): Promise<ProfileView | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username.toLowerCase()))
    .limit(1);
  return user ? toProfileView(user) : null;
}

export async function updateProfile(
  userId: string,
  input: { displayName: string; bio: string; location: string; website: string },
  files: { avatar?: Buffer | null; banner?: Buffer | null; removeAvatar?: boolean; removeBanner?: boolean } = {},
): Promise<void> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) throw new AppError(firstError(parsed.error));
  const current = await getUserById(userId);
  if (!current) throw new AppError("Account not found.", "not_found");

  const patch: Partial<typeof users.$inferInsert> = { ...parsed.data };
  const oldBlobs: Array<string | null> = [];
  if (files.avatar) {
    patch.avatarKey = await storeAvatar(files.avatar);
    oldBlobs.push(current.avatarKey);
  } else if (files.removeAvatar) {
    patch.avatarKey = null;
    oldBlobs.push(current.avatarKey);
  }
  if (files.banner) {
    patch.bannerKey = await storeBanner(files.banner);
    oldBlobs.push(current.bannerKey);
  } else if (files.removeBanner) {
    patch.bannerKey = null;
    oldBlobs.push(current.bannerKey);
  }
  await db.update(users).set(patch).where(eq(users.id, userId));
  await deleteBlobs(oldBlobs);
}

export async function setHideCounts(userId: string, hideCounts: boolean): Promise<void> {
  await db.update(users).set({ hideCounts }).where(eq(users.id, userId));
}

export async function changePassword(userId: string, input: { current: string; next: string }): Promise<void> {
  const parsed = passwordChangeSchema.safeParse(input);
  if (!parsed.success) throw new AppError(firstError(parsed.error));
  const user = await getUserById(userId);
  if (!user || !(await verifyPassword(user.passwordHash, parsed.data.current))) {
    throw new AppError("Your current password isn't right.", "forbidden");
  }
  await db.update(users).set({ passwordHash: await hashPassword(parsed.data.next) }).where(eq(users.id, userId));
  await invalidateAllSessions(userId);
}

/**
 * Permanently delete an account and everything it owns. Posts cascade away
 * (replies from others keep a "deleted" placeholder via ON DELETE SET NULL).
 */
export async function deleteAccount(userId: string, confirmUsername: string, password: string): Promise<void> {
  const user = await getUserById(userId);
  if (!user) return;
  if (confirmUsername.trim().toLowerCase() !== user.username) throw new AppError("Type your username exactly to confirm.");
  if (!(await verifyPassword(user.passwordHash, password))) throw new AppError("That password isn't right.", "forbidden");

  const media = await db
    .select({ a: postMedia.storageKey, b: postMedia.thumbKey })
    .from(postMedia)
    .innerJoin(posts, eq(posts.id, postMedia.postId))
    .where(eq(posts.authorId, userId));

  await db.transaction(async (tx) => {
    // Keep other people's counters honest before the cascade wipes the edges.
    await tx.execute(sql`
      update users set follower_count = greatest(follower_count - 1, 0)
      where id in (select followee_id from follows where follower_id = ${userId})
    `);
    await tx.execute(sql`
      update users set following_count = greatest(following_count - 1, 0)
      where id in (select follower_id from follows where followee_id = ${userId})
    `);
    await tx.execute(sql`
      update posts p set like_count = greatest(p.like_count - 1, 0)
      from likes l where l.post_id = p.id and l.user_id = ${userId}
    `);
    await tx.execute(sql`
      update posts p set repost_count = greatest(p.repost_count - 1, 0)
      from posts r where r.repost_of_id = p.id and r.author_id = ${userId}
    `);
    await tx.execute(sql`
      update posts p set reply_count = greatest(p.reply_count - sub.n, 0)
      from (
        select reply_to_id, count(*)::int as n from posts
        where author_id = ${userId} and reply_to_id is not null and deleted_at is null
        group by reply_to_id
      ) sub
      where p.id = sub.reply_to_id and p.author_id <> ${userId}
    `);
    await tx.execute(sql`
      update posts p set quote_count = greatest(p.quote_count - sub.n, 0)
      from (
        select quote_of_id, count(*)::int as n from posts
        where author_id = ${userId} and quote_of_id is not null and deleted_at is null
        group by quote_of_id
      ) sub
      where p.id = sub.quote_of_id and p.author_id <> ${userId}
    `);
    await tx.execute(sql`
      update lists set member_count = greatest(member_count - 1, 0)
      where id in (select list_id from list_members where user_id = ${userId})
    `);
    await tx.delete(users).where(eq(users.id, userId));
  });
  await deleteBlobs([user.avatarKey, user.bannerKey, ...media.flatMap((m) => [m.a, m.b])]);
}
