-- AlterTable
ALTER TABLE "order" ADD COLUMN     "personalizationTermsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "personalizationTermsVersion" TEXT;

-- AlterTable
ALTER TABLE "order_item" ADD COLUMN     "isPersonalized" BOOLEAN NOT NULL DEFAULT false;

