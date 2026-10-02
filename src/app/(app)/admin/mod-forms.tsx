"use client";

import { useActionState } from "react";
import {
  modDismissAction,
  modRemovePostAction,
  modRestorePostAction,
  modSuspendAction,
  modUnsuspendAction,
} from "@/app/actions/moderation";
import { FormMessage, SubmitButton } from "@/components/submit-button";
import { RULES } from "@/lib/rules";

function RuleSelect({ defaultRule }: { defaultRule?: string }) {
  return (
    <select name="rule" defaultValue={defaultRule} required className="input py-2 text-sm" aria-label="Rule">
      {RULES.map((r) => (
        <option key={r.code} value={r.code}>
          {r.title}
        </option>
      ))}
    </select>
  );
}

function NoteInput() {
  return <input name="note" maxLength={500} placeholder="Public note for the transparency log (optional)" className="input py-2 text-sm" aria-label="Public note" />;
}

export function RemovePostForm({ postId, defaultRule }: { postId: string; defaultRule?: string }) {
  const [state, action] = useActionState(modRemovePostAction, { ok: true });
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="postId" value={postId} />
      <RuleSelect defaultRule={defaultRule} />
      <NoteInput />
      <FormMessage state={state} />
      <SubmitButton pendingText="Removing…" className="btn-danger">
        Remove post
      </SubmitButton>
    </form>
  );
}

export function RestorePostForm({ postId }: { postId: string }) {
  const [state, action] = useActionState(modRestorePostAction, { ok: true });
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="postId" value={postId} />
      <NoteInput />
      <FormMessage state={state} />
      <SubmitButton pendingText="Restoring…" className="btn-outline">
        Restore post
      </SubmitButton>
    </form>
  );
}

export function SuspendForm({ userId, defaultRule }: { userId: string; defaultRule?: string }) {
  const [state, action] = useActionState(modSuspendAction, { ok: true });
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="userId" value={userId} />
      <RuleSelect defaultRule={defaultRule} />
      <NoteInput />
      <FormMessage state={state} />
      <SubmitButton pendingText="Suspending…" className="btn-danger">
        Suspend account
      </SubmitButton>
    </form>
  );
}

export function UnsuspendForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(modUnsuspendAction, { ok: true });
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="userId" value={userId} />
      <NoteInput />
      <FormMessage state={state} />
      <SubmitButton pendingText="Restoring…" className="btn-outline">
        Lift suspension
      </SubmitButton>
    </form>
  );
}

export function DismissForm({ reportId }: { reportId: string }) {
  const [state, action] = useActionState(modDismissAction, { ok: true });
  return (
    <form action={action}>
      <input type="hidden" name="reportId" value={reportId} />
      <FormMessage state={state} />
      <SubmitButton pendingText="Dismissing…" className="btn-outline w-full">
        Dismiss — no violation
      </SubmitButton>
    </form>
  );
}
