import { notFound } from "next/navigation";
import { EmptyState, Feed } from "@/components/feed";
import { profileFeed } from "@/server/services/feeds";
import { parseCursor } from "@/lib/ids";
import { loadProfile } from "../data";

type Props = { params: Promise<{ username: string }>; searchParams: Promise<{ cursor?: string }> };

export default async function ProfileRepliesPage({ params, searchParams }: Props) {
  const { username } = await params;
  const data = await loadProfile(username);
  if (!data) notFound();
  if (data.hiddenContent) return null;
  const { profile, viewer } = data;
  const cursor = parseCursor((await searchParams).cursor);
  const page = await profileFeed(profile.id, viewer?.id ?? null, "replies", cursor);
  return (
    <Feed
      page={page}
      viewer={viewer}
      basePath={`/@${profile.username}/replies`}
      hasCursor={!!cursor}
      empty={<EmptyState title="No replies yet" />}
    />
  );
}
