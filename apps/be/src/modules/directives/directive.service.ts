import { Injectable } from '@nestjs/common';
import {
  CommandRouteType,
  DirectiveStatus,
  Prisma,
  RecipientStatus,
  RoleCode,
  TaskAssignmentStatus,
  TaskStatus,
} from '../../generated/prisma/client.js';
import { ApiException } from '../../common/api/api-exception.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateDirectiveDto,
  CreateDirectiveRevisionDto,
  DirectiveQuery,
  DistributeDirectiveDto,
  OptionalNoteDto,
  PublishDirectiveDto,
  ReplaceAreasDto,
  ReplaceRecipientsDto,
  RequiredReasonDto,
  UpdateDirectiveVersionDto,
  VersionRecipientDto,
} from './directive.dto.js';
import { DirectiveSortField } from './directive.dto.js';

@Injectable()
export class DirectiveService {
  constructor(private readonly prisma: PrismaService) {}

  private parseDirectiveDate(value: string, field: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new ApiException(
        'DIRECTIVE_DATE_INVALID',
        'Format tanggal STR tidak valid. Pilih tanggal melalui input kalender.',
        422,
        [
          {
            field,
            code: 'INVALID_DATE',
            message: 'Format tanggal tidak valid.',
          },
        ],
      );
    }

