import { Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { setHideCountsAction } from "@/app/actions/settings";
import { requireViewer } from "@/server/auth/viewer";
import { toProfileView } from "@/server/views";
import { DeleteAccountForm, PasswordForm, ProfileForm } from "./settings-forms";

export const metadata = { title: "Settings" };

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line px-4 py-6">
      <h2 className="font-display text-xl font-extrabold tracking-tight">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const viewer = await requireViewer("/settings");
  const profile = toProfileView(viewer);
  return (
    <>
      <PageHeader title="Settings" subtitle={`@${viewer.username}`} />
      <Section title="Profile" description="This is what people see on your profile.">
        <ProfileForm profile={profile} />
      </Section>

      <Section title="Calm mode" description="Sometimes numbers are the problem.">
        <form action={setHideCountsAction} className="flex items-start justify-between gap-4">
          <label htmlFor="hideCounts" className="text-[15px]">
            <span className="font-semibold">Hide like and repost counts</span>
            <span className="mt-0.5 block text-sm text-muted">Everywhere, for you. Posts still work the same; you just won&apos;t see the scoreboard.</span>
          </label>
          <input id="hideCounts" type="checkbox" name="hideCounts" defaultChecked={viewer.hideCounts} className="mt-1 size-5 accent-[var(--accent)]" />
          <button type="submit" className="btn-outline shrink-0">
            Save
          </button>
        </form>
      </Section>

      <Section title="Your data" description="Everything you've created, in an open JSON format. Take it anywhere.">
        <a href="/settings/export" className="btn-outline" download>
          <Download size={16} /> Download my data
        </a>
        <p className="mt-3 text-sm text-muted">
          Your profile also has a public RSS feed at{" "}
          <a href={`/@${viewer.username}/rss`} className="link">
            /@{viewer.username}/rss
          </a>
          .
        </p>
      </Section>

      <Section title="Password" description="Changing it signs you out everywhere.">
        <PasswordForm />
      </Section>

      <Section title="Delete account" description="Permanently deletes your profile, posts, photos, likes, follows and lists. There is no undo.">
        <DeleteAccountForm username={viewer.username} />
      </Section>
    </>
  );
}
