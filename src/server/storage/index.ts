/**
 * Blob storage for user media.
 *
 * The app talks to this interface only. `local` writes to disk and serves via
 * the /media route (fine for one box). In production swap in an S3-compatible
 * driver (R2, S3, MinIO) and put a CDN in front — keys are content-addressed
 * by UUID and never change, so they can be cached forever.
 */
import { LocalStorage } from "./local";

export interface BlobStorage {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  /** Public URL a browser can load the blob from. */
  url(key: string): string;
}

const KEY_RE = /^[a-z0-9]+(?:\/[a-z0-9_-]+)*\.webp$/;

export function isValidKey(key: string): boolean {
  return KEY_RE.test(key) && !key.includes("..");
}

const globalForStorage = globalThis as unknown as { __noelonsStorage?: BlobStorage };

export const storage: BlobStorage =
  globalForStorage.__noelonsStorage ?? (globalForStorage.__noelonsStorage = new LocalStorage());

export function mediaUrl(key: string | null | undefined): string | null {
  return key ? storage.url(key) : null;
}
