import crypto from 'node:crypto';
import { AdministrativeLevel } from '../generated/prisma/client.js';
import { prisma } from '../modules/prisma/prisma.service.js';

type GeoJsonGeometry = {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: unknown[];
};

type DistrictFeature = {
  type: 'Feature';
  properties: {
    wadmkc?: string;
    wadmkk?: string;
  };
  geometry: GeoJsonGeometry;
};

type DistrictFeatureCollection = {
  type: 'FeatureCollection';
  features: DistrictFeature[];
};

const districtBoundaryUrl =
  'https://gis-dpmptsp.jakarta.go.id/arcgis/rest/services/Hosted/Batas_Administrasi_Kecamatan_Jakarta/FeatureServer/0/query?where=1%3D1&outFields=wadmkc%2Cwadmkk&outSR=4326&returnGeometry=true&f=geojson';

function stableUuid(value: string) {
  const hash = crypto
    .createHash('sha1')
    .update(value)
    .digest('hex')
    .slice(0, 32)
    .split('');
  hash[12] = '5';
  hash[16] = ((Number.parseInt(hash[16], 16) & 0x3) | 0x8).toString(16);

  return `${hash.slice(0, 8).join('')}-${hash.slice(8, 12).join('')}-${hash
    .slice(12, 16)
    .join('')}-${hash.slice(16, 20).join('')}-${hash.slice(20, 32).join('')}`;
}

function normalizeDistrictName(value: string) {
  const normalized = value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();

  return normalized.replace(/^KEPSERIBU/, 'KEPULAUANSERIBU');
}

function mergeGeometry(features: DistrictFeature[]): GeoJsonGeometry {
  const coordinates = features.flatMap((feature) =>
    feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates,
  );

  return {
    type: 'MultiPolygon',
    coordinates,
  };
}

async function seedJakartaDistrictBoundaries() {
  const response = await fetch(districtBoundaryUrl);

  if (!response.ok) {
    throw new Error(
      `Jakarta district boundary service returned HTTP ${response.status}.`,
    );
  }

  const collection = (await response.json()) as DistrictFeatureCollection;
  const featuresByDistrict = new Map<string, DistrictFeature[]>();

  for (const feature of collection.features) {
    const districtName = feature.properties.wadmkc?.trim();

    if (!districtName || !feature.geometry) {
      continue;
    }

    const key = normalizeDistrictName(districtName);
    const features = featuresByDistrict.get(key) ?? [];
    features.push(feature);
    featuresByDistrict.set(key, features);
  }

  const districts = await prisma.administrativeArea.findMany({
    where: {
      level: AdministrativeLevel.DISTRICT,
      officialCode: {
        startsWith: '31.',
      },
      deletedAt: null,
    },
    select: {
      id: true,
      officialCode: true,
      name: true,
    },
  });

  const districtByName = new Map(
    districts.map((district) => [
      normalizeDistrictName(district.name),
      district,
    ]),
  );
  const matchedDistrictIds = new Set<string>();

  for (const [districtName, features] of featuresByDistrict) {
    const district = districtByName.get(districtName);

    if (!district) {
      throw new Error(
        `No Jakarta district matches source name ${districtName}.`,
      );
    }

    const geometryJson = JSON.stringify(mergeGeometry(features));
    const geometryHash = crypto
      .createHash('sha256')
      .update(geometryJson)
      .digest('hex');
    const boundaryId = stableUuid(
      `boundary:${district.officialCode}:jakarta-feature-server:v1`,
    );

    await prisma.$executeRaw`
      WITH geometry AS (
        SELECT ST_Multi(
          ST_CollectionExtract(
            ST_MakeValid(
              ST_UnaryUnion(
                ST_Force2D(ST_SetSRID(ST_GeomFromGeoJSON(${geometryJson}), 4326))
              )
            ),
            3
          )
        ) AS boundary
      )
      INSERT INTO "AdministrativeAreaBoundary" (
        "id",
        "areaId",
        "versionNumber",
        "boundary",
        "centroid",
        "minLatitude",
        "minLongitude",
        "maxLatitude",
        "maxLongitude",
        "qualityStatus",
        "geometryHash",
        "effectiveFrom",
        "isActive",
        "createdAt",
        "updatedAt"
      )
      SELECT
        ${boundaryId}::uuid,
        ${district.id}::uuid,
        1,
        geometry.boundary,
        ST_PointOnSurface(geometry.boundary),
        ST_YMin(Box3D(geometry.boundary)),
        ST_XMin(Box3D(geometry.boundary)),
        ST_YMax(Box3D(geometry.boundary)),
        ST_XMax(Box3D(geometry.boundary)),
        'VERIFIED'::"BoundaryQualityStatus",
        ${geometryHash},
        TIMESTAMPTZ '2026-07-14 00:00:00+07',
        true,
        NOW(),
        NOW()
      FROM geometry
      ON CONFLICT ("areaId", "versionNumber") DO UPDATE SET
        "boundary" = EXCLUDED."boundary",
        "centroid" = EXCLUDED."centroid",
        "minLatitude" = EXCLUDED."minLatitude",
        "minLongitude" = EXCLUDED."minLongitude",
        "maxLatitude" = EXCLUDED."maxLatitude",
        "maxLongitude" = EXCLUDED."maxLongitude",
        "qualityStatus" = EXCLUDED."qualityStatus",
        "geometryHash" = EXCLUDED."geometryHash",
        "effectiveUntil" = NULL,
        "isActive" = true,
        "updatedAt" = NOW()
    `;

    await prisma.$executeRaw`
      UPDATE "AdministrativeArea" AS area
      SET
        "centroidLatitude" = ST_Y(boundary."centroid"),
        "centroidLongitude" = ST_X(boundary."centroid"),
        "updatedAt" = NOW()
      FROM "AdministrativeAreaBoundary" AS boundary
      WHERE area."id" = ${district.id}::uuid
        AND boundary."areaId" = area."id"
        AND boundary."versionNumber" = 1
    `;

    matchedDistrictIds.add(district.id);
  }

  if (matchedDistrictIds.size !== districts.length) {
    const missing = districts
      .filter((district) => !matchedDistrictIds.has(district.id))
      .map((district) => `${district.officialCode} ${district.name}`)
      .join(', ');
    throw new Error(`Jakarta district boundaries are incomplete: ${missing}.`);
  }

  console.log(
    `Seeded ${matchedDistrictIds.size} Jakarta district boundaries from ${collection.features.length} source features.`,
  );
}

void seedJakartaDistrictBoundaries()
  .catch((error: unknown) => {
    console.error('Failed to seed Jakarta district boundaries.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
