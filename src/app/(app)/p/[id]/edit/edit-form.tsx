"use client";

import { useActionState } from "react";
import { editPostAction } from "@/app/actions/posts";
import { FormMessage, SubmitButton } from "@/components/submit-button";
import { LIMITS } from "@/lib/limits";

export function EditForm({ postId, body, contentWarning }: { postId: string; body: string; contentWarning: string }) {
  const [state, action] = useActionState(editPostAction, { ok: true });
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="postId" value={postId} />
      <div>
        <label htmlFor="contentWarning" className="label">
          Content warning <span className="font-normal text-muted">(optional)</span>
        </label>
        <input id="contentWarning" name="contentWarning" defaultValue={contentWarning} maxLength={LIMITS.contentWarningChars} className="input" />
      </div>
      <div>
        <label htmlFor="body" className="label">
          Post
        </label>
        <textarea id="body" name="body" defaultValue={body} rows={6} className="input resize-y text-[17px] leading-7" />
      </div>
      <FormMessage state={state} />
      <div className="flex justify-end">
        <SubmitButton pendingText="Saving…">Save edit</SubmitButton>
      </div>
    </form>
  );
}
