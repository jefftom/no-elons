import { describe, expect, it } from "vitest";
import { charCount, extractHashtags, extractMentions, normalizeBody, tokenize } from "@/lib/text";

describe("tokenize", () => {
  it("splits hashtags, mentions and links out of text", () => {
    const tokens = tokenize("Hi @Maya! Look: https://example.com/a?b=1. #GoldenHour rocks");
    expect(tokens).toEqual([
      { type: "text", value: "Hi " },
      { type: "mention", value: "@Maya", username: "maya" },
      { type: "text", value: "! Look: " },
      { type: "link", value: "https://example.com/a?b=1", href: "https://example.com/a?b=1", display: "example.com/a?b=1" },
      { type: "text", value: ". " },
      { type: "hashtag", value: "#GoldenHour", tag: "goldenhour" },
      { type: "text", value: " rocks" },
    ]);
  });

  it("doesn't treat URL fragments or emails as tags/mentions", () => {
    const tokens = tokenize("see https://site.com/page#section and mail me@example.com");
    expect(tokens.filter((t) => t.type === "hashtag")).toHaveLength(0);
    expect(tokens.filter((t) => t.type === "mention")).toHaveLength(0);
    expect(tokens.filter((t) => t.type === "link")).toHaveLength(1);
  });

  it("requires a letter in hashtags", () => {
    expect(extractHashtags("we're #1 and #2026 but #y2k counts")).toEqual(["y2k"]);
  });

  it("supports non-latin hashtags", () => {
    expect(extractHashtags("#café #東京 #привет")).toEqual(["café", "東京", "привет"]);
  });

  it("keeps balanced parentheses in links", () => {
    const [link] = tokenize("https://en.wikipedia.org/wiki/Bus_(disambiguation)").filter((t) => t.type === "link");
    expect(link && link.type === "link" && link.href).toBe("https://en.wikipedia.org/wiki/Bus_(disambiguation)");
  });

  it("trims trailing punctuation from links", () => {
    const [link] = tokenize("(see https://example.com/x).").filter((t) => t.type === "link");
    expect(link && link.type === "link" && link.href).toBe("https://example.com/x");
  });

  it("round-trips: concatenated token values equal the input", () => {
    const input = "a #b @cc https://d.e/f, g\nh";
    expect(tokenize(input).map((t) => t.value).join("")).toBe(input);
  });

  it("dedupes and lower-cases extracted entities", () => {
    expect(extractMentions("@Theo @theo @ravi")).toEqual(["theo", "ravi"]);
    expect(extractHashtags("#Bikes #bikes")).toEqual(["bikes"]);
  });
});

describe("charCount / normalizeBody", () => {
  it("counts grapheme clusters, not UTF-16 units", () => {
    expect(charCount("👩‍👩‍👧‍👦")).toBe(1);
    expect(charCount("héllo")).toBe(5);
  });

  it("normalises newlines and trims", () => {
    expect(normalizeBody("  hi\r\n\r\n\r\n\r\nthere ​ ")).toBe("hi\n\nthere");
  });
});

describe("mentions of other servers", () => {
  it("doesn't treat @user@domain as a local mention", () => {
    expect(extractMentions("hi @maya@mastodon.social and @theo")).toEqual(["theo"]);
    expect(tokenize("@maya@mastodon.social").every((t) => t.type === "text")).toBe(true);
  });

  it("caps mentions per post", () => {
    const body = Array.from({ length: 15 }, (_, i) => `@user${i}`).join(" ");
    expect(extractMentions(body)).toHaveLength(10);
  });
});
