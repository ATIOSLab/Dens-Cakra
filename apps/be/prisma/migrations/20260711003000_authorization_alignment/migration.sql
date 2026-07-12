-- CreateEnum
CREATE TYPE "UserProfileStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CommandRouteType" AS ENUM ('DIRECTORATE', 'BINDA');

-- AlterEnum
BEGIN;
CREATE TYPE "BoundaryQualityStatus_new" AS ENUM ('VERIFIED', 'PARTIAL', 'SIMPLIFIED', 'INVALID');
ALTER TABLE "public"."AdministrativeAreaBoundary" ALTER COLUMN "qualityStatus" DROP DEFAULT;
ALTER TABLE "AdministrativeAreaBoundary" ALTER COLUMN "qualityStatus" TYPE "BoundaryQualityStatus_new" USING ("qualityStatus"::text::"BoundaryQualityStatus_new");
ALTER TYPE "BoundaryQualityStatus" RENAME TO "BoundaryQualityStatus_old";
ALTER TYPE "BoundaryQualityStatus_new" RENAME TO "BoundaryQualityStatus";
DROP TYPE "public"."BoundaryQualityStatus_old";
ALTER TABLE "AdministrativeAreaBoundary" ALTER COLUMN "qualityStatus" SET DEFAULT 'VERIFIED';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "CoverageValidationStatus_new" AS ENUM ('NOT_CHECKED', 'WITHIN_SCOPE', 'OUTSIDE_JARING_SCOPE', 'OUTSIDE_FIELD_OFFICER_SCOPE', 'OUTSIDE_FIELD_COORDINATOR_SCOPE', 'OUTSIDE_UNIT_SCOPE', 'BORDER_AMBIGUOUS');
ALTER TABLE "public"."BaketVersion" ALTER COLUMN "coverageValidationStatus" DROP DEFAULT;
ALTER TABLE "BaketVersion" ALTER COLUMN "coverageValidationStatus" TYPE "CoverageValidationStatus_new" USING ("coverageValidationStatus"::text::"CoverageValidationStatus_new");
ALTER TYPE "CoverageValidationStatus" RENAME TO "CoverageValidationStatus_old";
ALTER TYPE "CoverageValidationStatus_new" RENAME TO "CoverageValidationStatus";
DROP TYPE "public"."CoverageValidationStatus_old";
ALTER TABLE "BaketVersion" ALTER COLUMN "coverageValidationStatus" SET DEFAULT 'NOT_CHECKED';
COMMIT;

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_actorUserId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "PositionAssignment" DROP CONSTRAINT "PositionAssignment_userId_fkey";

-- DropForeignKey
ALTER TABLE "ProductDistribution" DROP CONSTRAINT "ProductDistribution_targetUserId_fkey";

-- DropForeignKey
ALTER TABLE "user_profile" DROP CONSTRAINT "user_profile_authUserId_fkey";

-- DropIndex
DROP INDEX "AuditLog_actorUserId_createdAt_idx";

-- DropIndex
DROP INDEX "Jaring_whatsappNumber_key";

-- DropIndex
DROP INDEX "Notification_userId_readAt_createdAt_idx";

-- DropIndex
DROP INDEX "PositionAssignment_userId_isActive_idx";

-- DropIndex
DROP INDEX "ProductDistribution_targetUserId_status_idx";

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "actorUserId",
ADD COLUMN     "actorUserProfileId" UUID;

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "userId",
ADD COLUMN     "userProfileId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "PositionAssignment" DROP COLUMN "userId",
ADD COLUMN     "userProfileId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "ProductApprovalWorkflow" ADD COLUMN     "routeType" "CommandRouteType" NOT NULL;

-- AlterTable
ALTER TABLE "ProductDistribution" DROP COLUMN "targetUserId",
ADD COLUMN     "targetUserProfileId" UUID;

-- AlterTable
ALTER TABLE "TaskAssignment" ADD COLUMN     "reassignedFromId" UUID;

-- AlterTable
ALTER TABLE "user_profile" DROP COLUMN "lockedAt",
ADD COLUMN     "operationalLockReason" TEXT,
ADD COLUMN     "operationalLockedAt" TIMESTAMP(3),
ADD COLUMN     "operationalLockedUntil" TIMESTAMP(3),
ADD COLUMN     "status" "UserProfileStatus" NOT NULL DEFAULT 'PENDING';

-- DropEnum
DROP TYPE "AuditAction";

-- CreateTable
CREATE TABLE "OrganizationUnitClosure" (
    "ancestorId" UUID NOT NULL,
    "descendantId" UUID NOT NULL,
    "depth" INTEGER NOT NULL,

    CONSTRAINT "OrganizationUnitClosure_pkey" PRIMARY KEY ("ancestorId","descendantId")
);

-- CreateIndex
CREATE INDEX "OrganizationUnitClosure_descendantId_depth_idx" ON "OrganizationUnitClosure"("descendantId", "depth");

-- CreateIndex
CREATE INDEX "OrganizationUnitClosure_ancestorId_depth_idx" ON "OrganizationUnitClosure"("ancestorId", "depth");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserProfileId_createdAt_idx" ON "AuditLog"("actorUserProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userProfileId_readAt_createdAt_idx" ON "Notification"("userProfileId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "PositionAssignment_userProfileId_isActive_idx" ON "PositionAssignment"("userProfileId", "isActive");

-- CreateIndex
CREATE INDEX "ProductDistribution_targetUserProfileId_status_idx" ON "ProductDistribution"("targetUserProfileId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TaskAssignment_reassignedFromId_key" ON "TaskAssignment"("reassignedFromId");

-- CreateIndex
CREATE INDEX "TaskAssignment_reassignedFromId_idx" ON "TaskAssignment"("reassignedFromId");

-- CreateIndex
CREATE INDEX "user_profile_status_deletedAt_idx" ON "user_profile"("status", "deletedAt");

-- AddForeignKey
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_authUserId_fkey" FOREIGN KEY ("authUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUnitClosure" ADD CONSTRAINT "OrganizationUnitClosure_ancestorId_fkey" FOREIGN KEY ("ancestorId") REFERENCES "OrganizationUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUnitClosure" ADD CONSTRAINT "OrganizationUnitClosure_descendantId_fkey" FOREIGN KEY ("descendantId") REFERENCES "OrganizationUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionAssignment" ADD CONSTRAINT "PositionAssignment_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "user_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_reassignedFromId_fkey" FOREIGN KEY ("reassignedFromId") REFERENCES "TaskAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDistribution" ADD CONSTRAINT "ProductDistribution_targetUserProfileId_fkey" FOREIGN KEY ("targetUserProfileId") REFERENCES "user_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "user_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserProfileId_fkey" FOREIGN KEY ("actorUserProfileId") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

