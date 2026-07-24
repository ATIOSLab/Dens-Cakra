WITH RECURSIVE area_hierarchy AS (
  SELECT
    area."id" AS "descendantId",
    area."id" AS "ancestorId",
    0 AS "depth"
  FROM "AdministrativeArea" area

  UNION ALL

  SELECT
    child_hierarchy."descendantId",
    parent."id" AS "ancestorId",
    child_hierarchy."depth" + 1 AS "depth"
  FROM area_hierarchy child_hierarchy
  JOIN "AdministrativeArea" child ON child."id" = child_hierarchy."ancestorId"
  JOIN "AdministrativeArea" parent ON parent."id" = child."parentId"
)
INSERT INTO "AdministrativeAreaClosure" ("ancestorId", "descendantId", "depth")
SELECT
  "ancestorId",
  "descendantId",
  "depth"
FROM area_hierarchy
ON CONFLICT ("ancestorId", "descendantId") DO NOTHING;
