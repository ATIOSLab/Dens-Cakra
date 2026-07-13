import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { BoundaryQualityStatus, Prisma } from '../generated/prisma/client.js';
import { prisma } from '../modules/prisma/prisma.service.js';

type BoundarySeedRow = {
  code: string;
  name: string;
  lat: number | null;
  lng: number | null;
  pathText: string | null;
};

type ImportOptions = {
  provinceCodes: string[];
  sourceDir: string | null;
};

const sourceCommit = 'a386adb9ae54245935b2ef2c8351e14a74852cad';
const sourceRepository = 'https://github.com/cahyadsn/wilayah_boundaries';
const rawSourceBase = `https://raw.githubusercontent.com/cahyadsn/wilayah_boundaries/${sourceCommit}`;

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

function parseInsertTuples(sql: string) {
  const tuples: string[][] = [];
  const insertRegex =
    /INSERT INTO\s+`?wilayah_boundaries`?.*?VALUES\s*([\s\S]*?);/g;

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

function parseBoundaryRows(sql: string) {
  return parseInsertTuples(sql).map((values) => ({
    code: decodeSqlString(values[0] ?? ''),
    name: decodeSqlString(values[1] ?? ''),
    lat: !values[2] || values[2] === 'NULL' ? null : Number(values[2]),
    lng: !values[3] || values[3] === 'NULL' ? null : Number(values[3]),
    pathText:
      !values[4] || values[4] === 'NULL' ? null : decodeSqlString(values[4]),
  }));
}

function normalizePolygons(parsedPath: unknown) {
  if (!Array.isArray(parsedPath) || parsedPath.length === 0) {
    return [] as number[][][];
  }

  if (Array.isArray(parsedPath[0]) && typeof parsedPath[0][0] === 'number') {
    return [parsedPath as number[][]];
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

      if (new Set(ring).size < 3) {
        return null;
      }

      if (ring[0] !== ring[ring.length - 1]) {
        ring.push(ring[0]);
      }

      return `((${ring.join(', ')}))`;
    })
    .filter((value): value is string => value !== null);

  if (polygonWkts.length === 0) {
    return null;
  }

  const wkt = `MULTIPOLYGON(${polygonWkts.join(', ')})`;

  return {
    wkt,
    geometryHash: crypto.createHash('sha256').update(wkt).digest('hex'),
    minLat,
    minLng,
    maxLat,
    maxLng,
  };
}

function readOption(name: string) {
  const exactPrefix = `--${name}=`;
  const inline = process.argv.find((argument) =>
    argument.startsWith(exactPrefix),
  );

  if (inline) {
    return inline.slice(exactPrefix.length);
  }

  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function parseOptions(): ImportOptions {
  const provinceInput = readOption('province');
  const sourceDirInput = readOption('source-dir');

  return {
    provinceCodes: provinceInput
      ? provinceInput
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      : [],
    sourceDir: sourceDirInput ? path.resolve(sourceDirInput) : null,
  };
}

async function loadSourceFile(relativePath: string, sourceDir: string | null) {
  if (sourceDir) {
    const filePath = path.join(sourceDir, relativePath);
    return fs.readFileSync(filePath, 'utf8');
  }

  const response = await fetch(`${rawSourceBase}/${relativePath}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Gagal mengambil ${relativePath}: ${response.status} ${response.statusText}`,
    );
  }

  return response.text();
}

async function upsertBoundary(row: BoundarySeedRow, dataSourceId: string) {
  if (!row.pathText) {
    return 0;
  }

  const geometry = buildBoundaryGeometry(row.pathText);

  if (!geometry) {
    return 0;
  }

  return prisma.$executeRaw(Prisma.sql`
    WITH updated_area AS (
      UPDATE "AdministrativeArea"
      SET
        "centroidLatitude" = ${row.lat?.toString() ?? null},
        "centroidLongitude" = ${row.lng?.toString() ?? null},
        "updatedAt" = NOW()
      WHERE "officialCode" = ${row.code}
      RETURNING "id"
    )
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
      "simplificationToleranceMeters",
      "geometryHash",
      "effectiveFrom",
      "isActive",
      "createdAt",
      "updatedAt"
    )
    SELECT
      ${stableUuid(`boundary:${row.code}:v1`)},
      updated_area."id",
      ${dataSourceId},
      1,
      ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_GeomFromText(${geometry.wkt}, 4326)), 3)),
      CASE
        WHEN ${row.lng}::double precision IS NULL OR ${row.lat}::double precision IS NULL THEN NULL
        ELSE ST_SetSRID(ST_MakePoint(${row.lng}, ${row.lat}), 4326)
      END,
      ${geometry.minLat.toString()},
      ${geometry.minLng.toString()},
      ${geometry.maxLat.toString()},
      ${geometry.maxLng.toString()},
      ${BoundaryQualityStatus.SIMPLIFIED}::"BoundaryQualityStatus",
      NULL,
      ${geometry.geometryHash},
      ${new Date('2025-06-23T00:00:00.000Z')},
      true,
      NOW(),
      NOW()
    FROM updated_area
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
      "simplificationToleranceMeters" = EXCLUDED."simplificationToleranceMeters",
      "geometryHash" = EXCLUDED."geometryHash",
      "effectiveFrom" = EXCLUDED."effectiveFrom",
      "effectiveUntil" = NULL,
      "isActive" = true,
      "updatedAt" = NOW()
  `);
}

