import { Images } from "lucide-react";
import { EmptyState, Pager } from "@/components/feed";
import { PageHeader } from "@/components/page-header";
import { PhotoGrid } from "@/components/photo-grid";
import { Tabs } from "@/components/tabs";
import type { ViewerInfo } from "@/components/types";
import type { GridPage } from "@/server/services/feeds";

export function PhotosView({
  page,
  viewer,
  basePath,
  hasCursor,
}: {
  page: GridPage;
  viewer: ViewerInfo | null;
  basePath: string;
  hasCursor: boolean;
}) {
  return (
    <>
      <PageHeader title="Photos" subtitle="Newest first, square and simple">
        {viewer ? (
          <Tabs
            tabs={[
              { href: "/photos", label: "Everyone", exact: true },
              { href: "/photos/following", label: "Following" },
            ]}
          />
        ) : null}
      </PageHeader>
      {page.posts.length ? (
        <div className="pt-0.5">
          <PhotoGrid posts={page.posts} hideCounts={viewer?.hideCounts} />
          <Pager basePath={basePath} nextCursor={page.nextCursor} hasCursor={hasCursor} />
        </div>
      ) : (
        <EmptyState title="No photos yet" icon={<Images />}>
          Photo posts show up here as a grid. Add one from the composer — we strip location data automatically.
        </EmptyState>
      )}
    </>
  );
}
