"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingText,
  className = "btn-primary",
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? (pendingText ?? "Working…") : children}
    </button>
  );
}

export function FormMessage({ state }: { state: { ok: boolean; error?: string } | undefined }) {
  if (!state || state.ok || !state.error) return null;
  return (
    <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm font-medium text-danger">
      {state.error}
    </p>
  );
}
