/** Product limits. One place so the UI, validation and docs agree. */
export const LIMITS = {
  postChars: 500,
  contentWarningChars: 100,
  mediaPerPost: 4,
  mediaBytes: 10 * 1024 * 1024,
  altTextChars: 1000,
  bioChars: 200,
  displayNameChars: 50,
  locationChars: 40,
  websiteChars: 120,
  /** Edits are allowed for this long after posting; every edit is public. */
  editWindowMinutes: 60,
  pageSize: 25,
  gridPageSize: 30,
  listNameChars: 40,
  listDescriptionChars: 160,
} as const;

/** Username rules: what we accept at signup. */
export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

/** Names nobody can register. Mostly route-ish words, plus one obvious joke. */
export const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "api",
  "about",
  "charter",
  "explore",
  "help",
  "home",
  "login",
  "logout",
  "mod",
  "moderator",
  "moderators",
  "noelons",
  "notifications",
  "root",
  "security",
  "settings",
  "signup",
  "staff",
  "support",
  "system",
  "transparency",
  "elon",
  "elonmusk",
]);

/** Can a post created at `createdAt` still be edited? */
export function editWindowOpen(createdAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - createdAt.getTime() <= LIMITS.editWindowMinutes * 60_000;
}
