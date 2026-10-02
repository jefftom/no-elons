import { notFound } from "next/navigation";
import { EmptyState, Feed } from "@/components/feed";
import { getPost, profileFeed } from "@/server/services/feeds";
import { parseCursor } from "@/lib/ids";
import { loadProfile } from "./data";

type Props = { params: Promise<{ username: string }>; searchParams: Promise<{ cursor?: string }> };

export default async function ProfilePostsPage({ params, searchParams }: Props) {
  const { username } = await params;
  const data = await loadProfile(username);
  if (!data) notFound();
  if (data.hiddenContent) return null;
  const { profile, viewer } = data;
  const cursor = parseCursor((await searchParams).cursor);
  const page = await profileFeed(profile.id, viewer?.id ?? null, "posts", cursor);

  // The pinned post leads the first page (and isn't repeated below it).
  if (!cursor && profile.pinnedPostId) {
    const pinned = await getPost(profile.pinnedPostId, viewer?.id ?? null);
    if (pinned && pinned.state === "ok") {
      page.items = [{ key: `pinned-${pinned.id}`, post: pinned, pinned: true }, ...page.items.filter((i) => i.post.id !== pinned.id || i.repostedBy)];
    }
  }

  return (
    <Feed
      page={page}
      viewer={viewer}
      basePath={`/@${profile.username}`}
      hasCursor={!!cursor}
      empty={
        <EmptyState title={viewer?.id === profile.id ? "You haven't posted yet" : `@${profile.username} hasn't posted yet`}>
          {viewer?.id === profile.id ? "Your posts and reposts will show up here." : "When they do, their posts will show up here."}
        </EmptyState>
      }
    />
  );
}
