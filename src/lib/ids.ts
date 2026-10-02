import { randomBytes } from "node:crypto";

/**
 * RFC 9562 UUIDv7: 48-bit unix-ms timestamp + random bits.
 * Ids sort by creation time, which lets every list in the app paginate with
 * a simple `id < cursor` keyset instead of OFFSET.
 */
export function uuidv7(timestampMs: number = Date.now()): string {
  const bytes = randomBytes(16);
  let ts = BigInt(Math.max(0, Math.floor(timestampMs)));
  for (let i = 5; i >= 0; i--) {
    bytes[i] = Number(ts & 0xffn);
    ts >>= 8n;
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70; // version 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Extract the creation time encoded in a UUIDv7. */
export function uuidv7Timestamp(id: string): number {
  return parseInt(id.replace(/-/g, "").slice(0, 12), 16);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** Cursors are just the last id seen; validate before they reach SQL. */
export function parseCursor(value: unknown): string | null {
  return isUuid(value) ? value.toLowerCase() : null;
}
