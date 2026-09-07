export type StoredObject = {
  key: string;
  url: string;
};

export type PutInput = {
  body: Buffer;
  /** Ruta relativa dentro del bucket, sin barra inicial. */
  key: string;
  contentType: string;
};

export interface StorageProvider {
  readonly driver: "local" | "s3";
  isConfigured(): boolean;
  put(input: PutInput): Promise<StoredObject>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
}
