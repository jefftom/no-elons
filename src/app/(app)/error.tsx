"use client";

import { EmptyState } from "@/components/empty-state";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <EmptyState title="Something broke">
      <p>That one&apos;s on us. {error.digest ? <span className="font-mono text-xs">({error.digest})</span> : null}</p>
      <button type="button" onClick={reset} className="btn-primary mt-4">
        Try again
      </button>
    </EmptyState>
  );
}
