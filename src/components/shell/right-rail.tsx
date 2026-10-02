import Link from "next/link";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { trendingHashtags } from "@/server/services/discovery";
import { whoToFollow } from "@/server/services/relationships";
import { UserRow } from "../user-row";
import type { ViewerInfo } from "../types";

export function SearchBox({ defaultValue = "", autoFocus = false }: { defaultValue?: string; autoFocus?: boolean }) {
  return (
    <form action="/search" className="relative" role="search">
      <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
      <input
        name="q"
        defaultValue={defaultValue}
        autoFocus={autoFocus}
        placeholder="Search NoElons"
        aria-label="Search"
        className="w-full rounded-full border border-transparent bg-surface-2 py-2.5 pl-11 pr-4 text-[15px] outline-none transition placeholder:text-muted focus:border-accent focus:bg-bg focus:ring-4 focus:ring-accent/15"
      />
    </form>
  );
}

export async function Trends({ limit = 6 }: { limit?: number }) {
  const trends = await trendingHashtags(limit);
  if (!trends.length) return null;
  return (
    <section className="card overflow-hidden">
      <h2 className="px-4 pt-3 pb-2 font-display text-[20px] font-extrabold tracking-tight">Trending today</h2>
      <ol>
        {trends.map((t, i) => (
          <li key={t.tag}>
            <Link href={`/tags/${encodeURIComponent(t.tag)}`} className="block px-4 py-2.5 transition-colors hover:bg-surface-2">
              <div className="text-[13px] text-muted">{i + 1} · Trending</div>
              <div className="font-bold">#{t.tag}</div>
              <div className="text-[13px] text-muted">
                {t.people} {t.people === 1 ? "person" : "people"} · {t.posts} {t.posts === 1 ? "post" : "posts"}
              </div>
            </Link>
          </li>
        ))}
      </ol>
      <p className="border-t border-line px-4 py-3 text-[12px] leading-snug text-muted">
        Ranked by how many <em>different people</em> used a tag in the last 24h. That&apos;s the whole algorithm.
      </p>
    </section>
  );
}

async function WhoToFollow({ viewer }: { viewer: ViewerInfo | null }) {
  const people = await whoToFollow(viewer?.id ?? null, 3);
  if (!people.length) return null;
  return (
    <section className="card overflow-hidden">
      <h2 className="px-4 pt-3 pb-1 font-display text-[20px] font-extrabold tracking-tight">Who to follow</h2>
      {people.map((u) => (
        <UserRow key={u.id} user={u} following={false} viewerId={viewer?.id ?? null} showBio={false} compact />
      ))}
      <Link href="/explore" className="block px-4 py-3 text-[15px] text-accent hover:bg-surface-2">
        Show more
      </Link>
    </section>
  );
}

function RailSkeleton() {
  return <div className="card h-48 animate-pulse bg-surface-2" />;
}

export function RightRail({ viewer }: { viewer: ViewerInfo | null }) {
  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="sticky top-0 z-10 -mx-1 bg-bg px-1 pt-2 pb-1">
        <SearchBox />
      </div>
      {!viewer ? (
        <section className="card p-4">
          <h2 className="font-display text-[20px] font-extrabold tracking-tight">New to NoElons?</h2>
          <p className="mt-1 text-[15px] text-muted">A chronological timeline, photos front and centre, and nobody&apos;s thumb on the scale.</p>
          <Link href="/signup" className="btn-primary mt-4 h-11 w-full">
            Create your account
          </Link>
        </section>
      ) : null}
      <Suspense fallback={<RailSkeleton />}>
        <Trends />
      </Suspense>
      <Suspense fallback={<RailSkeleton />}>
        <WhoToFollow viewer={viewer} />
      </Suspense>
      <section className="rounded-2xl bg-accent-soft p-4">
        <h2 className="font-display text-[17px] font-extrabold tracking-tight">The NoElons Charter</h2>
        <p className="mt-1 text-sm">
          Chronological by default. No paid reach. No owner override. Every moderation action is public.
        </p>
        <Link href="/charter" className="mt-2 inline-block text-sm font-bold text-accent hover:underline">
          Read the Charter →
        </Link>
      </section>
      <footer className="flex flex-wrap gap-x-3 gap-y-1 px-2 text-[13px] text-muted">
        <Link href="/charter" className="hover:underline">Charter</Link>
        <Link href="/charter#rules" className="hover:underline">Rules</Link>
        <Link href="/transparency" className="hover:underline">Transparency log</Link>
        <Link href="/everyone" className="hover:underline">Everyone</Link>
        <span>© {new Date().getUTCFullYear()} NoElons · not affiliated with any billionaire</span>
      </footer>
    </div>
  );
}
