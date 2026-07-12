import { Injectable } from '@nestjs/common';
import { AnalysisStatus, Prisma } from '../../generated/prisma/client.js';
import { ApiException } from '../../common/api/api-exception.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  AnalysisQuery,
  ArchiveAnalysisDto,
  CreateAnalysisCaseDto,
  CreateAnalysisVersionDto,
  ReplaceEntitiesDto,
  ReplaceRelationshipsDto,
  ReplaceSourcesDto,
  UpdateAnalysisCaseDto,
  UpdateAnalysisVersionDto,
  ValidateAnalysisDto,
} from './analysis.dto.js';

@Injectable()
export class AnalysisService {
  constructor(private readonly prisma: PrismaService) {}

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
        ownerUnit: true,
        createdByAssignment: {
          include: { userProfile: true, position: true },
        },
        sources: {
          include: {
            verification: {
              include: {
                baketVersion: {
                  include: { baket: true, eventArea: true },
                },
              },
            },
          },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            createdByAssignment: {
              include: { userProfile: true, position: true },
            },
            validatedByAssignment: {
              include: { userProfile: true, position: true },
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
          include: { userProfile: true, position: true },
        },
        validatedByAssignment: {
          include: { userProfile: true, position: true },
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
      version.analysisCase.status === AnalysisStatus.ARCHIVED ||
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

  async list(query: AnalysisQuery) {
    return this.prisma.analysisCase.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.ownerUnitId ? { ownerUnitId: query.ownerUnitId } : {}),
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
      },
      take: query.limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        ownerUnit: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
        _count: {
          select: { sources: true, versions: true },
        },
      },
    });
  }

  async create(body: CreateAnalysisCaseDto, context: AuthorizationContext) {
    this.ensurePeriodOrder(body.periodStart, body.periodEnd);
    const analysisCase = await this.prisma.$transaction(async (tx) => {
      if (body.verificationIds?.length) {
        const verifications = await tx.baketVerification.findMany({
          where: { id: { in: body.verificationIds } },
        });
        if (
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
          ownerUnitId: body.ownerUnitId,
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

  async get(caseId: string) {
    return this.caseDetail(caseId);
  }

  async update(
    caseId: string,
    body: UpdateAnalysisCaseDto,
    context: AuthorizationContext,
  ) {
    this.ensurePeriodOrder(body.periodStart, body.periodEnd);
    const analysisCase = await this.prisma.analysisCase.findUniqueOrThrow({
      where: { id: caseId },
    });
    if (analysisCase.status === AnalysisStatus.ARCHIVED) {
      throw new ApiException(
        'ANALYSIS_CASE_IMMUTABLE',
        'Archived analysis case cannot be edited.',
        409,
      );
    }
    await this.prisma.analysisCase.update({
      where: { id: caseId },
      data: {
        title: body.title,
        ...(body.periodStart
          ? { periodStart: new Date(body.periodStart) }
          : {}),
        ...(body.periodEnd ? { periodEnd: new Date(body.periodEnd) } : {}),
      },
    });
    await this.audit(context, 'ANALYSIS.UPDATE', 'AnalysisCase', caseId);
    return this.caseDetail(caseId);
  }

  async replaceSources(
    caseId: string,
    body: ReplaceSourcesDto,
    context: AuthorizationContext,
  ) {
    const verifications = await this.prisma.baketVerification.findMany({
      where: { id: { in: body.verificationIds } },
    });
    if (
      verifications.some((verification) => verification.status !== 'VERIFIED')
    ) {
      throw new ApiException(
        'ANALYSIS_SOURCE_VERIFICATION_NOT_READY',
        'All analysis source verifications must be VERIFIED.',
        422,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.analysisSourceVerification.deleteMany({
        where: { analysisCaseId: caseId },
      });
      await tx.analysisSourceVerification.createMany({
        data: body.verificationIds.map((verificationId) => ({
          analysisCaseId: caseId,
          verificationId,
        })),
      });
    });
    await this.audit(
      context,
      'ANALYSIS.SOURCES.REPLACE',
      'AnalysisCase',
      caseId,
    );
    return (await this.caseDetail(caseId)).sources;
  }

  async versions(caseId: string) {
    return this.prisma.analysisVersion.findMany({
      where: { analysisCaseId: caseId },
      orderBy: { versionNumber: 'desc' },
      include: {
        createdByAssignment: {
          include: { userProfile: true, position: true },
        },
        validatedByAssignment: {
          include: { userProfile: true, position: true },
        },
        entities: true,
        relationships: true,
      },
    });
  }

  async createVersion(
    caseId: string,
    body: CreateAnalysisVersionDto,
    context: AuthorizationContext,
  ) {
    const analysisCase = await this.prisma.analysisCase.findUniqueOrThrow({
      where: { id: caseId },
    });
    if (analysisCase.status === AnalysisStatus.ARCHIVED) {
      throw new ApiException(
        'ANALYSIS_CASE_IMMUTABLE',
        'Archived analysis case cannot create new versions.',
        409,
      );
    }

    const version = await this.prisma.$transaction(async (tx) => {
      const baseVersion = body.basedOnVersionId
        ? await tx.analysisVersion.findUniqueOrThrow({
            where: { id: body.basedOnVersionId },
            include: { entities: true, relationships: true },
          })
        : await tx.analysisVersion.findFirstOrThrow({
            where: { analysisCaseId: caseId },
            orderBy: { versionNumber: 'desc' },
            include: { entities: true, relationships: true },
          });
      const nextVersionNumber = analysisCase.currentVersionNumber + 1;
      const created = await tx.analysisVersion.create({
        data: {
          analysisCaseId: caseId,
          versionNumber: nextVersionNumber,
          indications: body.indications ?? baseVersion.indications,
          analysis: body.analysis ?? baseVersion.analysis,
          impact: body.impact ?? baseVersion.impact,
          efforts: body.efforts ?? baseVersion.efforts,
          recommendations: body.recommendations ?? baseVersion.recommendations,
          ...(body.aiDraft
            ? { aiDraft: body.aiDraft as Prisma.InputJsonValue }
            : baseVersion.aiDraft !== null
              ? { aiDraft: baseVersion.aiDraft }
              : {}),
          createdByAssignmentId: context.primaryAssignmentId,
          entities: {
            create: baseVersion.entities.map((entity) => ({
              entityType: entity.entityType,
              name: entity.name,
              normalizedName: entity.normalizedName,
              metadata: entity.metadata ?? undefined,
            })),
          },
        },
      });
      await tx.analysisCase.update({
        where: { id: caseId },
        data: {
          currentVersionNumber: nextVersionNumber,
          status: AnalysisStatus.DRAFT,
        },
      });
      return created;
    });
    await this.audit(
      context,
      'ANALYSIS.VERSION.CREATE',
      'AnalysisCase',
      caseId,
      {
        versionId: version.id,
        versionNumber: version.versionNumber,
      },
    );
    return this.versionDetail(version.id);
  }

  async getVersion(versionId: string) {
    return this.versionDetail(versionId);
  }

  async updateVersion(
    versionId: string,
    body: UpdateAnalysisVersionDto,
    context: AuthorizationContext,
  ) {
    await this.getEditableVersion(versionId);
    await this.prisma.analysisVersion.update({
      where: { id: versionId },
      data: {
        indications: body.indications,
        analysis: body.analysis,
        impact: body.impact,
        efforts: body.efforts,
        recommendations: body.recommendations,
        ...(body.aiDraft
          ? { aiDraft: body.aiDraft as Prisma.InputJsonValue }
          : {}),
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

  async replaceEntities(
    versionId: string,
    body: ReplaceEntitiesDto,
    context: AuthorizationContext,
  ) {
    await this.getEditableVersion(versionId);
    await this.prisma.$transaction(async (tx) => {
      await tx.analysisEntity.deleteMany({
        where: { analysisVersionId: versionId },
      });
      if (body.entities.length > 0) {
        await tx.analysisEntity.createMany({
          data: body.entities.map((entity) => ({
            analysisVersionId: versionId,
            entityType: entity.entityType,
            name: entity.name,
            normalizedName: entity.normalizedName,
            metadata: entity.metadata as Prisma.InputJsonValue | undefined,
          })),
        });
      }
    });
    await this.audit(
      context,
      'ANALYSIS.ENTITIES.REPLACE',
      'AnalysisVersion',
      versionId,
    );
    return (await this.versionDetail(versionId)).entities;
  }

  async replaceRelationships(
    versionId: string,
    body: ReplaceRelationshipsDto,
    context: AuthorizationContext,
  ) {
    await this.getEditableVersion(versionId);
    await this.prisma.$transaction(async (tx) => {
      await tx.analysisRelationship.deleteMany({
        where: { analysisVersionId: versionId },
      });
      if (body.relationships.length > 0) {
        await tx.analysisRelationship.createMany({
          data: body.relationships.map((relationship) => ({
            analysisVersionId: versionId,
            fromEntityId: relationship.fromEntityId,
            toEntityId: relationship.toEntityId,
            relationshipType: relationship.relationshipType,
            description: relationship.description,
            confidence: relationship.confidence,
          })),
        });
      }
    });
    await this.audit(
      context,
      'ANALYSIS.RELATIONSHIPS.REPLACE',
      'AnalysisVersion',
      versionId,
    );
    return (await this.versionDetail(versionId)).relationships;
  }

  async validateVersion(
    versionId: string,
    body: ValidateAnalysisDto,
    context: AuthorizationContext,
  ) {
    const version = await this.getEditableVersion(versionId);
    await this.prisma.$transaction(async (tx) => {
      await tx.analysisVersion.update({
        where: { id: versionId },
        data: {
          validatedByAssignmentId: context.primaryAssignmentId,
          validatedAt: new Date(),
        },
      });
      await tx.analysisCase.update({
        where: { id: version.analysisCaseId },
        data: { status: AnalysisStatus.VALIDATED },
      });
    });
    await this.audit(
      context,
      'ANALYSIS.VALIDATE',
      'AnalysisVersion',
      versionId,
      {
        note: body.note ?? null,
      },
    );
    return this.versionDetail(versionId);
  }

  async graph(caseId: string) {
    const analysisCase = await this.caseDetail(caseId);
    const currentVersion = analysisCase.versions.find(
      (item) => item.versionNumber === analysisCase.currentVersionNumber,
    );
    return {
      caseId,
      versionId: currentVersion?.id ?? null,
      nodes: currentVersion?.entities ?? [],
      edges: currentVersion?.relationships ?? [],
    };
  }

  async traceability(caseId: string) {
    const analysisCase = await this.caseDetail(caseId);
    const products = await this.prisma.productSourceAnalysis.findMany({
      where: {
        analysisVersion: {
          analysisCaseId: caseId,
        },
      },
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
      caseId,
      sources: analysisCase.sources,
      versions: analysisCase.versions,
      products,
    };
  }

  async archive(
    caseId: string,
    body: ArchiveAnalysisDto,
    context: AuthorizationContext,
  ) {
    await this.prisma.analysisCase.update({
      where: { id: caseId },
      data: { status: AnalysisStatus.ARCHIVED },
    });
    await this.audit(context, 'ANALYSIS.ARCHIVE', 'AnalysisCase', caseId, {
      reason: body.reason ?? null,
    });
    return this.caseDetail(caseId);
  }
}
