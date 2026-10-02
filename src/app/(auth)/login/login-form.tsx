"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/submit-button";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(loginAction, { ok: true });
  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="identifier" className="label">
          Username or email
        </label>
        <input id="identifier" name="identifier" autoComplete="username" autoCapitalize="none" required className="input" />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Logging in…" className="btn-primary h-11 text-[15px]">
        Log in
      </SubmitButton>
      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
