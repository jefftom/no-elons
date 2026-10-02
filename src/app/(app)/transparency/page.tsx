import Link from "next/link";
import { Eye } from "lucide-react";
import { EmptyState } from "@/components/feed";
import { PageHeader } from "@/components/page-header";
import { transparencyLog, transparencyStats } from "@/server/services/moderation";
import { parseCursor } from "@/lib/ids";
import { ruleTitle } from "@/lib/rules";
import { fullTimestamp } from "@/lib/time";

export const metadata = {
  title: "Transparency log",
  description: "Every moderation action taken on NoElons, published as it happens.",
};

const ACTION_LABEL: Record<string, string> = {
  remove_post: "Post removed",
  restore_post: "Post restored",
  suspend_user: "Account suspended",
  unsuspend_user: "Suspension lifted",
  dismiss_report: "Report dismissed",
};

const ACTION_STYLE: Record<string, string> = {
  remove_post: "bg-danger/10 text-danger",
  suspend_user: "bg-danger/10 text-danger",
  restore_post: "bg-repost-soft text-repost",
  unsuspend_user: "bg-repost-soft text-repost",
  dismiss_report: "bg-surface-2 text-muted",
};

export default async function TransparencyPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  const cursor = parseCursor((await searchParams).cursor);
  const [{ items, nextCursor }, stats] = await Promise.all([transparencyLog(cursor), transparencyStats(30)]);
  return (
    <>
      <PageHeader title="Transparency log" subtitle="Every moderation action, in public" />
      <section className="border-b border-line p-4">
        <p className="text-[15px]">
          “No owner override” only means something if you can check. Every removal, suspension, restoration and dismissed report is listed here the moment it happens.
          Moderators aren&apos;t named (to protect them from harassment), but their actions always are.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Reports (30d)", n: stats.reportsReceived },
            { label: "Posts removed", n: stats.byAction.remove_post ?? 0 },
            { label: "Suspensions", n: stats.byAction.suspend_user ?? 0 },
            { label: "Dismissed", n: stats.byAction.dismiss_report ?? 0 },
          ].map((s) => (
            <div key={s.label} className="card p-3">
              <div className="font-display text-2xl font-black">{s.n}</div>
              <div className="text-xs font-semibold text-muted">{s.label}</div>
            </div>
          ))}
        </div>
        {stats.byRule.length ? (
          <div className="mt-4">
            <h2 className="mb-2 text-sm font-bold">Actions by rule (30 days)</h2>
            <ul className="flex flex-col gap-1.5">
              {stats.byRule.map((r) => {
                const max = Math.max(...stats.byRule.map((x) => x.n));
                return (
                  <li key={r.rule} className="flex items-center gap-3 text-sm">
                    <span className="w-48 shrink-0 truncate">{ruleTitle(r.rule)}</span>
                    <span className="h-2 rounded-full bg-accent" style={{ width: `${Math.max(6, (r.n / max) * 100)}%` }} />
                    <span className="tabular-nums text-muted">{r.n}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </section>
      {!items.length ? (
        <EmptyState title="Nothing to report (literally)" icon={<Eye />}>
          No moderation actions yet.
        </EmptyState>
      ) : (
        <ol className="divide-y divide-line">
          {items.map((a) => (
            <li key={a.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${ACTION_STYLE[a.action]}`}>{ACTION_LABEL[a.action]}</span>
                {a.subjectUsername ? (
                  <span className="font-semibold">@{a.subjectUsername}</span>
                ) : null}
                {a.rule ? <span className="text-muted">· {ruleTitle(a.rule)}</span> : null}
                <time className="ml-auto text-xs text-muted" dateTime={a.createdAt.toISOString()}>
                  {fullTimestamp(a.createdAt)}
                </time>
              </div>
              {a.publicNote ? <p className="mt-1.5 text-[15px]">{a.publicNote}</p> : null}
              {a.postId && a.action === "restore_post" ? (
                <Link href={`/p/${a.postId}`} className="mt-1 inline-block text-sm link">
                  View post
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
      )}
      {nextCursor ? (
        <div className="px-4 py-5 text-center">
          <Link href={`/transparency?cursor=${nextCursor}`} className="btn-outline">
            Older entries
          </Link>
        </div>
      ) : null}
    </>
  );
}
