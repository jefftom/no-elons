import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-accent/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -right-24 size-96 rounded-full bg-repost/15 blur-3xl" />
      <Link href="/" className="relative mb-8">
        <Logo />
      </Link>
      <div className="card relative w-full max-w-[420px] p-6 shadow-card sm:p-8">{children}</div>
      <p className="relative mt-6 max-w-sm text-center text-xs text-muted">
        By joining you agree to the{" "}
        <Link href="/charter#rules" className="underline">
          house rules
        </Link>
        . We promise to keep{" "}
        <Link href="/charter" className="underline">
          ours
        </Link>
        .
      </p>
    </div>
  );
}
