import "server-only";

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { getEnv } from "@/lib/env";
import type { PutInput, StorageProvider, StoredObject } from "./types";

/**
 * Almacenamiento S3-compatible (Cloudflare R2). Egress gratis, sin costo fijo.
 * Requiere S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET y
 * S3_PUBLIC_URL (dominio público / CDN desde donde se sirven los archivos).
 */
export class S3StorageDriver implements StorageProvider {
  readonly driver = "s3" as const;
  private client: S3Client | null = null;

  private config() {
    const env = getEnv();
    return {
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      bucket: env.S3_BUCKET,
      publicUrl: env.S3_PUBLIC_URL.replace(/\/+$/, ""),
    };
  }

  isConfigured(): boolean {
    const c = this.config();
    return Boolean(
      c.endpoint &&
      c.accessKeyId &&
      c.secretAccessKey &&
      c.bucket &&
      c.publicUrl,
    );
  }

  private getClient(): S3Client {
    if (this.client) return this.client;
    const c = this.config();
    this.client = new S3Client({
      region: c.region || "auto",
      endpoint: c.endpoint,
      credentials: {
        accessKeyId: c.accessKeyId,
        secretAccessKey: c.secretAccessKey,
      },
      forcePathStyle: true,
    });
    return this.client;
  }

  async put(input: PutInput): Promise<StoredObject> {
    if (!this.isConfigured()) {
      throw new Error("Almacenamiento S3 no configurado");
    }
    const { bucket } = this.config();
    await this.getClient().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return { key: input.key, url: this.publicUrl(input.key) };
  }

  async delete(key: string): Promise<void> {
    if (!this.isConfigured()) return;
    const { bucket } = this.config();
    await this.getClient().send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key }),
    );
  }

  publicUrl(key: string): string {
    return `${this.config().publicUrl}/${key.replace(/^\/+/, "")}`;
  }
}
