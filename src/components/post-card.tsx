import Link from "next/link";
import { Pin, Repeat2, ShieldCheck } from "lucide-react";
import { editWindowOpen } from "@/lib/limits";
import { ruleTitle } from "@/lib/rules";
import { fullTimestamp } from "@/lib/time";
import type { FeedItem, PostView, UserSummary } from "@/server/views";
import { Avatar } from "./avatar";
import { MediaGrid } from "./media-grid";
import { PostActions } from "./post-actions";
import { PostBody } from "./post-body";
import { PostMenu } from "./post-menu";
import { RelativeTime } from "./relative-time";
import type { ViewerInfo } from "./types";

export function RoleBadge({ role }: { role: UserSummary["role"] }) {
  if (role === "user") return null;
  return (
    <span
      title={role === "admin" ? "NoElons admin" : "Community moderator"}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-accent-soft px-1.5 py-px text-[11px] font-bold text-accent"
    >
      <ShieldCheck size={11} /> {role === "admin" ? "Team" : "Mod"}
    </span>
  );
}

function AuthorLine({ post }: { post: PostView }) {
  return (
    <span className="flex min-w-0 items-baseline gap-1 text-[15px] leading-5">
      <Link href={`/@${post.author.username}`} className="pointer-events-auto relative truncate font-bold hover:underline">
        {post.author.displayName}
      </Link>
      <RoleBadge role={post.author.role} />
      <span className="truncate text-muted">@{post.author.username}</span>
    </span>
  );
}

function ContentWarning({ warning, children }: { warning: string | null; children: React.ReactNode }) {
  if (!warning) return <>{children}</>;
  return (
    <details className="group pointer-events-auto relative mt-1">
      <summary className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm">
        <span className="rounded-md bg-warn/15 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-warn">CW</span>
        <span className="font-semibold">{warning}</span>
        <span className="ml-auto text-xs font-semibold text-accent group-open:hidden">Show</span>
        <span className="ml-auto hidden text-xs font-semibold text-accent group-open:inline">Hide</span>
      </summary>
      <div className="pointer-events-none">{children}</div>
    </details>
  );
}

export function QuoteCard({ quote }: { quote: PostView["quote"] }) {
  if (!quote) return null;
  if (quote === "unavailable") {
    return <div className="mt-3 rounded-2xl border border-line bg-surface-2 px-4 py-3 text-sm text-muted">This post is unavailable.</div>;
  }
  return (
    <Link
      href={`/p/${quote.id}`}
      className="pointer-events-auto relative mt-3 block overflow-hidden rounded-2xl border border-line transition hover:bg-surface-2/60"
    >
      <div className="px-3.5 pt-3">
        <div className="flex items-center gap-1.5 text-[14px]">
          <Avatar user={quote.author} size={20} />
          <span className="truncate font-bold">{quote.author.displayName}</span>
          <span className="truncate text-muted">@{quote.author.username}</span>
          <span className="text-muted">·</span>
          <RelativeTime date={quote.createdAt} className="shrink-0 text-muted" />
        </div>
        {quote.contentWarning ? (
          <p className="mt-1.5 pb-3 text-sm text-muted">
            <span className="font-bold text-warn">CW:</span> {quote.contentWarning}
          </p>
        ) : (
          <div className="mt-1 line-clamp-6 pb-3 text-[15px] leading-snug">
            <span className="post-text">{quote.body}</span>
          </div>
        )}
      </div>
      {!quote.contentWarning && quote.media.length ? (
        <div className="-mt-1 grid grid-cols-4 gap-0.5">
          {quote.media.slice(0, 4).map((m) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={m.id} src={m.thumbUrl} alt={m.alt} className="aspect-square w-full object-cover" style={{ backgroundColor: m.color }} loading="lazy" />
          ))}
        </div>
      ) : null}
    </Link>
  );
}

export function Tombstone({ post }: { post: PostView }) {
  const text =
    post.state === "deleted" ? (
      "This post was deleted by its author."
    ) : post.state === "removed" ? (
      <>
        Removed by moderators for breaking the rule <strong>“{ruleTitle(post.removalRule)}”</strong>.{" "}
        <Link href="/transparency" className="link">
          See the log
        </Link>
        .
      </>
    ) : (
      "This post is unavailable."
    );
  return <div className="mx-4 my-3 rounded-2xl border border-line bg-surface-2 px-4 py-3 text-sm text-muted">{text}</div>;
}

type CardProps = {
  item: FeedItem;
  viewer: ViewerInfo | null;
  /** "feed": compact row that opens the post on click. "focus": the big version on a post page. */
  variant?: "feed" | "focus";
  /** Draw a thread line down to the next post. */
  threadLine?: boolean;
};

