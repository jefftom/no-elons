/**
 * NoElons data model.
 *
 * Conventions
 * - Every row id is a UUIDv7 generated in the app. v7 ids sort by creation
 *   time, so "id < cursor ORDER BY id DESC" is our universal keyset
 *   pagination and timelines never need OFFSET.
 * - Hot counters (likes, followers, ...) are denormalised onto the parent row
 *   and updated in the same transaction as the write that changes them.
 * - Usernames and emails are stored lower-cased; the app enforces it and a
 *   CHECK constraint backs it up.
 * - Posts are soft-deleted (tombstoned) so threads keep their shape and the
 *   moderation log can point at what was removed. Body + media are scrubbed
 *   on delete.
 */
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  customType,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { uuidv7 } from "../../lib/ids";

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

const id = () => uuid("id").primaryKey().$defaultFn(() => uuidv7());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const userRole = pgEnum("user_role", ["user", "moderator", "admin"]);

export const users = pgTable(
  "users",
  {
    id: id(),
    username: text("username").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    bio: text("bio").notNull().default(""),
    location: text("location").notNull().default(""),
    website: text("website").notNull().default(""),
    avatarKey: text("avatar_key"),
    bannerKey: text("banner_key"),
    pinnedPostId: uuid("pinned_post_id"),
    role: userRole("role").notNull().default("user"),
    /** "No-ratio mode": hide like/repost counts everywhere for this viewer. */
    hideCounts: boolean("hide_counts").notNull().default(false),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    followerCount: integer("follower_count").notNull().default(0),
    followingCount: integer("following_count").notNull().default(0),
    postCount: integer("post_count").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("users_username_uq").on(t.username),
    uniqueIndex("users_email_uq").on(t.email),
    index("users_username_trgm_idx").using("gin", t.username.op("gin_trgm_ops")),
    index("users_display_name_trgm_idx").using("gin", t.displayName.op("gin_trgm_ops")),
    check("users_username_lower", sql`username = lower(username)`),
    check("users_email_lower", sql`email = lower(email)`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    /** sha256(token) — the raw token only ever lives in the user's cookie. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: text("user_agent").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const posts = pgTable(
  "posts",
  {
    id: id(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull().default(""),
    contentWarning: text("content_warning"),
    replyToId: uuid("reply_to_id").references((): AnyPgColumn => posts.id, { onDelete: "set null" }),
    /** Denormalised so the home timeline can apply the "replies only from people you follow" rule without a join. */
    replyToAuthorId: uuid("reply_to_author_id").references(() => users.id, { onDelete: "set null" }),
    threadRootId: uuid("thread_root_id"),
    quoteOfId: uuid("quote_of_id").references((): AnyPgColumn => posts.id, { onDelete: "set null" }),
    /** A repost is a post row with no body that points at the original (old-Twitter style). */
    repostOfId: uuid("repost_of_id").references((): AnyPgColumn => posts.id, { onDelete: "cascade" }),
    mediaCount: smallint("media_count").notNull().default(0),
    likeCount: integer("like_count").notNull().default(0),
    repostCount: integer("repost_count").notNull().default(0),
    replyCount: integer("reply_count").notNull().default(0),
    quoteCount: integer("quote_count").notNull().default(0),
    createdAt: createdAt(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    removalRule: text("removal_rule"),
    search: tsvector("search").generatedAlwaysAs(sql`to_tsvector('simple', coalesce(body, '') || ' ' || coalesce(content_warning, ''))`),
  },
  (t) => [
    index("posts_author_idx").on(t.authorId, t.id.desc()),
    index("posts_reply_to_idx").on(t.replyToId, t.id),
    index("posts_quote_of_idx").on(t.quoteOfId),
    index("posts_live_idx")
      .on(t.id.desc())
      .where(sql`deleted_at is null and removed_at is null`),
    index("posts_photos_idx")
      .on(t.id.desc())
      .where(sql`media_count > 0 and repost_of_id is null and deleted_at is null and removed_at is null`),
    uniqueIndex("posts_one_repost_per_user_uq")
      .on(t.authorId, t.repostOfId)
      .where(sql`repost_of_id is not null`),
    index("posts_search_idx").using("gin", t.search),
  ],
);

export const postMedia = pgTable(
  "post_media",
  {
    id: id(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    position: smallint("position").notNull(),
    storageKey: text("storage_key").notNull(),
    thumbKey: text("thumb_key").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    altText: text("alt_text").notNull().default(""),
    /** Dominant colour, used as the placeholder while the image loads. */
    color: text("color").notNull().default("#888888"),
    createdAt: createdAt(),
  },
  (t) => [index("post_media_post_idx").on(t.postId, t.position)],
);

/** Previous versions of edited posts. Edits leave receipts. */
export const postRevisions = pgTable(
  "post_revisions",
  {
    id: id(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    contentWarning: text("content_warning"),
    /** When this version was originally published. */
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("post_revisions_post_idx").on(t.postId, t.id)],
);

export const likes = pgTable(
  "likes",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("likes_user_post_uq").on(t.userId, t.postId),
    index("likes_user_idx").on(t.userId, t.id.desc()),
    index("likes_post_idx").on(t.postId),
  ],
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("bookmarks_user_post_uq").on(t.userId, t.postId),
    index("bookmarks_user_idx").on(t.userId, t.id.desc()),
  ],
);

export const follows = pgTable(
  "follows",
  {
    id: id(),
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followeeId: uuid("followee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("follows_pair_uq").on(t.followerId, t.followeeId),
    index("follows_followee_idx").on(t.followeeId, t.id.desc()),
    index("follows_follower_idx").on(t.followerId, t.id.desc()),
    check("follows_not_self", sql`follower_id <> followee_id`),
  ],
);

export const blocks = pgTable(
  "blocks",
  {
    id: id(),
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("blocks_pair_uq").on(t.blockerId, t.blockedId),
    index("blocks_blocked_idx").on(t.blockedId),
  ],
);

export const mutes = pgTable(
  "mutes",
  {
    id: id(),
    muterId: uuid("muter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mutedId: uuid("muted_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("mutes_pair_uq").on(t.muterId, t.mutedId)],
);

export const postHashtags = pgTable(
  "post_hashtags",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    /** Lower-cased, without the leading "#". */
    tag: text("tag").notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.postId, t.tag] }),
    index("post_hashtags_tag_idx").on(t.tag, t.postId.desc()),
    index("post_hashtags_created_idx").on(t.createdAt),
  ],
);

