"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { endSession, requireViewer } from "@/server/auth/viewer";
import { changePassword, deleteAccount, setHideCounts, updateProfile } from "@/server/services/users";
import { fileBuffer, guarded, str, type ActionResult } from "./result";

export async function updateProfileAction(_prev: ActionResult, fd: FormData): Promise<ActionResult<{ saved?: boolean }>> {
  return guarded(async () => {
    const viewer = await requireViewer("/settings");
    await updateProfile(
      viewer.id,
      {
        displayName: str(fd, "displayName"),
        bio: str(fd, "bio"),
        location: str(fd, "location"),
        website: str(fd, "website"),
      },
      {
        avatar: await fileBuffer(fd.get("avatar")),
        banner: await fileBuffer(fd.get("banner")),
        removeAvatar: str(fd, "removeAvatar") === "on",
        removeBanner: str(fd, "removeBanner") === "on",
      },
    );
    refresh();
    return { saved: true };
  });
}

export async function setHideCountsAction(fd: FormData): Promise<void> {
  const viewer = await requireViewer("/settings");
  await setHideCounts(viewer.id, str(fd, "hideCounts") === "on");
  refresh();
}

export async function changePasswordAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const result = await guarded(async () => {
    const viewer = await requireViewer("/settings");
    await changePassword(viewer.id, { current: str(fd, "current"), next: str(fd, "next") });
  });
  if (!result.ok) return result;
  // Changing your password signs out every session, including this one.
  redirect("/login?changed=1");
}

export async function deleteAccountAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const result = await guarded(async () => {
    const viewer = await requireViewer("/settings");
    await deleteAccount(viewer.id, str(fd, "confirmUsername"), str(fd, "password"));
    await endSession();
  });
  if (!result.ok) return result;
  redirect("/?goodbye=1");
}
