-- Remove organization and position/jabatan from the operational schema.
-- User scope is now stored directly on UserOperationalAssignment: branch, role, and area scopes.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'AreaScopeMode'
      AND e.enumlabel IN ('INHERIT_UNIT', 'INHERIT_PARENT_POSITION')
  ) THEN
    UPDATE "RoleAreaPolicy"
    SET "scopeMode" = 'EXPLICIT'
    WHERE "scopeMode"::text IN ('INHERIT_UNIT', 'INHERIT_PARENT_POSITION');

    CREATE TYPE "AreaScopeMode_new" AS ENUM ('NATIONAL', 'EXPLICIT');
    ALTER TABLE "RoleAreaPolicy" ALTER COLUMN "scopeMode" DROP DEFAULT;
    ALTER TABLE "RoleAreaPolicy" ALTER COLUMN "scopeMode" TYPE "AreaScopeMode_new" USING ("scopeMode"::text::"AreaScopeMode_new");
    ALTER TYPE "AreaScopeMode" RENAME TO "AreaScopeMode_old";
    ALTER TYPE "AreaScopeMode_new" RENAME TO "AreaScopeMode";
    DROP TYPE "AreaScopeMode_old";
    ALTER TABLE "RoleAreaPolicy" ALTER COLUMN "scopeMode" SET DEFAULT 'EXPLICIT';
  END IF;
END $$;

