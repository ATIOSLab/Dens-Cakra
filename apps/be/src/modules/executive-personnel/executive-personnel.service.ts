import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PositionCode,
  Prisma,
  RoleCode,
  UserProfileStatus,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  ExecutivePersonnelListQuery,
  ExecutivePersonnelMapQuery,
} from './executive-personnel.dto.js';

type ActiveAssignment = Awaited<
  ReturnType<ExecutivePersonnelService['findActiveAssignmentsForProfiles']>
>[number];

type LatestPing = Awaited<
  ReturnType<ExecutivePersonnelService['latestLocationPings']>
>[number];

const LOCATION_LEGEND = [
  {
    code: 'ON',
    status: 'LIVE',
    label: 'Live',
    description: 'Ping lokasi masuk dalam ambang aktif.',
    color: '#22c55e',
  },
  {
    code: 'RC',
    status: 'RECENT',
    label: 'Recent',
    description: 'Ping lokasi masih dalam 24 jam terakhir.',
    color: '#38bdf8',
  },
  {
    code: 'ST',
    status: 'STALE',
    label: 'Stale',
    description: 'Lokasi terakhir sudah melewati 24 jam.',
    color: '#f59e0b',
  },
  {
    code: 'NS',
    status: 'NO_SIGNAL',
    label: 'No signal',
    description: 'Belum ada ping, marker memakai centroid wilayah tugas.',
    color: '#94a3b8',
  },
] as const;

