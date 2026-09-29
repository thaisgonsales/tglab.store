import "server-only";

import { createHash } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";

type RateLimitRow = { count: number; resetAt: Date };

/** Contador atómico compartido por todas las instancias mediante PostgreSQL. */
export async function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): Promise<{ ok: boolean; remaining: number; retryAfterMs: number }> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + opts.windowMs);
  const storedKey = createHash("sha256").update(key).digest("hex");
  const rows = await db.$queryRaw<RateLimitRow[]>(Prisma.sql`
    INSERT INTO "application_rate_limit" ("key", "count", "resetAt", "updatedAt")
    VALUES (${storedKey}, 1, ${resetAt}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "application_rate_limit"."resetAt" <= ${now} THEN 1
        ELSE "application_rate_limit"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "application_rate_limit"."resetAt" <= ${now} THEN ${resetAt}
        ELSE "application_rate_limit"."resetAt"
      END,
      "updatedAt" = ${now}
    RETURNING "count", "resetAt"
  `);
  const row = rows[0];
  if (!row) throw new Error("No se pudo aplicar el límite de solicitudes");
  const ok = row.count <= opts.limit;
  return {
    ok,
    remaining: Math.max(0, opts.limit - row.count),
    retryAfterMs: ok ? 0 : Math.max(0, row.resetAt.getTime() - now.getTime()),
  };
}

/** Extrae una IP aproximada entregada por el proxy de confianza. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