-- Drop old foreign keys before renaming assignment and scope tables.
ALTER TABLE IF EXISTS "Alert" DROP CONSTRAINT IF EXISTS "Alert_assignedPositionId_fkey";
ALTER TABLE IF EXISTS "Alert" DROP CONSTRAINT IF EXISTS "Alert_assignedSeatId_fkey";
ALTER TABLE IF EXISTS "AnalysisCase" DROP CONSTRAINT IF EXISTS "AnalysisCase_createdByAssignmentId_fkey";
ALTER TABLE IF EXISTS "AnalysisCase" DROP CONSTRAINT IF EXISTS "AnalysisCase_ownerUnitId_fkey";
ALTER TABLE IF EXISTS "AnalysisVersion" DROP CONSTRAINT IF EXISTS "AnalysisVersion_createdByAssignmentId_fkey";
ALTER TABLE IF EXISTS "AnalysisVersion" DROP CONSTRAINT IF EXISTS "AnalysisVersion_validatedByAssignmentId_fkey";
ALTER TABLE IF EXISTS "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_actorAssignmentId_fkey";
ALTER TABLE IF EXISTS "Baket" DROP CONSTRAINT IF EXISTS "Baket_createdByFieldOfficerAssignmentId_fkey";
ALTER TABLE IF EXISTS "BaketCoverageCheck" DROP CONSTRAINT IF EXISTS "BaketCoverageCheck_positionAssignmentId_fkey";
ALTER TABLE IF EXISTS "BaketCoverageCheck" DROP CONSTRAINT IF EXISTS "BaketCoverageCheck_operationalAssignmentId_fkey";
ALTER TABLE IF EXISTS "BaketRevisionRequest" DROP CONSTRAINT IF EXISTS "BaketRevisionRequest_requestedByAssignmentId_fkey";
ALTER TABLE IF EXISTS "BaketVerification" DROP CONSTRAINT IF EXISTS "BaketVerification_verifiedByAssignmentId_fkey";
ALTER TABLE IF EXISTS "BaketVersion" DROP CONSTRAINT IF EXISTS "BaketVersion_createdByAssignmentId_fkey";
ALTER TABLE IF EXISTS "Directive" DROP CONSTRAINT IF EXISTS "Directive_createdByAssignmentId_fkey";
ALTER TABLE IF EXISTS "Directive" DROP CONSTRAINT IF EXISTS "Directive_ownerUnitId_fkey";
ALTER TABLE IF EXISTS "Directive" DROP CONSTRAINT IF EXISTS "Directive_ownerAssignmentId_fkey";
ALTER TABLE IF EXISTS "DirectiveRecipient" DROP CONSTRAINT IF EXISTS "DirectiveRecipient_targetPositionId_fkey";
ALTER TABLE IF EXISTS "DirectiveRecipient" DROP CONSTRAINT IF EXISTS "DirectiveRecipient_targetSeatId_fkey";
ALTER TABLE IF EXISTS "DirectiveRecipient" DROP CONSTRAINT IF EXISTS "DirectiveRecipient_targetUnitId_fkey";
ALTER TABLE IF EXISTS "DirectiveRecipient" DROP CONSTRAINT IF EXISTS "DirectiveRecipient_targetAssignmentId_fkey";
ALTER TABLE IF EXISTS "DirectiveVersion" DROP CONSTRAINT IF EXISTS "DirectiveVersion_createdByAssignmentId_fkey";
ALTER TABLE IF EXISTS "EmergencyIncident" DROP CONSTRAINT IF EXISTS "EmergencyIncident_reportedByAssignmentId_fkey";
ALTER TABLE IF EXISTS "FileAsset" DROP CONSTRAINT IF EXISTS "FileAsset_createdByAssignmentId_fkey";
ALTER TABLE IF EXISTS "IntelligenceProduct" DROP CONSTRAINT IF EXISTS "IntelligenceProduct_createdByAssignmentId_fkey";
ALTER TABLE IF EXISTS "IntelligenceProduct" DROP CONSTRAINT IF EXISTS "IntelligenceProduct_ownerUnitId_fkey";
ALTER TABLE IF EXISTS "IntelligenceProduct" DROP CONSTRAINT IF EXISTS "IntelligenceProduct_ownerAssignmentId_fkey";
ALTER TABLE IF EXISTS "Jaring" DROP CONSTRAINT IF EXISTS "Jaring_createdByAssignmentId_fkey";
ALTER TABLE IF EXISTS "Jaring" DROP CONSTRAINT IF EXISTS "Jaring_reviewedByAssignmentId_fkey";
ALTER TABLE IF EXISTS "JaringCaretakerAssignment" DROP CONSTRAINT IF EXISTS "JaringCaretakerAssignment_fieldOfficerAssignmentId_fkey";
ALTER TABLE IF EXISTS "PersonnelLocationPing" DROP CONSTRAINT IF EXISTS "PersonnelLocationPing_positionAssignmentId_fkey";
ALTER TABLE IF EXISTS "PersonnelLocationPing" DROP CONSTRAINT IF EXISTS "PersonnelLocationPing_operationalAssignmentId_fkey";
ALTER TABLE IF EXISTS "ProductApprovalStep" DROP CONSTRAINT IF EXISTS "ProductApprovalStep_decidedByAssignmentId_fkey";
ALTER TABLE IF EXISTS "ProductApprovalStep" DROP CONSTRAINT IF EXISTS "ProductApprovalStep_targetPositionId_fkey";
ALTER TABLE IF EXISTS "ProductApprovalStep" DROP CONSTRAINT IF EXISTS "ProductApprovalStep_targetSeatId_fkey";
ALTER TABLE IF EXISTS "ProductApprovalStep" DROP CONSTRAINT IF EXISTS "ProductApprovalStep_targetAssignmentId_fkey";
ALTER TABLE IF EXISTS "ProductDistribution" DROP CONSTRAINT IF EXISTS "ProductDistribution_sentByAssignmentId_fkey";
ALTER TABLE IF EXISTS "ProductDistribution" DROP CONSTRAINT IF EXISTS "ProductDistribution_targetPositionId_fkey";
ALTER TABLE IF EXISTS "ProductDistribution" DROP CONSTRAINT IF EXISTS "ProductDistribution_targetSeatId_fkey";
ALTER TABLE IF EXISTS "ProductDistribution" DROP CONSTRAINT IF EXISTS "ProductDistribution_targetUnitId_fkey";
ALTER TABLE IF EXISTS "ProductDistribution" DROP CONSTRAINT IF EXISTS "ProductDistribution_targetAssignmentId_fkey";
ALTER TABLE IF EXISTS "ProductVersion" DROP CONSTRAINT IF EXISTS "ProductVersion_createdByAssignmentId_fkey";
ALTER TABLE IF EXISTS "Task" DROP CONSTRAINT IF EXISTS "Task_createdByAssignmentId_fkey";
ALTER TABLE IF EXISTS "Task" DROP CONSTRAINT IF EXISTS "Task_ownerUnitId_fkey";
ALTER TABLE IF EXISTS "Task" DROP CONSTRAINT IF EXISTS "Task_ownerAssignmentId_fkey";
ALTER TABLE IF EXISTS "TaskAssignment" DROP CONSTRAINT IF EXISTS "TaskAssignment_assigneeAssignmentId_fkey";
ALTER TABLE IF EXISTS "TaskAssignment" DROP CONSTRAINT IF EXISTS "TaskAssignment_assignerAssignmentId_fkey";
ALTER TABLE IF EXISTS "TaskProgressLog" DROP CONSTRAINT IF EXISTS "TaskProgressLog_createdByAssignmentId_fkey";
ALTER TABLE IF EXISTS "UukStr" DROP CONSTRAINT IF EXISTS "UukStr_createdByAssignmentId_fkey";
ALTER TABLE IF EXISTS "UukStr" DROP CONSTRAINT IF EXISTS "UukStr_ownerUnitId_fkey";
ALTER TABLE IF EXISTS "UukStr" DROP CONSTRAINT IF EXISTS "UukStr_ownerAssignmentId_fkey";
ALTER TABLE IF EXISTS "UukStrVersion" DROP CONSTRAINT IF EXISTS "UukStrVersion_createdByAssignmentId_fkey";
ALTER TABLE IF EXISTS "UserSeatAssignment" DROP CONSTRAINT IF EXISTS "UserSeatAssignment_positionId_fkey";
ALTER TABLE IF EXISTS "UserSeatAssignment" DROP CONSTRAINT IF EXISTS "UserSeatAssignment_seatId_fkey";
ALTER TABLE IF EXISTS "UserSeatAssignment" DROP CONSTRAINT IF EXISTS "UserSeatAssignment_userProfileId_fkey";
ALTER TABLE IF EXISTS "UserOperationalAssignment" DROP CONSTRAINT IF EXISTS "UserOperationalAssignment_userProfileId_fkey";
ALTER TABLE IF EXISTS "UserOperationalAssignment" DROP CONSTRAINT IF EXISTS "UserOperationalAssignment_roleId_fkey";
ALTER TABLE IF EXISTS "WhatsAppMessage" DROP CONSTRAINT IF EXISTS "WhatsAppMessage_routedToFieldOfficerAssignmentId_fkey";
ALTER TABLE IF EXISTS "WhatsAppReportSession" DROP CONSTRAINT IF EXISTS "WhatsAppReportSession_fieldOfficerAssignmentId_fkey";
ALTER TABLE IF EXISTS "WhatsAppRoutingLog" DROP CONSTRAINT IF EXISTS "WhatsAppRoutingLog_routedToAssignmentId_fkey";

