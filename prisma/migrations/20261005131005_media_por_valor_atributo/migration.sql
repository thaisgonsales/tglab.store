-- AlterTable
ALTER TABLE "product_media" ADD COLUMN     "attributeValueId" TEXT;

-- CreateIndex
CREATE INDEX "product_media_attributeValueId_idx" ON "product_media"("attributeValueId");

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_attributeValueId_fkey" FOREIGN KEY ("attributeValueId") REFERENCES "attribute_value"("id") ON DELETE SET NULL ON UPDATE CASCADE;

