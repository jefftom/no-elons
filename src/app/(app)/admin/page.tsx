import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { EmptyState } from "@/components/feed";
import { PageHeader } from "@/components/page-header";
import { QuoteCard } from "@/components/post-card";
import { RelativeTime } from "@/components/relative-time";
import { requireModerator } from "@/server/auth/viewer";
import { openReports } from "@/server/services/moderation";
import { parseCursor } from "@/lib/ids";
import { ruleTitle } from "@/lib/rules";
import { DismissForm, RemovePostForm, SuspendForm } from "./mod-forms";

export const metadata = { title: "Moderation" };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  const mod = await requireModerator();
  const cursor = parseCursor((await searchParams).cursor);
  const { items, nextCursor } = await openReports(mod.id, cursor);
  return (
    <>
      <PageHeader title="Moderation queue" subtitle="Every action you take here is published in the transparency log" />
      {!items.length ? (
        <EmptyState title="Queue's clear" icon={<ShieldCheck />}>
          No open reports. Go touch grass. 🌱
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((r) => (
            <li key={r.id} className="px-4 py-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full bg-danger/10 px-2 py-0.5 font-bold text-danger">{ruleTitle(r.rule)}</span>
                {r.sameTargetCount > 1 ? <span className="rounded-full bg-surface-2 px-2 py-0.5 font-semibold">{r.sameTargetCount} reports</span> : null}
                <span className="text-muted">
                  reported by {r.reporter ? `@${r.reporter.username}` : "a deleted account"} · <RelativeTime date={r.createdAt} />
                </span>
              </div>
              {r.details ? <p className="mt-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">“{r.details}”</p> : null}
              <div className="mt-3 flex items-center gap-2">
                <Avatar user={r.subject} size={28} />
                <Link href={`/admin/user/${r.subject.username}`} className="font-semibold hover:underline">
                  @{r.subject.username}
                </Link>
                {r.subject.suspended ? <span className="text-xs font-bold text-danger">SUSPENDED</span> : null}
              </div>
              {r.post ? (
                <div className="mt-2">
                  {r.post.state === "removed" ? <p className="text-xs font-bold text-danger">Already removed</p> : null}
                  <QuoteCard quote={r.post} />
                </div>
              ) : null}
              <div className="mt-3 flex flex-col gap-2">
                {r.post && r.post.state !== "removed" ? (
                  <details className="rounded-xl border border-line">
                    <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-danger">Remove this post…</summary>
                    <div className="px-3 pb-3">
                      <RemovePostForm postId={r.post.id} defaultRule={r.rule} />
                    </div>
                  </details>
                ) : null}
                {!r.subject.suspended ? (
                  <details className="rounded-xl border border-line">
                    <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-danger">Suspend @{r.subject.username}…</summary>
                    <div className="px-3 pb-3">
                      <SuspendForm userId={r.subject.id} defaultRule={r.rule} />
                    </div>
                  </details>
                ) : null}
                <DismissForm reportId={r.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {nextCursor ? (
        <div className="px-4 py-5 text-center">
          <Link href={`/admin?cursor=${nextCursor}`} className="btn-outline">
            More reports
          </Link>
        </div>
      ) : null}
    </>
  );
}
