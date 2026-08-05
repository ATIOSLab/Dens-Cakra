-- Preserve historic headlines as report content before removing headline columns.
UPDATE "WhatsAppReportSession"
SET "content" = CASE
  WHEN "content" IS NULL OR btrim("content") = '' THEN btrim("title")
  WHEN position(lower(btrim("title")) in lower("content")) > 0 THEN "content"
  ELSE btrim("title") || E'\n\n' || "content"
END
WHERE "title" IS NOT NULL
  AND btrim("title") <> '';

-- The raw-message immutability guard intentionally blocks content updates.
-- Disable only that guard for this one-time headline backfill; the whole
-- migration remains transactional and the guard is restored below.
ALTER TABLE "WhatsAppMessage"
  DISABLE TRIGGER "trg_guard_whatsapp_message_mutation";

UPDATE "WhatsAppMessage"
SET "content" = CASE
  WHEN "content" IS NULL OR btrim("content") = '' THEN btrim("title")
  WHEN position(lower(btrim("title")) in lower("content")) > 0 THEN "content"
  ELSE btrim("title") || E'\n\n' || "content"
END
WHERE "title" IS NOT NULL
  AND btrim("title") <> '';

UPDATE "BaketVersion"
SET "originalContent" = CASE
  WHEN btrim("originalContent") = '' THEN btrim("title")
  WHEN position(lower(btrim("title")) in lower("originalContent")) > 0 THEN "originalContent"
  ELSE btrim("title") || E'\n\n' || "originalContent"
END
WHERE btrim("title") <> '';

-- Existing drafts continue in the single flexible collection state.
UPDATE "WhatsAppReportSession"
SET
  "currentState" = 'CONTENT',
  "returnToReview" = false,
  "resumeState" = NULL,
  "pendingAmendmentText" = NULL,
  "pendingFileId" = NULL
WHERE "status" = 'ACTIVE';

DROP INDEX IF EXISTS "BaketVersion_eventAreaId_eventTime_idx";

ALTER TABLE "WhatsAppReportSession"
  DROP COLUMN "title",
  DROP COLUMN "incidentAt";

ALTER TABLE "WhatsAppMessage"
  DROP COLUMN "title";

ALTER TABLE "BaketVersion"
  DROP COLUMN "title",
  DROP COLUMN "eventTime";

-- Keep the immutable raw-message contract valid after the title column is gone.
CREATE OR REPLACE FUNCTION dens_cakra_guard_whatsapp_message_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'WhatsAppMessage records cannot be deleted.';
  END IF;

  IF OLD."integrationChannelId" IS DISTINCT FROM NEW."integrationChannelId"
    OR OLD."externalMessageId" IS DISTINCT FROM NEW."externalMessageId"
    OR OLD."senderPhone" IS DISTINCT FROM NEW."senderPhone"
    OR OLD."content" IS DISTINCT FROM NEW."content"
    OR OLD."latitude" IS DISTINCT FROM NEW."latitude"
    OR OLD."longitude" IS DISTINCT FROM NEW."longitude"
    OR OLD."locationPoint" IS DISTINCT FROM NEW."locationPoint"
    OR OLD."gpsAccuracyMeters" IS DISTINCT FROM NEW."gpsAccuracyMeters"
    OR OLD."locationCapturedAt" IS DISTINCT FROM NEW."locationCapturedAt"
    OR OLD."coordinateSource" IS DISTINCT FROM NEW."coordinateSource"
    OR OLD."rawPayload" IS DISTINCT FROM NEW."rawPayload"
    OR OLD."contentChecksum" IS DISTINCT FROM NEW."contentChecksum"
    OR OLD."receivedAt" IS DISTINCT FROM NEW."receivedAt"
    OR OLD."createdAt" IS DISTINCT FROM NEW."createdAt" THEN
    RAISE EXCEPTION 'Raw WhatsApp message fields are immutable.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE "WhatsAppMessage"
  ENABLE TRIGGER "trg_guard_whatsapp_message_mutation";

CREATE INDEX "BaketVersion_eventAreaId_idx" ON "BaketVersion"("eventAreaId");
