import type { Metadata } from "next";
import { Hash } from "lucide-react";
import { EmptyState, Feed } from "@/components/feed";
import { PageHeader } from "@/components/page-header";
import { getViewerInfo } from "@/server/auth/viewer";
import { hashtagFeed } from "@/server/services/feeds";
import { parseCursor } from "@/lib/ids";

type Props = { params: Promise<{ tag: string }>; searchParams: Promise<{ cursor?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  return { title: `#${decodeURIComponent(tag)}` };
}

export default async function TagPage({ params, searchParams }: Props) {
  const tag = decodeURIComponent((await params).tag).toLowerCase().slice(0, 64);
  const cursor = parseCursor((await searchParams).cursor);
  const viewer = await getViewerInfo();
  const page = await hashtagFeed(tag, viewer?.id ?? null, cursor);
  return (
    <>
      <PageHeader title={`#${tag}`} subtitle="Every post with this tag, newest first" back />
      <Feed
        page={page}
        viewer={viewer}
        basePath={`/tags/${encodeURIComponent(tag)}`}
        hasCursor={!!cursor}
        empty={<EmptyState title={`No posts with #${tag} yet`} icon={<Hash />}>Be the first to use it.</EmptyState>}
      />
    </>
  );
}