DO $$
BEGIN
  IF to_regclass('public."UserOperationalAssignment"') IS NULL
     AND to_regclass('public."UserSeatAssignment"') IS NOT NULL THEN
    ALTER TABLE "UserSeatAssignment" RENAME TO "UserOperationalAssignment";
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public."UserAreaScope"') IS NULL
     AND to_regclass('public."PositionAreaScope"') IS NOT NULL THEN
    ALTER TABLE "PositionAreaScope" RENAME TO "UserAreaScope";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'UserAreaScope' AND column_name = 'positionAssignmentId'
  ) THEN
    ALTER TABLE "UserAreaScope" RENAME COLUMN "positionAssignmentId" TO "operationalAssignmentId";
  END IF;
END $$;

ALTER TABLE "UserOperationalAssignment" ADD COLUMN IF NOT EXISTS "roleId" UUID;
ALTER TABLE "UserOperationalAssignment" ADD COLUMN IF NOT EXISTS "branch" "CommandRouteType";

UPDATE "UserOperationalAssignment" assignment
SET "roleId" = COALESCE(
  assignment."roleId",
  (SELECT seat."roleId" FROM "OrganizationRoleSeat" seat WHERE seat."id" = assignment."seatId" LIMIT 1),
  (SELECT position."roleId" FROM "Position" position WHERE position."id" = assignment."positionId" LIMIT 1),
  (SELECT role."id" FROM "Role" role WHERE role."code" = 'FIELD_OFFICER' LIMIT 1),
  (SELECT role."id" FROM "Role" role ORDER BY role."createdAt" ASC LIMIT 1)
)
WHERE assignment."roleId" IS NULL;

