"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type TabDef = { href: string; label: string; exact?: boolean };

/** Link tabs that highlight based on the current URL (or `activeHref` when the server knows better, e.g. query-string tabs). */
export function Tabs({ tabs, activeHref }: { tabs: TabDef[]; activeHref?: string }) {
  const pathname = usePathname();
  // Profile URLs are rewritten (/@jane → /u/jane); compare on the rewritten form too.
  const normalise = (p: string) => p.replace(/^\/@([^/]+)/, "/u/$1").replace(/\/$/, "");
  const current = normalise(pathname ?? "");
  return (
    <nav className="flex overflow-x-auto scroll-thin" role="tablist">
      {tabs.map((t) => {
        const target = normalise(t.href.split("?")[0]);
        const active =
          activeHref !== undefined
            ? t.href === activeHref
            : t.exact
              ? current === target
              : current === target || current.startsWith(`${target}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            role="tab"
            aria-selected={active}
            className="relative flex-1 whitespace-nowrap px-4 py-3.5 text-center text-[15px] font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-ink aria-selected:text-ink"
          >
            {t.label}
            {active ? <span className="absolute inset-x-0 bottom-0 mx-auto h-1 w-14 rounded-full bg-accent" /> : null}
          </Link>
        );
      })}
    </nav>
  );
}
