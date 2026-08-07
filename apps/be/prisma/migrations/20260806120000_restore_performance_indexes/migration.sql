-- Restore spatial indexes removed by 20260712063503_add_whatsapp_bot_control.
-- Run this migration during a low-traffic window because Prisma migrations are transactional.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "AdministrativeAreaBoundary_boundary_gist_idx"
  ON "AdministrativeAreaBoundary" USING GIST ("boundary");

CREATE INDEX IF NOT EXISTS "WhatsAppMessage_locationPoint_gist_idx"
  ON "WhatsAppMessage" USING GIST ("locationPoint");

CREATE INDEX IF NOT EXISTS "BaketVersion_locationPoint_gist_idx"
  ON "BaketVersion" USING GIST ("locationPoint");

CREATE INDEX IF NOT EXISTS "Alert_locationPoint_gist_idx"
  ON "Alert" USING GIST ("locationPoint");

CREATE INDEX IF NOT EXISTS "EmergencyIncident_locationPoint_gist_idx"
  ON "EmergencyIncident" USING GIST ("locationPoint");

CREATE INDEX IF NOT EXISTS "PersonnelLocationPing_locationPoint_gist_idx"
  ON "PersonnelLocationPing" USING GIST ("locationPoint");

CREATE INDEX IF NOT EXISTS "Jaring_aliasName_trgm_idx"
  ON "Jaring" USING GIN ("aliasName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Jaring_fullName_trgm_idx"
  ON "Jaring" USING GIN ("fullName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Jaring_address_trgm_idx"
  ON "Jaring" USING GIN ("address" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Jaring_whatsappNumber_trgm_idx"
  ON "Jaring" USING GIN ("whatsappNumber" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "WhatsAppMessage_senderPhone_trgm_idx"
  ON "WhatsAppMessage" USING GIN ("senderPhone" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Jaring_active_registration_created_id_idx"
  ON "Jaring" ("registrationStatus", "createdAt" DESC, "id" DESC)
  WHERE "deletedAt" IS NULL;
