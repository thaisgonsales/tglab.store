import "server-only";

import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { getEnv } from "@/lib/env";

const PRIVATE_ROOT = path.join(process.cwd(), ".private-uploads");

function safeLocalPath(key: string): string {
  const normalized = path
    .normalize(key)
    .replace(/^(\.\.(\/|\\|$))+/, "")
    .replace(/^[/\\]+/, "");
  const full = path.join(PRIVATE_ROOT, normalized);
  const relative = path.relative(PRIVATE_ROOT, full);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Ruta privada inválida");
  }
  return full;
}

function s3Config() {
  const env = getEnv();
  if (
    !env.S3_ENDPOINT ||
    !env.S3_ACCESS_KEY_ID ||
    !env.S3_SECRET_ACCESS_KEY ||
    !env.S3_PRIVATE_BUCKET
  ) {
    throw new Error("Almacenamiento privado S3 no configurado");
  }
  return env;
}

let s3: S3Client | null = null;
function client(): S3Client {
  if (s3) return s3;
  const env = s3Config();
  s3 = new S3Client({
    region: env.S3_REGION || "auto",
    endpoint: env.S3_ENDPOINT,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });
  return s3;
}

export async function putPrivateObject(input: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<void> {
  const env = getEnv();
  if (env.STORAGE_DRIVER === "local") {
    const full = safeLocalPath(input.key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, input.body);
    return;
  }
  await client().send(
    new PutObjectCommand({
      Bucket: s3Config().S3_PRIVATE_BUCKET,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      CacheControl: "private, no-store",
    }),
  );
}

export async function getPrivateObject(key: string): Promise<Buffer> {
  const env = getEnv();
  if (env.STORAGE_DRIVER === "local") return readFile(safeLocalPath(key));
  const result = await client().send(
    new GetObjectCommand({ Bucket: s3Config().S3_PRIVATE_BUCKET, Key: key }),
  );
  if (!result.Body) throw new Error("Archivo privado vacío");
  return Buffer.from(await result.Body.transformToByteArray());
}

export async function deletePrivateObject(key: string): Promise<void> {
  const env = getEnv();
  if (env.STORAGE_DRIVER === "local") {
    await unlink(safeLocalPath(key)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
    return;
  }
  await client().send(
    new DeleteObjectCommand({
      Bucket: s3Config().S3_PRIVATE_BUCKET,
      Key: key,
    }),
  );
}
