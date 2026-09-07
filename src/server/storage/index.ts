import "server-only";

import { getEnv } from "@/lib/env";
import { LocalStorageDriver } from "./local-driver";
import { S3StorageDriver } from "./s3-driver";
import type { StorageProvider } from "./types";

let cached: StorageProvider | null = null;

/** Devuelve el proveedor de almacenamiento según `STORAGE_DRIVER`. */
export function getStorage(): StorageProvider {
  if (cached) return cached;
  const { STORAGE_DRIVER } = getEnv();
  cached =
    STORAGE_DRIVER === "s3" ? new S3StorageDriver() : new LocalStorageDriver();
  return cached;
}

export type { StorageProvider } from "./types";
