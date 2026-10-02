"use client";

import { useActionState } from "react";
import { addListMemberAction, createListAction, updateListAction } from "@/app/actions/lists";
import { FormMessage, SubmitButton } from "@/components/submit-button";
import { LIMITS } from "@/lib/limits";

export function CreateListForm() {
  const [state, action] = useActionState(createListAction, { ok: true });
  return (
    <form action={action} className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-extrabold">New list</h2>
      <input name="name" required maxLength={LIMITS.listNameChars} placeholder="Name (e.g. “Sourdough people”)" className="input" />
      <input name="description" maxLength={LIMITS.listDescriptionChars} placeholder="Description (optional)" className="input" />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isPrivate" className="size-4 accent-[var(--accent)]" /> Private (only you can see it)
        </label>
        <SubmitButton pendingText="Creating…">Create list</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function EditListForm({ list }: { list: { id: string; name: string; description: string; isPrivate: boolean } }) {
  const [state, action] = useActionState(updateListAction, { ok: true });
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="listId" value={list.id} />
      <input name="name" required maxLength={LIMITS.listNameChars} defaultValue={list.name} className="input" aria-label="List name" />
      <input name="description" maxLength={LIMITS.listDescriptionChars} defaultValue={list.description} placeholder="Description" className="input" aria-label="Description" />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isPrivate" defaultChecked={list.isPrivate} className="size-4 accent-[var(--accent)]" /> Private
        </label>
        <SubmitButton pendingText="Saving…" className="btn-outline">
          Save
        </SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function AddMemberForm({ listId }: { listId: string }) {
  const [state, action] = useActionState(addListMemberAction, { ok: true });
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="listId" value={listId} />
      <div className="flex gap-2">
        <input name="username" required placeholder="@username" className="input" aria-label="Username to add" />
        <SubmitButton pendingText="Adding…">Add</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
