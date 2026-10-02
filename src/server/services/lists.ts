/** Lists: hand-picked timelines, the way old Twitter did them. */
import { and, desc, eq, sql } from "drizzle-orm";
import { firstError, listSchema } from "@/lib/validation";
import { db } from "../db";
import { listMembers, lists, users } from "../db/schema";
import { AppError } from "../errors";
import { toUserSummary, type UserSummary } from "../views";
import { isBlockedEitherWay } from "./relationships";

export type ListView = {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  memberCount: number;
  owner: UserSummary;
  createdAt: Date;
};

type ListRow = typeof lists.$inferSelect;

function toListView(list: ListRow, owner: typeof users.$inferSelect): ListView {
  return {
    id: list.id,
    name: list.name,
    description: list.description,
    isPrivate: list.isPrivate,
    memberCount: list.memberCount,
    owner: toUserSummary(owner),
    createdAt: list.createdAt,
  };
}

/** A list the viewer is allowed to see (private lists are owner-only). */
export async function getList(listId: string, viewerId: string | null): Promise<ListView | null> {
  const [row] = await db.select({ list: lists, owner: users }).from(lists).innerJoin(users, eq(users.id, lists.ownerId)).where(eq(lists.id, listId));
  if (!row) return null;
  if (row.list.isPrivate && row.list.ownerId !== viewerId) return null;
  return toListView(row.list, row.owner);
}

export async function listsOwnedBy(ownerId: string, viewerId: string | null): Promise<ListView[]> {
  const rows = await db
    .select({ list: lists, owner: users })
    .from(lists)
    .innerJoin(users, eq(users.id, lists.ownerId))
    .where(and(eq(lists.ownerId, ownerId), ownerId === viewerId ? undefined : eq(lists.isPrivate, false)))
    .orderBy(desc(lists.id));
  return rows.map((r) => toListView(r.list, r.owner));
}

export async function createList(ownerId: string, input: { name: string; description: string; isPrivate: boolean }): Promise<string> {
  const parsed = listSchema.safeParse(input);
  if (!parsed.success) throw new AppError(firstError(parsed.error));
  const [existing] = await db.select({ n: sql<number>`count(*)::int` }).from(lists).where(eq(lists.ownerId, ownerId));
  if ((existing?.n ?? 0) >= 50) throw new AppError("You can have up to 50 lists.");
  const [row] = await db.insert(lists).values({ ownerId, ...parsed.data }).returning({ id: lists.id });
  return row.id;
}

async function requireOwnList(listId: string, viewerId: string): Promise<ListRow> {
  const [list] = await db.select().from(lists).where(eq(lists.id, listId));
  if (!list || list.ownerId !== viewerId) throw new AppError("That list isn't yours.", "forbidden");
  return list;
}

export async function updateList(viewerId: string, listId: string, input: { name: string; description: string; isPrivate: boolean }) {
  await requireOwnList(listId, viewerId);
  const parsed = listSchema.safeParse(input);
  if (!parsed.success) throw new AppError(firstError(parsed.error));
  await db.update(lists).set(parsed.data).where(eq(lists.id, listId));
}

export async function deleteList(viewerId: string, listId: string) {
  await requireOwnList(listId, viewerId);
  await db.delete(lists).where(eq(lists.id, listId));
}

export async function addListMember(viewerId: string, listId: string, username: string): Promise<void> {
  await requireOwnList(listId, viewerId);
  const [user] = await db.select().from(users).where(eq(users.username, username.trim().replace(/^@/, "").toLowerCase()));
  if (!user || user.suspendedAt) throw new AppError("No account with that username.", "not_found");
  if (await isBlockedEitherWay(viewerId, user.id)) throw new AppError("You can't add that account to a list.", "forbidden");
  await db.transaction(async (tx) => {
    // Lock the list so concurrent adds serialise: the cap and the counter stay exact.
    const [list] = await tx.select({ memberCount: lists.memberCount }).from(lists).where(eq(lists.id, listId)).for("update");
    if (!list) throw new AppError("That list doesn't exist.", "not_found");
    if (list.memberCount >= 500) throw new AppError("Lists can have up to 500 members.");
    const inserted = await tx.insert(listMembers).values({ listId, userId: user.id }).onConflictDoNothing().returning();
    if (!inserted.length) return;
    await tx.update(lists).set({ memberCount: sql`${lists.memberCount} + 1` }).where(eq(lists.id, listId));
  });
}

export async function removeListMember(viewerId: string, listId: string, userId: string): Promise<void> {
  await requireOwnList(listId, viewerId);
  await db.transaction(async (tx) => {
    const deleted = await tx.delete(listMembers).where(and(eq(listMembers.listId, listId), eq(listMembers.userId, userId))).returning();
    if (!deleted.length) return;
    await tx.update(lists).set({ memberCount: sql`greatest(${lists.memberCount} - 1, 0)` }).where(eq(lists.id, listId));
  });
}

export async function getListMembers(listId: string): Promise<Array<UserSummary & { bio: string }>> {
  const rows = await db
    .select({ user: users })
    .from(listMembers)
    .innerJoin(users, eq(users.id, listMembers.userId))
    .where(eq(listMembers.listId, listId))
    .orderBy(users.username);
  return rows.map((r) => ({ ...toUserSummary(r.user), bio: r.user.bio }));
}
