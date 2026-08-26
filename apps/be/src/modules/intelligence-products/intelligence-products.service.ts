import { Injectable } from '@nestjs/common';
import {
  AlertStatus,
  AnalysisStatus,
  ApprovalEventType,
  ApprovalStage,
  ApprovalStepStatus,
  ApprovalWorkflowStatus,
  AreaResolutionMethod,
  CommandRouteType,
  EmergencyStatus,
  FileLifecycleStatus,
  NotificationType,
  Prisma,
  ProductStatus,
  RoleCode,
  TaskAssignmentStatus,
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
  AlertQuery,
  CreateLocationPingDto,
  CreateProductDto,
  DashboardQuery,
  EmergencyQuery,
  FieldIntelligenceDashboardQuery,
  MapAreaSummaryQuery,
  MapReportQuery,
  PersonnelLocationMapQuery,
  ProductQuery,
  ProductTemplateListQuery,
  ProductTypeQuery,
  SubmitProductDto,
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
      // eslint-disable-next-line @typescript-eslint/no-base-to-string -- value berupa string tanggal
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
          String(query.sortBy) === 'periodStart'
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

  async getProductVersion(versionId: string, context: AuthorizationContext) {
    await this.assertProductVersionScope(versionId, context);
    return this.productVersionDetail(versionId);
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

  async getApprovalWorkflow(workflowId: string, _include?: string) {
    return this.approvalWorkflowDetail(workflowId);
  }

  private async fieldIntelligenceJaringScopeWhere(
    context: AuthorizationContext,
  ): Promise<Prisma.JaringWhereInput> {
    if (
      context.authRole === SYSTEM_ROLES.EXECUTIVE ||
      context.authRole === SYSTEM_ROLES.NATIONAL_LEADER
    ) {
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
        nationalAccess:
          context.authRole === SYSTEM_ROLES.EXECUTIVE ||
          context.authRole === SYSTEM_ROLES.NATIONAL_LEADER,
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
          ...scopedAssignmentIds.flatMap(
            (id) => baketsByAssignment.get(id) ?? [],
          ),
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
          score: average([...contributionScores, ...reportContributionScores]),
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
        scopeArea: {
          id: string;
          code: string;
          name: string;
          level: string;
        } | null;
        assignmentIds: Set<string>;
        jaringIds: Set<string>;
      }
    >();
    const getNode = (
      input: Omit<
        typeof hierarchyNodes extends Map<string, infer T> ? T : never,
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
            code: nodes.gaswilArea?.code ?? caretaker.fieldOfficerAssignmentId,
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
          code:
            assignment.areaScopes[0]?.area.officialCode ??
            assignment.areaScopes[0]?.area.code ??
            assignment.id,
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

  async mapAlerts(query: MapReportQuery, context: AuthorizationContext) {
    const bbox = this.parseBbox(query.bbox);
    const alerts = await this.listAlerts(
      { ...query, limit: query.limit },
      context,
    );
    const located = alerts.items.filter((alert: any) => {
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
      features: located.map((alert: any) => ({
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
    const located = incidents.items.filter((incident: any) => {
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
      features: located.map((incident: any) => ({
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
              { assignedAssignmentId: { in: scope.assignmentIds } },
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

    const supervisorByArea = await this.scope.resolveCommandSupervisors(
      assignments.map((assignment) => ({
        id: assignment.id,
        roleCode: assignment.role.code,
        branch: assignment.branch,
        areaIds: assignment.areaScopes.map((scope) => scope.areaId),
      })),
    );

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
      const supervisor =
        assignment.areaScopes
          .map((scope) => supervisorByArea.get(scope.areaId))
          .find((value) => value) ?? null;
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
          supervisorAssignmentId: supervisor?.assignmentId ?? null,
          supervisorName: supervisor?.userName ?? null,
          supervisorPositionTitle: supervisor?.roleName ?? null,
          supervisorUnitName: supervisor?.branch ?? null,
          canSeeStealth: false,
        },
      };
    });

    return {
      type: 'FeatureCollection',
      features,
    };
  }
}