UPDATE "UserOperationalAssignment" assignment
SET "branch" = COALESCE(
  assignment."branch",
  (SELECT seat."branch" FROM "OrganizationRoleSeat" seat WHERE seat."id" = assignment."seatId" LIMIT 1),
  (SELECT position."branch" FROM "Position" position WHERE position."id" = assignment."positionId" LIMIT 1),
  'BINDA'::"CommandRouteType"
)
WHERE assignment."branch" IS NULL;

ALTER TABLE "UserOperationalAssignment" ALTER COLUMN "roleId" SET NOT NULL;
ALTER TABLE "UserOperationalAssignment" ALTER COLUMN "branch" SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'PersonnelLocationPing' AND column_name = 'positionAssignmentId')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'PersonnelLocationPing' AND column_name = 'operationalAssignmentId') THEN
    ALTER TABLE "PersonnelLocationPing" RENAME COLUMN "positionAssignmentId" TO "operationalAssignmentId";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'BaketCoverageCheck' AND column_name = 'positionAssignmentId')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'BaketCoverageCheck' AND column_name = 'operationalAssignmentId') THEN
    ALTER TABLE "BaketCoverageCheck" RENAME COLUMN "positionAssignmentId" TO "operationalAssignmentId";
  END IF;
END $$;

ALTER TABLE "Directive" ADD COLUMN IF NOT EXISTS "ownerAssignmentId" UUID;
UPDATE "Directive" SET "ownerAssignmentId" = "createdByAssignmentId" WHERE "ownerAssignmentId" IS NULL;
ALTER TABLE "Directive" ALTER COLUMN "ownerAssignmentId" SET NOT NULL;
ALTER TABLE "Directive" DROP COLUMN IF EXISTS "ownerUnitId";

ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "ownerAssignmentId" UUID;
UPDATE "Task" SET "ownerAssignmentId" = "createdByAssignmentId" WHERE "ownerAssignmentId" IS NULL;
ALTER TABLE "Task" ALTER COLUMN "ownerAssignmentId" SET NOT NULL;
ALTER TABLE "Task" DROP COLUMN IF EXISTS "ownerUnitId";

ALTER TABLE "UukStr" ADD COLUMN IF NOT EXISTS "ownerAssignmentId" UUID;
UPDATE "UukStr" SET "ownerAssignmentId" = "createdByAssignmentId" WHERE "ownerAssignmentId" IS NULL;
ALTER TABLE "UukStr" ALTER COLUMN "ownerAssignmentId" SET NOT NULL;
ALTER TABLE "UukStr" DROP COLUMN IF EXISTS "ownerUnitId";

ALTER TABLE "AnalysisCase" ADD COLUMN IF NOT EXISTS "ownerAssignmentId" UUID;
UPDATE "AnalysisCase" SET "ownerAssignmentId" = "createdByAssignmentId" WHERE "ownerAssignmentId" IS NULL;
ALTER TABLE "AnalysisCase" ALTER COLUMN "ownerAssignmentId" SET NOT NULL;
ALTER TABLE "AnalysisCase" DROP COLUMN IF EXISTS "ownerUnitId";

