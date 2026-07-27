UPDATE "Jaring"
SET
  "status" = 'INACTIVE',
  "deactivatedAt" = COALESCE("deactivatedAt", NOW())
WHERE "registrationStatus" <> 'APPROVED'
  AND "status" = 'ACTIVE';

DELETE FROM "JaringAreaCoverage"
WHERE "id" IN (
  SELECT "id"
  FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "jaringId"
        ORDER BY "isPrimary" DESC, "validFrom" ASC, "id" ASC
      ) AS rn
    FROM "JaringAreaCoverage"
  ) ranked
  WHERE ranked.rn > 1
);

UPDATE "JaringAreaCoverage"
SET "isPrimary" = TRUE
WHERE "id" IN (
  SELECT "id"
  FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "jaringId"
        ORDER BY "isPrimary" DESC, "validFrom" ASC, "id" ASC
      ) AS rn
    FROM "JaringAreaCoverage"
  ) ranked
  WHERE ranked.rn = 1
);
