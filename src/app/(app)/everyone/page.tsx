import { Globe } from "lucide-react";
import { EmptyState, Feed } from "@/components/feed";
import { PageHeader } from "@/components/page-header";
import { getViewerInfo } from "@/server/auth/viewer";
import { everyoneFeed } from "@/server/services/feeds";
import { parseCursor } from "@/lib/ids";

export const metadata = { title: "Everyone" };

export default async function EveryonePage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  const cursor = parseCursor((await searchParams).cursor);
  const viewer = await getViewerInfo();
  const page = await everyoneFeed(viewer?.id ?? null, cursor);
  return (
    <>
      <PageHeader title="Everyone" subtitle="Every new post on NoElons, as it happens" />
      <Feed
        page={page}
        viewer={viewer}
        basePath="/everyone"
        hasCursor={!!cursor}
        empty={<EmptyState title="It's quiet out here" icon={<Globe />}>Be the first to post something.</EmptyState>}
      />
    </>
  );
}
