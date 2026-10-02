import Link from "next/link";
import type { FeedPage } from "@/server/views";
import { EmptyState } from "./empty-state";
import { PostCard } from "./post-card";
import type { ViewerInfo } from "./types";

export function Pager({ basePath, nextCursor, hasCursor, params = {} }: { basePath: string; nextCursor: string | null; hasCursor: boolean; params?: Record<string, string> }) {
  if (!nextCursor && !hasCursor) return null;
  const href = (cursor?: string) => {
    const q = new URLSearchParams(params);
    if (cursor) q.set("cursor", cursor);
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  return (
    <nav className="flex items-center justify-between gap-3 px-4 py-5 text-sm font-semibold">
      {hasCursor ? (
        <Link href={href()} className="btn-ghost">
          ↑ Back to newest
        </Link>
      ) : (
        <span />
      )}
      {nextCursor ? (
        <Link href={href(nextCursor)} className="btn-outline" scroll>
          Older posts ↓
        </Link>
      ) : (
        <span className="text-muted">You&apos;re all caught up ✨</span>
      )}
    </nav>
  );
}

export function Feed({
  page,
  viewer,
  basePath,
  hasCursor,
  params,
  empty,
}: {
  page: FeedPage;
  viewer: ViewerInfo | null;
  basePath: string;
  hasCursor: boolean;
  params?: Record<string, string>;
  empty?: React.ReactNode;
}) {
  if (!page.items.length && !hasCursor) return <>{empty ?? <EmptyState title="Nothing here yet" />}</>;
  return (
    <div>
      <div className="divide-y divide-line">
        {page.items.map((item) => (
          <PostCard key={item.key} item={item} viewer={viewer} />
        ))}
      </div>
      <Pager basePath={basePath} nextCursor={page.nextCursor} hasCursor={hasCursor} params={params} />
    </div>
  );
}

export { EmptyState };
