import { Injectable } from '@nestjs/common';
import { AnalysisStatus, Prisma } from '../../generated/prisma/client.js';
import { ApiException } from '../../common/api/api-exception.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DomainScopeService } from '../access/domain-scope.service.js';
import type {
  AnalysisQuery,
  CreateAnalysisCaseDto,
  FinalizeAnalysisDto,
  UpdateAnalysisVersionDto,
} from './analysis.dto.js';

@Injectable()
export class AnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: DomainScopeService,
  ) {}

  private ensurePeriodOrder(periodStart?: string, periodEnd?: string) {
    if (
      periodStart &&
      periodEnd &&
      new Date(periodStart) > new Date(periodEnd)
    ) {
      throw new ApiException(
        'ANALYSIS_PERIOD_INVALID',
        'Period start must not be later than period end.',
        422,
      );
    }
  }

  private async audit(
    context: AuthorizationContext,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorUserProfileId: context.userProfileId,
        actorAssignmentId: context.primaryAssignmentId,
        action,
        entityType,
        entityId,
        ...(metadata ? { metadata } : {}),
      },
    });
  }

  private caseDetail(caseId: string) {
    return this.prisma.analysisCase.findUniqueOrThrow({
      where: { id: caseId },
      include: {
        ownerAssignment: true,
        createdByAssignment: {
          include: { userProfile: true, role: true },
        },
        sources: {
          include: {
            verification: {
              include: {
                baketVersion: {
                  include: {
                    eventArea: {
                      include: {
                        parent: {
                          include: {
                            parent: { include: { parent: true } },
                          },
                        },
                      },
                    },
                    baket: {
                      include: {
                        createdByFieldOfficerAssignment: {
                          include: {
                            userProfile: { include: { authUser: true } },
                            role: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            createdByAssignment: {
              include: { userProfile: true, role: true },
            },
            validatedByAssignment: {
              include: { userProfile: true, role: true },
            },
            entities: true,
            relationships: true,
          },
        },
      },
    });
  }

  private versionDetail(versionId: string) {
    return this.prisma.analysisVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: {
        analysisCase: true,
        createdByAssignment: {
          include: { userProfile: true, role: true },
        },
        validatedByAssignment: {
          include: { userProfile: true, role: true },
        },
        entities: true,
        relationships: {
          include: {
            fromEntity: true,
            toEntity: true,
          },
        },
      },
    });
  }

  private async getEditableVersion(versionId: string) {
    const version = await this.prisma.analysisVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: { analysisCase: true },
    });
    if (
      version.validatedAt !== null ||
      version.analysisCase.status === AnalysisStatus.ARCHIVED ||
      version.analysisCase.status === AnalysisStatus.VALIDATED ||
      version.versionNumber !== version.analysisCase.currentVersionNumber
    ) {
      throw new ApiException(
        'ANALYSIS_VERSION_IMMUTABLE',
        'Only the current non-archived analysis version can be changed.',
        409,
      );
    }
    return version;
  }

  private async assertVersionScope(
    context: AuthorizationContext,
    versionId: string,
  ) {
    const version = await this.prisma.analysisVersion.findUniqueOrThrow({
      where: { id: versionId },
      select: { analysisCaseId: true },
    });
    await this.scope.assertAnalysis(context, version.analysisCaseId);
  }

  async list(query: AnalysisQuery, context: AuthorizationContext) {
    const where: Prisma.AnalysisCaseWhereInput = {
      ...this.scope.analysisWhere(context),
      ...(query.status ? { status: query.status } : {}),
      ...(query.ownerAssignmentId
        ? { ownerAssignmentId: query.ownerAssignmentId }
        : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              {
                versions: {
                  some: {
                    OR: [
                      {
                        indications: {
                          contains: query.search,
                          mode: 'insensitive',
                        },
                      },
                      {
                        analysis: {
                          contains: query.search,
                          mode: 'insensitive',
                        },
                      },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.analysisCase.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ updatedAt: query.sortOrder ?? 'desc' }, { id: 'asc' }],
        include: {
          ownerAssignment: true,
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 1,
          },
          _count: {
            select: { sources: true, versions: true },
          },
        },
      }),
      this.prisma.analysisCase.count({ where }),
    ]);
    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async create(body: CreateAnalysisCaseDto, context: AuthorizationContext) {
    this.ensurePeriodOrder(body.periodStart, body.periodEnd);
    const analysisCase = await this.prisma.$transaction(async (tx) => {
      if (body.verificationIds?.length) {
        const baketWhere = await this.scope.baketWhere(context);
        const verifications = await tx.baketVerification.findMany({
          where: {
            id: { in: body.verificationIds },
            baketVersion: { baket: baketWhere },
          },
        });
        if (
          verifications.length !== body.verificationIds.length ||
          verifications.some(
            (verification) => verification.status !== 'VERIFIED',
          )
        ) {
          throw new ApiException(
            'ANALYSIS_SOURCE_VERIFICATION_NOT_READY',
            'All analysis source verifications must be VERIFIED.',
            422,
          );
        }
      }

      return tx.analysisCase.create({
        data: {
          ownerAssignmentId: context.primaryAssignmentId,
          createdByAssignmentId: context.primaryAssignmentId,
          title: body.title,
          periodStart: body.periodStart ? new Date(body.periodStart) : null,
          periodEnd: body.periodEnd ? new Date(body.periodEnd) : null,
          sources: body.verificationIds?.length
            ? {
                create: body.verificationIds.map((verificationId) => ({
                  verificationId,
                })),
              }
            : undefined,
          versions: {
            create: {
              versionNumber: 1,
              createdByAssignmentId: context.primaryAssignmentId,
            },
          },
        },
      });
    });

    await this.audit(
      context,
      'ANALYSIS.CREATE',
      'AnalysisCase',
      analysisCase.id,
    );
    return this.caseDetail(analysisCase.id);
  }

  async get(caseId: string, context: AuthorizationContext) {
    await this.scope.assertAnalysis(context, caseId);
    return this.caseDetail(caseId);
  }

  async finalize(
    caseId: string,
    body: FinalizeAnalysisDto,
    context: AuthorizationContext,
  ) {
    await this.scope.assertAnalysis(context, caseId);
    const analysisCase = await this.prisma.analysisCase.findUniqueOrThrow({
      where: { id: caseId },
      include: { _count: { select: { sources: true } } },
    });
    if (analysisCase.status === AnalysisStatus.VALIDATED) {
      return this.caseDetail(caseId);
    }
    if (
      analysisCase.status !== AnalysisStatus.DRAFT &&
      analysisCase.status !== AnalysisStatus.IN_REVIEW
    ) {
      throw new ApiException(
        'ANALYSIS_NOT_FINALIZABLE',
        'Only an active draft analysis can be finalized.',
        409,
      );
    }
    if (analysisCase._count.sources === 0) {
      throw new ApiException(
        'ANALYSIS_SOURCE_REQUIRED',
        'At least one verified Baket is required before finalization.',
        422,
      );
    }

    const version = await this.prisma.analysisVersion.findUniqueOrThrow({
      where: {
        analysisCaseId_versionNumber: {
          analysisCaseId: caseId,
          versionNumber: analysisCase.currentVersionNumber,
        },
      },
    });
    await this.prisma.$transaction([
      this.prisma.analysisVersion.update({
        where: { id: version.id },
        data: {
          indications: body.indications,
          analysis: body.analysis,
          impact: body.impact,
          efforts: body.efforts,
          recommendations: body.recommendations,
          validatedByAssignmentId: context.primaryAssignmentId,
          validatedAt: new Date(),
        },
      }),
      this.prisma.analysisCase.update({
        where: { id: caseId },
        data: { status: AnalysisStatus.VALIDATED },
      }),
    ]);
    await this.audit(context, 'ANALYSIS.FINALIZE', 'AnalysisCase', caseId, {
      versionId: version.id,
    });
    return this.caseDetail(caseId);
  }

  async getVersion(versionId: string, context: AuthorizationContext) {
    await this.assertVersionScope(context, versionId);
    return this.versionDetail(versionId);
  }

  async updateVersion(
    versionId: string,
    body: UpdateAnalysisVersionDto,
    context: AuthorizationContext,
  ) {
    await this.assertVersionScope(context, versionId);
    await this.getEditableVersion(versionId);
    await this.prisma.analysisVersion.update({
      where: { id: versionId },
      data: {
        indications: body.indications,
        analysis: body.analysis,
        impact: body.impact,
        efforts: body.efforts,
        recommendations: body.recommendations,
      },
    });
    await this.audit(
      context,
      'ANALYSIS.VERSION.UPDATE',
      'AnalysisVersion',
      versionId,
    );
    return this.versionDetail(versionId);
  }
}
