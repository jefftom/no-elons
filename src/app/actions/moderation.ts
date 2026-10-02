"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer, requireModerator } from "@/server/auth/viewer";
import { AppError } from "@/server/errors";
import { rateLimit, LIMITS_PER_ACTION } from "@/server/rate-limit";
import {
  dismissReport,
  removePost,
  reportContent,
  restorePost,
  suspendUser,
  unsuspendUser,
} from "@/server/services/moderation";
import { isUuid } from "@/lib/ids";
import { guarded, str, type ActionResult } from "./result";

export async function reportAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const result = await guarded(async () => {
    const viewer = await getViewer();
    if (!viewer) throw new AppError("Sign in to report.", "forbidden");
    const rl = rateLimit(`report:${viewer.id}`, LIMITS_PER_ACTION.report.limit, LIMITS_PER_ACTION.report.windowMs);
    if (!rl.ok) throw new AppError("You've sent a lot of reports. Thank you — please try again later.", "rate_limited");
    const postId = str(fd, "postId");
    const userId = str(fd, "userId");
    await reportContent(
      viewer.id,
      { postId: isUuid(postId) ? postId : null, userId: isUuid(userId) ? userId : null },
      { rule: str(fd, "rule"), details: str(fd, "details") },
    );
  });
  if (!result.ok) return result;
  redirect("/report/thanks");
}

function id(fd: FormData, key: string): string {
  const v = str(fd, key);
  if (!isUuid(v)) throw new AppError("Missing target.");
  return v;
}

export async function modRemovePostAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const mod = await requireModerator();
    await removePost(mod.id, id(fd, "postId"), str(fd, "rule"), str(fd, "note"));
    refresh();
  });
}

export async function modRestorePostAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const mod = await requireModerator();
    await restorePost(mod.id, id(fd, "postId"), str(fd, "note"));
    refresh();
  });
}

export async function modSuspendAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const mod = await requireModerator();
    await suspendUser(mod.id, id(fd, "userId"), str(fd, "rule"), str(fd, "note"));
    refresh();
  });
}

export async function modUnsuspendAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const mod = await requireModerator();
    await unsuspendUser(mod.id, id(fd, "userId"), str(fd, "note"));
    refresh();
  });
}

export async function modDismissAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const mod = await requireModerator();
    await dismissReport(mod.id, id(fd, "reportId"));
    refresh();
  });
}
