import { notFound } from "next/navigation";
import { Camera } from "lucide-react";
import { EmptyState, Pager } from "@/components/feed";
import { PhotoGrid } from "@/components/photo-grid";
import { profileGrid } from "@/server/services/feeds";
import { parseCursor } from "@/lib/ids";
import { loadProfile } from "../data";

type Props = { params: Promise<{ username: string }>; searchParams: Promise<{ cursor?: string }> };

export default async function ProfileGridPage({ params, searchParams }: Props) {
  const { username } = await params;
  const data = await loadProfile(username);
  if (!data) notFound();
  if (data.hiddenContent) return null;
  const { profile, viewer } = data;
  const cursor = parseCursor((await searchParams).cursor);
  const page = await profileGrid(profile.id, viewer?.id ?? null, cursor);
  if (!page.posts.length && !cursor) {
    return (
      <EmptyState title="No photos yet" icon={<Camera />}>
        {viewer?.id === profile.id ? "Photos you post show up here as a grid." : `When @${profile.username} posts photos, they'll appear here.`}
      </EmptyState>
    );
  }
  return (
    <div className="pt-0.5">
      <PhotoGrid posts={page.posts} hideCounts={viewer?.hideCounts} />
      <Pager basePath={`/@${profile.username}/grid`} nextCursor={page.nextCursor} hasCursor={!!cursor} />
    </div>
  );
}
