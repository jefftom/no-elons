import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { PhotoGrid } from "@/components/photo-grid";
import { SearchBox, Trends } from "@/components/shell/right-rail";
import { UserRow } from "@/components/user-row";
import { getViewerInfo } from "@/server/auth/viewer";
import { photosFeed } from "@/server/services/feeds";
import { whoToFollow } from "@/server/services/relationships";

export const metadata = { title: "Explore" };

export default async function ExplorePage() {
  const viewer = await getViewerInfo();
  const [people, photos] = await Promise.all([whoToFollow(viewer?.id ?? null, 8), photosFeed(viewer?.id ?? null, "everyone", null, 9)]);
  return (
    <>
      <PageHeader title="Explore" subtitle="No “For You”. Just ways to find people." />
      <div className="p-4">
        <SearchBox />
      </div>
      <div className="px-4 pb-4 lg:hidden">
        <Trends limit={5} />
      </div>
      {people.length ? (
        <section className="border-t border-line">
          <h2 className="px-4 pt-4 pb-1 font-display text-xl font-extrabold tracking-tight">People to follow</h2>
          <p className="px-4 pb-2 text-sm text-muted">Followed by people you follow, then the most-followed accounts. That&apos;s it.</p>
          <div className="divide-y divide-line">
            {people.map((u) => (
              <UserRow key={u.id} user={u} following={false} viewerId={viewer?.id ?? null} />
            ))}
          </div>
        </section>
      ) : null}
      {photos.posts.length ? (
        <section className="border-t border-line">
          <div className="flex items-baseline justify-between px-4 pt-4 pb-3">
            <h2 className="font-display text-xl font-extrabold tracking-tight">Latest photos</h2>
            <Link href="/photos" className="text-sm font-semibold text-accent hover:underline">
              See all
            </Link>
          </div>
          <PhotoGrid posts={photos.posts} hideCounts={viewer?.hideCounts} />
        </section>
      ) : null}
    </>
  );
}
