import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type AdministrativeLevel,
  type AreaResolutionMethod,
  type CoordinateSource,
  type RoleCode,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type MarkerCoordinate = {
  id: string;
  latitude: number;
  longitude: number;
};

export type MatchedAdministrativeArea = {
  id: string;
  code: string;
  name: string;
  level: AdministrativeLevel;
  boundaryQualityStatus: string | null;
};

export type LatestPersonnelLocation = {
  pingId: string;
  assignmentId: string;
  userProfileId: string;
  userName: string;
  positionTitle: string;
  positionCode: RoleCode;
  unitId: string;
  unitName: string;
  latitude: number;
  longitude: number;
  gpsAccuracyMeters: number | null;
  coordinateSource: CoordinateSource;
  areaResolutionMethod: AreaResolutionMethod;
  capturedAt: Date;
};

@Injectable()
export class MapMarkersSpatialRepository {
  constructor(private readonly prisma: PrismaService) {}

  async matchCoordinates(
    coordinates: MarkerCoordinate[],
  ): Promise<Map<string, MatchedAdministrativeArea[]>> {
    if (coordinates.length === 0) return new Map();

    const rows = await this.prisma.$queryRaw<
      Array<{ markerId: string; areas: MatchedAdministrativeArea[] }>
    >(Prisma.sql`
      WITH points AS (
        SELECT
          point."id" AS "markerId",
          ST_SetSRID(
            ST_MakePoint(point."longitude", point."latitude"),
            4326
          ) AS geometry
        FROM jsonb_to_recordset(${JSON.stringify(coordinates)}::jsonb)
          AS point("id" text, "latitude" double precision, "longitude" double precision)
      )
      SELECT
        points."markerId",
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', area."id",
              'code', area."code",
              'name', area."name",
              'level', area."level",
              'boundaryQualityStatus', boundary."qualityStatus"
            )
            ORDER BY CASE area."level"
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
            END
          ) FILTER (WHERE area."id" IS NOT NULL),
          '[]'::jsonb
        ) AS areas
      FROM points
      LEFT JOIN "AdministrativeAreaBoundary" boundary
        ON boundary."isActive" = true
        AND boundary."effectiveUntil" IS NULL
        AND boundary."qualityStatus" <> 'INVALID'
        AND ST_Covers(boundary."boundary", points.geometry)
      LEFT JOIN "AdministrativeArea" area
        ON area."id" = boundary."areaId"
        AND area."isActive" = true
        AND area."deletedAt" IS NULL
      GROUP BY points."markerId"
    `);

    return new Map(rows.map((row) => [row.markerId, row.areas]));
  }

  async findLatestPersonnelLocations(input: {
    assignmentIds: string[];
    unitIds?: string[];
    capturedAfter: Date;
  }): Promise<LatestPersonnelLocation[]> {
    if (input.assignmentIds.length === 0) return [];
    const unitFilter = input.unitIds?.length
      ? Prisma.sql`AND primary_scope."areaId" IN (${Prisma.join(input.unitIds)})`
      : Prisma.empty;

    return this.prisma.$queryRaw<LatestPersonnelLocation[]>(Prisma.sql`
      SELECT DISTINCT ON (ping."operationalAssignmentId")
        ping."id" AS "pingId",
        assignment."id" AS "assignmentId",
        profile."id" AS "userProfileId",
        profile."fullName" AS "userName",
        role."name" AS "positionTitle",
        role."code" AS "positionCode",
        primary_scope."areaId" AS "unitId",
        COALESCE(area."name", assignment."branch"::text) AS "unitName",
        ping."latitude"::double precision AS latitude,
        ping."longitude"::double precision AS longitude,
        ping."gpsAccuracyMeters"::double precision AS "gpsAccuracyMeters",
        ping."coordinateSource",
        ping."areaResolutionMethod",
        ping."capturedAt"
      FROM "PersonnelLocationPing" ping
      JOIN "UserOperationalAssignment" assignment
        ON assignment."id" = ping."operationalAssignmentId"
      JOIN "user_profile" profile ON profile."id" = assignment."userProfileId"
      JOIN "Role" role ON role."id" = assignment."roleId"
      LEFT JOIN LATERAL (
        SELECT scope."areaId"
        FROM "UserAreaScope" scope
        WHERE scope."operationalAssignmentId" = assignment."id"
          AND scope."validUntil" IS NULL
        ORDER BY scope."isPrimary" DESC, scope."createdAt" ASC
        LIMIT 1
      ) primary_scope ON true
      LEFT JOIN "AdministrativeArea" area ON area."id" = primary_scope."areaId"
      WHERE ping."operationalAssignmentId" IN (${Prisma.join(input.assignmentIds)})
        AND ping."isStealth" = false
        AND ping."capturedAt" >= ${input.capturedAfter}
        ${unitFilter}
      ORDER BY
        ping."operationalAssignmentId",
        ping."capturedAt" DESC,
        ping."id" DESC
    `);
  }
}
