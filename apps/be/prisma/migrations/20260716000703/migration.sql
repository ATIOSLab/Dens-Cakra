-- DropIndex
DROP INDEX "OrganizationRoleSeat_positionId_idx";

-- AlterTable
ALTER TABLE "JaringCluster" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PositionAreaCoverage" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ReportCategory" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "locationLabel" VARCHAR(255);
