-- AlterEnum
ALTER TYPE "CommandRouteType" ADD VALUE IF NOT EXISTS 'PUSAT';

-- Backfill central command branch.
UPDATE "OrganizationUnit"
SET "branch" = 'PUSAT'::"CommandRouteType"
WHERE "type" = 'DEPUTI';

UPDATE "Position"
SET "branch" = 'PUSAT'::"CommandRouteType"
WHERE "code" = 'DEPUTI_II';

UPDATE "RoleAreaPolicy"
SET "branch" = 'PUSAT'::"CommandRouteType"
WHERE "roleCode" = 'EXECUTIVE'
  AND "branch" IS NULL;

-- CreateTable
CREATE TABLE "PositionAreaCoverage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "positionId" UUID NOT NULL,
    "areaId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PositionAreaCoverage_pkey" PRIMARY KEY ("id")
);

-- Re-scope seats from unit+role to position-level slots.
DROP INDEX IF EXISTS "OrganizationRoleSeat_organizationUnitId_roleId_branch_key";

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
SELECT
  gen_random_uuid(),
  position."roleId",
  position."branch",
  position."organizationUnitId",
  position."id",
  position."isActive",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Position" position
WHERE NOT EXISTS (
  SELECT 1
  FROM "OrganizationRoleSeat" seat
  WHERE seat."positionId" = position."id"
);

UPDATE "UserSeatAssignment" assignment
SET "seatId" = seat."id"
FROM "OrganizationRoleSeat" seat
WHERE seat."positionId" = assignment."positionId"
  AND assignment."seatId" <> seat."id";

-- Backfill position master coverage from active assignment scopes.
INSERT INTO "PositionAreaCoverage" (
  "id",
  "positionId",
  "areaId",
  "isPrimary",
  "validFrom",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  assignment."positionId",
  scope."areaId",
  bool_or(scope."isPrimary"),
  MIN(scope."validFrom"),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "PositionAreaScope" scope
JOIN "UserSeatAssignment" assignment
  ON assignment."id" = scope."positionAssignmentId"
WHERE scope."validUntil" IS NULL
  AND assignment."isActive" = true
  AND assignment."validUntil" IS NULL
GROUP BY assignment."positionId", scope."areaId"
ON CONFLICT DO NOTHING;

-- Executive/Deputi II defaults to the national country scope when no scope existed yet.
INSERT INTO "PositionAreaCoverage" (
  "id",
  "positionId",
  "areaId",
  "isPrimary",
  "validFrom",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  position."id",
  country."id",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Position" position
CROSS JOIN LATERAL (
  SELECT "id"
  FROM "AdministrativeArea"
  WHERE "level" = 'COUNTRY'
    AND ("officialCode" = 'IDN' OR "code" = 'ID')
    AND "isActive" = true
    AND "deletedAt" IS NULL
  ORDER BY
    CASE WHEN "officialCode" = 'IDN' THEN 0 ELSE 1 END,
    "createdAt" ASC
  LIMIT 1
) country
WHERE position."code" = 'DEPUTI_II'
  AND NOT EXISTS (
    SELECT 1
    FROM "PositionAreaCoverage" coverage
    WHERE coverage."positionId" = position."id"
      AND coverage."validUntil" IS NULL
  );

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationRoleSeat_positionId_key" ON "OrganizationRoleSeat"("positionId");

-- CreateIndex
CREATE INDEX "PositionAreaCoverage_areaId_validUntil_idx" ON "PositionAreaCoverage"("areaId", "validUntil");

-- CreateIndex
CREATE INDEX "PositionAreaCoverage_positionId_validUntil_idx" ON "PositionAreaCoverage"("positionId", "validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "PositionAreaCoverage_positionId_areaId_validFrom_key" ON "PositionAreaCoverage"("positionId", "areaId", "validFrom");

-- CreateIndex
CREATE UNIQUE INDEX "PositionAreaCoverage_active_area_key" ON "PositionAreaCoverage"("positionId", "areaId") WHERE "validUntil" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PositionAreaCoverage_active_primary_key" ON "PositionAreaCoverage"("positionId") WHERE "isPrimary" = true AND "validUntil" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "UserSeatAssignment_active_position_key" ON "UserSeatAssignment"("positionId") WHERE "isActive" = true AND "validUntil" IS NULL;

-- AddForeignKey
ALTER TABLE "PositionAreaCoverage" ADD CONSTRAINT "PositionAreaCoverage_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionAreaCoverage" ADD CONSTRAINT "PositionAreaCoverage_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "AdministrativeArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
