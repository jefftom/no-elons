import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Composer } from "@/components/composer";
import { PageHeader } from "@/components/page-header";
import { PostCard, Tombstone } from "@/components/post-card";
import { getViewerInfo } from "@/server/auth/viewer";
import { getPost, getThread, resolveRepost } from "@/server/services/feeds";
import { isUuid, parseCursor } from "@/lib/ids";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ cursor?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id)) return {};
  const post = await getPost(id, null);
  if (!post || post.state !== "ok") return { title: "Post" };
  const text = post.contentWarning ? `CW: ${post.contentWarning}` : post.body.slice(0, 160);
  return {
    title: `${post.author.displayName}: “${text.slice(0, 60)}${text.length > 60 ? "…" : ""}”`,
    description: text,
    openGraph: {
      title: `${post.author.displayName} (@${post.author.username})`,
      description: text,
      images: !post.contentWarning && post.media[0] ? [{ url: post.media[0].url, alt: post.media[0].alt }] : undefined,
    },
  };
}

export default async function PostPage({ params, searchParams }: Props) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const original = await resolveRepost(id);
  if (original) redirect(`/p/${original}`);

  const cursor = parseCursor((await searchParams).cursor);
  const viewer = await getViewerInfo();
  const thread = await getThread(id, viewer?.id ?? null, cursor);
  if (!thread) notFound();
  const { ancestors, post, selfThread, replies, nextCursor } = thread;

  return (
    <>
      <PageHeader title="Post" back />
      {ancestors.length ? (
        <div>
          {ancestors.map((a) =>
            a.state === "ok" ? (
              <PostCard key={a.id} item={{ key: a.id, post: a }} viewer={viewer} threadLine />
            ) : (
              <Tombstone key={a.id} post={a} />
            ),
          )}
        </div>
      ) : null}

      {post.state === "ok" ? <PostCard item={{ key: post.id, post }} viewer={viewer} variant="focus" /> : <Tombstone post={post} />}

      {selfThread.length ? (
        <div className="border-b border-line">
          {selfThread.map((p, i) => (
            <PostCard key={p.id} item={{ key: p.id, post: p }} viewer={viewer} threadLine={i < selfThread.length - 1} />
          ))}
        </div>
      ) : null}

      <div id="reply">
        {viewer && post.state === "ok" ? (
          <div className="border-b border-line">
            <Composer viewer={viewer} replyToId={post.id} placeholder={`Reply to @${post.author.username}`} />
          </div>
        ) : !viewer ? (
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 text-[15px]">
            <span className="text-muted">Join the conversation.</span>
            <Link href={`/login?next=/p/${post.id}`} className="btn-primary">
              Log in to reply
            </Link>
          </div>
        ) : null}
      </div>

      <div className="divide-y divide-line">
        {replies.map((item) => (
          <PostCard key={item.key} item={item} viewer={viewer} />
        ))}
      </div>
      {nextCursor ? (
        <div className="px-4 py-5 text-center">
          <Link href={`/p/${post.id}?cursor=${nextCursor}`} className="btn-outline">
            More replies
          </Link>
        </div>
      ) : replies.length ? (
        <p className="px-4 py-6 text-center text-sm text-muted">That&apos;s the whole conversation.</p>
      ) : null}
    </>
  );
}
