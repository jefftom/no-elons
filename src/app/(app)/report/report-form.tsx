"use client";

import { useActionState } from "react";
import { reportAction } from "@/app/actions/moderation";
import { FormMessage, SubmitButton } from "@/components/submit-button";
import { RULES } from "@/lib/rules";

export function ReportForm({ postId, userId }: { postId?: string; userId?: string }) {
  const [state, action] = useActionState(reportAction, { ok: true });
  return (
    <form action={action} className="flex flex-col gap-4">
      {postId ? <input type="hidden" name="postId" value={postId} /> : null}
      {userId ? <input type="hidden" name="userId" value={userId} /> : null}
      <fieldset className="flex flex-col gap-2">
        <legend className="label">Which rule is being broken?</legend>
        {RULES.map((r) => (
          <label key={r.code} className="flex cursor-pointer gap-3 rounded-xl border border-line p-3 hover:bg-surface-2 has-[:checked]:border-accent has-[:checked]:bg-accent-soft/50">
            <input type="radio" name="rule" value={r.code} required className="mt-1 accent-[var(--accent)]" />
            <span>
              <span className="block font-semibold">{r.title}</span>
              <span className="block text-sm text-muted">{r.body}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div>
        <label htmlFor="details" className="label">
          Anything else? <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea id="details" name="details" rows={3} maxLength={1000} className="input resize-none" placeholder="Context helps moderators decide faster." />
      </div>
      <FormMessage state={state} />
      <div className="flex justify-end">
        <SubmitButton pendingText="Sending…">Send report</SubmitButton>
      </div>
    </form>
  );
}
