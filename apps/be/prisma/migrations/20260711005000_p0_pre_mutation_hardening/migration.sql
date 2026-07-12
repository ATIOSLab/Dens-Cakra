CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE "WhatsAppValidationSummary" AS ENUM ('NOT_CHECKED', 'VALID', 'INVALID');

CREATE TYPE "CoverageScopeType" AS ENUM ('JARING', 'FIELD_OFFICER', 'FIELD_COORDINATOR', 'ORGANIZATION_UNIT');

ALTER TABLE "BaketRevisionRequest"
  ADD COLUMN "requestedAgainstVersionId" UUID,
  ADD COLUMN "resolvedByVersionId" UUID;

ALTER TABLE "WhatsAppMessage"
  ADD COLUMN "integrationChannelId" UUID,
  ADD COLUMN "validationSummary" "WhatsAppValidationSummary" NOT NULL DEFAULT 'NOT_CHECKED';

UPDATE "WhatsAppMessage"
SET "validationSummary" = CASE
  WHEN "validationStatus" = 'NOT_CHECKED' THEN 'NOT_CHECKED'::"WhatsAppValidationSummary"
  WHEN "validationStatus" = 'COMPLETE' THEN 'VALID'::"WhatsAppValidationSummary"
  ELSE 'INVALID'::"WhatsAppValidationSummary"
END;

UPDATE "WhatsAppMessage"
SET "integrationChannelId" = (
  SELECT "id"
  FROM "IntegrationChannel"
  WHERE "channelType" = 'WHATSAPP'
  ORDER BY "createdAt" ASC
  LIMIT 1
)
WHERE "integrationChannelId" IS NULL;

UPDATE "BaketRevisionRequest" AS request
SET "requestedAgainstVersionId" = version."id"
FROM "Baket" AS baket
JOIN "BaketVersion" AS version
  ON version."baketId" = baket."id"
 AND version."versionNumber" = baket."currentVersionNumber"
WHERE request."baketId" = baket."id"
  AND request."requestedAgainstVersionId" IS NULL;

ALTER TABLE "WhatsAppMessage"
  ALTER COLUMN "integrationChannelId" SET NOT NULL,
  DROP COLUMN "validationStatus";

ALTER TABLE "BaketRevisionRequest"
  ALTER COLUMN "requestedAgainstVersionId" SET NOT NULL;

DROP INDEX IF EXISTS "WhatsAppMessage_externalMessageId_key";

DROP TYPE "WhatsAppValidationStatus";

