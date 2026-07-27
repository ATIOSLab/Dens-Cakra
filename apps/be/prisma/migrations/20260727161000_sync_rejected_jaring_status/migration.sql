UPDATE "Jaring"
SET
  "status" = 'INACTIVE',
  "deactivatedAt" = COALESCE("deactivatedAt", NOW())
WHERE "registrationStatus" = 'REJECTED'
  AND "status" = 'ACTIVE';
