CREATE TABLE "application_rate_limit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_rate_limit_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "application_rate_limit_resetAt_idx"
ON "application_rate_limit"("resetAt");
