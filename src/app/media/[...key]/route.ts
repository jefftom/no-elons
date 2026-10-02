import { isValidKey, storage } from "@/server/storage";

/**
 * Serves locally-stored media. Keys are immutable (a new upload always gets
 * a new UUID), so responses can be cached forever. In production this route
 * is bypassed: MEDIA_PUBLIC_BASE_URL points at the CDN/bucket instead.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  if (!isValidKey(key)) return new Response("Not found", { status: 404 });
  const data = await storage.get(key);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
    },
  });
}
