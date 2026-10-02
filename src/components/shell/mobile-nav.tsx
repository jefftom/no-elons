import Link from "next/link";
import { Bell, Compass, Feather, Home, Images, User, LogIn } from "lucide-react";
import type { ViewerInfo } from "../types";
import { Avatar } from "../avatar";
import { LogoMark } from "../logo";
import { NavLink } from "./nav-link";
import { UnreadBadge } from "./unread-badge";

export function MobileTopBar({ viewer }: { viewer: ViewerInfo | null }) {
  return (
    <div className="flex items-center justify-between border-b border-line bg-bg/85 px-4 py-2 backdrop-blur-xl sm:hidden">
      {viewer ? (
        <Link href={`/@${viewer.username}`} aria-label="Your profile">
          <Avatar user={viewer} size={32} />
        </Link>
      ) : (
        <span className="size-8" />
      )}
      <Link href="/" aria-label="NoElons home">
        <LogoMark className="size-8" />
      </Link>
      {viewer ? (
        <Link href="/settings" className="text-sm font-semibold text-muted">
          More
        </Link>
      ) : (
        <Link href="/login" className="text-sm font-semibold text-accent">
          Log in
        </Link>
      )}
    </div>
  );
}

export function MobileNav({ viewer, unread }: { viewer: ViewerInfo | null; unread: number }) {
  return (
    <>
      {viewer ? (
        <Link
          href="/compose"
          aria-label="New post"
          className="fixed bottom-[72px] right-4 z-40 grid size-14 place-items-center rounded-full bg-accent text-accent-ink shadow-card sm:hidden"
        >
          <Feather size={24} />
        </Link>
      ) : null}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden">
        <NavLink variant="bottom" href="/" exact icon={<Home size={24} />} label="Home" />
        <NavLink variant="bottom" href="/explore" icon={<Compass size={24} />} label="Explore" />
        <NavLink variant="bottom" href="/photos" icon={<Images size={24} />} label="Photos" />
        {viewer ? (
          <>
            <NavLink
              variant="bottom"
              href="/notifications"
              icon={<Bell size={24} />}
              label="Notifications"
              badge={<span className="absolute left-1/2 top-2 ml-1"><UnreadBadge initial={unread} /></span>}
            />
            <NavLink variant="bottom" href={`/@${viewer.username}`} icon={<User size={24} />} label="Profile" />
          </>
        ) : (
          <NavLink variant="bottom" href="/login" icon={<LogIn size={24} />} label="Log in" />
        )}
      </nav>
    </>
  );
}
