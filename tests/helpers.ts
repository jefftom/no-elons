import { inject } from "vitest";
import sharp from "sharp";
import { sql } from "@/server/db";
import { createUser } from "@/server/services/users";

export const dbAvailable = () => inject("dbAvailable");

let n = 0;
/** A fresh user with a unique username. */
export async function makeUser(prefix = "user") {
  n++;
  const username = `${prefix}${n}_${Math.random().toString(36).slice(2, 7)}`.slice(0, 20);
  return createUser({ username, displayName: `${prefix} ${n}`, email: `${username}@example.com`, password: "a-strong-password" });
}

/** A tiny real PNG. */
export function png(color = "#ff5a3c", width = 64, height = 48): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: color } }).png().toBuffer();
}

export async function truncateAll() {
  await sql`truncate users, sessions, posts, post_media, post_revisions, likes, bookmarks, follows, blocks, mutes,
    post_hashtags, mentions, notifications, lists, list_members, reports, moderation_actions restart identity cascade`;
}
