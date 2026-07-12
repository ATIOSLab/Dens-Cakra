import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AdministrativeLevel,
  BoundaryQualityStatus,
} from '../generated/prisma/client.js';
import { prisma } from '../modules/prisma/prisma.service.js';

type AreaRow = {
  id: string;
  code: string;
  officialCode: string;
  name: string;
  level: AdministrativeLevel;
  parentId: string | null;
};

type BoundarySeedRow = {
  code: string;
  lat: number | null;
  lng: number | null;
  pathText: string | null;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..', '..', '..', '..');
const wilayahHierarchyPath = path.join(
  repoRoot,
  'apps',
  'wilayah',
  'db',
  'wilayah.sql',
);
const wilayahBoundaryPath = path.join(
  repoRoot,
  'apps',
  'wilayah',
  'db',
  'wilayah_level_1_2.sql',
);

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

function decodeSqlString(value: string) {
  const trimmed = value.trim();

  if (!trimmed.startsWith("'") || !trimmed.endsWith("'")) {
    return trimmed;
  }

  return trimmed.slice(1, -1).replace(/''/g, "'");
}

function splitTupleValues(tuple: string) {
  const values: string[] = [];
  let current = '';
  let inQuote = false;

  for (let index = 0; index < tuple.length; index += 1) {
    const char = tuple[index];
    const next = tuple[index + 1];

    if (char === "'") {
      current += char;

      if (inQuote && next === "'") {
        current += next;
        index += 1;
        continue;
      }

      inQuote = !inQuote;
      continue;
    }

    if (char === ',' && !inQuote) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.length > 0) {
    values.push(current.trim());
  }

  return values;
}

function parseInsertTuples(sql: string, tableName: string) {
  const tuples: string[][] = [];
  const insertRegex = new RegExp(
    `INSERT INTO\\s+\`?${tableName}\`?.*?VALUES\\s*([\\s\\S]*?);`,
    'g',
  );

  for (const match of sql.matchAll(insertRegex)) {
    const valuesBlock = match[1];
    let start = -1;
    let depth = 0;
    let inQuote = false;

    for (let index = 0; index < valuesBlock.length; index += 1) {
      const char = valuesBlock[index];
      const next = valuesBlock[index + 1];

      if (char === "'") {
        if (inQuote && next === "'") {
          index += 1;
          continue;
        }

        inQuote = !inQuote;
        continue;
      }

      if (inQuote) {
        continue;
      }

      if (char === '(') {
        if (depth === 0) {
          start = index + 1;
        }

        depth += 1;
        continue;
      }

      if (char === ')') {
        depth -= 1;

        if (depth === 0 && start >= 0) {
          tuples.push(splitTupleValues(valuesBlock.slice(start, index)));
          start = -1;
        }
      }
    }
  }

  return tuples;
}

function determineAreaLevel(code: string, name: string) {
  const segments = code.split('.');

  if (segments.length === 1) {
    return AdministrativeLevel.PROVINCE;
  }

  if (segments.length === 2) {
    return name.startsWith('Kabupaten') || name.startsWith('Kab.')
      ? AdministrativeLevel.REGENCY
      : AdministrativeLevel.CITY;
  }

  if (segments.length === 3) {
    return AdministrativeLevel.DISTRICT;
  }

  if (segments.length === 4) {
    const suffix = segments[3] ?? '';

    if (suffix.startsWith('1')) {
      return AdministrativeLevel.URBAN_VILLAGE;
    }

    return AdministrativeLevel.VILLAGE;
  }

  return null;
}

function parseHierarchyRows(rootCountryId: string) {
  const sql = fs.readFileSync(wilayahHierarchyPath, 'utf8');
  const tupleRegex = /\('((?:[^']|'')*)','((?:[^']|'')*)'\)/g;
  const areasByLevel = new Map<number, AreaRow[]>();

  for (const match of sql.matchAll(tupleRegex)) {
    const code = match[1].replace(/''/g, "'");
    const name = match[2].replace(/''/g, "'");
    const level = determineAreaLevel(code, name);

    if (!level) {
      continue;
    }

    const segments = code.split('.');
    const parentCode =
      segments.length === 1
        ? null
        : segments.slice(0, segments.length - 1).join('.');
    const parentId = parentCode
      ? stableUuid(`area:${parentCode}`)
      : rootCountryId;
    const row: AreaRow = {
      id: stableUuid(`area:${code}`),
      code,
      officialCode: code,
      name,
      level,
      parentId,
    };

    const bucket = areasByLevel.get(segments.length) ?? [];
    bucket.push(row);
    areasByLevel.set(segments.length, bucket);
  }

  return areasByLevel;
}

function parseBoundaryRows() {
  const sql = fs.readFileSync(wilayahBoundaryPath, 'utf8');
  const tuples = parseInsertTuples(sql, 'wilayah_level_1_2');

  return tuples.map((values) => {
    const pathValue = values[9];

    return {
      code: decodeSqlString(values[0]),
      lat: values[3] === 'NULL' ? null : Number(values[3]),
      lng: values[4] === 'NULL' ? null : Number(values[4]),
      pathText:
        !pathValue || pathValue === 'NULL' ? null : decodeSqlString(pathValue),
    } satisfies BoundarySeedRow;
  });
}

function normalizePolygons(parsedPath: unknown) {
  if (!Array.isArray(parsedPath) || parsedPath.length === 0) {
    return [] as number[][][];
  }

  if (
    Array.isArray(parsedPath[0]) &&
    Array.isArray(parsedPath[0][0]) &&
    Array.isArray(parsedPath[0][0][0])
  ) {
    return (parsedPath as number[][][][]).map((polygon) => polygon[0] ?? []);
  }

  return parsedPath as number[][][];
}

function buildBoundaryGeometry(pathText: string) {
  let parsedPath: unknown;

  try {
    parsedPath = JSON.parse(pathText);
  } catch {
    return null;
  }

  const polygons = normalizePolygons(parsedPath);

  if (polygons.length === 0) {
    return null;
  }

  let minLat = Number.POSITIVE_INFINITY;
  let minLng = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;

  const polygonWkts = polygons
    .map((polygon) => {
      const ring = polygon
        .filter(
          (point): point is number[] =>
            Array.isArray(point) &&
            point.length >= 2 &&
            Number.isFinite(point[0]) &&
            Number.isFinite(point[1]),
        )
        .map(([lat, lng]) => {
          minLat = Math.min(minLat, lat);
          minLng = Math.min(minLng, lng);
          maxLat = Math.max(maxLat, lat);
          maxLng = Math.max(maxLng, lng);

          return `${lng} ${lat}`;
        });

      const uniqueRingPoints = new Set(ring);

      if (uniqueRingPoints.size < 3) {
        return null;
      }

      if (ring.length > 0 && ring[0] !== ring[ring.length - 1]) {
        ring.push(ring[0]);
      }

      return `((${ring.join(', ')}))`;
    })
    .filter((value): value is string => value !== null);

  if (polygonWkts.length === 0) {
    return null;
  }

  const wkt = `MULTIPOLYGON(${polygonWkts.join(', ')})`;
  const geometryHash = crypto.createHash('sha256').update(wkt).digest('hex');

  return {
    wkt,
    geometryHash,
    minLat,
    minLng,
    maxLat,
    maxLng,
  };
}

async function createAreaBatches(rows: AreaRow[]) {
  const chunkSize = 2000;

  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);

    await prisma.administrativeArea.createMany({
      data: chunk,
      skipDuplicates: true,
    });
  }
}

