import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { requireViewer } from "@/server/auth/viewer";
import { AppError } from "@/server/errors";
import { editWindowOpen, getOwnPost } from "@/server/services/posts";
import { isUuid } from "@/lib/ids";
import { LIMITS } from "@/lib/limits";
import { EditForm } from "./edit-form";

export const metadata = { title: "Edit post" };

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const viewer = await requireViewer(`/p/${id}/edit`);
  let post;
  try {
    post = await getOwnPost(viewer.id, id);
  } catch (err) {
    if (err instanceof AppError) notFound();
    throw err;
  }
  if (post.repostOfId || !editWindowOpen(post.createdAt)) redirect(`/p/${id}`);
  const minutesLeft = Math.max(1, Math.ceil(LIMITS.editWindowMinutes - (Date.now() - post.createdAt.getTime()) / 60_000));

  return (
    <>
      <PageHeader title="Edit post" subtitle={`${minutesLeft} min left to edit`} back />
      <div className="p-4">
        <p className="mb-4 rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">
          Edits leave receipts: the previous version stays visible in this post&apos;s public history. Photos can&apos;t be changed
          — delete and re-post instead.
        </p>
        <EditForm postId={post.id} body={post.body} contentWarning={post.contentWarning ?? ""} />
      </div>
    </>
  );
}
