-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'NOTA_CREDITO';

-- AlterTable
ALTER TABLE "document_record" ADD COLUMN     "amount" INTEGER;

