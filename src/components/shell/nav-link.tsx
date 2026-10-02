"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  exact = false,
  icon,
  label,
  badge,
  variant = "side",
}: {
  href: string;
  exact?: boolean;
  icon: React.ReactNode;
  label: string;
  badge?: React.ReactNode;
  variant?: "side" | "bottom";
}) {
  const pathname = usePathname() ?? "/";
  const norm = (p: string) => p.replace(/^\/@([^/]+)/, "/u/$1");
  const current = norm(pathname);
  const target = norm(href);
  const active = exact ? current === target : current === target || current.startsWith(`${target}/`);

  if (variant === "bottom") {
    return (
      <Link
        href={href}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className={`relative grid flex-1 place-items-center py-3 ${active ? "text-ink" : "text-muted"}`}
      >
        {icon}
        {badge}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      title={label}
      className={`group flex items-center gap-4 rounded-full p-3 text-[19px] transition-colors hover:bg-surface-2 xl:pr-6 ${
        active ? "font-extrabold text-ink" : "font-medium text-ink/85"
      }`}
    >
      <span className="relative">
        {icon}
        {badge}
      </span>
      <span className="hidden xl:inline">{label}</span>
    </Link>
  );
}