async function seedAdministrativeAreas(
  rootCountryId: string,
  areasByLevel: Map<number, AreaRow[]>,
) {
  const levelOrder = [1, 2, 3, 4];

  for (const depth of levelOrder) {
    const rows = areasByLevel.get(depth) ?? [];
    await createAreaBatches(rows);
  }

  const closureRows: {
    ancestorId: string;
    descendantId: string;
    depth: number;
  }[] = [];

  for (const depth of levelOrder) {
    for (const row of areasByLevel.get(depth) ?? []) {
      closureRows.push({
        ancestorId: row.id,
        descendantId: row.id,
        depth: 0,
      });

      let currentParentId = row.parentId;
      let currentDepth = 1;

      while (currentParentId) {
        closureRows.push({
          ancestorId: currentParentId,
          descendantId: row.id,
          depth: currentDepth,
        });

        if (currentParentId === rootCountryId) {
          break;
        }

        currentParentId = closureParentIdFromStableId(currentParentId);
        currentDepth += 1;
      }
    }
  }

  const chunkSize = 5000;

  for (let index = 0; index < closureRows.length; index += chunkSize) {
    await prisma.administrativeAreaClosure.createMany({
      data: closureRows.slice(index, index + chunkSize),
      skipDuplicates: true,
    });
  }
}

function closureParentIdFromStableId(areaId: string) {
  return nullIfUndefined(areaIdToParentId.get(areaId));
}

function nullIfUndefined<T>(value: T | undefined) {
  return value ?? null;
}

