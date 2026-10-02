"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Notification count. Starts from the server-rendered value, then re-checks
 * on navigation and every minute. (Push via SSE/WebSocket is on the roadmap —
 * polling a cheap indexed COUNT is plenty for now.)
 */
export function UnreadBadge({ initial }: { initial: number }) {
  const pathname = usePathname();
  const [count, setCount] = useState(initial);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch("/api/notifications/unread", { cache: "no-store" });
        if (res.ok && alive) setCount((await res.json()).count ?? 0);
      } catch {
        /* offline — keep the last value */
      }
    };
    check();
    const id = setInterval(check, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [pathname]);

  if (!count) return null;
  return (
    <span className="absolute -right-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[11px] font-bold leading-none text-accent-ink ring-2 ring-bg">
      {count > 99 ? "99+" : count}
    </span>
  );
}
