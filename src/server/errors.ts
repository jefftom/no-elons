/** A user-facing error: its message is safe to show in the UI. */
export class AppError extends Error {
  constructor(
    message: string,
    readonly code: "invalid" | "not_found" | "forbidden" | "conflict" | "rate_limited" = "invalid",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  const e = err as { code?: string; constraint_name?: string; cause?: unknown };
  if (e?.code === "23505") return !constraint || e.constraint_name === constraint;
  if (e?.cause) return isUniqueViolation(e.cause, constraint);
  return false;
}
