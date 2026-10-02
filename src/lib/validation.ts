import { z } from "zod";
import { LIMITS, RESERVED_USERNAMES, USERNAME_RE } from "./limits";
import { RULE_CODES } from "./rules";
import { charCount, normalizeBody } from "./text";

const trimmed = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`);

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(USERNAME_RE, "Usernames are 3–20 characters: letters, numbers and underscores.")
  .refine((u) => !RESERVED_USERNAMES.has(u), "That username is reserved. (Yes, that one too.)");

export const signupSchema = z.object({
  username: usernameSchema,
  displayName: trimmed(LIMITS.displayNameChars, "Display name").min(1, "Tell us what to call you."),
  email: z.string().trim().toLowerCase().pipe(z.email("That doesn't look like an email address.")),
  password: z
    .string()
    .min(10, "Use at least 10 characters for your password.")
    .max(200, "That password is too long."),
});

export const loginSchema = z.object({
  identifier: z.string().trim().toLowerCase().min(1, "Enter your username or email."),
  password: z.string().min(1, "Enter your password."),
});

const optionalWebsite = z
  .string()
  .trim()
  .max(LIMITS.websiteChars)
  .transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v))
  .refine((v) => {
    if (!v) return true;
    try {
      const url = new URL(v);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "Enter a valid website URL.");

export const profileSchema = z.object({
  displayName: trimmed(LIMITS.displayNameChars, "Display name").min(1, "Display name can't be empty."),
  bio: z
    .string()
    .transform(normalizeBody)
    .refine((v) => charCount(v) <= LIMITS.bioChars, `Bio must be ${LIMITS.bioChars} characters or fewer.`),
  location: trimmed(LIMITS.locationChars, "Location"),
  website: optionalWebsite,
});

export const postBodySchema = z
  .string()
  .transform(normalizeBody)
  .refine((v) => charCount(v) <= LIMITS.postChars, `Posts are ${LIMITS.postChars} characters max.`);

export const contentWarningSchema = z
  .string()
  .trim()
  .max(LIMITS.contentWarningChars, `Content warnings are ${LIMITS.contentWarningChars} characters max.`)
  .transform((v) => (v ? v : null));

export const altTextSchema = z.string().trim().max(LIMITS.altTextChars);

export const reportSchema = z.object({
  rule: z.enum(RULE_CODES, "Pick the rule that's being broken."),
  details: z.string().trim().max(1000),
});

export const listSchema = z.object({
  name: trimmed(LIMITS.listNameChars, "List name").min(1, "Give your list a name."),
  description: trimmed(LIMITS.listDescriptionChars, "Description"),
  isPrivate: z.boolean(),
});

export const passwordChangeSchema = z.object({
  current: z.string().min(1, "Enter your current password."),
  next: signupSchema.shape.password,
});

/** First human-readable message from a failed parse. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Something about that input isn't right.";
}

/** A safe in-app path for ?next= redirects (no open redirects). */
export function safeNextPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
