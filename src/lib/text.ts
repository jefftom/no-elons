/**
 * Post text → tokens. Rendering works from tokens (never raw HTML), which
 * keeps user content XSS-safe by construction. The same tokenizer feeds the
 * hashtag/mention indexers so what you see is exactly what gets indexed.
 */

export type Token =
  | { type: "text"; value: string }
  | { type: "link"; value: string; href: string; display: string }
  | { type: "hashtag"; value: string; tag: string }
  | { type: "mention"; value: string; username: string };

export const USERNAME_PATTERN = "[a-zA-Z0-9_]{2,30}";

// Order matters: links first so "#fragment" inside a URL is not a hashtag.
const TOKEN_RE = new RegExp(
  [
    String.raw`(?<link>https?:\/\/[^\s<>"']+)`,
    String.raw`(?<=^|[^\p{L}\p{N}_&\/])(?<hashtag>#[\p{L}\p{N}_]{1,64})`,
    // "@maya@mastodon.social" is someone else's account, not our @maya.
    String.raw`(?<=^|[^\p{L}\p{N}_\/])(?<mention>@${USERNAME_PATTERN})(?![@\p{L}\p{N}_])`,
  ].join("|"),
  "gu",
);

const TRAILING_PUNCTUATION = /[.,;:!?'")\]}]+$/;

function trimLink(raw: string): string {
  let link = raw.replace(TRAILING_PUNCTUATION, "");
  // Keep a closing paren if the URL itself opened one (wikipedia-style links).
  const opens = (link.match(/\(/g) ?? []).length;
  const closes = (link.match(/\)/g) ?? []).length;
  if (opens > closes && raw.length > link.length && raw[link.length] === ")") {
    link += ")";
  }
  return link;
}

function displayLink(href: string): string {
  const withoutScheme = href.replace(/^https?:\/\/(www\.)?/, "");
  return withoutScheme.length > 32 ? `${withoutScheme.slice(0, 31)}…` : withoutScheme;
}

export function tokenize(body: string): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;
  const pushText = (value: string) => {
    if (!value) return;
    const last = tokens[tokens.length - 1];
    if (last?.type === "text") last.value += value;
    else tokens.push({ type: "text", value });
  };

  for (const match of body.matchAll(TOKEN_RE)) {
    const start = match.index ?? 0;
    const groups = match.groups ?? {};
    let value = match[0];

    if (groups.link) {
      value = trimLink(groups.link);
      pushText(body.slice(cursor, start));
      tokens.push({ type: "link", value, href: value, display: displayLink(value) });
    } else if (groups.hashtag) {
      const tag = groups.hashtag.slice(1);
      // Require at least one letter so "#1" (as in "we're #1") stays text.
      if (!/\p{L}/u.test(tag)) continue;
      pushText(body.slice(cursor, start));
      tokens.push({ type: "hashtag", value, tag: tag.toLowerCase() });
    } else if (groups.mention) {
      pushText(body.slice(cursor, start));
      tokens.push({ type: "mention", value, username: groups.mention.slice(1).toLowerCase() });
    } else {
      continue;
    }
    cursor = start + value.length;
  }
  pushText(body.slice(cursor));
  return tokens;
}

export function extractHashtags(body: string): string[] {
  const tags = new Set<string>();
  for (const t of tokenize(body)) if (t.type === "hashtag") tags.add(t.tag);
  return [...tags].slice(0, 20);
}

export function extractMentions(body: string): string[] {
  const names = new Set<string>();
  for (const t of tokenize(body)) if (t.type === "mention") names.add(t.username);
  // Cap who a single post can notify (anti-spam).
  return [...names].slice(0, 10);
}

/** Length as people perceive it: grapheme clusters (an emoji counts once). */
export function charCount(text: string): number {
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  let n = 0;
  for (const _ of segmenter.segment(text)) n++;
  return n;
}

/** Normalise user-entered text: unify newlines, trim, collapse 3+ blank lines. */
export function normalizeBody(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[​-‍﻿]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
