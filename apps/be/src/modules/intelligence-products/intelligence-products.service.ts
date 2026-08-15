import {
  OrganizationType,
  PositionCode,
} from '../../common/constants/legacy-operational-code.js';
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
  Prisma,
  ProductStatus,
  RoleCode,
  TaskAssignmentStatus,
  TaskStatus,
  WhatsAppMessageStatus,
  WhatsAppReportSessionStatus,
  Classification,
} from '../../generated/prisma/client.js';
import { ApiException } from '../../common/api/api-exception.js';
import { SYSTEM_ROLES } from '../../common/constants/system-role.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { SpatialRepository } from '../spatial/spatial.repository.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DomainScopeService } from '../access/domain-scope.service.js';
import {
  ApplicationCacheService,
  authorizationScopeIdentity,
} from '../cache/application-cache.service.js';
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
  FieldIntelligenceDashboardQuery,
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
import {
  classifyJaringActivity,
  FieldIntelligencePeriod,
  resolveFieldIntelligencePeriod,
} from './field-intelligence.util.js';

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

function deriveReportDisplayTitle(content?: string | null) {
  const words =
    content?.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean) ?? [];
  if (!words.length) return 'Baket tanpa isi';
  return `${words.slice(0, 6).join(' ')}${words.length > 6 ? '…' : ''}`;
}

@Injectable()
export class IntelligenceProductsService {
  private readonly locationPingSelect = {
    id: true,
    operationalAssignmentId: true,
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
    operationalAssignment: {
      include: { role: true, userProfile: true },
    },
  } satisfies Prisma.PersonnelLocationPingSelect;

  private readonly ownLocationPingSelect = {
    id: true,
    operationalAssignmentId: true,
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
    private readonly cache: ApplicationCacheService,
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
    assignmentId: string | null | undefined,
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
  ) {
    await this.notifyAssignment(assignmentId, type, title, message, link);
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
    const assignment = await this.prisma.userOperationalAssignment.findUnique({
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
        ownerAssignment: true,
        createdByAssignment: {
          include: { userProfile: true, role: true },
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
              include: { userProfile: true, role: true },
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
                    targetAssignment: true,
                    decidedByAssignment: {
                      include: { userProfile: true, role: true },
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
                targetAssignment: true,
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
            ownerAssignment: true,
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
          include: { userProfile: true, role: true },
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
                targetAssignment: true,
                decidedByAssignment: {
                  include: { userProfile: true, role: true },
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
            targetAssignment: true,
            targetUser: true,
          },
        },
      },
    });
  }

