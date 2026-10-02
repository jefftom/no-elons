import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import { isValidKey, storage } from "@/server/storage";

/**
 * Serves locally-stored media. A key's bytes never change (a new upload always
 * gets a new UUID), but availability can: photos on posts that moderators
 * removed, or that belong to suspended accounts, stop being served. In
 * production a CDN fronts this, and moderation purges the removed keys there.
 */
async function isVisible(key: string): Promise<boolean> {
  if (!key.startsWith("p/")) return true; // avatars/banners: the profile itself handles suspension
  const [row] = await db.execute<{ ok: boolean }>(sql`
    select (p.deleted_at is null and p.removed_at is null and u.suspended_at is null) as ok
    from post_media m
    join posts p on p.id = m.post_id
    join users u on u.id = p.author_id
    where m.storage_key = ${key} or m.thumb_key = ${key}
    limit 1
  `);
  return row?.ok === true;
}

export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  if (!isValidKey(key) || !(await isVisible(key))) return new Response("Not found", { status: 404 });
  const data = await storage.get(key);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
    },
  });
}
