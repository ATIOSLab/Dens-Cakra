import { Injectable } from '@nestjs/common';
import {
  InformationCredibility,
  RevisionRequestStatus,
  SourceReliability,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { BaketQuery, VerificationQuery } from './baket.dto.js';

@Injectable()
export class BaketQueryService {
  constructor(private readonly prisma: PrismaService) {}

  baketDetail(baketId: string) {
    return this.prisma.baket.findFirstOrThrow({
      where: { id: baketId, deletedAt: null },
      include: {
        createdByFieldOfficerAssignment: {
          include: { userProfile: true, position: true },
        },
        taskAssignment: {
          include: {
            task: true,
            assignee: { include: { userProfile: true, position: true } },
            assigner: { include: { userProfile: true, position: true } },
          },
        },
        primaryJaring: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            eventArea: true,
            createdByAssignment: {
              include: { userProfile: true, position: true },
            },
            sourceMessages: {
              include: {
                message: {
                  include: {
                    jaring: true,
                    resolvedArea: true,
                    validationIssues: true,
                  },
                },
              },
            },
            attachments: {
              include: { file: true },
            },
            verification: {
              include: {
                checks: true,
                crossReferences: true,
              },
            },
            coverageChecks: {
              include: {
                area: true,
                positionAssignment: {
                  include: { position: true, userProfile: true },
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
              include: { userProfile: true, position: true },
            },
          },
        },
        alerts: true,
      },
    });
  }

  baketVersionDetail(versionId: string) {
    return this.prisma.baketVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: {
        baket: true,
        eventArea: true,
        createdByAssignment: {
          include: { userProfile: true, position: true },
        },
        sourceMessages: {
          include: {
            message: {
              include: {
                jaring: true,
                resolvedArea: true,
                validationIssues: true,
              },
            },
          },
        },
        attachments: {
          include: { file: true },
        },
        verification: {
          include: {
            checks: true,
            crossReferences: {
              include: { relatedBaket: true },
            },
          },
        },
        coverageChecks: {
          include: {
            area: true,
            positionAssignment: {
              include: { position: true, userProfile: true },
            },
          },
        },
      },
    });
  }

  verificationDetail(verificationId: string) {
    return this.prisma.baketVerification.findUniqueOrThrow({
      where: { id: verificationId },
      include: {
        baketVersion: {
          include: {
            baket: true,
            eventArea: true,
            sourceMessages: {
              include: { message: true },
            },
          },
        },
        verifiedByAssignment: {
          include: { userProfile: true, position: true },
        },
        checks: true,
        crossReferences: {
          include: { relatedBaket: true },
        },
      },
    });
  }

  list(query: BaketQuery) {
    return this.prisma.baket.findMany({
      where: {
        deletedAt: null,
        ...(query.status ? { status: query.status } : {}),
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
        ...(query.areaId
          ? {
              versions: {
                some: {
                  OR: [
                    { eventAreaId: query.areaId },
                    {
                      eventArea: {
                        ancestorLinks: {
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
        ...(query.from || query.to
          ? {
              versions: {
                some: {
                  ...(query.from
                    ? { createdAt: { gte: new Date(query.from) } }
                    : {}),
                  ...(query.to
                    ? { createdAt: { lte: new Date(query.to) } }
                    : {}),
                },
              },
            }
          : {}),
        ...(query.search
          ? {
              versions: {
                some: {
                  OR: [
                    {
                      title: { contains: query.search, mode: 'insensitive' },
                    },
                    {
                      originalContent: {
                        contains: query.search,
                        mode: 'insensitive',
                      },
                    },
                  ],
                },
              },
            }
          : {}),
      },
      take: query.limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        primaryJaring: true,
        taskAssignment: {
          include: { task: true },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          include: {
            eventArea: true,
            verification: true,
          },
        },
      },
    });
  }

  versions(baketId: string) {
    return this.prisma.baketVersion.findMany({
      where: { baketId },
      orderBy: { versionNumber: 'desc' },
      include: {
        eventArea: true,
        verification: true,
        coverageChecks: true,
      },
    });
  }

  async timeline(baketId: string) {
    const baket = await this.baketDetail(baketId);
    const audit = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          { entityType: 'Baket', entityId: baketId },
          {
            entityType: 'BaketVersion',
            entityId: { in: baket.versions.map((version) => version.id) },
          },
          {
            entityType: 'BaketRevisionRequest',
            entityId: {
              in: baket.revisionRequests.map((request) => request.id),
            },
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
    const events = [
      ...baket.versions.map((version) => ({
        type: 'VERSION',
        at: version.createdAt,
        payload: version,
      })),
      ...baket.revisionRequests.map((request) => ({
        type: 'REVISION_REQUEST',
        at: request.createdAt,
        payload: request,
      })),
      ...baket.versions
        .filter((version) => version.verification)
        .map((version) => ({
          type: 'VERIFICATION',
          at: version.verification?.createdAt ?? version.createdAt,
          payload: version.verification,
        })),
      ...audit.map((entry) => ({
        type: 'AUDIT',
        at: entry.createdAt,
        payload: entry,
      })),
    ].sort((left, right) => left.at.getTime() - right.at.getTime());
    return { baketId, events };
  }

  async traceability(baketId: string) {
    const baket = await this.baketDetail(baketId);
    const versionIds = baket.versions.map((version) => version.id);
    const verificationIds = baket.versions
      .map((version) => version.verification?.id)
      .filter((value): value is string => Boolean(value));
    const analyses = await this.prisma.analysisSourceVerification.findMany({
      where: { verificationId: { in: verificationIds } },
      include: {
        analysisCase: {
          include: {
            versions: true,
          },
        },
      },
    });
    const products = await this.prisma.productSourceVerification.findMany({
      where: { verificationId: { in: verificationIds } },
      include: {
        productVersion: {
          include: {
            product: true,
            approvalWorkflow: {
              include: { steps: true },
            },
            distributions: true,
          },
        },
      },
    });
    return {
      baketId,
      versionIds,
      sourceMessages: baket.versions.flatMap((version) =>
        version.sourceMessages.map((source) => source.message),
      ),
      verifications: baket.versions
        .map((version) => version.verification)
        .filter(Boolean),
      analyses,
      products,
    };
  }

  revisionRequests(baketId: string, status?: RevisionRequestStatus) {
    return this.prisma.baketRevisionRequest.findMany({
      where: {
        baketId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        requestedAgainstVersion: true,
        resolvedByVersion: true,
        requestedByAssignment: {
          include: { userProfile: true, position: true },
        },
      },
    });
  }

  revisionRequestDetail(requestId: string) {
    return this.prisma.baketRevisionRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: {
        requestedAgainstVersion: true,
        resolvedByVersion: true,
        requestedByAssignment: {
          include: { userProfile: true, position: true },
        },
      },
    });
  }

  listVerifications(query: VerificationQuery) {
    return this.prisma.baketVerification.findMany({
      where: {
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
            eventArea: true,
          },
        },
        verifiedByAssignment: {
          include: { userProfile: true, position: true },
        },
        checks: true,
      },
    });
  }

  scoreLabel(
    reliability: SourceReliability | null,
    credibility: InformationCredibility | null,
  ) {
    if (!reliability || !credibility) {
      return null;
    }
    const credibilityMap: Record<InformationCredibility, string> = {
      [InformationCredibility.ONE]: '1',
      [InformationCredibility.TWO]: '2',
      [InformationCredibility.THREE]: '3',
      [InformationCredibility.FOUR]: '4',
      [InformationCredibility.FIVE]: '5',
      [InformationCredibility.SIX]: '6',
    };
    return `${reliability}${credibilityMap[credibility]}`;
  }
}
