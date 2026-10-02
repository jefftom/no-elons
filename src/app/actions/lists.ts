"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireViewer } from "@/server/auth/viewer";
import { AppError } from "@/server/errors";
import { addListMember, createList, deleteList, removeListMember, updateList } from "@/server/services/lists";
import { isUuid } from "@/lib/ids";
import { guarded, str, type ActionResult } from "./result";

function listId(fd: FormData): string {
  const id = str(fd, "listId");
  if (!isUuid(id)) throw new AppError("That list doesn't exist.", "not_found");
  return id;
}

export async function createListAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  let id = "";
  const result = await guarded(async () => {
    const viewer = await requireViewer("/lists");
    id = await createList(viewer.id, {
      name: str(fd, "name"),
      description: str(fd, "description"),
      isPrivate: str(fd, "isPrivate") === "on",
    });
  });
  if (!result.ok) return result;
  redirect(`/lists/${id}/members`);
}

export async function updateListAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const viewer = await requireViewer("/lists");
    await updateList(viewer.id, listId(fd), {
      name: str(fd, "name"),
      description: str(fd, "description"),
      isPrivate: str(fd, "isPrivate") === "on",
    });
    refresh();
  });
}

export async function deleteListAction(fd: FormData): Promise<void> {
  const viewer = await requireViewer("/lists");
  await deleteList(viewer.id, listId(fd));
  redirect("/lists");
}

export async function addListMemberAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const viewer = await requireViewer("/lists");
    await addListMember(viewer.id, listId(fd), str(fd, "username"));
    refresh();
  });
}

export async function removeListMemberAction(fd: FormData): Promise<void> {
  const viewer = await requireViewer("/lists");
  const userId = str(fd, "userId");
  if (!isUuid(userId)) return;
  await removeListMember(viewer.id, listId(fd), userId);
  refresh();
}
