import { fullTimestamp, relativeTime } from "@/lib/time";

export function RelativeTime({ date, className = "" }: { date: Date; className?: string }) {
  return (
    <time dateTime={date.toISOString()} title={fullTimestamp(date)} className={className}>
      {relativeTime(date)}
    </time>
  );
}