const areaIdToParentId = new Map<string, string | null>();

async function seedLevel12BoundaryData() {
  const rows = parseBoundaryRows();
  const dataSourceId = stableUuid('area-data-source:level-1-2-2025');

  await prisma.administrativeAreaDataSource.upsert({
    where: {
      id: dataSourceId,
    },
    update: {
      name: 'Kemendagri Wilayah Level 1-2 2025',
      sourceType: 'SQL_IMPORT',
      versionLabel: '2025',
      referenceUrl: 'apps/wilayah/db/wilayah_level_1_2.sql',
      effectiveDate: new Date('2025-01-01T00:00:00.000Z'),
      notes:
        'Seeded from wilayah_level_1_2.sql. Coordinate pairs are converted from [lat, lng] to [lng, lat] for PostGIS.',
    },
    create: {
      id: dataSourceId,
      name: 'Kemendagri Wilayah Level 1-2 2025',
      sourceType: 'SQL_IMPORT',
      versionLabel: '2025',
      referenceUrl: 'apps/wilayah/db/wilayah_level_1_2.sql',
      effectiveDate: new Date('2025-01-01T00:00:00.000Z'),
      notes:
        'Seeded from wilayah_level_1_2.sql. Coordinate pairs are converted from [lat, lng] to [lng, lat] for PostGIS.',
    },
  });

  for (const row of rows) {
    const areaId = stableUuid(`area:${row.code}`);

    await prisma.administrativeArea.updateMany({
      where: {
        id: areaId,
      },
      data: {
        centroidLatitude: row.lat?.toString(),
        centroidLongitude: row.lng?.toString(),
      },
    });

    if (!row.pathText) {
      continue;
    }

    const geometry = buildBoundaryGeometry(row.pathText);

    if (!geometry) {
      continue;
    }

    await prisma.$executeRaw`
      INSERT INTO "AdministrativeAreaBoundary" (
        "id",
        "areaId",
        "dataSourceId",
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
      VALUES (
        ${stableUuid(`boundary:${row.code}:v1`)},
        ${areaId},
        ${dataSourceId},
        ${1},
        ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_GeomFromText(${geometry.wkt}, 4326)), 3)),
        CASE
          WHEN ${row.lng}::double precision IS NULL OR ${row.lat}::double precision IS NULL THEN NULL
          ELSE ST_SetSRID(ST_MakePoint(${row.lng}, ${row.lat}), 4326)
        END,
        ${geometry.minLat.toString()},
        ${geometry.minLng.toString()},
        ${geometry.maxLat.toString()},
        ${geometry.maxLng.toString()},
        ${BoundaryQualityStatus.VERIFIED}::"BoundaryQualityStatus",
        ${geometry.geometryHash},
        ${new Date('2025-01-01T00:00:00.000Z')},
        ${true},
        NOW(),
        NOW()
      )
      ON CONFLICT ("areaId", "versionNumber")
      DO UPDATE SET
        "dataSourceId" = EXCLUDED."dataSourceId",
        "boundary" = EXCLUDED."boundary",
        "centroid" = EXCLUDED."centroid",
        "minLatitude" = EXCLUDED."minLatitude",
        "minLongitude" = EXCLUDED."minLongitude",
        "maxLatitude" = EXCLUDED."maxLatitude",
        "maxLongitude" = EXCLUDED."maxLongitude",
        "qualityStatus" = EXCLUDED."qualityStatus",
        "geometryHash" = EXCLUDED."geometryHash",
        "effectiveFrom" = EXCLUDED."effectiveFrom",
        "isActive" = EXCLUDED."isActive",
        "updatedAt" = NOW()
    `;
  }
}

async function seedWilayah() {
  const rootCountry = await prisma.administrativeArea.findUniqueOrThrow({
    where: {
      officialCode: 'IDN',
    },
    select: {
      id: true,
    },
  });

  const areasByLevel = parseHierarchyRows(rootCountry.id);

  for (const rows of areasByLevel.values()) {
    for (const row of rows) {
      areaIdToParentId.set(row.id, row.parentId);
    }
  }

  await seedAdministrativeAreas(rootCountry.id, areasByLevel);
  await seedLevel12BoundaryData();

  const totalAreaCount = [...areasByLevel.values()].reduce(
    (sum, rows) => sum + rows.length,
    0,
  );

  console.log(
    `Seeded wilayah hierarchy (${totalAreaCount} areas) and level 1-2 boundaries.`,
  );
}

void seedWilayah()
  .catch((error: unknown) => {
    console.error('Failed to seed wilayah data.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
