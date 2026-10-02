import { describe, expect, it } from "vitest";
import { isUuid, parseCursor, uuidv7, uuidv7Timestamp } from "@/lib/ids";
import { editWindowOpen } from "@/lib/limits";
import { compactNumber, relativeTime } from "@/lib/time";
import { profileSchema, safeNextPath, signupSchema, usernameSchema } from "@/lib/validation";

describe("uuidv7", () => {
  it("is a valid v7 uuid that encodes its timestamp", () => {
    const ts = Date.UTC(2026, 0, 2, 3, 4, 5);
    const id = uuidv7(ts);
    expect(isUuid(id)).toBe(true);
    expect(id[14]).toBe("7");
    expect(uuidv7Timestamp(id)).toBe(ts);
  });

  it("sorts by creation time", () => {
    const ids = [uuidv7(3000), uuidv7(1000), uuidv7(2000)];
    expect([...ids].sort()).toEqual([ids[1], ids[2], ids[0]]);
  });

  it("only accepts well-formed cursors", () => {
    expect(parseCursor("not-a-cursor")).toBeNull();
    expect(parseCursor("'; drop table users; --")).toBeNull();
    const id = uuidv7();
    expect(parseCursor(id.toUpperCase())).toBe(id);
  });
});

describe("validation", () => {
  it("normalises and validates usernames", () => {
    expect(usernameSchema.parse("  Jane_Doe ")).toBe("jane_doe");
    expect(usernameSchema.safeParse("ab").success).toBe(false);
    expect(usernameSchema.safeParse("has space").success).toBe(false);
    expect(usernameSchema.safeParse("admin").success).toBe(false);
    expect(usernameSchema.safeParse("elon").success).toBe(false);
    expect(usernameSchema.safeParse("melon").success).toBe(true);
    expect(usernameSchema.safeParse("postmaster").success).toBe(false);
    expect(usernameSchema.safeParse("abuse").success).toBe(false);
  });

  it("validates signup", () => {
    const ok = signupSchema.safeParse({ username: "jane", displayName: "Jane", email: "JANE@Example.com", password: "long-enough-pw" });
    expect(ok.success && ok.data.email).toBe("jane@example.com");
    expect(signupSchema.safeParse({ username: "jane", displayName: "Jane", email: "nope", password: "long-enough-pw" }).success).toBe(false);
    expect(signupSchema.safeParse({ username: "jane", displayName: "Jane", email: "a@b.co", password: "short" }).success).toBe(false);
  });

  it("adds https:// to bare websites and rejects javascript: urls", () => {
    const base = { displayName: "J", bio: "", location: "" };
    expect(profileSchema.parse({ ...base, website: "example.com" }).website).toBe("https://example.com");
    expect(profileSchema.safeParse({ ...base, website: "javascript:alert(1)" }).success).toBe(false);
  });

  it("only allows local redirect targets", () => {
    expect(safeNextPath("/settings")).toBe("/settings");
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("/\\evil.com")).toBe("/");
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath(undefined, "/home")).toBe("/home");
    // Browsers strip tabs/newlines, so these would otherwise resolve to evil.com.
    expect(safeNextPath("/\t/evil.com")).toBe("/");
    expect(safeNextPath("/\n/evil.com")).toBe("/");
    expect(safeNextPath("/p/123?x=1#reply")).toBe("/p/123?x=1#reply");
  });
});

describe("time + numbers", () => {
  const now = new Date("2026-10-02T12:00:00Z");
  it("formats compact relative times", () => {
    expect(relativeTime(new Date("2026-10-02T11:59:58Z"), now)).toBe("now");
    expect(relativeTime(new Date("2026-10-02T11:59:15Z"), now)).toBe("45s");
    expect(relativeTime(new Date("2026-10-02T11:15:00Z"), now)).toBe("45m");
    expect(relativeTime(new Date("2026-10-02T02:00:00Z"), now)).toBe("10h");
    expect(relativeTime(new Date("2026-03-04T02:00:00Z"), now)).toBe("Mar 4");
    expect(relativeTime(new Date("2024-03-04T02:00:00Z"), now)).toBe("Mar 4, 2024");
  });

  it("abbreviates big numbers", () => {
    expect(compactNumber(999)).toBe("999");
    expect(compactNumber(1234)).toBe("1.2K");
    expect(compactNumber(12_345)).toBe("12K");
    expect(compactNumber(1_500_000)).toBe("1.5M");
  });

  it("knows when the edit window has closed", () => {
    expect(editWindowOpen(new Date(now.getTime() - 59 * 60_000), now)).toBe(true);
    expect(editWindowOpen(new Date(now.getTime() - 61 * 60_000), now)).toBe(false);
  });
});
