import { unstable_rethrow } from "next/navigation";
import { AppError } from "@/server/errors";

export type ActionResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };

/** Idle state for useActionState. */
export const IDLE = { ok: true } as ActionResult;

/**
 * Run an action body, turning user-facing AppErrors into `{ ok: false }` and
 * letting Next's control-flow errors (redirect/notFound) pass through.
 */
export async function guarded<T extends object>(fn: () => Promise<T | void>): Promise<ActionResult<T>> {
  try {
    const value = await fn();
    return { ok: true, ...(value ?? {}) } as ActionResult<T>;
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof AppError) return { ok: false, error: err.message };
    console.error("[action] unexpected error", err);
    return { ok: false, error: "Something went wrong on our side. Please try again." };
  }
}

export function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

export async function fileBuffer(value: FormDataEntryValue | null): Promise<Buffer | null> {
  if (!value || typeof value === "string" || value.size === 0) return null;
  return Buffer.from(await value.arrayBuffer());
}
