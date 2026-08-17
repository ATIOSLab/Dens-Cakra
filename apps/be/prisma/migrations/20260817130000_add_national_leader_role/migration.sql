-- Add NATIONAL_LEADER as the top command-level role (Kepala BIN / KaBIN).
-- KaBIN sits above Deputi II in the command hierarchy and covers the whole
-- national scope (BIN Pusat / PUSAT branch).

-- 1. Add the enum value (Postgres ADD VALUE is safe for new values).
ALTER TYPE "RoleCode" ADD VALUE 'NATIONAL_LEADER';

-- 2. Insert the Role catalog row (idempotent by unique code).
INSERT INTO "Role" ("id", "code", "name", "description", "isActive", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  'NATIONAL_LEADER',
  'Kepala BIN (KaBIN)',
  'Pimpinan tertinggi BIN yang melihat dan mengendalikan seluruh cakupan nasional.',
  true,
  now(),
  now()
WHERE NOT EXISTS (SELECT 1 FROM "Role" WHERE "code" = 'NATIONAL_LEADER');