export const mentions = pgTable(
  "mentions",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.userId] }), index("mentions_user_idx").on(t.userId)],
);

export const notificationType = pgEnum("notification_type", [
  "like",
  "repost",
  "reply",
  "quote",
  "mention",
  "follow",
]);

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationType("type").notNull(),
    /** The post the notification is about (the liked post, the reply, ...). */
    postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => [
    index("notifications_recipient_idx").on(t.recipientId, t.id.desc()),
    index("notifications_unread_idx")
      .on(t.recipientId)
      .where(sql`read_at is null`),
  ],
);

export const lists = pgTable(
  "lists",
  {
    id: id(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    isPrivate: boolean("is_private").notNull().default(false),
    memberCount: integer("member_count").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("lists_owner_idx").on(t.ownerId, t.id.desc())],
);

export const listMembers = pgTable(
  "list_members",
  {
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.listId, t.userId] }), index("list_members_user_idx").on(t.userId)],
);

export const reportStatus = pgEnum("report_status", ["open", "actioned", "dismissed"]);

export const reports = pgTable(
  "reports",
  {
    id: id(),
    reporterId: uuid("reporter_id").references(() => users.id, { onDelete: "set null" }),
    postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }),
    subjectUserId: uuid("subject_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Rule code from src/lib/rules.ts */
    rule: text("rule").notNull(),
    details: text("details").notNull().default(""),
    status: reportStatus("status").notNull().default("open"),
    resolvedById: uuid("resolved_by_id").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("reports_status_idx").on(t.status, t.id.desc()),
    index("reports_post_idx").on(t.postId),
  ],
);

export const moderationActionType = pgEnum("moderation_action_type", [
  "remove_post",
  "restore_post",
  "suspend_user",
  "unsuspend_user",
  "dismiss_report",
]);

/**
 * The public transparency log. Every moderator action lands here and is shown
 * on /transparency. Moderators are not named publicly (to protect them from
 * harassment) but the id is kept for internal audit.
 */
export const moderationActions = pgTable(
  "moderation_actions",
  {
    id: id(),
    moderatorId: uuid("moderator_id").references(() => users.id, { onDelete: "set null" }),
    action: moderationActionType("action").notNull(),
    postId: uuid("post_id").references(() => posts.id, { onDelete: "set null" }),
    subjectUserId: uuid("subject_user_id").references(() => users.id, { onDelete: "set null" }),
    /** Snapshot so the log stays readable after the account is gone. */
    subjectUsername: text("subject_username").notNull(),
    rule: text("rule"),
    publicNote: text("public_note").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("moderation_actions_created_idx").on(t.id.desc())],
);
