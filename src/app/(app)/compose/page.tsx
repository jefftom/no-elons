import { Composer } from "@/components/composer";
import { PageHeader } from "@/components/page-header";
import { QuoteCard } from "@/components/post-card";
import { getViewerInfo, requireViewer } from "@/server/auth/viewer";
import { getPost } from "@/server/services/feeds";
import { isUuid } from "@/lib/ids";

export const metadata = { title: "New post" };

export default async function ComposePage({ searchParams }: { searchParams: Promise<{ quote?: string; reply?: string }> }) {
  const sp = await searchParams;
  await requireViewer("/compose");
  const viewer = (await getViewerInfo())!;
  const quoteId = isUuid(sp.quote) ? sp.quote : undefined;
  const replyId = isUuid(sp.reply) ? sp.reply : undefined;
  const quoted = quoteId ? await getPost(quoteId, viewer.id) : null;
  const replyTo = replyId ? await getPost(replyId, viewer.id) : null;

  return (
    <>
      <PageHeader title={quoted ? "Quote post" : replyTo ? "Reply" : "New post"} back />
      {replyTo && replyTo.state === "ok" ? (
        <p className="px-4 pt-3 text-sm text-muted">
          Replying to <span className="font-semibold text-accent">@{replyTo.author.username}</span>
        </p>
      ) : null}
      <Composer
        viewer={viewer}
        autoFocus
        openAfterPost
        quoteOfId={quoted && quoted.state === "ok" ? quoted.id : undefined}
        replyToId={replyTo && replyTo.state === "ok" ? replyTo.id : undefined}
        placeholder={quoted ? "Add your take…" : replyTo ? "Post your reply" : "What's going on?"}
      >
        {quoted ? <QuoteCard quote={quoted.state === "ok" ? quoted : "unavailable"} /> : null}
      </Composer>
    </>
  );
}
