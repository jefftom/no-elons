import { getViewerInfo } from "@/server/auth/viewer";
import { unreadCount } from "@/server/services/notifications";
import { openReportCount } from "@/server/services/moderation";
import { MobileNav, MobileTopBar } from "./mobile-nav";
import { RightRail } from "./right-rail";
import { SideNav } from "./side-nav";

/** Three-column layout: nav · timeline · rail. Collapses to a bottom tab bar on phones. */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const viewer = await getViewerInfo();
  const [unread, openReports] = await Promise.all([
    viewer ? unreadCount(viewer.id) : 0,
    viewer && viewer.role !== "user" ? openReportCount() : 0,
  ]);
  return (
    <div className="mx-auto flex w-full max-w-[1280px] justify-center">
      <header className="sticky top-0 hidden h-dvh w-[88px] shrink-0 overflow-y-auto scroll-thin sm:block xl:w-[275px]">
        <SideNav viewer={viewer} unread={unread} openReports={openReports} />
      </header>
      <main className="min-h-dvh w-full min-w-0 max-w-[620px] border-line pb-24 sm:border-x sm:pb-0">
        <MobileTopBar viewer={viewer} />
        {children}
      </main>
      <aside className="sticky top-0 hidden h-dvh w-[370px] shrink-0 overflow-y-auto scroll-thin pl-7 pr-3 lg:block">
        <RightRail viewer={viewer} />
      </aside>
      <MobileNav viewer={viewer} unread={unread} />
    </div>
  );
}
