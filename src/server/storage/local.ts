import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BlobStorage } from "./index";

export class LocalStorage implements BlobStorage {
  private readonly root: string;
  private readonly publicBase: string;

  constructor(root = process.env.MEDIA_DIR ?? "./.data/media", publicBase = process.env.MEDIA_PUBLIC_BASE_URL ?? "/media") {
    this.root = path.resolve(root);
    this.publicBase = publicBase.replace(/\/$/, "");
  }

  private resolve(key: string): string {
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error("Invalid storage key");
    return full;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await readFile(this.resolve(key));
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }

  url(key: string): string {
    return `${this.publicBase}/${key}`;
  }
}
