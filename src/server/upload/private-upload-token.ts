import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { getEnv } from "@/lib/env";

const payloadSchema = z.object({
  key: z.string().regex(/^solicitudes\/[A-Za-z0-9_-]{21}\.webp$/),
  mime: z.literal("image/webp"),
  size: z.number().int().positive(),
  exp: z.number().int().positive(),
});

export type PrivateUploadClaim = z.infer<typeof payloadSchema>;

function sign(encoded: string): string {
  return createHmac("sha256", getEnv().BETTER_AUTH_SECRET)
    .update(encoded)
    .digest("base64url");
}

export function createPrivateUploadToken(
  claim: Omit<PrivateUploadClaim, "exp">,
): string {
  const payload: PrivateUploadClaim = {
    ...claim,
    exp: Date.now() + 60 * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyPrivateUploadToken(token: string): PrivateUploadClaim {
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra) throw new Error("Token inválido");
  const expected = sign(encoded);
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    throw new Error("Firma inválida");
  }
  const parsed = payloadSchema.parse(
    JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")),
  );
  if (parsed.exp < Date.now()) throw new Error("Token vencido");
  return parsed;
}
