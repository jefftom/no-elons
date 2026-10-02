/**
 * Image pipeline. Every upload is decoded and re-encoded server-side:
 *  - format is sniffed from the bytes, never trusted from the client
 *  - EXIF orientation is applied, then ALL metadata (GPS, camera, etc.) is dropped
 *  - images are resized and stored as WebP, plus a square thumbnail for grids
 *  - the dominant colour is kept as a loading placeholder
 * Work happens at upload time so serving is just static files behind a CDN.
 */
import sharp, { type Metadata } from "sharp";
import { uuidv7 } from "@/lib/ids";
import { LIMITS } from "@/lib/limits";
import { AppError } from "./errors";
import { storage } from "./storage";

const ACCEPTED = new Set(["jpeg", "png", "webp", "gif", "avif", "heif", "tiff"]);

sharp.cache(false);

export type StoredPhoto = {
  storageKey: string;
  thumbKey: string;
  width: number;
  height: number;
  color: string;
};

async function decode(input: Buffer) {
  if (input.byteLength > LIMITS.mediaBytes) {
    throw new AppError(`Images must be ${LIMITS.mediaBytes / 1024 / 1024} MB or smaller.`);
  }
  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: 60_000_000 }).metadata();
  } catch {
    throw new AppError("That file isn't an image we can read.");
  }
  if (!meta.format || !ACCEPTED.has(meta.format)) {
    throw new AppError("Upload a JPEG, PNG, WebP, GIF or AVIF image.");
  }
  // .rotate() with no args applies EXIF orientation; output has no metadata by default.
  return sharp(input, { limitInputPixels: 60_000_000, animated: false }).rotate();
}

function toHex({ r, g, b }: { r: number; g: number; b: number }): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function datedPrefix(kind: string): string {
  const now = new Date();
  return `${kind}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function storePostPhoto(input: Buffer): Promise<StoredPhoto> {
  const image = await decode(input);
  const id = uuidv7();
  const prefix = datedPrefix("p");

  const full = await image
    .clone()
    .resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  const thumb = await image
    .clone()
    .resize({ width: 640, height: 640, fit: "cover", position: "attention" })
    .webp({ quality: 74 })
    .toBuffer();
  const { dominant } = await sharp(thumb).stats();

  const storageKey = `${prefix}/${id}.webp`;
  const thumbKey = `${prefix}/${id}_t.webp`;
  await Promise.all([storage.put(storageKey, full.data, "image/webp"), storage.put(thumbKey, thumb, "image/webp")]);
  return { storageKey, thumbKey, width: full.info.width, height: full.info.height, color: toHex(dominant) };
}

export async function storeAvatar(input: Buffer): Promise<string> {
  const image = await decode(input);
  const data = await image.resize({ width: 400, height: 400, fit: "cover", position: "attention" }).webp({ quality: 82 }).toBuffer();
  const key = `${datedPrefix("a")}/${uuidv7()}.webp`;
  await storage.put(key, data, "image/webp");
  return key;
}

export async function storeBanner(input: Buffer): Promise<string> {
  const image = await decode(input);
  const data = await image.resize({ width: 1500, height: 500, fit: "cover", position: "attention" }).webp({ quality: 80 }).toBuffer();
  const key = `${datedPrefix("b")}/${uuidv7()}.webp`;
  await storage.put(key, data, "image/webp");
  return key;
}

export async function deleteBlobs(keys: Array<string | null | undefined>): Promise<void> {
  await Promise.all(keys.filter((k): k is string => !!k).map((k) => storage.delete(k).catch(() => {})));
}
