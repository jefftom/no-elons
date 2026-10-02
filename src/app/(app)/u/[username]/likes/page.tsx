import { notFound } from "next/navigation";
import { Heart } from "lucide-react";
import { EmptyState, Feed } from "@/components/feed";
import { likesFeed } from "@/server/services/feeds";
import { parseCursor } from "@/lib/ids";
import { loadProfile } from "../data";

type Props = { params: Promise<{ username: string }>; searchParams: Promise<{ cursor?: string }> };

/** Likes are private on NoElons: only the owner can see this tab. */
export default async function ProfileLikesPage({ params, searchParams }: Props) {
  const { username } = await params;
  const data = await loadProfile(username);
  if (!data || data.viewer?.id !== data.profile.id) notFound();
  const { profile, viewer } = data;
  const cursor = parseCursor((await searchParams).cursor);
  const page = await likesFeed(profile.id, cursor);
  return (
    <>
      <p className="border-b border-line px-4 py-2.5 text-[13px] text-muted">🔒 Only you can see your likes.</p>
      <Feed
        page={page}
        viewer={viewer}
        basePath={`/@${profile.username}/likes`}
        hasCursor={!!cursor}
        empty={<EmptyState title="No likes yet" icon={<Heart />}>Tap the heart on any post to show some love.</EmptyState>}
      />
    </>
  );
}
