"use server";

import { refresh } from "next/cache";
import { getViewer } from "@/server/auth/viewer";
import { AppError } from "@/server/errors";
import { rateLimit, LIMITS_PER_ACTION } from "@/server/rate-limit";
import { block, follow, mute, unblock, unfollow, unmute } from "@/server/services/relationships";
import { markRead } from "@/server/services/notifications";
import { isUuid } from "@/lib/ids";
import { guarded, type ActionResult } from "./result";

async function setup(userId: string) {
  const viewer = await getViewer();
  if (!viewer) throw new AppError("Sign in to do that.", "forbidden");
  if (!isUuid(userId)) throw new AppError("That account doesn't exist.", "not_found");
  const rl = rateLimit(`interact:${viewer.id}`, LIMITS_PER_ACTION.interact.limit, LIMITS_PER_ACTION.interact.windowMs);
  if (!rl.ok) throw new AppError("Slow down a little — try again in a few minutes.", "rate_limited");
  return viewer;
}

export async function followAction(userId: string, on: boolean): Promise<ActionResult> {
  return guarded(async () => {
    const viewer = await setup(userId);
    await (on ? follow(viewer.id, userId) : unfollow(viewer.id, userId));
    refresh();
  });
}

export async function blockAction(userId: string, on: boolean): Promise<ActionResult> {
  return guarded(async () => {
    const viewer = await setup(userId);
    await (on ? block(viewer.id, userId) : unblock(viewer.id, userId));
    refresh();
  });
}

export async function muteAction(userId: string, on: boolean): Promise<ActionResult> {
  return guarded(async () => {
    const viewer = await setup(userId);
    await (on ? mute(viewer.id, userId) : unmute(viewer.id, userId));
    refresh();
  });
}

export async function markAllReadAction(): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) return;
  await markRead(viewer.id);
  refresh();
}
