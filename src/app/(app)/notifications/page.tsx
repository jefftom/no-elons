import Link from "next/link";
import { AtSign, Bell, Heart, MessageCircle, Quote, Repeat2, UserPlus } from "lucide-react";
import { markAllReadAction } from "@/app/actions/social";
import { Avatar } from "@/components/avatar";
import { EmptyState } from "@/components/feed";
import { PageHeader } from "@/components/page-header";
import { PostCard } from "@/components/post-card";
import { RelativeTime } from "@/components/relative-time";
import { getViewerInfo, requireViewer } from "@/server/auth/viewer";
import { listNotifications, markRead, type NotificationView } from "@/server/services/notifications";
import { parseCursor } from "@/lib/ids";

export const metadata = { title: "Notifications" };

const META: Record<NotificationView["type"], { icon: React.ReactNode; verb: string; color: string }> = {
  like: { icon: <Heart size={20} fill="currentColor" />, verb: "liked your post", color: "text-like" },
  repost: { icon: <Repeat2 size={20} />, verb: "reposted your post", color: "text-repost" },
  follow: { icon: <UserPlus size={20} />, verb: "followed you", color: "text-accent" },
  reply: { icon: <MessageCircle size={20} />, verb: "replied", color: "text-accent" },
  quote: { icon: <Quote size={20} />, verb: "quoted your post", color: "text-accent" },
  mention: { icon: <AtSign size={20} />, verb: "mentioned you", color: "text-accent" },
};

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  await requireViewer("/notifications");
  const viewer = (await getViewerInfo())!;
  const cursor = parseCursor((await searchParams).cursor);
  const { items, nextCursor } = await listNotifications(viewer.id, cursor);
  // Seeing them counts as reading them (the badge catches up on its next poll).
  const unreadIds = items.filter((n) => n.unread).flatMap((n) => n.ids);
  if (unreadIds.length) await markRead(viewer.id, unreadIds);

  return (
    <>
      <PageHeader
        title="Notifications"
        right={
          <form action={markAllReadAction}>
            <button className="btn-ghost text-sm text-muted" type="submit">
              Mark all read
            </button>
          </form>
        }
      />
      {!items.length ? (
        <EmptyState title="Nothing yet" icon={<Bell />}>
          Likes, reposts, replies, mentions and new followers show up here — in order, never “highlighted”.
        </EmptyState>
      ) : (
        <div className="divide-y divide-line">
          {items.map((n) => {
            const meta = META[n.type];
            // Replies, quotes and mentions are conversations: show the full post.
            if ((n.type === "reply" || n.type === "quote" || n.type === "mention") && n.post) {
              return (
                <div key={n.id} className={n.unread ? "bg-accent-soft/40" : ""}>
                  <PostCard item={{ key: n.id, post: n.post }} viewer={viewer} />
                </div>
              );
            }
            return (
              <div key={n.id} className={`flex gap-3 px-4 py-3 ${n.unread ? "bg-accent-soft/40" : ""}`}>
                <div className={`w-11 shrink-0 pt-1 text-right ${meta.color}`}>
                  <span className="inline-block">{meta.icon}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex -space-x-1.5">
                    {n.actors.slice(0, 8).map((a) => (
                      <Link key={a.id} href={`/@${a.username}`} title={a.displayName} className="rounded-full ring-2 ring-bg">
                        <Avatar user={a} size={32} />
                      </Link>
                    ))}
                  </div>
                  <p className="mt-2 text-[15px]">
                    <Link href={`/@${n.actors[0].username}`} className="font-bold hover:underline">
                      {n.actors[0].displayName}
                    </Link>
                    {n.actors.length > 1 ? ` and ${n.actors.length - 1} ${n.actors.length === 2 ? "other" : "others"}` : ""} {meta.verb} ·{" "}
                    <RelativeTime date={n.createdAt} className="text-muted" />
                  </p>
                  {n.post ? (
                    <Link href={`/p/${n.post.id}`} className="mt-1 line-clamp-3 block text-[15px] text-muted hover:text-ink">
                      {n.post.body || (n.post.media.length ? "📷 Photo" : "")}
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {nextCursor ? (
        <div className="px-4 py-5 text-center">
          <Link href={`/notifications?cursor=${nextCursor}`} className="btn-outline">
            Older notifications
          </Link>
        </div>
      ) : null}
    </>
  );
}
