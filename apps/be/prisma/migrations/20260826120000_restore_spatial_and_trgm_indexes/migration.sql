-- Pulihkan index spasial GiST dan trigram yang terhapus oleh migrasi 20260806162313.
--
-- Index ini tidak dapat didefinisikan di schema.prisma (Prisma tidak mendukung
-- `USING GIST`/`gin_trgm_ops`), sehingga `prisma migrate dev` men-drop-nya saat
-- mendeteksi drift. Tanpa index GiST, query point-in-polygon di
-- `GET /api/v1/map/markers` melakukan sequential scan penuh pada
-- `AdministrativeAreaBoundary` untuk setiap titik marker (sangat lambat).
--
-- Jaga agar index ini dipulihkan kembali bila migrasi berikutnya men-drop-nya lagi.

-- Trigram untuk pencarian teks (LIKE/ILIKE dengan wildcard).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Spatial GiST untuk point-in-polygon (map/markers).
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

-- Trigram GIN untuk pencarian Jaring dan nomor pengirim WhatsApp.
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
