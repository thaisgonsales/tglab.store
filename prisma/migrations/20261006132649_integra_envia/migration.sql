-- AlterTable
ALTER TABLE "order" ADD COLUMN     "shippingLabelCreatedAt" TIMESTAMP(3),
ADD COLUMN     "shippingLabelPrice" INTEGER,
ADD COLUMN     "shippingLabelRequestedAt" TIMESTAMP(3),
ADD COLUMN     "shippingLabelUrl" TEXT,
ADD COLUMN     "shippingShipmentId" TEXT;

-- AlterTable
ALTER TABLE "order_item" ADD COLUMN     "packageHeightCm" INTEGER,
ADD COLUMN     "packageLengthCm" INTEGER,
ADD COLUMN     "packageWeightGrams" INTEGER,
ADD COLUMN     "packageWidthCm" INTEGER;

