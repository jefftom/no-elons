import { profileFeed } from "@/server/services/feeds";
import { getProfile } from "@/server/services/users";

/** Every profile has an RSS feed. Your audience shouldn't be locked in either. */
function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
}

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await getProfile(username);
  if (!profile || profile.suspended) return new Response("Not found", { status: 404 });
  const origin = process.env.PUBLIC_URL ?? "http://localhost:3000";
  const page = await profileFeed(profile.id, null, "posts", null, 30);

  const items = page.items
    .filter((i) => !i.repostedBy)
    .map(({ post }) => {
      const link = `${origin}/p/${post.id}`;
      const text = post.contentWarning ? `[CW: ${post.contentWarning}]` : post.body;
      const images = post.contentWarning
        ? ""
        : post.media.map((m) => `<p><img src="${escapeXml(new URL(m.url, origin).toString())}" alt="${escapeXml(m.alt)}"/></p>`).join("");
      const html = `<p>${escapeXml(text).replace(/\n/g, "<br/>")}</p>${images}`;
      return `<item>
  <title>${escapeXml(text.slice(0, 80) || "Photo")}</title>
  <link>${link}</link>
  <guid isPermaLink="true">${link}</guid>
  <pubDate>${post.createdAt.toUTCString()}</pubDate>
  <description><![CDATA[${html}]]></description>
</item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${escapeXml(profile.displayName)} (@${profile.username}) on NoElons</title>
  <link>${origin}/@${profile.username}</link>
  <atom:link href="${origin}/@${profile.username}/rss" rel="self" type="application/rss+xml"/>
  <description>${escapeXml(profile.bio || `Posts by @${profile.username}`)}</description>
  <language>en</language>
${items}
</channel>
</rss>`;
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
}
