export function EmptyState({ title, children, icon }: { title: string; children?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-8 py-16 text-center">
      {icon ? <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">{icon}</div> : null}
      <h2 className="font-display text-2xl font-extrabold tracking-tight">{title}</h2>
      {children ? <div className="mt-2 max-w-sm text-[15px] text-muted">{children}</div> : null}
    </div>
  );
}
