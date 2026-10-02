import Link from "next/link";
import {
  Bell,
  Bookmark,
  Compass,
  Globe,
  Home,
  Images,
  List,
  LogOut,
  Feather,
  Settings,
  Shield,
  User,
  ScrollText,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { Avatar } from "../avatar";
import { Logo, LogoMark } from "../logo";
import type { ViewerInfo } from "../types";
import { NavLink } from "./nav-link";
import { UnreadBadge } from "./unread-badge";

export function SideNav({ viewer, unread, openReports }: { viewer: ViewerInfo | null; unread: number; openReports: number }) {
  const icon = (I: typeof Home) => <I size={26} strokeWidth={1.9} />;
  return (
    <div className="flex h-full flex-col justify-between px-2 py-2 xl:px-3">
      <div className="flex flex-col items-center gap-0.5 xl:items-stretch">
        <Link href="/" className="mb-2 rounded-full p-2.5 hover:bg-surface-2 xl:self-start" aria-label="NoElons home">
          <span className="xl:hidden">
            <LogoMark className="size-9" />
          </span>
          <span className="hidden xl:inline-flex">
            <Logo />
          </span>
        </Link>
        {viewer ? (
          <>
            <NavLink href="/" exact icon={icon(Home)} label="Home" />
            <NavLink href="/everyone" icon={icon(Globe)} label="Everyone" />
            <NavLink href="/photos" icon={icon(Images)} label="Photos" />
            <NavLink href="/explore" icon={icon(Compass)} label="Explore" />
            <NavLink href="/notifications" icon={icon(Bell)} label="Notifications" badge={<UnreadBadge initial={unread} />} />
            <NavLink href="/bookmarks" icon={icon(Bookmark)} label="Bookmarks" />
            <NavLink href="/lists" icon={icon(List)} label="Lists" />
            <NavLink href={`/@${viewer.username}`} icon={icon(User)} label="Profile" />
            <NavLink href="/settings" icon={icon(Settings)} label="Settings" />
            {viewer.role !== "user" ? (
              <NavLink
                href="/admin"
                icon={icon(Shield)}
                label="Moderation"
                badge={
                  openReports ? (
                    <span className="absolute -right-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-ink px-1 text-[11px] font-bold text-bg ring-2 ring-bg">
                      {openReports}
                    </span>
                  ) : null
                }
              />
            ) : null}
            <Link href="/compose" className="btn-primary mt-3 size-[52px] p-0 text-[17px] shadow-card xl:h-[52px] xl:w-full" aria-label="New post">
              <Feather size={22} className="xl:hidden" />
              <span className="hidden xl:inline">Post</span>
            </Link>
          </>
        ) : (
          <>
            <NavLink href="/explore" icon={icon(Compass)} label="Explore" />
            <NavLink href="/everyone" icon={icon(Globe)} label="Everyone" />
            <NavLink href="/photos" icon={icon(Images)} label="Photos" />
            <NavLink href="/charter" icon={icon(ScrollText)} label="The Charter" />
            <div className="mt-4 hidden flex-col gap-2 xl:flex">
              <Link href="/signup" className="btn-primary h-12 text-[16px]">
                Join NoElons
              </Link>
              <Link href="/login" className="btn-outline h-12 text-[16px]">
                Log in
              </Link>
            </div>
          </>
        )}
      </div>

      {viewer ? (
        <div className="flex items-center gap-3 rounded-full p-2 hover:bg-surface-2">
          <Link href={`/@${viewer.username}`} className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar user={viewer} size={40} />
            <span className="hidden min-w-0 flex-1 xl:block">
              <span className="block truncate text-[15px] font-bold leading-5">{viewer.displayName}</span>
              <span className="block truncate text-sm text-muted">@{viewer.username}</span>
            </span>
          </Link>
          <form action={logoutAction} className="hidden xl:block">
            <button type="submit" className="rounded-full p-2 text-muted hover:bg-surface-3 hover:text-ink" title="Log out" aria-label="Log out">
              <LogOut size={18} />
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
