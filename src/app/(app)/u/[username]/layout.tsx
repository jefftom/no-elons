import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Link2, MapPin } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { FollowButton } from "@/components/follow-button";
import { PageHeader } from "@/components/page-header";
import { RoleBadge } from "@/components/post-card";
import { PostBody } from "@/components/post-body";
import { ProfileMenu } from "@/components/profile-menu";
import { Tabs } from "@/components/tabs";
import { bannerGradient } from "@/lib/colors";
import { compactNumber, joinedDate } from "@/lib/time";
import { loadProfile } from "./data";

type Props = { children: React.ReactNode; params: Promise<{ username: string }> };

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const data = await loadProfile(username);
  if (!data) return { title: "Profile not found" };
  const { profile } = data;
  return {
    title: `${profile.displayName} (@${profile.username})`,
    description: profile.bio || `${profile.displayName} is on NoElons.`,
    alternates: { types: { "application/rss+xml": `/@${profile.username}/rss` } },
    openGraph: { images: profile.avatarUrl ? [profile.avatarUrl] : undefined },
  };
}

export default async function ProfileLayout({ children, params }: Props) {
  const { username } = await params;
  const data = await loadProfile(username);
  if (!data) notFound();
  const { profile, viewer, relationship, hiddenContent } = data;
  const isSelf = viewer?.id === profile.id;
  const base = `/@${profile.username}`;

  let websiteLabel = "";
  if (profile.website) {
    try {
      const u = new URL(profile.website);
      websiteLabel = (u.host + u.pathname).replace(/^www\./, "").replace(/\/$/, "");
    } catch {
      websiteLabel = profile.website;
    }
  }

  return (
    <>
      <PageHeader title={profile.displayName} subtitle={`${compactNumber(profile.postCount)} posts`} back />
      <div>
        <div
          className="aspect-[3/1] w-full bg-cover bg-center"
          style={{ backgroundImage: profile.bannerUrl ? `url(${profile.bannerUrl})` : bannerGradient(profile.username) }}
        />
        <div className="px-4">
          <div className="flex items-start justify-between">
            <Avatar user={profile} size={134} className="-mt-12 size-24! border-4 border-bg bg-bg sm:-mt-[72px] sm:size-[134px]!" />
            <div className="mt-3 flex items-center gap-2">
              {isSelf ? (
                <Link href="/settings" className="btn-outline">
                  Edit profile
                </Link>
              ) : (
                <>
                  <ProfileMenu
                    userId={profile.id}
                    username={profile.username}
                    muting={relationship.muting}
                    blocking={relationship.blocking}
                    signedIn={!!viewer}
                    isModerator={viewer?.role === "moderator" || viewer?.role === "admin"}
                  />
                  {!hiddenContent ? <FollowButton userId={profile.id} following={relationship.following} signedIn={!!viewer} /> : null}
                </>
              )}
            </div>
          </div>
          <div className="mt-3">
            <h2 className="flex items-center gap-1.5 font-display text-[22px] font-extrabold leading-tight tracking-tight">
              {profile.displayName}
              <RoleBadge role={profile.role} />
            </h2>
            <div className="flex items-center gap-2 text-[15px] text-muted">
              @{profile.username}
              {relationship.followedBy ? <span className="rounded bg-surface-2 px-1.5 py-0.5 text-xs font-semibold">Follows you</span> : null}
            </div>
          </div>
          {!profile.suspended && profile.bio ? <PostBody body={profile.bio} className="mt-3 text-[15px] leading-snug" /> : null}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[15px] text-muted">
            {profile.location ? (
              <span className="flex items-center gap-1">
                <MapPin size={16} /> {profile.location}
              </span>
            ) : null}
            {profile.website && !profile.suspended ? (
              <a href={profile.website} target="_blank" rel="noopener noreferrer me" className="link flex items-center gap-1">
                <Link2 size={16} /> {websiteLabel}
              </a>
            ) : null}
            <span className="flex items-center gap-1">
              <CalendarDays size={16} /> Joined {joinedDate(profile.createdAt)}
            </span>
          </div>
          <div className="mt-3 flex gap-5 text-[15px]">
            <Link href={`${base}/following`} className="hover:underline">
              <strong>{compactNumber(profile.followingCount)}</strong> <span className="text-muted">Following</span>
            </Link>
            <Link href={`${base}/followers`} className="hover:underline">
              <strong>{compactNumber(profile.followerCount)}</strong>{" "}
              <span className="text-muted">{profile.followerCount === 1 ? "Follower" : "Followers"}</span>
            </Link>
          </div>
        </div>
        {hiddenContent ? (
          <div className="mt-6 border-t border-line px-8 py-14 text-center">
            <h3 className="font-display text-2xl font-extrabold">
              {profile.suspended
                ? "This account is suspended"
                : relationship.blocking
                  ? `You blocked @${profile.username}`
                  : `@${profile.username} blocked you`}
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-muted">
              {profile.suspended ? (
                <>
                  It broke the rules. Every suspension is listed in the{" "}
                  <Link href="/transparency" className="link">
                    transparency log
                  </Link>
                  .
                </>
              ) : relationship.blocking ? (
                "You won't see their posts and they won't see yours. Unblock them from the ••• menu."
              ) : (
                "You can't see their posts or follow them."
              )}
            </p>
          </div>
        ) : (
          <div className="mt-3 border-b border-line">
            <Tabs
              tabs={[
                { href: base, label: "Posts", exact: true },
                { href: `${base}/replies`, label: "Replies" },
                { href: `${base}/grid`, label: "Grid" },
                ...(isSelf ? [{ href: `${base}/likes`, label: "Likes" }] : []),
              ]}
            />
          </div>
        )}
      </div>
      {hiddenContent ? null : children}
    </>
  );
}