CREATE TABLE "WhatsAppValidationIssue" (
  "id" UUID NOT NULL,
  "messageId" UUID NOT NULL,
  "code" VARCHAR(80) NOT NULL,
  "message" VARCHAR(250) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WhatsAppValidationIssue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BaketCoverageCheck" (
  "id" UUID NOT NULL,
  "baketVersionId" UUID NOT NULL,
  "scopeType" "CoverageScopeType" NOT NULL,
  "areaId" UUID,
  "positionAssignmentId" UUID,
  "isWithinScope" BOOLEAN NOT NULL,
  "note" TEXT,
  "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BaketCoverageCheck_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WhatsAppValidationIssue_messageId_createdAt_idx"
ON "WhatsAppValidationIssue" ("messageId", "createdAt");

CREATE UNIQUE INDEX "WhatsAppValidationIssue_messageId_code_key"
ON "WhatsAppValidationIssue" ("messageId", "code");

CREATE INDEX "BaketCoverageCheck_baketVersionId_scopeType_idx"
ON "BaketCoverageCheck" ("baketVersionId", "scopeType");

CREATE INDEX "BaketCoverageCheck_areaId_checkedAt_idx"
ON "BaketCoverageCheck" ("areaId", "checkedAt");

CREATE INDEX "BaketCoverageCheck_positionAssignmentId_checkedAt_idx"
ON "BaketCoverageCheck" ("positionAssignmentId", "checkedAt");

CREATE INDEX "BaketRevisionRequest_requestedAgainstVersionId_idx"
ON "BaketRevisionRequest" ("requestedAgainstVersionId");

CREATE INDEX "BaketRevisionRequest_resolvedByVersionId_idx"
ON "BaketRevisionRequest" ("resolvedByVersionId");

CREATE UNIQUE INDEX "BaketVerification_baketVersionId_key"
ON "BaketVerification" ("baketVersionId");

CREATE UNIQUE INDEX "IntegrationWebhookEvent_channelId_externalEventId_key"
ON "IntegrationWebhookEvent" ("channelId", "externalEventId");

CREATE INDEX "WhatsAppMessage_integrationChannelId_receivedAt_idx"
ON "WhatsAppMessage" ("integrationChannelId", "receivedAt");

CREATE UNIQUE INDEX "WhatsAppMessage_integrationChannelId_externalMessageId_key"
ON "WhatsAppMessage" ("integrationChannelId", "externalMessageId");

ALTER TABLE "WhatsAppMessage"
  ADD CONSTRAINT "WhatsAppMessage_integrationChannelId_fkey"
  FOREIGN KEY ("integrationChannelId") REFERENCES "IntegrationChannel"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WhatsAppValidationIssue"
  ADD CONSTRAINT "WhatsAppValidationIssue_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "WhatsAppMessage"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BaketRevisionRequest"
  ADD CONSTRAINT "BaketRevisionRequest_requestedAgainstVersionId_fkey"
  FOREIGN KEY ("requestedAgainstVersionId") REFERENCES "BaketVersion"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BaketRevisionRequest"
  ADD CONSTRAINT "BaketRevisionRequest_resolvedByVersionId_fkey"
  FOREIGN KEY ("resolvedByVersionId") REFERENCES "BaketVersion"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BaketCoverageCheck"
  ADD CONSTRAINT "BaketCoverageCheck_baketVersionId_fkey"
  FOREIGN KEY ("baketVersionId") REFERENCES "BaketVersion"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BaketCoverageCheck"
  ADD CONSTRAINT "BaketCoverageCheck_areaId_fkey"
  FOREIGN KEY ("areaId") REFERENCES "AdministrativeArea"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BaketCoverageCheck"
  ADD CONSTRAINT "BaketCoverageCheck_positionAssignmentId_fkey"
  FOREIGN KEY ("positionAssignmentId") REFERENCES "PositionAssignment"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user"
  DROP CONSTRAINT IF EXISTS "chk_user_business_role";

ALTER TABLE "user"
  ADD CONSTRAINT "chk_user_business_role"
  CHECK (
    "role" IN (
      'admin_system',
      'executive',
      'regional_commander',
      'operational_intelligence_manager',
      'field_coordinator',
      'field_officer'
    )
    AND position(',' IN "role") = 0
  );

ALTER TABLE "user_profile"
  DROP CONSTRAINT IF EXISTS "chk_user_profile_status_active";

ALTER TABLE "user_profile"
  ADD CONSTRAINT "chk_user_profile_status_active"
  CHECK (
    ("status" = 'ACTIVE' AND "isActive" = true)
    OR ("status" <> 'ACTIVE' AND "isActive" = false)
  );

ALTER TABLE "DirectiveRecipient"
  DROP CONSTRAINT IF EXISTS "DirectiveRecipient_target_type_check";

ALTER TABLE "DirectiveRecipient"
  DROP CONSTRAINT IF EXISTS "chk_directive_recipient_exactly_one_target";

ALTER TABLE "DirectiveRecipient"
  ADD CONSTRAINT "chk_directive_recipient_exactly_one_target"
  CHECK (num_nonnulls("targetUnitId", "targetPositionId") = 1);

ALTER TABLE "ProductDistribution"
  DROP CONSTRAINT IF EXISTS "ProductDistribution_target_type_check";

ALTER TABLE "ProductDistribution"
  DROP CONSTRAINT IF EXISTS "chk_product_distribution_exactly_one_target";

ALTER TABLE "ProductDistribution"
  ADD CONSTRAINT "chk_product_distribution_exactly_one_target"
  CHECK (
    num_nonnulls(
      "targetUnitId",
      "targetPositionId",
      "targetUserProfileId"
    ) = 1
  );

ALTER TABLE "AdministrativeAreaClosure"
  DROP CONSTRAINT IF EXISTS "chk_area_closure_depth";

ALTER TABLE "AdministrativeAreaClosure"
  ADD CONSTRAINT "chk_area_closure_depth"
  CHECK ("depth" >= 0);

ALTER TABLE "OrganizationUnitClosure"
  DROP CONSTRAINT IF EXISTS "chk_organization_closure_depth";

ALTER TABLE "OrganizationUnitClosure"
  ADD CONSTRAINT "chk_organization_closure_depth"
  CHECK ("depth" >= 0);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_administrative_area_root"
ON "AdministrativeArea" ("level", "code")
WHERE "parentId" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_active_position_area_scope"
ON "PositionAreaScope" ("positionAssignmentId", "areaId")
WHERE "validUntil" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_active_organization_area_coverage"
ON "OrganizationAreaCoverage" ("organizationUnitId", "areaId")
WHERE "validUntil" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_active_jaring_area_coverage"
ON "JaringAreaCoverage" ("jaringId", "areaId")
WHERE "validUntil" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_active_caretaker_per_jaring"
ON "JaringCaretakerAssignment" ("jaringId")
WHERE "isActive" = true
  AND "validUntil" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_active_boundary_per_area"
ON "AdministrativeAreaBoundary" ("areaId")
WHERE "isActive" = true
  AND "effectiveUntil" IS NULL;

ALTER TABLE "AdministrativeAreaBoundary"
  DROP CONSTRAINT IF EXISTS "AdministrativeAreaBoundary_boundary_valid_active_check";

ALTER TABLE "AdministrativeAreaBoundary"
  ADD CONSTRAINT "AdministrativeAreaBoundary_boundary_valid_check"
  CHECK (ST_IsValid("boundary"));

ALTER TABLE "WhatsAppMessage"
  DROP CONSTRAINT IF EXISTS "WhatsAppMessage_locationPoint_srid_check";

ALTER TABLE "WhatsAppMessage"
  ADD CONSTRAINT "WhatsAppMessage_locationPoint_srid_check"
  CHECK ("locationPoint" IS NULL OR ST_SRID("locationPoint") = 4326);

ALTER TABLE "WhatsAppMessage"
  DROP CONSTRAINT IF EXISTS "WhatsAppMessage_locationPoint_type_check";

ALTER TABLE "WhatsAppMessage"
  ADD CONSTRAINT "WhatsAppMessage_locationPoint_type_check"
  CHECK ("locationPoint" IS NULL OR ST_GeometryType("locationPoint") = 'ST_Point');

ALTER TABLE "BaketVersion"
  DROP CONSTRAINT IF EXISTS "BaketVersion_locationPoint_srid_check";

ALTER TABLE "BaketVersion"
  ADD CONSTRAINT "BaketVersion_locationPoint_srid_check"
  CHECK ("locationPoint" IS NULL OR ST_SRID("locationPoint") = 4326);

ALTER TABLE "BaketVersion"
  DROP CONSTRAINT IF EXISTS "BaketVersion_locationPoint_type_check";

ALTER TABLE "BaketVersion"
  ADD CONSTRAINT "BaketVersion_locationPoint_type_check"
  CHECK ("locationPoint" IS NULL OR ST_GeometryType("locationPoint") = 'ST_Point');

ALTER TABLE "EmergencyIncident"
  DROP CONSTRAINT IF EXISTS "EmergencyIncident_locationPoint_srid_check";

ALTER TABLE "EmergencyIncident"
  ADD CONSTRAINT "EmergencyIncident_locationPoint_srid_check"
  CHECK ("locationPoint" IS NULL OR ST_SRID("locationPoint") = 4326);

ALTER TABLE "EmergencyIncident"
  DROP CONSTRAINT IF EXISTS "EmergencyIncident_locationPoint_type_check";

ALTER TABLE "EmergencyIncident"
  ADD CONSTRAINT "EmergencyIncident_locationPoint_type_check"
  CHECK ("locationPoint" IS NULL OR ST_GeometryType("locationPoint") = 'ST_Point');

ALTER TABLE "Alert"
  DROP CONSTRAINT IF EXISTS "Alert_locationPoint_srid_check";

ALTER TABLE "Alert"
  ADD CONSTRAINT "Alert_locationPoint_srid_check"
  CHECK ("locationPoint" IS NULL OR ST_SRID("locationPoint") = 4326);

ALTER TABLE "Alert"
  DROP CONSTRAINT IF EXISTS "Alert_locationPoint_type_check";

ALTER TABLE "Alert"
  ADD CONSTRAINT "Alert_locationPoint_type_check"
  CHECK ("locationPoint" IS NULL OR ST_GeometryType("locationPoint") = 'ST_Point');

ALTER TABLE "PersonnelLocationPing"
  DROP CONSTRAINT IF EXISTS "PersonnelLocationPing_locationPoint_srid_check";

ALTER TABLE "PersonnelLocationPing"
  ADD CONSTRAINT "PersonnelLocationPing_locationPoint_srid_check"
  CHECK (ST_SRID("locationPoint") = 4326);

ALTER TABLE "PersonnelLocationPing"
  DROP CONSTRAINT IF EXISTS "PersonnelLocationPing_locationPoint_type_check";

ALTER TABLE "PersonnelLocationPing"
  ADD CONSTRAINT "PersonnelLocationPing_locationPoint_type_check"
  CHECK (ST_GeometryType("locationPoint") = 'ST_Point');

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

CREATE OR REPLACE FUNCTION dens_cakra_sync_point_geometry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."latitude" IS NULL AND NEW."longitude" IS NULL THEN
    NEW."locationPoint" := NULL;
    RETURN NEW;
  END IF;

  IF NEW."latitude" IS NULL OR NEW."longitude" IS NULL THEN
    RAISE EXCEPTION 'Latitude and longitude must be provided together.';
  END IF;

  NEW."locationPoint" := ST_SetSRID(
    ST_MakePoint(NEW."longitude"::double precision, NEW."latitude"::double precision),
    4326
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "trg_sync_whatsapp_location_point" ON "WhatsAppMessage";
CREATE TRIGGER "trg_sync_whatsapp_location_point"
BEFORE INSERT OR UPDATE OF "latitude", "longitude"
ON "WhatsAppMessage"
FOR EACH ROW
EXECUTE FUNCTION dens_cakra_sync_point_geometry();

DROP TRIGGER IF EXISTS "trg_sync_baket_location_point" ON "BaketVersion";
CREATE TRIGGER "trg_sync_baket_location_point"
BEFORE INSERT OR UPDATE OF "latitude", "longitude"
ON "BaketVersion"
FOR EACH ROW
EXECUTE FUNCTION dens_cakra_sync_point_geometry();

DROP TRIGGER IF EXISTS "trg_sync_emergency_location_point" ON "EmergencyIncident";
CREATE TRIGGER "trg_sync_emergency_location_point"
BEFORE INSERT OR UPDATE OF "latitude", "longitude"
ON "EmergencyIncident"
FOR EACH ROW
EXECUTE FUNCTION dens_cakra_sync_point_geometry();

DROP TRIGGER IF EXISTS "trg_sync_alert_location_point" ON "Alert";
CREATE TRIGGER "trg_sync_alert_location_point"
BEFORE INSERT OR UPDATE OF "latitude", "longitude"
ON "Alert"
FOR EACH ROW
EXECUTE FUNCTION dens_cakra_sync_point_geometry();

DROP TRIGGER IF EXISTS "trg_sync_personnel_location_point" ON "PersonnelLocationPing";
CREATE TRIGGER "trg_sync_personnel_location_point"
BEFORE INSERT OR UPDATE OF "latitude", "longitude"
ON "PersonnelLocationPing"
FOR EACH ROW
EXECUTE FUNCTION dens_cakra_sync_point_geometry();

CREATE OR REPLACE FUNCTION dens_cakra_expected_role_for_position(position_code "PositionCode")
RETURNS "RoleCode"
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE position_code
    WHEN 'ADMIN' THEN 'ADMIN_SYSTEM'
    WHEN 'DEPUTI_II' THEN 'EXECUTIVE'
    WHEN 'DIREKTUR_WILAYAH' THEN 'REGIONAL_COMMANDER'
    WHEN 'KABINDA' THEN 'REGIONAL_COMMANDER'
    WHEN 'KASUBDIT' THEN 'OPERATIONAL_INTELLIGENCE_MANAGER'
    WHEN 'KABAGOPS' THEN 'OPERATIONAL_INTELLIGENCE_MANAGER'
    WHEN 'STAF_SUBDIT' THEN 'FIELD_COORDINATOR'
    WHEN 'KORWIL' THEN 'FIELD_COORDINATOR'
    WHEN 'PETUGAS_ORGANIK' THEN 'FIELD_OFFICER'
  END::"RoleCode"
$$;

CREATE OR REPLACE FUNCTION dens_cakra_resolve_command_route(organization_unit_id UUID)
RETURNS "CommandRouteType"
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1
      FROM "OrganizationUnitClosure" AS closure
      JOIN "OrganizationUnit" AS ancestor
        ON ancestor."id" = closure."ancestorId"
      WHERE closure."descendantId" = organization_unit_id
        AND ancestor."type" IN ('BINDA', 'BAGOPS')
    ) THEN 'BINDA'::"CommandRouteType"
    WHEN EXISTS (
      SELECT 1
      FROM "OrganizationUnitClosure" AS closure
      JOIN "OrganizationUnit" AS ancestor
        ON ancestor."id" = closure."ancestorId"
      WHERE closure."descendantId" = organization_unit_id
        AND ancestor."type" IN ('DIRECTORATE', 'SUBDIRECTORATE')
    ) THEN 'DIRECTORATE'::"CommandRouteType"
    ELSE NULL
  END
$$;

CREATE OR REPLACE FUNCTION dens_cakra_validate_position()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  actual_role "RoleCode";
  expected_role "RoleCode";
  command_route "CommandRouteType";
  supervisor_code "PositionCode";
BEGIN
  SELECT "code" INTO actual_role
  FROM "Role"
  WHERE "id" = NEW."roleId";

  expected_role := dens_cakra_expected_role_for_position(NEW."code");

  IF actual_role IS NULL OR expected_role IS NULL THEN
    RAISE EXCEPTION 'Position role mapping is incomplete for position %.', NEW."code";
  END IF;

  IF actual_role <> expected_role THEN
    RAISE EXCEPTION 'Position % must use role %, but received %.', NEW."code", expected_role, actual_role;
  END IF;

  IF NEW."code" = 'KORWIL' THEN
    IF NEW."reportsToPositionId" IS NULL THEN
      RAISE EXCEPTION 'KORWIL must define reportsToPositionId.';
    END IF;

    command_route := dens_cakra_resolve_command_route(NEW."organizationUnitId");

    SELECT "code" INTO supervisor_code
    FROM "Position"
    WHERE "id" = NEW."reportsToPositionId";

    IF command_route IS NULL THEN
      RAISE EXCEPTION 'KORWIL organization unit % does not resolve to a command route.', NEW."organizationUnitId";
    END IF;

    IF command_route = 'DIRECTORATE' AND supervisor_code <> 'KASUBDIT' THEN
      RAISE EXCEPTION 'KORWIL on DIRECTORATE route must report to KASUBDIT.';
    END IF;

    IF command_route = 'BINDA' AND supervisor_code <> 'KABAGOPS' THEN
      RAISE EXCEPTION 'KORWIL on BINDA route must report to KABAGOPS.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "trg_validate_position" ON "Position";
CREATE TRIGGER "trg_validate_position"
BEFORE INSERT OR UPDATE OF "code", "roleId", "organizationUnitId", "reportsToPositionId"
ON "Position"
FOR EACH ROW
EXECUTE FUNCTION dens_cakra_validate_position();

CREATE OR REPLACE FUNCTION dens_cakra_validate_administrative_area_parent()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_level "AdministrativeLevel";
BEGIN
  IF NEW."level" = 'COUNTRY' THEN
    IF NEW."parentId" IS NOT NULL THEN
      RAISE EXCEPTION 'Administrative area COUNTRY must not have a parent.';
    END IF;

    RETURN NEW;
  END IF;

  IF NEW."parentId" IS NULL THEN
    RAISE EXCEPTION 'Administrative area % must define a parent.', NEW."level";
  END IF;

  SELECT "level" INTO parent_level
  FROM "AdministrativeArea"
  WHERE "id" = NEW."parentId";

  IF parent_level IS NULL THEN
    RAISE EXCEPTION 'Administrative area parent % was not found.', NEW."parentId";
  END IF;

  IF NEW."id" IS NOT NULL AND EXISTS (
    SELECT 1
    FROM "AdministrativeAreaClosure"
    WHERE "ancestorId" = NEW."id"
      AND "descendantId" = NEW."parentId"
  ) THEN
    RAISE EXCEPTION 'Administrative area hierarchy cycle detected.';
  END IF;

  IF NOT (
    (NEW."level" = 'PROVINCE' AND parent_level = 'COUNTRY')
    OR (NEW."level" IN ('REGENCY', 'CITY') AND parent_level = 'PROVINCE')
    OR (NEW."level" = 'DISTRICT' AND parent_level IN ('REGENCY', 'CITY'))
    OR (NEW."level" IN ('VILLAGE', 'URBAN_VILLAGE') AND parent_level = 'DISTRICT')
    OR (NEW."level" = 'RW' AND parent_level IN ('VILLAGE', 'URBAN_VILLAGE'))
    OR (NEW."level" = 'RT' AND parent_level = 'RW')
  ) THEN
    RAISE EXCEPTION 'Administrative area parent level % is invalid for child level %.', parent_level, NEW."level";
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "trg_validate_administrative_area_parent" ON "AdministrativeArea";
CREATE TRIGGER "trg_validate_administrative_area_parent"
BEFORE INSERT OR UPDATE OF "parentId", "level"
ON "AdministrativeArea"
FOR EACH ROW
EXECUTE FUNCTION dens_cakra_validate_administrative_area_parent();

CREATE OR REPLACE FUNCTION dens_cakra_validate_organization_unit_parent()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."parentId" IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW."id" IS NOT NULL AND NEW."parentId" = NEW."id" THEN
    RAISE EXCEPTION 'Organization unit cannot be its own parent.';
  END IF;

  IF NEW."id" IS NOT NULL AND EXISTS (
    SELECT 1
    FROM "OrganizationUnitClosure"
    WHERE "ancestorId" = NEW."id"
      AND "descendantId" = NEW."parentId"
  ) THEN
    RAISE EXCEPTION 'Organization unit hierarchy cycle detected.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "trg_validate_organization_unit_parent" ON "OrganizationUnit";
CREATE TRIGGER "trg_validate_organization_unit_parent"
BEFORE INSERT OR UPDATE OF "parentId"
ON "OrganizationUnit"
FOR EACH ROW
EXECUTE FUNCTION dens_cakra_validate_organization_unit_parent();

CREATE OR REPLACE FUNCTION dens_cakra_validate_baket_revision_request()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  requested_baket_id UUID;
  resolved_baket_id UUID;
BEGIN
  SELECT "baketId" INTO requested_baket_id
  FROM "BaketVersion"
  WHERE "id" = NEW."requestedAgainstVersionId";

  IF requested_baket_id IS NULL OR requested_baket_id <> NEW."baketId" THEN
    RAISE EXCEPTION 'requestedAgainstVersionId must belong to the same Baket.';
  END IF;

  IF NEW."resolvedByVersionId" IS NOT NULL THEN
    SELECT "baketId" INTO resolved_baket_id
    FROM "BaketVersion"
    WHERE "id" = NEW."resolvedByVersionId";

    IF resolved_baket_id IS NULL OR resolved_baket_id <> NEW."baketId" THEN
      RAISE EXCEPTION 'resolvedByVersionId must belong to the same Baket.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "trg_validate_baket_revision_request" ON "BaketRevisionRequest";
CREATE TRIGGER "trg_validate_baket_revision_request"
BEFORE INSERT OR UPDATE OF "baketId", "requestedAgainstVersionId", "resolvedByVersionId"
ON "BaketRevisionRequest"
FOR EACH ROW
EXECUTE FUNCTION dens_cakra_validate_baket_revision_request();

CREATE OR REPLACE FUNCTION dens_cakra_prevent_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only.';
END;
$$;

DROP TRIGGER IF EXISTS "trg_prevent_audit_log_mutation" ON "AuditLog";
CREATE TRIGGER "trg_prevent_audit_log_mutation"
BEFORE UPDATE OR DELETE
ON "AuditLog"
FOR EACH ROW
EXECUTE FUNCTION dens_cakra_prevent_audit_log_mutation();

CREATE OR REPLACE FUNCTION dens_cakra_guard_whatsapp_message_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'WhatsAppMessage records cannot be deleted.';
  END IF;

  IF OLD."integrationChannelId" IS DISTINCT FROM NEW."integrationChannelId"
    OR OLD."externalMessageId" IS DISTINCT FROM NEW."externalMessageId"
    OR OLD."senderPhone" IS DISTINCT FROM NEW."senderPhone"
    OR OLD."title" IS DISTINCT FROM NEW."title"
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
$$;

DROP TRIGGER IF EXISTS "trg_guard_whatsapp_message_mutation" ON "WhatsAppMessage";
CREATE TRIGGER "trg_guard_whatsapp_message_mutation"
BEFORE UPDATE OR DELETE
ON "WhatsAppMessage"
FOR EACH ROW
EXECUTE FUNCTION dens_cakra_guard_whatsapp_message_mutation();

CREATE OR REPLACE FUNCTION dens_cakra_guard_webhook_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'IntegrationWebhookEvent records cannot be deleted.';
  END IF;

  IF OLD."channelId" IS DISTINCT FROM NEW."channelId"
    OR OLD."externalEventId" IS DISTINCT FROM NEW."externalEventId"
    OR OLD."eventType" IS DISTINCT FROM NEW."eventType"
    OR OLD."payload" IS DISTINCT FROM NEW."payload"
    OR OLD."receivedAt" IS DISTINCT FROM NEW."receivedAt" THEN
    RAISE EXCEPTION 'Webhook source payload fields are immutable.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "trg_guard_webhook_event_mutation" ON "IntegrationWebhookEvent";
CREATE TRIGGER "trg_guard_webhook_event_mutation"
BEFORE UPDATE OR DELETE
ON "IntegrationWebhookEvent"
FOR EACH ROW
EXECUTE FUNCTION dens_cakra_guard_webhook_event_mutation();

CREATE OR REPLACE FUNCTION dens_cakra_guard_personnel_location_ping_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'PersonnelLocationPing is append-only.';
END;
$$;

DROP TRIGGER IF EXISTS "trg_guard_personnel_location_ping_mutation" ON "PersonnelLocationPing";
CREATE TRIGGER "trg_guard_personnel_location_ping_mutation"
BEFORE UPDATE OR DELETE
ON "PersonnelLocationPing"
FOR EACH ROW
EXECUTE FUNCTION dens_cakra_guard_personnel_location_ping_mutation();

CREATE OR REPLACE FUNCTION dens_cakra_guard_approval_step_decision_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."decision" IS NOT NULL THEN
      RAISE EXCEPTION 'Approval decisions are immutable once recorded.';
    END IF;

    RETURN OLD;
  END IF;

  IF OLD."decision" IS NOT NULL AND (
    OLD."decision" IS DISTINCT FROM NEW."decision"
    OR OLD."decisionNote" IS DISTINCT FROM NEW."decisionNote"
    OR OLD."decidedAt" IS DISTINCT FROM NEW."decidedAt"
    OR OLD."decidedByAssignmentId" IS DISTINCT FROM NEW."decidedByAssignmentId"
  ) THEN
    RAISE EXCEPTION 'Approval decisions are immutable once recorded.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "trg_guard_approval_step_decision_mutation" ON "ProductApprovalStep";
CREATE TRIGGER "trg_guard_approval_step_decision_mutation"
BEFORE UPDATE OR DELETE
ON "ProductApprovalStep"
FOR EACH ROW
EXECUTE FUNCTION dens_cakra_guard_approval_step_decision_mutation();
