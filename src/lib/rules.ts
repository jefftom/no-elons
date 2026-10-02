/**
 * The Charter: promises the platform makes to its members, and the community
 * rules members agree to. Rule codes are stable identifiers stored on reports
 * and moderation actions, so never renumber — only append.
 */

export const CHARTER_PROMISES = [
  {
    title: "Your timeline is chronological.",
    body: "Home shows the people you follow, newest first. No engagement ranking, no “for you” injections, no boosted posts. If we ever add optional feeds, their rules will be public and you will have to opt in.",
  },
  {
    title: "Nobody can buy reach.",
    body: "No paid boosts, no paid checkmarks, no pay-to-be-seen replies. Supporters get our thanks, not an algorithmic megaphone.",
  },
  {
    title: "No owner override.",
    body: "No single person can change the rules or tilt the platform. Rule changes go through a public proposal and comment period, and every moderation action is published in the transparency log.",
  },
  {
    title: "Your data leaves with you.",
    body: "Export everything you have posted at any time, in an open format. Every profile has an RSS feed. Federation (ActivityPub) is on the roadmap so you can move and keep your followers.",
  },
  {
    title: "No surveillance.",
    body: "No ad tracking, no selling data. We strip location and camera metadata from every photo you upload.",
  },
  {
    title: "Edits leave receipts.",
    body: "You can fix a typo for an hour after posting, and anyone can see what changed.",
  },
] as const;

export const RULES = [
  { code: "harassment", title: "No harassment", body: "Don't target people with abuse, pile-ons, or unwanted sexual content." },
  { code: "hate", title: "No hateful conduct", body: "Don't attack people based on race, ethnicity, national origin, caste, religion, sexual orientation, gender, gender identity, disability, or serious disease." },
  { code: "violence", title: "No threats or glorified violence", body: "Don't threaten, incite, or celebrate violence against people." },
  { code: "privacy", title: "No doxxing", body: "Don't share someone's private information (home address, phone, documents, non-public photos) without consent." },
  { code: "csam", title: "Zero tolerance for child exploitation", body: "Any sexualisation of minors results in permanent removal and a report to the authorities." },
  { code: "ncii", title: "No non-consensual intimate media", body: "Never share intimate images of someone without their consent." },
  { code: "spam", title: "No spam or manipulation", body: "No scams, fake engagement, ban evasion, or undisclosed automation. Bots are welcome if they say they're bots." },
  { code: "impersonation", title: "No deceptive impersonation", body: "Parody and fan accounts are fine when they say so in their name or bio." },
  { code: "sensitive", title: "Label sensitive media", body: "Use a content warning for graphic, gory, or adult media." },
  { code: "illegal", title: "No illegal goods or services", body: "Don't use NoElons to sell or facilitate illegal goods or services." },
] as const;

export type RuleCode = (typeof RULES)[number]["code"];

export const RULE_CODES = RULES.map((r) => r.code) as [RuleCode, ...RuleCode[]];

export function ruleTitle(code: string | null | undefined): string {
  return RULES.find((r) => r.code === code)?.title ?? "Other";
}
