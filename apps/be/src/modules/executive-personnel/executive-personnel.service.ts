import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AdministrativeLevel,
  JaringRegistrationStatus,
  JaringStatus,
  Prisma,
  RoleCode,
  UserProfileStatus,
} from '../../generated/prisma/client.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { getIndonesianPhoneSearchVariants } from '../../common/utils/phone-normalizer.js';
import { DomainScopeService } from '../access/domain-scope.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  ExecutivePersonnelListQuery,
  ExecutivePersonnelMapQuery,
  FieldCoordinatorPersonnelAreaFilterQuery,
} from './executive-personnel.dto.js';

type ActiveAssignment = any;
type LatestPing = any;

type PersonnelScopeOptions = {
  assignmentIds?: string[];
  requiredRoleCode?: RoleCode;
};

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
    description: 'Belum ada lokasi terakhir yang dapat dipetakan.',
    color: '#94a3b8',
  },
] as const;

@Injectable()
export class ExecutivePersonnelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainScope: DomainScopeService,
  ) {}

  async list(query: ExecutivePersonnelListQuery) {
    return this.listPersonnel(query, {
      requiredRoleCode: RoleCode.FIELD_OFFICER,
    });
  }

  async listFieldCoordinatorPersonnel(
    query: ExecutivePersonnelListQuery,
    context: AuthorizationContext,
  ) {
    await this.assertAreaOverlapsScope(query, context);
    const scope = await this.domainScope.resolve(context);

    return this.listPersonnel(query, {
      assignmentIds: scope.assignmentIds,
      requiredRoleCode: RoleCode.FIELD_OFFICER,
    });
  }

  async listRegionalCommanderPersonnel(
    query: ExecutivePersonnelListQuery,
    context: AuthorizationContext,
  ) {
    return this.listFieldCoordinatorPersonnel(query, context);
  }

  private async listPersonnel(
    query: ExecutivePersonnelListQuery,
    scopeOptions: PersonnelScopeOptions = {},
  ) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const where = this.buildProfileWhere(query, scopeOptions);
    const [total, profiles] = await Promise.all([
      this.prisma.userProfile.count({ where }),
      this.prisma.userProfile.findMany({
        where,
        include: {
          authUser: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              banned: true,
            },
          },
        },
        orderBy: [
          { fullName: 'asc' },
          { username: 'asc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    const profileIds = profiles.map((profile) => profile.id);
    const assignments = (await this.findActiveAssignmentsForProfiles(
      profileIds,
      query,
      scopeOptions,
    )) as any[];
    const assignmentByProfile = new Map<string, any>();
    for (const assignment of assignments) {
      if (!assignmentByProfile.has(assignment.userProfileId)) {
        assignmentByProfile.set(assignment.userProfileId, assignment);
      }
    }
    const assignmentIds = assignments.map((assignment) => assignment.id);
    const [latestPings, reportCounts] = await Promise.all([
      this.latestLocationPings(assignmentIds),
      this.reportCountsByAssignment(assignmentIds),
    ]);
    const pingByAssignment = new Map<string, any>(
      (latestPings as any[]).map((ping: any) => [
        ping.operationalAssignmentId,
        ping,
      ]),
    );

    return {
      items: profiles.map((profile) => {
        const assignment = assignmentByProfile.get(profile.id) ?? null;
        const ping = assignment
          ? (pingByAssignment.get(assignment.id) ?? null)
          : null;
        const jaringPreview = assignment
          ? assignment.jaringCaretakerAssignments.map((caretaker: any) =>
              this.withJaringActivity(caretaker.jaring),
            )
          : [];
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
          jaringCount: jaringPreview.length,
          jaringPreview,
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
    return this.mapPersonnel(query);
  }

  async mapFieldCoordinatorPersonnel(
    query: ExecutivePersonnelMapQuery,
    context: AuthorizationContext,
  ) {
    await this.assertAreaOverlapsScope(query, context);
    const scope = await this.domainScope.resolve(context);

    return this.mapPersonnel(query, {
      assignmentIds: scope.assignmentIds,
      requiredRoleCode: RoleCode.FIELD_OFFICER,
    });
  }

  async mapRegionalCommanderPersonnel(
    query: ExecutivePersonnelMapQuery,
    context: AuthorizationContext,
  ) {
    return this.mapFieldCoordinatorPersonnel(query, context);
  }

  async fieldCoordinatorAreaFilters(
    query: FieldCoordinatorPersonnelAreaFilterQuery,
    context: AuthorizationContext,
  ) {
    if (query.provinceId) {
      await this.assertAreaOverlapsScope(
        { provinceId: query.provinceId },
        context,
      );
    }
    if (query.regencyId) {
      await this.assertAreaOverlapsScope(
        { regencyId: query.regencyId },
        context,
      );
    }

    const scope = await this.domainScope.resolve(context);
    const areaSelect = {
      id: true,
      code: true,
      name: true,
      level: true,
      parentId: true,
    } satisfies Prisma.AdministrativeAreaSelect;

    const [provinces, regencies, districts] = await Promise.all([
      this.prisma.administrativeArea.findMany({
        where: {
          ...this.scopedAreaWhere(
            scope.areaRootIds,
            AdministrativeLevel.PROVINCE,
          ),
        },
        select: areaSelect,
        orderBy: { name: 'asc' },
      }),
      this.prisma.administrativeArea.findMany({
        where: {
          ...this.scopedAreaWhere(scope.areaRootIds, [
            AdministrativeLevel.REGENCY,
            AdministrativeLevel.CITY,
          ]),
          ...(query.provinceId ? { parentId: query.provinceId } : {}),
        },
        select: areaSelect,
        orderBy: { name: 'asc' },
      }),
      query.regencyId
        ? this.prisma.administrativeArea.findMany({
            where: {
              ...this.scopedAreaWhere(
                scope.areaRootIds,
                AdministrativeLevel.DISTRICT,
              ),
              parentId: query.regencyId,
            },
            select: areaSelect,
            orderBy: { name: 'asc' },
          })
        : Promise.resolve([]),
    ]);

    return { provinces, regencies, districts };
  }

  async regionalCommanderAreaFilters(
    query: FieldCoordinatorPersonnelAreaFilterQuery,
    context: AuthorizationContext,
  ) {
    return this.fieldCoordinatorAreaFilters(query, context);
  }

  async detailFieldCoordinatorPersonnel(
    assignmentId: string,
    context: AuthorizationContext,
  ) {
    const scope = await this.domainScope.resolve(context);

    if (!scope.assignmentIds.includes(assignmentId)) {
      throw new NotFoundException('Personel tidak ditemukan.');
    }

    const assignment = await this.prisma.userOperationalAssignment.findFirst({
      where: {
        id: assignmentId,
        isActive: true,
        validUntil: null,
        role: { code: RoleCode.FIELD_OFFICER },
        userProfile: {
          deletedAt: null,
          isActive: true,
        },
      },
      select: {
        userProfileId: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Personel tidak ditemukan.');
    }

    return this.detail(assignment.userProfileId, assignmentId);
  }

  async detailRegionalPersonnel(
    assignmentId: string,
    context: AuthorizationContext,
  ) {
    const scope = await this.domainScope.resolve(context);

    if (!scope.assignmentIds.includes(assignmentId)) {
      throw new NotFoundException('Personel tidak ditemukan.');
    }

    const assignment = await this.prisma.userOperationalAssignment.findFirst({
      where: {
        id: assignmentId,
        isActive: true,
        validUntil: null,
        role: { code: RoleCode.FIELD_OFFICER },
        userProfile: {
          deletedAt: null,
          isActive: true,
        },
      },
      select: {
        userProfileId: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Personel tidak ditemukan.');
    }

    return this.detail(assignment.userProfileId, assignmentId);
  }

  private async mapPersonnel(
    query: ExecutivePersonnelMapQuery,
    scopeOptions: PersonnelScopeOptions = {},
  ) {
    const selectedAreaId = this.selectedAreaId(query);
    const search = query.search?.trim();
    const phoneSearchVariants = search
      ? getIndonesianPhoneSearchVariants(search)
      : [];
    const assignmentRows = await this.prisma.userOperationalAssignment.findMany(
      {
        where: {
          isActive: true,
          validUntil: null,
          ...(scopeOptions.assignmentIds
            ? { id: { in: scopeOptions.assignmentIds } }
            : {}),
          ...(selectedAreaId
            ? { areaScopes: { some: this.areaScopeWhere(selectedAreaId) } }
            : {}),
          role: {
            code: scopeOptions.requiredRoleCode ?? RoleCode.FIELD_OFFICER,
          },
          ...(query.unitId
            ? { areaScopes: { some: this.areaScopeWhere(query.unitId) } }
            : {}),
          userProfile: { deletedAt: null, isActive: true },
          ...(search
            ? {
                OR: [
                  {
                    userProfile: {
                      OR: [
                        {
                          username: {
                            contains: search,
                            mode: 'insensitive',
                          },
                        },
                        {
                          fullName: {
                            contains: search,
                            mode: 'insensitive',
                          },
                        },
                        ...phoneSearchVariants.map((phone) => ({
                          phone: { contains: phone },
                        })),
                        {
                          authUser: {
                            OR: [
                              {
                                email: {
                                  contains: search,
                                  mode: 'insensitive',
                                },
                              },
                              {
                                name: {
                                  contains: search,
                                  mode: 'insensitive',
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                  {
                    role: {
                      name: { contains: search, mode: 'insensitive' },
                    },
                  },
                  {
                    areaScopes: {
                      some: {
                        area: {
                          OR: [
                            {
                              name: { contains: search, mode: 'insensitive' },
                            },
                            {
                              code: { contains: search, mode: 'insensitive' },
                            },
                          ],
                        },
                      },
                    },
                  },
                  {
                    jaringCaretakerAssignments: {
                      some: {
                        isActive: true,
                        validUntil: null,
                        jaring: {
                          deletedAt: null,
                          OR: [
                            {
                              aliasName: {
                                contains: search,
                                mode: 'insensitive',
                              },
                            },
                            {
                              fullName: {
                                contains: search,
                                mode: 'insensitive',
                              },
                            },
                            ...phoneSearchVariants.map((phone) => ({
                              whatsappNumber: { contains: phone },
                            })),
                          ],
                        },
                      },
                    },
                  },
                ],
              }
            : {}),
        },
        include: {
          userProfile: {
            include: {
              authUser: { select: { email: true, name: true } },
            },
          },
          role: true,
          areaScopes: {
            where: { validUntil: null },
            include: { area: this.areaWithHierarchyInclude() },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          },
        },
        orderBy: [{ isPrimary: 'desc' }, { validFrom: 'desc' }],
      },
    );
    const assignmentByProfile = new Map<
      string,
      (typeof assignmentRows)[number]
    >();
    for (const assignment of assignmentRows) {
      if (!assignmentByProfile.has(assignment.userProfileId)) {
        assignmentByProfile.set(assignment.userProfileId, assignment);
      }
    }
    const assignments = [...assignmentByProfile.values()];
    const pings = await this.latestLocationPings(
      assignments.map((item) => item.id),
    );
    const pingByAssignment = new Map<string, any>(
      (pings as any[]).map((ping: any) => [ping.operationalAssignmentId, ping]),
    );
    const now = new Date();
    let unlocatedCount = 0;
    const features: any[] = assignments.flatMap((assignment: any) => {
      const ping = pingByAssignment.get(assignment.id) ?? null;
      const primaryArea =
        assignment.areaScopes.find((scope: any) => scope.isPrimary)?.area ??
        assignment.areaScopes[0]?.area ??
        null;
      const latitude = ping?.latitude ?? null;
      const longitude = ping?.longitude ?? null;

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
            coordinates: [Number(longitude), Number(latitude)] as [
              number,
              number,
            ],
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
            positionTitle: assignment.role.name,
            seatCode: assignment.id,
            unitName: primaryArea?.name ?? assignment.branch,
            roleCode: assignment.role.code,
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
          byStatus: this.countBy(features, (feature: any) =>
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

  async detail(userProfileId: string, focusAssignmentId?: string) {
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
        operationalAssignments: {
          include: {
            role: true,
            areaScopes: {
              include: { area: this.areaWithHierarchyInclude() },
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

    if (
      !profile ||
      profile.deletedAt ||
      !profile.operationalAssignments.some(
        (assignment) =>
          assignment.isActive &&
          !assignment.validUntil &&
          assignment.role.code === RoleCode.FIELD_OFFICER,
      )
    ) {
      throw new NotFoundException('Personel tidak ditemukan.');
    }

    const assignmentIds = profile.operationalAssignments.map((item) => item.id);
    const relatedAssignmentIds = focusAssignmentId
      ? [focusAssignmentId]
      : assignmentIds;
    const [latestPings, reports, baketCount, jaring] = await Promise.all([
      this.latestLocationPings(assignmentIds),
      this.prisma.baket.findMany({
        where: {
          deletedAt: null,
          createdByFieldOfficerAssignmentId: { in: relatedAssignmentIds },
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
      this.prisma.baket.count({
        where: {
          deletedAt: null,
          createdByFieldOfficerAssignmentId: { in: relatedAssignmentIds },
        },
      }),
      this.prisma.jaring.findMany({
        where: {
          deletedAt: null,
          caretakerAssignments: {
            some: {
              fieldOfficerAssignmentId: { in: relatedAssignmentIds },
              isActive: true,
              validUntil: null,
            },
          },
        },
        select: {
          id: true,
          aliasName: true,
          fullName: true,
          gender: true,
          address: true,
          whatsappNumber: true,
          status: true,
          registrationStatus: true,
          registeredAt: true,
          createdAt: true,
          profilePhotoFileId: true,
          profilePhotoFile: { select: { id: true } },
          occupation: { select: { id: true, name: true } },
          areaCoverages: {
            where: { validUntil: null },
            select: {
              area: { select: { id: true, name: true } },
            },
          },
          messages: {
            take: 1,
            orderBy: { receivedAt: 'desc' },
            select: { receivedAt: true },
          },
          reportSessions: {
            take: 1,
            orderBy: { submittedAt: 'desc' },
            select: { submittedAt: true },
          },
        },
        orderBy: [{ registeredAt: 'desc' }, { id: 'desc' }],
      }),
    ]);
    const pingByAssignment = new Map(
      latestPings.map((ping) => [ping.operationalAssignmentId, ping]),
    );
    const currentAssignment =
      (focusAssignmentId
        ? profile.operationalAssignments.find(
            (assignment) => assignment.id === focusAssignmentId,
          )
        : null) ??
      profile.operationalAssignments.find(
        (assignment) => assignment.isActive && !assignment.validUntil,
      ) ??
      null;

    const jaringWithActivity = jaring.map((item) =>
      this.withJaringActivity(item),
    );

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
        ? this.assignmentDetail(
            currentAssignment,
            pingByAssignment.get(currentAssignment.id) ?? null,
          )
        : null,
      assignments: profile.operationalAssignments.map((assignment) =>
        this.assignmentDetail(
          assignment,
          pingByAssignment.get(assignment.id) ?? null,
        ),
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
        const normalized = latestVersion?.originalContent
          ?.replace(/\s+/g, ' ')
          .trim();
        const words = normalized?.split(' ') ?? [];
        return {
          id: report.id,
          status: report.status,
          currentVersionNumber: report.currentVersionNumber,
          category: report.reportCategory,
          displayTitle: normalized
            ? `${words.slice(0, 6).join(' ')}${words.length > 6 ? '…' : ''}`
            : 'Baket tanpa isi',
          urgency: latestVersion?.urgency ?? null,
          reportedAt: latestVersion?.createdAt ?? report.createdAt,
          eventArea: latestVersion?.eventArea ?? null,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
        };
      }),
      jaring: jaringWithActivity,
      summary: {
        jaringCount: jaringWithActivity.length,
        baketCount,
        assignmentCount: profile.operationalAssignments.length,
        activeAreaCount:
          currentAssignment?.areaScopes.filter((scope) => !scope.validUntil)
            .length ?? 0,
      },
      kpi: {
        status: 'EMPTY',
        metrics: [],
        note: 'KPI personel belum diaktifkan pada modul ini.',
      },
    };
  }

  private buildProfileWhere(
    query: ExecutivePersonnelListQuery,
    scopeOptions: PersonnelScopeOptions = {},
  ) {
    const where: Prisma.UserProfileWhereInput = { deletedAt: null };
    const and: Prisma.UserProfileWhereInput[] = [];
    const search = query.search?.trim();
    const phoneSearchVariants = search
      ? getIndonesianPhoneSearchVariants(search)
      : [];
    const selectedAreaId = this.selectedAreaId(query);

    if (query.status) {
      and.push({ status: query.status });
    }

    if (
      query.roleCode ||
      query.unitId ||
      selectedAreaId ||
      scopeOptions.assignmentIds ||
      scopeOptions.requiredRoleCode
    ) {
      and.push({
        operationalAssignments: {
          some: this.activeAssignmentWhere(query, scopeOptions),
        },
      });
    }

    if (search) {
      and.push({
        OR: [
          { username: { contains: search, mode: 'insensitive' } },
          { fullName: { contains: search, mode: 'insensitive' } },
          ...phoneSearchVariants.map((phone) => ({
            phone: { contains: phone },
          })),
          { authUser: { email: { contains: search, mode: 'insensitive' } } },
          { authUser: { name: { contains: search, mode: 'insensitive' } } },
          {
            operationalAssignments: {
              some: {
                AND: [
                  this.activeAssignmentWhere(query, scopeOptions),
                  {
                    OR: [
                      {
                        role: {
                          name: { contains: search, mode: 'insensitive' },
                        },
                      },
                      {
                        role: {
                          code: { equals: search as RoleCode },
                        },
                      },
                      {
                        areaScopes: {
                          some: {
                            area: {
                              OR: [
                                {
                                  name: {
                                    contains: search,
                                    mode: 'insensitive',
                                  },
                                },
                                {
                                  code: {
                                    contains: search,
                                    mode: 'insensitive',
                                  },
                                },
                              ],
                            },
                          },
                        },
                      },
                      {
                        jaringCaretakerAssignments: {
                          some: {
                            isActive: true,
                            validUntil: null,
                            jaring: {
                              deletedAt: null,
                              OR: [
                                {
                                  aliasName: {
                                    contains: search,
                                    mode: 'insensitive',
                                  },
                                },
                                {
                                  fullName: {
                                    contains: search,
                                    mode: 'insensitive',
                                  },
                                },
                                ...phoneSearchVariants.map((phone) => ({
                                  whatsappNumber: { contains: phone },
                                })),
                              ],
                            },
                          },
                        },
                      },
                    ],
                  },
                ],
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

  private async findActiveAssignmentsForProfiles(
    profileIds: string[],
    query: Pick<
      ExecutivePersonnelListQuery,
      'roleCode' | 'unitId' | 'provinceId' | 'regencyId' | 'districtId'
    > = {},
    scopeOptions: PersonnelScopeOptions = {},
  ) {
    if (!profileIds.length) {
      return [];
    }

    return this.prisma.userOperationalAssignment.findMany({
      where: {
        ...this.activeAssignmentWhere(query, scopeOptions),
        userProfileId: { in: profileIds },
      },
      include: {
        role: true,
        areaScopes: {
          where: { validUntil: null },
          include: { area: this.areaWithHierarchyInclude() },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        jaringCaretakerAssignments: {
          where: {
            isActive: true,
            validUntil: null,
            jaring: { deletedAt: null },
          },
          orderBy: { validFrom: 'desc' },
          select: {
            jaring: {
              select: {
                id: true,
                aliasName: true,
                fullName: true,
                whatsappNumber: true,
                status: true,
                registrationStatus: true,
                areaCoverages: {
                  where: { validUntil: null },
                  orderBy: [{ isPrimary: 'desc' }, { validFrom: 'desc' }],
                  take: 1,
                  select: {
                    area: { select: { id: true, name: true } },
                  },
                },
                messages: {
                  take: 1,
                  orderBy: { receivedAt: 'desc' },
                  select: { receivedAt: true },
                },
                reportSessions: {
                  take: 1,
                  orderBy: { submittedAt: 'desc' },
                  select: { submittedAt: true },
                },
              },
            },
          },
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

  private activeAssignmentWhere(
    query: Pick<
      ExecutivePersonnelListQuery,
      'roleCode' | 'unitId' | 'provinceId' | 'regencyId' | 'districtId'
    >,
    scopeOptions: PersonnelScopeOptions = {},
  ): Prisma.UserOperationalAssignmentWhereInput {
    const selectedAreaId = this.selectedAreaId(query);

    return {
      isActive: true,
      validUntil: null,
      ...(scopeOptions.assignmentIds
        ? { id: { in: scopeOptions.assignmentIds } }
        : {}),
      ...(selectedAreaId
        ? { areaScopes: { some: this.areaScopeWhere(selectedAreaId) } }
        : {}),
      ...(query.unitId
        ? { areaScopes: { some: this.areaScopeWhere(query.unitId) } }
        : {}),
      role: {
        ...(query.roleCode ? { code: query.roleCode } : {}),
        ...(scopeOptions.requiredRoleCode
          ? { code: scopeOptions.requiredRoleCode }
          : {}),
      },
    };
  }

  private areaScopeWhere(areaId: string): Prisma.UserAreaScopeWhereInput {
    return {
      area: {
        OR: [
          { id: areaId },
          { descendantLinks: { some: { ancestorId: areaId } } },
        ],
      },
    };
  }

  private scopedAreaWhere(
    areaRootIds: string[],
    level: AdministrativeLevel | AdministrativeLevel[],
  ): Prisma.AdministrativeAreaWhereInput {
    if (!areaRootIds.length) {
      return { id: { in: [] } };
    }

    return {
      isActive: true,
      deletedAt: null,
      level: Array.isArray(level) ? { in: level } : level,
      ...this.areaOverlapScopeWhere(areaRootIds),
    };
  }

  private areaOverlapScopeWhere(
    areaRootIds: string[],
  ): Prisma.AdministrativeAreaWhereInput {
    return {
      OR: [
        { id: { in: areaRootIds } },
        { descendantLinks: { some: { ancestorId: { in: areaRootIds } } } },
        { ancestorLinks: { some: { descendantId: { in: areaRootIds } } } },
      ],
    };
  }

  private async assertAreaOverlapsScope(
    query: Pick<
      ExecutivePersonnelListQuery | ExecutivePersonnelMapQuery,
      'provinceId' | 'regencyId' | 'districtId'
    >,
    context: AuthorizationContext,
  ) {
    const selectedAreaId = this.selectedAreaId(query);
    if (!selectedAreaId) {
      return;
    }

    const scope = await this.domainScope.resolve(context);
    if (!scope.areaRootIds.length) {
      throw new NotFoundException('Resource not found.');
    }

    const allowed = await this.prisma.administrativeArea.findFirst({
      where: {
        id: selectedAreaId,
        ...this.areaOverlapScopeWhere(scope.areaRootIds),
      },
      select: { id: true },
    });

    if (!allowed) {
      throw new NotFoundException('Resource not found.');
    }
  }

  private withJaringActivity<
    T extends {
      messages?: Array<{ receivedAt: Date }>;
      reportSessions?: Array<{ submittedAt: Date | null }>;
      registrationStatus?: string | null;
      status?: string | null;
    },
  >(item: T) {
    const latestMessageDate = item.messages?.[0]?.receivedAt
      ? new Date(item.messages[0].receivedAt).getTime()
      : null;
    const latestSessionDate = item.reportSessions?.[0]?.submittedAt
      ? new Date(item.reportSessions[0].submittedAt).getTime()
      : null;

    let lastReportAt: Date | null = null;
    if (latestMessageDate && latestSessionDate) {
      lastReportAt = new Date(Math.max(latestMessageDate, latestSessionDate));
    } else if (latestMessageDate) {
      lastReportAt = new Date(latestMessageDate);
    } else if (latestSessionDate) {
      lastReportAt = new Date(latestSessionDate);
    }

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);
    const isApproved =
      item.registrationStatus === JaringRegistrationStatus.APPROVED;
    const hasRecentActivity =
      lastReportAt !== null &&
      lastReportAt.getTime() >= threeMonthsAgo.getTime();
    const {
      messages: _messages,
      reportSessions: _reportSessions,
      ...payload
    } = item;

    return {
      ...payload,
      lastReportAt: lastReportAt ? lastReportAt.toISOString() : null,
      status:
        isApproved && hasRecentActivity
          ? JaringStatus.ACTIVE
          : JaringStatus.INACTIVE,
    };
  }

  private async latestLocationPings(assignmentIds: string[]) {
    if (!assignmentIds.length) {
      return [];
    }

    const rows = await this.prisma.personnelLocationPing.findMany({
      where: {
        operationalAssignmentId: { in: assignmentIds },
        isStealth: false,
      },
      orderBy: [{ operationalAssignmentId: 'asc' }, { capturedAt: 'desc' }],
      distinct: ['operationalAssignmentId'],
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
    const areas = assignment.areaScopes.map((scope: any) => ({
      id: scope.area.id,
      code: scope.area.code,
      name: scope.area.name,
      level: scope.area.level,
      isPrimary: scope.isPrimary,
      ancestors:
        scope.area.ancestorLinks
          ?.map((link: any) => link.ancestor)
          .filter((area: any) =>
            [
              AdministrativeLevel.PROVINCE,
              AdministrativeLevel.REGENCY,
              AdministrativeLevel.CITY,
              AdministrativeLevel.DISTRICT,
            ].includes(area.level),
          )
          .map((area: any) => ({
            id: area.id,
            code: area.code,
            name: area.name,
            level: area.level,
          })) ?? [],
    }));

    return {
      id: assignment.id,
      positionId: assignment.id,
      title: assignment.role.name,
      seatCode: assignment.id,
      roleCode: assignment.role.code,
      roleName: assignment.role.name,
      positionCode: assignment.role.code,
      unit: {
        id: areas[0]?.id ?? assignment.id,
        code: areas[0]?.code ?? assignment.branch,
        name: areas[0]?.name ?? assignment.branch,
        type: assignment.branch,
        branch: assignment.branch,
      },
      branch: assignment.branch,
      validFrom: assignment.validFrom,
      areas,
    };
  }

  private assignmentDetail(assignment: ActiveAssignment, ping: LatestPing) {
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

  private areaWithHierarchyInclude() {
    return {
      include: {
        ancestorLinks: {
          orderBy: { depth: 'desc' as const },
          include: {
            ancestor: {
              select: {
                id: true,
                code: true,
                name: true,
                level: true,
              },
            },
          },
        },
      },
    };
  }

  private markerStatus(
    ping: LatestPing,
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
