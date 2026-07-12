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

CREATE UNIQUE INDEX IF NOT EXISTS "PositionAssignment_active_primary_user_key"
ON "PositionAssignment" ("userId")
WHERE "isPrimary" = true
  AND "isActive" = true
  AND "validUntil" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "JaringCaretakerAssignment_active_jaring_key"
ON "JaringCaretakerAssignment" ("jaringId")
WHERE "isActive" = true
  AND "validUntil" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "AdministrativeAreaBoundary_active_area_key"
ON "AdministrativeAreaBoundary" ("areaId")
WHERE "isActive" = true
  AND "effectiveUntil" IS NULL;

ALTER TABLE "DirectiveRecipient"
  DROP CONSTRAINT IF EXISTS "DirectiveRecipient_target_type_check";

ALTER TABLE "DirectiveRecipient"
  ADD CONSTRAINT "DirectiveRecipient_target_type_check"
  CHECK (
    (CASE WHEN "targetUnitId" IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "targetPositionId" IS NOT NULL THEN 1 ELSE 0 END) = 1
  );

ALTER TABLE "ProductDistribution"
  DROP CONSTRAINT IF EXISTS "ProductDistribution_target_type_check";

ALTER TABLE "ProductDistribution"
  ADD CONSTRAINT "ProductDistribution_target_type_check"
  CHECK (
    (CASE WHEN "targetUnitId" IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "targetPositionId" IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "targetUserId" IS NOT NULL THEN 1 ELSE 0 END) = 1
  );

CREATE OR REPLACE FUNCTION denscakra_sync_location_point()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."longitude" IS NULL OR NEW."latitude" IS NULL THEN
    NEW."locationPoint" := NULL;
  ELSE
    NEW."locationPoint" := ST_SetSRID(
      ST_MakePoint(NEW."longitude"::double precision, NEW."latitude"::double precision),
      4326
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "WhatsAppMessage_sync_location_point" ON "WhatsAppMessage";
CREATE TRIGGER "WhatsAppMessage_sync_location_point"
BEFORE INSERT OR UPDATE OF "latitude", "longitude"
ON "WhatsAppMessage"
FOR EACH ROW
EXECUTE FUNCTION denscakra_sync_location_point();

DROP TRIGGER IF EXISTS "BaketVersion_sync_location_point" ON "BaketVersion";
CREATE TRIGGER "BaketVersion_sync_location_point"
BEFORE INSERT OR UPDATE OF "latitude", "longitude"
ON "BaketVersion"
FOR EACH ROW
EXECUTE FUNCTION denscakra_sync_location_point();

DROP TRIGGER IF EXISTS "EmergencyIncident_sync_location_point" ON "EmergencyIncident";
CREATE TRIGGER "EmergencyIncident_sync_location_point"
BEFORE INSERT OR UPDATE OF "latitude", "longitude"
ON "EmergencyIncident"
FOR EACH ROW
EXECUTE FUNCTION denscakra_sync_location_point();

DROP TRIGGER IF EXISTS "Alert_sync_location_point" ON "Alert";
CREATE TRIGGER "Alert_sync_location_point"
BEFORE INSERT OR UPDATE OF "latitude", "longitude"
ON "Alert"
FOR EACH ROW
EXECUTE FUNCTION denscakra_sync_location_point();

DROP TRIGGER IF EXISTS "PersonnelLocationPing_sync_location_point" ON "PersonnelLocationPing";
CREATE TRIGGER "PersonnelLocationPing_sync_location_point"
BEFORE INSERT OR UPDATE OF "latitude", "longitude"
ON "PersonnelLocationPing"
FOR EACH ROW
EXECUTE FUNCTION denscakra_sync_location_point();
