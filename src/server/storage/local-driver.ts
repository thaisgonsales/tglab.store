import "server-only";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import type { PutInput, StorageProvider, StoredObject } from "./types";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

/**
 * Almacenamiento en el filesystem local, bajo `public/uploads/`.
 * Solo para desarrollo: en producción se usa S3 (Cloudflare R2).
 */
export class LocalStorageDriver implements StorageProvider {
  readonly driver = "local" as const;

  isConfigured(): boolean {
    return true;
  }

  private safePath(key: string): string {
    const normalized = path
      .normalize(key)
      .replace(/^(\.\.(\/|\\|$))+/, "")
      .replace(/^[/\\]+/, "");
    const full = path.join(UPLOAD_ROOT, normalized);
    if (!full.startsWith(UPLOAD_ROOT)) {
      throw new Error("Ruta de archivo inválida");
    }
    return full;
  }

  async put(input: PutInput): Promise<StoredObject> {
    const full = this.safePath(input.key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, input.body);
    return { key: input.key, url: this.publicUrl(input.key) };
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.safePath(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }

  publicUrl(key: string): string {
    // Servido por src/app/api/media/[...path]/route.ts (funciona también con
    // `next start`, a diferencia de escribir en /public tras el build).
    return `/api/media/${key.replace(/^[/\\]+/, "")}`;
  }
}
