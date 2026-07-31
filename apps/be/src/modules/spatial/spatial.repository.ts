import { Injectable } from '@nestjs/common';
import {
  AdministrativeLevel,
  AreaResolutionMethod,
  Prisma,
  type BoundaryQualityStatus,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type SpatialAreaMatch = {
  areaId: string;
  areaCode: string;
  areaName: string;
  areaLevel: AdministrativeLevel;
  boundaryId: string;
  qualityStatus: BoundaryQualityStatus;
};

export type SpatialAreaResolution = {
  area: SpatialAreaMatch | null;
  method: AreaResolutionMethod;
  confidence: number | null;
  resolvedAt: Date | null;
};

const REPORT_AREA_LEVELS = [
  AdministrativeLevel.VILLAGE,
  AdministrativeLevel.URBAN_VILLAGE,
  AdministrativeLevel.DISTRICT,
  AdministrativeLevel.REGENCY,
  AdministrativeLevel.CITY,
  AdministrativeLevel.PROVINCE,
  AdministrativeLevel.COUNTRY,
] as const;

@Injectable()
export class SpatialRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findContainingAreas(
    latitude: number,
    longitude: number,
    levels?: readonly AdministrativeLevel[],
  ): Promise<SpatialAreaMatch[]> {
    const point = Prisma.sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)`;
    const levelFilter =
      levels && levels.length > 0
        ? Prisma.sql`AND area."level" IN (${Prisma.join(levels)})`
        : Prisma.empty;

    return this.prisma.$queryRaw<SpatialAreaMatch[]>(Prisma.sql`
      SELECT
        area."id" AS "areaId",
        area."code" AS "areaCode",
        area."name" AS "areaName",
        area."level" AS "areaLevel",
        boundary."id" AS "boundaryId",
        boundary."qualityStatus" AS "qualityStatus"
      FROM "AdministrativeAreaBoundary" AS boundary
      JOIN "AdministrativeArea" AS area
        ON area."id" = boundary."areaId"
      WHERE boundary."isActive" = true
        AND boundary."effectiveUntil" IS NULL
        AND boundary."qualityStatus" <> 'INVALID'
        AND ST_Covers(boundary."boundary", ${point})
        ${levelFilter}
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
        END ASC,
        area."name" ASC
    `);
  }

  async resolveReportArea(
    latitude: number,
    longitude: number,
  ): Promise<SpatialAreaResolution> {
    const area =
      (
        await this.findContainingAreas(latitude, longitude, REPORT_AREA_LEVELS)
      )[0] ?? null;

    return {
      area,
      method: area
        ? AreaResolutionMethod.POLYGON_MATCH
        : AreaResolutionMethod.UNRESOLVED,
      confidence: area ? 100 : null,
      resolvedAt: area ? new Date() : null,
    };
  }

  async getActiveBoundaryGeoJson(areaId: string, simplifyDegrees = 0) {
    const simplification = Math.max(0, simplifyDegrees);
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        areaId: string;
        versionNumber: number;
        qualityStatus: BoundaryQualityStatus;
        geometry: string;
      }>
    >(Prisma.sql`
      SELECT boundary."id", boundary."areaId", boundary."versionNumber",
        boundary."qualityStatus",
        ST_AsGeoJSON(
          CASE WHEN ${simplification}::double precision > 0::double precision
            THEN ST_SimplifyPreserveTopology(
              boundary."boundary",
              ${simplification}::double precision
            )
            ELSE boundary."boundary"
          END
        ) AS geometry
      FROM "AdministrativeAreaBoundary" boundary
      WHERE boundary."areaId" = ${areaId}
        AND boundary."isActive" = true
        AND boundary."effectiveUntil" IS NULL
        AND boundary."qualityStatus" <> 'INVALID'
      LIMIT 1
    `);
    const row = rows[0];
    return row
      ? { ...row, geometry: JSON.parse(row.geometry) as unknown }
      : null;
  }

  async findBoundariesInViewport(input: {
    minLongitude: number;
    minLatitude: number;
    maxLongitude: number;
    maxLatitude: number;
    level: AdministrativeLevel;
    limit: number;
  }) {
    const rows = await this.prisma.$queryRaw<
      Array<{ id: string; areaId: string; name: string; geometry: string }>
    >(Prisma.sql`
      SELECT boundary."id", area."id" AS "areaId", area."name",
        ST_AsGeoJSON(boundary."boundary") AS geometry
      FROM "AdministrativeAreaBoundary" boundary
      JOIN "AdministrativeArea" area ON area."id" = boundary."areaId"
      WHERE boundary."isActive" = true
        AND boundary."effectiveUntil" IS NULL
        AND boundary."qualityStatus" <> 'INVALID'
        AND area."level" = ${input.level}::"AdministrativeLevel"
        AND ST_Intersects(
          boundary."boundary",
          ST_MakeEnvelope(${input.minLongitude}, ${input.minLatitude}, ${input.maxLongitude}, ${input.maxLatitude}, 4326)
        )
      LIMIT ${input.limit}
    `);
    return rows.map((row) => ({
      type: 'Feature',
      id: row.id,
      geometry: JSON.parse(row.geometry) as unknown,
      properties: { areaId: row.areaId, name: row.name },
    }));
  }

  async isPointWithinActiveBoundary(
    areaId: string,
    latitude: number,
    longitude: number,
  ): Promise<boolean> {
    const point = Prisma.sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)`;
    const result = await this.prisma.$queryRaw<Array<{ matches: boolean }>>(
      Prisma.sql`
        SELECT EXISTS (
          SELECT 1
          FROM "AdministrativeAreaBoundary" AS boundary
          WHERE boundary."areaId" = ${areaId}
            AND boundary."isActive" = true
            AND boundary."effectiveUntil" IS NULL
            AND boundary."qualityStatus" <> 'INVALID'
            AND ST_Covers(boundary."boundary", ${point})
        ) AS "matches"
      `,
    );

    return result[0]?.matches ?? false;
  }
}
