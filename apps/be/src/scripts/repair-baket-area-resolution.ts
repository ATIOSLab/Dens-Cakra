import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../modules/prisma/prisma.service.js';

async function repairBaketAreaResolution() {
  const updated = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    WITH resolved AS (
      SELECT
        version."id" AS "versionId",
        match."areaId"
      FROM "BaketVersion" AS version
      JOIN LATERAL (
        SELECT area."id" AS "areaId"
        FROM "AdministrativeAreaBoundary" AS boundary
        JOIN "AdministrativeArea" AS area
          ON area."id" = boundary."areaId"
        WHERE boundary."isActive" = true
          AND boundary."effectiveUntil" IS NULL
          AND boundary."qualityStatus" <> 'INVALID'
          AND ST_Covers(
            boundary."boundary",
            ST_SetSRID(
              ST_MakePoint(
                version."longitude"::double precision,
                version."latitude"::double precision
              ),
              4326
            )
          )
        ORDER BY
          CASE area."level"
            WHEN 'RT' THEN 1
            WHEN 'RW' THEN 2
            WHEN 'VILLAGE' THEN 3
            WHEN 'URBAN_VILLAGE' THEN 3
            WHEN 'DISTRICT' THEN 4
            WHEN 'REGENCY' THEN 5
            WHEN 'CITY' THEN 5
            WHEN 'PROVINCE' THEN 6
            WHEN 'COUNTRY' THEN 7
            ELSE 99
          END,
          area."name"
        LIMIT 1
      ) AS match ON true
      WHERE version."latitude" IS NOT NULL
        AND version."longitude" IS NOT NULL
        AND (
          version."eventAreaId" IS DISTINCT FROM match."areaId"
          OR version."areaResolutionMethod" IS DISTINCT FROM 'POLYGON_MATCH'::"AreaResolutionMethod"
          OR version."areaResolutionConfidence" IS DISTINCT FROM 100
        )
    )
    UPDATE "BaketVersion" AS version
    SET
      "eventAreaId" = resolved."areaId",
      "areaResolutionMethod" = 'POLYGON_MATCH',
      "areaResolutionConfidence" = 100,
      "areaResolvedAt" = NOW()
    FROM resolved
    WHERE version."id" = resolved."versionId"
    RETURNING version."id"
  `);

  console.log(
    `Resolved administrative areas for ${updated.length} Baket versions.`,
  );
}

void repairBaketAreaResolution()
  .catch((error: unknown) => {
    console.error('Failed to repair Baket administrative areas.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
