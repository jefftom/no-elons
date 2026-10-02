import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { QuoteCard } from "@/components/post-card";
import { getViewerInfo, requireViewer } from "@/server/auth/viewer";
import { getPost } from "@/server/services/feeds";
import { getUserById } from "@/server/services/users";
import { isUuid } from "@/lib/ids";
import { ReportForm } from "./report-form";

export const metadata = { title: "Report" };

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ post?: string; user?: string }> }) {
  const sp = await searchParams;
  await requireViewer(`/report?${new URLSearchParams(sp as Record<string, string>).toString()}`);
  const viewer = (await getViewerInfo())!;
  const post = isUuid(sp.post) ? await getPost(sp.post, viewer.id) : null;
  const user = !post && isUuid(sp.user) ? await getUserById(sp.user) : null;
  if (!post && !user) notFound();

  return (
    <>
      <PageHeader title={post ? "Report post" : `Report @${user!.username}`} back />
      <div className="p-4">
        <p className="mb-4 text-[15px] text-muted">
          Reports go to the moderation team. You stay anonymous to the person you report. Whatever we decide, the outcome is published (without your name) in the{" "}
          <a href="/transparency" className="link">
            transparency log
          </a>
          .
        </p>
        {post && post.state === "ok" ? <QuoteCard quote={post} /> : null}
        <div className="mt-4">
          <ReportForm postId={post?.id} userId={user?.id} />
        </div>
      </div>
    </>
  );
}
