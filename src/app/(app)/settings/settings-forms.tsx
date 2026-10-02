"use client";

import { useActionState, useState } from "react";
import { changePasswordAction, deleteAccountAction, updateProfileAction } from "@/app/actions/settings";
import { Avatar } from "@/components/avatar";
import { FormMessage, SubmitButton } from "@/components/submit-button";
import { bannerGradient } from "@/lib/colors";
import { LIMITS } from "@/lib/limits";
import type { ProfileView } from "@/server/views";

export function ProfileForm({ profile }: { profile: ProfileView }) {
  const [state, action] = useActionState(updateProfileAction, { ok: true });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bio, setBio] = useState(profile.bio);
  const saved = state.ok && "saved" in state && state.saved;

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-2xl border border-line">
        <label className="relative block aspect-[3/1] cursor-pointer bg-cover bg-center" style={{ backgroundImage: bannerPreview ? `url(${bannerPreview})` : profile.bannerUrl ? `url(${profile.bannerUrl})` : bannerGradient(profile.username) }}>
          <span className="absolute right-3 bottom-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">Change header</span>
          <input
            type="file"
            name="banner"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setBannerPreview(f ? URL.createObjectURL(f) : null);
            }}
          />
        </label>
        <div className="flex items-end gap-4 px-4 pb-4">
          <label className="relative -mt-10 cursor-pointer">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt="" className="size-[88px] rounded-full border-4 border-surface object-cover" />
            ) : (
              <Avatar user={profile} size={88} className="border-4 border-surface" />
            )}
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/0 text-[11px] font-bold text-transparent transition hover:bg-black/45 hover:text-white">
              Change
            </span>
            <input
              type="file"
              name="avatar"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setAvatarPreview(f ? URL.createObjectURL(f) : null);
              }}
            />
          </label>
          <div className="flex flex-wrap gap-x-4 gap-y-1 pb-1 text-sm text-muted">
            {profile.avatarUrl ? (
              <label className="flex items-center gap-1.5">
                <input type="checkbox" name="removeAvatar" className="accent-[var(--accent)]" /> Remove photo
              </label>
            ) : null}
            {profile.bannerUrl ? (
              <label className="flex items-center gap-1.5">
                <input type="checkbox" name="removeBanner" className="accent-[var(--accent)]" /> Remove header
              </label>
            ) : null}
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="displayName" className="label">
          Name
        </label>
        <input id="displayName" name="displayName" defaultValue={profile.displayName} maxLength={LIMITS.displayNameChars} required className="input" />
      </div>
      <div>
        <label htmlFor="bio" className="label flex justify-between">
          Bio <span className="font-normal text-muted">{bio.length}/{LIMITS.bioChars}</span>
        </label>
        <textarea id="bio" name="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={LIMITS.bioChars + 20} className="input resize-none" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="location" className="label">
            Location
          </label>
          <input id="location" name="location" defaultValue={profile.location} maxLength={LIMITS.locationChars} className="input" />
        </div>
        <div>
          <label htmlFor="website" className="label">
            Website
          </label>
          <input id="website" name="website" defaultValue={profile.website} maxLength={LIMITS.websiteChars} placeholder="example.com" className="input" />
        </div>
      </div>
      <FormMessage state={state} />
      <div className="flex items-center justify-end gap-3">
        {saved ? <span className="text-sm font-semibold text-repost">Saved ✓</span> : null}
        <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, { ok: true });
  return (
    <form action={action} className="flex flex-col gap-3 sm:max-w-sm">
      <input type="password" name="current" autoComplete="current-password" placeholder="Current password" required className="input" aria-label="Current password" />
      <input type="password" name="next" autoComplete="new-password" placeholder="New password (10+ characters)" minLength={10} required className="input" aria-label="New password" />
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingText="Updating…" className="btn-outline">
          Change password
        </SubmitButton>
      </div>
    </form>
  );
}

export function DeleteAccountForm({ username }: { username: string }) {
  const [state, action] = useActionState(deleteAccountAction, { ok: true });
  return (
    <form action={action} className="flex flex-col gap-3 sm:max-w-sm">
      <input name="confirmUsername" placeholder={`Type “${username}” to confirm`} required className="input" aria-label="Confirm username" autoComplete="off" />
      <input type="password" name="password" placeholder="Password" required className="input" aria-label="Password" autoComplete="current-password" />
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingText="Deleting…" className="btn-danger">
          Delete my account forever
        </SubmitButton>
      </div>
    </form>
  );
}