async function importRows(rows: BoundarySeedRow[], dataSourceId: string) {
  const validRows = rows.filter((row) => row.code && row.pathText);
  const chunkSize = 25;
  let imported = 0;

  for (let index = 0; index < validRows.length; index += chunkSize) {
    const chunk = validRows.slice(index, index + chunkSize);
    const results = await Promise.all(
      chunk.map((row) => upsertBoundary(row, dataSourceId)),
    );
    imported += results.reduce((sum, count) => sum + count, 0);
  }

  return imported;
}

async function seedWilayahBoundaries() {
  const options = parseOptions();
  const provinces = await prisma.administrativeArea.findMany({
    where: {
      level: 'PROVINCE',
      officialCode:
        options.provinceCodes.length > 0
          ? { in: options.provinceCodes }
          : { not: null },
    },
    select: { officialCode: true, name: true },
    orderBy: { officialCode: 'asc' },
  });

  if (provinces.length === 0) {
    throw new Error('Kode provinsi tidak ditemukan di AdministrativeArea.');
  }

  const dataSourceId = stableUuid(
    `area-data-source:wilayah-boundaries:${sourceCommit}`,
  );
  await prisma.administrativeAreaDataSource.upsert({
    where: { id: dataSourceId },
    update: {
      name: 'Wilayah Boundaries Kecamatan dan Desa/Kelurahan 2025',
      sourceType: 'SQL_IMPORT',
      referenceUrl: sourceRepository,
      versionLabel: sourceCommit,
      effectiveDate: new Date('2025-06-23T00:00:00.000Z'),
      notes:
        'Polygon simplified dari cahyadsn/wilayah_boundaries. Koordinat sumber [lat, lng] dikonversi menjadi [lng, lat] untuk PostGIS.',
    },
    create: {
      id: dataSourceId,
      name: 'Wilayah Boundaries Kecamatan dan Desa/Kelurahan 2025',
      sourceType: 'SQL_IMPORT',
      referenceUrl: sourceRepository,
      versionLabel: sourceCommit,
      effectiveDate: new Date('2025-06-23T00:00:00.000Z'),
      notes:
        'Polygon simplified dari cahyadsn/wilayah_boundaries. Koordinat sumber [lat, lng] dikonversi menjadi [lng, lat] untuk PostGIS.',
    },
  });

  let importedTotal = 0;

  for (const province of provinces) {
    const provinceCode = province.officialCode!;
    const levelTwoAreas = await prisma.administrativeArea.findMany({
      where: {
        officialCode: { startsWith: `${provinceCode}.` },
        level: { in: ['REGENCY', 'CITY'] },
      },
      select: { officialCode: true },
      orderBy: { officialCode: 'asc' },
    });
    const relativePaths = [
      `db/kec/wilayah_boundaries_kec_${provinceCode}.sql`,
      ...levelTwoAreas.map(
        (area) =>
          `db/kel/${provinceCode}/wilayah_boundaries_kel_${area.officialCode}.sql`,
      ),
    ];
    let provinceImported = 0;

    for (const relativePath of relativePaths) {
      const sql = await loadSourceFile(relativePath, options.sourceDir);

      if (!sql) {
        console.warn(`Sumber batas tidak tersedia: ${relativePath}`);
        continue;
      }

      provinceImported += await importRows(
        parseBoundaryRows(sql),
        dataSourceId,
      );
    }

    importedTotal += provinceImported;
    console.log(
      `Imported ${provinceImported} batas kecamatan/desa untuk ${provinceCode} ${province.name}.`,
    );
  }

  console.log(`Imported ${importedTotal} batas wilayah tingkat 3-4.`);
}

void seedWilayahBoundaries()
  .catch((error: unknown) => {
    console.error('Failed to seed kecamatan/desa boundaries.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