export function PostCard({ item, viewer, variant = "feed", threadLine = false }: CardProps) {
  const { post, repostedBy, pinned } = item;
  if (post.state !== "ok") return <Tombstone post={post} />;

  const isOwn = viewer?.id === post.author.id;
  const menu = (
    <PostMenu
      postId={post.id}
      authorId={post.author.id}
      authorUsername={post.author.username}
      isOwn={isOwn}
      canEdit={isOwn && editWindowOpen(post.createdAt)}
      isPinned={!!pinned}
      signedIn={!!viewer}
      isModerator={viewer?.role === "moderator" || viewer?.role === "admin"}
    />
  );
  const actions = (
    <PostActions
      postId={post.id}
      counts={post.counts}
      viewerState={post.viewer}
      hideCounts={viewer?.hideCounts ?? false}
      size={variant === "focus" ? "lg" : "md"}
    />
  );
  const replyContext = post.replyTo?.username ? (
    <div className="mt-0.5 text-sm text-muted">
      Replying to{" "}
      <Link href={`/@${post.replyTo.username}`} className="link pointer-events-auto relative">
        @{post.replyTo.username}
      </Link>
    </div>
  ) : null;

  if (variant === "focus") {
    return (
      <article className="border-b border-line px-4 pt-3 pb-1" id={post.id}>
        <header className="flex items-center gap-3">
          <Link href={`/@${post.author.username}`}>
            <Avatar user={post.author} size={48} />
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/@${post.author.username}`} className="flex items-center gap-1 font-bold hover:underline">
              <span className="truncate">{post.author.displayName}</span>
              <RoleBadge role={post.author.role} />
            </Link>
            <div className="truncate text-[15px] text-muted">@{post.author.username}</div>
          </div>
          {menu}
        </header>
        {replyContext}
        <ContentWarning warning={post.contentWarning}>
          <PostBody body={post.body} className="mt-3 text-[19px] leading-7" />
          <MediaGrid media={post.media} />
          <QuoteCard quote={post.quote} />
        </ContentWarning>
        <div className="mt-4 flex flex-wrap items-center gap-x-1.5 border-b border-line pb-3 text-[15px] text-muted">
          <time dateTime={post.createdAt.toISOString()}>{fullTimestamp(post.createdAt)}</time>
          {post.editedAt ? (
            <>
              <span>·</span>
              <Link href={`/p/${post.id}/history`} className="link">
                Edited — see history
              </Link>
            </>
          ) : null}
        </div>
        {!viewer?.hideCounts && (post.counts.likes || post.counts.reposts || post.counts.quotes) ? (
          <div className="flex gap-5 border-b border-line py-3 text-[15px]">
            {post.counts.reposts ? (
              <span>
                <strong>{post.counts.reposts}</strong> <span className="text-muted">{post.counts.reposts === 1 ? "Repost" : "Reposts"}</span>
              </span>
            ) : null}
            {post.counts.quotes ? (
              <span>
                <strong>{post.counts.quotes}</strong> <span className="text-muted">{post.counts.quotes === 1 ? "Quote" : "Quotes"}</span>
              </span>
            ) : null}
            {post.counts.likes ? (
              <span>
                <strong>{post.counts.likes}</strong> <span className="text-muted">{post.counts.likes === 1 ? "Like" : "Likes"}</span>
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="pb-2">{actions}</div>
      </article>
    );
  }

  return (
    <article className="relative px-4 pt-3 pb-3 transition-colors hover:bg-surface-2/40" id={item.key}>
      {/* The whole row opens the post; real links/buttons sit above this layer. */}
      <Link href={`/p/${post.id}`} className="absolute inset-0 z-0" aria-label={`Post by ${post.author.displayName}`} tabIndex={-1} />
      <div className="pointer-events-none relative z-[1]">
        {repostedBy ? (
          <div className="mb-1 ml-[30px] flex items-center gap-1.5 text-[13px] font-semibold text-muted">
            <Repeat2 size={14} className="shrink-0" />
            <Link href={`/@${repostedBy.username}`} className="pointer-events-auto truncate hover:underline">
              {viewer?.id === repostedBy.id ? "You" : repostedBy.displayName} reposted
            </Link>
          </div>
        ) : null}
        {pinned ? (
          <div className="mb-1 ml-[30px] flex items-center gap-1.5 text-[13px] font-semibold text-muted">
            <Pin size={13} /> Pinned
          </div>
        ) : null}
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <Link href={`/@${post.author.username}`} className="pointer-events-auto">
              <Avatar user={post.author} size={44} />
            </Link>
            {threadLine ? <div className="mt-1 w-0.5 flex-1 rounded-full bg-line" /> : null}
          </div>
          <div className="min-w-0 flex-1">
            <header className="flex items-center gap-1">
              <AuthorLine post={post} />
              <span className="shrink-0 text-muted">·</span>
              <Link href={`/p/${post.id}`} className="pointer-events-auto shrink-0 text-[15px] text-muted hover:underline">
                <RelativeTime date={post.createdAt} />
              </Link>
              {post.editedAt ? (
                <Link href={`/p/${post.id}/history`} className="pointer-events-auto shrink-0 text-xs text-muted hover:underline" title="See edit history">
                  · edited
                </Link>
              ) : null}
              {menu}
            </header>
            {replyContext}
            <ContentWarning warning={post.contentWarning}>
              <PostBody body={post.body} className="mt-0.5 text-[15px] leading-[1.35]" />
              <MediaGrid media={post.media} />
              <QuoteCard quote={post.quote} />
            </ContentWarning>
            {actions}
          </div>
        </div>
      </div>
    </article>
  );
}
