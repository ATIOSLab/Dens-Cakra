-- CreateTable
CREATE TABLE "JaringOccupation" (
    "id" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JaringOccupation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JaringOccupation_code_key" ON "JaringOccupation"("code");

-- CreateIndex
CREATE UNIQUE INDEX "JaringOccupation_name_key" ON "JaringOccupation"("name");

-- CreateIndex
CREATE INDEX "JaringOccupation_isActive_name_idx" ON "JaringOccupation"("isActive", "name");

-- Add the new relation column before removing the legacy free-text value.
ALTER TABLE "Jaring" ADD COLUMN "occupationId" UUID;

-- Preserve every existing free-text occupation as an active master record.
INSERT INTO "JaringOccupation" (
    "id",
    "code",
    "name",
    "description",
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid(),
    'LEGACY_' || UPPER(SUBSTRING(MD5(TRIM("occupation")) FROM 1 FOR 24)),
    TRIM("occupation"),
    'Dimigrasikan otomatis dari data Jaring yang sudah ada.',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Jaring"
WHERE NULLIF(TRIM("occupation"), '') IS NOT NULL
GROUP BY TRIM("occupation");

UPDATE "Jaring" AS j
SET "occupationId" = o."id"
FROM "JaringOccupation" AS o
WHERE TRIM(j."occupation") = o."name";

-- The legacy employment status is intentionally removed from the domain.
ALTER TABLE "Jaring"
DROP COLUMN "employmentStatus",
DROP COLUMN "occupation";

DROP TYPE "JaringEmploymentStatus";

-- CreateIndex
CREATE INDEX "Jaring_occupationId_idx" ON "Jaring"("occupationId");

-- AddForeignKey
ALTER TABLE "Jaring" ADD CONSTRAINT "Jaring_occupationId_fkey" FOREIGN KEY ("occupationId") REFERENCES "JaringOccupation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
