/** Write side of notifications. Called inside the transaction that caused them. */
import { and, eq, sql } from "drizzle-orm";
import { uuidv7 } from "@/lib/ids";
import type { Executor } from "../db";
import { blocks, mutes, notifications } from "../db/schema";

export type NotificationType = (typeof notifications.$inferInsert)["type"];

export async function notify(
  tx: Executor,
  n: { recipientId: string; actorId: string; type: NotificationType; postId?: string | null; at?: Date },
): Promise<void> {
  if (n.recipientId === n.actorId) return;
  // Respect the recipient's blocks and mutes: they shouldn't hear from people they've shut out.
  const [silenced] = await tx.execute<{ x: number }>(sql`
    select 1 as x from ${blocks}
      where (${blocks.blockerId} = ${n.recipientId} and ${blocks.blockedId} = ${n.actorId})
         or (${blocks.blockerId} = ${n.actorId} and ${blocks.blockedId} = ${n.recipientId})
    union all
    select 1 from ${mutes} where ${mutes.muterId} = ${n.recipientId} and ${mutes.mutedId} = ${n.actorId}
    limit 1
  `);
  if (silenced) return;
  const at = n.at ?? new Date();
  await tx.insert(notifications).values({
    id: uuidv7(at.getTime()),
    recipientId: n.recipientId,
    actorId: n.actorId,
    type: n.type,
    postId: n.postId ?? null,
    createdAt: at,
  });
}

/** Undo a notification when its cause is undone (unlike, un-repost). */
export async function unnotify(
  tx: Executor,
  n: { recipientId: string; actorId: string; type: NotificationType; postId: string },
): Promise<void> {
  await tx
    .delete(notifications)
    .where(
      and(
        eq(notifications.recipientId, n.recipientId),
        eq(notifications.actorId, n.actorId),
        eq(notifications.type, n.type),
        eq(notifications.postId, n.postId),
      ),
    );
}
