-- Dynamic RBAC foundation: Permission, Position, SupervisionAssignment, OrganizationUnit.
-- Terpisah dari Role (role = level + akses dasar, jabatan = nama/kedudukan).

-- 1. SupervisionType enum
CREATE TYPE "SupervisionType" AS ENUM ('BINDA_SUPERVISION', 'DIRECT_SUPERVISION');

-- 2. Permission
CREATE TABLE "Permission" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- 3. RolePermission
CREATE TABLE "RolePermission" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Position (Jabatan)
CREATE TABLE "Position" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "roleId" UUID NOT NULL,
    "organizationLevel" VARCHAR(60),
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Position_code_key" ON "Position"("code");
CREATE INDEX "Position_roleId_isActive_idx" ON "Position"("roleId", "isActive");
ALTER TABLE "Position" ADD CONSTRAINT "Position_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. SupervisionAssignment
CREATE TABLE "SupervisionAssignment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "directorateAssignmentId" UUID NOT NULL,
    "targetRegionId" UUID NOT NULL,
    "supervisionType" "SupervisionType" NOT NULL DEFAULT 'BINDA_SUPERVISION',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupervisionAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SupervisionAssignment_directorateAssignmentId_targetRegionId_key" ON "SupervisionAssignment"("directorateAssignmentId", "targetRegionId");
CREATE INDEX "SupervisionAssignment_targetRegionId_supervisionType_idx" ON "SupervisionAssignment"("targetRegionId", "supervisionType");
ALTER TABLE "SupervisionAssignment" ADD CONSTRAINT "SupervisionAssignment_directorateAssignmentId_fkey" FOREIGN KEY ("directorateAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupervisionAssignment" ADD CONSTRAINT "SupervisionAssignment_targetRegionId_fkey" FOREIGN KEY ("targetRegionId") REFERENCES "AdministrativeArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6. OrganizationUnit
CREATE TABLE "OrganizationUnit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "type" VARCHAR(60) NOT NULL,
    "level" VARCHAR(60),
    "parentId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrganizationUnit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrganizationUnit_code_key" ON "OrganizationUnit"("code");
CREATE INDEX "OrganizationUnit_parentId_type_idx" ON "OrganizationUnit"("parentId", "type");
CREATE INDEX "OrganizationUnit_type_isActive_idx" ON "OrganizationUnit"("type", "isActive");
ALTER TABLE "OrganizationUnit" ADD CONSTRAINT "OrganizationUnit_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "OrganizationUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 7. UserOperationalAssignment.positionId
ALTER TABLE "UserOperationalAssignment" ADD COLUMN "positionId" UUID;
CREATE INDEX "UserOperationalAssignment_positionId_idx" ON "UserOperationalAssignment"("positionId");
ALTER TABLE "UserOperationalAssignment" ADD CONSTRAINT "UserOperationalAssignment_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;
