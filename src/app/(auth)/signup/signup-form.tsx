"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signupAction } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/submit-button";

export function SignupForm() {
  const [state, action] = useActionState(signupAction, { ok: true });
  const [username, setUsername] = useState("");
  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <div>
        <label htmlFor="displayName" className="label">
          Name
        </label>
        <input id="displayName" name="displayName" autoComplete="name" maxLength={50} required className="input" placeholder="What should people call you?" />
      </div>
      <div>
        <label htmlFor="username" className="label">
          Username
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">@</span>
          <input
            id="username"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            minLength={3}
            maxLength={20}
            pattern="[A-Za-z0-9_]{3,20}"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            className="input pl-8"
          />
        </div>
        <p className="mt-1 text-xs text-muted">{username ? `noelons.com/@${username}` : "3–20 letters, numbers or underscores."}</p>
      </div>
      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required className="input" />
        <p className="mt-1 text-xs text-muted">At least 10 characters. A passphrase is great.</p>
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Creating your account…" className="btn-primary h-11 text-[15px]">
        Create account
      </SubmitButton>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-accent hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