ALTER TABLE "IntelligenceProduct" ADD COLUMN IF NOT EXISTS "ownerAssignmentId" UUID;
UPDATE "IntelligenceProduct" SET "ownerAssignmentId" = "createdByAssignmentId" WHERE "ownerAssignmentId" IS NULL;
ALTER TABLE "IntelligenceProduct" ALTER COLUMN "ownerAssignmentId" SET NOT NULL;
ALTER TABLE "IntelligenceProduct" DROP COLUMN IF EXISTS "ownerUnitId";

ALTER TABLE "DirectiveRecipient" ADD COLUMN IF NOT EXISTS "targetAssignmentId" UUID;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'DirectiveRecipient' AND column_name = 'targetSeatId') THEN
    EXECUTE $sql$
      UPDATE "DirectiveRecipient" recipient
      SET "targetAssignmentId" = COALESCE(
        recipient."targetAssignmentId",
        (SELECT assignment."id" FROM "UserOperationalAssignment" assignment WHERE assignment."seatId" = recipient."targetSeatId" ORDER BY assignment."isActive" DESC, assignment."validUntil" NULLS FIRST LIMIT 1),
        (SELECT assignment."id" FROM "UserOperationalAssignment" assignment WHERE assignment."positionId" = recipient."targetPositionId" ORDER BY assignment."isActive" DESC, assignment."validUntil" NULLS FIRST LIMIT 1),
        (SELECT assignment."id"
         FROM "UserOperationalAssignment" assignment
         JOIN "OrganizationRoleSeat" seat ON seat."id" = assignment."seatId"
         WHERE seat."organizationUnitId" = recipient."targetUnitId"
         ORDER BY assignment."isActive" DESC, assignment."validUntil" NULLS FIRST LIMIT 1)
      )
      WHERE recipient."targetAssignmentId" IS NULL
    $sql$;
  END IF;
END $$;
ALTER TABLE "DirectiveRecipient" DROP COLUMN IF EXISTS "targetUnitId";
ALTER TABLE "DirectiveRecipient" DROP COLUMN IF EXISTS "targetSeatId";
ALTER TABLE "DirectiveRecipient" DROP COLUMN IF EXISTS "targetPositionId";

ALTER TABLE "ProductApprovalStep" ADD COLUMN IF NOT EXISTS "targetAssignmentId" UUID;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ProductApprovalStep' AND column_name = 'targetSeatId') THEN
    EXECUTE $sql$
      UPDATE "ProductApprovalStep" step
      SET "targetAssignmentId" = COALESCE(
        step."targetAssignmentId",
        (SELECT assignment."id" FROM "UserOperationalAssignment" assignment WHERE assignment."seatId" = step."targetSeatId" ORDER BY assignment."isActive" DESC, assignment."validUntil" NULLS FIRST LIMIT 1),
        (SELECT assignment."id" FROM "UserOperationalAssignment" assignment WHERE assignment."positionId" = step."targetPositionId" ORDER BY assignment."isActive" DESC, assignment."validUntil" NULLS FIRST LIMIT 1),
        step."decidedByAssignmentId",
        (SELECT assignment."id" FROM "UserOperationalAssignment" assignment ORDER BY assignment."createdAt" ASC LIMIT 1)
      )
      WHERE step."targetAssignmentId" IS NULL
    $sql$;
  END IF;
END $$;
ALTER TABLE "ProductApprovalStep" ALTER COLUMN "targetAssignmentId" SET NOT NULL;
ALTER TABLE "ProductApprovalStep" DROP COLUMN IF EXISTS "targetSeatId";
ALTER TABLE "ProductApprovalStep" DROP COLUMN IF EXISTS "targetPositionId";

