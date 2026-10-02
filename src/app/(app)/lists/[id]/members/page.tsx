import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { PageHeader } from "@/components/page-header";
import { deleteListAction, removeListMemberAction } from "@/app/actions/lists";
import { requireViewer } from "@/server/auth/viewer";
import { getList, getListMembers } from "@/server/services/lists";
import { isUuid } from "@/lib/ids";
import { AddMemberForm, EditListForm } from "../../list-forms";

export const metadata = { title: "Edit list" };

export default async function ListMembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const viewer = await requireViewer(`/lists/${id}/members`);
  const list = await getList(id, viewer.id);
  if (!list || list.owner.id !== viewer.id) notFound();
  const members = await getListMembers(id);
  return (
    <>
      <PageHeader title="Edit list" subtitle={list.name} back />
      <section className="border-b border-line p-4">
        <EditListForm list={list} />
      </section>
      <section className="border-b border-line p-4">
        <h2 className="mb-2 font-display text-lg font-extrabold">Members ({members.length})</h2>
        <AddMemberForm listId={id} />
      </section>
      <ul className="divide-y divide-line">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar user={m} size={40} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold">{m.displayName}</div>
              <div className="truncate text-sm text-muted">@{m.username}</div>
            </div>
            <form action={removeListMemberAction}>
              <input type="hidden" name="listId" value={id} />
              <input type="hidden" name="userId" value={m.id} />
              <button type="submit" className="btn-outline text-sm">
                Remove
              </button>
            </form>
          </li>
        ))}
      </ul>
      <section className="p-4">
        <form action={deleteListAction}>
          <input type="hidden" name="listId" value={id} />
          <button type="submit" className="btn-ghost text-danger">
            Delete this list
          </button>
        </form>
      </section>
    </>
  );
}
