-- CreateEnum
CREATE TYPE "StockReservationStatus" AS ENUM ('HELD', 'RELEASED', 'CONSUMED');

-- AlterTable
ALTER TABLE "order" ADD COLUMN     "comuna" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "shippingRateId" TEXT;

-- CreateTable
CREATE TABLE "stock_reservation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "StockReservationStatus" NOT NULL DEFAULT 'HELD',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_reservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_reservation_status_expiresAt_idx" ON "stock_reservation"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "stock_reservation_variantId_idx" ON "stock_reservation"("variantId");

-- CreateIndex
CREATE INDEX "stock_reservation_orderId_idx" ON "stock_reservation"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "order_idempotencyKey_key" ON "order"("idempotencyKey");

-- CreateIndex
CREATE INDEX "order_expiresAt_idx" ON "order"("expiresAt");

-- AddForeignKey
ALTER TABLE "stock_reservation" ADD CONSTRAINT "stock_reservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservation" ADD CONSTRAINT "stock_reservation_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Secuencia para el número de pedido (TG-000001, TG-000002, …)
CREATE SEQUENCE IF NOT EXISTS "order_number_seq" START WITH 1 INCREMENT BY 1;