@Injectable()
export class ExecutivePersonnelService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ExecutivePersonnelListQuery) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const where = this.buildProfileWhere(query);
    const [total, profiles] = await Promise.all([
      this.prisma.userProfile.count({ where }),
      this.prisma.userProfile.findMany({
        where,
        include: {
          authUser: {
            select: { id: true, email: true, name: true, role: true, banned: true },
          },
        },
        orderBy: [{ fullName: 'asc' }, { username: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    const profileIds = profiles.map((profile) => profile.id);
    const assignments = await this.findActiveAssignmentsForProfiles(profileIds);
    const assignmentByProfile = new Map(
      assignments.map((assignment) => [assignment.userProfileId, assignment]),
    );
    const assignmentIds = assignments.map((assignment) => assignment.id);
    const [latestPings, reportCounts] = await Promise.all([
      this.latestLocationPings(assignmentIds),
      this.reportCountsByAssignment(assignmentIds),
    ]);
    const pingByAssignment = new Map(
      latestPings.map((ping) => [ping.positionAssignmentId, ping]),
    );

    return {
      items: profiles.map((profile) => {
        const assignment = assignmentByProfile.get(profile.id) ?? null;
        const ping = assignment ? (pingByAssignment.get(assignment.id) ?? null) : null;
        return {
          id: profile.id,
          username: profile.username,
          fullName: profile.fullName ?? profile.authUser.name,
          email: profile.authUser.email,
          phone: profile.phone,
          status: profile.status,
          isActive: profile.isActive,
          authRole: profile.authUser.role,
          authBanned: profile.authUser.banned,
          lastLoginAt: profile.lastLoginAt,
          assignment: assignment ? this.assignmentSummary(assignment) : null,
          lastLocation: ping ? this.locationSummary(ping) : null,
          reportCount: assignment ? (reportCounts.get(assignment.id) ?? 0) : 0,
        };
      }),
      meta: {
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
        facets: {
          statuses: Object.values(UserProfileStatus),
          roleCodes: Object.values(RoleCode),
        },
      },
    };
  }

  async map(query: ExecutivePersonnelMapQuery) {
    const selectedAreaId = this.selectedAreaId(query);
    const assignments = await this.prisma.userSeatAssignment.findMany({
      where: {
        isActive: true,
        validUntil: null,
        ...(selectedAreaId
          ? { areaScopes: { some: this.areaScopeWhere(selectedAreaId) } }
          : {}),
        position: {
          code: PositionCode.PETUGAS_ORGANIK,
          ...(query.unitId ? { organizationUnitId: query.unitId } : {}),
        },
        userProfile: { deletedAt: null, isActive: true },
      },
      include: {
        userProfile: {
          include: {
            authUser: { select: { email: true, name: true } },
          },
        },
        position: {
          include: {
            role: true,
            organizationUnit: true,
          },
        },
        areaScopes: {
          where: { validUntil: null },
          include: { area: true },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: { validFrom: 'desc' },
    });
    const pings = await this.latestLocationPings(assignments.map((item) => item.id));
    const pingByAssignment = new Map(
      pings.map((ping) => [ping.positionAssignmentId, ping]),
    );
    const now = new Date();
    let unlocatedCount = 0;
    const features = assignments.flatMap((assignment) => {
      const ping = pingByAssignment.get(assignment.id) ?? null;
      const primaryArea =
        assignment.areaScopes.find((scope) => scope.isPrimary)?.area ??
        assignment.areaScopes[0]?.area ??
        null;
      const latitude =
        ping?.latitude ?? primaryArea?.centroidLatitude ?? null;
      const longitude =
        ping?.longitude ?? primaryArea?.centroidLongitude ?? null;

      if (latitude === null || longitude === null) {
        unlocatedCount += 1;
        return [];
      }

      const status = this.markerStatus(
        ping,
        now,
        query.activeWithinMinutes,
        query.recentWithinHours,
      );
      const legend = LOCATION_LEGEND.find((item) => item.status === status)!;

      return [
        {
          type: 'Feature' as const,
          id: assignment.id,
          geometry: {
            type: 'Point' as const,
            coordinates: [Number(longitude), Number(latitude)] as [number, number],
          },
          properties: {
            markerType: 'personnel',
            assignmentId: assignment.id,
            userProfileId: assignment.userProfileId,
            name:
              assignment.userProfile.fullName ??
              assignment.userProfile.authUser.name ??
              assignment.userProfile.username,
            email: assignment.userProfile.authUser.email,
            positionTitle: assignment.position.title,
            seatCode: assignment.position.seatCode,
            unitName: assignment.position.organizationUnit.name,
            roleCode: assignment.position.role.code,
            status,
            markerCode: legend.code,
            markerColor: legend.color,
            hasLiveLocation: Boolean(ping),
            capturedAt: ping?.capturedAt ?? null,
            area: primaryArea
              ? {
                  id: primaryArea.id,
                  code: primaryArea.code,
                  name: primaryArea.name,
                  level: primaryArea.level,
                }
              : null,
          },
        },
      ];
    });

    return {
      type: 'FeatureCollection' as const,
      features,
      meta: {
        counts: {
          totalFieldOfficers: assignments.length,
          located: features.length,
          unlocated: unlocatedCount,
          byStatus: this.countBy(features, (feature) =>
            String(feature.properties.status),
          ),
        },
        legend: LOCATION_LEGEND,
        freshness: {
          activeWithinMinutes: query.activeWithinMinutes,
          recentWithinHours: query.recentWithinHours,
          generatedAt: now.toISOString(),
        },
      },
    };
  }

  async detail(userProfileId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { id: userProfileId },
      include: {
        authUser: {
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            role: true,
            banned: true,
            banReason: true,
            banExpires: true,
          },
        },
        positionAssignments: {
          include: {
            position: {
              include: {
                role: true,
                organizationUnit: true,
              },
            },
            seat: {
              include: {
                role: true,
                organizationUnit: true,
              },
            },
            areaScopes: {
              include: { area: true },
              orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
            },
          },
          orderBy: [{ isActive: 'desc' }, { validFrom: 'desc' }],
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 40,
        },
      },
    });

    if (!profile || profile.deletedAt) {
      throw new NotFoundException('Personel tidak ditemukan.');
    }

    const assignmentIds = profile.positionAssignments.map((item) => item.id);
    const [latestPings, reports] = await Promise.all([
      this.latestLocationPings(assignmentIds),
      this.prisma.baket.findMany({
        where: {
          deletedAt: null,
          createdByFieldOfficerAssignmentId: { in: assignmentIds },
        },
        include: {
          reportCategory: { select: { id: true, code: true, name: true } },
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 1,
            include: {
              eventArea: {
                select: { id: true, code: true, name: true, level: true },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 30,
      }),
    ]);
    const pingByAssignment = new Map(
      latestPings.map((ping) => [ping.positionAssignmentId, ping]),
    );
    const currentAssignment =
      profile.positionAssignments.find(
        (assignment) => assignment.isActive && !assignment.validUntil,
      ) ?? null;

    return {
      profile: {
        id: profile.id,
        username: profile.username,
        fullName: profile.fullName ?? profile.authUser.name,
        email: profile.authUser.email,
        phone: profile.phone,
        status: profile.status,
        isActive: profile.isActive,
        lastLoginAt: profile.lastLoginAt,
        operationalLockedAt: profile.operationalLockedAt,
        operationalLockReason: profile.operationalLockReason,
        authRole: profile.authUser.role,
        authBanned: profile.authUser.banned,
        authBanReason: profile.authUser.banReason,
        authBanExpires: profile.authUser.banExpires,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
      currentAssignment: currentAssignment
        ? this.assignmentDetail(currentAssignment, pingByAssignment.get(currentAssignment.id) ?? null)
        : null,
      assignments: profile.positionAssignments.map((assignment) =>
        this.assignmentDetail(assignment, pingByAssignment.get(assignment.id) ?? null),
      ),
      activityLogs: profile.auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt,
      })),
      reports: reports.map((report) => {
        const latestVersion = report.versions[0] ?? null;
        return {
          id: report.id,
          status: report.status,
          currentVersionNumber: report.currentVersionNumber,
          category: report.reportCategory,
          title: latestVersion?.title ?? 'Tanpa judul',
          urgency: latestVersion?.urgency ?? null,
          eventTime: latestVersion?.eventTime ?? null,
          eventArea: latestVersion?.eventArea ?? null,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
        };
      }),
      kpi: {
        status: 'EMPTY',
        metrics: [],
        note: 'KPI personel belum diaktifkan pada modul ini.',
      },
    };
  }

  private buildProfileWhere(query: ExecutivePersonnelListQuery) {
    const where: Prisma.UserProfileWhereInput = { deletedAt: null };
    const and: Prisma.UserProfileWhereInput[] = [];
    const search = query.search?.trim();
    const selectedAreaId = this.selectedAreaId(query);

    if (query.status) {
      and.push({ status: query.status });
    }

    if (query.roleCode || query.unitId || selectedAreaId) {
      and.push({
        positionAssignments: {
          some: {
            isActive: true,
            validUntil: null,
            ...(selectedAreaId
              ? { areaScopes: { some: this.areaScopeWhere(selectedAreaId) } }
              : {}),
            position: {
              ...(query.roleCode ? { role: { code: query.roleCode } } : {}),
              ...(query.unitId ? { organizationUnitId: query.unitId } : {}),
            },
          },
        },
      });
    }

    if (search) {
      and.push({
        OR: [
          { username: { contains: search, mode: 'insensitive' } },
          { fullName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { authUser: { email: { contains: search, mode: 'insensitive' } } },
          { authUser: { name: { contains: search, mode: 'insensitive' } } },
          {
            positionAssignments: {
              some: {
                position: {
                  OR: [
                    { title: { contains: search, mode: 'insensitive' } },
                    { seatCode: { contains: search, mode: 'insensitive' } },
                    {
                      organizationUnit: {
                        name: { contains: search, mode: 'insensitive' },
                      },
                    },
                    {
                      organizationUnit: {
                        code: { contains: search, mode: 'insensitive' },
                      },
                    },
                  ],
                },
              },
            },
          },
        ],
      });
    }

    if (and.length) {
      where.AND = and;
    }

    return where;
  }

  private async findActiveAssignmentsForProfiles(profileIds: string[]) {
    if (!profileIds.length) {
      return [];
    }

    return this.prisma.userSeatAssignment.findMany({
      where: {
        userProfileId: { in: profileIds },
        isActive: true,
        validUntil: null,
      },
      include: {
        position: {
          include: {
            role: true,
            organizationUnit: true,
          },
        },
        areaScopes: {
          where: { validUntil: null },
          include: { area: true },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: [{ isPrimary: 'desc' }, { validFrom: 'desc' }],
    });
  }

  private selectedAreaId(
    query: Pick<
      ExecutivePersonnelListQuery | ExecutivePersonnelMapQuery,
      'provinceId' | 'regencyId' | 'districtId'
    >,
  ) {
    return query.districtId ?? query.regencyId ?? query.provinceId ?? null;
  }

  private areaScopeWhere(areaId: string): Prisma.PositionAreaScopeWhereInput {
    return {
      area: {
        OR: [
          { id: areaId },
          { descendantLinks: { some: { ancestorId: areaId } } },
        ],
      },
    };
  }

  private async latestLocationPings(assignmentIds: string[]) {
    if (!assignmentIds.length) {
      return [];
    }

    const rows = await this.prisma.personnelLocationPing.findMany({
      where: {
        positionAssignmentId: { in: assignmentIds },
        isStealth: false,
      },
      orderBy: [{ positionAssignmentId: 'asc' }, { capturedAt: 'desc' }],
      distinct: ['positionAssignmentId'],
      include: {
        area: { select: { id: true, code: true, name: true, level: true } },
      },
    });

    return rows;
  }

  private async reportCountsByAssignment(assignmentIds: string[]) {
    const counts = new Map<string, number>();

    if (!assignmentIds.length) {
      return counts;
    }

    const rows = await this.prisma.baket.groupBy({
      by: ['createdByFieldOfficerAssignmentId'],
      where: {
        deletedAt: null,
        createdByFieldOfficerAssignmentId: { in: assignmentIds },
      },
      _count: { _all: true },
    });

    for (const row of rows) {
      counts.set(row.createdByFieldOfficerAssignmentId, row._count._all);
    }

    return counts;
  }

  private assignmentSummary(assignment: ActiveAssignment) {
    const areas = assignment.areaScopes.map((scope) => ({
      id: scope.area.id,
      code: scope.area.code,
      name: scope.area.name,
      level: scope.area.level,
      isPrimary: scope.isPrimary,
    }));

    return {
      id: assignment.id,
      positionId: assignment.positionId,
      title: assignment.position.title,
      seatCode: assignment.position.seatCode,
      roleCode: assignment.position.role.code,
      roleName: assignment.position.role.name,
      positionCode: assignment.position.code,
      unit: {
        id: assignment.position.organizationUnit.id,
        code: assignment.position.organizationUnit.code,
        name: assignment.position.organizationUnit.name,
        type: assignment.position.organizationUnit.type,
        branch: assignment.position.organizationUnit.branch,
      },
      branch: assignment.position.branch,
      validFrom: assignment.validFrom,
      areas,
    };
  }

  private assignmentDetail(
    assignment: ActiveAssignment,
    ping: LatestPing | null,
  ) {
    return {
      ...this.assignmentSummary(assignment),
      isPrimary: assignment.isPrimary,
      isActive: assignment.isActive,
      validUntil: assignment.validUntil,
      lastLocation: ping ? this.locationSummary(ping) : null,
    };
  }

  private locationSummary(ping: LatestPing) {
    return {
      latitude: Number(ping.latitude),
      longitude: Number(ping.longitude),
      gpsAccuracyMeters:
        ping.gpsAccuracyMeters === null ? null : Number(ping.gpsAccuracyMeters),
      coordinateSource: ping.coordinateSource,
      capturedAt: ping.capturedAt,
      receivedAt: ping.receivedAt,
      area: ping.area,
    };
  }

  private markerStatus(
    ping: LatestPing | null,
    now: Date,
    activeWithinMinutes: number,
    recentWithinHours: number,
  ) {
    if (!ping) {
      return 'NO_SIGNAL';
    }

    const ageMs = now.getTime() - ping.capturedAt.getTime();
    if (ageMs <= activeWithinMinutes * 60_000) {
      return 'LIVE';
    }

    if (ageMs <= recentWithinHours * 3_600_000) {
      return 'RECENT';
    }

    return 'STALE';
  }

  private countBy<T>(items: T[], getKey: (item: T) => string) {
    return items.reduce<Record<string, number>>((accumulator, item) => {
      const key = getKey(item);
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {});
  }
}
