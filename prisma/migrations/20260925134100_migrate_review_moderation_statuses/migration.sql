ALTER TABLE "product_review"
  ALTER COLUMN "status" DROP DEFAULT;

UPDATE "product_review"
SET "status" = 'APPROVED'
WHERE "status" = 'PUBLISHED';

UPDATE "product_review"
SET "status" = 'REJECTED'
WHERE "status" = 'HIDDEN';

ALTER TABLE "product_review"
  ALTER COLUMN "status" SET DEFAULT 'PENDING';
