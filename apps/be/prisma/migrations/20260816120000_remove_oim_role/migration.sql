-- Remove OPERATIONAL_INTELLIGENCE_MANAGER as a standalone role.
--
-- OIM (Manajer Intelijen Operasional) is a position (analis), not an
-- organizational level. It is merged into the correct BIN command and
-- supervision structure:
--   - DIRECTORATE branch (analis under Ditwil)   -> REGIONAL_COMMANDER
--   - BINDA branch      (Kasubdit/Kabaops)       -> REGIONAL_COMMANDER
--
-- Data is reassigned BEFORE the enum value is removed so nothing is lost.

-- 1. Reassign operational assignments from the OIM role to the Kabinda role.
UPDATE "UserOperationalAssignment"
SET "roleId" = (SELECT "id" FROM "Role" WHERE "code" = 'REGIONAL_COMMANDER' LIMIT 1)
WHERE "roleId" = (SELECT "id" FROM "Role" WHERE "code" = 'OPERATIONAL_INTELLIGENCE_MANAGER' LIMIT 1);

-- 2. Update the coarse authorization role string on users.
UPDATE "user"
SET "role" = 'regional_commander'
WHERE "role" = 'operational_intelligence_manager';

-- 3. Drop OIM role-area policies (they are re-seeded under REGIONAL_COMMANDER).
DELETE FROM "RoleAreaPolicy"
WHERE "roleCode" = 'OPERATIONAL_INTELLIGENCE_MANAGER';

-- 4. Delete the OIM domain role row.
DELETE FROM "Role"
WHERE "code" = 'OPERATIONAL_INTELLIGENCE_MANAGER';

-- 5. Remove the enum value (Postgres requires recreating the type).
CREATE TYPE "RoleCode_new" AS ENUM (
  'ADMIN_SYSTEM',
  'EXECUTIVE',
  'REGIONAL_COMMANDER',
  'FIELD_COORDINATOR',
  'FIELD_OFFICER'
);

ALTER TABLE "Role"
  ALTER COLUMN "code" TYPE "RoleCode_new"
  USING ("code"::text::"RoleCode_new");

ALTER TABLE "RoleAreaPolicy"
  ALTER COLUMN "roleCode" TYPE "RoleCode_new"
  USING ("roleCode"::text::"RoleCode_new");

DROP TYPE "RoleCode";

ALTER TYPE "RoleCode_new" RENAME TO "RoleCode";
