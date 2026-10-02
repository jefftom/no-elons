import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/feed";
import { UserRow } from "@/components/user-row";
import { db } from "@/server/db";
import { follows } from "@/server/db/schema";
import { listConnections } from "@/server/services/relationships";
import { parseCursor } from "@/lib/ids";
import { and, eq, inArray } from "drizzle-orm";
import { loadProfile } from "./data";

export async function ConnectionsPage({
  username,
  direction,
  cursorParam,
}: {
  username: string;
  direction: "followers" | "following";
  cursorParam?: string;
}) {
  const data = await loadProfile(username);
  if (!data) notFound();
  if (data.hiddenContent) return null;
  const { profile, viewer } = data;
  const cursor = parseCursor(cursorParam);
  const page = await listConnections(profile.id, direction, cursor);

  // Which of these does the viewer already follow? One query for the whole page.
  const ids = page.users.map((u) => u.id);
  const followed = new Set(
    viewer && ids.length
      ? (
          await db
            .select({ id: follows.followeeId })
            .from(follows)
            .where(and(eq(follows.followerId, viewer.id), inArray(follows.followeeId, ids)))
        ).map((r) => r.id)
      : [],
  );

  return (
    <div>
      <h3 className="border-b border-line px-4 py-3 font-display text-lg font-extrabold">
        {direction === "followers" ? "Followers" : "Following"}
      </h3>
      {page.users.length ? (
        <div className="divide-y divide-line">
          {page.users.map((u) => (
            <UserRow key={u.id} user={u} following={followed.has(u.id)} viewerId={viewer?.id ?? null} />
          ))}
        </div>
      ) : (
        <EmptyState title={direction === "followers" ? "No followers yet" : "Not following anyone yet"} />
      )}
      {page.nextCursor ? (
        <div className="px-4 py-5 text-center">
          <Link href={`/@${profile.username}/${direction}?cursor=${page.nextCursor}`} className="btn-outline">
            Show more
          </Link>
        </div>
      ) : null}
    </div>
  );
}
