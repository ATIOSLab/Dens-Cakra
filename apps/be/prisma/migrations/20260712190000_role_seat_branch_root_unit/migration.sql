-- DropForeignKey
ALTER TABLE "AnalysisCase" DROP CONSTRAINT "AnalysisCase_createdByAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "AnalysisVersion" DROP CONSTRAINT "AnalysisVersion_createdByAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "AnalysisVersion" DROP CONSTRAINT "AnalysisVersion_validatedByAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_actorAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "Baket" DROP CONSTRAINT "Baket_createdByFieldOfficerAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "BaketCoverageCheck" DROP CONSTRAINT "BaketCoverageCheck_positionAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "BaketRevisionRequest" DROP CONSTRAINT "BaketRevisionRequest_requestedByAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "BaketVerification" DROP CONSTRAINT "BaketVerification_verifiedByAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "BaketVersion" DROP CONSTRAINT "BaketVersion_createdByAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "Directive" DROP CONSTRAINT "Directive_createdByAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "DirectiveVersion" DROP CONSTRAINT "DirectiveVersion_createdByAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "EmergencyIncident" DROP CONSTRAINT "EmergencyIncident_reportedByAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "FileAsset" DROP CONSTRAINT "FileAsset_createdByAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "IntelligenceProduct" DROP CONSTRAINT "IntelligenceProduct_createdByAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "Jaring" DROP CONSTRAINT "Jaring_createdByAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "JaringCaretakerAssignment" DROP CONSTRAINT "JaringCaretakerAssignment_fieldOfficerAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "PersonnelLocationPing" DROP CONSTRAINT "PersonnelLocationPing_positionAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "PositionAreaScope" DROP CONSTRAINT "PositionAreaScope_positionAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "PositionAssignment" DROP CONSTRAINT "PositionAssignment_positionId_fkey";

-- DropForeignKey
ALTER TABLE "PositionAssignment" DROP CONSTRAINT "PositionAssignment_userProfileId_fkey";

-- DropForeignKey
ALTER TABLE "ProductApprovalStep" DROP CONSTRAINT "ProductApprovalStep_decidedByAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "ProductDistribution" DROP CONSTRAINT "ProductDistribution_sentByAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "ProductVersion" DROP CONSTRAINT "ProductVersion_createdByAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_createdByAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "TaskAssignment" DROP CONSTRAINT "TaskAssignment_assigneeAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "TaskAssignment" DROP CONSTRAINT "TaskAssignment_assignerAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "TaskProgressLog" DROP CONSTRAINT "TaskProgressLog_createdByAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "UukStr" DROP CONSTRAINT "UukStr_createdByAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "UukStrVersion" DROP CONSTRAINT "UukStrVersion_createdByAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "WhatsAppMessage" DROP CONSTRAINT "WhatsAppMessage_routedToFieldOfficerAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "WhatsAppRoutingLog" DROP CONSTRAINT "WhatsAppRoutingLog_routedToAssignmentId_fkey";

-- AlterTable
ALTER TABLE "Alert" ADD COLUMN     "assignedSeatId" UUID;

-- AlterTable
ALTER TABLE "DirectiveRecipient" ADD COLUMN     "targetSeatId" UUID;

-- AlterTable
ALTER TABLE "OrganizationUnit" ADD COLUMN     "branch" "CommandRouteType";

-- AlterTable
ALTER TABLE "Position" ADD COLUMN     "branch" "CommandRouteType";

-- AlterTable
ALTER TABLE "ProductApprovalStep" ADD COLUMN     "targetSeatId" UUID,
ALTER COLUMN "targetPositionId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ProductDistribution" ADD COLUMN     "targetSeatId" UUID;

-- Rename legacy tables so data can be copied forward safely.
ALTER TABLE "PositionAreaPolicy" RENAME TO "_PositionAreaPolicyLegacy";

ALTER TABLE "PositionAssignment" RENAME TO "_PositionAssignmentLegacy";

