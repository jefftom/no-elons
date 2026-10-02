import { Search } from "lucide-react";
import { EmptyState, Feed } from "@/components/feed";
import { PageHeader } from "@/components/page-header";
import { SearchBox } from "@/components/shell/right-rail";
import { Tabs } from "@/components/tabs";
import { UserRow } from "@/components/user-row";
import { getViewerInfo } from "@/server/auth/viewer";
import { db } from "@/server/db";
import { follows } from "@/server/db/schema";
import { searchUsers } from "@/server/services/discovery";
import { searchPosts } from "@/server/services/feeds";
import { parseCursor } from "@/lib/ids";
import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";

export const metadata = { title: "Search" };

type Props = { searchParams: Promise<{ q?: string; type?: string; cursor?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 200);
  const type = sp.type === "people" ? "people" : "posts";
  const cursor = parseCursor(sp.cursor);
  const viewer = await getViewerInfo();

  // "#tag" searches go straight to the tag page.
  if (/^#[\p{L}\p{N}_]+$/u.test(q)) redirect(`/tags/${encodeURIComponent(q.slice(1).toLowerCase())}`);

  const enc = encodeURIComponent(q);
  return (
    <>
      <PageHeader title="Search">
        <div className="px-4 pb-3">
          <SearchBox defaultValue={q} autoFocus={!q} />
        </div>
        {q ? (
          <Tabs
            activeHref={type === "people" ? `/search?q=${enc}&type=people` : `/search?q=${enc}`}
            tabs={[
              { href: `/search?q=${enc}`, label: "Posts" },
              { href: `/search?q=${enc}&type=people`, label: "People" },
            ]}
          />
        ) : null}
      </PageHeader>
      {!q ? (
        <EmptyState title="Search NoElons" icon={<Search />}>
          Find posts by keyword (try <code>&quot;exact phrase&quot;</code> or <code>-exclude</code>), people by name, or jump to a #hashtag.
        </EmptyState>
      ) : type === "people" ? (
        <PeopleResults q={q} viewerId={viewer?.id ?? null} />
      ) : (
        <Feed
          page={await searchPosts(q, viewer?.id ?? null, cursor)}
          viewer={viewer}
          basePath="/search"
          params={{ q }}
          hasCursor={!!cursor}
          empty={<EmptyState title={`No posts match “${q}”`}>Try different words, or search people instead.</EmptyState>}
        />
      )}
    </>
  );
}

async function PeopleResults({ q, viewerId }: { q: string; viewerId: string | null }) {
  const people = await searchUsers(q);
  if (!people.length) return <EmptyState title={`Nobody matches “${q}”`} />;
  const followed = new Set(
    viewerId
      ? (
          await db
            .select({ id: follows.followeeId })
            .from(follows)
            .where(and(eq(follows.followerId, viewerId), inArray(follows.followeeId, people.map((p) => p.id))))
        ).map((r) => r.id)
      : [],
  );
  return (
    <div className="divide-y divide-line">
      {people.map((u) => (
        <UserRow key={u.id} user={u} following={followed.has(u.id)} viewerId={viewerId} />
      ))}
    </div>
  );
}
