import { Injectable } from '@nestjs/common';
import {
  AlertSeverity,
  AlertStatus,
  AnalysisStatus,
  ApprovalDecision,
  ApprovalEventType,
  ApprovalStage,
  ApprovalStepStatus,
  ApprovalWorkflowStatus,
  AreaResolutionMethod,
  CommandRouteType,
  CoordinateSource,
  DistributionStatus,
  EmergencyStatus,
  FileLifecycleStatus,
  NotificationType,
  PositionCode,
  Prisma,
  ProductStatus,
  RoleCode,
  TaskStatus,
  Classification,
} from '../../generated/prisma/client.js';
import { ApiException } from '../../common/api/api-exception.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { SpatialRepository } from '../spatial/spatial.repository.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DomainScopeService } from '../access/domain-scope.service.js';
import { formatProductNumber } from './product-number.util.js';
import type {
  ActivateTemplateDto,
  AlertQuery,
  AlertSummaryQuery,
  ApprovalInboxQuery,
  ArchiveProductDto,
  AssignAlertDto,
  CancelAlertDto,
  CancelEmergencyIncidentDto,
  CancelWorkflowDto,
  ClarificationDto,
  CreateAlertDto,
  CreateApprovalWorkflowDto,
  CreateDistributionDto,
  CreateEmergencyIncidentDto,
  CreateLocationPingDto,
  CreateProductDto,
  CreateProductRevisionDto,
  CreateProductTemplateDto,
  CreateProductTypeDto,
  DashboardAreaBreakdownQuery,
  DashboardDirectiveProgressQuery,
  DashboardQuery,
  DashboardTaskPerformanceQuery,
  DashboardTrendQuery,
  DashboardVerificationQualityQuery,
  DecisionNoteDto,
  DistributionQuery,
  EmergencyQuery,
  LocationHistoryQuery,
  MapAreaSummaryQuery,
  MapHeatmapQuery,
  MapReportQuery,
  MarkControlledDto,
  MarkDeliveredDto,
  PersonnelLocationMapQuery,
  ProductQuery,
  ProductTemplateListQuery,
  ProductTypeQuery,
  ProductVersionListQuery,
  RejectApprovalDto,
  ReplaceProductAttachmentsDto,
  ReplaceSourceAnalysesDto,
  ReplaceSourceVerificationsDto,
  ResolveAlertDto,
  ResolveEmergencyIncidentDto,
  RetryDistributionDto,
  RevokeDistributionDto,
  StartResponseDto,
  SubmitProductDto,
  UpdateAlertDto,
  UpdateEmergencyIncidentDto,
  UpdateProductTypeDto,
  UpdateProductDto,
  UpdateProductVersionDto,
  ValidateTemplateContentDto,
  VerifyEmergencyIncidentDto,
} from './intelligence-products.dto.js';

type OperationalRouteType = 'DIRECTORATE' | 'BINDA';

type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
};

type ValidationIssue = {
  field: string;
  code: string;
  message: string;
};

const EDITABLE_PRODUCT_STATUSES: ProductStatus[] = [
  ProductStatus.DRAFT,
  ProductStatus.NEEDS_REVISION,
];

const USABLE_FILE_STATUSES: FileLifecycleStatus[] = [
  FileLifecycleStatus.CLEAN,
  FileLifecycleStatus.UPLOADED,
];

@Injectable()
export class IntelligenceProductsService {
  private readonly locationPingSelect = {
    id: true,
    positionAssignmentId: true,
    areaId: true,
    latitude: true,
    longitude: true,
    gpsAccuracyMeters: true,
    coordinateSource: true,
    areaResolutionMethod: true,
    capturedAt: true,
    receivedAt: true,
    isStealth: true,
    area: true,
    positionAssignment: {
      include: { position: true, userProfile: true },
    },
  } satisfies Prisma.PersonnelLocationPingSelect;

  private readonly ownLocationPingSelect = {
    id: true,
    positionAssignmentId: true,
    areaId: true,
    latitude: true,
    longitude: true,
    gpsAccuracyMeters: true,
    coordinateSource: true,
    areaResolutionMethod: true,
    capturedAt: true,
    receivedAt: true,
    isStealth: true,
    area: true,
  } satisfies Prisma.PersonnelLocationPingSelect;

  constructor(
    private readonly prisma: PrismaService,
    private readonly spatial: SpatialRepository,
    private readonly scope: DomainScopeService,
  ) {}

  private assertProductClassification(classification: Classification) {
    if (classification === Classification.BIASA) {
      throw new ApiException(
        'PRODUCT_CLASSIFICATION_INVALID',
        'Produk intelijen hanya dapat memakai SANGAT_RAHASIA, RAHASIA, atau TERBATAS.',
        422,
      );
    }
  }

  private async allocateProductNumber(
    productTypeId: string,
    classification: Classification,
  ) {
    const now = new Date();
    const [productType, sequence] = await this.prisma.$transaction(
      async (tx) => {
        const type = await tx.productTypeDefinition.findUniqueOrThrow({
          where: { id: productTypeId },
        });
        const next = await tx.productNumberSequence.upsert({
          where: {
            productTypeId_year: { productTypeId, year: now.getFullYear() },
          },
          create: { productTypeId, year: now.getFullYear(), lastNumber: 1 },
          update: { lastNumber: { increment: 1 } },
        });
        return [type, next] as const;
      },
    );
    return formatProductNumber({
      classification: classification as Exclude<Classification, 'BIASA'>,
      productCode: productType.numberCode,
      sequence: sequence.lastNumber,
      date: now,
    });
  }