    return date;
  }

  private handleDirectivePersistenceError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.map(String)
          : [];

        if (target.includes('commandNumber')) {
          throw new ApiException(
            'DIRECTIVE_COMMAND_NUMBER_DUPLICATE',
            'Nomor STR sudah digunakan. Gunakan nomor STR lain.',
            409,
            [
              {
                field: 'commandNumber',
                code: 'DUPLICATE',
                message: 'Nomor STR sudah digunakan.',
              },
            ],
          );
        }

        throw new ApiException(
          'DIRECTIVE_DUPLICATE_DATA',
          'Data STR duplikat. Periksa kembali nomor, wilayah, atau penerima.',
          409,
        );
      }

      if (error.code === 'P2003') {
        throw new ApiException(
          'DIRECTIVE_REFERENCE_INVALID',
          'Target wilayah atau penerima tidak valid. Muat ulang halaman lalu pilih ulang sasaran STR.',
          422,
        );
      }
    }

    throw error;
  }

  private areaIds(context: AuthorizationContext) {
    return context.areaScopes.map((scope) => scope.areaId);
  }

  private recipientScopeWhere(
    context: AuthorizationContext,
  ): Prisma.DirectiveRecipientWhereInput {
    return {
      OR: [
        { targetAssignmentId: context.primaryAssignmentId },
        { targetAssignmentId: context.primaryAssignmentId },
      ],
    };
  }

  private areaScopeWhere(
    context: AuthorizationContext,
  ): Prisma.DirectiveWhereInput | undefined {
    const areaIds = this.areaIds(context);

    if (areaIds.length === 0) {
      return undefined;
    }

    return {
      versions: {
        some: {
          targetAreas: {
            some: {
              area: {
                OR: [
                  { id: { in: areaIds } },
                  {
                    ancestorLinks: {
                      some: {
                        ancestorId: { in: areaIds },
                      },
                    },
                  },
                  {
                    descendantLinks: {
                      some: {
                        descendantId: { in: areaIds },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    };
  }

  private directiveAccessWhere(
    context: AuthorizationContext,
    extra: Prisma.DirectiveWhereInput = {},
  ): Prisma.DirectiveWhereInput {
    const areaScope = this.areaScopeWhere(context);
    const visibilityBranches: Prisma.DirectiveWhereInput[] = [
      { ownerAssignmentId: context.primaryAssignmentId },
      { createdByAssignmentId: context.primaryAssignmentId },
      {
        versions: {
          some: {
            recipients: {
              some: this.recipientScopeWhere(context),
            },
          },
        },
      },
      {
        versions: {
          some: {
            uukStrs: {
              some: {
                ownerAssignmentId: context.primaryAssignmentId,
              },
            },
          },
        },
      },
      {
        versions: {
          some: {
            tasks: {
              some: {
                OR: [
                  { ownerAssignmentId: context.primaryAssignmentId },
                  {
                    assignments: {
                      some: {
                        OR: [
                          {
                            assigneeAssignmentId: context.primaryAssignmentId,
                          },
                          {
                            assignerAssignmentId: context.primaryAssignmentId,
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    ];

    if (areaScope) {
      visibilityBranches.push(areaScope);
    }

    return {
      AND: [{ deletedAt: null }, extra, { OR: visibilityBranches }],
    };
  }

  private assertRole(
    context: AuthorizationContext,
    allowedRoles: readonly RoleCode[],
    message: string,
  ) {
    if (!allowedRoles.includes(context.roleCode)) {
      throw new ApiException('DIRECTIVE_ROLE_FORBIDDEN', message, 403);
    }
  }

  private validateRecipients(recipients: VersionRecipientDto[]) {
    const seen = new Set<string>();

    for (const recipient of recipients) {
      const count =
        Number(Boolean(recipient.targetAssignmentId)) +
        Number(Boolean(recipient.targetAssignmentId));

      if (count !== 1) {
        throw new ApiException(
          'EXACTLY_ONE_TARGET_REQUIRED',
          'Each recipient must target exactly one unit or position.',
          422,
        );
      }

      const key = recipient.targetAssignmentId
        ? `unit:${recipient.targetAssignmentId}`
        : `position:${recipient.targetAssignmentId}`;

      if (seen.has(key)) {
        throw new ApiException(
          'DIRECTIVE_RECIPIENT_DUPLICATE',
          'Duplicate directive recipient target is not allowed.',
          409,
        );
      }

      seen.add(key);
    }
  }

  private async audit(
    context: AuthorizationContext,
    action: string,
    entityId: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorUserProfileId: context.userProfileId,
        actorAssignmentId: context.primaryAssignmentId,
        action,
        entityType: 'Directive',
        entityId,
        ...(metadata ? { metadata } : {}),
      },
    });
  }

  private detailWhere(
    id: string,
    context?: AuthorizationContext,
  ): Prisma.DirectiveWhereInput {
    const extra: Prisma.DirectiveWhereInput = { id };
    return context ? this.directiveAccessWhere(context, extra) : extra;
  }

  private versionWhere(
    versionId: string,
    context?: AuthorizationContext,
  ): Prisma.DirectiveVersionWhereInput {
    const extra: Prisma.DirectiveVersionWhereInput = { id: versionId };

    if (!context) {
      return extra;
    }

    return {
      AND: [
        extra,
        {
          directive: this.directiveAccessWhere(context),
        },
      ],
    };
  }

  private detail(id: string, context?: AuthorizationContext) {
    return this.prisma.directive.findFirstOrThrow({
      where: this.detailWhere(id, context),
      include: {
        ownerAssignment: true,
        createdByAssignment: {
          include: { userProfile: true, role: true },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            createdByAssignment: {
              include: { userProfile: true, role: true },
            },
            targetAreas: { include: { area: true } },
            recipients: {
              include: {
                targetAssignment: true,
              },
            },
            tasks: {
              include: {
                ownerAssignment: true,
                assignments: {
                  include: {
                    assigner: {
                      include: { role: true, userProfile: true },
                    },
                    assignee: {
                      include: { role: true, userProfile: true },
                    },
                  },
                },
                targetAreas: {
                  include: {
                    area: {
                      include: { ancestorLinks: true, descendantLinks: true },
                    },
                  },
                },
              },
            },
            uukStrs: {
              include: {
                ownerAssignment: true,
                versions: {
                  orderBy: { versionNumber: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });
  }

  private versionDetail(versionId: string, context?: AuthorizationContext) {
    return this.prisma.directiveVersion.findFirstOrThrow({
      where: this.versionWhere(versionId, context),
      include: {
        directive: true,
        createdByAssignment: {
          include: { userProfile: true, role: true },
        },
        targetAreas: { include: { area: true } },
        recipients: {
          include: {
            targetAssignment: true,
          },
        },
        tasks: {
          include: {
            ownerAssignment: true,
            assignments: {
              include: {
                assigner: { include: { role: true, userProfile: true } },
                assignee: { include: { role: true, userProfile: true } },
              },
            },
            targetAreas: {
              include: {
                area: {
                  include: { ancestorLinks: true, descendantLinks: true },
                },
              },
            },
          },
        },
        uukStrs: {
          include: {
            ownerAssignment: true,
            versions: {
              orderBy: { versionNumber: 'desc' },
              take: 1,
            },
          },
        },
      },
    });
  }

  private async getEditableVersion(
    versionId: string,
    context: AuthorizationContext,
  ) {
    const version = await this.prisma.directiveVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: {
        directive: true,
      },
    });

    if (
      version.directive.status !== DirectiveStatus.DRAFT ||
      version.versionNumber !== version.directive.currentVersionNumber
    ) {
      throw new ApiException(
        'DIRECTIVE_VERSION_IMMUTABLE',
        'Only the current directive draft version can be changed.',
        409,
      );
    }

    if (
      version.directive.ownerAssignmentId !== context.primaryAssignmentId &&
      version.directive.createdByAssignmentId !== context.primaryAssignmentId
    ) {
      throw new ApiException(
        'DIRECTIVE_NOT_MUTABLE',
        'Only the owning executive chain can edit this directive.',
        403,
      );
    }

    return version;
  }

  private directiveListWhere(
    query: DirectiveQuery,
    context: AuthorizationContext,
  ): Prisma.DirectiveWhereInput {
    return this.directiveAccessWhere(context, {
      AND: [
        ...(query.from || query.to
          ? [
              {
                versions: {
                  some: {
                    commandDate: {
                      ...(query.from ? { gte: new Date(query.from) } : {}),
                      ...(query.to ? { lte: new Date(query.to) } : {}),
                    },
                  },
                },
              } satisfies Prisma.DirectiveWhereInput,
            ]
          : []),
        ...(query.classification || query.urgency
          ? [
              {
                versions: {
                  some: {
                    ...(query.classification
                      ? { classification: query.classification }
                      : {}),
                    ...(query.urgency ? { urgency: query.urgency } : {}),
                  },
                },
              } satisfies Prisma.DirectiveWhereInput,
            ]
          : []),
        ...(query.deadlineFrom || query.deadlineTo
          ? [
              {
                versions: {
                  some: {
                    OR: [
                      {
                        dueDate: {
                          ...(query.deadlineFrom
                            ? { gte: new Date(query.deadlineFrom) }
                            : {}),
                          ...(query.deadlineTo
                            ? { lte: new Date(query.deadlineTo) }
                            : {}),
                        },
                      },
                      {
                        dueDate: null,
                        commandDate: {
                          ...(query.deadlineFrom
                            ? { gte: new Date(query.deadlineFrom) }
                            : {}),
                          ...(query.deadlineTo
                            ? { lte: new Date(query.deadlineTo) }
                            : {}),
                        },
                      },
                    ],
                  },
                },
              } satisfies Prisma.DirectiveWhereInput,
            ]
          : []),
        ...(query.areaId
          ? [
              {
                versions: {
                  some: {
                    targetAreas: {
                      some: {
                        area: {
                          OR: [
                            { id: query.areaId },
                            {
                              ancestorLinks: {
                                some: { ancestorId: query.areaId },
                              },
                            },
                            {
                              descendantLinks: {
                                some: { descendantId: query.areaId },
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                },
              } satisfies Prisma.DirectiveWhereInput,
            ]
          : []),
        ...(query.assignedToMe
          ? [
              {
                versions: {
                  some: {
                    recipients: {
                      some: this.recipientScopeWhere(context),
                    },
                  },
                },
              } satisfies Prisma.DirectiveWhereInput,
            ]
          : []),
        ...(query.recipientBranch
          ? [
              {
                versions: {
                  some: {
                    recipients: {
                      some: {
                        targetAssignment: {
                          branch: query.recipientBranch,
                        },
                      },
                    },
                  },
                },
              } satisfies Prisma.DirectiveWhereInput,
            ]
          : []),
      ],
      ...(query.status ? { status: query.status } : {}),
      ...(query.ownerAssignmentId
        ? { ownerAssignmentId: query.ownerAssignmentId }
        : {}),
      ...(query.search
        ? {
            OR: [
              {
                commandNumber: { contains: query.search, mode: 'insensitive' },
              },
              {
                versions: {
                  some: {
                    OR: [
                      {
                        commandIssuer: {
                          contains: query.search,
                          mode: 'insensitive',
                        },
                      },
                      {
                        commandSource: {
                          contains: query.search,
                          mode: 'insensitive',
                        },
                      },
                      {
                        commandDescription: {
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
    });
  }

  async list(query: DirectiveQuery, context: AuthorizationContext) {
    const include = {
      ownerAssignment: true,
      versions: {
        orderBy: { versionNumber: 'desc' as const },
        take: 1,
        include: {
          targetAreas: { include: { area: true } },
          recipients: {
            include: {
              targetAssignment: true,
            },
          },
        },
      },
      _count: {
        select: {
          versions: true,
        },
      },
    } satisfies Prisma.DirectiveInclude;
    const sortOrder = query.sortOrder ?? 'desc';
    const sortBy = query.sortBy ?? DirectiveSortField.UPDATED_AT;
    const requiresVersionSort =
      sortBy === DirectiveSortField.DUE_DATE ||
      sortBy === DirectiveSortField.EFFECTIVE_DEADLINE;

    const where = this.directiveListWhere(query, context);
    const directives = await this.prisma.directive.findMany({
      where,
      skip: requiresVersionSort ? undefined : (query.page - 1) * query.limit,
      take: requiresVersionSort ? undefined : query.limit,
      orderBy: requiresVersionSort
        ? { id: 'asc' }
        : [{ updatedAt: sortOrder }, { id: 'asc' }],
      include,
    });

    if (!requiresVersionSort && !query.paginated) {
      return directives;
    }

    const timestamp = (directive: (typeof directives)[number]) => {
      const version = directive.versions[0];
      const value =
        sortBy === DirectiveSortField.EFFECTIVE_DEADLINE
          ? (version?.dueDate ?? version?.commandDate)
          : version?.dueDate;
      return value ? value.getTime() : null;
    };

    directives.sort((left, right) => {
      const leftTime = timestamp(left);
      const rightTime = timestamp(right);

      if (leftTime === null && rightTime === null)
        return left.id.localeCompare(right.id);
      if (leftTime === null) return 1;
      if (rightTime === null) return -1;

      const compared =
        sortOrder === 'asc' ? leftTime - rightTime : rightTime - leftTime;
      return compared || left.id.localeCompare(right.id);
    });

    const items = requiresVersionSort
      ? directives.slice(
          (query.page - 1) * query.limit,
          query.page * query.limit,
        )
      : directives;
    if (!query.paginated) return items;

    const [total, statuses] = await Promise.all([
      this.prisma.directive.count({ where }),
      this.prisma.directive.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
    ]);
    const statusCount = new Map<DirectiveStatus, number>(
      statuses.map((item) => [item.status, Number(item._count._all)]),
    );
    const published =
      (statusCount.get(DirectiveStatus.PUBLISHED) ?? 0) +
      (statusCount.get(DirectiveStatus.DISTRIBUTED) ?? 0) +
      (statusCount.get(DirectiveStatus.COMPLETED) ?? 0);
    const draft = statusCount.get(DirectiveStatus.DRAFT) ?? 0;

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
      summary: { total, published, draft },
    };
  }

  async create(body: CreateDirectiveDto, context: AuthorizationContext) {
    this.assertRole(
      context,
      [RoleCode.EXECUTIVE],
      'Hanya Deputi II yang dapat membuat arahan strategis.',
    );

    if (body.ownerAssignmentId !== context.primaryAssignmentId) {
      throw new ApiException(
        'DIRECTIVE_OWNER_UNIT_OUT_OF_SCOPE',
        'Arahan strategis hanya dapat dibuat untuk unit organisasi saat ini.',
        403,
      );
    }

    this.validateRecipients(body.version.recipients);

    const commandDate = this.parseDirectiveDate(
      body.version.commandDate,
      'commandDate',
    );
    const dueDate = body.version.dueDate
      ? this.parseDirectiveDate(body.version.dueDate, 'dueDate')
      : null;

    const directive = await this.prisma
      .$transaction(async (tx) => {
        const root = await tx.directive.create({
          data: {
            commandNumber: body.version.commandNumber,
            ownerAssignmentId: body.ownerAssignmentId,
            createdByAssignmentId: context.primaryAssignmentId,
            status: DirectiveStatus.DRAFT,
          },
        });

        await tx.directiveVersion.create({
          data: {
            directiveId: root.id,
            versionNumber: 1,
            classification: body.version.classification,
            urgency: body.version.urgency,
            commandSource: body.version.commandSource,
            commandIssuer: body.version.commandIssuer,
            commandDate,
            dueDate,
            strategicIssue: body.version.strategicIssue,
            commandDescription: body.version.commandDescription,
            createdByAssignmentId: context.primaryAssignmentId,
            targetAreas: {
              create: body.version.targetAreaIds.map((areaId, index) => ({
                areaId,
                isPrimary: index === 0,
              })),
            },
            recipients: {
              create: body.version.recipients.map((recipient) => ({
                targetAssignmentId: recipient.targetAssignmentId,
              })),
            },
          },
        });

        return root;
      })
      .catch((error: unknown) => this.handleDirectivePersistenceError(error));

    await this.audit(context, 'DIRECTIVE.CREATE', directive.id);
    return this.detail(directive.id, context);
  }

  async get(directiveId: string, context: AuthorizationContext) {
    return this.detail(directiveId, context);
  }

  async versions(directiveId: string, context: AuthorizationContext) {
    await this.detail(directiveId, context);

    return this.prisma.directiveVersion.findMany({
      where: {
        directiveId,
      },
      orderBy: { versionNumber: 'desc' },
      include: {
        createdByAssignment: {
          include: { userProfile: true, role: true },
        },
        targetAreas: { include: { area: true } },
        recipients: {
          include: {
            targetAssignment: true,
          },
        },
      },
    });
  }

  async createVersion(
    directiveId: string,
    body: CreateDirectiveRevisionDto,
    context: AuthorizationContext,
  ) {
    this.assertRole(
      context,
      [RoleCode.EXECUTIVE],
      'Hanya Deputi II yang dapat merevisi arahan strategis.',
    );

    if (body.patch.recipients) {
      this.validateRecipients(body.patch.recipients);
    }

    const directive = await this.detail(directiveId, context);

    if (
      directive.ownerAssignmentId !== context.primaryAssignmentId &&
      directive.createdByAssignmentId !== context.primaryAssignmentId
    ) {
      throw new ApiException(
        'DIRECTIVE_NOT_MUTABLE',
        'Hanya rantai Deputi II pemilik yang dapat merevisi arahan strategis ini.',
        403,
      );
    }

    if (
      directive.status === DirectiveStatus.CANCELLED ||
      directive.status === DirectiveStatus.COMPLETED
    ) {
      throw new ApiException(
        'DIRECTIVE_NOT_MUTABLE',
        'Arahan strategis yang dibatalkan atau selesai tidak dapat direvisi.',
        409,
      );
    }

    const newVersion = await this.prisma.$transaction(async (tx) => {
      const baseVersion = body.basedOnVersionId
        ? await tx.directiveVersion.findUniqueOrThrow({
            where: { id: body.basedOnVersionId },
            include: { targetAreas: true, recipients: true },
          })
        : await tx.directiveVersion.findFirstOrThrow({
            where: { directiveId },
            orderBy: { versionNumber: 'desc' },
            include: { targetAreas: true, recipients: true },
          });

      const nextVersionNumber = directive.currentVersionNumber + 1;

      const version = await tx.directiveVersion.create({
        data: {
          directiveId,
          versionNumber: nextVersionNumber,
          classification: baseVersion.classification,
          urgency: body.patch.urgency ?? baseVersion.urgency,
          commandSource: baseVersion.commandSource,
          commandIssuer: baseVersion.commandIssuer,
          commandDate: baseVersion.commandDate,
          dueDate: body.patch.dueDate
            ? new Date(body.patch.dueDate)
            : baseVersion.dueDate,
          strategicIssue:
            body.patch.strategicIssue ?? baseVersion.strategicIssue,
          commandDescription:
            body.patch.commandDescription ?? baseVersion.commandDescription,
          createdByAssignmentId: context.primaryAssignmentId,
          changeReason: body.changeReason,
          targetAreas: {
            create: (
              body.patch.targetAreaIds ??
              baseVersion.targetAreas.map((item) => item.areaId)
            ).map((areaId, index) => ({
              areaId,
              isPrimary: index === 0,
            })),
          },
          recipients: {
            create: (body.patch.recipients ?? baseVersion.recipients).map(
              (recipient) => ({
                targetAssignmentId: recipient.targetAssignmentId,
              }),
            ),
          },
        },
      });

      await tx.directive.update({
        where: { id: directiveId },
        data: {
          currentVersionNumber: nextVersionNumber,
          status: DirectiveStatus.DRAFT,
        },
      });

      return version;
    });

    await this.audit(context, 'DIRECTIVE.VERSION.CREATE', directiveId, {
      versionId: newVersion.id,
      versionNumber: newVersion.versionNumber,
    });
    return this.versionDetail(newVersion.id, context);
  }

  async getVersion(versionId: string, context: AuthorizationContext) {
    return this.versionDetail(versionId, context);
  }

  async updateVersion(
    versionId: string,
    body: UpdateDirectiveVersionDto,
    context: AuthorizationContext,
  ) {
    this.assertRole(
      context,
      [RoleCode.EXECUTIVE],
      'Hanya Deputi II yang dapat mengubah draf arahan strategis.',
    );

    await this.getEditableVersion(versionId, context);

    await this.prisma.directiveVersion.update({
      where: { id: versionId },
      data: {
        urgency: body.urgency,
        strategicIssue: body.strategicIssue,
        commandDescription: body.commandDescription,
        ...(body.dueDate ? { dueDate: new Date(body.dueDate) } : {}),
      },
    });

    await this.audit(context, 'DIRECTIVE.VERSION.UPDATE', versionId);
    return this.versionDetail(versionId, context);
  }

  async replaceAreas(
    versionId: string,
    body: ReplaceAreasDto,
    context: AuthorizationContext,
  ) {
    this.assertRole(
      context,
      [RoleCode.EXECUTIVE],
      'Hanya Deputi II yang dapat mengubah wilayah sasaran draf arahan strategis.',
    );

    await this.getEditableVersion(versionId, context);

    await this.prisma.$transaction(async (tx) => {
      await tx.directiveTargetArea.deleteMany({
        where: { directiveVersionId: versionId },
      });
      await tx.directiveTargetArea.createMany({
        data: body.areaIds.map((areaId, index) => ({
          directiveVersionId: versionId,
          areaId,
          isPrimary: body.primaryAreaId
            ? areaId === body.primaryAreaId
            : index === 0,
        })),
      });
    });

    await this.audit(context, 'DIRECTIVE.TARGETS.REPLACE', versionId);
    return (await this.versionDetail(versionId, context)).targetAreas;
  }

  async replaceRecipients(
    versionId: string,
    body: ReplaceRecipientsDto,
    context: AuthorizationContext,
  ) {
    this.assertRole(
      context,
      [RoleCode.EXECUTIVE],
      'Hanya Deputi II yang dapat mengubah penerima arahan strategis.',
    );

    await this.getEditableVersion(versionId, context);
    this.validateRecipients(body.recipients);

    await this.prisma.$transaction(async (tx) => {
      await tx.directiveRecipient.deleteMany({
        where: { directiveVersionId: versionId },
      });
      await tx.directiveRecipient.createMany({
        data: body.recipients.map((recipient) => ({
          directiveVersionId: versionId,
          targetAssignmentId: recipient.targetAssignmentId,
        })),
      });
    });

    await this.audit(context, 'DIRECTIVE.RECIPIENTS.REPLACE', versionId);
    return (await this.versionDetail(versionId, context)).recipients;
  }

  async publish(
    versionId: string,
    body: PublishDirectiveDto,
    context: AuthorizationContext,
  ) {
    this.assertRole(
      context,
      [RoleCode.EXECUTIVE],
      'Hanya Deputi II yang dapat menerbitkan arahan strategis.',
    );

    if (body.confirmation !== 'PUBLISH') {
      throw new ApiException(
        'DIRECTIVE_PUBLISH_CONFIRMATION_REQUIRED',
        'Konfirmasi harus bernilai PUBLISH.',
        422,
      );
    }

    const version = await this.getEditableVersion(versionId, context);
    const fullVersion = await this.versionDetail(versionId, context);

    if (
      fullVersion.targetAreas.length === 0 ||
      fullVersion.recipients.length === 0
    ) {
      throw new ApiException(
        'DIRECTIVE_INCOMPLETE',
        'Arahan strategis membutuhkan minimal satu wilayah sasaran dan satu penerima.',
        422,
      );
    }

    await this.prisma.directive.update({
      where: { id: version.directiveId },
      data: { status: DirectiveStatus.PUBLISHED },
    });

    await this.audit(context, 'DIRECTIVE.PUBLISH', version.directiveId, {
      versionId,
      note: body.note ?? null,
    });
    return this.detail(version.directiveId, context);
  }

  async distribute(
    versionId: string,
    body: DistributeDirectiveDto,
    context: AuthorizationContext,
  ) {
    this.assertRole(
      context,
      [RoleCode.EXECUTIVE],
      'Hanya Deputi II yang dapat mendistribusikan arahan strategis.',
    );

    const version = await this.prisma.directiveVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: {
        directive: true,
        recipients: true,
      },
    });

    if (
      version.directive.ownerAssignmentId !== context.primaryAssignmentId &&
      version.directive.createdByAssignmentId !== context.primaryAssignmentId
    ) {
      throw new ApiException(
        'DIRECTIVE_NOT_DISTRIBUTABLE',
        'Hanya rantai Deputi II pemilik yang dapat mendistribusikan arahan strategis ini.',
        403,
      );
    }

    if (
      version.directive.status !== DirectiveStatus.PUBLISHED ||
      version.versionNumber !== version.directive.currentVersionNumber
    ) {
      throw new ApiException(
        'DIRECTIVE_NOT_DISTRIBUTABLE',
        'Hanya arahan strategis terbit versi berjalan yang dapat didistribusikan.',
        409,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.directiveRecipient.updateMany({
        where: { directiveVersionId: versionId },
        data: {
          status: RecipientStatus.SENT,
          sentAt: body.scheduledAt ? new Date(body.scheduledAt) : new Date(),
        },
      });

      if (body.sendNotifications) {
        const notifiedProfiles = new Set<string>();

        for (const recipient of version.recipients) {
          const profiles = await tx.userOperationalAssignment.findMany({
            where: {
              isActive: true,
              validUntil: null,
              ...(recipient.targetAssignmentId
                ? { id: recipient.targetAssignmentId }
                : {}),
            },
            select: { userProfileId: true },
          });

          for (const profile of profiles) {
            if (notifiedProfiles.has(profile.userProfileId)) {
              continue;
            }

            notifiedProfiles.add(profile.userProfileId);

            await tx.notification.create({
              data: {
                userProfileId: profile.userProfileId,
                type: 'DIRECTIVE',
                title: `Arahan ${version.directive.commandNumber}`,
                message: 'Arahan strategis baru telah didistribusikan.',
                link: `/directives/${version.directiveId}`,
              },
            });
          }
        }
      }

      await tx.directive.update({
        where: { id: version.directiveId },
        data: { status: DirectiveStatus.DISTRIBUTED },
      });

      return {
        directiveId: version.directiveId,
        versionId,
        recipientCount: version.recipients.length,
        scheduledAt: body.scheduledAt ?? null,
        notificationsQueued: body.sendNotifications,
      };
    });

    await this.audit(
      context,
      'DIRECTIVE.DISTRIBUTE',
      version.directiveId,
      result,
    );
    return result;
  }

  async acknowledge(
    recipientId: string,
    body: OptionalNoteDto,
    context: AuthorizationContext,
  ) {
    const recipient = await this.prisma.directiveRecipient.findUniqueOrThrow({
      where: { id: recipientId },
    });

    if (
      recipient.targetAssignmentId &&
      recipient.targetAssignmentId !== context.primaryAssignmentId
    ) {
      throw new ApiException(
        'DIRECTIVE_RECIPIENT_NOT_OWNER',
        'Penerima arahan strategis tidak sesuai dengan jabatan saat ini.',
        403,
      );
    }

    if (
      recipient.targetAssignmentId &&
      recipient.targetAssignmentId !== context.primaryAssignmentId
    ) {
      throw new ApiException(
        'DIRECTIVE_RECIPIENT_NOT_OWNER',
        'Penerima arahan strategis tidak sesuai dengan unit saat ini.',
        403,
      );
    }

    await this.prisma.directiveRecipient.update({
      where: { id: recipientId },
      data: {
        status: RecipientStatus.ACKNOWLEDGED,
        deliveredAt: recipient.deliveredAt ?? new Date(),
        readAt: recipient.readAt ?? new Date(),
        acknowledgedAt: recipient.acknowledgedAt ?? new Date(),
        failureReason: body.note ?? recipient.failureReason,
      },
    });

    await this.audit(
      context,
      'DIRECTIVE.ACKNOWLEDGE',
      recipient.directiveVersionId,
      {
        recipientId,
        note: body.note ?? null,
      },
    );

    return this.prisma.directiveRecipient.findUniqueOrThrow({
      where: { id: recipientId },
      include: {
        targetAssignment: true,
      },
    });
  }

  async markRead(versionId: string, context: AuthorizationContext) {
    const recipient = await this.prisma.directiveRecipient.findFirst({
      where: {
        directiveVersionId: versionId,
        OR: [
          { targetAssignmentId: context.primaryAssignmentId },
          { targetAssignmentId: context.primaryAssignmentId },
        ],
      },
      orderBy: [{ targetAssignmentId: 'desc' }, { sentAt: 'desc' }],
    });

    if (!recipient) {
      throw new ApiException(
        'DIRECTIVE_RECIPIENT_NOT_OWNER',
        'Penerima arahan strategis tidak sesuai dengan konteks akses saat ini.',
        403,
      );
    }

    const now = new Date();
    const nextStatus =
      recipient.status === RecipientStatus.SENT ||
      recipient.status === RecipientStatus.DELIVERED
        ? RecipientStatus.READ
        : recipient.status;

    await this.prisma.directiveRecipient.update({
      where: { id: recipient.id },
      data: {
        status: nextStatus,
        deliveredAt: recipient.deliveredAt ?? now,
        readAt: recipient.readAt ?? now,
      },
    });

    await this.audit(context, 'DIRECTIVE.READ', versionId, {
      recipientId: recipient.id,
    });

    return this.prisma.directiveRecipient.findUniqueOrThrow({
      where: { id: recipient.id },
      include: {
        targetAssignment: true,
      },
    });
  }

  async tracking(
    directiveId: string,
    areaId: string | undefined,
    unitId: string | undefined,
    includeTasks = 'true',
    context: AuthorizationContext,
  ) {
    this.assertRole(
      context,
      [RoleCode.EXECUTIVE],
      'Hanya Deputi II yang dapat mengakses pelacakan arahan strategis menyeluruh.',
    );

    const directive = await this.prisma.directive.findFirstOrThrow({
      where: this.detailWhere(directiveId, context),
      select: {
        id: true,
        currentVersionNumber: true,
      },
    });

    const version = await this.prisma.directiveVersion.findFirstOrThrow({
      where: {
        directiveId,
        versionNumber: directive.currentVersionNumber,
      },
      include: {
        recipients: {
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
          },
        },
        targetAreas: {
          include: {
            area: true,
          },
        },
        uukStrs: {
          where: { deletedAt: null },
          include: {
            ownerAssignment: true,
            createdByAssignment: {
              include: {
                userProfile: true,
                role: true,
              },
            },
            versions: {
              orderBy: { versionNumber: 'desc' },
              take: 1,
              include: {
                createdByAssignment: {
                  include: {
                    userProfile: true,
                    role: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const routingAreaIds = version.targetAreas.map((target) => target.areaId);
    const routingAreaWhere: Prisma.AdministrativeAreaWhereInput = {
      OR: [
        { id: { in: routingAreaIds } },
        {
          descendantLinks: {
            some: { ancestorId: { in: routingAreaIds } },
          },
        },
        {
          ancestorLinks: {
            some: { descendantId: { in: routingAreaIds } },
          },
        },
      ],
    };
    const routingPositions =
      routingAreaIds.length > 0
        ? await this.prisma.userOperationalAssignment.findMany({
            where: {
              isActive: true,
              role: {
                code: {
                  in: [
                    RoleCode.OPERATIONAL_INTELLIGENCE_MANAGER,
                    RoleCode.REGIONAL_COMMANDER,
                    RoleCode.FIELD_COORDINATOR,
                    RoleCode.FIELD_OFFICER,
                  ],
                },
              },
              branch: {
                in: [CommandRouteType.DIRECTORATE, CommandRouteType.BINDA],
              },
              areaScopes: {
                some: {
                  validUntil: null,
                  area: routingAreaWhere,
                },
              },
            },
            orderBy: [{ branch: 'asc' }, { roleId: 'asc' }],
            include: {
              role: true,
              userProfile: true,
              areaScopes: {
                where: {
                  validUntil: null,
                  area: routingAreaWhere,
                },
                orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
                include: { area: true },
              },
            },
          })
        : [];

    const relatedTasks = await this.prisma.task.findMany({
      where: {
        deletedAt: null,
        OR: [
          { directiveVersionId: version.id },
          {
            uukStrVersion: {
              uukStr: {
                directiveVersionId: version.id,
                deletedAt: null,
              },
            },
          },
        ],
      },
      orderBy: [{ createdAt: 'asc' }],
      include: {
        ownerAssignment: true,
        createdByAssignment: {
          include: {
            userProfile: true,
            role: true,
          },
        },
        uukStrVersion: {
          include: {
            uukStr: {
              include: {
                ownerAssignment: true,
              },
            },
          },
        },
        targetAreas: {
          include: {
            area: {
              include: {
                ancestorLinks: true,
                descendantLinks: true,
              },
            },
          },
        },
        assignments: {
          orderBy: [{ assignedAt: 'asc' }],
          include: {
            assigner: {
              include: {
                userProfile: true,
                role: true,
                areaScopes: {
                  where: { validUntil: null },
                  include: {
                    area: true,
                  },
                },
              },
            },
            assignee: {
              include: {
                userProfile: true,
                role: true,
                areaScopes: {
                  where: { validUntil: null },
                  include: {
                    area: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const baketCount = await this.prisma.baket.count({
      where: {
        taskAssignment: {
          task: {
            deletedAt: null,
            OR: [
              { directiveVersionId: version.id },
              {
                uukStrVersion: {
                  uukStr: {
                    directiveVersionId: version.id,
                    deletedAt: null,
                  },
                },
              },
            ],
          },
        },
      },
    });

    const includeTaskDetails = includeTasks === 'true';
    const assignmentReadStatuses = new Set<TaskAssignmentStatus>([
      TaskAssignmentStatus.READ,
      TaskAssignmentStatus.ACKNOWLEDGED,
      TaskAssignmentStatus.IN_PROGRESS,
      TaskAssignmentStatus.COMPLETED,
      TaskAssignmentStatus.OVERDUE,
      TaskAssignmentStatus.REASSIGNED,
    ]);
    const recipientReadStatuses = new Set<RecipientStatus>([
      RecipientStatus.READ,
      RecipientStatus.ACKNOWLEDGED,
    ]);

    const taskMatchesArea = (task: any) =>
      areaId
        ? task.targetAreas.some(
            (target: any) =>
              target.areaId === areaId ||
              target.area.ancestorLinks.some(
                (link: any) => link.ancestorId === areaId,
              ) ||
              target.area.descendantLinks.some(
                (link: any) => link.descendantId === areaId,
              ),
          )
        : true;

    const filteredTasks = relatedTasks.filter((task) => {
      const areaMatch = taskMatchesArea(task);
      const unitMatch = unitId ? task.ownerAssignmentId === unitId : true;
      return areaMatch && unitMatch;
    });

    const mapAreaScope = (scope: any) => ({
      areaId: scope.areaId,
      code: scope.area?.code ?? null,
      name: scope.area?.name ?? '-',
      level: scope.area?.level ?? '-',
      isPrimary: Boolean(scope.isPrimary),
    });

    const mapAssignmentActor = (assignment: any) => {
      if (!assignment) return null;

      const primaryArea = (assignment.areaScopes ?? [])[0]?.area;

      return {
        assignmentId: assignment.id,
        fullName: assignment.userProfile?.fullName ?? null,
        username: assignment.userProfile?.username ?? null,
        positionId: assignment.id,
        positionCode: assignment.role?.code ?? null,
        positionTitle: assignment.role?.name ?? null,
        branch: assignment.branch ?? null,
        organizationUnitId: primaryArea?.id ?? null,
        organizationUnitCode: primaryArea?.code ?? null,
        organizationUnitName: primaryArea
          ? `${assignment.branch} ${primaryArea.name}`
          : (assignment.branch ?? null),
        organizationUnitType: assignment.branch ?? null,
        roleCode: assignment.role?.code ?? null,
        areaScopes: (assignment.areaScopes ?? []).map(mapAreaScope),
      };
    };

    const summarizeAssignments = (assignments: any[]) => ({
      total: assignments.length,
      sent: assignments.filter(
        (assignment) => assignment.status === TaskAssignmentStatus.SENT,
      ).length,
      read: assignments.filter(
        (assignment) =>
          Boolean(assignment.readAt) ||
          assignmentReadStatuses.has(assignment.status),
      ).length,
      acknowledged: assignments.filter(
        (assignment) =>
          Boolean(assignment.acknowledgedAt) ||
          assignment.status === TaskAssignmentStatus.ACKNOWLEDGED,
      ).length,
      inProgress: assignments.filter(
        (assignment) => assignment.status === TaskAssignmentStatus.IN_PROGRESS,
      ).length,
      completed: assignments.filter(
        (assignment) => assignment.status === TaskAssignmentStatus.COMPLETED,
      ).length,
      overdue: assignments.filter(
        (assignment) => assignment.status === TaskAssignmentStatus.OVERDUE,
      ).length,
      reassigned: assignments.filter(
        (assignment) => assignment.status === TaskAssignmentStatus.REASSIGNED,
      ).length,
      cancelled: assignments.filter(
        (assignment) => assignment.status === TaskAssignmentStatus.CANCELLED,
      ).length,
    });

    const buildAssignmentNode = (
      assignment: any,
      downstreamAssignments: any[] = [],
    ): any => ({
      id: assignment.id,
      status: assignment.status,
      assignedAt: assignment.assignedAt,
      readAt: assignment.readAt,
      acknowledgedAt: assignment.acknowledgedAt,
      startedAt: assignment.startedAt,
      completedAt: assignment.completedAt,
      dueDate: assignment.dueDate,
      assignmentNote: assignment.assignmentNote,
      assigner: mapAssignmentActor(assignment.assigner),
      assignee: mapAssignmentActor(assignment.assignee),
      downstreamAssignments: downstreamAssignments.map((item) =>
        buildAssignmentNode(item),
      ),
    });

    const mappedTasks = filteredTasks.map((task: any) => {
      const fieldCoordinatorAssignments = task.assignments.filter(
        (assignment: any) =>
          assignment.assignee?.role?.code ===
          RoleCode.FIELD_COORDINATOR,
      );

      const fcAssignmentsWithChildren = fieldCoordinatorAssignments.map(
        (assignment: any) => {
          const downstreamAssignments = task.assignments.filter(
            (candidate: any) =>
              candidate.assignerAssignmentId ===
                assignment.assigneeAssignmentId &&
              candidate.assignee?.role?.code ===
                RoleCode.FIELD_OFFICER,
          );

          return buildAssignmentNode(assignment, downstreamAssignments);
        },
      );

      const korwilAssignments = fcAssignmentsWithChildren.flatMap(
        (assignment: any) => assignment.downstreamAssignments ?? [],
      );

      return {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        createdAt: task.createdAt,
        dueDate: task.dueDate,
        ownerAssignmentId: task.ownerAssignmentId,
        ownerAssignment: task.ownerAssignment,
        createdBy: {
          assignmentId: task.createdByAssignment?.id ?? null,
          fullName: task.createdByAssignment?.userProfile?.fullName ?? null,
          username: task.createdByAssignment?.userProfile?.username ?? null,
          positionId: task.createdByAssignment?.id ?? null,
          positionCode: task.createdByAssignment?.role?.code ?? null,
          positionTitle: task.createdByAssignment?.role?.name ?? null,
          branch: task.createdByAssignment?.branch ?? null,
          organizationUnitId: null,
          organizationUnitCode: null,
          organizationUnitName: task.createdByAssignment?.branch ?? null,
          organizationUnitType: task.createdByAssignment?.branch ?? null,
          roleCode: task.createdByAssignment?.role?.code ?? null,
        },
        targetAreas: task.targetAreas.map((target: any) => ({
          areaId: target.areaId,
          isPrimary: Boolean(target.isPrimary),
          area: {
            id: target.area.id,
            code: target.area.code,
            name: target.area.name,
            level: target.area.level,
          },
        })),
        oimStage: {
          hasRead: true,
          hasForwardedToFieldCoordinator:
            fieldCoordinatorAssignments.length > 0,
          fieldCoordinatorAssignmentCount: fieldCoordinatorAssignments.length,
        },
        fieldCoordinatorSummary: {
          ...summarizeAssignments(fieldCoordinatorAssignments),
          distributed: fcAssignmentsWithChildren.filter(
            (assignment: any) =>
              (assignment.downstreamAssignments?.length ?? 0) > 0,
          ).length,
        },
        korwilSummary: summarizeAssignments(korwilAssignments),
        fieldCoordinatorAssignments: includeTaskDetails
          ? fcAssignmentsWithChildren
          : undefined,
        uukStr: task.uukStrVersion?.uukStr
          ? {
              id: task.uukStrVersion.uukStr.id,
              ownerAssignmentId: task.uukStrVersion.uukStr.ownerAssignmentId,
              ownerAssignment: task.uukStrVersion.uukStr.ownerAssignment,
              versionId: task.uukStrVersion.id,
              versionNumber: task.uukStrVersion.versionNumber,
              title: task.uukStrVersion.title,
            }
          : null,
      };
    });

    const tasksByUukId = new Map<string, typeof mappedTasks>();
    const unlinkedTasks: typeof mappedTasks = [];

    for (const task of mappedTasks) {
      const uukStrId = task.uukStr?.id;
      if (!uukStrId) {
        unlinkedTasks.push(task);
        continue;
      }

      const bucket = tasksByUukId.get(uukStrId) ?? [];
      bucket.push(task);
      tasksByUukId.set(uukStrId, bucket);
    }

    const orderedForwardings = [...version.uukStrs].sort(
      (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
    );

    const regionalChains = version.recipients.map((recipient: any) => {
      const recipientUnitId = recipient.targetAssignmentId ?? null;
      const forwarding =
        orderedForwardings.find(
          (item) => item.ownerAssignmentId === recipientUnitId,
        ) ?? null;
      const relatedTaskItems = forwarding
        ? (tasksByUukId.get(forwarding.id) ?? [])
        : [];
      const fcAssignments = relatedTaskItems.flatMap(
        (task) => task.fieldCoordinatorAssignments ?? [],
      );
      const korwilAssignments = fcAssignments.flatMap(
        (assignment: any) => assignment.downstreamAssignments ?? [],
      );
      const currentUukVersion = forwarding?.versions[0] ?? null;

      return {
        regionalRecipient: {
          id: recipient.id,
          status: recipient.status,
          sentAt: recipient.sentAt,
          deliveredAt: recipient.deliveredAt,
          readAt: recipient.readAt,
          acknowledgedAt: recipient.acknowledgedAt,
          failureReason: recipient.failureReason,
          targetAssignment: recipient.targetAssignment
            ? {
                id: recipient.targetAssignment.id,
                code: recipient.targetAssignment.role?.code ?? null,
                title: recipient.targetAssignment.role?.name ?? null,
                seatCode: null,
                branch: recipient.targetAssignment.branch,
                role: {
                  code: recipient.targetAssignment.role?.code ?? null,
                  name: recipient.targetAssignment.role?.name ?? null,
                },
                organizationUnit: null,
                assigneeName:
                  recipient.targetAssignment.userProfile?.fullName ?? null,
                assigneeUsername:
                  recipient.targetAssignment.userProfile?.username ?? null,
              }
            : null,
        },
        forwarding: forwarding
          ? {
              id: forwarding.id,
              status: forwarding.status,
              createdAt: forwarding.createdAt,
              updatedAt: forwarding.updatedAt,
              ownerAssignmentId: forwarding.ownerAssignmentId,
              ownerAssignment: forwarding.ownerAssignment,
              createdBy: {
                assignmentId: forwarding.createdByAssignment?.id ?? null,
                fullName:
                  forwarding.createdByAssignment?.userProfile?.fullName ?? null,
                username:
                  forwarding.createdByAssignment?.userProfile?.username ?? null,
                positionId:
                  forwarding.createdByAssignment?.id ?? null,
                positionCode:
                  forwarding.createdByAssignment?.role?.code ?? null,
                positionTitle:
                  forwarding.createdByAssignment?.role?.name ?? null,
                branch:
                  forwarding.createdByAssignment?.branch ?? null,
                organizationUnitId: null,
                organizationUnitCode: null,
                organizationUnitName:
                  forwarding.createdByAssignment?.branch ?? null,
                organizationUnitType:
                  forwarding.createdByAssignment?.branch ?? null,
                roleCode:
                  forwarding.createdByAssignment?.role?.code ?? null,
              },
              currentVersion: currentUukVersion
                ? {
                    id: currentUukVersion.id,
                    versionNumber: currentUukVersion.versionNumber,
                    title: currentUukVersion.title,
                    createdAt: currentUukVersion.createdAt,
                    createdBy: {
                      assignmentId:
                        currentUukVersion.createdByAssignment?.id ?? null,
                      fullName:
                        currentUukVersion.createdByAssignment?.userProfile
                          ?.fullName ?? null,
                      positionTitle:
                        currentUukVersion.createdByAssignment?.role?.name ??
                        null,
                    },
                  }
                : null,
            }
          : null,
        oimStage: {
          hasRead: relatedTaskItems.length > 0,
          taskCount: relatedTaskItems.length,
          hasForwardedToFieldCoordinator: fcAssignments.length > 0,
          fieldCoordinatorAssignmentCount: fcAssignments.length,
        },
        fieldCoordinatorStage: {
          totalAssignments: fcAssignments.length,
          readCount: fcAssignments.filter(
            (assignment: any) =>
              Boolean(assignment.readAt) ||
              assignmentReadStatuses.has(assignment.status),
          ).length,
          distributedCount: fcAssignments.filter(
            (assignment: any) =>
              (assignment.downstreamAssignments?.length ?? 0) > 0,
          ).length,
        },
        korwilStage: summarizeAssignments(korwilAssignments),
        oimTasks: includeTaskDetails ? relatedTaskItems : undefined,
      };
    });

    const allFieldCoordinatorAssignments = mappedTasks.flatMap(
      (task) => task.fieldCoordinatorAssignments ?? [],
    );
    const allKorwilAssignments = allFieldCoordinatorAssignments.flatMap(
      (assignment: any) => assignment.downstreamAssignments ?? [],
    );

    return {
      directiveId,
      versionId: version.id,
      recipientSummary: {
        total: version.recipients.length,
        acknowledged: version.recipients.filter(
          (recipient) => recipient.status === RecipientStatus.ACKNOWLEDGED,
        ).length,
        read: version.recipients.filter(
          (recipient) => recipient.status === RecipientStatus.READ,
        ).length,
        delivered: version.recipients.filter(
          (recipient) => recipient.status === RecipientStatus.DELIVERED,
        ).length,
        failed: version.recipients.filter(
          (recipient) => recipient.status === RecipientStatus.FAILED,
        ).length,
      },
      taskSummary: {
        total: mappedTasks.length,
        assigned: mappedTasks.filter(
          (task) => task.status === TaskStatus.ASSIGNED,
        ).length,
        inProgress: mappedTasks.filter(
          (task) => task.status === TaskStatus.IN_PROGRESS,
        ).length,
        completed: mappedTasks.filter(
          (task) => task.status === TaskStatus.COMPLETED,
        ).length,
        cancelled: mappedTasks.filter(
          (task) => task.status === TaskStatus.CANCELLED,
        ).length,
      },
      stageSummary: {
        regional: {
          totalRecipients: version.recipients.length,
          readCount: version.recipients.filter(
            (recipient) =>
              Boolean(recipient.readAt) ||
              recipientReadStatuses.has(recipient.status),
          ).length,
          acknowledgedCount: version.recipients.filter(
            (recipient) =>
              Boolean(recipient.acknowledgedAt) ||
              recipient.status === RecipientStatus.ACKNOWLEDGED,
          ).length,
          forwardedCount: regionalChains.filter((chain) => chain.forwarding)
            .length,
          failedCount: version.recipients.filter(
            (recipient) => recipient.status === RecipientStatus.FAILED,
          ).length,
        },
        oim: {
          totalForwardedRegionalStr: regionalChains.filter(
            (chain) => chain.forwarding,
          ).length,
          readCount: regionalChains.filter((chain) => chain.oimStage.hasRead)
            .length,
          taskCount: mappedTasks.length,
          forwardedToFieldCoordinatorCount: regionalChains.filter(
            (chain) => chain.oimStage.hasForwardedToFieldCoordinator,
          ).length,
        },
        fieldCoordinator: {
          totalAssignments: allFieldCoordinatorAssignments.length,
          readCount: allFieldCoordinatorAssignments.filter(
            (assignment: any) =>
              Boolean(assignment.readAt) ||
              assignmentReadStatuses.has(assignment.status),
          ).length,
          acknowledgedCount: allFieldCoordinatorAssignments.filter(
            (assignment: any) =>
              Boolean(assignment.acknowledgedAt) ||
              assignment.status === TaskAssignmentStatus.ACKNOWLEDGED,
          ).length,
          distributedCount: allFieldCoordinatorAssignments.filter(
            (assignment: any) =>
              (assignment.downstreamAssignments?.length ?? 0) > 0,
          ).length,
        },
        korwil: summarizeAssignments(allKorwilAssignments),
      },
      baketCount,
      targetAreas: version.targetAreas.map((target) => ({
        areaId: target.areaId,
        isPrimary: Boolean(target.isPrimary),
        code: target.area.officialCode ?? target.area.code,
        name: target.area.name,
        level: target.area.level,
      })),
      routingHierarchy: routingPositions.map((assignment) => {
        const primaryArea = assignment.areaScopes[0]?.area ?? null;

        return {
          positionId: assignment.id,
          reportsToPositionId: null,
          seatCode: null,
          positionCode: assignment.role.code,
          positionTitle: assignment.role.name,
          branch: assignment.branch,
          roleCode: assignment.role.code,
          organizationUnitId: primaryArea?.id ?? null,
          organizationUnitCode: primaryArea?.code ?? null,
          organizationUnitName: primaryArea
            ? `${assignment.branch} ${primaryArea.name}`
            : null,
          organizationUnitType: assignment.branch,
          assignmentId: assignment.id,
          fullName: assignment.userProfile?.fullName ?? null,
          username: assignment.userProfile?.username ?? null,
          areaScopes: assignment.areaScopes.map((scope) => ({
            areaId: scope.areaId,
            code: scope.area.officialCode ?? scope.area.code,
            name: scope.area.name,
            level: scope.area.level,
            isPrimary: Boolean(scope.isPrimary),
          })),
        };
      }),
      regionalChains,
      tasks: includeTaskDetails ? mappedTasks : undefined,
      unlinkedTasks: includeTaskDetails ? unlinkedTasks : undefined,
    };
  }

  async cancel(
    directiveId: string,
    body: RequiredReasonDto,
    context: AuthorizationContext,
  ) {
    this.assertRole(
      context,
      [RoleCode.EXECUTIVE],
      'Hanya Deputi II yang dapat membatalkan arahan strategis.',
    );

    const directive = await this.detail(directiveId, context);

    if (
      directive.ownerAssignmentId !== context.primaryAssignmentId &&
      directive.createdByAssignmentId !== context.primaryAssignmentId
    ) {
      throw new ApiException(
        'DIRECTIVE_NOT_MUTABLE',
        'Only the owning executive chain can cancel this directive.',
        403,
      );
    }

    if (directive.status === DirectiveStatus.CANCELLED) {
      return directive;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.directive.update({
        where: { id: directiveId },
        data: { status: DirectiveStatus.CANCELLED },
      });

      const currentVersion = directive.versions.find(
        (item) => item.versionNumber === directive.currentVersionNumber,
      );

      if (currentVersion) {
        await tx.task.updateMany({
          where: {
            directiveVersionId: currentVersion.id,
            status: {
              in: [
                TaskStatus.DRAFT,
                TaskStatus.ASSIGNED,
                TaskStatus.IN_PROGRESS,
              ],
            },
          },
          data: { status: TaskStatus.CANCELLED },
        });
      }
    });

    await this.audit(context, 'DIRECTIVE.CANCEL', directiveId, {
      reason: body.reason,
    });
    return this.detail(directiveId, context);
  }
}
