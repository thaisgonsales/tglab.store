-- CreateEnum
CREATE TYPE "ResolutionRequestType" AS ENUM ('CANCELLATION', 'RETURN', 'REFUND');

-- CreateEnum
CREATE TYPE "ResolutionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "order_resolution_request" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "ResolutionRequestType" NOT NULL,
    "status" "ResolutionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "channel" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "decidedByName" TEXT,
    "decisionNote" TEXT,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "order_resolution_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_resolution_request_orderId_status_idx" ON "order_resolution_request"("orderId", "status");

-- AddForeignKey
ALTER TABLE "order_resolution_request" ADD CONSTRAINT "order_resolution_request_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

