import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { redactAuditOutput } from '../../common/audit/audit-forensics.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuditQueryDto } from './audit.dto.js';

const actorInclude = {
  actorUser: {
    select: {
      id: true,
      username: true,
      fullName: true,
      status: true,
    },
  },
  actorAssignment: {
    select: {
      id: true,
      branch: true,
      role: { select: { id: true, code: true, name: true } },
      areaScopes: {
        where: { validUntil: null },
        orderBy: [{ isPrimary: 'desc' as const }, { createdAt: 'asc' as const }],
        select: {
          isPrimary: true,
          area: { select: { id: true, code: true, name: true, level: true } },
        },
      },
    },
  },
} satisfies Prisma.AuditLogInclude;

function parseAuditDate(value: string) {
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  if (hasTimezone) return new Date(value);
  const localValue = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00`
    : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
      ? `${value}:00`
      : value;
  return new Date(`${localValue}+07:00`);
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AuditQueryDto) {
    const where = this.buildWhere(query);
    const skip = (query.page - 1) * query.limit;
    const [
      items,
      total,
      categories,
      severities,
      outcomes,
      incidentCount,
      anomalyCount,
      riskAggregate,
      actions,
      entityTypes,
      sources,
      devices,
      actors,
    ] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: [
          { [query.sortBy]: query.sortOrder },
          ...(query.sortBy === 'createdAt' ? [] : [{ createdAt: 'desc' as const }]),
          { id: 'desc' },
        ],
        include: actorInclude,
      }),
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.groupBy({
        by: ['category'],
        where,
        _count: { _all: true },
        orderBy: { _count: { category: 'desc' } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['severity'],
        where,
        _count: { _all: true },
        orderBy: { _count: { severity: 'desc' } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['outcome'],
        where,
        _count: { _all: true },
        orderBy: { _count: { outcome: 'desc' } },
      }),
      this.prisma.auditLog.count({ where: { ...where, isIncident: true } }),
      this.prisma.auditLog.count({ where: { ...where, isAnomaly: true } }),
      this.prisma.auditLog.aggregate({ where, _avg: { riskScore: true } }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { _all: true },
        orderBy: { _count: { action: 'desc' } },
        take: 30,
      }),
      this.prisma.auditLog.groupBy({
        by: ['entityType'],
        where,
        _count: { _all: true },
        orderBy: { _count: { entityType: 'desc' } },
        take: 30,
      }),
      this.prisma.auditLog.groupBy({
        by: ['source'],
        where: { ...where, source: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { source: 'desc' } },
        take: 30,
      }),
      this.prisma.auditLog.groupBy({
        by: ['deviceType'],
        where: { ...where, deviceType: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { deviceType: 'desc' } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['actorUserProfileId'],
        where: { ...where, actorUserProfileId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { actorUserProfileId: 'desc' } },
        take: 20,
      }),
    ]);

    const actorIds = actors
      .map((entry) => entry.actorUserProfileId)
      .filter((value): value is string => Boolean(value));
    const actorProfiles = await this.prisma.userProfile.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, username: true, fullName: true },
    });
    const actorMap = new Map<
      string,
      { id: string; username: string | null; fullName: string | null }
    >(actorProfiles.map((actor) => [actor.id, actor]));

    return {
      items: items.map((item) => this.redactRecord(item)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
      summary: {
        total,
        incidents: incidentCount,
        anomalies: anomalyCount,
        denied:
          outcomes.find((entry) => entry.outcome === 'DENIED')?._count._all ?? 0,
        failures:
          outcomes.find((entry) => entry.outcome === 'FAILURE')?._count._all ?? 0,
        averageRiskScore: Math.round(riskAggregate._avg.riskScore ?? 0),
      },
      facets: {
        categories: this.toFacet(categories, 'category'),
        severities: this.toFacet(severities, 'severity'),
        outcomes: this.toFacet(outcomes, 'outcome'),
        actions: this.toFacet(actions, 'action'),
        entityTypes: this.toFacet(entityTypes, 'entityType'),
        sources: this.toFacet(sources, 'source'),
        devices: this.toFacet(devices, 'deviceType'),
        actors: actors.map((entry) => ({
          value: entry.actorUserProfileId,
          label:
            actorMap.get(entry.actorUserProfileId ?? '')?.fullName ??
            actorMap.get(entry.actorUserProfileId ?? '')?.username ??
            entry.actorUserProfileId ??
            'Sistem',
          count: entry._count._all,
        })),
      },
    };
  }

  async detail(id: string) {
    const item = await this.prisma.auditLog.findUniqueOrThrow({
      where: { id },
      include: actorInclude,
    });
    return this.redactRecord(item);
  }

  async trail(entityType: string, entityId: string, limit: number) {
    const items = await this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      take: limit,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: actorInclude,
    });
    return items.map((item) => this.redactRecord(item));
  }

  private buildWhere(query: AuditQueryDto): Prisma.AuditLogWhereInput {
    const search = query.search?.trim();
    return {
      ...(query.actorUserProfileId
        ? { actorUserProfileId: query.actorUserProfileId }
        : {}),
      ...(query.actorAssignmentId
        ? { actorAssignmentId: query.actorAssignmentId }
        : {}),
      ...(query.action
        ? { action: { equals: query.action, mode: 'insensitive' } }
        : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
      ...(query.outcome ? { outcome: query.outcome } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId
        ? { entityId: { contains: query.entityId, mode: 'insensitive' } }
        : {}),
      ...(query.ipAddress ? { ipAddress: query.ipAddress } : {}),
      ...(query.requestId ? { requestId: query.requestId } : {}),
      ...(query.sessionId ? { sessionId: query.sessionId } : {}),
      ...(query.httpMethod
        ? { httpMethod: query.httpMethod.toUpperCase() }
        : {}),
      ...(query.requestPath
        ? {
            requestPath: {
              contains: query.requestPath,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(query.deviceType ? { deviceType: query.deviceType } : {}),
      ...(query.browser ? { browser: query.browser } : {}),
      ...(query.operatingSystem
        ? { operatingSystem: query.operatingSystem }
        : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.isAnomaly !== undefined ? { isAnomaly: query.isAnomaly } : {}),
      ...(query.isIncident !== undefined ? { isIncident: query.isIncident } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: parseAuditDate(query.from) } : {}),
              ...(query.to ? { lte: parseAuditDate(query.to) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            AND: [
              {
                OR: [
                  { action: { contains: search, mode: 'insensitive' } },
                  { entityType: { contains: search, mode: 'insensitive' } },
                  { entityId: { contains: search, mode: 'insensitive' } },
                  { ipAddress: { contains: search, mode: 'insensitive' } },
                  { requestId: { contains: search, mode: 'insensitive' } },
                  { requestPath: { contains: search, mode: 'insensitive' } },
                  {
                    actorUser: {
                      is: {
                        OR: [
                          { fullName: { contains: search, mode: 'insensitive' } },
                          { username: { contains: search, mode: 'insensitive' } },
                        ],
                      },
                    },
                  },
                ],
              },
            ],
          }
        : {}),
    };
  }

  private toFacet<K extends string>(
    values: Array<Record<K, string | null> & { _count: { _all: number } }>,
    key: K,
  ) {
    return values.map((entry) => ({
      value: String(entry[key] ?? ''),
      count: entry._count._all,
    }));
  }

  private redactRecord<T extends Record<string, unknown>>(item: T) {
    return {
      ...item,
      beforeData: redactAuditOutput(item.beforeData),
      afterData: redactAuditOutput(item.afterData),
      metadata: redactAuditOutput(item.metadata),
    };
  }
}
