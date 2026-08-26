import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { DomainScopeService } from '../access/domain-scope.service.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { BaketStatus, type Prisma } from '../../generated/prisma/client.js';
import type { BaketQuery, VerificationQuery } from './baket.dto.js';

const publicFileSelect = {
  id: true,
  storageKey: true,
  originalName: true,
  mimeType: true,
  fileType: true,
  checksumSha256: true,
  lifecycleStatus: true,
  scanResult: true,
  scannedAt: true,
  quarantineReason: true,
  retentionUntil: true,
  createdByAssignmentId: true,
  createdAt: true,
  deletedAt: true,
} satisfies Prisma.FileAssetSelect;

const administrativeAreaInclude = {
  parent: {
    include: {
      parent: {
        include: {
          parent: {
            include: {
              parent: {
                include: {
                  parent: {
                    include: { parent: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.AdministrativeAreaInclude;

@Injectable()
export class BaketQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: DomainScopeService,
  ) {}

  private versionDisplayFields(version: {
    originalContent: string;
    normalizedContent: string | null;
    createdAt: Date;
  }) {
    const content = version.normalizedContent || version.originalContent;
    const words = content
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean);
    const headline = words.slice(0, 6).join(' ');
    return {
      displayTitle:
        words.length === 0
          ? 'Baket tanpa isi'
          : words.length > 6
            ? `${headline}…`
            : headline,
      reportedAt: version.createdAt,
    };
  }

  async baketDetail(baketId: string) {
    const baket = await this.prisma.baket.findFirstOrThrow({
      where: { id: baketId, deletedAt: null },
      include: {
        createdByFieldOfficerAssignment: {
          include: {
            userProfile: true,
            role: true,
            areaScopes: {
              where: { validUntil: null },
              include: { area: true },
            },
          },
        },
        taskAssignment: {
          include: {
            task: true,
            assignee: { include: { userProfile: true, role: true } },
            assigner: { include: { userProfile: true, role: true } },
          },
        },
        primaryJaring: true,
        reportCategory: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            eventArea: { include: administrativeAreaInclude },
            createdByAssignment: {
              include: { userProfile: true, role: true },
            },
            sourceMessages: {
              include: {
                message: {
                  include: {
                    jaring: true,
                    category: true,
                    media: {
                      include: { file: { select: publicFileSelect } },
                    },
                    resolvedArea: true,
                    validationIssues: true,
                  },
                },
              },
            },
            attachments: {
              include: { file: { select: publicFileSelect } },
            },
            verification: {
              include: {
                crossReferences: true,
              },
            },
            coverageChecks: {
              include: {
                area: true,
                operationalAssignment: {
                  include: { role: true, userProfile: true },
                },
              },
            },
          },
        },
        revisionRequests: {
          orderBy: { createdAt: 'desc' },
          include: {
            requestedAgainstVersion: true,
            resolvedByVersion: true,
            requestedByAssignment: {
              include: { userProfile: true, role: true },
            },
          },
        },
        alerts: true,
      },
    });
    return {
      ...baket,
      versions: baket.versions.map((version) => ({
        ...version,
        ...this.versionDisplayFields(version),
      })),
    };
  }

  async baketVersionDetail(versionId: string) {
    const version = await this.prisma.baketVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: {
        baket: true,
        eventArea: { include: administrativeAreaInclude },
        createdByAssignment: {
          include: { userProfile: true, role: true },
        },
        sourceMessages: {
          include: {
            message: {
              include: {
                jaring: true,
                category: true,
                media: {
                  include: { file: { select: publicFileSelect } },
                },
                resolvedArea: true,
                validationIssues: true,
              },
            },
          },
        },
        attachments: {
          include: { file: { select: publicFileSelect } },
        },
        verification: {
          include: {
            crossReferences: {
              include: { relatedBaket: true },
            },
          },
        },
        coverageChecks: {
          include: {
            area: true,
            operationalAssignment: {
              include: { role: true, userProfile: true },
            },
          },
        },
      },
    });
    return { ...version, ...this.versionDisplayFields(version) };
  }

  verificationDetail(verificationId: string) {
    return this.prisma.baketVerification.findUniqueOrThrow({
      where: { id: verificationId },
      include: {
        baketVersion: {
          include: {
            baket: true,
            eventArea: { include: administrativeAreaInclude },
            sourceMessages: {
              include: { message: true },
            },
          },
        },
        verifiedByAssignment: {
          include: { userProfile: true, role: true },
        },
        crossReferences: {
          include: { relatedBaket: true },
        },
      },
    });
  }

  async list(query: BaketQuery, context: AuthorizationContext) {
    const requestedStatuses = query.statuses
      ?.split(',')
      .map((status) => status.trim())
      .filter((status): status is BaketStatus =>
        Object.values(BaketStatus).includes(status as BaketStatus),
      );
    const intakeStatuses = [
      BaketStatus.SENT_TO_OIM,
      BaketStatus.UNDER_VERIFICATION,
      BaketStatus.NEEDS_DEVELOPMENT,
      BaketStatus.VERIFIED,
      BaketStatus.REJECTED,
    ];
    const where: Prisma.BaketWhereInput = {
      AND: [await this.scope.baketWhere(context)],
      deletedAt: null,
      ...(query.status
        ? { status: query.status }
        : requestedStatuses?.length
          ? { status: { in: requestedStatuses } }
          : context.roleCode === 'EXECUTIVE' ||
              context.roleCode === 'REGIONAL_COMMANDER'
            ? { status: { in: intakeStatuses } }
            : {}),
      ...(query.urgency
        ? {
            versions: {
              some: { urgency: query.urgency },
            },
          }
        : {}),
      ...(query.createdByAssignmentId
        ? { createdByFieldOfficerAssignmentId: query.createdByAssignmentId }
        : {}),
      ...(query.taskAssignmentId
        ? { taskAssignmentId: query.taskAssignmentId }
        : {}),
      ...(query.jaringId ? { primaryJaringId: query.jaringId } : {}),
      ...(query.categoryId ? { reportCategoryId: query.categoryId } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(query.areaId
        ? {
            versions: {
              some: {
                OR: [
                  { eventAreaId: query.areaId },
                  {
                    eventArea: {
                      descendantLinks: {
                        some: { ancestorId: query.areaId },
                      },
                    },
                  },
                ],
              },
            },
          }
        : {}),
      ...(query.coverageStatus
        ? {
            versions: {
              some: {
                coverageValidationStatus: query.coverageStatus,
              },
            },
          }
        : {}),
      ...(query.search
        ? {
            versions: {
              some: {
                originalContent: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.baket.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ updatedAt: query.sortOrder ?? 'desc' }, { id: 'asc' }],
        include: {
          createdByFieldOfficerAssignment: {
            include: {
              userProfile: true,
              role: true,
              areaScopes: {
                where: { validUntil: null },
                include: { area: true },
              },
            },
          },
          primaryJaring: true,
          reportCategory: true,
          taskAssignment: {
            include: {
              task: true,
              assigner: { include: { role: true } },
            },
          },
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 1,
            include: {
              eventArea: { include: administrativeAreaInclude },
              verification: true,
            },
          },
        },
      }),
      this.prisma.baket.count({ where }),
    ]);
    return {
      items: items.map((item) => ({
        ...item,
        versions: item.versions.map((version) => ({
          ...version,
          ...this.versionDisplayFields(version),
        })),
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  }

  async listVerifications(
    query: VerificationQuery,
    context: AuthorizationContext,
  ) {
    const baketScope = await this.scope.baketWhere(context);
    return this.prisma.baketVerification.findMany({
      where: {
        baketVersion: { baket: baketScope },
        ...(query.status ? { status: query.status } : {}),
        ...(query.verifiedByAssignmentId
          ? { verifiedByAssignmentId: query.verifiedByAssignmentId }
          : {}),
        ...(query.baketId ? { baketVersion: { baketId: query.baketId } } : {}),
        ...(query.areaId
          ? {
              baketVersion: {
                OR: [
                  { eventAreaId: query.areaId },
                  {
                    eventArea: {
                      ancestorLinks: { some: { ancestorId: query.areaId } },
                    },
                  },
                ],
              },
            }
          : {}),
        ...(query.reliability ? { sourceReliability: query.reliability } : {}),
        ...(query.credibility
          ? { informationCredibility: query.credibility }
          : {}),
        ...(query.from || query.to
          ? {
              createdAt: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {}),
              },
            }
          : {}),
      },
      take: query.limit,
      orderBy: { createdAt: 'desc' },
      include: {
        baketVersion: {
          include: {
            baket: true,
            eventArea: { include: administrativeAreaInclude },
          },
        },
        verifiedByAssignment: {
          include: { userProfile: true, role: true },
        },
      },
    });
  }
}