-- CreateTable
CREATE TABLE "OrganizationRoleSeat" (
    "id" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "branch" "CommandRouteType",
    "organizationUnitId" UUID NOT NULL,
    "positionId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationRoleSeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSeatAssignment" (
    "id" UUID NOT NULL,
    "userProfileId" UUID NOT NULL,
    "seatId" UUID NOT NULL,
    "positionId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSeatAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleAreaPolicy" (
    "id" UUID NOT NULL,
    "roleCode" "RoleCode" NOT NULL,
    "branch" "CommandRouteType",
    "administrativeLevel" "AdministrativeLevel" NOT NULL,
    "scopeMode" "AreaScopeMode" NOT NULL DEFAULT 'EXPLICIT',
    "minimumAreas" INTEGER NOT NULL DEFAULT 1,
    "maximumAreas" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleAreaPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectorateProfile" (
    "organizationUnitId" UUID NOT NULL,
    "code" VARCHAR(80),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectorateProfile_pkey" PRIMARY KEY ("organizationUnitId")
);

-- CreateTable
CREATE TABLE "DirectorateCoverage" (
    "id" UUID NOT NULL,
    "directorateUnitId" UUID NOT NULL,
    "provinceAreaId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectorateCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BindaProfile" (
    "organizationUnitId" UUID NOT NULL,
    "provinceAreaId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BindaProfile_pkey" PRIMARY KEY ("organizationUnitId")
);

-- Backfill branch on legacy organization units and positions before seat generation.
UPDATE "OrganizationUnit"
SET "branch" = 'DIRECTORATE'
WHERE "type" IN ('DIRECTORATE', 'SUBDIRECTORATE');

UPDATE "OrganizationUnit"
SET "branch" = 'BINDA'
WHERE "type" IN ('BINDA', 'BAGOPS');

UPDATE "OrganizationUnit" unit
SET "branch" = 'DIRECTORATE'
WHERE unit."type" = 'FIELD_COORDINATION_UNIT'
  AND EXISTS (
    SELECT 1
    FROM "OrganizationUnitClosure" closure
    JOIN "OrganizationUnit" ancestor ON ancestor."id" = closure."ancestorId"
    WHERE closure."descendantId" = unit."id"
      AND ancestor."type" IN ('DIRECTORATE', 'SUBDIRECTORATE')
  );

UPDATE "OrganizationUnit" unit
SET "branch" = 'BINDA'
WHERE unit."type" = 'FIELD_COORDINATION_UNIT'
  AND EXISTS (
    SELECT 1
    FROM "OrganizationUnitClosure" closure
    JOIN "OrganizationUnit" ancestor ON ancestor."id" = closure."ancestorId"
    WHERE closure."descendantId" = unit."id"
      AND ancestor."type" IN ('BINDA', 'BAGOPS')
  );

UPDATE "Position" position
SET "branch" = unit."branch"
FROM "OrganizationUnit" unit
WHERE unit."id" = position."organizationUnitId"
  AND position."branch" IS NULL;

-- Seed role seats from the structurally unique legacy position records.
INSERT INTO "OrganizationRoleSeat" (
  "id",
  "roleId",
  "branch",
  "organizationUnitId",
  "positionId",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT DISTINCT ON (position."organizationUnitId", position."roleId", position."branch")
  position."id",
  position."roleId",
  position."branch",
  position."organizationUnitId",
  position."id",
  position."isActive",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Position" position
ORDER BY
  position."organizationUnitId",
  position."roleId",
  position."branch",
  position."createdAt",
  position."id";

-- Migrate legacy user assignments into seat-based assignments while preserving IDs.
INSERT INTO "UserSeatAssignment" (
  "id",
  "userProfileId",
  "seatId",
  "positionId",
  "isPrimary",
  "isActive",
  "validFrom",
  "validUntil",
  "createdAt",
  "updatedAt"
)
SELECT
  assignment."id",
  assignment."userProfileId",
  seat."id",
  assignment."positionId",
  assignment."isPrimary",
  assignment."isActive",
  assignment."validFrom",
  assignment."validUntil",
  assignment."createdAt",
  assignment."updatedAt"
FROM "_PositionAssignmentLegacy" assignment
JOIN "Position" position ON position."id" = assignment."positionId"
JOIN "OrganizationRoleSeat" seat
  ON seat."organizationUnitId" = position."organizationUnitId"
 AND seat."roleId" = position."roleId"
 AND (
   (seat."branch" IS NULL AND position."branch" IS NULL)
   OR seat."branch" = position."branch"
 );

-- Backfill seat targets for workflow/distribution/alert rows that were previously position-targeted.
UPDATE "DirectiveRecipient" recipient
SET "targetSeatId" = seat."id"
FROM "Position" position
JOIN "OrganizationRoleSeat" seat
  ON seat."organizationUnitId" = position."organizationUnitId"
 AND seat."roleId" = position."roleId"
 AND (
   (seat."branch" IS NULL AND position."branch" IS NULL)
   OR seat."branch" = position."branch"
 )
WHERE recipient."targetPositionId" = position."id"
  AND recipient."targetSeatId" IS NULL;

UPDATE "ProductApprovalStep" step
SET "targetSeatId" = seat."id"
FROM "Position" position
JOIN "OrganizationRoleSeat" seat
  ON seat."organizationUnitId" = position."organizationUnitId"
 AND seat."roleId" = position."roleId"
 AND (
   (seat."branch" IS NULL AND position."branch" IS NULL)
   OR seat."branch" = position."branch"
 )
WHERE step."targetPositionId" = position."id"
  AND step."targetSeatId" IS NULL;

UPDATE "ProductDistribution" distribution
SET "targetSeatId" = seat."id"
FROM "Position" position
JOIN "OrganizationRoleSeat" seat
  ON seat."organizationUnitId" = position."organizationUnitId"
 AND seat."roleId" = position."roleId"
 AND (
   (seat."branch" IS NULL AND position."branch" IS NULL)
   OR seat."branch" = position."branch"
 )
WHERE distribution."targetPositionId" = position."id"
  AND distribution."targetSeatId" IS NULL;

UPDATE "Alert" alert
SET "assignedSeatId" = seat."id"
FROM "Position" position
JOIN "OrganizationRoleSeat" seat
  ON seat."organizationUnitId" = position."organizationUnitId"
 AND seat."roleId" = position."roleId"
 AND (
   (seat."branch" IS NULL AND position."branch" IS NULL)
   OR seat."branch" = position."branch"
 )
WHERE alert."assignedPositionId" = position."id"
  AND alert."assignedSeatId" IS NULL;

ALTER TABLE "ProductApprovalStep"
ALTER COLUMN "targetSeatId" SET NOT NULL;

-- Migrate position-based area policies to coarse-role policies.
INSERT INTO "RoleAreaPolicy" (
  "id",
  "roleCode",
  "branch",
  "administrativeLevel",
  "scopeMode",
  "minimumAreas",
  "maximumAreas",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  legacy."id",
  CASE legacy."positionCode"
    WHEN 'ADMIN' THEN 'ADMIN_SYSTEM'::"RoleCode"
    WHEN 'DEPUTI_II' THEN 'EXECUTIVE'::"RoleCode"
    WHEN 'DIREKTUR_WILAYAH' THEN 'REGIONAL_COMMANDER'::"RoleCode"
    WHEN 'KABINDA' THEN 'REGIONAL_COMMANDER'::"RoleCode"
    WHEN 'KASUBDIT' THEN 'OPERATIONAL_INTELLIGENCE_MANAGER'::"RoleCode"
    WHEN 'KABAGOPS' THEN 'OPERATIONAL_INTELLIGENCE_MANAGER'::"RoleCode"
    WHEN 'STAF_SUBDIT' THEN 'FIELD_COORDINATOR'::"RoleCode"
    WHEN 'KORWIL' THEN 'FIELD_COORDINATOR'::"RoleCode"
    WHEN 'PETUGAS_ORGANIK' THEN 'FIELD_OFFICER'::"RoleCode"
  END,
  CASE legacy."positionCode"
    WHEN 'DIREKTUR_WILAYAH' THEN 'DIRECTORATE'::"CommandRouteType"
    WHEN 'KABINDA' THEN 'BINDA'::"CommandRouteType"
    WHEN 'KASUBDIT' THEN 'DIRECTORATE'::"CommandRouteType"
    WHEN 'KABAGOPS' THEN 'BINDA'::"CommandRouteType"
    WHEN 'STAF_SUBDIT' THEN 'DIRECTORATE'::"CommandRouteType"
    WHEN 'KORWIL' THEN 'BINDA'::"CommandRouteType"
    ELSE NULL
  END,
  legacy."administrativeLevel",
  legacy."scopeMode",
  legacy."minimumAreas",
  legacy."maximumAreas",
  legacy."isActive",
  legacy."createdAt",
  legacy."updatedAt"
FROM "_PositionAreaPolicyLegacy" legacy;

-- Seed optional branch master profiles from existing root units.
INSERT INTO "DirectorateProfile" ("organizationUnitId", "code", "createdAt", "updatedAt")
SELECT unit."id", unit."code", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "OrganizationUnit" unit
WHERE unit."type" = 'DIRECTORATE'
ON CONFLICT ("organizationUnitId") DO NOTHING;

INSERT INTO "BindaProfile" ("organizationUnitId", "provinceAreaId", "createdAt", "updatedAt")
SELECT DISTINCT ON (unit."id")
  unit."id",
  coverage."areaId",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "OrganizationUnit" unit
JOIN "OrganizationAreaCoverage" coverage ON coverage."organizationUnitId" = unit."id"
JOIN "AdministrativeArea" area ON area."id" = coverage."areaId"
WHERE unit."type" = 'BINDA'
  AND area."level" = 'PROVINCE'
ORDER BY unit."id", coverage."isPrimary" DESC, coverage."createdAt";

-- CreateIndex
CREATE INDEX "OrganizationRoleSeat_roleId_branch_isActive_idx" ON "OrganizationRoleSeat"("roleId", "branch", "isActive");

-- CreateIndex
CREATE INDEX "OrganizationRoleSeat_positionId_idx" ON "OrganizationRoleSeat"("positionId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationRoleSeat_organizationUnitId_roleId_branch_key" ON "OrganizationRoleSeat"("organizationUnitId", "roleId", "branch");

-- CreateIndex
CREATE INDEX "UserSeatAssignment_userProfileId_isActive_idx" ON "UserSeatAssignment"("userProfileId", "isActive");

-- CreateIndex
CREATE INDEX "UserSeatAssignment_seatId_isActive_idx" ON "UserSeatAssignment"("seatId", "isActive");

-- CreateIndex
CREATE INDEX "UserSeatAssignment_positionId_isActive_idx" ON "UserSeatAssignment"("positionId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RoleAreaPolicy_roleCode_branch_administrativeLevel_key" ON "RoleAreaPolicy"("roleCode", "branch", "administrativeLevel");

-- CreateIndex
CREATE UNIQUE INDEX "DirectorateProfile_code_key" ON "DirectorateProfile"("code");

-- CreateIndex
CREATE INDEX "DirectorateCoverage_provinceAreaId_idx" ON "DirectorateCoverage"("provinceAreaId");

-- CreateIndex
CREATE UNIQUE INDEX "DirectorateCoverage_directorateUnitId_provinceAreaId_key" ON "DirectorateCoverage"("directorateUnitId", "provinceAreaId");

-- CreateIndex
CREATE UNIQUE INDEX "BindaProfile_provinceAreaId_key" ON "BindaProfile"("provinceAreaId");

-- CreateIndex
CREATE INDEX "DirectiveRecipient_targetSeatId_status_idx" ON "DirectiveRecipient"("targetSeatId", "status");

-- CreateIndex
CREATE INDEX "ProductApprovalStep_targetSeatId_status_idx" ON "ProductApprovalStep"("targetSeatId", "status");

-- AddForeignKey
ALTER TABLE "OrganizationRoleSeat" ADD CONSTRAINT "OrganizationRoleSeat_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationRoleSeat" ADD CONSTRAINT "OrganizationRoleSeat_organizationUnitId_fkey" FOREIGN KEY ("organizationUnitId") REFERENCES "OrganizationUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationRoleSeat" ADD CONSTRAINT "OrganizationRoleSeat_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSeatAssignment" ADD CONSTRAINT "UserSeatAssignment_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "user_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSeatAssignment" ADD CONSTRAINT "UserSeatAssignment_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "OrganizationRoleSeat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSeatAssignment" ADD CONSTRAINT "UserSeatAssignment_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionAreaScope" ADD CONSTRAINT "PositionAreaScope_positionAssignmentId_fkey" FOREIGN KEY ("positionAssignmentId") REFERENCES "UserSeatAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectorateProfile" ADD CONSTRAINT "DirectorateProfile_organizationUnitId_fkey" FOREIGN KEY ("organizationUnitId") REFERENCES "OrganizationUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectorateCoverage" ADD CONSTRAINT "DirectorateCoverage_directorateUnitId_fkey" FOREIGN KEY ("directorateUnitId") REFERENCES "DirectorateProfile"("organizationUnitId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectorateCoverage" ADD CONSTRAINT "DirectorateCoverage_provinceAreaId_fkey" FOREIGN KEY ("provinceAreaId") REFERENCES "AdministrativeArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BindaProfile" ADD CONSTRAINT "BindaProfile_organizationUnitId_fkey" FOREIGN KEY ("organizationUnitId") REFERENCES "OrganizationUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BindaProfile" ADD CONSTRAINT "BindaProfile_provinceAreaId_fkey" FOREIGN KEY ("provinceAreaId") REFERENCES "AdministrativeArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "UserSeatAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Directive" ADD CONSTRAINT "Directive_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "UserSeatAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectiveVersion" ADD CONSTRAINT "DirectiveVersion_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "UserSeatAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectiveRecipient" ADD CONSTRAINT "DirectiveRecipient_targetSeatId_fkey" FOREIGN KEY ("targetSeatId") REFERENCES "OrganizationRoleSeat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UukStr" ADD CONSTRAINT "UukStr_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "UserSeatAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UukStrVersion" ADD CONSTRAINT "UukStrVersion_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "UserSeatAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "UserSeatAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_assignerAssignmentId_fkey" FOREIGN KEY ("assignerAssignmentId") REFERENCES "UserSeatAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_assigneeAssignmentId_fkey" FOREIGN KEY ("assigneeAssignmentId") REFERENCES "UserSeatAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskProgressLog" ADD CONSTRAINT "TaskProgressLog_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "UserSeatAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jaring" ADD CONSTRAINT "Jaring_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "UserSeatAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JaringCaretakerAssignment" ADD CONSTRAINT "JaringCaretakerAssignment_fieldOfficerAssignmentId_fkey" FOREIGN KEY ("fieldOfficerAssignmentId") REFERENCES "UserSeatAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_routedToFieldOfficerAssignmentId_fkey" FOREIGN KEY ("routedToFieldOfficerAssignmentId") REFERENCES "UserSeatAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppRoutingLog" ADD CONSTRAINT "WhatsAppRoutingLog_routedToAssignmentId_fkey" FOREIGN KEY ("routedToAssignmentId") REFERENCES "UserSeatAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Baket" ADD CONSTRAINT "Baket_createdByFieldOfficerAssignmentId_fkey" FOREIGN KEY ("createdByFieldOfficerAssignmentId") REFERENCES "UserSeatAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaketVersion" ADD CONSTRAINT "BaketVersion_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "UserSeatAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaketRevisionRequest" ADD CONSTRAINT "BaketRevisionRequest_requestedByAssignmentId_fkey" FOREIGN KEY ("requestedByAssignmentId") REFERENCES "UserSeatAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaketVerification" ADD CONSTRAINT "BaketVerification_verifiedByAssignmentId_fkey" FOREIGN KEY ("verifiedByAssignmentId") REFERENCES "UserSeatAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaketCoverageCheck" ADD CONSTRAINT "BaketCoverageCheck_positionAssignmentId_fkey" FOREIGN KEY ("positionAssignmentId") REFERENCES "UserSeatAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisCase" ADD CONSTRAINT "AnalysisCase_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "UserSeatAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisVersion" ADD CONSTRAINT "AnalysisVersion_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "UserSeatAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisVersion" ADD CONSTRAINT "AnalysisVersion_validatedByAssignmentId_fkey" FOREIGN KEY ("validatedByAssignmentId") REFERENCES "UserSeatAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelligenceProduct" ADD CONSTRAINT "IntelligenceProduct_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "UserSeatAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVersion" ADD CONSTRAINT "ProductVersion_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "UserSeatAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductApprovalStep" ADD CONSTRAINT "ProductApprovalStep_targetSeatId_fkey" FOREIGN KEY ("targetSeatId") REFERENCES "OrganizationRoleSeat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductApprovalStep" ADD CONSTRAINT "ProductApprovalStep_decidedByAssignmentId_fkey" FOREIGN KEY ("decidedByAssignmentId") REFERENCES "UserSeatAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDistribution" ADD CONSTRAINT "ProductDistribution_sentByAssignmentId_fkey" FOREIGN KEY ("sentByAssignmentId") REFERENCES "UserSeatAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDistribution" ADD CONSTRAINT "ProductDistribution_targetSeatId_fkey" FOREIGN KEY ("targetSeatId") REFERENCES "OrganizationRoleSeat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyIncident" ADD CONSTRAINT "EmergencyIncident_reportedByAssignmentId_fkey" FOREIGN KEY ("reportedByAssignmentId") REFERENCES "UserSeatAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_assignedSeatId_fkey" FOREIGN KEY ("assignedSeatId") REFERENCES "OrganizationRoleSeat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonnelLocationPing" ADD CONSTRAINT "PersonnelLocationPing_positionAssignmentId_fkey" FOREIGN KEY ("positionAssignmentId") REFERENCES "UserSeatAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorAssignmentId_fkey" FOREIGN KEY ("actorAssignmentId") REFERENCES "UserSeatAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Remove legacy tables after successful data migration.
DROP TABLE "_PositionAreaPolicyLegacy";

DROP TABLE "_PositionAssignmentLegacy";
