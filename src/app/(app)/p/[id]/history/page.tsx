import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PostBody } from "@/components/post-body";
import { getViewerInfo } from "@/server/auth/viewer";
import { getPost } from "@/server/services/feeds";
import { getRevisions } from "@/server/services/posts";
import { isUuid } from "@/lib/ids";
import { fullTimestamp } from "@/lib/time";
import Link from "next/link";

export const metadata = { title: "Edit history" };

export default async function HistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const viewer = await getViewerInfo();
  const post = await getPost(id, viewer?.id ?? null);
  if (!post || post.state !== "ok") notFound();
  const revisions = await getRevisions(id);

  const versions = [
    ...revisions.map((r) => ({ key: r.id, body: r.body, cw: r.contentWarning, at: r.publishedAt, current: false })),
    { key: "current", body: post.body, cw: post.contentWarning, at: post.editedAt ?? post.createdAt, current: true },
  ].reverse();

  return (
    <>
      <PageHeader title="Edit history" subtitle={`@${post.author.username} · ${versions.length} versions`} back />
      <p className="border-b border-line px-4 py-3 text-sm text-muted">
        Every edit is public on NoElons. Newest first.{" "}
        <Link href={`/p/${id}`} className="link">
          Back to the post
        </Link>
      </p>
      <ol className="divide-y divide-line">
        {versions.map((v, i) => (
          <li key={v.key} className="px-4 py-4">
            <div className="mb-2 flex items-center gap-2 text-sm">
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${v.current ? "bg-accent-soft text-accent" : "bg-surface-2 text-muted"}`}>
                {v.current ? "Current" : i === versions.length - 1 ? "Original" : "Earlier version"}
              </span>
              <time className="text-muted" dateTime={v.at.toISOString()}>
                {fullTimestamp(v.at)}
              </time>
            </div>
            {v.cw ? (
              <p className="mb-1 text-sm">
                <span className="font-bold text-warn">CW:</span> {v.cw}
              </p>
            ) : null}
            <PostBody body={v.body || "(no text)"} className="text-[16px] leading-relaxed" />
          </li>
        ))}
      </ol>
    </>
  );
}
