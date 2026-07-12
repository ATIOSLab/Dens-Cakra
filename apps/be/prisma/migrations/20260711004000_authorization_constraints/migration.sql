DROP INDEX IF EXISTS "PositionAssignment_active_primary_user_key";

CREATE UNIQUE INDEX IF NOT EXISTS "PositionAssignment_active_primary_user_profile_key"
ON "PositionAssignment" ("userProfileId")
WHERE "isPrimary" = true
  AND "isActive" = true
  AND "validUntil" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "PositionAssignment_active_position_occupant_key"
ON "PositionAssignment" ("positionId")
WHERE "isActive" = true
  AND "validUntil" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Jaring_whatsapp_active_key"
ON "Jaring" ("whatsappNumber")
WHERE "status" = 'ACTIVE'
  AND "deletedAt" IS NULL;

ALTER TABLE "DirectiveRecipient"
  DROP CONSTRAINT IF EXISTS "DirectiveRecipient_target_type_check";

ALTER TABLE "DirectiveRecipient"
  ADD CONSTRAINT "DirectiveRecipient_target_type_check"
  CHECK (num_nonnulls("targetUnitId", "targetPositionId") = 1);

ALTER TABLE "ProductDistribution"
  DROP CONSTRAINT IF EXISTS "ProductDistribution_target_type_check";

ALTER TABLE "ProductDistribution"
  ADD CONSTRAINT "ProductDistribution_target_type_check"
  CHECK (num_nonnulls("targetUnitId", "targetPositionId", "targetUserProfileId") = 1);

ALTER TABLE "AdministrativeAreaBoundary"
  DROP CONSTRAINT IF EXISTS "AdministrativeAreaBoundary_boundary_srid_check";

ALTER TABLE "AdministrativeAreaBoundary"
  ADD CONSTRAINT "AdministrativeAreaBoundary_boundary_srid_check"
  CHECK (ST_SRID("boundary") = 4326);

ALTER TABLE "AdministrativeAreaBoundary"
  DROP CONSTRAINT IF EXISTS "AdministrativeAreaBoundary_boundary_type_check";

ALTER TABLE "AdministrativeAreaBoundary"
  ADD CONSTRAINT "AdministrativeAreaBoundary_boundary_type_check"
  CHECK (ST_GeometryType("boundary") = 'ST_MultiPolygon');

ALTER TABLE "AdministrativeAreaBoundary"
  DROP CONSTRAINT IF EXISTS "AdministrativeAreaBoundary_boundary_valid_active_check";

ALTER TABLE "AdministrativeAreaBoundary"
  ADD CONSTRAINT "AdministrativeAreaBoundary_boundary_valid_active_check"
  CHECK ("isActive" = false OR ST_IsValid("boundary"));

ALTER TABLE "WhatsAppMessage"
  DROP CONSTRAINT IF EXISTS "WhatsAppMessage_latitude_range_check";

ALTER TABLE "WhatsAppMessage"
  ADD CONSTRAINT "WhatsAppMessage_latitude_range_check"
  CHECK ("latitude" IS NULL OR ("latitude" >= -90 AND "latitude" <= 90));

ALTER TABLE "WhatsAppMessage"
  DROP CONSTRAINT IF EXISTS "WhatsAppMessage_longitude_range_check";

ALTER TABLE "WhatsAppMessage"
  ADD CONSTRAINT "WhatsAppMessage_longitude_range_check"
  CHECK ("longitude" IS NULL OR ("longitude" >= -180 AND "longitude" <= 180));

ALTER TABLE "WhatsAppMessage"
  DROP CONSTRAINT IF EXISTS "WhatsAppMessage_lat_lon_pair_check";

ALTER TABLE "WhatsAppMessage"
  ADD CONSTRAINT "WhatsAppMessage_lat_lon_pair_check"
  CHECK (
    ("latitude" IS NULL AND "longitude" IS NULL)
    OR ("latitude" IS NOT NULL AND "longitude" IS NOT NULL)
  );

ALTER TABLE "BaketVersion"
  DROP CONSTRAINT IF EXISTS "BaketVersion_latitude_range_check";

ALTER TABLE "BaketVersion"
  ADD CONSTRAINT "BaketVersion_latitude_range_check"
  CHECK ("latitude" IS NULL OR ("latitude" >= -90 AND "latitude" <= 90));

ALTER TABLE "BaketVersion"
  DROP CONSTRAINT IF EXISTS "BaketVersion_longitude_range_check";

