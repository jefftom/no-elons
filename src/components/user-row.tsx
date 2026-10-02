import Link from "next/link";
import type { UserSummary } from "@/server/views";
import { Avatar } from "./avatar";
import { FollowButton } from "./follow-button";
import { RoleBadge } from "./post-card";

export function UserRow({
  user,
  following,
  viewerId,
  showBio = true,
  compact = false,
}: {
  user: UserSummary & { bio?: string };
  following: boolean;
  viewerId: string | null;
  showBio?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`relative flex gap-3 transition-colors hover:bg-surface-2/50 ${compact ? "px-4 py-2.5" : "px-4 py-3"}`}>
      <Link href={`/@${user.username}`} className="absolute inset-0" aria-label={user.displayName} />
      <Avatar user={user} size={compact ? 40 : 44} />
      <div className="pointer-events-none relative min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="truncate font-bold leading-5">{user.displayName}</span>
              <RoleBadge role={user.role} />
            </div>
            <div className="truncate text-sm text-muted">@{user.username}</div>
          </div>
          {viewerId !== user.id ? <FollowButton userId={user.id} following={following} signedIn={!!viewerId} size="sm" /> : null}
        </div>
        {showBio && user.bio ? <p className="mt-1 line-clamp-2 text-[14px] leading-snug">{user.bio}</p> : null}
      </div>
    </div>
  );
}
