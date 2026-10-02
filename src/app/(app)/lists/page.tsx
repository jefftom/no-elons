import Link from "next/link";
import { List, Lock } from "lucide-react";
import { EmptyState } from "@/components/feed";
import { PageHeader } from "@/components/page-header";
import { requireViewer } from "@/server/auth/viewer";
import { listsOwnedBy } from "@/server/services/lists";
import { CreateListForm } from "./list-forms";

export const metadata = { title: "Lists" };

export default async function ListsPage() {
  const viewer = await requireViewer("/lists");
  const lists = await listsOwnedBy(viewer.id, viewer.id);
  return (
    <>
      <PageHeader title="Lists" subtitle="Hand-picked timelines, the old-school way" />
      <div className="border-b border-line p-4">
        <CreateListForm />
      </div>
      {lists.length ? (
        <ul className="divide-y divide-line">
          {lists.map((l) => (
            <li key={l.id}>
              <Link href={`/lists/${l.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2/50">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                  <List size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 font-bold">
                    {l.name} {l.isPrivate ? <Lock size={14} className="text-muted" /> : null}
                  </span>
                  <span className="block truncate text-sm text-muted">
                    {l.memberCount} {l.memberCount === 1 ? "member" : "members"}
                    {l.description ? ` · ${l.description}` : ""}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No lists yet" icon={<List />}>
          Make a list for your mutuals, a hobby, or a news beat. List timelines are chronological too.
        </EmptyState>
      )}
    </>
  );
}