ALTER TABLE "BaketVersion"
  ADD CONSTRAINT "BaketVersion_longitude_range_check"
  CHECK ("longitude" IS NULL OR ("longitude" >= -180 AND "longitude" <= 180));

ALTER TABLE "BaketVersion"
  DROP CONSTRAINT IF EXISTS "BaketVersion_lat_lon_pair_check";

ALTER TABLE "BaketVersion"
  ADD CONSTRAINT "BaketVersion_lat_lon_pair_check"
  CHECK (
    ("latitude" IS NULL AND "longitude" IS NULL)
    OR ("latitude" IS NOT NULL AND "longitude" IS NOT NULL)
  );

ALTER TABLE "EmergencyIncident"
  DROP CONSTRAINT IF EXISTS "EmergencyIncident_latitude_range_check";

ALTER TABLE "EmergencyIncident"
  ADD CONSTRAINT "EmergencyIncident_latitude_range_check"
  CHECK ("latitude" IS NULL OR ("latitude" >= -90 AND "latitude" <= 90));

ALTER TABLE "EmergencyIncident"
  DROP CONSTRAINT IF EXISTS "EmergencyIncident_longitude_range_check";

ALTER TABLE "EmergencyIncident"
  ADD CONSTRAINT "EmergencyIncident_longitude_range_check"
  CHECK ("longitude" IS NULL OR ("longitude" >= -180 AND "longitude" <= 180));

ALTER TABLE "EmergencyIncident"
  DROP CONSTRAINT IF EXISTS "EmergencyIncident_lat_lon_pair_check";

ALTER TABLE "EmergencyIncident"
  ADD CONSTRAINT "EmergencyIncident_lat_lon_pair_check"
  CHECK (
    ("latitude" IS NULL AND "longitude" IS NULL)
    OR ("latitude" IS NOT NULL AND "longitude" IS NOT NULL)
  );

ALTER TABLE "Alert"
  DROP CONSTRAINT IF EXISTS "Alert_latitude_range_check";

ALTER TABLE "Alert"
  ADD CONSTRAINT "Alert_latitude_range_check"
  CHECK ("latitude" IS NULL OR ("latitude" >= -90 AND "latitude" <= 90));

ALTER TABLE "Alert"
  DROP CONSTRAINT IF EXISTS "Alert_longitude_range_check";

ALTER TABLE "Alert"
  ADD CONSTRAINT "Alert_longitude_range_check"
  CHECK ("longitude" IS NULL OR ("longitude" >= -180 AND "longitude" <= 180));

ALTER TABLE "Alert"
  DROP CONSTRAINT IF EXISTS "Alert_lat_lon_pair_check";

ALTER TABLE "Alert"
  ADD CONSTRAINT "Alert_lat_lon_pair_check"
  CHECK (
    ("latitude" IS NULL AND "longitude" IS NULL)
    OR ("latitude" IS NOT NULL AND "longitude" IS NOT NULL)
  );

ALTER TABLE "PersonnelLocationPing"
  DROP CONSTRAINT IF EXISTS "PersonnelLocationPing_latitude_range_check";

ALTER TABLE "PersonnelLocationPing"
  ADD CONSTRAINT "PersonnelLocationPing_latitude_range_check"
  CHECK ("latitude" >= -90 AND "latitude" <= 90);

ALTER TABLE "PersonnelLocationPing"
  DROP CONSTRAINT IF EXISTS "PersonnelLocationPing_longitude_range_check";

ALTER TABLE "PersonnelLocationPing"
  ADD CONSTRAINT "PersonnelLocationPing_longitude_range_check"
  CHECK ("longitude" >= -180 AND "longitude" <= 180);

CREATE INDEX IF NOT EXISTS "AdministrativeAreaBoundary_boundary_gist"
ON "AdministrativeAreaBoundary" USING GIST ("boundary");

CREATE INDEX IF NOT EXISTS "WhatsAppMessage_locationPoint_gist"
ON "WhatsAppMessage" USING GIST ("locationPoint");

CREATE INDEX IF NOT EXISTS "BaketVersion_locationPoint_gist"
ON "BaketVersion" USING GIST ("locationPoint");

CREATE INDEX IF NOT EXISTS "EmergencyIncident_locationPoint_gist"
ON "EmergencyIncident" USING GIST ("locationPoint");

CREATE INDEX IF NOT EXISTS "Alert_locationPoint_gist"
ON "Alert" USING GIST ("locationPoint");

CREATE INDEX IF NOT EXISTS "PersonnelLocationPing_locationPoint_gist"
ON "PersonnelLocationPing" USING GIST ("locationPoint");

