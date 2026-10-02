export default function Loading() {
  return (
    <div className="divide-y divide-line" aria-busy="true" aria-label="Loading">
      <div className="h-[53px] border-b border-line" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3 px-4 py-4">
          <div className="size-11 shrink-0 animate-pulse rounded-full bg-surface-2" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 w-1/3 animate-pulse rounded bg-surface-2" />
            <div className="h-3 w-full animate-pulse rounded bg-surface-2" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-surface-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