  private async approvalWorkflowDetail(workflowId: string): Promise<any> {
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
            targetAssignment: {
              include: {
                role: true,
                userProfile: true,
                areaScopes: {
                  where: { validUntil: null },
                  include: { area: true },
                },
              },
            },
            decidedByAssignment: {
              include: { userProfile: true, role: true },
            },
          },
        },
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  private async distributionDetail(distributionId: string): Promise<any> {
    return this.prisma.productDistribution.findUniqueOrThrow({
      where: { id: distributionId },
      include: {
        productVersion: {
          include: {
            product: true,
          },
        },
        sentByAssignment: {
          include: { userProfile: true, role: true },
        },
        targetAssignment: true,
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
    const creator =
      await this.prisma.userOperationalAssignment.findUniqueOrThrow({
        where: { id: assignmentId },
        include: {
          role: true,
          areaScopes: {
            where: { validUntil: null },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          },
        },
      });

    const areaIds = creator.areaScopes.map((scope) => scope.areaId);
    if (!areaIds.length) {
      throw new ApiException(
        'APPROVAL_ROUTE_UNRESOLVED',
        'Regional approver could not be resolved from assignment scope.',
        422,
      );
    }

    const regional = await this.prisma.userOperationalAssignment.findFirst({
      where: {
        isActive: true,
        validUntil: null,
        branch: creator.branch,
        role: { code: RoleCode.REGIONAL_COMMANDER },
        areaScopes: {
          some: {
            validUntil: null,
            area: {
              OR: [
                { id: { in: areaIds } },
                { ancestorLinks: { some: { descendantId: { in: areaIds } } } },
                { descendantLinks: { some: { ancestorId: { in: areaIds } } } },
              ],
            },
          },
        },
      },
      orderBy: [{ isPrimary: 'desc' }, { validFrom: 'desc' }],
    });
    if (!regional) {
      throw new ApiException(
        'APPROVAL_ROUTE_UNRESOLVED',
        'Regional approver could not be resolved from assignment scope.',
        422,
      );
    }

    return {
      regionalTargetAssignmentId: regional.id,
    };
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
    regionalTargetAssignmentId: string,
    actorAssignmentId: string,
  ) {
    const existing = await tx.productApprovalWorkflow.findUnique({
      where: { productVersionId: versionId },
    });
    if (existing) {
      return existing.id;
    }

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
            targetAssignmentId: regionalTargetAssignmentId,
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

    if (assignmentId === context.primaryAssignmentId) {
      return;
    }

    const scope = await this.scope.resolve(context);
    if (scope.assignmentIds.includes(assignmentId)) {
      return;
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
      AND: [
        ...(query.periodFrom
          ? [
              {
                OR: [
                  { periodEnd: { gte: new Date(query.periodFrom) } },
                  {
                    periodEnd: null,
                    periodStart: { gte: new Date(query.periodFrom) },
                  },
                ],
              } satisfies Prisma.IntelligenceProductWhereInput,
            ]
          : []),
        ...(query.periodTo
          ? [
              {
                periodStart: { lte: new Date(query.periodTo) },
              } satisfies Prisma.IntelligenceProductWhereInput,
            ]
          : []),
        ...(query.search
          ? [
              {
                OR: [
                  {
                    title: { contains: query.search, mode: 'insensitive' },
                  },
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
              } satisfies Prisma.IntelligenceProductWhereInput,
            ]
          : []),
      ],
      ...(query.status ? { status: query.status } : {}),
      ...(query.classification ? { classification: query.classification } : {}),
      ...(query.productTypeId ? { productTypeId: query.productTypeId } : {}),
      ...(query.ownerAssignmentId
        ? { ownerAssignmentId: query.ownerAssignmentId }
        : {}),
      ...(query.createdByAssignmentId
        ? { createdByAssignmentId: query.createdByAssignmentId }
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
          ownerAssignment: true,
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
        ownerAssignmentId: context.primaryAssignmentId,
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
        derivedTargets.regionalTargetAssignmentId,
        context.primaryAssignmentId,
      );
      await tx.intelligenceProduct.update({
        where: { id: productId },
        data: { status: ProductStatus.UNDER_REGIONAL_REVIEW },
      });
      return createdWorkflowId;
    });

    await this.notifyPosition(
      derivedTargets.regionalTargetAssignmentId,
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
    const search = query.search?.trim();
    const productWhere: Prisma.IntelligenceProductWhereInput = {
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { productNumber: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.productTypeId ? { productTypeId: query.productTypeId } : {}),
      ...(query.classification ? { classification: query.classification } : {}),
      ...(query.ownerAssignmentId
        ? { ownerAssignmentId: query.ownerAssignmentId }
        : {}),
      ...(query.periodFrom || query.periodTo
        ? {
            AND: [
              ...(query.periodFrom
                ? [{ periodEnd: { gte: new Date(query.periodFrom) } }]
                : []),
              ...(query.periodTo
                ? [{ periodStart: { lte: new Date(query.periodTo) } }]
                : []),
            ],
          }
        : {}),
    };
    const where: Prisma.ProductApprovalStepWhereInput = {
      AND: [
        { targetAssignmentId: context.primaryAssignmentId },
        {
          status: query.status
            ? query.status
            : { in: [ApprovalStepStatus.ACTIVE, ApprovalStepStatus.WAITING] },
        },
        ...(query.stage ? [{ stage: query.stage }] : []),
        ...(query.from ||
        query.to ||
        query.routeType ||
        Object.keys(productWhere).length
          ? [
              {
                workflow: {
                  is: {
                    ...(query.from || query.to
                      ? {
                          startedAt: {
                            ...(query.from
                              ? { gte: new Date(query.from) }
                              : {}),
                            ...(query.to ? { lte: new Date(query.to) } : {}),
                          },
                        }
                      : {}),
                    ...(query.routeType ? { routeType: query.routeType } : {}),
                    ...(Object.keys(productWhere).length
                      ? {
                          productVersion: {
                            is: { product: { is: productWhere } },
                          },
                        }
                      : {}),
                  },
                },
              },
            ]
          : []),
      ],
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
          targetAssignment: true,
          decidedByAssignment: {
            include: { userProfile: true, role: true },
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
        body.regionalTargetAssignmentId ?? body.regionalTargetPositionId,
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
        targetAssignment: true,
        decidedByAssignment: {
          include: { userProfile: true, role: true },
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
    if (step.targetAssignmentId !== context.primaryAssignmentId) {
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
      `Produk ${workflow.productVersion.product.title} telah disetujui Kepala BIN Daerah (Kabinda) dan tersedia untuk Deputi II.`,
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
    if (step.targetAssignmentId !== context.primaryAssignmentId) {
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
    if (step.targetAssignmentId !== context.primaryAssignmentId) {
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
    if (step.targetAssignmentId !== context.primaryAssignmentId) {
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
        ...workflow.steps.flatMap((step: any) => {
          const items: any[] = [];
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
      ...(query.targetAssignmentId
        ? { targetAssignmentId: query.targetAssignmentId }
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
            include: { userProfile: true, role: true },
          },
          targetAssignment: true,
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
      const created: any[] = [];
      for (const target of body.targets) {
        const setCount =
          Number(Boolean(target.targetAssignmentId)) +
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
            targetAssignmentId: target.targetAssignmentId,
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
      } else if (distribution.targetAssignmentId) {
        await this.notifyPosition(
          distribution.targetAssignmentId,
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
      distribution.targetAssignmentId === context.primaryAssignmentId ||
      distribution.targetAssignmentId === context.primaryAssignmentId;
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

  private async fieldIntelligenceJaringScopeWhere(
    context: AuthorizationContext,
  ): Promise<Prisma.JaringWhereInput> {
    if (context.authRole === SYSTEM_ROLES.EXECUTIVE) {
      return { deletedAt: null };
    }

    const resolvedScope = await this.scope.resolve(context);
    const isFieldCoordinator =
      context.authRole === SYSTEM_ROLES.FIELD_COORDINATOR;
    if (isFieldCoordinator && resolvedScope.areaRootIds.length === 0) {
      return { id: { in: [] }, deletedAt: null };
    }

    return {
      deletedAt: null,
      caretakerAssignments: {
        some: {
          ...(isFieldCoordinator
            ? {
                fieldOfficerAssignment: {
                  branch: resolvedScope.commandRouteType,
                },
              }
            : {
                fieldOfficerAssignmentId: {
                  in: resolvedScope.assignmentIds,
                },
              }),
          isActive: true,
          OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
        },
      },
      ...(resolvedScope.areaRootIds.length
        ? {
            areaCoverages: {
              some: {
                validUntil: null,
                area: {
                  OR: [
                    { id: { in: resolvedScope.areaRootIds } },
                    {
                      descendantLinks: {
                        some: {
                          ancestorId: { in: resolvedScope.areaRootIds },
                        },
                      },
                    },
                  ],
                },
              },
            },
          }
        : {}),
    };
  }

  async dashboardFieldIntelligence(
    query: FieldIntelligenceDashboardQuery,
    context: AuthorizationContext,
  ) {
    this.ensureDateOrder(query.from, query.to);
    const period = resolveFieldIntelligencePeriod(
      query.period,
      query.from,
      query.to,
    );
    const periodDateWhere = {
      createdAt: {
        ...(period.from ? { gte: period.from } : {}),
        lte: period.to,
      },
    };
    const scopedJaringWhere =
      await this.fieldIntelligenceJaringScopeWhere(context);
    const jaringRecords = await this.prisma.jaring.findMany({
      where: scopedJaringWhere,
      orderBy: [{ registeredAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        aliasName: true,
        whatsappNumber: true,
        fullName: true,
        nationalIdNumber: true,
        address: true,
        birthPlace: true,
        birthDate: true,
        gender: true,
        workplace: true,
        jobTitle: true,
        joinedAt: true,
        organizationName: true,
        politicalAffiliation: true,
        status: true,
        registrationStatus: true,
        rejectionReason: true,
        notes: true,
        registeredAt: true,
        reviewedAt: true,
        profilePhotoFileId: true,
        occupation: { select: { id: true, code: true, name: true } },
        caretakerAssignments: {
          where: {
            isActive: true,
            OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
          },
          orderBy: { validFrom: 'desc' },
          take: 1,
          select: {
            fieldOfficerAssignmentId: true,
            fieldOfficerAssignment: {
              select: {
                userProfile: {
                  select: { id: true, fullName: true, username: true },
                },
                role: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                  },
                },
                areaScopes: {
                  where: { validUntil: null },
                  orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
                  select: {
                    isPrimary: true,
                    area: {
                      select: {
                        id: true,
                        name: true,
                        code: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        areaCoverages: {
          where: { validUntil: null },
          orderBy: [{ isPrimary: 'desc' }, { validFrom: 'desc' }],
          select: {
            isPrimary: true,
            area: {
              select: {
                id: true,
                code: true,
                name: true,
                level: true,
                centroidLatitude: true,
                centroidLongitude: true,
                parent: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    level: true,
                    parent: {
                      select: {
                        id: true,
                        code: true,
                        name: true,
                        level: true,
                        parent: {
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
                },
              },
            },
          },
        },
      },
    });

    const jaringIds = jaringRecords.map((jaring) => jaring.id);
    const [lifetimeGroups, periodGroups, periodReports] = jaringIds.length
      ? await Promise.all([
          this.prisma.baket.groupBy({
            by: ['primaryJaringId', 'status'],
            where: {
              primaryJaringId: { in: jaringIds },
              deletedAt: null,
            },
            _count: { _all: true },
            _max: { createdAt: true },
          }),
          this.prisma.baket.groupBy({
            by: ['primaryJaringId', 'status'],
            where: {
              primaryJaringId: { in: jaringIds },
              deletedAt: null,
              ...periodDateWhere,
            },
            _count: { _all: true },
          }),
          this.prisma.baket.findMany({
            where: {
              primaryJaringId: { in: jaringIds },
              deletedAt: null,
              ...periodDateWhere,
            },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              primaryJaringId: true,
              status: true,
              createdAt: true,
              currentVersionNumber: true,
              reportCategory: {
                select: { id: true, code: true, name: true },
              },
              primaryJaring: {
                select: {
                  id: true,
                  aliasName: true,
                  fullName: true,
                  registrationStatus: true,
                },
              },
              versions: {
                orderBy: { versionNumber: 'desc' },
                take: 1,
                select: {
                  id: true,
                  originalContent: true,
                  normalizedContent: true,
                  createdAt: true,
                  urgency: true,
                  fieldOfficerNote: true,
                  latitude: true,
                  longitude: true,
                  gpsAccuracyMeters: true,
                  locationCapturedAt: true,
                  coordinateSource: true,
                  eventArea: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                      level: true,
                      centroidLatitude: true,
                      centroidLongitude: true,
                    },
                  },
                  attachments: {
                    select: {
                      caption: true,
                      file: {
                        select: {
                          id: true,
                          originalName: true,
                          mimeType: true,
                          fileType: true,
                          sizeBytes: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          }),
        ])
      : [[], [], []];

    const effectivePeriodReports = query.urgency
      ? periodReports.filter(
          (report) => report.versions[0]?.urgency === query.urgency,
        )
      : periodReports;
    const effectivePeriodGroups = query.urgency
      ? [
          ...effectivePeriodReports
            .reduce((accumulator: Map<string, any>, report: any) => {
              const key = `${report.primaryJaringId ?? 'UNLINKED'}:${report.status}`;
              const current = accumulator.get(key) ?? {
                primaryJaringId: report.primaryJaringId,
                status: report.status,
                _count: { _all: 0 },
              };
              current._count._all += 1;
              accumulator.set(key, current);
              return accumulator;
            }, new Map())
            .values(),
        ]
      : periodGroups;

    type ReportMetrics = {
      total: number;
      period: number;
      lastReportAt: Date | null;
      statuses: Record<string, number>;
      periodStatuses: Record<string, number>;
    };
    const reportMetrics = new Map<string, ReportMetrics>();
    for (const jaringId of jaringIds) {
      reportMetrics.set(jaringId, {
        total: 0,
        period: 0,
        lastReportAt: null,
        statuses: {},
        periodStatuses: {},
      });
    }
    for (const group of lifetimeGroups) {
      if (!group.primaryJaringId) continue;
      const metrics = reportMetrics.get(group.primaryJaringId);
      if (!metrics) continue;
      metrics.total += group._count._all;
      metrics.statuses[group.status] = group._count._all;
      if (
        group._max.createdAt &&
        (!metrics.lastReportAt || group._max.createdAt > metrics.lastReportAt)
      ) {
        metrics.lastReportAt = group._max.createdAt;
      }
    }
    for (const group of effectivePeriodGroups) {
      if (!group.primaryJaringId) continue;
      const metrics = reportMetrics.get(group.primaryJaringId);
      if (!metrics) continue;
      metrics.period += group._count._all;
      metrics.periodStatuses[group.status] = group._count._all;
    }

    const areaOptions = new Map<
      string,
      { id: string; code: string; name: string; level: string }
    >();
    const baseItems = jaringRecords.map((jaring) => {
      const coverage = jaring.areaCoverages[0];
      const village = coverage?.area;
      const district = village?.parent;
      const city = district?.parent;
      const province = city?.parent;
      const areaPath = [province, city, district, village].flatMap((area) =>
        area
          ? [
              {
                id: area.id,
                code: area.code,
                name: area.name,
                level: area.level,
              },
            ]
          : [],
      );
      for (const area of areaPath) {
        areaOptions.set(area.id, area);
      }

      const caretaker = jaring.caretakerAssignments[0];
      const assignment = caretaker?.fieldOfficerAssignment;
      const metrics = reportMetrics.get(jaring.id) ?? {
        total: 0,
        period: 0,
        lastReportAt: null,
        statuses: {},
        periodStatuses: {},
      };
      const activity = classifyJaringActivity(metrics.period, metrics.total);

      return {
        ...jaring,
        occupation: jaring.occupation,
        handler: assignment
          ? {
              assignmentId: caretaker.fieldOfficerAssignmentId,
              userProfileId: assignment.userProfile.id,
              name:
                assignment.userProfile.fullName ??
                assignment.userProfile.username,
              positionTitle: assignment.role.name,
              organizationUnit:
                assignment.areaScopes.find((scope: any) => scope.isPrimary)
                  ?.area ??
                assignment.areaScopes[0]?.area ??
                null,
            }
          : null,
        area: village
          ? {
              id: village.id,
              code: village.code,
              name: village.name,
              level: village.level,
              latitude:
                village.centroidLatitude === null
                  ? null
                  : Number(village.centroidLatitude),
              longitude:
                village.centroidLongitude === null
                  ? null
                  : Number(village.centroidLongitude),
              path: areaPath,
              pathLabel: areaPath.map((area) => area.name).join(' / '),
            }
          : null,
        activity: {
          level: activity,
          lifetimeReports: metrics.total,
          periodReports: metrics.period,
          verifiedReports: metrics.statuses.VERIFIED ?? 0,
          unverifiedReports: metrics.total - (metrics.statuses.VERIFIED ?? 0),
          lastReportAt: metrics.lastReportAt,
          statusCounts: metrics.statuses,
        },
      };
    });

    const normalizedSearch = query.search?.trim().toLocaleLowerCase('id-ID');
    const filteredItems = baseItems
      .filter((item) => {
        if (
          query.registrationStatus &&
          item.registrationStatus !== query.registrationStatus
        ) {
          return false;
        }
        if (query.jaringStatus && item.status !== query.jaringStatus) {
          return false;
        }
        if (query.activity && item.activity.level !== query.activity) {
          return false;
        }
        if (
          query.baketStatus &&
          !item.activity.statusCounts[query.baketStatus]
        ) {
          return false;
        }
        if (
          query.areaId &&
          !item.area?.path.some((area) => area.id === query.areaId)
        ) {
          return false;
        }
        if (normalizedSearch) {
          const searchable = [
            item.aliasName,
            item.fullName,
            item.whatsappNumber,
            item.address,
            item.occupation?.name,
            item.handler?.name,
            item.area?.pathLabel,
          ]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase('id-ID');
          if (!searchable.includes(normalizedSearch)) {
            return false;
          }
        }
        return true;
      })
      .sort((left, right) => {
        if (right.activity.periodReports !== left.activity.periodReports) {
          return right.activity.periodReports - left.activity.periodReports;
        }
        if (right.activity.lifetimeReports !== left.activity.lifetimeReports) {
          return right.activity.lifetimeReports - left.activity.lifetimeReports;
        }
        return (
          (right.activity.lastReportAt?.getTime() ?? 0) -
          (left.activity.lastReportAt?.getTime() ?? 0)
        );
      });

    const page = query.page;
    const start = (page - 1) * query.limit;
    const pagedItems = filteredItems.slice(start, start + query.limit);
    const latestReports = pagedItems.length
      ? await this.prisma.baket.findMany({
          where: {
            primaryJaringId: { in: pagedItems.map((item) => item.id) },
            deletedAt: null,
            ...(query.urgency
              ? { versions: { some: { urgency: query.urgency } } }
              : {}),
          },
          distinct: ['primaryJaringId'],
          orderBy: [{ primaryJaringId: 'asc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            primaryJaringId: true,
            status: true,
            createdAt: true,
            reportCategory: {
              select: { id: true, code: true, name: true },
            },
            versions: {
              orderBy: { versionNumber: 'desc' },
              take: 1,
              select: {
                id: true,
                originalContent: true,
                normalizedContent: true,
                createdAt: true,
                urgency: true,
                fieldOfficerNote: true,
                latitude: true,
                longitude: true,
                gpsAccuracyMeters: true,
                locationCapturedAt: true,
                coordinateSource: true,
              },
            },
          },
        })
      : [];
    const latestReportByJaring = new Map<
      string,
      (typeof latestReports)[number]
    >(
      latestReports
        .filter((report) => report.primaryJaringId)
        .map((report) => [report.primaryJaringId!, report] as const),
    );

    const registrationStatuses = baseItems.reduce(
      (accumulator: Record<string, number>, item: any) => {
        accumulator[item.registrationStatus] =
          (accumulator[item.registrationStatus] ?? 0) + 1;
        return accumulator;
      },
      {},
    );
    const activityStatuses = baseItems.reduce(
      (accumulator: Record<string, number>, item: any) => {
        accumulator[item.activity.level] =
          (accumulator[item.activity.level] ?? 0) + 1;
        return accumulator;
      },
      {},
    );
    const periodStatusCounts = effectivePeriodGroups.reduce(
      (accumulator: Record<string, number>, item: any) => {
        accumulator[item.status] =
          (accumulator[item.status] ?? 0) + item._count._all;
        return accumulator;
      },
      {},
    );
    const totalReports = baseItems.reduce(
      (sum, item) => sum + item.activity.lifetimeReports,
      0,
    );
    const reportsInPeriod = baseItems.reduce(
      (sum, item) => sum + item.activity.periodReports,
      0,
    );
    const reportingJaring = baseItems.filter(
      (item) => item.activity.periodReports > 0,
    ).length;

    const interval =
      query.period === FieldIntelligencePeriod.ALL
        ? 'month'
        : query.period === FieldIntelligencePeriod.DAYS_90
          ? 'week'
          : 'day';
    const trendBuckets = new Map<
      string,
      { total: number; verified: number; unverified: number }
    >();
    for (const report of effectivePeriodReports) {
      const bucket = this.bucketKey(report.createdAt, interval);
      const value = trendBuckets.get(bucket) ?? {
        total: 0,
        verified: 0,
        unverified: 0,
      };
      value.total += 1;
      if (report.status === 'VERIFIED') value.verified += 1;
      else value.unverified += 1;
      trendBuckets.set(bucket, value);
    }

    const jaringIdentityById = new Map(
      baseItems.map((item) => [
        item.id,
        {
          id: item.id,
          aliasName: item.aliasName,
          fullName: item.fullName,
          whatsappNumber: item.whatsappNumber,
          profilePhotoFileId: item.profilePhotoFileId,
          registrationStatus: item.registrationStatus,
          gaswilName: item.handler?.name ?? null,
          gaswilAssignmentId: item.handler?.assignmentId ?? null,
          gaswilUserProfileId: item.handler?.userProfileId ?? null,
          areaPathLabel: item.area?.pathLabel ?? null,
        },
      ]),
    );

    return {
      generatedAt: new Date().toISOString(),
      period: {
        preset: query.period,
        from: period.from?.toISOString() ?? null,
        to: period.to.toISOString(),
        interval,
      },
      scope: {
        role: context.authRole,
        positionTitle: context.positionTitle,
        organizationUnit: {
          id: context.primaryAssignmentId,
          name: context.organizationUnitName,
        },
        areas: context.areaScopes,
        nationalAccess: context.authRole === SYSTEM_ROLES.EXECUTIVE,
        includesUnverifiedJaring: true,
      },
      summary: {
        totalJaring: baseItems.length,
        approvedJaring: registrationStatuses.APPROVED ?? 0,
        pendingJaring: registrationStatuses.PENDING ?? 0,
        rejectedJaring: registrationStatuses.REJECTED ?? 0,
        reportingJaring,
        silentJaring: baseItems.length - reportingJaring,
        reportingCoverage:
          baseItems.length === 0
            ? 0
            : Math.round((reportingJaring / baseItems.length) * 100),
        totalReports,
        reportsInPeriod,
        verifiedReports: periodStatusCounts.VERIFIED ?? 0,
        unverifiedReports: reportsInPeriod - (periodStatusCounts.VERIFIED ?? 0),
        averageReportsPerActiveJaring:
          reportingJaring === 0
            ? 0
            : Math.round((reportsInPeriod / reportingJaring) * 10) / 10,
      },
      reportPipeline: periodStatusCounts,
      registrationStatuses,
      activityStatuses,
      trend: [...trendBuckets.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([bucket, values]) => ({ bucket, ...values })),
      recentReports: effectivePeriodReports.slice(0, 10).map((report) => ({
        id: report.id,
        status: report.status,
        createdAt: report.createdAt,
        currentVersionNumber: report.currentVersionNumber,
        category: report.reportCategory,
        jaring: report.primaryJaringId
          ? (jaringIdentityById.get(report.primaryJaringId) ??
            report.primaryJaring)
          : report.primaryJaring,
        version: report.versions[0]
          ? {
              ...report.versions[0],
              displayTitle: deriveReportDisplayTitle(
                report.versions[0].originalContent,
              ),
              reportedAt: report.versions[0].createdAt,
            }
          : null,
      })),
      filters: {
        areas: [...areaOptions.values()].sort((left, right) => {
          const order = [
            'PROVINCE',
            'REGENCY',
            'CITY',
            'DISTRICT',
            'VILLAGE',
            'URBAN_VILLAGE',
          ];
          const levelOrder =
            order.indexOf(left.level) - order.indexOf(right.level);
          return levelOrder || left.name.localeCompare(right.name, 'id-ID');
        }),
      },
      map: {
        jaring: filteredItems.flatMap((item) =>
          item.area?.latitude !== null &&
          item.area?.latitude !== undefined &&
          item.area.longitude !== null &&
          item.area.longitude !== undefined
            ? [
                {
                  id: item.id,
                  aliasName: item.aliasName,
                  fullName: item.fullName,
                  whatsappNumber: item.whatsappNumber,
                  profilePhotoFileId: item.profilePhotoFileId,
                  gaswilName: item.handler?.name ?? null,
                  gaswilAssignmentId: item.handler?.assignmentId ?? null,
                  gaswilUserProfileId: item.handler?.userProfileId ?? null,
                  registrationStatus: item.registrationStatus,
                  operationalStatus: item.status,
                  activityLevel: item.activity.level,
                  periodReports: item.activity.periodReports,
                  lifetimeReports: item.activity.lifetimeReports,
                  lastReportAt: item.activity.lastReportAt,
                  areaName: item.area.name,
                  areaPathLabel: item.area.pathLabel,
                  latitude: item.area.latitude,
                  longitude: item.area.longitude,
                },
              ]
            : [],
        ),
        baket: effectivePeriodReports.flatMap((report) => {
          const version = report.versions[0];
          const latitude =
            version?.latitude === null || version?.latitude === undefined
              ? version?.eventArea?.centroidLatitude
              : version.latitude;
          const longitude =
            version?.longitude === null || version?.longitude === undefined
              ? version?.eventArea?.centroidLongitude
              : version.longitude;

          if (
            latitude === null ||
            latitude === undefined ||
            longitude === null ||
            longitude === undefined
          ) {
            return [];
          }

          return [
            {
              id: report.id,
              status: report.status,
              createdAt: report.createdAt,
              displayTitle: deriveReportDisplayTitle(version?.originalContent),
              urgency: version?.urgency ?? null,
              reportedAt: version?.createdAt ?? report.createdAt,
              originalContent: version?.originalContent ?? null,
              normalizedContent: version?.normalizedContent ?? null,
              fieldOfficerNote: version?.fieldOfficerNote ?? null,
              gpsAccuracyMeters:
                version?.gpsAccuracyMeters === null ||
                version?.gpsAccuracyMeters === undefined
                  ? null
                  : Number(version.gpsAccuracyMeters),
              locationCapturedAt: version?.locationCapturedAt ?? null,
              coordinateSource: version?.coordinateSource ?? null,
              category: report.reportCategory,
              jaring: report.primaryJaringId
                ? (jaringIdentityById.get(report.primaryJaringId) ??
                  report.primaryJaring)
                : report.primaryJaring,
              areaName: version?.eventArea?.name ?? null,
              areaLevel: version?.eventArea?.level ?? null,
              attachments:
                version?.attachments.map((attachment) => ({
                  fileId: attachment.file.id,
                  fileName: attachment.file.originalName,
                  mimeType: attachment.file.mimeType,
                  fileType: attachment.file.fileType,
                  sizeBytes: Number(attachment.file.sizeBytes),
                  caption: attachment.caption,
                })) ?? [],
              latitude: Number(latitude),
              longitude: Number(longitude),
            },
          ];
        }),
      },
      jaring: {
        items: pagedItems.map((item) => {
          const latestReport = latestReportByJaring.get(item.id);
          return {
            ...item,
            latestReport: latestReport
              ? {
                  ...latestReport,
                  versions: latestReport.versions.map((version) => ({
                    ...version,
                    displayTitle: deriveReportDisplayTitle(
                      version.originalContent,
                    ),
                    reportedAt: version.createdAt,
                  })),
                }
              : null,
          };
        }),
        pagination: this.paginate(page, query.limit, filteredItems.length),
      },
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
            OR: [
              { ownerAssignmentId: context.primaryAssignmentId },
              {
                assignments: {
                  some: {
                    assigneeAssignmentId: context.primaryAssignmentId,
                  },
                },
              },
            ],
            deletedAt: null,
            ...this.buildCommonDateWhere('createdAt', query.from, query.to),
          },
        }),
        this.prisma.directive.count({
          where: {
            ownerAssignmentId: context.primaryAssignmentId,
            ...this.buildCommonDateWhere('createdAt', query.from, query.to),
          },
        }),
        this.prisma.intelligenceProduct.count({
          where: {
            deletedAt: null,
            ownerAssignmentId: context.primaryAssignmentId,
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
            ownerAssignmentId: context.primaryAssignmentId,
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
                product: { ownerAssignmentId: context.primaryAssignmentId },
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
    const activityFrom = new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000);
    const [baketScopeWhere, jaringScopeWhere] = await Promise.all([
      this.scope.baketWhere(context),
      this.scope.jaringWhere(context),
    ]);
    const activeAssignmentWhere = {
      isActive: true,
      OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
    };
    const [
      assignments,
      taskAssignments,
      bakets,
      jaringRecords,
      periodReports,
      activityReports,
    ]: [any[], any[], any[], any[], any[], any[]] = await Promise.all([
      this.prisma.userOperationalAssignment.findMany({
        where: {
          id: { in: scope.assignmentIds },
          ...activeAssignmentWhere,
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          branch: true,
          userProfile: { select: { id: true, fullName: true, username: true } },
          role: { select: { code: true, name: true } },
          areaScopes: {
            where: { validUntil: null },
            select: {
              isPrimary: true,
              area: {
                select: {
                  id: true,
                  code: true,
                  officialCode: true,
                  name: true,
                  level: true,
                  parentId: true,
                },
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
          ...baketScopeWhere,
        },
        select: {
          id: true,
          createdByFieldOfficerAssignmentId: true,
          primaryJaringId: true,
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
      this.prisma.jaring.findMany({
        where: jaringScopeWhere,
        orderBy: [{ aliasName: 'asc' }, { fullName: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          aliasName: true,
          fullName: true,
          status: true,
          registrationStatus: true,
          caretakerAssignments: {
            where: {
              isActive: true,
              OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
            },
            take: 1,
            select: {
              fieldOfficerAssignmentId: true,
              fieldOfficerAssignment: {
                select: {
                  id: true,
                  userProfile: {
                    select: { fullName: true, username: true },
                  },
                  role: { select: { code: true, name: true } },
                  areaScopes: {
                    where: { validUntil: null },
                    select: {
                      isPrimary: true,
                      area: {
                        select: {
                          id: true,
                          code: true,
                          officialCode: true,
                          name: true,
                          level: true,
                          parentId: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          areaCoverages: {
            where: { validUntil: null },
            select: {
              isPrimary: true,
              area: {
                select: {
                  id: true,
                  code: true,
                  officialCode: true,
                  name: true,
                  level: true,
                  parentId: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.whatsAppReportSession.findMany({
        where: {
          fieldOfficerAssignmentId: { in: scope.assignmentIds },
          OR: [{ submittedAt: dateWhere }, { startedAt: dateWhere }],
        },
        select: {
          id: true,
          jaringId: true,
          fieldOfficerAssignmentId: true,
          content: true,
          latitude: true,
          longitude: true,
          status: true,
          startedAt: true,
          submittedAt: true,
          closedAt: true,
          media: {
            where: { deletedAt: null },
            select: { id: true },
          },
          submittedMessage: {
            select: {
              convertedBaketId: true,
              validationSummary: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.whatsAppReportSession.findMany({
        where: {
          fieldOfficerAssignmentId: { in: scope.assignmentIds },
          submittedAt: { gte: activityFrom, lte: to },
        },
        select: {
          id: true,
          jaringId: true,
          fieldOfficerAssignmentId: true,
          submittedAt: true,
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
    const baketsByJaring = new Map<string, typeof bakets>();
    for (const baket of bakets) {
      const items =
        baketsByAssignment.get(baket.createdByFieldOfficerAssignmentId) ?? [];
      items.push(baket);
      baketsByAssignment.set(baket.createdByFieldOfficerAssignmentId, items);
      if (baket.primaryJaringId) {
        const jaringItems = baketsByJaring.get(baket.primaryJaringId) ?? [];
        jaringItems.push(baket);
        baketsByJaring.set(baket.primaryJaringId, jaringItems);
      }
    }
    const reportsByAssignment = new Map<string, typeof periodReports>();
    const reportsByJaring = new Map<string, typeof periodReports>();
    for (const report of periodReports) {
      const assignmentItems =
        reportsByAssignment.get(report.fieldOfficerAssignmentId) ?? [];
      assignmentItems.push(report);
      reportsByAssignment.set(report.fieldOfficerAssignmentId, assignmentItems);

      const jaringItems = reportsByJaring.get(report.jaringId) ?? [];
      jaringItems.push(report);
      reportsByJaring.set(report.jaringId, jaringItems);
    }
    const activeJaringIds = new Set(
      activityReports
        .filter((report) => Boolean(report.submittedAt))
        .map((report) => report.jaringId),
    );
    const allAreaIds = [
      ...new Set(
        [
          ...assignments.flatMap((assignment) =>
            assignment.areaScopes.map((scopeItem: any) => scopeItem.area.id),
          ),
          ...jaringRecords.flatMap((jaring) =>
            jaring.areaCoverages.map((coverage: any) => coverage.area.id),
          ),
        ].filter(Boolean),
      ),
    ];
    const areaLinks = allAreaIds.length
      ? await this.prisma.administrativeAreaClosure.findMany({
          where: {
            descendantId: { in: allAreaIds },
            ancestor: {
              level: {
                in: ['PROVINCE', 'REGENCY', 'CITY', 'DISTRICT'],
              },
              isActive: true,
              deletedAt: null,
            },
          },
          orderBy: [{ depth: 'asc' }],
          select: {
            descendantId: true,
            depth: true,
            ancestor: {
              select: {
                id: true,
                code: true,
                officialCode: true,
                name: true,
                level: true,
                parentId: true,
              },
            },
          },
        })
      : [];
    const ancestorsByArea = new Map<string, typeof areaLinks>();
    for (const link of areaLinks) {
      const links = ancestorsByArea.get(link.descendantId) ?? [];
      links.push(link);
      ancestorsByArea.set(link.descendantId, links);
    }

    const average = (values: number[]) =>
      values.length
        ? Math.round(
            (values.reduce((sum, value) => sum + value, 0) / values.length) *
              10,
          ) / 10
        : null;
    const unique = (values: Array<string | null | undefined>) => [
      ...new Set(values.filter((value): value is string => Boolean(value))),
    ];
    const pickPrimaryArea = <
      T extends {
        id: string;
        code?: string | null;
        officialCode?: string | null;
        name?: string | null;
        level?: string | null;
        parentId?: string | null;
      },
    >(
      scopes: Array<{ isPrimary?: boolean | null; area: T }>,
    ) =>
      (scopes.find((scopeItem) => scopeItem.isPrimary) ?? scopes[0])?.area ??
      null;
    const areaAtLevel = (
      areaId: string | null | undefined,
      levels: string[],
    ) => {
      if (!areaId) return null;
      return (
        ancestorsByArea
          .get(areaId)
          ?.map((link: any) => link.ancestor)
          .find((area: any) => levels.includes(area.level)) ?? null
      );
    };
    const areaLabel = (area: { name: string; level: string } | null) =>
      area ? `${area.name}` : 'Wilayah belum ditentukan';
    const assignmentName = (assignment: (typeof assignments)[number]) =>
      assignment.userProfile.fullName ??
      assignment.userProfile.username ??
      assignment.role.name ??
      'Personel tanpa nama';
    const scoreFor = (assignmentIds: string[], jaringIds: string[] = []) => {
      const scopedAssignmentIds = unique(assignmentIds);
      const scopedJaringIds = unique(jaringIds);
      const tasks = scopedAssignmentIds.flatMap(
        (id) => tasksByAssignment.get(id) ?? [],
      );
      const reportsById = new Map(
        [
          ...scopedAssignmentIds.flatMap((id) => baketsByAssignment.get(id) ?? []),
          ...scopedJaringIds.flatMap((id) => baketsByJaring.get(id) ?? []),
        ].map((baket) => [baket.id, baket]),
      );
      const reports = [...reportsById.values()];
      const reportSessionsById = new Map(
        [
          ...scopedAssignmentIds.flatMap(
            (id) => reportsByAssignment.get(id) ?? [],
          ),
          ...scopedJaringIds.flatMap((id) => reportsByJaring.get(id) ?? []),
        ].map((report) => [report.id, report]),
      );
      const jaringReports = [...reportSessionsById.values()];
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
      const jaringActivityScores = scopedJaringIds.map((id) =>
        activeJaringIds.has(id) ? 100 : 0,
      );
      const baketAssessments = reports
        .map((baket) => baket.versions[0]?.verification)
        .filter(
          (verification): verification is NonNullable<typeof verification> =>
            Boolean(verification),
        );
      const qualityScores = baketAssessments.map((verification) => {
        const statusScore =
          verification.status === 'VERIFIED'
            ? 100
            : verification.status === 'NEEDS_DEVELOPMENT'
              ? 55
              : verification.status === 'REJECTED'
                ? 20
                : 45;
        const applicableChecks = verification.checks.filter(
          (check: any) => check.status !== 'NOT_APPLICABLE',
        );
        const checkScore = applicableChecks.length
          ? (applicableChecks.filter((check: any) => check.status === 'PASS')
              .length /
              applicableChecks.length) *
            100
          : statusScore;
        return statusScore * 0.65 + checkScore * 0.35;
      });
      const reportQualityScores = jaringReports.map((report) => {
        const hasContent = Boolean(report.content?.trim());
        const hasCoordinate =
          report.latitude !== null && report.longitude !== null;
        const hasMedia = report.media.length > 0;
        const hasSubmitted =
          report.status === WhatsAppReportSessionStatus.SUBMITTED ||
          report.status === WhatsAppReportSessionStatus.CLOSED ||
          Boolean(report.submittedAt);
        return (
          (hasContent ? 25 : 0) +
          (hasCoordinate ? 25 : 0) +
          (hasMedia ? 25 : 0) +
          (hasSubmitted ? 25 : 0)
        );
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
      const validityScores = baketAssessments
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
      const contributionScores = baketAssessments.map((verification) =>
        verification.productSources.length ||
        verification.analysisSources.length
          ? 100
          : 35,
      );
      const reportContributionScores = jaringReports.map((report) =>
        report.submittedMessage?.convertedBaketId ? 85 : 35,
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
      const reportResponseScores = jaringReports.map((report) => {
        if (report.submittedAt) return 100;
        if (report.closedAt) return 70;
        if (report.status === WhatsAppReportSessionStatus.ACTIVE) return 45;
        return 20;
      });
      const indicators = [
        {
          code: 'IDX.1',
          score: average([
            ...taskTimeliness,
            ...reportTimeliness,
            ...jaringActivityScores,
          ]),
          sample:
            taskTimeliness.length +
            reportTimeliness.length +
            jaringActivityScores.length,
        },
        {
          code: 'IDX.2',
          score: average([...qualityScores, ...reportQualityScores]),
          sample: qualityScores.length + reportQualityScores.length,
        },
        {
          code: 'IDX.3',
          score: average(validityScores),
          sample: validityScores.length,
        },
        {
          code: 'IDX.4',
          score: average([
            ...contributionScores,
            ...reportContributionScores,
          ]),
          sample: contributionScores.length + reportContributionScores.length,
        },
        {
          code: 'IDX.5',
          score: average([...responseScores, ...reportResponseScores]),
          sample: responseScores.length + reportResponseScores.length,
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
          jaringReports: jaringReports.length,
          jaring: scopedJaringIds.length,
          activeJaring90Days: scopedJaringIds.filter((id) =>
            activeJaringIds.has(id),
          ).length,
          baketAssessments: baketAssessments.length,
          verifications: baketAssessments.length,
          measuredIndicators: measured.length,
        },
      };
    };

    const hierarchyNodes = new Map<
      string,
      {
        id: string;
        code: string;
        name: string;
        type: string;
        hierarchyLevel: 'BINDA' | 'KORWIL' | 'GASWIL' | 'JARING';
        levelLabel: string;
        parentId: string | null;
        scopeArea: { id: string; code: string; name: string; level: string } | null;
        assignmentIds: Set<string>;
        jaringIds: Set<string>;
      }
    >();
    const getNode = (
      input: Omit<
        (typeof hierarchyNodes extends Map<string, infer T> ? T : never),
        'assignmentIds' | 'jaringIds'
      >,
    ) => {
      const existing = hierarchyNodes.get(input.id);
      if (existing) return existing;
      const created = {
        ...input,
        assignmentIds: new Set<string>(),
        jaringIds: new Set<string>(),
      };
      hierarchyNodes.set(input.id, created);
      return created;
    };
    const ensureAreaNodes = (areaId: string | null | undefined) => {
      const district = areaAtLevel(areaId, ['DISTRICT']);
      const regency = areaAtLevel(areaId, ['REGENCY', 'CITY']);
      const province = areaAtLevel(areaId, ['PROVINCE']);
      const binda = province
        ? getNode({
            id: `binda:${province.id}`,
            code: province.officialCode ?? province.code,
            name: `BIN Daerah (Binda) ${province.name}`,
            type: 'BINDA',
            hierarchyLevel: 'BINDA',
            levelLabel: 'Kinerja Binda',
            parentId: null,
            scopeArea: province,
          })
        : null;
      const korwil = regency
        ? getNode({
            id: `korwil:${regency.id}`,
            code: regency.officialCode ?? regency.code,
            name: `Koordinator Wilayah (Korwil) ${regency.name}`,
            type: 'KORWIL',
            hierarchyLevel: 'KORWIL',
            levelLabel: 'Kinerja Korwil',
            parentId: binda?.id ?? null,
            scopeArea: regency,
          })
        : null;
      const gaswilArea = district
        ? {
            id: district.id,
            code: district.officialCode ?? district.code,
            name: district.name,
            level: district.level,
          }
        : null;
      return { province, regency, district, binda, korwil, gaswilArea };
    };
    for (const assignment of assignments) {
      const primaryArea = pickPrimaryArea(assignment.areaScopes);
      const nodes = ensureAreaNodes(primaryArea?.id);
      if (assignment.role.code === RoleCode.REGIONAL_COMMANDER && nodes.binda) {
        nodes.binda.assignmentIds.add(assignment.id);
      }
      if (assignment.role.code === RoleCode.FIELD_COORDINATOR && nodes.korwil) {
        nodes.korwil.assignmentIds.add(assignment.id);
      }
      if (assignment.role.code === RoleCode.FIELD_OFFICER) {
        const gaswil = getNode({
          id: `gaswil:${assignment.id}`,
          code: primaryArea?.officialCode ?? primaryArea?.code ?? assignment.id,
          name: assignmentName(assignment),
          type: 'GASWIL',
          hierarchyLevel: 'GASWIL',
          levelLabel: 'Kinerja Gaswil',
          parentId: nodes.korwil?.id ?? nodes.binda?.id ?? null,
          scopeArea: nodes.gaswilArea,
        });
        gaswil.assignmentIds.add(assignment.id);
      }
    }
    for (const jaring of jaringRecords) {
      const primaryCoverage = pickPrimaryArea(jaring.areaCoverages);
      const nodes = ensureAreaNodes(primaryCoverage?.id);
      const caretaker = jaring.caretakerAssignments[0];
      const gaswilAssignment = caretaker?.fieldOfficerAssignment;
      const gaswilId = caretaker?.fieldOfficerAssignmentId
        ? `gaswil:${caretaker.fieldOfficerAssignmentId}`
        : null;
      const gaswil = gaswilAssignment
        ? (hierarchyNodes.get(gaswilId!) ??
          getNode({
            id: gaswilId!,
            code:
              nodes.gaswilArea?.code ??
              caretaker.fieldOfficerAssignmentId,
            name:
              gaswilAssignment.userProfile.fullName ??
              gaswilAssignment.userProfile.username ??
              'Petugas Wilayah (Gaswil) tanpa nama',
            type: 'GASWIL',
            hierarchyLevel: 'GASWIL',
            levelLabel: 'Kinerja Gaswil',
            parentId: nodes.korwil?.id ?? nodes.binda?.id ?? null,
            scopeArea: nodes.gaswilArea,
          }))
        : null;
      const jaringLabel =
        jaring.aliasName ?? jaring.fullName ?? `Jaring ${jaring.id}`;
      const jaringNode = getNode({
        id: `jaring:${jaring.id}`,
        code: jaring.aliasName ?? jaring.id,
        name: jaringLabel,
        type: jaring.status,
        hierarchyLevel: 'JARING',
        levelLabel: 'Kinerja Jaring',
        parentId: gaswil?.id ?? nodes.korwil?.id ?? nodes.binda?.id ?? null,
        scopeArea: primaryCoverage
          ? {
              id: primaryCoverage.id,
              code:
                primaryCoverage.officialCode ??
                primaryCoverage.code ??
                primaryCoverage.id,
              name: primaryCoverage.name ?? 'Wilayah belum ditentukan',
              level: primaryCoverage.level ?? 'UNKNOWN',
            }
          : null,
      });
      jaringNode.jaringIds.add(jaring.id);
      if (caretaker?.fieldOfficerAssignmentId) {
        jaringNode.assignmentIds.add(caretaker.fieldOfficerAssignmentId);
        gaswil?.assignmentIds.add(caretaker.fieldOfficerAssignmentId);
      }
      for (const node of [gaswil, nodes.korwil, nodes.binda]) {
        node?.jaringIds.add(jaring.id);
        if (caretaker?.fieldOfficerAssignmentId) {
          node?.assignmentIds.add(caretaker.fieldOfficerAssignmentId);
        }
      }
    }
    const summary = scoreFor(
      assignments.map((assignment) => assignment.id),
      jaringRecords.map((jaring) => jaring.id),
    );
    const levelOrder = new Map([
      ['BINDA', 1],
      ['KORWIL', 2],
      ['GASWIL', 3],
      ['JARING', 4],
    ]);
    const units = [...hierarchyNodes.values()]
      .map((group) => ({
        id: group.id,
        code: group.code,
        name: group.name,
        type: group.type,
        hierarchyLevel: group.hierarchyLevel,
        levelLabel: group.levelLabel,
        parentId: group.parentId,
        scopeArea: group.scopeArea,
        personnelCount: group.assignmentIds.size,
        jaringCount: group.jaringIds.size,
        ...scoreFor([...group.assignmentIds], [...group.jaringIds]),
      }))
      .sort(
        (left, right) =>
          (levelOrder.get(left.hierarchyLevel) ?? 99) -
            (levelOrder.get(right.hierarchyLevel) ?? 99) ||
          (right.score ?? -1) - (left.score ?? -1) ||
          left.name.localeCompare(right.name, 'id-ID'),
      );
    const personnel = assignments
      .filter((assignment) => assignment.id !== context.primaryAssignmentId)
      .map((assignment) => ({
        id: assignment.id,
        name: assignmentName(assignment),
        position: assignment.role.name,
        positionCode: assignment.role.code,
        hierarchyLevel:
          assignment.role.code === RoleCode.REGIONAL_COMMANDER
            ? 'BINDA'
            : assignment.role.code === RoleCode.FIELD_COORDINATOR
              ? 'KORWIL'
              : assignment.role.code === RoleCode.FIELD_OFFICER
                ? 'GASWIL'
                : 'PERSONEL',
        unit: {
          id: assignment.areaScopes[0]?.area.id ?? assignment.id,
          code: assignment.areaScopes[0]?.area.officialCode ?? assignment.areaScopes[0]?.area.code ?? assignment.id,
          name: areaLabel(assignment.areaScopes[0]?.area ?? null),
          type: assignment.branch,
        },
        areas: assignment.areaScopes.map((scopeItem: any) => scopeItem.area),
        ...scoreFor(
          [assignment.id],
          jaringRecords
            .filter(
              (jaring) =>
                jaring.caretakerAssignments[0]?.fieldOfficerAssignmentId ===
                assignment.id,
            )
            .map((jaring) => jaring.id),
        ),
      }))
      .sort((left, right) => (right.score ?? -1) - (left.score ?? -1));
    const lowest = summary.indicators
      .filter((indicator) => indicator.score !== null)
      .sort((left, right) => left.score! - right.score!)[0];
    const recommendations = [
      lowest
        ? `Prioritas pembinaan adalah ${lowest.code} karena menjadi indikator terendah pada periode ini.`
        : 'Belum cukup bukti untuk menetapkan prioritas pembinaan. Pastikan Laporan Jaring, Baket, dan tugas tercatat pada periode yang sama.',
      summary.evidence.baketAssessments < summary.evidence.reports
        ? 'Lengkapi penilaian Baket dan Neraca A-F / 1-6 agar validitas informasi dapat dihitung.'
        : 'Pertahankan audit kualitas dan telusur sumber sebelum memakai Baket sebagai dasar keputusan.',
      summary.indicators.find((indicator) => indicator.code === 'IDX.4')
        ?.score !== null &&
      (summary.indicators.find((indicator) => indicator.code === 'IDX.4')
        ?.score ?? 100) < 70
        ? 'Hubungkan Baket ke analisis atau Produk Intelijen untuk menaikkan dampak terhadap isu prioritas.'
        : 'Pantau distribusi kontribusi agar isu nasional tidak hanya ditopang oleh sedikit unit atau personel.',
    ];

    return {
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
        activityFrom: activityFrom.toISOString(),
        days: Math.max(
          1,
          Math.ceil((to.getTime() - from.getTime()) / 86_400_000),
        ),
      },
      hierarchy: [
        'Kinerja Binda',
        'Kinerja Korwil',
        'Kinerja Gaswil',
        'Kinerja Jaring',
      ],
      indicatorDefinitions: [
        {
          code: 'IDX.1',
          name: 'Aktivitas dan ketepatan pelaporan',
          evidence:
            'Jaring Aktif 90 Hari, pembuatan Baket, dan penyelesaian tugas terhadap tenggat.',
          formula:
            'Rerata skor: Jaring aktif 90 hari = 100, tidak aktif = 0; Baket/tugas tepat tenggat = 100, terlambat = 40.',
        },
        {
          code: 'IDX.2',
          name: 'Kualitas dan kedalaman laporan',
          evidence:
            'Kualitas isi Laporan Jaring, Live Location, media pendukung, serta checklist penilaian Baket bila tersedia.',
          formula:
            'Rerata skor: Laporan Jaring memakai isi, Live Location, media, dan status kirim masing-masing 25; Baket memakai status penilaian 65% + checklist 35%.',
        },
        {
          code: 'IDX.3',
          name: 'Validitas informasi',
          evidence:
            'Neraca sumber A-F dan kredibilitas informasi 1-6 pada Baket.',
          formula:
            'Rerata skor Baket: reliabilitas sumber A=100 sampai F=15 dan kredibilitas informasi 1=100 sampai 6=15; skor adalah rata-rata keduanya.',
        },
        {
          code: 'IDX.4',
          name: 'Kontribusi terhadap isu strategis',
          evidence:
            'Baket yang digunakan dalam analisis atau Produk Intelijen.',
          formula:
            'Rerata skor: Baket dipakai dalam analisis/produk = 100, belum dipakai = 35; Laporan Jaring yang sudah menjadi Baket = 85, belum menjadi Baket = 35.',
        },
        {
          code: 'IDX.5',
          name: 'Kecepatan respons tugas UUK/STR',
          evidence:
            'Waktu acknowledge, penyelesaian penugasan, dan status pengiriman Laporan Jaring.',
          formula:
            'Rerata skor: acknowledge <=6 jam 100, <=24 jam 85, <=48 jam 65, selebihnya 35; tugas selesai tepat waktu 100, terlambat 45; Laporan Jaring terkirim 100, aktif belum terkirim 45.',
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
          ...(query.unitId ? { ownerAssignmentId: query.unitId } : {}),
          ...this.buildCommonDateWhere('createdAt', query.from, query.to),
        },
      },
      include: {
        task: {
          include: {
            ownerAssignment: true,
            targetAreas: { include: { area: true } },
          },
        },
        assignee: {
          include: {
            role: true,
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
          ? assignment.assignee.role.name
          : query.groupBy === 'area'
            ? (assignment.task.targetAreas[0]?.area.name ?? 'UNSCOPED')
            : assignment.assignee.branch;
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
        ownerAssignmentId: context.primaryAssignmentId,
        ...this.buildCommonDateWhere('createdAt', query.from, query.to),
      },
      _count: { _all: true },
    });
    const activeSteps = await this.prisma.productApprovalStep.findMany({
      where: {
        status: ApprovalStepStatus.ACTIVE,
        workflow: {
          productVersion: {
            product: { ownerAssignmentId: context.primaryAssignmentId },
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

  async fieldOfficerDashboard(context: AuthorizationContext) {
    return this.cache.getOrSet(
      {
        namespace: 'field-officer-summary',
        identity: authorizationScopeIdentity(context),
        ttlMs: 10_000,
      },
      () => this.loadFieldOfficerDashboard(context),
    );
  }

  private async loadFieldOfficerDashboard(context: AuthorizationContext) {
    const assignmentId = context.primaryAssignmentId;

    const [
      totalJaringCount,
      activeTasks,
      recentMessages,
      recentBakets,
      assignedAreas,
    ] = await Promise.all([
      // Total Jaring binaan aktif di bawah Petugas Wilayah (Gaswil)
      this.prisma.jaringCaretakerAssignment.count({
        where: {
          fieldOfficerAssignmentId: assignmentId,
          isActive: true,
          jaring: { status: 'ACTIVE', deletedAt: null },
        },
      }),

      // Daftar Tugas Aktif yang ditugaskan ke Petugas Wilayah (Gaswil)
      this.prisma.taskAssignment.findMany({
        where: {
          assigneeAssignmentId: assignmentId,
          status: {
            in: [
              TaskAssignmentStatus.SENT,
              TaskAssignmentStatus.READ,
              TaskAssignmentStatus.ACKNOWLEDGED,
              TaskAssignmentStatus.IN_PROGRESS,
            ],
          },
          task: { deletedAt: null },
        },
        take: 10,
        orderBy: { assignedAt: 'desc' },
        include: {
          task: {
            select: {
              id: true,
              title: true,
              priority: true,
              status: true,
              dueDate: true,
              createdAt: true,
            },
          },
        },
      }),

      // Pesan WhatsApp / Laporan Masuk dari Jaring
      this.prisma.whatsAppMessage.findMany({
        where: {
          jaring: {
            caretakerAssignments: {
              some: {
                fieldOfficerAssignmentId: assignmentId,
                isActive: true,
              },
            },
          },
        },
        take: 10,
        orderBy: { receivedAt: 'desc' },
        select: {
          id: true,
          content: true,
          receivedAt: true,
          status: true,
          jaring: {
            select: {
              id: true,
              aliasName: true,
              fullName: true,
            },
          },
        },
      }),

      // Laporan Informasi / Baket yang Dibuat Petugas Wilayah (Gaswil)
      this.prisma.baket.findMany({
        where: {
          createdByFieldOfficerAssignmentId: assignmentId,
          deletedAt: null,
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          createdAt: true,
          reportCategory: {
            select: { id: true, name: true },
          },
          versions: {
            take: 1,
            orderBy: { versionNumber: 'desc' },
            select: {
              originalContent: true,
              normalizedContent: true,
            },
          },
        },
      }),

      // Cakupan Wilayah Tugas Petugas Wilayah (Gaswil)
      this.prisma.userAreaScope.findMany({
        where: {
          operationalAssignmentId: assignmentId,
        },
        select: {
          area: {
            select: {
              id: true,
              name: true,
              code: true,
              officialCode: true,
              level: true,
            },
          },
        },
      }),
    ]);

    const activeTaskCount = activeTasks.length;
    const pendingMessageCount = recentMessages.filter(
      (m) =>
        m.status === WhatsAppMessageStatus.RECEIVED ||
        m.status === WhatsAppMessageStatus.ROUTED ||
        m.status === WhatsAppMessageStatus.UNDER_REVIEW ||
        m.status === WhatsAppMessageStatus.READY_FOR_BAKET,
    ).length;
    const draftBaketCount = recentBakets.filter(
      (b) => b.status === 'DRAFT',
    ).length;

    return {
      summary: {
        totalJaring: totalJaringCount,
        activeTasks: activeTaskCount,
        pendingMessages: pendingMessageCount,
        totalBaket: recentBakets.length,
        draftBaket: draftBaketCount,
      },
      myTasks: activeTasks.map((ta) => ({
        assignmentId: ta.id,
        taskId: ta.task.id,
        title: ta.task.title,
        priority: ta.task.priority,
        status: ta.status,
        dueDate: ta.task.dueDate,
        createdAt: ta.task.createdAt,
      })),
      recentIncomingMessages: recentMessages.map((msg) => ({
        id: msg.id,
        jaring: msg.jaring,
        messageText: msg.content,
        receivedAt: msg.receivedAt,
        status: msg.status,
      })),
      recentBakets: recentBakets.map((b) => ({
        id: b.id,
        title: (
          b.versions[0]?.normalizedContent?.trim() ||
          b.versions[0]?.originalContent.trim() ||
          'Laporan Baket'
        ).slice(0, 160),
        status: b.status,
        category: b.reportCategory?.name ?? null,
        createdAt: b.createdAt,
      })),
      assignedAreas: assignedAreas.map((uas) => uas.area),
    };
  }

  async dashboardBriefing(
    query: DashboardQuery,
    context: AuthorizationContext,
  ) {
    return this.cache.getOrSet(
      {
        namespace: 'dashboard-briefing',
        identity: {
          scope: authorizationScopeIdentity(context),
          query,
        },
        ttlMs: 15_000,
      },
      () => this.loadDashboardBriefing(query, context),
    );
  }

  private async loadDashboardBriefing(
    query: DashboardQuery,
    context: AuthorizationContext,
  ) {
    this.ensureDateOrder(query.from, query.to);
    const [
      overview,
      kpis,
      productStatus,
      alerts,
      emergencies,
      fieldOfficerDashboardData,
    ] = await Promise.all([
      this.dashboardOverview(query, context),
      this.dashboardKpis(query, context),
      this.dashboardProductStatus(query, context),
      this.listAlerts({ ...query, limit: 5 }, context),
      this.listEmergencyIncidents({ ...query, limit: 5 }, context),
      context.roleCode === 'FIELD_OFFICER'
        ? this.fieldOfficerDashboard(context)
        : Promise.resolve(null),
    ]);

    return {
      appliedScope: query,
      generatedAt: new Date().toISOString(),
      overview,
      kpis,
      productStatus,
      priorityAlerts: alerts.items,
      priorityEmergencies: emergencies.items,
      fieldOfficer: fieldOfficerDashboardData,
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
      WITH matched_versions AS (
        SELECT bv.id
        FROM "BaketVersion" bv
        JOIN "Baket" b ON b.id = bv."baketId" AND b."currentVersionNumber" = bv."versionNumber"
        WHERE b."deletedAt" IS NULL
          AND b.status IN (${Prisma.join(requestedStatuses.map((status) => Prisma.sql`${status}::"BaketStatus"`))})
          AND bv."locationPoint" IS NOT NULL
          AND ST_Intersects(
            bv."locationPoint",
            ST_MakeEnvelope(${bbox.minLng}, ${bbox.minLat}, ${bbox.maxLng}, ${bbox.maxLat}, 4326)
          )

        UNION ALL

        SELECT bv.id
        FROM "BaketVersion" bv
        JOIN "Baket" b ON b.id = bv."baketId" AND b."currentVersionNumber" = bv."versionNumber"
        WHERE b."deletedAt" IS NULL
          AND b.status IN (${Prisma.join(requestedStatuses.map((status) => Prisma.sql`${status}::"BaketStatus"`))})
          AND bv."locationPoint" IS NULL
          AND bv.latitude IS NOT NULL
          AND bv.longitude IS NOT NULL
          AND ST_Intersects(
            ST_SetSRID(ST_MakePoint(bv.longitude::double precision, bv.latitude::double precision), 4326),
            ST_MakeEnvelope(${bbox.minLng}, ${bbox.minLat}, ${bbox.maxLng}, ${bbox.maxLat}, 4326)
          )
      )
      SELECT id FROM matched_versions
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
            originalContent: true,
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
          displayTitle: deriveReportDisplayTitle(item.version.originalContent),
          urgency: item.version.urgency,
          reportedAt: item.version.createdAt,
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
    return this.cache.getOrSet(
      {
        namespace: 'administrative-boundaries',
        identity: {
          scope: authorizationScopeIdentity(context),
          bbox: query.bbox,
          zoom: query.zoom,
          areaId: query.areaId ?? null,
          limit: query.limit,
        },
        ttlMs: 15 * 60_000,
      },
      () => this.loadMapBoundaries(query, context),
    );
  }

  private async loadMapBoundaries(
    query: MapReportQuery,
    context: AuthorizationContext,
  ) {
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
        this.prisma.userOperationalAssignment.findMany({
          where: {
            id: { in: scope.assignmentIds },
            isActive: true,
            OR: [{ validUntil: null }, { validUntil: { gt: now } }],
            userProfile: { isActive: true, deletedAt: null },
            role: { code: RoleCode.FIELD_OFFICER, isActive: true },
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
            branch: true,
          },
        }),
        this.spatial.getActiveBoundaryGeoJson(query.areaId),
      ]);
    const units = new Set(
      personnelAssignments.map((assignment) => assignment.branch),
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
        ...(query.ownerAssignmentId
          ? { ownerAssignmentId: query.ownerAssignmentId }
          : {}),
        ...this.buildCommonDateWhere('createdAt', query.from, query.to),
      },
      include: {
        ownerAssignment: { include: { role: true } },
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
          ownerAssignmentId: item.task.ownerAssignmentId,
          ownerAssignmentName: item.task.ownerAssignment.role?.name ?? null,
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
          assignedAssignmentId: alert.assignedAssignmentId,
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
  ): Promise<any> {
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
          include: { userProfile: true, role: true },
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
          assignedAssignmentId: context.primaryAssignmentId,
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
          include: { userProfile: true, role: true },
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

  async listAlerts(
    query: AlertQuery,
    context: AuthorizationContext,
  ): Promise<any> {
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
              { assignedAssignmentId: { in: scope.positionIds } },
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
        ...(query.assignedAssignmentId
          ? { assignedAssignmentId: query.assignedAssignmentId }
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
        assignedAssignment: true,
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
        assignedAssignmentId: body.assignedAssignmentId,
      },
    });
    if (body.assignedAssignmentId) {
      await this.notifyPosition(
        body.assignedAssignmentId,
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
        assignedAssignment: true,
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
        assignedAssignmentId: body.positionId,
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
    const assignment =
      await this.prisma.userOperationalAssignment.findUniqueOrThrow({
        where: { id: body.operationalAssignmentId },
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
        "operationalAssignmentId",
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
        ${body.operationalAssignmentId}::uuid,
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
      where: { operationalAssignmentId: context.primaryAssignmentId },
      orderBy: { capturedAt: 'desc' },
      select: this.ownLocationPingSelect,
    });
  }

  async latestLocation(assignmentId: string, context: AuthorizationContext) {
    await this.ensureLocationAccess(assignmentId, context);
    const ping = await this.prisma.personnelLocationPing.findFirst({
      where: { operationalAssignmentId: assignmentId },
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
        operationalAssignmentId: assignmentId,
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
    const assignments = await this.prisma.userOperationalAssignment.findMany({
      where: {
        id: { in: scope.assignmentIds },
        isActive: true,
        OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
        role: {
          code: RoleCode.FIELD_OFFICER,
          isActive: true,
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
        role: true,
        areaScopes: {
          where: { validUntil: null },
          include: { area: true },
          orderBy: [{ isPrimary: 'desc' }, { validFrom: 'desc' }],
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const assignmentIds = assignments.map((item) => item.id);
    const pings = assignmentIds.length
      ? await this.prisma.personnelLocationPing.findMany({
          where: {
            operationalAssignmentId: { in: assignmentIds },
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
      if (!latest.has(ping.operationalAssignmentId)) {
        latest.set(ping.operationalAssignmentId, ping);
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
      const primaryArea = assignment.areaScopes[0]?.area ?? null;
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
          positionTitle: assignment.role.name,
          unitName: primaryArea
            ? `${assignment.branch} ${primaryArea.name}`
            : assignment.branch,
          supervisorAssignmentId: null,
          supervisorName: null,
          supervisorPositionTitle: null,
          supervisorUnitName: null,
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
      },
      orderBy: [{ capturedAt: 'desc' }, { id: 'desc' }],
      include: {
        area: true,
        operationalAssignment: {
          include: {
            userProfile: true,
            role: true,
          },
        },
      },
    });

    const latest = new Map<string, (typeof pings)[number]>();
    for (const ping of pings) {
      if (!latest.has(ping.operationalAssignmentId)) {
        latest.set(ping.operationalAssignmentId, ping);
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
        assignmentId: ping.operationalAssignmentId,
        capturedAt: ping.capturedAt,
        isStealth: ping.isStealth,
        areaId: ping.areaId,
        areaName: ping.area?.name ?? null,
        userProfileId: ping.operationalAssignment.userProfile.id,
        userName: ping.operationalAssignment.userProfile.fullName,
        positionTitle: ping.operationalAssignment.role.name,
        unitName: ping.operationalAssignment.branch,
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
