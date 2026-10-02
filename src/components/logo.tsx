/**
 * The mark: a speech bubble with a "no" sign in it. Social media, minus the
 * one guy.
 */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="var(--accent)" />
      <path
        d="M16 18h32a6 6 0 0 1 6 6v16a6 6 0 0 1-6 6H30l-9 8v-8h-5a6 6 0 0 1-6-6V24a6 6 0 0 1 6-6z"
        fill="#fff"
      />
      <circle cx="32" cy="32" r="9" fill="none" stroke="var(--accent)" strokeWidth="4" />
      <path d="M25.6 38.4l12.8-12.8" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark />
      <span className="font-display text-[22px] font-black tracking-tight">
        no<span className="text-accent">elons</span>
      </span>
    </span>
  );
}
