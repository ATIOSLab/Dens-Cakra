-- The legacy per-Jaring PIN is no longer used. Bot access now uses the
-- global trigger and verified WhatsApp ownership.
DROP INDEX IF EXISTS "Jaring_code_idx";

ALTER TABLE "Jaring"
  DROP COLUMN "code";
