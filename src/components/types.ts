import type { Role } from "@/server/views";

/** What UI components need to know about the signed-in user. */
export type ViewerInfo = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: Role;
  hideCounts: boolean;
};
