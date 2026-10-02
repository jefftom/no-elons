const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const shortDateYear = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const fullFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});
const monthYear = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

/** Old-Twitter-style compact timestamps: "now", "42s", "5m", "3h", "Mar 4", "Mar 4, 2023". */
export function relativeTime(date: Date, now: Date = new Date()): string {
  const diff = now.getTime() - date.getTime();
  if (diff < 10_000) return "now";
  if (diff < MINUTE) return `${Math.floor(diff / 1000)}s`;
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (date.getUTCFullYear() === now.getUTCFullYear()) return shortDate.format(date);
  return shortDateYear.format(date);
}

export function fullTimestamp(date: Date): string {
  return `${fullFormat.format(date)} UTC`;
}

export function joinedDate(date: Date): string {
  return monthYear.format(date);
}

/** 1234 → "1.2K", 1_200_000 → "1.2M" */
export function compactNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, "")}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}
