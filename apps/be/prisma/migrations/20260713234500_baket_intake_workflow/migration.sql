ALTER TYPE "WhatsAppMessageStatus" ADD VALUE IF NOT EXISTS 'READY_FOR_BAKET';

ALTER TABLE "Baket"
  ADD COLUMN "reportCategoryId" UUID,
  ADD COLUMN "jaringClusterId" UUID;

ALTER TABLE "WhatsAppMessage"
  ADD COLUMN "convertedBaketId" UUID;

UPDATE "Baket" b
SET "reportCategoryId" = source."categoryId"
FROM (
  SELECT DISTINCT ON (v."baketId")
    v."baketId",
    m."categoryId"
  FROM "BaketVersion" v
  JOIN "BaketVersionSourceMessage" link ON link."baketVersionId" = v.id
  JOIN "WhatsAppMessage" m ON m.id = link."messageId"
  WHERE m."categoryId" IS NOT NULL
  ORDER BY v."baketId", v."versionNumber" DESC
) source
WHERE b.id = source."baketId";

UPDATE "Baket" b
SET "jaringClusterId" = j."clusterId"
FROM "Jaring" j
WHERE b."primaryJaringId" = j.id
  AND j."clusterId" IS NOT NULL;

CREATE INDEX "Baket_reportCategoryId_status_idx"
  ON "Baket"("reportCategoryId", "status");
CREATE INDEX "Baket_jaringClusterId_status_idx"
  ON "Baket"("jaringClusterId", "status");
CREATE UNIQUE INDEX "WhatsAppMessage_convertedBaketId_key"
  ON "WhatsAppMessage"("convertedBaketId");

ALTER TABLE "WhatsAppMessage"
  ADD CONSTRAINT "WhatsAppMessage_convertedBaketId_fkey"
  FOREIGN KEY ("convertedBaketId") REFERENCES "Baket"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Baket"
  ADD CONSTRAINT "Baket_reportCategoryId_fkey"
  FOREIGN KEY ("reportCategoryId") REFERENCES "ReportCategory"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Baket"
  ADD CONSTRAINT "Baket_jaringClusterId_fkey"
  FOREIGN KEY ("jaringClusterId") REFERENCES "JaringCluster"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