ALTER TABLE "ProductDistribution" ADD COLUMN IF NOT EXISTS "targetAssignmentId" UUID;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ProductDistribution' AND column_name = 'targetSeatId') THEN
    EXECUTE $sql$
      UPDATE "ProductDistribution" distribution
      SET "targetAssignmentId" = COALESCE(
        distribution."targetAssignmentId",
        (SELECT assignment."id" FROM "UserOperationalAssignment" assignment WHERE assignment."seatId" = distribution."targetSeatId" ORDER BY assignment."isActive" DESC, assignment."validUntil" NULLS FIRST LIMIT 1),
        (SELECT assignment."id" FROM "UserOperationalAssignment" assignment WHERE assignment."positionId" = distribution."targetPositionId" ORDER BY assignment."isActive" DESC, assignment."validUntil" NULLS FIRST LIMIT 1),
        (SELECT assignment."id"
         FROM "UserOperationalAssignment" assignment
         JOIN "OrganizationRoleSeat" seat ON seat."id" = assignment."seatId"
         WHERE seat."organizationUnitId" = distribution."targetUnitId"
         ORDER BY assignment."isActive" DESC, assignment."validUntil" NULLS FIRST LIMIT 1)
      )
      WHERE distribution."targetAssignmentId" IS NULL
    $sql$;
  END IF;
END $$;
ALTER TABLE "ProductDistribution" DROP COLUMN IF EXISTS "targetUnitId";
ALTER TABLE "ProductDistribution" DROP COLUMN IF EXISTS "targetSeatId";
ALTER TABLE "ProductDistribution" DROP COLUMN IF EXISTS "targetPositionId";

ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "assignedAssignmentId" UUID;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Alert' AND column_name = 'assignedSeatId') THEN
    EXECUTE $sql$
      UPDATE "Alert" alert
      SET "assignedAssignmentId" = COALESCE(
        alert."assignedAssignmentId",
        (SELECT assignment."id" FROM "UserOperationalAssignment" assignment WHERE assignment."seatId" = alert."assignedSeatId" ORDER BY assignment."isActive" DESC, assignment."validUntil" NULLS FIRST LIMIT 1),
        (SELECT assignment."id" FROM "UserOperationalAssignment" assignment WHERE assignment."positionId" = alert."assignedPositionId" ORDER BY assignment."isActive" DESC, assignment."validUntil" NULLS FIRST LIMIT 1)
      )
      WHERE alert."assignedAssignmentId" IS NULL
    $sql$;
  END IF;
END $$;
ALTER TABLE "Alert" DROP COLUMN IF EXISTS "assignedSeatId";
ALTER TABLE "Alert" DROP COLUMN IF EXISTS "assignedPositionId";

ALTER TABLE "UserOperationalAssignment" DROP COLUMN IF EXISTS "seatId";
ALTER TABLE "UserOperationalAssignment" DROP COLUMN IF EXISTS "positionId";

-- Keep historical backup tables intact. Drop only active organization/jabatan structures.
DROP TABLE IF EXISTS "BindaProfile" CASCADE;
DROP TABLE IF EXISTS "DirectorateCoverage" CASCADE;
DROP TABLE IF EXISTS "DirectorateProfile" CASCADE;
DROP TABLE IF EXISTS "OrganizationAreaCoverage" CASCADE;
DROP TABLE IF EXISTS "OrganizationRoleSeat" CASCADE;
DROP TABLE IF EXISTS "OrganizationUnit" CASCADE;
DROP TABLE IF EXISTS "OrganizationUnitClosure" CASCADE;
DROP TABLE IF EXISTS "Position" CASCADE;
DROP TABLE IF EXISTS "PositionAreaCoverage" CASCADE;
DROP TABLE IF EXISTS "UserSeatAssignment" CASCADE;
DROP TABLE IF EXISTS "PositionAreaScope" CASCADE;
DROP TYPE IF EXISTS "OrganizationType" CASCADE;
DROP TYPE IF EXISTS "PositionCode" CASCADE;

