-- The submitted report is version 1. Existing follow-up amendments are
-- deterministically backfilled as version 2 and above per report.
ALTER TABLE "WhatsAppReportAmendment"
ADD COLUMN "versionNumber" INTEGER;

WITH ranked_amendments AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "whatsappMessageId"
      ORDER BY "createdAt" ASC, "id" ASC
    ) + 1 AS "versionNumber"
  FROM "WhatsAppReportAmendment"
)
UPDATE "WhatsAppReportAmendment" AS amendment
SET "versionNumber" = ranked."versionNumber"
FROM ranked_amendments AS ranked
WHERE amendment."id" = ranked."id";

ALTER TABLE "WhatsAppReportAmendment"
ALTER COLUMN "versionNumber" SET NOT NULL;

CREATE UNIQUE INDEX "WhatsAppReportAmendment_whatsappMessageId_versionNumber_key"
ON "WhatsAppReportAmendment"("whatsappMessageId", "versionNumber");
