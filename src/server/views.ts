/**
 * View models: the shapes the UI renders. Services produce these; components
 * consume them. Nothing here touches the database, so the same views can be
 * served from a JSON API or ActivityPub later.
 */
import type { users } from "./db/schema";
import { mediaUrl } from "./storage";

export type Role = "user" | "moderator" | "admin";

export type UserSummary = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: Role;
};

export type ProfileView = UserSummary & {
  bio: string;
  location: string;
  website: string;
  bannerUrl: string | null;
  followerCount: number;
  followingCount: number;
  postCount: number;
  createdAt: Date;
  suspended: boolean;
  pinnedPostId: string | null;
};

export type MediaView = {
  id: string;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  alt: string;
  color: string;
};

export type PostState = "ok" | "deleted" | "removed" | "unavailable";

export type PostView = {
  id: string;
  author: UserSummary;
  body: string;
  contentWarning: string | null;
  createdAt: Date;
  editedAt: Date | null;
  state: PostState;
  removalRule: string | null;
  replyTo: { postId: string | null; username: string | null } | null;
  threadRootId: string | null;
  /** The quoted post (one level deep), or "unavailable" if it was deleted/blocked. */
  quote: PostView | "unavailable" | null;
  media: MediaView[];
  counts: { likes: number; reposts: number; replies: number; quotes: number };
  /** Null when logged out. */
  viewer: { liked: boolean; reposted: boolean; bookmarked: boolean } | null;
};

export type FeedItem = {
  /** Unique per feed row (a repost and its original are different rows). */
  key: string;
  post: PostView;
  repostedBy?: UserSummary;
  pinned?: boolean;
};

export type FeedPage = { items: FeedItem[]; nextCursor: string | null };

export type Relationship = {
  following: boolean;
  followedBy: boolean;
  blocking: boolean;
  blockedBy: boolean;
  muting: boolean;
};

type UserRow = typeof users.$inferSelect;

export function toUserSummary(u: Pick<UserRow, "id" | "username" | "displayName" | "avatarKey" | "role">): UserSummary {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    avatarUrl: mediaUrl(u.avatarKey),
    role: u.role,
  };
}

export function toProfileView(u: UserRow): ProfileView {
  return {
    ...toUserSummary(u),
    bio: u.bio,
    location: u.location,
    website: u.website,
    bannerUrl: mediaUrl(u.bannerKey),
    followerCount: u.followerCount,
    followingCount: u.followingCount,
    postCount: u.postCount,
    createdAt: u.createdAt,
    suspended: !!u.suspendedAt,
    pinnedPostId: u.pinnedPostId,
  };
}