DROP INDEX IF EXISTS "UserSeatAssignment_userProfileId_isActive_idx";
DROP INDEX IF EXISTS "UserSeatAssignment_seatId_isActive_idx";
DROP INDEX IF EXISTS "UserSeatAssignment_positionId_isActive_idx";
DROP INDEX IF EXISTS "PositionAreaScope_areaId_validUntil_idx";
DROP INDEX IF EXISTS "PositionAreaScope_positionAssignmentId_validUntil_idx";
DROP INDEX IF EXISTS "PositionAreaScope_positionAssignmentId_areaId_validFrom_key";

CREATE INDEX IF NOT EXISTS "UserOperationalAssignment_userProfileId_isActive_idx" ON "UserOperationalAssignment"("userProfileId", "isActive");
CREATE INDEX IF NOT EXISTS "UserOperationalAssignment_roleId_branch_isActive_idx" ON "UserOperationalAssignment"("roleId", "branch", "isActive");
CREATE INDEX IF NOT EXISTS "UserAreaScope_areaId_validUntil_idx" ON "UserAreaScope"("areaId", "validUntil");
CREATE INDEX IF NOT EXISTS "UserAreaScope_operationalAssignmentId_validUntil_idx" ON "UserAreaScope"("operationalAssignmentId", "validUntil");
CREATE UNIQUE INDEX IF NOT EXISTS "UserAreaScope_operationalAssignmentId_areaId_validFrom_key" ON "UserAreaScope"("operationalAssignmentId", "areaId", "validFrom");
CREATE INDEX IF NOT EXISTS "AnalysisCase_ownerAssignmentId_status_idx" ON "AnalysisCase"("ownerAssignmentId", "status");
CREATE INDEX IF NOT EXISTS "BaketCoverageCheck_operationalAssignmentId_checkedAt_idx" ON "BaketCoverageCheck"("operationalAssignmentId", "checkedAt");
CREATE INDEX IF NOT EXISTS "Directive_ownerAssignmentId_status_idx" ON "Directive"("ownerAssignmentId", "status");
CREATE INDEX IF NOT EXISTS "DirectiveRecipient_targetAssignmentId_status_idx" ON "DirectiveRecipient"("targetAssignmentId", "status");
CREATE INDEX IF NOT EXISTS "IntelligenceProduct_ownerAssignmentId_status_idx" ON "IntelligenceProduct"("ownerAssignmentId", "status");
CREATE INDEX IF NOT EXISTS "PersonnelLocationPing_operationalAssignmentId_capturedAt_idx" ON "PersonnelLocationPing"("operationalAssignmentId", "capturedAt");
CREATE INDEX IF NOT EXISTS "ProductApprovalStep_targetAssignmentId_status_idx" ON "ProductApprovalStep"("targetAssignmentId", "status");
CREATE INDEX IF NOT EXISTS "Task_ownerAssignmentId_status_idx" ON "Task"("ownerAssignmentId", "status");
CREATE INDEX IF NOT EXISTS "UukStr_ownerAssignmentId_status_idx" ON "UukStr"("ownerAssignmentId", "status");

