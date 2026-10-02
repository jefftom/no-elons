import { Bookmark } from "lucide-react";
import { EmptyState, Feed } from "@/components/feed";
import { PageHeader } from "@/components/page-header";
import { getViewerInfo, requireViewer } from "@/server/auth/viewer";
import { bookmarksFeed } from "@/server/services/feeds";
import { parseCursor } from "@/lib/ids";

export const metadata = { title: "Bookmarks" };

export default async function BookmarksPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  await requireViewer("/bookmarks");
  const viewer = (await getViewerInfo())!;
  const cursor = parseCursor((await searchParams).cursor);
  const page = await bookmarksFeed(viewer.id, cursor);
  return (
    <>
      <PageHeader title="Bookmarks" subtitle="Private to you" />
      <Feed
        page={page}
        viewer={viewer}
        basePath="/bookmarks"
        hasCursor={!!cursor}
        empty={<EmptyState title="Save posts for later" icon={<Bookmark />}>Bookmark posts to find them again. Only you can see your bookmarks.</EmptyState>}
      />
    </>
  );
}
