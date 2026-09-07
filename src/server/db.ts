import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { getEnv } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  const { DATABASE_URL, NODE_ENV } = getEnv();
  const log: ("warn" | "error")[] =
    NODE_ENV === "development" ? ["warn", "error"] : ["error"];

  // Prisma 7 exige un driver adapter, salvo para URLs de Prisma Accelerate /
  // Prisma Postgres (`prisma+postgres://` o `prisma://`).
  if (
    DATABASE_URL.startsWith("prisma+postgres://") ||
    DATABASE_URL.startsWith("prisma://")
  ) {
    return new PrismaClient({ accelerateUrl: DATABASE_URL, log });
  }

  const adapter = new PrismaPg({ connectionString: DATABASE_URL });
  return new PrismaClient({ adapter, log });
}

export const db: PrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