  private paginate(page: number, limit: number, total: number) {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  private ensureDateOrder(
    from?: string,
    to?: string,
    code = 'DATE_RANGE_INVALID',
  ) {
    if (from && to && new Date(from) > new Date(to)) {
      throw new ApiException(
        code,
        'Start date must not be later than end date.',
        422,
      );
    }
  }

  private ensureCoordinatePair(latitude?: number, longitude?: number) {
    const count =
      Number(latitude !== undefined) + Number(longitude !== undefined);
    if (count === 1) {
      throw new ApiException(
        'COORDINATE_PAIR_REQUIRED',
        'Latitude and longitude must be provided together.',
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

  private async notifyUsers(
    userProfileIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
  ) {
    const ids = [...new Set(userProfileIds)];
    if (ids.length === 0) {
      return;
    }
    await this.prisma.notification.createMany({
      data: ids.map((userProfileId) => ({
        userProfileId,
        type,
        title,
        message,
        link,
      })),
    });
  }

  private async notifyPosition(
    positionId: string | null | undefined,
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
  ) {
    if (!positionId) {
      return;
    }
    const assignments = await this.prisma.userSeatAssignment.findMany({
      where: {
        positionId,
        isActive: true,
        validUntil: null,
      },
      select: { userProfileId: true },
    });
    await this.notifyUsers(
      assignments.map((assignment) => assignment.userProfileId),
      type,
      title,
      message,
      link,
    );
  }

  private async notifyAssignment(
    assignmentId: string | null | undefined,
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
  ) {
    if (!assignmentId) {
      return;
    }
    const assignment = await this.prisma.userSeatAssignment.findUnique({
      where: { id: assignmentId },
      select: { userProfileId: true },
    });
    if (!assignment) {
      return;
    }
    await this.notifyUsers(
      [assignment.userProfileId],
      type,
      title,
      message,
      link,
    );
  }

  private async resolveArea(latitude?: number, longitude?: number) {
    if (latitude === undefined || longitude === undefined) {
      return {
        areaId: null as string | null,
        method: AreaResolutionMethod.UNRESOLVED,
      };
    }

    const matches = await this.spatial.findContainingAreas(latitude, longitude);
    const resolved = matches[0];

    return {
      areaId: resolved?.areaId ?? null,
      method: resolved
        ? AreaResolutionMethod.POLYGON_MATCH
        : AreaResolutionMethod.UNRESOLVED,
    };
  }

  private getContentValue(
    content: Record<string, unknown>,
    sectionCode: string,
    fieldCode: string,
  ) {
    const sectionValue = content[sectionCode];
    if (
      sectionValue &&
      typeof sectionValue === 'object' &&
      !Array.isArray(sectionValue) &&
      fieldCode in sectionValue
    ) {
      return (sectionValue as Record<string, unknown>)[fieldCode];
    }
    return content[fieldCode];
  }

  private validateFieldValue(
    fieldPath: string,
    dataType: string,
    validation: Record<string, unknown> | null | undefined,
    value: unknown,
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    if (value === null || value === undefined || value === '') {
      return issues;
    }

    const kind = dataType.toLowerCase();
    const addTypeError = (expected: string) =>
      issues.push({
        field: fieldPath,
        code: 'INVALID_TYPE',
        message: `Expected ${expected}.`,
      });

    if (
      ['text', 'string', 'richtext'].includes(kind) &&
      typeof value !== 'string'
    ) {
      addTypeError('string');
    }
    if (
      ['number', 'float', 'decimal'].includes(kind) &&
      typeof value !== 'number'
    ) {
      addTypeError('number');
    }
    if (['int', 'integer'].includes(kind) && !Number.isInteger(value)) {
      addTypeError('integer');
    }
    if (kind === 'boolean' && typeof value !== 'boolean') {
      addTypeError('boolean');
    }
    if (kind === 'array' && !Array.isArray(value)) {
      addTypeError('array');
    }
    if (
      ['object', 'json'].includes(kind) &&
      (typeof value !== 'object' || Array.isArray(value))
    ) {
      addTypeError('object');
    }
    if (['date', 'datetime'].includes(kind)) {
      const parsed = new Date(String(value));
      if (Number.isNaN(parsed.getTime())) {
        issues.push({
          field: fieldPath,
          code: 'INVALID_DATE',
          message: 'Value must be a valid ISO date.',
        });
      }
    }
    if (kind === 'uuid') {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (typeof value !== 'string' || !uuidRegex.test(value)) {
        issues.push({
          field: fieldPath,
          code: 'INVALID_UUID',
          message: 'Value must be a valid UUID.',
        });
      }
    }

    if (typeof value === 'string' && validation) {
      const minLength = validation.minLength;
      const maxLength = validation.maxLength;
      if (typeof minLength === 'number' && value.length < minLength) {
        issues.push({
          field: fieldPath,
          code: 'MIN_LENGTH',
          message: `Minimum length is ${minLength}.`,
        });
      }
      if (typeof maxLength === 'number' && value.length > maxLength) {
        issues.push({
          field: fieldPath,
          code: 'MAX_LENGTH',
          message: `Maximum length is ${maxLength}.`,
        });
      }
    }

    if (validation?.options && Array.isArray(validation.options)) {
      if (!validation.options.includes(value)) {
        issues.push({
          field: fieldPath,
          code: 'INVALID_OPTION',
          message: 'Value is not in the allowed options.',
        });
      }
    }

    return issues;
  }

  private async validateTemplateContentInternal(
    templateId: string,
    content: Record<string, unknown>,
  ) {
    const template = await this.prisma.productTemplate.findUniqueOrThrow({
      where: { id: templateId },
      include: {
        sections: {
          orderBy: { orderNumber: 'asc' },
          include: {
            fields: {
              orderBy: { orderNumber: 'asc' },
            },
          },
        },
      },
    });

    const errors: ValidationIssue[] = [];

    for (const section of template.sections) {
      if (section.isRepeatable) {
        const sectionValue = content[section.code];
        if (sectionValue === undefined || sectionValue === null) {
          continue;
        }
        if (!Array.isArray(sectionValue)) {
          errors.push({
            field: section.code,
            code: 'INVALID_SECTION_TYPE',
            message: 'Repeatable section must be an array.',
          });
          continue;
        }
        sectionValue.forEach((item, index) => {
          const row = item as Record<string, unknown>;
          for (const field of section.fields) {
            const fieldPath = `${section.code}[${index}].${field.code}`;
            const value = row?.[field.code];
            if (
              field.isRequired &&
              (value === undefined || value === null || value === '')
            ) {
              errors.push({
                field: fieldPath,
                code: 'REQUIRED',
                message: 'Value is required.',
              });
              continue;
            }
            errors.push(
              ...this.validateFieldValue(
                fieldPath,
                field.dataType,
                field.validation as Record<string, unknown> | undefined,
                value,
              ),
            );
          }
        });
        continue;
      }

      for (const field of section.fields) {
        const fieldPath = `${section.code}.${field.code}`;
        const value = this.getContentValue(content, section.code, field.code);
        if (
          field.isRequired &&
          (value === undefined || value === null || value === '')
        ) {
          errors.push({
            field: fieldPath,
            code: 'REQUIRED',
            message: 'Value is required.',
          });
          continue;
        }
        errors.push(
          ...this.validateFieldValue(
            fieldPath,
            field.dataType,
            field.validation as Record<string, unknown> | undefined,
            value,
          ),
        );
      }
    }

    return {
      valid: errors.length === 0,
      template,
      errors,
      warnings: [] as ValidationIssue[],
    };
  }

  private async productDetail(productId: string) {
    return this.prisma.intelligenceProduct.findFirstOrThrow({
      where: { id: productId, deletedAt: null },
      include: {
        productType: true,
        ownerUnit: true,
        createdByAssignment: {
          include: { userProfile: true, position: true },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            template: {
              include: {
                sections: {
                  orderBy: { orderNumber: 'asc' },
                  include: {
                    fields: {
                      orderBy: { orderNumber: 'asc' },
                    },
                  },
                },
              },
            },
            createdByAssignment: {
              include: { userProfile: true, position: true },
            },
            sourceVerifications: {
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
                                position: true,
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
            sourceAnalyses: {
              include: {
                analysisVersion: {
                  include: {
                    analysisCase: {
                      include: {
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
                                            parent: {
                                              include: { parent: true },
                                            },
                                          },
                                        },
                                      },
                                    },
                                    baket: {
                                      include: {
                                        createdByFieldOfficerAssignment: {
                                          include: {
                                            userProfile: {
                                              include: { authUser: true },
                                            },
                                            position: true,
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
                      },
                    },
                  },
                },
              },
            },
            attachments: {
              include: { file: true },
            },
            approvalWorkflow: {
              include: {
                steps: {
                  orderBy: { stepNumber: 'asc' },
                  include: {
                    targetPosition: true,
                    decidedByAssignment: {
                      include: { userProfile: true, position: true },
                    },
                  },
                },
                events: {
                  orderBy: { createdAt: 'asc' },
                },
              },
            },
            distributions: {
              include: {
                targetUnit: true,
                targetPosition: true,
                targetUser: true,
              },
            },
          },
        },
      },
    });
  }

  private async productVersionDetail(versionId: string) {
    return this.prisma.productVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: {
        product: {
          include: {
            productType: true,
            ownerUnit: true,
          },
        },
        template: {
          include: {
            sections: {
              orderBy: { orderNumber: 'asc' },
              include: {
                fields: {
                  orderBy: { orderNumber: 'asc' },
                },
              },
            },
          },
        },
        createdByAssignment: {
          include: { userProfile: true, position: true },
        },
        sourceVerifications: {
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
                            position: true,
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
        sourceAnalyses: {
          include: {
            analysisVersion: {
              include: {
                analysisCase: {
                  include: {
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
                                        parent: {
                                          include: { parent: true },
                                        },
                                      },
                                    },
                                  },
                                },
                                baket: {
                                  include: {
                                    createdByFieldOfficerAssignment: {
                                      include: {
                                        userProfile: {
                                          include: { authUser: true },
                                        },
                                        position: true,
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
                  },
                },
              },
            },
          },
        },
        attachments: {
          include: { file: true },
        },
        approvalWorkflow: {
          include: {
            steps: {
              orderBy: { stepNumber: 'asc' },
              include: {
                targetPosition: true,
                decidedByAssignment: {
                  include: { userProfile: true, position: true },
                },
              },
            },
            events: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        distributions: {
          include: {
            targetUnit: true,
            targetPosition: true,
            targetUser: true,
          },
        },
      },
    });
  }

  private async approvalWorkflowDetail(workflowId: string) {
    return this.prisma.productApprovalWorkflow.findUniqueOrThrow({
      where: { id: workflowId },
      include: {
        productVersion: {
          include: {
            product: true,
            template: true,
          },
        },
        steps: {
          orderBy: { stepNumber: 'asc' },
          include: {
            targetPosition: {
              include: { organizationUnit: true },
            },
            decidedByAssignment: {
              include: { userProfile: true, position: true },
            },
          },
        },
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  private async distributionDetail(distributionId: string) {
    return this.prisma.productDistribution.findUniqueOrThrow({
      where: { id: distributionId },
      include: {
        productVersion: {
          include: {
            product: true,
          },
        },
        sentByAssignment: {
          include: { userProfile: true, position: true },
        },
        targetUnit: true,
        targetPosition: true,
        targetUser: true,
      },
    });
  }

  private async assertProductVersionScope(
    versionId: string,
    context: AuthorizationContext,
  ) {
    const version = await this.prisma.productVersion.findUnique({
      where: { id: versionId },
      select: { productId: true },
    });
    if (!version) {
      throw new ApiException('RESOURCE_NOT_FOUND', 'Resource not found.', 404);
    }
    await this.scope.assertProduct(context, version.productId);
    return version;
  }

  private async getEditableProductVersion(
    versionId: string,
    context: AuthorizationContext,
  ) {
    await this.assertProductVersionScope(versionId, context);
    const version = await this.prisma.productVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: { product: true },
    });

    if (
      !EDITABLE_PRODUCT_STATUSES.includes(version.product.status) ||
      version.versionNumber !== version.product.currentVersionNumber
    ) {
      throw new ApiException(
        'PRODUCT_VERSION_IMMUTABLE',
        'Only the current draft or needs-revision product version can be changed.',
        409,
      );
    }

    return version;
  }

  private async validateVerificationSources(
    ids: string[],
    context?: AuthorizationContext,
  ) {
    if (ids.length === 0) {
      return;
    }
    const rows = await this.prisma.baketVerification.findMany({
      where: {
        id: { in: ids },
        ...(context
          ? { baketVersion: { baket: await this.scope.baketWhere(context) } }
          : {}),
      },
      include: {
        baketVersion: true,
      },
    });
    if (
      rows.length !== ids.length ||
      rows.some((row) => row.status !== 'VERIFIED')
    ) {
      throw new ApiException(
        'PRODUCT_SOURCE_VERIFICATION_INVALID',
        'All source verifications must exist and be VERIFIED.',
        422,
      );
    }
  }

  private async validateAnalysisSources(
    ids: string[],
    context?: AuthorizationContext,
  ) {
    if (ids.length === 0) {
      return;
    }
    const rows = await this.prisma.analysisVersion.findMany({
      where: {
        id: { in: ids },
        ...(context ? { analysisCase: this.scope.analysisWhere(context) } : {}),
      },
      include: {
        analysisCase: true,
      },
    });
    if (
      rows.length !== ids.length ||
      rows.some(
        (row) =>
          row.validatedAt === null ||
          row.analysisCase.status !== AnalysisStatus.VALIDATED,
      )
    ) {
      throw new ApiException(
        'PRODUCT_SOURCE_ANALYSIS_INVALID',
        'All source analyses must be validated before use.',
        422,
      );
    }
  }

  private async validateClassificationFloor(
    classification: Classification,
    verificationIds: string[],
    analysisVersionIds: string[],
  ) {
    const include = {
      baketVersion: {
        include: {
          baket: {
            include: {
              taskAssignment: {
                include: { task: { include: { directiveVersion: true } } },
              },
            },
          },
        },
      },
    } as const;
    const [directSources, analysisSources] = await Promise.all([
      this.prisma.baketVerification.findMany({
        where: { id: { in: verificationIds } },
        include,
      }),
      this.prisma.analysisVersion.findMany({
        where: { id: { in: analysisVersionIds } },
        include: {
          analysisCase: {
            include: {
              sources: { include: { verification: { include } } },
            },
          },
        },
      }),
    ]);
    const sourceClassifications = [
      ...directSources.map(
        (source) =>
          source.baketVersion.baket.taskAssignment?.task.directiveVersion
            ?.classification,
      ),
      ...analysisSources.flatMap((source) =>
        source.analysisCase.sources.map(
          (item) =>
            item.verification.baketVersion.baket.taskAssignment?.task
              .directiveVersion?.classification,
        ),
      ),
    ].filter((value): value is Classification => Boolean(value));
    const rank: Record<Classification, number> = {
      BIASA: 0,
      TERBATAS: 1,
      RAHASIA: 2,
      SANGAT_RAHASIA: 3,
    };
    if (
      sourceClassifications.some(
        (source) => rank[classification] < rank[source],
      )
    ) {
      throw new ApiException(
        'PRODUCT_CLASSIFICATION_BELOW_SOURCE',
        'Klasifikasi produk tidak boleh lebih rendah daripada klasifikasi sumbernya.',
        422,
      );
    }
  }

  private async validateAttachmentFiles(
    attachments: Array<{ fileId: string; caption?: string }>,
  ) {
    if (attachments.length === 0) {
      return;
    }
    const files = await this.prisma.fileAsset.findMany({
      where: { id: { in: attachments.map((item) => item.fileId) } },
    });
    if (
      files.length !== attachments.length ||
      files.some((file) => !USABLE_FILE_STATUSES.includes(file.lifecycleStatus))
    ) {
      throw new ApiException(
        'PRODUCT_ATTACHMENT_INVALID',
        'All attachments must exist and be clean or uploaded.',
        422,
      );
    }
  }

  private async buildProductValidation(versionId: string) {
    const version = await this.productVersionDetail(versionId);
    const validation = await this.validateTemplateContentInternal(
      version.templateId,
      version.content as Record<string, unknown>,
    );
    const errors = [...validation.errors];
    const warnings: ValidationIssue[] = [];

    if (!version.routingTo) {
      errors.push({
        field: 'routingTo',
        code: 'REQUIRED',
        message: 'Routing destination is required.',
      });
    }
    if (!version.subject) {
      errors.push({
        field: 'subject',
        code: 'REQUIRED',
        message: 'Subject is required.',
      });
    }
    if (
      version.sourceVerifications.length === 0 &&
      version.sourceAnalyses.length === 0
    ) {
      errors.push({
        field: 'sources',
        code: 'SOURCE_REQUIRED',
        message:
          'At least one verified source or validated analysis is required.',
      });
    }
    if (
      version.product.periodStart &&
      version.product.periodEnd &&
      version.product.periodStart > version.product.periodEnd
    ) {
      errors.push({
        field: 'period',
        code: 'INVALID_RANGE',
        message: 'Product period start must not be later than period end.',
      });
    }
    if (!version.routingFrom) {
      warnings.push({
        field: 'routingFrom',
        code: 'RECOMMENDED',
        message: 'Routing from is recommended for traceability.',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      versionId,
      productId: version.productId,
    };
  }

  private async buildWorkflowTargets(assignmentId: string) {
    const creator = await this.prisma.userSeatAssignment.findUniqueOrThrow({
      where: { id: assignmentId },
      include: {
        position: true,
      },
    });

    if (!creator.position.reportsToPositionId) {
      throw new ApiException(
        'APPROVAL_ROUTE_UNRESOLVED',
        'Regional approver could not be resolved from reporting line.',
        422,
      );
    }

    const regional = await this.prisma.position.findUniqueOrThrow({
      where: { id: creator.position.reportsToPositionId },
    });

    return {
      regionalTargetPositionId: regional.id,
    };
  }

  private async resolveSeatIdForPosition(
    client: Prisma.TransactionClient | PrismaService,
    positionId: string,
  ) {
    const position = await client.position.findUniqueOrThrow({
      where: { id: positionId },
      select: {
        id: true,
        roleId: true,
        organizationUnitId: true,
        branch: true,
      },
    });

    const existingSeat = await client.organizationRoleSeat.findFirst({
      where: {
        organizationUnitId: position.organizationUnitId,
        roleId: position.roleId,
        ...(position.branch ? { branch: position.branch } : { branch: null }),
      },
      select: { id: true },
    });

    if (existingSeat) {
      return existingSeat.id;
    }

    const seat = await client.organizationRoleSeat.create({
      data: {
        organizationUnitId: position.organizationUnitId,
        roleId: position.roleId,
        ...(position.branch ? { branch: position.branch } : {}),
        positionId: position.id,
        isActive: true,
      },
      select: { id: true },
    });

    return seat.id;
  }

  private resolveOperationalRoute(
    routeType: CommandRouteType | null | undefined,
  ): OperationalRouteType {
    if (
      routeType === CommandRouteType.BINDA ||
      routeType === CommandRouteType.DIRECTORATE
    ) {
      return routeType;
    }
    if (!routeType) {
      return CommandRouteType.DIRECTORATE;
    }
    throw new ApiException(
      'APPROVAL_ROUTE_INVALID',
      'Approval workflow route must be BINDA or DIRECTORATE.',
      422,
    );
  }

  private async createWorkflowTx(
    tx: Prisma.TransactionClient,
    versionId: string,
    routeType: OperationalRouteType,
    regionalTargetPositionId: string,
    actorAssignmentId: string,
  ) {
    const existing = await tx.productApprovalWorkflow.findUnique({
      where: { productVersionId: versionId },
    });
    if (existing) {
      return existing.id;
    }

    const regionalTargetSeatId = await this.resolveSeatIdForPosition(
      tx,
      regionalTargetPositionId,
    );
    const workflow = await tx.productApprovalWorkflow.create({
      data: {
        productVersionId: versionId,
        routeType,
        status: ApprovalWorkflowStatus.IN_PROGRESS,
        currentStepNumber: 1,
        steps: {
          create: {
            stepNumber: 1,
            stage: ApprovalStage.REGIONAL,
            targetSeatId: regionalTargetSeatId,
            targetPositionId: regionalTargetPositionId,
            status: ApprovalStepStatus.ACTIVE,
            activatedAt: new Date(),
          },
        },
      },
    });

    await tx.productApprovalEvent.create({
      data: {
        workflowId: workflow.id,
        eventType: ApprovalEventType.ACTIVATED,
        actorAssignmentId,
        note: 'Approval workflow created.',
      },
    });

    return workflow.id;
  }

  private async ensureLocationAccess(
    assignmentId: string,
    context: AuthorizationContext,
  ) {
    if (assignmentId === context.primaryAssignmentId) {
      return;
    }

    const target = await this.prisma.userSeatAssignment.findUniqueOrThrow({
      where: { id: assignmentId },
      include: {
        position: true,
      },
    });

    let currentPositionId: string | null | undefined =
      target.position.reportsToPositionId;
    while (currentPositionId) {
      if (currentPositionId === context.positionId) {
        return;
      }
      const current: { reportsToPositionId: string | null } | null =
        await this.prisma.position.findUnique({
          where: { id: currentPositionId },
          select: { reportsToPositionId: true },
        });
      currentPositionId = current?.reportsToPositionId;
    }

    throw new ApiException(
      'LOCATION_ACCESS_FORBIDDEN',
      'Caller is not allowed to access this personnel location.',
      403,
    );
  }

  private toCursorPage<T extends { id: string }>(
    items: T[],
    limit: number,
  ): CursorPage<T> {
    return {
      items: items.slice(0, limit),
      nextCursor: items.length > limit ? items[limit].id : null,
    };
  }

  async listProductTypes(query: ProductTypeQuery) {
    return this.prisma.productTypeDefinition.findMany({
      where: query.isActive === undefined ? {} : { isActive: query.isActive },
      orderBy: { name: 'asc' },
      include: {
        templates: {
          where: { isActive: true },
          take: 1,
          orderBy: { versionNumber: 'desc' },
        },
      },
    });
  }

  async createProductType(
    body: CreateProductTypeDto,
    context: AuthorizationContext,
  ) {
    const created = await this.prisma.productTypeDefinition.create({
      data: body,
    });
    await this.audit(
      context,
      'PRODUCT_TYPE.CREATE',
      'ProductTypeDefinition',
      created.id,
    );
    return created;
  }

  async updateProductType(
    productTypeId: string,
    body: UpdateProductTypeDto,
    context: AuthorizationContext,
  ) {
    const updated = await this.prisma.productTypeDefinition.update({
      where: { id: productTypeId },
      data: body,
    });
    await this.audit(
      context,
      'PRODUCT_TYPE.UPDATE',
      'ProductTypeDefinition',
      productTypeId,
    );
    return updated;
  }

  async listTemplates(productTypeId: string, query: ProductTemplateListQuery) {
    return this.prisma.productTemplate.findMany({
      where: {
        productTypeId,
        ...(query.activeOnly ? { isActive: true } : {}),
      },
      orderBy: { versionNumber: 'desc' },
      include: {
        sections: {
          orderBy: { orderNumber: 'asc' },
          include: {
            fields: {
              orderBy: { orderNumber: 'asc' },
            },
          },
        },
      },
    });
  }

  async createTemplate(
    productTypeId: string,
    body: CreateProductTemplateDto,
    context: AuthorizationContext,
  ) {
    const template = await this.prisma.$transaction(async (tx) => {
      const last = await tx.productTemplate.findFirst({
        where: { productTypeId },
        orderBy: { versionNumber: 'desc' },
      });

      if (body.activate) {
        await tx.productTemplate.updateMany({
          where: { productTypeId },
          data: { isActive: false },
        });
      }

      return tx.productTemplate.create({
        data: {
          productTypeId,
          versionNumber: (last?.versionNumber ?? 0) + 1,
          name: body.name,
          isActive: body.activate === true,
          sections: {
            create: body.sections.map((section) => ({
              code: section.code,
              title: section.title,
              orderNumber: section.orderNumber,
              isRepeatable: section.isRepeatable,
              fields: {
                create: section.fields.map((field) => ({
                  code: field.code,
                  label: field.label,
                  dataType: field.dataType,
                  isRequired: field.isRequired,
                  orderNumber: field.orderNumber,
                  validation: field.validation as
                    Prisma.InputJsonValue | undefined,
                })),
              },
            })),
          },
        },
      });
    });

    await this.audit(
      context,
      'PRODUCT_TEMPLATE.CREATE',
      'ProductTemplate',
      template.id,
    );
    return this.getTemplate(template.id);
  }

  async getTemplate(templateId: string) {
    return this.prisma.productTemplate.findUniqueOrThrow({
      where: { id: templateId },
      include: {
        productType: true,
        sections: {
          orderBy: { orderNumber: 'asc' },
          include: {
            fields: {
              orderBy: { orderNumber: 'asc' },
            },
          },
        },
      },
    });
  }

  async activateTemplate(
    templateId: string,
    body: ActivateTemplateDto,
    context: AuthorizationContext,
  ) {
    const template = await this.prisma.productTemplate.findUniqueOrThrow({
      where: { id: templateId },
    });
    await this.prisma.$transaction(async (tx) => {
      await tx.productTemplate.updateMany({
        where: { productTypeId: template.productTypeId },
        data: { isActive: false },
      });
      await tx.productTemplate.update({
        where: { id: templateId },
        data: { isActive: true },
      });
    });
    await this.audit(
      context,
      'PRODUCT_TEMPLATE.ACTIVATE',
      'ProductTemplate',
      templateId,
      {
        reason: body.reason,
      },
    );
    return this.getTemplate(templateId);
  }

  async validateTemplate(templateId: string, body: ValidateTemplateContentDto) {
    const result = await this.validateTemplateContentInternal(
      templateId,
      body.content,
    );
    return {
      valid: result.valid,
      errors: result.errors,
      warnings: result.warnings,
    };
  }

  async listProducts(query: ProductQuery, context: AuthorizationContext) {
    this.ensureDateOrder(
      query.periodFrom,
      query.periodTo,
      'PRODUCT_PERIOD_INVALID',
    );
    const where: Prisma.IntelligenceProductWhereInput = {
      ...(await this.scope.productWhere(context)),
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.classification ? { classification: query.classification } : {}),
      ...(query.productTypeId ? { productTypeId: query.productTypeId } : {}),
      ...(query.ownerUnitId ? { ownerUnitId: query.ownerUnitId } : {}),
      ...(query.createdByAssignmentId
        ? { createdByAssignmentId: query.createdByAssignmentId }
        : {}),
      ...(query.periodFrom || query.periodTo
        ? {
            OR: [
              {
                periodStart: {
                  ...(query.periodFrom
                    ? { gte: new Date(query.periodFrom) }
                    : {}),
                  ...(query.periodTo ? { lte: new Date(query.periodTo) } : {}),
                },
              },
              {
                periodEnd: {
                  ...(query.periodFrom
                    ? { gte: new Date(query.periodFrom) }
                    : {}),
                  ...(query.periodTo ? { lte: new Date(query.periodTo) } : {}),
                },
              },
            ],
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              {
                productNumber: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                versions: {
                  some: {
                    subject: {
                      contains: query.search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.intelligenceProduct.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy:
          query.sortBy === 'periodStart'
            ? [
                {
                  periodStart: {
                    sort: query.sortOrder ?? 'desc',
                    nulls: 'last',
                  },
                },
                { id: 'asc' },
              ]
            : [{ updatedAt: query.sortOrder ?? 'desc' }, { id: 'asc' }],
        include: {
          productType: true,
          ownerUnit: true,
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 1,
            include: {
              template: true,
              approvalWorkflow: true,
              distributions: true,
            },
          },
        },
      }),
      this.prisma.intelligenceProduct.count({ where }),
    ]);

    return {
      items,
      pagination: this.paginate(query.page, query.limit, total),
    };
  }

  async createProduct(body: CreateProductDto, context: AuthorizationContext) {
    this.assertProductClassification(body.classification);
    this.ensureDateOrder(
      body.periodStart,
      body.periodEnd,
      'PRODUCT_PERIOD_INVALID',
    );
    await this.validateVerificationSources(
      body.version.sourceVerificationIds ?? [],
      context,
    );
    await this.validateAnalysisSources(
      body.version.sourceAnalysisVersionIds ?? [],
      context,
    );
    await this.validateClassificationFloor(
      body.classification,
      body.version.sourceVerificationIds ?? [],
      body.version.sourceAnalysisVersionIds ?? [],
    );
    await this.validateAttachmentFiles(body.version.attachmentFileIds ?? []);
    if (
      (body.version.sourceVerificationIds?.length ?? 0) +
        (body.version.sourceAnalysisVersionIds?.length ?? 0) ===
      0
    ) {
      throw new ApiException(
        'PRODUCT_SOURCE_REQUIRED',
        'At least one verified source or validated analysis is required.',
        422,
      );
    }
    const templateValidation = await this.validateTemplateContentInternal(
      body.version.templateId,
      body.version.content,
    );
    if (!templateValidation.valid) {
      throw new ApiException(
        'PRODUCT_TEMPLATE_VALIDATION_FAILED',
        'Product content does not satisfy the selected template.',
        422,
        templateValidation.errors,
      );
    }

    const productNumber =
      body.productNumber ??
      (await this.allocateProductNumber(
        body.productTypeId,
        body.classification,
      ));
    const product = await this.prisma.intelligenceProduct.create({
      data: {
        productTypeId: body.productTypeId,
        ownerUnitId: context.organizationUnitId,
        createdByAssignmentId: context.primaryAssignmentId,
        productNumber,
        classification: body.classification,
        title: body.title,
        periodStart: body.periodStart ? new Date(body.periodStart) : null,
        periodEnd: body.periodEnd ? new Date(body.periodEnd) : null,
        versions: {
          create: {
            versionNumber: 1,
            templateId: body.version.templateId,
            routingTo: body.version.routingTo,
            routingFrom: body.version.routingFrom,
            routingCc: body.version.routingCc,
            subject: body.version.subject,
            content: body.version.content as Prisma.InputJsonValue,
            createdByAssignmentId: context.primaryAssignmentId,
            sourceVerifications: body.version.sourceVerificationIds?.length
              ? {
                  create: body.version.sourceVerificationIds.map(
                    (verificationId) => ({
                      verificationId,
                    }),
                  ),
                }
              : undefined,
            sourceAnalyses: body.version.sourceAnalysisVersionIds?.length
              ? {
                  create: body.version.sourceAnalysisVersionIds.map(
                    (analysisVersionId) => ({
                      analysisVersionId,
                    }),
                  ),
                }
              : undefined,
            attachments: body.version.attachmentFileIds?.length
              ? {
                  create: body.version.attachmentFileIds.map((attachment) => ({
                    fileId: attachment.fileId,
                    caption: attachment.caption,
                  })),
                }
              : undefined,
          },
        },
      },
    });

    await this.audit(
      context,
      'PRODUCT.CREATE',
      'IntelligenceProduct',
      product.id,
    );
    return this.productDetail(product.id);
  }

  async getProduct(
    productId: string,
    include: string | undefined,
    context: AuthorizationContext,
  ) {
    await this.scope.assertProduct(context, productId);
    const product = await this.productDetail(productId);
    if (!include) {
      return {
        ...product,
        versions: product.versions.slice(0, 1),
      };
    }
    return product;
  }

  async updateProduct(
    productId: string,
    body: UpdateProductDto,
    context: AuthorizationContext,
  ) {
    await this.scope.assertProduct(context, productId);
    const product = await this.prisma.intelligenceProduct.findUniqueOrThrow({
      where: { id: productId },
    });
    if (!EDITABLE_PRODUCT_STATUSES.includes(product.status)) {
      throw new ApiException(
        'PRODUCT_NOT_EDITABLE',
        'Metadata produk terkunci setelah diajukan.',
        409,
      );
    }
    if (body.classification)
      this.assertProductClassification(body.classification);
    if (
      body.productNumber &&
      body.productNumber !== product.productNumber &&
      !body.changeReason?.trim()
    ) {
      throw new ApiException(
        'PRODUCT_NUMBER_CHANGE_REASON_REQUIRED',
        'Alasan koreksi nomor produk wajib diisi.',
        422,
      );
    }
    this.ensureDateOrder(
      body.periodStart,
      body.periodEnd,
      'PRODUCT_PERIOD_INVALID',
    );
    const updated = await this.prisma.intelligenceProduct.update({
      where: { id: productId },
      data: {
        title: body.title,
        classification: body.classification,
        productNumber: body.productNumber,
        ...(body.periodStart !== undefined
          ? { periodStart: new Date(body.periodStart) }
          : {}),
        ...(body.periodEnd !== undefined
          ? { periodEnd: new Date(body.periodEnd) }
          : {}),
      },
    });
    await this.audit(
      context,
      'PRODUCT.METADATA.UPDATE',
      'IntelligenceProduct',
      productId,
      {
        changeReason: body.changeReason ?? null,
        previousProductNumber: product.productNumber,
        productNumber: updated.productNumber,
      },
    );
    return this.productDetail(productId);
  }

  async productVersions(
    productId: string,
    query: ProductVersionListQuery,
    context: AuthorizationContext,
  ) {
    await this.scope.assertProduct(context, productId);
    const where = { productId };
    const [items, total] = await Promise.all([
      this.prisma.productVersion.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { versionNumber: 'desc' },
        include: {
          template: true,
          approvalWorkflow: true,
          distributions: true,
        },
      }),
      this.prisma.productVersion.count({ where }),
    ]);
    return {
      items,
      pagination: this.paginate(query.page, query.limit, total),
    };
  }

  async createProductVersion(
    productId: string,
    body: CreateProductRevisionDto,
    context: AuthorizationContext,
  ) {
    await this.scope.assertProduct(context, productId);
    const product = await this.prisma.intelligenceProduct.findUniqueOrThrow({
      where: { id: productId },
    });
    if (!EDITABLE_PRODUCT_STATUSES.includes(product.status)) {
      throw new ApiException(
        'PRODUCT_NOT_EDITABLE',
        'Product can only be revised while draft or needs revision.',
        409,
      );
    }

    await this.validateVerificationSources(
      body.patch.sourceVerificationIds ?? [],
      context,
    );
    await this.validateAnalysisSources(
      body.patch.sourceAnalysisVersionIds ?? [],
      context,
    );
    await this.validateClassificationFloor(
      product.classification,
      body.patch.sourceVerificationIds ?? [],
      body.patch.sourceAnalysisVersionIds ?? [],
    );
    await this.validateAttachmentFiles(body.patch.attachmentFileIds ?? []);
    const templateValidation = await this.validateTemplateContentInternal(
      body.patch.templateId,
      body.patch.content,
    );
    if (!templateValidation.valid) {
      throw new ApiException(
        'PRODUCT_TEMPLATE_VALIDATION_FAILED',
        'Revised product content does not satisfy the selected template.',
        422,
        templateValidation.errors,
      );
    }

    const nextVersionNumber = product.currentVersionNumber + 1;
    const version = await this.prisma.productVersion.create({
      data: {
        productId,
        templateId: body.patch.templateId,
        versionNumber: nextVersionNumber,
        routingTo: body.patch.routingTo,
        routingFrom: body.patch.routingFrom,
        routingCc: body.patch.routingCc,
        subject: body.patch.subject,
        content: body.patch.content as Prisma.InputJsonValue,
        changeReason: body.changeReason,
        createdByAssignmentId: context.primaryAssignmentId,
        sourceVerifications: body.patch.sourceVerificationIds?.length
          ? {
              create: body.patch.sourceVerificationIds.map(
                (verificationId) => ({
                  verificationId,
                }),
              ),
            }
          : undefined,
        sourceAnalyses: body.patch.sourceAnalysisVersionIds?.length
          ? {
              create: body.patch.sourceAnalysisVersionIds.map(
                (analysisVersionId) => ({
                  analysisVersionId,
                }),
              ),
            }
          : undefined,
        attachments: body.patch.attachmentFileIds?.length
          ? {
              create: body.patch.attachmentFileIds.map((attachment) => ({
                fileId: attachment.fileId,
                caption: attachment.caption,
              })),
            }
          : undefined,
      },
    });
    await this.prisma.intelligenceProduct.update({
      where: { id: productId },
      data: {
        currentVersionNumber: nextVersionNumber,
        status: ProductStatus.DRAFT,
      },
    });
    await this.audit(
      context,
      'PRODUCT.VERSION.CREATE',
      'ProductVersion',
      version.id,
      {
        productId,
        basedOnVersionId: body.basedOnVersionId,
      },
    );
    return this.productVersionDetail(version.id);
  }

  async getProductVersion(versionId: string, context: AuthorizationContext) {
    await this.assertProductVersionScope(versionId, context);
    return this.productVersionDetail(versionId);
  }

  async updateProductVersion(
    versionId: string,
    body: UpdateProductVersionDto,
    context: AuthorizationContext,
  ) {
    const version = await this.getEditableProductVersion(versionId, context);
    const nextContent =
      body.content ?? (version.content as Record<string, unknown>);
    const validation = await this.validateTemplateContentInternal(
      version.templateId,
      nextContent,
    );
    if (!validation.valid) {
      throw new ApiException(
        'PRODUCT_TEMPLATE_VALIDATION_FAILED',
        'Updated product content does not satisfy the selected template.',
        422,
        validation.errors,
      );
    }
    await this.prisma.productVersion.update({
      where: { id: versionId },
      data: {
        routingTo: body.routingTo,
        routingFrom: body.routingFrom,
        routingCc: body.routingCc,
        subject: body.subject,
        ...(body.content
          ? { content: body.content as Prisma.InputJsonValue }
          : {}),
      },
    });
    await this.audit(
      context,
      'PRODUCT.VERSION.UPDATE',
      'ProductVersion',
      versionId,
    );
    return this.productVersionDetail(versionId);
  }

  async replaceSourceVerifications(
    versionId: string,
    body: ReplaceSourceVerificationsDto,
    context: AuthorizationContext,
  ) {
    await this.getEditableProductVersion(versionId, context);
    await this.validateVerificationSources(body.verificationIds, context);
    await this.prisma.$transaction(async (tx) => {
      await tx.productSourceVerification.deleteMany({
        where: { productVersionId: versionId },
      });
      await tx.productSourceVerification.createMany({
        data: body.verificationIds.map((verificationId) => ({
          productVersionId: versionId,
          verificationId,
        })),
      });
    });
    await this.audit(
      context,
      'PRODUCT.VERSION.SOURCES.REPLACE',
      'ProductVersion',
      versionId,
    );
    return (await this.productVersionDetail(versionId)).sourceVerifications;
  }

  async replaceSourceAnalyses(
    versionId: string,
    body: ReplaceSourceAnalysesDto,
    context: AuthorizationContext,
  ) {
    await this.getEditableProductVersion(versionId, context);
    await this.validateAnalysisSources(body.analysisVersionIds, context);
    await this.prisma.$transaction(async (tx) => {
      await tx.productSourceAnalysis.deleteMany({
        where: { productVersionId: versionId },
      });
      await tx.productSourceAnalysis.createMany({
        data: body.analysisVersionIds.map((analysisVersionId) => ({
          productVersionId: versionId,
          analysisVersionId,
        })),
      });
    });
    await this.audit(
      context,
      'PRODUCT.VERSION.ANALYSES.REPLACE',
      'ProductVersion',
      versionId,
    );
    return (await this.productVersionDetail(versionId)).sourceAnalyses;
  }

  async replaceAttachments(
    versionId: string,
    body: ReplaceProductAttachmentsDto,
    context: AuthorizationContext,
  ) {
    await this.getEditableProductVersion(versionId, context);
    await this.validateAttachmentFiles(body.attachments);
    await this.prisma.$transaction(async (tx) => {
      await tx.productAttachment.deleteMany({
        where: { productVersionId: versionId },
      });
      if (body.attachments.length > 0) {
        await tx.productAttachment.createMany({
          data: body.attachments.map((attachment) => ({
            productVersionId: versionId,
            fileId: attachment.fileId,
            caption: attachment.caption,
          })),
        });
      }
    });
    await this.audit(
      context,
      'PRODUCT.VERSION.ATTACHMENTS.REPLACE',
      'ProductVersion',
      versionId,
    );
    return (await this.productVersionDetail(versionId)).attachments;
  }

  async validateProductVersion(
    versionId: string,
    context: AuthorizationContext,
  ) {
    await this.assertProductVersionScope(versionId, context);
    return this.buildProductValidation(versionId);
  }

  async submitProduct(
    productId: string,
    body: SubmitProductDto,
    context: AuthorizationContext,
  ) {
    await this.scope.assertProduct(context, productId);
    if (body.confirmation !== 'SUBMIT') {
      throw new ApiException(
        'PRODUCT_SUBMIT_CONFIRMATION_REQUIRED',
        'Confirmation must be SUBMIT.',
        422,
      );
    }

    const product = await this.prisma.intelligenceProduct.findUniqueOrThrow({
      where: { id: productId },
      include: { createdByAssignment: true },
    });
    if (body.versionId === '') {
      throw new ApiException('RESOURCE_NOT_FOUND', 'Version not found.', 404);
    }
    const version = await this.prisma.productVersion.findUniqueOrThrow({
      where: { id: body.versionId },
    });
    if (
      version.productId !== productId ||
      version.versionNumber !== product.currentVersionNumber
    ) {
      throw new ApiException(
        'PRODUCT_SUBMIT_VERSION_INVALID',
        'Submitted version must be the current version of the product.',
        422,
      );
    }

    const validation = await this.buildProductValidation(body.versionId);
    if (!validation.valid) {
      throw new ApiException(
        'PRODUCT_NOT_READY_FOR_SUBMISSION',
        'Product version is not ready for submission.',
        422,
        validation.errors,
      );
    }

    const derivedTargets = await this.buildWorkflowTargets(
      product.createdByAssignmentId,
    );
    const workflowId = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.productApprovalWorkflow.findUnique({
        where: { productVersionId: body.versionId },
      });
      if (existing) {
        return existing.id;
      }
      const createdWorkflowId = await this.createWorkflowTx(
        tx,
        body.versionId,
        this.resolveOperationalRoute(context.commandRouteType),
        derivedTargets.regionalTargetPositionId,
        context.primaryAssignmentId,
      );
      await tx.intelligenceProduct.update({
        where: { id: productId },
        data: { status: ProductStatus.UNDER_REGIONAL_REVIEW },
      });
      return createdWorkflowId;
    });

    await this.notifyPosition(
      derivedTargets.regionalTargetPositionId,
      NotificationType.APPROVAL,
      'Approval produk baru',
      `Produk ${product.title} menunggu approval regional.`,
      `/products/${productId}`,
    );
    await this.audit(
      context,
      'PRODUCT.SUBMIT',
      'IntelligenceProduct',
      productId,
      {
        versionId: body.versionId,
        workflowId,
      },
    );
    return this.approvalWorkflowDetail(workflowId);
  }

  async productTraceability(productId: string, context: AuthorizationContext) {
    await this.scope.assertProduct(context, productId);
    const detail = await this.productDetail(productId);
    return {
      productId,
      versions: detail.versions,
      sources: detail.versions.flatMap((version) => [
        ...version.sourceVerifications,
        ...version.sourceAnalyses,
      ]),
      approval: detail.versions
        .map((version) => version.approvalWorkflow)
        .filter(Boolean),
      distributions: detail.versions.flatMap(
        (version) => version.distributions,
      ),
    };
  }

  async productTimeline(productId: string, context: AuthorizationContext) {
    await this.scope.assertProduct(context, productId);
    const detail = await this.productDetail(productId);
    const versionIds = detail.versions.map((version) => version.id);
    const workflowIds = detail.versions
      .map((version) => version.approvalWorkflow?.id)
      .filter((value): value is string => Boolean(value));
    const audit = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          { entityType: 'IntelligenceProduct', entityId: productId },
          { entityType: 'ProductVersion', entityId: { in: versionIds } },
          {
            entityType: 'ProductApprovalWorkflow',
            entityId: { in: workflowIds },
          },
          {
            entityType: 'ProductDistribution',
            entityId: {
              in: detail.versions.flatMap((version) =>
                version.distributions.map((distribution) => distribution.id),
              ),
            },
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
    const events = [
      ...detail.versions.map((version) => ({
        type: 'VERSION',
        at: version.createdAt,
        payload: version,
      })),
      ...detail.versions.flatMap((version) =>
        version.approvalWorkflow
          ? version.approvalWorkflow.events.map((event) => ({
              type: 'APPROVAL_EVENT',
              at: event.createdAt,
              payload: event,
            }))
          : [],
      ),
      ...detail.versions.flatMap((version) =>
        version.distributions.map((distribution) => ({
          type: 'DISTRIBUTION',
          at:
            distribution.sentAt ??
            distribution.deliveredAt ??
            distribution.readAt ??
            version.createdAt,
          payload: distribution,
        })),
      ),
      ...audit.map((entry) => ({
        type: 'AUDIT',
        at: entry.createdAt,
        payload: entry,
      })),
    ].sort((left, right) => left.at.getTime() - right.at.getTime());
    return { productId, events };
  }

  async archiveProduct(
    productId: string,
    body: ArchiveProductDto,
    context: AuthorizationContext,
  ) {
    await this.scope.assertProduct(context, productId);
    await this.prisma.intelligenceProduct.update({
      where: { id: productId },
      data: { status: ProductStatus.ARCHIVED },
    });
    await this.audit(
      context,
      'PRODUCT.ARCHIVE',
      'IntelligenceProduct',
      productId,
      {
        reason: body.reason,
      },
    );
    return this.productDetail(productId);
  }

  async approvalInbox(
    query: ApprovalInboxQuery,
    context: AuthorizationContext,
  ) {
    const where: Prisma.ProductApprovalStepWhereInput = {
      targetPositionId: context.positionId,
      status: query.status
        ? query.status
        : { in: [ApprovalStepStatus.ACTIVE, ApprovalStepStatus.WAITING] },
      ...(query.stage ? { stage: query.stage } : {}),
      ...(query.from || query.to
        ? {
            workflow: {
              startedAt: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {}),
              },
            },
          }
        : {}),
      ...(query.routeType ? { workflow: { routeType: query.routeType } } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.productApprovalStep.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [
          { status: 'asc' },
          { activatedAt: 'asc' },
          { stepNumber: 'asc' },
        ],
        include: {
          workflow: {
            include: {
              productVersion: {
                include: {
                  product: true,
                },
              },
            },
          },
          targetPosition: true,
          decidedByAssignment: {
            include: { userProfile: true, position: true },
          },
        },
      }),
      this.prisma.productApprovalStep.count({ where }),
    ]);
    return {
      items,
      pagination: this.paginate(query.page, query.limit, total),
    };
  }

  async createApprovalWorkflow(
    versionId: string,
    body: CreateApprovalWorkflowDto,
    context: AuthorizationContext,
  ) {
    const version = await this.prisma.productVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: { product: true },
    });
    if (version.versionNumber !== version.product.currentVersionNumber) {
      throw new ApiException(
        'APPROVAL_WORKFLOW_VERSION_INVALID',
        'Approval workflow can only be created for the current product version.',
        422,
      );
    }
    const workflowId = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.productApprovalWorkflow.findUnique({
        where: { productVersionId: versionId },
      });
      if (existing) {
        return existing.id;
      }
      return this.createWorkflowTx(
        tx,
        versionId,
        this.resolveOperationalRoute(body.routeType),
        body.regionalTargetPositionId,
        context.primaryAssignmentId,
      );
    });
    await this.audit(
      context,
      'APPROVAL_WORKFLOW.CREATE',
      'ProductApprovalWorkflow',
      workflowId,
    );
    return this.approvalWorkflowDetail(workflowId);
  }

  async getApprovalWorkflow(workflowId: string, _include?: string) {
    return this.approvalWorkflowDetail(workflowId);
  }

  async getApprovalStep(stepId: string) {
    return this.prisma.productApprovalStep.findUniqueOrThrow({
      where: { id: stepId },
      include: {
        workflow: {
          include: {
            productVersion: {
              include: { product: true },
            },
          },
        },
        targetPosition: true,
        decidedByAssignment: {
          include: { userProfile: true, position: true },
        },
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async approveStep(
    stepId: string,
    body: DecisionNoteDto,
    context: AuthorizationContext,
  ) {
    const step = await this.prisma.productApprovalStep.findUniqueOrThrow({
      where: { id: stepId },
      include: {
        workflow: {
          include: {
            productVersion: {
              include: { product: true },
            },
          },
        },
      },
    });
    if (step.targetPositionId !== context.positionId) {
      throw new ApiException(
        'APPROVAL_FORBIDDEN',
        'Caller is not the target approver.',
        403,
      );
    }
    if (step.status !== ApprovalStepStatus.ACTIVE) {
      throw new ApiException(
        'APPROVAL_STEP_NOT_ACTIVE',
        'Approval step is not active.',
        409,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productApprovalStep.update({
        where: { id: stepId },
        data: {
          status: ApprovalStepStatus.APPROVED,
          decision: ApprovalDecision.APPROVE,
          decisionNote: body.note,
          decidedAt: new Date(),
          decidedByAssignmentId: context.primaryAssignmentId,
        },
      });
      await tx.productApprovalEvent.create({
        data: {
          workflowId: step.workflowId,
          stepId,
          eventType: ApprovalEventType.APPROVED,
          actorAssignmentId: context.primaryAssignmentId,
          note: body.note,
        },
      });

      await tx.productApprovalStep.updateMany({
        where: {
          workflowId: step.workflowId,
          id: { not: stepId },
          status: {
            in: [ApprovalStepStatus.WAITING, ApprovalStepStatus.ACTIVE],
          },
        },
        data: { status: ApprovalStepStatus.SKIPPED },
      });
      await tx.productApprovalWorkflow.update({
        where: { id: step.workflowId },
        data: {
          status: ApprovalWorkflowStatus.APPROVED,
          completedAt: new Date(),
        },
      });
      await tx.intelligenceProduct.update({
        where: { id: step.workflow.productVersion.productId },
        data: { status: ProductStatus.APPROVED_REGIONAL },
      });
    });

    const workflow = await this.approvalWorkflowDetail(step.workflowId);
    await this.notifyAssignment(
      workflow.productVersion.createdByAssignmentId,
      NotificationType.PRODUCT,
      'Produk disetujui',
      `Produk ${workflow.productVersion.product.title} telah disetujui Regional Commander dan tersedia untuk Executive.`,
      `/products/${workflow.productVersion.productId}`,
    );
    await this.audit(
      context,
      'APPROVAL_STEP.APPROVE',
      'ProductApprovalStep',
      stepId,
    );
    return workflow;
  }

  async requestRevision(
    stepId: string,
    body: { note: string; requiredChanges: string[] },
    context: AuthorizationContext,
  ) {
    const step = await this.prisma.productApprovalStep.findUniqueOrThrow({
      where: { id: stepId },
      include: {
        workflow: {
          include: {
            productVersion: {
              include: { product: true },
            },
          },
        },
      },
    });
    if (step.targetPositionId !== context.positionId) {
      throw new ApiException(
        'APPROVAL_FORBIDDEN',
        'Caller is not the target approver.',
        403,
      );
    }
    if (step.status !== ApprovalStepStatus.ACTIVE) {
      throw new ApiException(
        'APPROVAL_STEP_NOT_ACTIVE',
        'Approval step is not active.',
        409,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.productApprovalStep.update({
        where: { id: stepId },
        data: {
          status: ApprovalStepStatus.NEEDS_REVISION,
          decision: ApprovalDecision.NEEDS_REVISION,
          decisionNote: body.note,
          decidedAt: new Date(),
          decidedByAssignmentId: context.primaryAssignmentId,
        },
      });
      await tx.productApprovalWorkflow.update({
        where: { id: step.workflowId },
        data: {
          status: ApprovalWorkflowStatus.NEEDS_REVISION,
        },
      });
      await tx.intelligenceProduct.update({
        where: { id: step.workflow.productVersion.productId },
        data: { status: ProductStatus.NEEDS_REVISION },
      });
      await tx.productApprovalEvent.create({
        data: {
          workflowId: step.workflowId,
          stepId,
          eventType: ApprovalEventType.REVISION_REQUESTED,
          actorAssignmentId: context.primaryAssignmentId,
          note: body.note,
          metadata: { requiredChanges: body.requiredChanges },
        },
      });
    });
    await this.notifyAssignment(
      step.workflow.productVersion.createdByAssignmentId,
      NotificationType.REVISION,
      'Revisi produk diminta',
      `Produk ${step.workflow.productVersion.product.title} perlu direvisi.`,
      `/products/${step.workflow.productVersion.productId}`,
    );
    await this.audit(
      context,
      'APPROVAL_STEP.REQUEST_REVISION',
      'ProductApprovalStep',
      stepId,
      {
        requiredChanges: body.requiredChanges,
      },
    );
    return this.approvalWorkflowDetail(step.workflowId);
  }

  async rejectStep(
    stepId: string,
    body: RejectApprovalDto,
    context: AuthorizationContext,
  ) {
    if (body.confirmation !== 'REJECT') {
      throw new ApiException(
        'APPROVAL_REJECT_CONFIRMATION_REQUIRED',
        'Confirmation must be REJECT.',
        422,
      );
    }
    const step = await this.prisma.productApprovalStep.findUniqueOrThrow({
      where: { id: stepId },
      include: {
        workflow: {
          include: {
            productVersion: {
              include: { product: true },
            },
          },
        },
      },
    });
    if (step.targetPositionId !== context.positionId) {
      throw new ApiException(
        'APPROVAL_FORBIDDEN',
        'Caller is not the target approver.',
        403,
      );
    }
    if (step.status !== ApprovalStepStatus.ACTIVE) {
      throw new ApiException(
        'APPROVAL_STEP_NOT_ACTIVE',
        'Approval step is not active.',
        409,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.productApprovalStep.update({
        where: { id: stepId },
        data: {
          status: ApprovalStepStatus.REJECTED,
          decision: ApprovalDecision.REJECT,
          decisionNote: body.note,
          decidedAt: new Date(),
          decidedByAssignmentId: context.primaryAssignmentId,
        },
      });
      await tx.productApprovalStep.updateMany({
        where: {
          workflowId: step.workflowId,
          id: { not: stepId },
          status: {
            in: [ApprovalStepStatus.WAITING, ApprovalStepStatus.ACTIVE],
          },
        },
        data: { status: ApprovalStepStatus.SKIPPED },
      });
      await tx.productApprovalWorkflow.update({
        where: { id: step.workflowId },
        data: {
          status: ApprovalWorkflowStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });
      await tx.intelligenceProduct.update({
        where: { id: step.workflow.productVersion.productId },
        data: { status: ProductStatus.NEEDS_REVISION },
      });
      await tx.productApprovalEvent.create({
        data: {
          workflowId: step.workflowId,
          stepId,
          eventType: ApprovalEventType.REJECTED,
          actorAssignmentId: context.primaryAssignmentId,
          note: body.note,
        },
      });
    });
    await this.audit(
      context,
      'APPROVAL_STEP.REJECT',
      'ProductApprovalStep',
      stepId,
    );
    return this.approvalWorkflowDetail(step.workflowId);
  }

  async requestClarification(
    stepId: string,
    body: ClarificationDto,
    context: AuthorizationContext,
  ) {
    const step = await this.prisma.productApprovalStep.findUniqueOrThrow({
      where: { id: stepId },
      include: {
        workflow: {
          include: {
            productVersion: {
              include: { product: true },
            },
          },
        },
      },
    });
    if (step.targetPositionId !== context.positionId) {
      throw new ApiException(
        'APPROVAL_FORBIDDEN',
        'Caller is not the target approver.',
        403,
      );
    }
    await this.prisma.productApprovalEvent.create({
      data: {
        workflowId: step.workflowId,
        stepId,
        eventType: ApprovalEventType.CLARIFICATION_REQUESTED,
        actorAssignmentId: context.primaryAssignmentId,
        note: body.note,
        metadata: body.dueAt ? { dueAt: body.dueAt } : undefined,
      },
    });
    await this.notifyAssignment(
      step.workflow.productVersion.createdByAssignmentId,
      NotificationType.APPROVAL,
      'Klarifikasi produk diminta',
      `Klarifikasi diminta untuk produk ${step.workflow.productVersion.product.title}.`,
      `/approval-steps/${stepId}`,
    );
    await this.audit(
      context,
      'APPROVAL_STEP.REQUEST_CLARIFICATION',
      'ProductApprovalStep',
      stepId,
    );
    return this.approvalWorkflowDetail(step.workflowId);
  }

  async cancelWorkflow(
    workflowId: string,
    body: CancelWorkflowDto,
    context: AuthorizationContext,
  ) {
    const workflow =
      await this.prisma.productApprovalWorkflow.findUniqueOrThrow({
        where: { id: workflowId },
        include: {
          productVersion: {
            include: { product: true },
          },
        },
      });
    if (workflow.status === ApprovalWorkflowStatus.APPROVED) {
      throw new ApiException(
        'APPROVAL_WORKFLOW_FINAL',
        'Approved workflow cannot be cancelled.',
        409,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.productApprovalWorkflow.update({
        where: { id: workflowId },
        data: {
          status: ApprovalWorkflowStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });
      await tx.productApprovalStep.updateMany({
        where: {
          workflowId,
          status: {
            in: [ApprovalStepStatus.WAITING, ApprovalStepStatus.ACTIVE],
          },
        },
        data: { status: ApprovalStepStatus.SKIPPED },
      });
      await tx.intelligenceProduct.update({
        where: { id: workflow.productVersion.productId },
        data: { status: ProductStatus.READY_FOR_SUBMISSION },
      });
      await tx.productApprovalEvent.create({
        data: {
          workflowId,
          eventType: ApprovalEventType.CANCELLED,
          actorAssignmentId: context.primaryAssignmentId,
          note: body.reason,
        },
      });
    });
    await this.audit(
      context,
      'APPROVAL_WORKFLOW.CANCEL',
      'ProductApprovalWorkflow',
      workflowId,
      {
        reason: body.reason,
      },
    );
    return this.approvalWorkflowDetail(workflowId);
  }

  async approvalTimeline(workflowId: string) {
    const workflow = await this.approvalWorkflowDetail(workflowId);
    return {
      workflowId,
      events: [
        ...workflow.events.map((event) => ({
          type: 'WORKFLOW_EVENT',
          at: event.createdAt,
          payload: event,
        })),
        ...workflow.steps.flatMap((step) => {
          const items = [];
          if (step.activatedAt) {
            items.push({
              type: 'STEP_ACTIVATED',
              at: step.activatedAt,
              payload: step,
            });
          }
          if (step.decidedAt) {
            items.push({
              type: 'STEP_DECIDED',
              at: step.decidedAt,
              payload: step,
            });
          }
          return items;
        }),
      ].sort((left, right) => left.at.getTime() - right.at.getTime()),
    };
  }

  async listDistributions(query: DistributionQuery) {
    const where: Prisma.ProductDistributionWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.targetUnitId ? { targetUnitId: query.targetUnitId } : {}),
      ...(query.targetPositionId
        ? { targetPositionId: query.targetPositionId }
        : {}),
      ...(query.targetUserProfileId
        ? { targetUserProfileId: query.targetUserProfileId }
        : {}),
      ...(query.productId
        ? { productVersion: { productId: query.productId } }
        : {}),
      ...(query.from || query.to
        ? {
            productVersion: {
              createdAt: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {}),
              },
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.productDistribution.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
        include: {
          productVersion: { include: { product: true } },
          sentByAssignment: {
            include: { userProfile: true, position: true },
          },
          targetUnit: true,
          targetPosition: true,
          targetUser: true,
        },
      }),
      this.prisma.productDistribution.count({ where }),
    ]);

    return {
      items,
      pagination: this.paginate(query.page, query.limit, total),
    };
  }

  async createDistributions(
    versionId: string,
    body: CreateDistributionDto,
    context: AuthorizationContext,
  ) {
    const version = await this.prisma.productVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: { product: true },
    });
    if (
      version.product.status !== ProductStatus.APPROVED_REGIONAL &&
      version.product.status !== ProductStatus.APPROVED_EXECUTIVE &&
      version.product.status !== ProductStatus.DISTRIBUTED
    ) {
      throw new ApiException(
        'PRODUCT_NOT_DISTRIBUTABLE',
        'Only regionally approved products can be distributed.',
        409,
      );
    }

    const distributions = await this.prisma.$transaction(async (tx) => {
      const created = [];
      for (const target of body.targets) {
        const setCount =
          Number(Boolean(target.targetUnitId)) +
          Number(Boolean(target.targetPositionId)) +
          Number(Boolean(target.targetUserProfileId));
        if (setCount !== 1) {
          throw new ApiException(
            'DISTRIBUTION_TARGET_INVALID',
            'Each distribution target must specify exactly one target.',
            422,
          );
        }
        const row = await tx.productDistribution.create({
          data: {
            productVersionId: versionId,
            sentByAssignmentId: context.primaryAssignmentId,
            targetUnitId: target.targetUnitId,
            targetPositionId: target.targetPositionId,
            targetUserProfileId: target.targetUserProfileId,
            status: DistributionStatus.SENT,
            sentAt: new Date(),
          },
        });
        created.push(row);
      }
      await tx.intelligenceProduct.update({
        where: { id: version.productId },
        data: { status: ProductStatus.DISTRIBUTED },
      });
      return created;
    });

    for (const distribution of distributions) {
      if (distribution.targetUserProfileId) {
        await this.notifyUsers(
          [distribution.targetUserProfileId],
          NotificationType.PRODUCT,
          'Produk terdistribusi',
          `Sebuah produk intelijen baru telah dikirimkan kepada Anda.${body.message ? ` ${body.message}` : ''}`,
          `/distributions/${distribution.id}`,
        );
      } else if (distribution.targetPositionId) {
        await this.notifyPosition(
          distribution.targetPositionId,
          NotificationType.PRODUCT,
          'Produk terdistribusi',
          `Sebuah produk intelijen baru telah dikirimkan ke posisi Anda.${body.message ? ` ${body.message}` : ''}`,
          `/distributions/${distribution.id}`,
        );
      }
    }

    await this.audit(
      context,
      'PRODUCT_DISTRIBUTION.CREATE',
      'ProductVersion',
      versionId,
      {
        targets: JSON.parse(
          JSON.stringify(body.targets),
        ) as Prisma.InputJsonValue,
      },
    );
    return Promise.all(
      distributions.map((distribution) =>
        this.distributionDetail(distribution.id),
      ),
    );
  }

  async getDistribution(distributionId: string) {
    return this.distributionDetail(distributionId);
  }

  async markDelivered(
    distributionId: string,
    body: MarkDeliveredDto,
    context: AuthorizationContext,
  ) {
    const distribution =
      await this.prisma.productDistribution.findUniqueOrThrow({
        where: { id: distributionId },
      });
    if (
      distribution.status === DistributionStatus.DELIVERED ||
      distribution.status === DistributionStatus.READ
    ) {
      return this.distributionDetail(distributionId);
    }
    if (
      distribution.status !== DistributionStatus.QUEUED &&
      distribution.status !== DistributionStatus.SENT
    ) {
      throw new ApiException(
        'DISTRIBUTION_STATE_INVALID',
        'Distribution cannot be marked delivered from the current state.',
        409,
      );
    }
    await this.prisma.productDistribution.update({
      where: { id: distributionId },
      data: {
        status: DistributionStatus.DELIVERED,
        deliveredAt: new Date(body.deliveredAt),
      },
    });
    await this.audit(
      context,
      'PRODUCT_DISTRIBUTION.DELIVERED',
      'ProductDistribution',
      distributionId,
      {
        providerReceipt: body.providerReceipt ?? null,
      },
    );
    return this.distributionDetail(distributionId);
  }

  async markDistributionRead(
    distributionId: string,
    context: AuthorizationContext,
  ) {
    const distribution =
      await this.prisma.productDistribution.findUniqueOrThrow({
        where: { id: distributionId },
      });
    const allowed =
      distribution.targetUserProfileId === context.userProfileId ||
      distribution.targetPositionId === context.positionId ||
      distribution.targetUnitId === context.organizationUnitId;
    if (!allowed) {
      throw new ApiException(
        'DISTRIBUTION_FORBIDDEN',
        'Caller is not the recipient of this distribution.',
        403,
      );
    }
    if (distribution.status === DistributionStatus.READ) {
      return this.distributionDetail(distributionId);
    }
    await this.prisma.productDistribution.update({
      where: { id: distributionId },
      data: {
        status: DistributionStatus.READ,
        readAt: distribution.readAt ?? new Date(),
      },
    });
    await this.audit(
      context,
      'PRODUCT_DISTRIBUTION.READ',
      'ProductDistribution',
      distributionId,
    );
    return this.distributionDetail(distributionId);
  }

  async retryDistribution(
    distributionId: string,
    body: RetryDistributionDto,
    context: AuthorizationContext,
  ) {
    const distribution =
      await this.prisma.productDistribution.findUniqueOrThrow({
        where: { id: distributionId },
      });
    if (distribution.status !== DistributionStatus.FAILED) {
      throw new ApiException(
        'DISTRIBUTION_RETRY_INVALID',
        'Only failed distributions can be retried.',
        409,
      );
    }
    await this.prisma.productDistribution.update({
      where: { id: distributionId },
      data: {
        status: DistributionStatus.QUEUED,
        failureReason: null,
      },
    });
    await this.audit(
      context,
      'PRODUCT_DISTRIBUTION.RETRY',
      'ProductDistribution',
      distributionId,
      {
        reason: body.reason,
      },
    );
    return this.distributionDetail(distributionId);
  }

  async revokeDistribution(
    distributionId: string,
    body: RevokeDistributionDto,
    context: AuthorizationContext,
  ) {
    await this.prisma.productDistribution.update({
      where: { id: distributionId },
      data: {
        status: DistributionStatus.REVOKED,
        revokedAt: new Date(),
      },
    });
    await this.audit(
      context,
      'PRODUCT_DISTRIBUTION.REVOKE',
      'ProductDistribution',
      distributionId,
      {
        reason: body.reason,
      },
    );
    return this.distributionDetail(distributionId);
  }

  async distributionSummary(productId: string) {
    const grouped = await this.prisma.productDistribution.groupBy({
      by: ['status'],
      where: {
        productVersion: { productId },
      },
      _count: { _all: true },
    });
    return {
      productId,
      statuses: Object.fromEntries(
        grouped.map((group) => [group.status, group._count._all]),
      ),
      total: grouped.reduce((sum, group) => sum + group._count._all, 0),
    };
  }

  private buildCommonDateWhere<T extends string>(
    field: T,
    from?: string,
    to?: string,
  ) {
    if (!from && !to) {
      return {};
    }
    return {
      [field]: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      },
    };
  }

  async dashboardOverview(
    query: DashboardQuery,
    context: AuthorizationContext,
  ) {
    this.ensureDateOrder(query.from, query.to);
    const [baketScope, resolvedScope] = await Promise.all([
      this.scope.baketWhere(context),
      this.scope.resolve(context),
    ]);
    const areaWhere = resolvedScope.areaRootIds.length
      ? {
          OR: [
            { areaId: { in: resolvedScope.areaRootIds } },
            {
              area: {
                ancestorLinks: {
                  some: { ancestorId: { in: resolvedScope.areaRootIds } },
                },
              },
            },
          ],
        }
      : {};
    const [bakets, tasks, directives, products, alerts, emergencies] =
      await Promise.all([
        this.prisma.baket.count({
          where: {
            ...baketScope,
            deletedAt: null,
            ...this.buildCommonDateWhere('createdAt', query.from, query.to),
          },
        }),
        this.prisma.task.count({
          where: {
            ownerUnit: {
              ancestorLinks: {
                some: { ancestorId: context.organizationUnitId },
              },
            },
            deletedAt: null,
            ...this.buildCommonDateWhere('createdAt', query.from, query.to),
          },
        }),
        this.prisma.directive.count({
          where: {
            ownerUnitId: context.organizationUnitId,
            ...this.buildCommonDateWhere('createdAt', query.from, query.to),
          },
        }),
        this.prisma.intelligenceProduct.count({
          where: {
            deletedAt: null,
            ownerUnitId: context.organizationUnitId,
            ...this.buildCommonDateWhere('createdAt', query.from, query.to),
          },
        }),
        this.prisma.alert.count({
          where: {
            ...areaWhere,
            ...this.buildCommonDateWhere('createdAt', query.from, query.to),
          },
        }),
        this.prisma.emergencyIncident.count({
          where: {
            ...areaWhere,
            ...this.buildCommonDateWhere('createdAt', query.from, query.to),
          },
        }),
      ]);
    return {
      filters: query,
      cards: { bakets, tasks, directives, products, alerts, emergencies },
    };
  }

  async dashboardKpis(query: DashboardQuery, context: AuthorizationContext) {
    const baketScope = await this.scope.baketWhere(context);
    const [taskGrouped, verificationGrouped, approvalBacklog] =
      await Promise.all([
        this.prisma.task.groupBy({
          by: ['status'],
          where: {
            ownerUnit: {
              ancestorLinks: {
                some: { ancestorId: context.organizationUnitId },
              },
            },
            deletedAt: null,
            ...this.buildCommonDateWhere('createdAt', query.from, query.to),
          },
          _count: { _all: true },
        }),
        this.prisma.baketVerification.groupBy({
          by: ['status'],
          where: {
            baketVersion: { baket: baketScope },
            ...this.buildCommonDateWhere('createdAt', query.from, query.to),
          },
          _count: { _all: true },
        }),
        this.prisma.productApprovalStep.count({
          where: {
            status: ApprovalStepStatus.ACTIVE,
            workflow: {
              productVersion: {
                product: { ownerUnitId: context.organizationUnitId },
              },
            },
          },
        }),
      ]);
    const totalTasks = taskGrouped.reduce(
      (sum, item) => sum + item._count._all,
      0,
    );
    const completedTasks =
      taskGrouped.find((item) => item.status === 'COMPLETED')?._count._all ?? 0;
    return {
      completionRate:
        totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
      verificationStatuses: Object.fromEntries(
        verificationGrouped.map((group) => [group.status, group._count._all]),
      ),
      approvalBacklog,
      taskStatuses: Object.fromEntries(
        taskGrouped.map((group) => [group.status, group._count._all]),
      ),
    };
  }

  async dashboardKpiEngine(
    query: DashboardQuery,
    context: AuthorizationContext,
  ) {
    this.ensureDateOrder(query.from, query.to);
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    const scope = await this.scope.resolve(context);
    const dateWhere = { gte: from, lte: to };
    const [assignments, taskAssignments, bakets] = await Promise.all([
      this.prisma.userSeatAssignment.findMany({
        where: { id: { in: scope.assignmentIds }, isActive: true },
        orderBy: [{ position: { organizationUnit: { name: 'asc' } } }],
        select: {
          id: true,
          userProfile: { select: { id: true, fullName: true, username: true } },
          position: {
            select: {
              id: true,
              title: true,
              code: true,
              organizationUnit: {
                select: { id: true, code: true, name: true, type: true },
              },
            },
          },
          areaScopes: {
            where: { validUntil: null },
            select: {
              isPrimary: true,
              area: {
                select: { id: true, code: true, name: true, level: true },
              },
            },
          },
        },
      }),
      this.prisma.taskAssignment.findMany({
        where: {
          assigneeAssignmentId: { in: scope.assignmentIds },
          assignedAt: dateWhere,
          task: { deletedAt: null },
        },
        select: {
          id: true,
          assigneeAssignmentId: true,
          status: true,
          assignedAt: true,
          acknowledgedAt: true,
          completedAt: true,
          dueDate: true,
          task: {
            select: { id: true, title: true, dueDate: true, priority: true },
          },
        },
      }),
      this.prisma.baket.findMany({
        where: {
          deletedAt: null,
          createdAt: dateWhere,
          ...(await this.scope.baketWhere(context)),
        },
        select: {
          id: true,
          createdByFieldOfficerAssignmentId: true,
          createdAt: true,
          taskAssignment: {
            select: { dueDate: true, task: { select: { dueDate: true } } },
          },
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 1,
            select: {
              eventArea: { select: { id: true, name: true, level: true } },
              verification: {
                select: {
                  status: true,
                  sourceReliability: true,
                  informationCredibility: true,
                  completedAt: true,
                  checks: { select: { status: true } },
                  productSources: {
                    select: {
                      productVersion: {
                        select: { product: { select: { status: true } } },
                      },
                    },
                  },
                  analysisSources: { select: { analysisCaseId: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    const tasksByAssignment = new Map<string, typeof taskAssignments>();
    for (const task of taskAssignments) {
      const items = tasksByAssignment.get(task.assigneeAssignmentId) ?? [];
      items.push(task);
      tasksByAssignment.set(task.assigneeAssignmentId, items);
    }
    const baketsByAssignment = new Map<string, typeof bakets>();
    for (const baket of bakets) {
      const items =
        baketsByAssignment.get(baket.createdByFieldOfficerAssignmentId) ?? [];
      items.push(baket);
      baketsByAssignment.set(baket.createdByFieldOfficerAssignmentId, items);
    }

    const average = (values: number[]) =>
      values.length
        ? Math.round(
            (values.reduce((sum, value) => sum + value, 0) / values.length) *
              10,
          ) / 10
        : null;
    const scoreFor = (assignmentIds: string[]) => {
      const tasks = assignmentIds.flatMap(
        (id) => tasksByAssignment.get(id) ?? [],
      );
      const reports = assignmentIds.flatMap(
        (id) => baketsByAssignment.get(id) ?? [],
      );
      const taskTimeliness = tasks
        .filter(
          (task) => task.completedAt && (task.dueDate ?? task.task.dueDate),
        )
        .map((task) =>
          task.completedAt! <= (task.dueDate ?? task.task.dueDate)! ? 100 : 40,
        );
      const reportTimeliness = reports
        .filter(
          (baket) =>
            baket.taskAssignment?.dueDate ?? baket.taskAssignment?.task.dueDate,
        )
        .map((baket) =>
          baket.createdAt <=
          (baket.taskAssignment?.dueDate ?? baket.taskAssignment?.task.dueDate)!
            ? 100
            : 40,
        );
      const verifications = reports
        .map((baket) => baket.versions[0]?.verification)
        .filter(
          (verification): verification is NonNullable<typeof verification> =>
            Boolean(verification),
        );
      const qualityScores = verifications.map((verification) => {
        const statusScore =
          verification.status === 'VERIFIED'
            ? 100
            : verification.status === 'NEEDS_DEVELOPMENT'
              ? 55
              : verification.status === 'REJECTED'
                ? 20
                : 45;
        const applicableChecks = verification.checks.filter(
          (check) => check.status !== 'NOT_APPLICABLE',
        );
        const checkScore = applicableChecks.length
          ? (applicableChecks.filter((check) => check.status === 'PASS')
              .length /
              applicableChecks.length) *
            100
          : statusScore;
        return statusScore * 0.65 + checkScore * 0.35;
      });
      const reliabilityScore: Record<string, number> = {
        A: 100,
        B: 90,
        C: 75,
        D: 55,
        E: 35,
        F: 15,
      };
      const credibilityScore: Record<string, number> = {
        ONE: 100,
        TWO: 90,
        THREE: 75,
        FOUR: 55,
        FIVE: 35,
        SIX: 15,
      };
      const validityScores = verifications
        .filter(
          (verification) =>
            verification.sourceReliability &&
            verification.informationCredibility,
        )
        .map(
          (verification) =>
            ((reliabilityScore[verification.sourceReliability!] ?? 0) +
              (credibilityScore[verification.informationCredibility!] ?? 0)) /
            2,
        );
      const contributionScores = verifications.map((verification) =>
        verification.productSources.length ||
        verification.analysisSources.length
          ? 100
          : 35,
      );
      const responseScores = tasks.flatMap((task) => {
        const values: number[] = [];
        if (task.acknowledgedAt) {
          const hours =
            (task.acknowledgedAt.getTime() - task.assignedAt.getTime()) /
            3_600_000;
          values.push(
            hours <= 6 ? 100 : hours <= 24 ? 85 : hours <= 48 ? 65 : 35,
          );
        }
        if (task.completedAt && (task.dueDate ?? task.task.dueDate)) {
          values.push(
            task.completedAt <= (task.dueDate ?? task.task.dueDate)! ? 100 : 45,
          );
        }
        return values;
      });
      const indicators = [
        {
          code: 'IDX.1',
          score: average([...taskTimeliness, ...reportTimeliness]),
          sample: taskTimeliness.length + reportTimeliness.length,
        },
        {
          code: 'IDX.2',
          score: average(qualityScores),
          sample: qualityScores.length,
        },
        {
          code: 'IDX.3',
          score: average(validityScores),
          sample: validityScores.length,
        },
        {
          code: 'IDX.4',
          score: average(contributionScores),
          sample: contributionScores.length,
        },
        {
          code: 'IDX.5',
          score: average(responseScores),
          sample: responseScores.length,
        },
      ];
      const measured = indicators.filter(
        (indicator) => indicator.score !== null,
      );
      const overall = average(measured.map((indicator) => indicator.score!));
      return {
        score: overall,
        grade:
          overall === null
            ? 'N/A'
            : overall >= 90
              ? 'A'
              : overall >= 80
                ? 'B'
                : overall >= 70
                  ? 'C'
                  : 'D',
        indicators,
        evidence: {
          tasks: tasks.length,
          reports: reports.length,
          verifications: verifications.length,
          measuredIndicators: measured.length,
        },
      };
    };

    const unitGroups = new Map<
      string,
      {
        unit: (typeof assignments)[number]['position']['organizationUnit'];
        assignmentIds: string[];
      }
    >();
    for (const assignment of assignments) {
      const unit = assignment.position.organizationUnit;
      const group = unitGroups.get(unit.id) ?? { unit, assignmentIds: [] };
      group.assignmentIds.push(assignment.id);
      unitGroups.set(unit.id, group);
    }
    const summary = scoreFor(assignments.map((assignment) => assignment.id));
    const units = [...unitGroups.values()]
      .map((group) => ({
        id: group.unit.id,
        code: group.unit.code,
        name: group.unit.name,
        type: group.unit.type,
        personnelCount: group.assignmentIds.length,
        ...scoreFor(group.assignmentIds),
      }))
      .sort((left, right) => (right.score ?? -1) - (left.score ?? -1));
    const personnel = assignments
      .filter((assignment) => assignment.id !== context.primaryAssignmentId)
      .map((assignment) => ({
        id: assignment.id,
        name:
          assignment.userProfile.fullName ??
          assignment.userProfile.username ??
          'Personel tanpa nama',
        position: assignment.position.title,
        positionCode: assignment.position.code,
        unit: assignment.position.organizationUnit,
        areas: assignment.areaScopes.map((scopeItem) => scopeItem.area),
        ...scoreFor([assignment.id]),
      }))
      .sort((left, right) => (right.score ?? -1) - (left.score ?? -1));
    const lowest = summary.indicators
      .filter((indicator) => indicator.score !== null)
      .sort((left, right) => left.score! - right.score!)[0];
    const recommendations = [
      lowest
        ? `Prioritas pembinaan adalah ${lowest.code} karena menjadi indikator terendah pada periode ini.`
        : 'Belum cukup bukti untuk menetapkan prioritas pembinaan. Pastikan tugas, Baket, dan verifikasi tercatat pada periode yang sama.',
      summary.evidence.verifications < summary.evidence.reports
        ? 'Percepat verifikasi formal dan Neraca A-F / 1-6 agar laporan tidak berhenti sebagai volume tanpa validitas.'
        : 'Pertahankan audit kualitas dan telusur sumber sebelum memakai laporan sebagai dasar keputusan.',
      summary.indicators.find((indicator) => indicator.code === 'IDX.4')
        ?.score !== null &&
      (summary.indicators.find((indicator) => indicator.code === 'IDX.4')
        ?.score ?? 100) < 70
        ? 'Hubungkan Baket terverifikasi ke analisis atau produk strategis untuk menaikkan dampak terhadap isu prioritas.'
        : 'Pantau distribusi kontribusi agar isu nasional tidak hanya ditopang oleh sedikit unit atau personel.',
    ];

    return {
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
        days: Math.max(
          1,
          Math.ceil((to.getTime() - from.getTime()) / 86_400_000),
        ),
      },
      hierarchy: [
        'NASIONAL',
        'BINDA',
        'KABUPATEN_KOTA',
        'KECAMATAN',
        'UNIT',
        'PERSONEL',
      ],
      indicatorDefinitions: [
        {
          code: 'IDX.1',
          name: 'Ketepatan waktu pelaporan',
          evidence: 'Waktu Baket dan penyelesaian tugas terhadap tenggat.',
        },
        {
          code: 'IDX.2',
          name: 'Kualitas dan kedalaman laporan',
          evidence: 'Status verifikasi serta kelulusan checklist formal.',
        },
        {
          code: 'IDX.3',
          name: 'Tingkat validasi informasi',
          evidence: 'Neraca sumber A-F dan kredibilitas informasi 1-6.',
        },
        {
          code: 'IDX.4',
          name: 'Kontribusi terhadap isu strategis',
          evidence:
            'Baket terverifikasi yang digunakan dalam analisis atau produk.',
        },
        {
          code: 'IDX.5',
          name: 'Kecepatan respons tugas UUK/STR',
          evidence: 'Waktu acknowledge dan penyelesaian penugasan.',
        },
      ],
      summary,
      units,
      personnel,
      recommendations,
    };
  }

  private bucketKey(date: Date, interval: string) {
    const value = new Date(date);
    if (interval === 'month') {
      value.setUTCDate(1);
    } else if (interval === 'week') {
      const day = value.getUTCDay() || 7;
      value.setUTCDate(value.getUTCDate() - day + 1);
    }
    value.setUTCHours(0, 0, 0, 0);
    return value.toISOString();
  }

  async dashboardTrends(
    query: DashboardTrendQuery,
    _context: AuthorizationContext,
  ) {
    this.ensureDateOrder(query.from, query.to);
    let rows: Array<{ createdAt: Date; groupValue: string | null }> = [];
    if (query.metric === 'alerts') {
      const alerts = await this.prisma.alert.findMany({
        where: this.buildCommonDateWhere('createdAt', query.from, query.to),
        select: { createdAt: true, status: true, severity: true },
      });
      rows = alerts.map((item) => ({
        createdAt: item.createdAt,
        groupValue:
          query.groupBy === 'severity'
            ? item.severity
            : query.groupBy === 'status'
              ? item.status
              : null,
      }));
    } else if (query.metric === 'products') {
      const products = await this.prisma.intelligenceProduct.findMany({
        where: {
          deletedAt: null,
          ...this.buildCommonDateWhere('createdAt', query.from, query.to),
        },
        select: { createdAt: true, status: true },
      });
      rows = products.map((item) => ({
        createdAt: item.createdAt,
        groupValue: query.groupBy === 'status' ? item.status : null,
      }));
    } else if (query.metric === 'tasks') {
      const tasks = await this.prisma.task.findMany({
        where: {
          deletedAt: null,
          ...this.buildCommonDateWhere('createdAt', query.from, query.to),
        },
        select: { createdAt: true, status: true },
      });
      rows = tasks.map((item) => ({
        createdAt: item.createdAt,
        groupValue: query.groupBy === 'status' ? item.status : null,
      }));
    } else {
      const bakets = await this.prisma.baket.findMany({
        where: {
          deletedAt: null,
          ...this.buildCommonDateWhere('createdAt', query.from, query.to),
        },
        select: { createdAt: true, status: true },
      });
      rows = bakets.map((item) => ({
        createdAt: item.createdAt,
        groupValue: query.groupBy === 'status' ? item.status : null,
      }));
    }

    const buckets = new Map<string, Map<string, number>>();
    for (const row of rows) {
      const bucket = this.bucketKey(row.createdAt, query.interval);
      const groupValue = row.groupValue ?? 'ALL';
      if (!buckets.has(bucket)) {
        buckets.set(bucket, new Map());
      }
      buckets
        .get(bucket)!
        .set(groupValue, (buckets.get(bucket)!.get(groupValue) ?? 0) + 1);
    }

    return {
      metric: query.metric,
      interval: query.interval,
      series: [...buckets.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([bucket, values]) => ({
          bucket,
          values: Object.fromEntries(values),
        })),
    };
  }

  async dashboardAreaBreakdown(
    query: DashboardAreaBreakdownQuery,
    _context: AuthorizationContext,
  ) {
    if (query.metric === 'alerts') {
      const grouped = await this.prisma.alert.groupBy({
        by: ['areaId'],
        where: {
          areaId: { not: null },
          ...this.buildCommonDateWhere('createdAt', query.from, query.to),
        },
        _count: { _all: true },
      });
      return { metric: query.metric, items: grouped.slice(0, query.limit) };
    }
    if (query.metric === 'emergencies') {
      const grouped = await this.prisma.emergencyIncident.groupBy({
        by: ['areaId'],
        where: {
          areaId: { not: null },
          ...this.buildCommonDateWhere('createdAt', query.from, query.to),
        },
        _count: { _all: true },
      });
      return { metric: query.metric, items: grouped.slice(0, query.limit) };
    }
    const bakets = await this.prisma.baket.findMany({
      where: {
        deletedAt: null,
        ...this.buildCommonDateWhere('createdAt', query.from, query.to),
      },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          select: { eventAreaId: true },
        },
      },
      take: query.limit,
    });
    const counts = new Map<string, number>();
    for (const baket of bakets) {
      const areaId = baket.versions[0]?.eventAreaId;
      if (!areaId) {
        continue;
      }
      counts.set(areaId, (counts.get(areaId) ?? 0) + 1);
    }
    return {
      metric: query.metric,
      items: [...counts.entries()].map(([areaId, count]) => ({
        areaId,
        count,
      })),
    };
  }

  async dashboardTaskPerformance(
    query: DashboardTaskPerformanceQuery,
    _context: AuthorizationContext,
  ) {
    const assignments = await this.prisma.taskAssignment.findMany({
      where: {
        task: {
          deletedAt: null,
          ...(query.unitId ? { ownerUnitId: query.unitId } : {}),
          ...this.buildCommonDateWhere('createdAt', query.from, query.to),
        },
      },
      include: {
        task: {
          include: {
            ownerUnit: true,
            targetAreas: { include: { area: true } },
          },
        },
        assignee: {
          include: {
            position: {
              include: { organizationUnit: true },
            },
          },
        },
      },
    });
    const grouped = new Map<
      string,
      { total: number; completed: number; overdue: number }
    >();
    for (const assignment of assignments) {
      const key =
        query.groupBy === 'position'
          ? assignment.assignee.position.title
          : query.groupBy === 'area'
            ? (assignment.task.targetAreas[0]?.area.name ?? 'UNSCOPED')
            : assignment.assignee.position.organizationUnit.name;
      if (!grouped.has(key)) {
        grouped.set(key, { total: 0, completed: 0, overdue: 0 });
      }
      const value = grouped.get(key)!;
      value.total += 1;
      if (assignment.status === 'COMPLETED') {
        value.completed += 1;
      }
      if (
        assignment.dueDate &&
        assignment.dueDate < new Date() &&
        assignment.status !== 'COMPLETED'
      ) {
        value.overdue += 1;
      }
    }
    return {
      groupBy: query.groupBy,
      items: [...grouped.entries()].map(([group, stats]) => ({
        group,
        ...stats,
      })),
    };
  }

  async dashboardDirectiveProgress(
    query: DashboardDirectiveProgressQuery,
    _context: AuthorizationContext,
  ) {
    const directives = await this.prisma.directive.findMany({
      where: query.directiveId ? { id: query.directiveId } : undefined,
      include: {
        versions: {
          include: {
            recipients: true,
          },
        },
      },
    });
    const items = await Promise.all(
      directives.map(async (directive) => {
        const versionIds = directive.versions.map((version) => version.id);
        const currentVersion = directive.versions.find(
          (version) => version.versionNumber === directive.currentVersionNumber,
        );
        const tasks = await this.prisma.task.count({
          where: {
            directiveVersionId: { in: versionIds },
          },
        });
        const bakets = await this.prisma.baket.count({
          where: {
            taskAssignment: {
              task: {
                directiveVersionId: { in: versionIds },
              },
            },
          },
        });
        return {
          directiveId: directive.id,
          commandNumber: directive.commandNumber,
          currentVersionNumber: directive.currentVersionNumber,
          recipients: currentVersion?.recipients.length ?? 0,
          tasks,
          bakets,
        };
      }),
    );
    return { items };
  }

  async dashboardVerificationQuality(
    query: DashboardVerificationQualityQuery,
    _context: AuthorizationContext,
  ) {
    const verifications = await this.prisma.baketVerification.findMany({
      where: this.buildCommonDateWhere('createdAt', query.from, query.to),
      select: {
        sourceReliability: true,
        informationCredibility: true,
        status: true,
        createdAt: true,
        completedAt: true,
      },
    });
    const reliability = new Map<string, number>();
    const credibility = new Map<string, number>();
    let needsDevelopment = 0;
    let totalTurnaroundHours = 0;
    let turnaroundCount = 0;
    for (const verification of verifications) {
      if (verification.sourceReliability) {
        reliability.set(
          verification.sourceReliability,
          (reliability.get(verification.sourceReliability) ?? 0) + 1,
        );
      }
      if (verification.informationCredibility) {
        credibility.set(
          verification.informationCredibility,
          (credibility.get(verification.informationCredibility) ?? 0) + 1,
        );
      }
      if (verification.status === 'NEEDS_DEVELOPMENT') {
        needsDevelopment += 1;
      }
      if (verification.completedAt) {
        totalTurnaroundHours +=
          (verification.completedAt.getTime() -
            verification.createdAt.getTime()) /
          3_600_000;
        turnaroundCount += 1;
      }
    }
    return {
      reliabilityDistribution: Object.fromEntries(reliability),
      credibilityDistribution: Object.fromEntries(credibility),
      needsDevelopmentRate:
        verifications.length === 0
          ? 0
          : Math.round((needsDevelopment / verifications.length) * 100),
      averageTurnaroundHours:
        turnaroundCount === 0
          ? 0
          : Math.round(totalTurnaroundHours / turnaroundCount),
    };
  }

  async dashboardProductStatus(
    query: DashboardQuery,
    context: AuthorizationContext,
  ) {
    const grouped = await this.prisma.intelligenceProduct.groupBy({
      by: ['status'],
      where: {
        deletedAt: null,
        ownerUnitId: context.organizationUnitId,
        ...this.buildCommonDateWhere('createdAt', query.from, query.to),
      },
      _count: { _all: true },
    });
    const activeSteps = await this.prisma.productApprovalStep.findMany({
      where: {
        status: ApprovalStepStatus.ACTIVE,
        workflow: {
          productVersion: {
            product: { ownerUnitId: context.organizationUnitId },
          },
        },
      },
      include: { workflow: true },
    });
    return {
      statuses: Object.fromEntries(
        grouped.map((group) => [group.status, group._count._all]),
      ),
      activeApprovalAging: activeSteps.map((step) => ({
        stepId: step.id,
        workflowId: step.workflowId,
        hoursOpen: step.activatedAt
          ? Math.round((Date.now() - step.activatedAt.getTime()) / 3_600_000)
          : 0,
      })),
    };
  }

  async dashboardBriefing(
    query: DashboardQuery,
    context: AuthorizationContext,
  ) {
    this.ensureDateOrder(query.from, query.to);
    const [overview, kpis, productStatus, alerts, emergencies] =
      await Promise.all([
        this.dashboardOverview(query, context),
        this.dashboardKpis(query, context),
        this.dashboardProductStatus(query, context),
        this.listAlerts({ ...query, limit: 5 }, context),
        this.listEmergencyIncidents({ ...query, limit: 5 }, context),
      ]);

    return {
      appliedScope: query,
      generatedAt: new Date().toISOString(),
      overview,
      kpis,
      productStatus,
      priorityAlerts: alerts.items,
      priorityEmergencies: emergencies.items,
      availableActions: [
        'refresh',
        'open-alert',
        'open-emergency',
        'open-product',
      ],
    };
  }

  private parseBbox(bbox: string) {
    const values = bbox.split(',').map(Number);
    if (values.length !== 4 || values.some(Number.isNaN)) {
      throw new ApiException(
        'BBOX_INVALID',
        'bbox must be minLng,minLat,maxLng,maxLat.',
        400,
      );
    }
    return {
      minLng: values[0],
      minLat: values[1],
      maxLng: values[2],
      maxLat: values[3],
    };
  }

  private async getMapReports(
    query: MapReportQuery,
    context: AuthorizationContext,
  ) {
    const bbox = this.parseBbox(query.bbox);
    const acceptedStatuses = [
      'SENT_TO_OIM',
      'UNDER_VERIFICATION',
      'NEEDS_DEVELOPMENT',
      'VERIFIED',
      'REJECTED',
    ];
    const requestedStatuses = query.status
      ? query.status
          .split(',')
          .filter((status) => acceptedStatuses.includes(status))
      : acceptedStatuses;
    const versionIds = await this.prisma.$queryRaw<
      Array<{ id: string }>
    >(Prisma.sql`
      SELECT bv.id
      FROM "BaketVersion" bv
      JOIN "Baket" b ON b.id = bv."baketId" AND b."currentVersionNumber" = bv."versionNumber"
      WHERE b."deletedAt" IS NULL
        AND b.status IN (${Prisma.join(requestedStatuses.map((status) => Prisma.sql`${status}::"BaketStatus"`))})
        AND bv.latitude IS NOT NULL
        AND bv.longitude IS NOT NULL
        AND ST_Intersects(
          COALESCE(bv."locationPoint", ST_SetSRID(ST_MakePoint(bv.longitude::double precision, bv.latitude::double precision), 4326)),
          ST_MakeEnvelope(${bbox.minLng}, ${bbox.minLat}, ${bbox.maxLng}, ${bbox.maxLat}, 4326)
        )
      LIMIT ${query.limit}
    `);
    const bakets = await this.prisma.baket.findMany({
      where: {
        ...(await this.scope.baketWhere(context)),
        status: { in: requestedStatuses as never[] },
        versions: {
          some: {
            id: { in: versionIds.map((item) => item.id) },
            ...(query.urgency ? { urgency: query.urgency as never } : {}),
            ...(query.areaId
              ? {
                  OR: [
                    { eventAreaId: query.areaId },
                    {
                      eventArea: {
                        ancestorLinks: { some: { ancestorId: query.areaId } },
                      },
                    },
                  ],
                }
              : {}),
          },
        },
        deletedAt: null,
        ...this.buildCommonDateWhere('createdAt', query.from, query.to),
      },
      include: {
        reportCategory: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          select: {
            id: true,
            title: true,
            eventTime: true,
            createdAt: true,
            latitude: true,
            longitude: true,
            urgency: true,
            eventAreaId: true,
            eventArea: true,
          },
        },
      },
      take: query.limit,
    });

    return bakets
      .map((baket) => ({
        baketId: baket.id,
        status: baket.status,
        reportCategory: baket.reportCategory,
        version: baket.versions[0],
      }))
      .filter(
        (item) =>
          item.version?.latitude !== null &&
          item.version?.latitude !== undefined &&
          item.version?.longitude !== null &&
          item.version?.longitude !== undefined &&
          Number(item.version.longitude) >= bbox.minLng &&
          Number(item.version.longitude) <= bbox.maxLng &&
          Number(item.version.latitude) >= bbox.minLat &&
          Number(item.version.latitude) <= bbox.maxLat,
      );
  }

  async mapReports(query: MapReportQuery, context: AuthorizationContext) {
    const reports = await this.getMapReports(query, context);
    return {
      type: 'FeatureCollection',
      features: reports.map((item) => ({
        type: 'Feature',
        id: item.version.id,
        geometry: {
          type: 'Point',
          coordinates: [
            Number(item.version.longitude),
            Number(item.version.latitude),
          ],
        },
        properties: {
          baketId: item.baketId,
          status: item.status,
          title: item.version.title,
          urgency: item.version.urgency,
          eventTime: item.version.eventTime,
          occurredAt: item.version.eventTime ?? item.version.createdAt,
          reportCategoryId: item.reportCategory?.id ?? null,
          reportCategoryName: item.reportCategory?.name ?? null,
          category: item.reportCategory,
          areaId: item.version.eventAreaId,
          areaName: item.version.eventArea?.name ?? null,
        },
      })),
    };
  }

  async mapBoundaries(query: MapReportQuery, context: AuthorizationContext) {
    const bbox = this.parseBbox(query.bbox);
    let areaRootIds = context.areaScopes.map((scope) => scope.areaId);
    if (query.areaId) {
      await this.scope.assertArea(context, query.areaId);
      areaRootIds = [query.areaId];
    }
    const levels =
      query.zoom <= 5
        ? ['PROVINCE']
        : query.zoom <= 9
          ? ['REGENCY', 'CITY']
          : ['DISTRICT'];
    const tolerance = Math.max(0.00001, 0.5 / 2 ** query.zoom);
    const areaScopeFilter = areaRootIds.length
      ? Prisma.sql`
        AND EXISTS (
          SELECT 1
          FROM "AdministrativeAreaClosure" scope_area
          WHERE scope_area."descendantId" = area.id
            AND scope_area."ancestorId" IN (${Prisma.join(
              areaRootIds.map((id) => Prisma.sql`${id}::uuid`),
            )})
        )
      `
      : Prisma.empty;
    const boundaries = await this.prisma.$queryRaw<
      Array<{
        id: string;
        areaId: string;
        name: string;
        level: string;
        geometry: string;
      }>
    >(Prisma.sql`
      SELECT boundary.id, area.id AS "areaId", area.name, area.level::text,
        ST_AsGeoJSON(ST_SimplifyPreserveTopology(boundary.boundary, ${tolerance})) AS geometry
      FROM "AdministrativeAreaBoundary" boundary
      JOIN "AdministrativeArea" area ON area.id = boundary."areaId"
      WHERE boundary."isActive" = true
        AND boundary."effectiveUntil" IS NULL
        AND boundary."qualityStatus" <> 'INVALID'
        ${areaScopeFilter}
        AND area.level IN (${Prisma.join(levels.map((level) => Prisma.sql`${level}::"AdministrativeLevel"`))})
        AND ST_Intersects(boundary.boundary, ST_MakeEnvelope(${bbox.minLng}, ${bbox.minLat}, ${bbox.maxLng}, ${bbox.maxLat}, 4326))
      LIMIT ${query.limit}
    `);
    return {
      type: 'FeatureCollection',
      features: boundaries.map((boundary) => ({
        type: 'Feature',
        id: boundary.id,
        geometry: JSON.parse(boundary.geometry) as unknown,
        properties: {
          areaId: boundary.areaId,
          name: boundary.name,
          level: boundary.level,
        },
      })),
    };
  }

  async mapClusters(query: MapReportQuery, context: AuthorizationContext) {
    const reports = await this.getMapReports(query, context);
    const cellSize = Math.max(0.01, 1 / Math.max(1, query.zoom));
    const clusters = new Map<
      string,
      { lng: number; lat: number; count: number }
    >();
    for (const report of reports) {
      const lat = Number(report.version.latitude);
      const lng = Number(report.version.longitude);
      const key = `${Math.floor(lng / cellSize)}:${Math.floor(lat / cellSize)}`;
      if (!clusters.has(key)) {
        clusters.set(key, { lng: 0, lat: 0, count: 0 });
      }
      const cluster = clusters.get(key)!;
      cluster.lng += lng;
      cluster.lat += lat;
      cluster.count += 1;
    }
    return {
      type: 'FeatureCollection',
      features: [...clusters.entries()].map(([key, value]) => ({
        type: 'Feature',
        id: key,
        geometry: {
          type: 'Point',
          coordinates: [value.lng / value.count, value.lat / value.count],
        },
        properties: {
          count: value.count,
        },
      })),
    };
  }

  async mapHeatmap(query: MapHeatmapQuery, context: AuthorizationContext) {
    const reports = await this.getMapReports(query, context);
    return {
      metric: query.metric ?? 'count',
      points: reports.map((report) => ({
        latitude: Number(report.version.latitude),
        longitude: Number(report.version.longitude),
        weight: query.metric === 'urgencyWeight' ? 2 : 1,
      })),
    };
  }

  async mapAreaSummary(
    query: MapAreaSummaryQuery,
    context: AuthorizationContext,
  ) {
    await this.scope.assertArea(context, query.areaId);
    const scope = await this.scope.resolve(context);
    const now = new Date();
    const [alerts, emergencies, bakets, personnelAssignments, boundary] =
      await Promise.all([
        this.prisma.alert.count({
          where: {
            OR: [
              { areaId: query.areaId },
              {
                area: { ancestorLinks: { some: { ancestorId: query.areaId } } },
              },
            ],
            ...this.buildCommonDateWhere('createdAt', query.from, query.to),
          },
        }),
        this.prisma.emergencyIncident.count({
          where: {
            OR: [
              { areaId: query.areaId },
              {
                area: { ancestorLinks: { some: { ancestorId: query.areaId } } },
              },
            ],
            ...this.buildCommonDateWhere('createdAt', query.from, query.to),
          },
        }),
        this.prisma.baket.count({
          where: {
            versions: {
              some: {
                OR: [
                  { eventAreaId: query.areaId },
                  {
                    eventArea: {
                      ancestorLinks: { some: { ancestorId: query.areaId } },
                    },
                  },
                ],
              },
            },
          },
        }),
        this.prisma.userSeatAssignment.findMany({
          where: {
            id: { in: scope.assignmentIds },
            isActive: true,
            OR: [{ validUntil: null }, { validUntil: { gt: now } }],
            userProfile: { isActive: true, deletedAt: null },
            position: {
              code: PositionCode.PETUGAS_ORGANIK,
              isActive: true,
            },
            areaScopes: {
              some: {
                validUntil: null,
                OR: [
                  { areaId: query.areaId },
                  {
                    area: {
                      ancestorLinks: {
                        some: { ancestorId: query.areaId },
                      },
                    },
                  },
                ],
              },
            },
          },
          select: {
            position: { select: { organizationUnitId: true } },
          },
        }),
        this.spatial.getActiveBoundaryGeoJson(query.areaId),
      ]);
    const units = new Set(
      personnelAssignments.map(
        (assignment) => assignment.position.organizationUnitId,
      ),
    ).size;

    return {
      areaId: query.areaId,
      boundary,
      kpis: {
        personnel: personnelAssignments.length,
        units,
        alerts,
        emergencies,
        bakets,
      },
    };
  }

  async mapTasks(query: MapReportQuery, _context: AuthorizationContext) {
    const bbox = this.parseBbox(query.bbox);
    const tasks = await this.prisma.task.findMany({
      where: {
        deletedAt: null,
        ...(query.status ? { status: query.status as TaskStatus } : {}),
        ...(query.ownerUnitId ? { ownerUnitId: query.ownerUnitId } : {}),
        ...this.buildCommonDateWhere('createdAt', query.from, query.to),
      },
      include: {
        ownerUnit: true,
        targetAreas: {
          include: { area: true },
          orderBy: { isPrimary: 'desc' },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      take: query.limit,
    });
    const located = tasks
      .map((task) => ({
        task,
        area: task.targetAreas.find(
          (target) =>
            target.area.centroidLatitude && target.area.centroidLongitude,
        )?.area,
      }))
      .filter((item) => {
        if (!item.area?.centroidLatitude || !item.area.centroidLongitude) {
          return false;
        }
        const lat = Number(item.area.centroidLatitude);
        const lng = Number(item.area.centroidLongitude);
        return (
          lng >= bbox.minLng &&
          lng <= bbox.maxLng &&
          lat >= bbox.minLat &&
          lat <= bbox.maxLat
        );
      });

    return {
      type: 'FeatureCollection',
      unlocatedCount: tasks.length - located.length,
      features: located.map((item) => ({
        type: 'Feature',
        id: item.task.id,
        geometry: {
          type: 'Point',
          coordinates: [
            Number(item.area!.centroidLongitude),
            Number(item.area!.centroidLatitude),
          ],
        },
        properties: {
          taskId: item.task.id,
          title: item.task.title,
          status: item.task.status,
          priority: item.task.priority,
          ownerUnitId: item.task.ownerUnitId,
          ownerUnitName: item.task.ownerUnit.name,
          areaId: item.area!.id,
          areaName: item.area!.name,
        },
      })),
    };
  }

  async mapAlerts(query: MapReportQuery, context: AuthorizationContext) {
    const bbox = this.parseBbox(query.bbox);
    const alerts = await this.listAlerts(
      { ...query, limit: query.limit },
      context,
    );
    const located = alerts.items.filter((alert) => {
      if (alert.latitude === null || alert.longitude === null) {
        return false;
      }
      const lat = Number(alert.latitude);
      const lng = Number(alert.longitude);
      return (
        lng >= bbox.minLng &&
        lng <= bbox.maxLng &&
        lat >= bbox.minLat &&
        lat <= bbox.maxLat
      );
    });

    return {
      type: 'FeatureCollection',
      nextCursor: alerts.nextCursor,
      unlocatedCount: alerts.items.length - located.length,
      features: located.map((alert) => ({
        type: 'Feature',
        id: alert.id,
        geometry: {
          type: 'Point',
          coordinates: [Number(alert.longitude), Number(alert.latitude)],
        },
        properties: {
          alertId: alert.id,
          title: alert.title,
          severity: alert.severity,
          status: alert.status,
          areaId: alert.areaId,
          areaName: alert.area?.name ?? null,
          assignedPositionId: alert.assignedPositionId,
        },
      })),
    };
  }

  async mapEmergencies(query: MapReportQuery, context: AuthorizationContext) {
    const bbox = this.parseBbox(query.bbox);
    const incidents = await this.listEmergencyIncidents(
      { ...query, limit: query.limit },
      context,
    );
    const located = incidents.items.filter((incident) => {
      if (incident.latitude === null || incident.longitude === null) {
        return false;
      }
      const lat = Number(incident.latitude);
      const lng = Number(incident.longitude);
      return (
        lng >= bbox.minLng &&
        lng <= bbox.maxLng &&
        lat >= bbox.minLat &&
        lat <= bbox.maxLat
      );
    });

    return {
      type: 'FeatureCollection',
      nextCursor: incidents.nextCursor,
      unlocatedCount: incidents.items.length - located.length,
      features: located.map((incident) => ({
        type: 'Feature',
        id: incident.id,
        geometry: {
          type: 'Point',
          coordinates: [Number(incident.longitude), Number(incident.latitude)],
        },
        properties: {
          incidentId: incident.id,
          title: incident.title,
          severity: incident.severity,
          status: incident.status,
          areaId: incident.areaId,
          areaName: incident.area?.name ?? null,
          reportedByAssignmentId: incident.reportedByAssignmentId,
        },
      })),
    };
  }

  async listEmergencyIncidents(
    query: EmergencyQuery,
    context: AuthorizationContext,
  ) {
    const scope = await this.scope.resolve(context);
    if (query.areaId) await this.scope.assertArea(context, query.areaId);
    const items = await this.prisma.emergencyIncident.findMany({
      where: {
        AND: [
          {
            OR: [
              ...(scope.areaRootIds.length
                ? [
                    { areaId: { in: scope.areaRootIds } },
                    {
                      area: {
                        ancestorLinks: {
                          some: {
                            ancestorId: { in: scope.areaRootIds },
                          },
                        },
                      },
                    },
                  ]
                : []),
              { reportedByAssignmentId: { in: scope.assignmentIds } },
            ],
          },
        ],
        ...(query.status ? { status: query.status as EmergencyStatus } : {}),
        ...(query.severity ? { severity: query.severity } : {}),
        ...(query.areaId ? { areaId: query.areaId } : {}),
        ...(query.reportedByAssignmentId
          ? { reportedByAssignmentId: query.reportedByAssignmentId }
          : {}),
        ...this.buildCommonDateWhere('createdAt', query.from, query.to),
      },
      ...(query.cursor
        ? {
            cursor: { id: query.cursor },
            skip: 1,
          }
        : {}),
      take: query.limit + 1,
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      include: {
        area: true,
        reportedByAssignment: {
          include: { userProfile: true, position: true },
        },
      },
    });
    return this.toCursorPage(items, query.limit);
  }

  async createEmergencyIncident(
    body: CreateEmergencyIncidentDto,
    context: AuthorizationContext,
  ) {
    this.ensureCoordinatePair(body.latitude, body.longitude);
    await this.validateAttachmentFiles(
      (body.attachmentFileIds ?? []).map((fileId) => ({ fileId })),
    );
    const resolved = await this.resolveArea(body.latitude, body.longitude);
    const incident = await this.prisma.emergencyIncident.create({
      data: {
        title: body.title,
        severity: body.severity,
        areaId: resolved.areaId,
        latitude: body.latitude,
        longitude: body.longitude,
        gpsAccuracyMeters: null,
        locationCapturedAt: new Date(),
        coordinateSource: CoordinateSource.DEVICE_GPS,
        areaResolutionMethod: resolved.method,
        situation: body.situation,
        actionTaken: body.actionTaken,
        needs: body.needs,
        reportedByAssignmentId: context.primaryAssignmentId,
        attachments: body.attachmentFileIds?.length
          ? {
              create: body.attachmentFileIds.map((fileId) => ({ fileId })),
            }
          : undefined,
      },
    });

    if (
      body.severity === AlertSeverity.CRITICAL ||
      body.severity === AlertSeverity.EMERGENCY
    ) {
      await this.prisma.alert.create({
        data: {
          title: `Alert insiden: ${body.title}`,
          description: body.situation,
          severity: body.severity,
          areaId: resolved.areaId,
          latitude: body.latitude,
          longitude: body.longitude,
          sourceIncidentId: incident.id,
          assignedPositionId: context.positionId,
        },
      });
    }
    await this.audit(
      context,
      'EMERGENCY.CREATE',
      'EmergencyIncident',
      incident.id,
    );
    return this.getEmergencyIncident(incident.id);
  }

  async getEmergencyIncident(incidentId: string, include?: string) {
    const withRelations = include?.split(',').map((item) => item.trim()) ?? [];
    return this.prisma.emergencyIncident.findUniqueOrThrow({
      where: { id: incidentId },
      include: {
        area: true,
        reportedByAssignment: {
          include: { userProfile: true, position: true },
        },
        ...(withRelations.includes('attachments')
          ? { attachments: { include: { file: true } } }
          : {}),
        ...(withRelations.includes('alerts') ? { alerts: true } : {}),
      },
    });
  }

  async updateEmergencyIncident(
    incidentId: string,
    body: UpdateEmergencyIncidentDto,
    context: AuthorizationContext,
  ) {
    const incident = await this.prisma.emergencyIncident.findUniqueOrThrow({
      where: { id: incidentId },
    });
    if (
      incident.status === EmergencyStatus.RESOLVED ||
      incident.status === EmergencyStatus.CANCELLED
    ) {
      throw new ApiException(
        'EMERGENCY_IMMUTABLE',
        'Resolved or cancelled incidents cannot be edited.',
        409,
      );
    }
    await this.prisma.emergencyIncident.update({
      where: { id: incidentId },
      data: body,
    });
    await this.audit(
      context,
      'EMERGENCY.UPDATE',
      'EmergencyIncident',
      incidentId,
    );
    return this.getEmergencyIncident(incidentId, 'attachments,alerts');
  }

  private async transitionEmergency(
    incidentId: string,
    allowed: EmergencyStatus[],
    next: EmergencyStatus,
    context: AuthorizationContext,
    metadata?: Prisma.InputJsonValue,
  ) {
    const incident = await this.prisma.emergencyIncident.findUniqueOrThrow({
      where: { id: incidentId },
    });
    if (!allowed.includes(incident.status)) {
      throw new ApiException(
        'EMERGENCY_STATE_INVALID',
        `Incident cannot transition from ${incident.status} to ${next}.`,
        409,
      );
    }
    await this.prisma.emergencyIncident.update({
      where: { id: incidentId },
      data: {
        status: next,
        ...(next === EmergencyStatus.RESOLVED
          ? { resolvedAt: new Date() }
          : {}),
      },
    });
    await this.audit(
      context,
      `EMERGENCY.${next}`,
      'EmergencyIncident',
      incidentId,
      metadata,
    );
    return this.getEmergencyIncident(incidentId, 'attachments,alerts');
  }

  async acknowledgeEmergencyIncident(
    incidentId: string,
    body: DecisionNoteDto,
    context: AuthorizationContext,
  ) {
    return this.transitionEmergency(
      incidentId,
      [EmergencyStatus.NEW],
      EmergencyStatus.ACKNOWLEDGED,
      context,
      body.note ? { note: body.note } : undefined,
    );
  }

  async verifyEmergencyIncident(
    incidentId: string,
    body: VerifyEmergencyIncidentDto,
    context: AuthorizationContext,
  ) {
    const result = await this.transitionEmergency(
      incidentId,
      [EmergencyStatus.NEW, EmergencyStatus.ACKNOWLEDGED],
      EmergencyStatus.VERIFIED,
      context,
      {
        note: body.note,
        verifiedSeverity: body.verifiedSeverity,
      },
    );
    await this.prisma.emergencyIncident.update({
      where: { id: incidentId },
      data: { severity: body.verifiedSeverity },
    });
    return result;
  }

  async startEmergencyResponse(
    incidentId: string,
    body: StartResponseDto,
    context: AuthorizationContext,
  ) {
    return this.transitionEmergency(
      incidentId,
      [EmergencyStatus.ACKNOWLEDGED, EmergencyStatus.VERIFIED],
      EmergencyStatus.IN_PROGRESS,
      context,
      body.actionPlan ? { actionPlan: body.actionPlan } : undefined,
    );
  }

  async markEmergencyControlled(
    incidentId: string,
    body: MarkControlledDto,
    context: AuthorizationContext,
  ) {
    return this.transitionEmergency(
      incidentId,
      [EmergencyStatus.IN_PROGRESS],
      EmergencyStatus.CONTROLLED,
      context,
      { note: body.note },
    );
  }

  async resolveEmergencyIncident(
    incidentId: string,
    body: ResolveEmergencyIncidentDto,
    context: AuthorizationContext,
  ) {
    const incident = await this.prisma.emergencyIncident.findUniqueOrThrow({
      where: { id: incidentId },
    });
    if (
      incident.status !== EmergencyStatus.CONTROLLED &&
      incident.status !== EmergencyStatus.IN_PROGRESS
    ) {
      throw new ApiException(
        'EMERGENCY_STATE_INVALID',
        'Incident cannot be resolved from the current state.',
        409,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.emergencyIncident.update({
        where: { id: incidentId },
        data: {
          status: EmergencyStatus.RESOLVED,
          resolvedAt: body.resolvedAt ? new Date(body.resolvedAt) : new Date(),
        },
      });
      await tx.alert.updateMany({
        where: {
          sourceIncidentId: incidentId,
          status: {
            in: [
              AlertStatus.NEW,
              AlertStatus.ACKNOWLEDGED,
              AlertStatus.ASSIGNED,
              AlertStatus.IN_PROGRESS,
            ],
          },
        },
        data: {
          status: AlertStatus.RESOLVED,
          resolvedAt: new Date(),
        },
      });
    });
    await this.audit(
      context,
      'EMERGENCY.RESOLVE',
      'EmergencyIncident',
      incidentId,
      {
        resolution: body.resolution,
      },
    );
    return this.getEmergencyIncident(incidentId, 'attachments,alerts');
  }

  async cancelEmergencyIncident(
    incidentId: string,
    body: CancelEmergencyIncidentDto,
    context: AuthorizationContext,
  ) {
    return this.transitionEmergency(
      incidentId,
      [
        EmergencyStatus.NEW,
        EmergencyStatus.ACKNOWLEDGED,
        EmergencyStatus.VERIFIED,
        EmergencyStatus.IN_PROGRESS,
        EmergencyStatus.CONTROLLED,
      ],
      EmergencyStatus.CANCELLED,
      context,
      { reason: body.reason },
    );
  }

  async listAlerts(query: AlertQuery, context: AuthorizationContext) {
    const scope = await this.scope.resolve(context);
    if (query.areaId) await this.scope.assertArea(context, query.areaId);
    const items = await this.prisma.alert.findMany({
      where: {
        AND: [
          {
            OR: [
              ...(scope.areaRootIds.length
                ? [
                    { areaId: { in: scope.areaRootIds } },
                    {
                      area: {
                        ancestorLinks: {
                          some: {
                            ancestorId: { in: scope.areaRootIds },
                          },
                        },
                      },
                    },
                  ]
                : []),
              { assignedPositionId: { in: scope.positionIds } },
              {
                sourceBaket: {
                  createdByFieldOfficerAssignmentId: {
                    in: scope.assignmentIds,
                  },
                },
              },
            ],
          },
        ],
        ...(query.status ? { status: query.status as AlertStatus } : {}),
        ...(query.severity ? { severity: query.severity } : {}),
        ...(query.areaId ? { areaId: query.areaId } : {}),
        ...(query.assignedPositionId
          ? { assignedPositionId: query.assignedPositionId }
          : {}),
        ...(query.sourceBaketId ? { sourceBaketId: query.sourceBaketId } : {}),
        ...(query.sourceIncidentId
          ? { sourceIncidentId: query.sourceIncidentId }
          : {}),
        ...this.buildCommonDateWhere('createdAt', query.from, query.to),
      },
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      take: query.limit + 1,
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      include: {
        area: true,
        sourceBaket: true,
        sourceIncident: true,
        assignedPosition: true,
      },
    });
    return this.toCursorPage(items, query.limit);
  }

  async createAlert(body: CreateAlertDto, context: AuthorizationContext) {
    this.ensureCoordinatePair(body.latitude, body.longitude);
    const resolved = body.areaId
      ? { areaId: body.areaId }
      : await this.resolveArea(body.latitude, body.longitude);
    const created = await this.prisma.alert.create({
      data: {
        title: body.title,
        description: body.description,
        severity: body.severity,
        areaId: resolved.areaId,
        latitude: body.latitude,
        longitude: body.longitude,
        sourceBaketId: body.sourceBaketId,
        sourceIncidentId: body.sourceIncidentId,
        assignedPositionId: body.assignedPositionId,
      },
    });
    if (body.assignedPositionId) {
      await this.notifyPosition(
        body.assignedPositionId,
        NotificationType.ALERT,
        'Alert baru ditugaskan',
        body.title,
        `/alerts/${created.id}`,
      );
    }
    await this.audit(context, 'ALERT.CREATE', 'Alert', created.id);
    return this.getAlert(created.id);
  }

  async getAlert(alertId: string) {
    return this.prisma.alert.findUniqueOrThrow({
      where: { id: alertId },
      include: {
        area: true,
        sourceBaket: true,
        sourceIncident: true,
        assignedPosition: true,
      },
    });
  }

  async updateAlert(
    alertId: string,
    body: UpdateAlertDto,
    context: AuthorizationContext,
  ) {
    const alert = await this.prisma.alert.findUniqueOrThrow({
      where: { id: alertId },
    });
    if (
      alert.status === AlertStatus.RESOLVED ||
      alert.status === AlertStatus.CANCELLED
    ) {
      throw new ApiException(
        'ALERT_IMMUTABLE',
        'Resolved or cancelled alerts cannot be edited.',
        409,
      );
    }
    await this.prisma.alert.update({
      where: { id: alertId },
      data: body,
    });
    await this.audit(context, 'ALERT.UPDATE', 'Alert', alertId);
    return this.getAlert(alertId);
  }

  private async transitionAlert(
    alertId: string,
    allowed: AlertStatus[],
    next: AlertStatus,
    context: AuthorizationContext,
    metadata?: Prisma.InputJsonValue,
  ) {
    const alert = await this.prisma.alert.findUniqueOrThrow({
      where: { id: alertId },
    });
    if (!allowed.includes(alert.status)) {
      throw new ApiException(
        'ALERT_STATE_INVALID',
        `Alert cannot transition from ${alert.status} to ${next}.`,
        409,
      );
    }
    await this.prisma.alert.update({
      where: { id: alertId },
      data: {
        status: next,
        ...(next === AlertStatus.ACKNOWLEDGED
          ? { acknowledgedAt: new Date() }
          : {}),
        ...(next === AlertStatus.RESOLVED ? { resolvedAt: new Date() } : {}),
      },
    });
    await this.audit(context, `ALERT.${next}`, 'Alert', alertId, metadata);
    return this.getAlert(alertId);
  }

  async acknowledgeAlert(
    alertId: string,
    body: DecisionNoteDto,
    context: AuthorizationContext,
  ) {
    return this.transitionAlert(
      alertId,
      [AlertStatus.NEW],
      AlertStatus.ACKNOWLEDGED,
      context,
      body.note ? { note: body.note } : undefined,
    );
  }

  async assignAlert(
    alertId: string,
    body: AssignAlertDto,
    context: AuthorizationContext,
  ) {
    await this.prisma.alert.update({
      where: { id: alertId },
      data: {
        assignedPositionId: body.positionId,
        status: AlertStatus.ASSIGNED,
      },
    });
    await this.notifyPosition(
      body.positionId,
      NotificationType.ALERT,
      'Alert ditugaskan',
      `Alert baru telah ditugaskan ke posisi Anda.${body.note ? ` ${body.note}` : ''}`,
      `/alerts/${alertId}`,
    );
    await this.audit(context, 'ALERT.ASSIGN', 'Alert', alertId, {
      positionId: body.positionId,
      note: body.note ?? null,
    });
    return this.getAlert(alertId);
  }

  async startAlert(alertId: string, context: AuthorizationContext) {
    return this.transitionAlert(
      alertId,
      [AlertStatus.ACKNOWLEDGED, AlertStatus.ASSIGNED],
      AlertStatus.IN_PROGRESS,
      context,
    );
  }

  async resolveAlert(
    alertId: string,
    body: ResolveAlertDto,
    context: AuthorizationContext,
  ) {
    return this.transitionAlert(
      alertId,
      [AlertStatus.ACKNOWLEDGED, AlertStatus.ASSIGNED, AlertStatus.IN_PROGRESS],
      AlertStatus.RESOLVED,
      context,
      { resolution: body.resolution },
    );
  }

  async cancelAlert(
    alertId: string,
    body: CancelAlertDto,
    context: AuthorizationContext,
  ) {
    return this.transitionAlert(
      alertId,
      [
        AlertStatus.NEW,
        AlertStatus.ACKNOWLEDGED,
        AlertStatus.ASSIGNED,
        AlertStatus.IN_PROGRESS,
      ],
      AlertStatus.CANCELLED,
      context,
      { reason: body.reason },
    );
  }

  async alertSummary(query: AlertSummaryQuery, _context: AuthorizationContext) {
    const grouped = await this.prisma.alert.groupBy({
      by: ['severity', 'status'],
      where: {
        ...(query.areaId ? { areaId: query.areaId } : {}),
        ...this.buildCommonDateWhere('createdAt', query.from, query.to),
      },
      _count: { _all: true },
    });
    return {
      items: grouped.map((group) => ({
        severity: group.severity,
        status: group.status,
        count: group._count._all,
      })),
    };
  }

  async createLocationPing(
    body: CreateLocationPingDto,
    context: AuthorizationContext,
  ) {
    this.ensureCoordinatePair(body.latitude, body.longitude);
    const assignment = await this.prisma.userSeatAssignment.findUniqueOrThrow({
      where: { id: body.positionAssignmentId },
    });
    if (
      assignment.userProfileId !== context.userProfileId ||
      !assignment.isActive
    ) {
      throw new ApiException(
        'LOCATION_ASSIGNMENT_INVALID',
        'Location ping can only be submitted for an active assignment owned by the caller.',
        403,
      );
    }
    const resolved = await this.resolveArea(body.latitude, body.longitude);
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      INSERT INTO "PersonnelLocationPing"(
        "id",
        "positionAssignmentId",
        "areaId",
        "latitude",
        "longitude",
        "locationPoint",
        "gpsAccuracyMeters",
        "coordinateSource",
        "areaResolutionMethod",
        "capturedAt",
        "receivedAt",
        "isStealth"
      )
      VALUES(
        gen_random_uuid(),
        ${body.positionAssignmentId}::uuid,
        ${resolved.areaId}::uuid,
        ${body.latitude},
        ${body.longitude},
        ST_SetSRID(ST_MakePoint(${body.longitude}, ${body.latitude}), 4326),
        ${body.gpsAccuracyMeters ?? null},
        ${body.coordinateSource}::"CoordinateSource",
        ${resolved.method}::"AreaResolutionMethod",
        ${new Date(body.capturedAt)},
        now(),
        ${body.isStealth ?? false}
      )
      RETURNING "id"
    `);
    const created = rows[0];
    await this.audit(
      context,
      'LOCATION.PING.CREATE',
      'PersonnelLocationPing',
      created.id,
    );
    return this.prisma.personnelLocationPing.findUniqueOrThrow({
      where: { id: created.id },
      select: this.locationPingSelect,
    });
  }

  async myLatestLocation(context: AuthorizationContext) {
    return this.prisma.personnelLocationPing.findFirst({
      where: { positionAssignmentId: context.primaryAssignmentId },
      orderBy: { capturedAt: 'desc' },
      select: this.ownLocationPingSelect,
    });
  }

  async latestLocation(assignmentId: string, context: AuthorizationContext) {
    await this.ensureLocationAccess(assignmentId, context);
    const ping = await this.prisma.personnelLocationPing.findFirst({
      where: { positionAssignmentId: assignmentId },
      orderBy: { capturedAt: 'desc' },
      select: this.locationPingSelect,
    });
    if (!ping) {
      throw new ApiException(
        'LOCATION_PING_NOT_FOUND',
        'Personnel has not submitted a location ping.',
        404,
      );
    }
    return ping;
  }

  async locationHistory(
    assignmentId: string,
    query: LocationHistoryQuery,
    context: AuthorizationContext,
  ) {
    await this.ensureLocationAccess(assignmentId, context);
    const items = await this.prisma.personnelLocationPing.findMany({
      where: {
        positionAssignmentId: assignmentId,
        ...this.buildCommonDateWhere('capturedAt', query.from, query.to),
      },
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      take: query.limit + 1,
      orderBy: [{ capturedAt: 'desc' }, { id: 'desc' }],
      select: this.ownLocationPingSelect,
    });
    return this.toCursorPage(items, query.limit);
  }

  async personnelLocationMap(
    query: PersonnelLocationMapQuery,
    context: AuthorizationContext,
  ) {
    const scope = await this.scope.resolve(context);
    if (query.areaId) {
      await this.scope.assertArea(context, query.areaId);
    }
    const assignments = await this.prisma.userSeatAssignment.findMany({
      where: {
        id: { in: scope.assignmentIds },
        isActive: true,
        OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
        position: {
          code: PositionCode.PETUGAS_ORGANIK,
          isActive: true,
          ...(query.unitId ? { organizationUnitId: query.unitId } : {}),
        },
        ...(query.areaId
          ? {
              areaScopes: {
                some: { areaId: query.areaId, validUntil: null },
              },
            }
          : {}),
      },
      include: {
        userProfile: true,
        areaScopes: {
          where: { validUntil: null },
          include: { area: true },
          orderBy: [{ isPrimary: 'desc' }, { validFrom: 'desc' }],
        },
        position: {
          include: {
            organizationUnit: true,
            reportsTo: {
              include: {
                organizationUnit: true,
                assignments: {
                  where: { isActive: true, validUntil: null },
                  take: 1,
                  include: { userProfile: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const assignmentIds = assignments.map((item) => item.id);
    const pings = assignmentIds.length
      ? await this.prisma.personnelLocationPing.findMany({
          where: {
            positionAssignmentId: { in: assignmentIds },
            isStealth: false,
            ...(query.capturedAfter
              ? { capturedAt: { gte: new Date(query.capturedAfter) } }
              : {}),
          },
          orderBy: [{ capturedAt: 'desc' }, { id: 'desc' }],
          include: {
            area: true,
          },
        })
      : [];

    const latest = new Map<string, (typeof pings)[number]>();
    for (const ping of pings) {
      if (!latest.has(ping.positionAssignmentId)) {
        latest.set(ping.positionAssignmentId, ping);
      }
    }

    const features = assignments.map((assignment) => {
      const ping = latest.get(assignment.id);
      const fallbackArea = assignment.areaScopes.find(
        (scope) => scope.area?.centroidLatitude && scope.area.centroidLongitude,
      )?.area;
      const latitude: number | null = ping
        ? Number(ping.latitude)
        : fallbackArea?.centroidLatitude
          ? Number(fallbackArea.centroidLatitude)
          : null;
      const longitude: number | null = ping
        ? Number(ping.longitude)
        : fallbackArea?.centroidLongitude
          ? Number(fallbackArea.centroidLongitude)
          : null;
      const supervisorAssignment =
        assignment.position.reportsTo?.assignments[0] ?? null;

      return {
        type: 'Feature',
        id: ping?.id ?? `assignment:${assignment.id}`,
        geometry:
          latitude !== null && longitude !== null
            ? {
                type: 'Point',
                coordinates: [longitude, latitude],
              }
            : null,
        properties: {
          assignmentId: assignment.id,
          capturedAt: ping?.capturedAt ?? null,
          isStealth: ping?.isStealth ?? false,
          hasLiveLocation: Boolean(ping),
          areaId: ping?.areaId ?? fallbackArea?.id ?? null,
          areaName: ping?.area?.name ?? fallbackArea?.name ?? null,
          userProfileId: assignment.userProfile.id,
          userName: assignment.userProfile.fullName,
          positionTitle: assignment.position.title,
          unitName: assignment.position.organizationUnit.name,
          supervisorAssignmentId: supervisorAssignment?.id ?? null,
          supervisorName:
            supervisorAssignment?.userProfile.fullName ??
            assignment.position.reportsTo?.title ??
            null,
          supervisorPositionTitle: assignment.position.reportsTo?.title ?? null,
          supervisorUnitName:
            assignment.position.reportsTo?.organizationUnit.name ?? null,
          canSeeStealth: false,
        },
      };
    });

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  async personnelLocationMapOld(
    query: PersonnelLocationMapQuery,
    context: AuthorizationContext,
  ) {
    const pings = await this.prisma.personnelLocationPing.findMany({
      where: {
        ...(query.areaId ? { areaId: query.areaId } : {}),
        ...(query.capturedAfter
          ? { capturedAt: { gte: new Date(query.capturedAfter) } }
          : {}),
        ...(query.includeStealth ? {} : { isStealth: false }),
        ...(query.unitId
          ? {
              positionAssignment: {
                position: { organizationUnitId: query.unitId },
              },
            }
          : {}),
      },
      orderBy: [{ capturedAt: 'desc' }, { id: 'desc' }],
      include: {
        area: true,
        positionAssignment: {
          include: {
            userProfile: true,
            position: {
              include: { organizationUnit: true },
            },
          },
        },
      },
    });

    const latest = new Map<string, (typeof pings)[number]>();
    for (const ping of pings) {
      if (!latest.has(ping.positionAssignmentId)) {
        latest.set(ping.positionAssignmentId, ping);
      }
    }

    const features = [...latest.values()].map((ping) => ({
      type: 'Feature',
      id: ping.id,
      geometry: {
        type: 'Point',
        coordinates: [Number(ping.longitude), Number(ping.latitude)],
      },
      properties: {
        assignmentId: ping.positionAssignmentId,
        capturedAt: ping.capturedAt,
        isStealth: ping.isStealth,
        areaId: ping.areaId,
        areaName: ping.area?.name ?? null,
        userProfileId: ping.positionAssignment.userProfile.id,
        userName: ping.positionAssignment.userProfile.fullName,
        positionTitle: ping.positionAssignment.position.title,
        unitName: ping.positionAssignment.position.organizationUnit.name,
        canSeeStealth:
          query.includeStealth && context.roleCode !== RoleCode.FIELD_OFFICER,
      },
    }));

    return {
      type: 'FeatureCollection',
      features,
    };
  }
}
