import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { QuoteCard } from "@/components/post-card";
import { requireModerator } from "@/server/auth/viewer";
import { hydratePosts } from "@/server/services/hydration";
import { isUuid } from "@/lib/ids";
import { ruleTitle } from "@/lib/rules";
import { RemovePostForm, RestorePostForm } from "../../mod-forms";

export const metadata = { title: "Moderate post" };

export default async function ModeratePostPage({ params }: { params: Promise<{ id: string }> }) {
  const mod = await requireModerator();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const post = (await hydratePosts([id], mod.id, { hidden: new Set(), reveal: true })).get(id);
  if (!post || post.state === "deleted") notFound();
  return (
    <>
      <PageHeader title="Moderate post" subtitle={`by @${post.author.username}`} back />
      <div className="flex flex-col gap-4 p-4">
        {post.state === "removed" ? (
          <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">Removed for: {ruleTitle(post.removalRule)}</p>
        ) : null}
        <QuoteCard quote={post} />
        <div className="rounded-xl border border-line p-4">{post.state === "removed" ? <RestorePostForm postId={post.id} /> : <RemovePostForm postId={post.id} />}</div>
      </div>
    </>
  );
}
