DO $$
BEGIN
  CREATE TYPE "Classification" AS ENUM ('SANGAT_RAHASIA', 'RAHASIA', 'TERBATAS', 'BIASA');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "DirectiveVersion"
ADD COLUMN "classification" "Classification";

UPDATE "DirectiveVersion"
SET "classification" = 'TERBATAS'
WHERE "classification" IS NULL;

ALTER TABLE "DirectiveVersion"
ALTER COLUMN "classification" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "DirectiveVersion_classification_commandDate_idx"
ON "DirectiveVersion"("classification", "commandDate");
