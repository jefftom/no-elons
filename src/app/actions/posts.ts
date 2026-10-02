"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/viewer";
import { AppError } from "@/server/errors";
import { rateLimit, LIMITS_PER_ACTION } from "@/server/rate-limit";
import {
  createPost,
  deletePost,
  editPost,
  setBookmark,
  setLike,
  setPinned,
  setRepost,
} from "@/server/services/posts";
import { isUuid } from "@/lib/ids";
import { fileBuffer, guarded, str, type ActionResult } from "./result";

async function viewerOrThrow() {
  const viewer = await getViewer();
  if (!viewer) throw new AppError("Sign in to do that.", "forbidden");
  return viewer;
}

function limitInteractions(userId: string) {
  const rl = rateLimit(`interact:${userId}`, LIMITS_PER_ACTION.interact.limit, LIMITS_PER_ACTION.interact.windowMs);
  if (!rl.ok) throw new AppError("Slow down a little — try again in a few minutes.", "rate_limited");
}

function requireId(id: unknown): string {
  if (!isUuid(id)) throw new AppError("That post doesn't exist.", "not_found");
  return id;
}

export async function createPostAction(fd: FormData): Promise<ActionResult<{ postId: string }>> {
  return guarded(async () => {
    const viewer = await viewerOrThrow();
    const rl = rateLimit(`post:${viewer.id}`, LIMITS_PER_ACTION.post.limit, LIMITS_PER_ACTION.post.windowMs);
    if (!rl.ok) throw new AppError("You're posting a lot! Take a breather and try again shortly.", "rate_limited");

    const files = fd.getAll("media");
    const alts = fd.getAll("alt").map((a) => (typeof a === "string" ? a : ""));
    const media: Array<{ data: Buffer; alt: string }> = [];
    for (let i = 0; i < files.length; i++) {
      const data = await fileBuffer(files[i]);
      if (data) media.push({ data, alt: alts[i] ?? "" });
    }
    const replyToId = str(fd, "replyToId") || null;
    const quoteOfId = str(fd, "quoteOfId") || null;
    const postId = await createPost(viewer.id, {
      body: str(fd, "body"),
      contentWarning: str(fd, "contentWarning"),
      replyToId: replyToId ? requireId(replyToId) : null,
      quoteOfId: quoteOfId ? requireId(quoteOfId) : null,
      media,
    });
    refresh();
    return { postId };
  });
}

export async function editPostAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const postId = str(fd, "postId");
  const result = await guarded(async () => {
    const viewer = await viewerOrThrow();
    await editPost(viewer.id, requireId(postId), { body: str(fd, "body"), contentWarning: str(fd, "contentWarning") });
  });
  if (!result.ok) return result;
  redirect(`/p/${postId}`);
}

export async function deletePostAction(postId: string): Promise<ActionResult> {
  return guarded(async () => {
    const viewer = await viewerOrThrow();
    await deletePost(viewer.id, requireId(postId));
    refresh();
  });
}

export async function toggleLikeAction(postId: string, liked: boolean): Promise<ActionResult> {
  return guarded(async () => {
    const viewer = await viewerOrThrow();
    limitInteractions(viewer.id);
    await setLike(viewer.id, requireId(postId), liked);
  });
}

export async function toggleRepostAction(postId: string, reposted: boolean): Promise<ActionResult> {
  return guarded(async () => {
    const viewer = await viewerOrThrow();
    limitInteractions(viewer.id);
    await setRepost(viewer.id, requireId(postId), reposted);
  });
}

export async function toggleBookmarkAction(postId: string, bookmarked: boolean): Promise<ActionResult> {
  return guarded(async () => {
    const viewer = await viewerOrThrow();
    limitInteractions(viewer.id);
    await setBookmark(viewer.id, requireId(postId), bookmarked);
  });
}

export async function pinPostAction(postId: string, pinned: boolean): Promise<ActionResult> {
  return guarded(async () => {
    const viewer = await viewerOrThrow();
    await setPinned(viewer.id, requireId(postId), pinned);
    refresh();
  });
}