ALTER TABLE "UserOperationalAssignment" ADD CONSTRAINT "UserOperationalAssignment_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "user_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserOperationalAssignment" ADD CONSTRAINT "UserOperationalAssignment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserAreaScope" ADD CONSTRAINT "UserAreaScope_operationalAssignmentId_fkey" FOREIGN KEY ("operationalAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserAreaScope" ADD CONSTRAINT "UserAreaScope_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "AdministrativeArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Directive" ADD CONSTRAINT "Directive_ownerAssignmentId_fkey" FOREIGN KEY ("ownerAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Directive" ADD CONSTRAINT "Directive_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DirectiveVersion" ADD CONSTRAINT "DirectiveVersion_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DirectiveRecipient" ADD CONSTRAINT "DirectiveRecipient_targetAssignmentId_fkey" FOREIGN KEY ("targetAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UukStr" ADD CONSTRAINT "UukStr_ownerAssignmentId_fkey" FOREIGN KEY ("ownerAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UukStr" ADD CONSTRAINT "UukStr_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UukStrVersion" ADD CONSTRAINT "UukStrVersion_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_ownerAssignmentId_fkey" FOREIGN KEY ("ownerAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_assignerAssignmentId_fkey" FOREIGN KEY ("assignerAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_assigneeAssignmentId_fkey" FOREIGN KEY ("assigneeAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaskProgressLog" ADD CONSTRAINT "TaskProgressLog_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Jaring" ADD CONSTRAINT "Jaring_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Jaring" ADD CONSTRAINT "Jaring_reviewedByAssignmentId_fkey" FOREIGN KEY ("reviewedByAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JaringCaretakerAssignment" ADD CONSTRAINT "JaringCaretakerAssignment_fieldOfficerAssignmentId_fkey" FOREIGN KEY ("fieldOfficerAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_routedToFieldOfficerAssignmentId_fkey" FOREIGN KEY ("routedToFieldOfficerAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WhatsAppRoutingLog" ADD CONSTRAINT "WhatsAppRoutingLog_routedToAssignmentId_fkey" FOREIGN KEY ("routedToAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WhatsAppReportSession" ADD CONSTRAINT "WhatsAppReportSession_fieldOfficerAssignmentId_fkey" FOREIGN KEY ("fieldOfficerAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Baket" ADD CONSTRAINT "Baket_createdByFieldOfficerAssignmentId_fkey" FOREIGN KEY ("createdByFieldOfficerAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BaketVersion" ADD CONSTRAINT "BaketVersion_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BaketRevisionRequest" ADD CONSTRAINT "BaketRevisionRequest_requestedByAssignmentId_fkey" FOREIGN KEY ("requestedByAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BaketVerification" ADD CONSTRAINT "BaketVerification_verifiedByAssignmentId_fkey" FOREIGN KEY ("verifiedByAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BaketCoverageCheck" ADD CONSTRAINT "BaketCoverageCheck_operationalAssignmentId_fkey" FOREIGN KEY ("operationalAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AnalysisCase" ADD CONSTRAINT "AnalysisCase_ownerAssignmentId_fkey" FOREIGN KEY ("ownerAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AnalysisCase" ADD CONSTRAINT "AnalysisCase_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AnalysisVersion" ADD CONSTRAINT "AnalysisVersion_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AnalysisVersion" ADD CONSTRAINT "AnalysisVersion_validatedByAssignmentId_fkey" FOREIGN KEY ("validatedByAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntelligenceProduct" ADD CONSTRAINT "IntelligenceProduct_ownerAssignmentId_fkey" FOREIGN KEY ("ownerAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntelligenceProduct" ADD CONSTRAINT "IntelligenceProduct_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductVersion" ADD CONSTRAINT "ProductVersion_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductApprovalStep" ADD CONSTRAINT "ProductApprovalStep_targetAssignmentId_fkey" FOREIGN KEY ("targetAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductApprovalStep" ADD CONSTRAINT "ProductApprovalStep_decidedByAssignmentId_fkey" FOREIGN KEY ("decidedByAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductDistribution" ADD CONSTRAINT "ProductDistribution_sentByAssignmentId_fkey" FOREIGN KEY ("sentByAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductDistribution" ADD CONSTRAINT "ProductDistribution_targetAssignmentId_fkey" FOREIGN KEY ("targetAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmergencyIncident" ADD CONSTRAINT "EmergencyIncident_reportedByAssignmentId_fkey" FOREIGN KEY ("reportedByAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_assignedAssignmentId_fkey" FOREIGN KEY ("assignedAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PersonnelLocationPing" ADD CONSTRAINT "PersonnelLocationPing_operationalAssignmentId_fkey" FOREIGN KEY ("operationalAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorAssignmentId_fkey" FOREIGN KEY ("actorAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
