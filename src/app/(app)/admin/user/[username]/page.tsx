import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { PageHeader } from "@/components/page-header";
import { requireModerator } from "@/server/auth/viewer";
import { getProfile } from "@/server/services/users";
import { joinedDate } from "@/lib/time";
import { SuspendForm, UnsuspendForm } from "../../mod-forms";

export const metadata = { title: "Moderate account" };

export default async function ModerateUserPage({ params }: { params: Promise<{ username: string }> }) {
  await requireModerator();
  const profile = await getProfile(decodeURIComponent((await params).username));
  if (!profile) notFound();
  return (
    <>
      <PageHeader title="Moderate account" subtitle={`@${profile.username}`} back />
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-3">
          <Avatar user={profile} size={56} />
          <div>
            <Link href={`/@${profile.username}`} className="font-bold hover:underline">
              {profile.displayName}
            </Link>
            <div className="text-sm text-muted">
              @{profile.username} · joined {joinedDate(profile.createdAt)} · {profile.postCount} posts · {profile.followerCount} followers
            </div>
          </div>
        </div>
        {profile.bio ? <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm">{profile.bio}</p> : null}
        <div className="rounded-xl border border-line p-4">
          {profile.suspended ? <UnsuspendForm userId={profile.id} /> : <SuspendForm userId={profile.id} />}
        </div>
      </div>
    </>
  );
}
