import { cache } from "react";
import { getViewerInfo } from "@/server/auth/viewer";
import { getRelationship } from "@/server/services/relationships";
import { getProfile } from "@/server/services/users";

/** Profile + relationship, shared by the profile layout and its tab pages (memoised per request). */
export const loadProfile = cache(async (username: string) => {
  const [profile, viewer] = await Promise.all([getProfile(decodeURIComponent(username)), getViewerInfo()]);
  if (!profile) return null;
  const relationship = await getRelationship(viewer?.id ?? null, profile.id);
  const hiddenContent = profile.suspended || relationship.blockedBy || relationship.blocking;
  return { profile, viewer, relationship, hiddenContent };
});
