import { Injectable } from '@nestjs/common';
import {
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

@Injectable()
export class DirectiveService {
  constructor(private readonly prisma: PrismaService) {}

  private areaIds(context: AuthorizationContext) {
    return context.areaScopes.map((scope) => scope.areaId);
  }

  private recipientScopeWhere(
    context: AuthorizationContext,
  ): Prisma.DirectiveRecipientWhereInput {
    return {
      OR: [
        { targetPositionId: context.positionId },
        { targetUnitId: context.organizationUnitId },
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
      { ownerUnitId: context.organizationUnitId },
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
                ownerUnitId: context.organizationUnitId,
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
                  { ownerUnitId: context.organizationUnitId },
                  {
                    assignments: {
                      some: {
                        OR: [
                          {
                            assigneeAssignmentId:
                              context.primaryAssignmentId,
                          },
                          {
                            assignerAssignmentId:
                              context.primaryAssignmentId,
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
      AND: [
        { deletedAt: null },
        extra,
        { OR: visibilityBranches },
      ],
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
        Number(Boolean(recipient.targetUnitId)) +
        Number(Boolean(recipient.targetPositionId));

      if (count !== 1) {
        throw new ApiException(
          'EXACTLY_ONE_TARGET_REQUIRED',
          'Each recipient must target exactly one unit or position.',
          422,
        );
      }

      const key = recipient.targetUnitId
        ? `unit:${recipient.targetUnitId}`
        : `position:${recipient.targetPositionId}`;

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
        ownerUnit: true,
        createdByAssignment: {
          include: { userProfile: true, position: true },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            createdByAssignment: {
              include: { userProfile: true, position: true },
            },
            targetAreas: { include: { area: true } },
            recipients: {
              include: {
                targetUnit: true,
                targetPosition: true,
              },
            },
            tasks: {
              include: {
                ownerUnit: true,
                assignments: {
                  include: {
                    assigner: { include: { position: true, userProfile: true } },
                    assignee: { include: { position: true, userProfile: true } },
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
                ownerUnit: true,
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
          include: { userProfile: true, position: true },
        },
        targetAreas: { include: { area: true } },
        recipients: {
          include: {
            targetUnit: true,
            targetPosition: true,
          },
        },
        tasks: {
          include: {
            ownerUnit: true,
            assignments: {
              include: {
                assigner: { include: { position: true, userProfile: true } },
                assignee: { include: { position: true, userProfile: true } },
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
            ownerUnit: true,
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
      version.directive.ownerUnitId !== context.organizationUnitId &&
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
      ...(query.status ? { status: query.status } : {}),
      ...(query.ownerUnitId ? { ownerUnitId: query.ownerUnitId } : {}),
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
      ...(query.from || query.to
        ? {
            versions: {
              some: {
                ...(query.from
                  ? { commandDate: { gte: new Date(query.from) } }
                  : {}),
                ...(query.to
                  ? { commandDate: { lte: new Date(query.to) } }
                  : {}),
              },
            },
          }
        : {}),
      ...(query.areaId
        ? {
            versions: {
              some: {
                targetAreas: {
                  some: {
                    area: {
                      OR: [
                        { id: query.areaId },
                        {
                          ancestorLinks: { some: { ancestorId: query.areaId } },
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
          }
        : {}),
      ...(query.assignedToMe
        ? {
            versions: {
              some: {
                recipients: {
                  some: this.recipientScopeWhere(context),
                },
              },
            },
          }
        : {}),
    });
  }

  async list(query: DirectiveQuery, context: AuthorizationContext) {
    return this.prisma.directive.findMany({
      where: this.directiveListWhere(query, context),
      take: query.limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        ownerUnit: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          include: {
            targetAreas: { include: { area: true } },
            recipients: {
              include: {
                targetUnit: true,
                targetPosition: true,
              },
            },
          },
        },
        _count: {
          select: {
            versions: true,
          },
        },
      },
    });
  }

  async create(body: CreateDirectiveDto, context: AuthorizationContext) {
    this.assertRole(
      context,
      [RoleCode.EXECUTIVE],
      'Only Executive can create strategic directives.',
    );

    if (body.ownerUnitId !== context.organizationUnitId) {
      throw new ApiException(
        'DIRECTIVE_OWNER_UNIT_OUT_OF_SCOPE',
        'Directives can only be created for the current organization unit.',
        403,
      );
    }

    this.validateRecipients(body.version.recipients);

    const directive = await this.prisma.$transaction(async (tx) => {
      const root = await tx.directive.create({
        data: {
          commandNumber: body.version.commandNumber,
          ownerUnitId: body.ownerUnitId,
          createdByAssignmentId: context.primaryAssignmentId,
          status: DirectiveStatus.DRAFT,
        },
      });

      await tx.directiveVersion.create({
        data: {
          directiveId: root.id,
          versionNumber: 1,
          classification: body.version.classification,
          commandSource: body.version.commandSource,
          commandIssuer: body.version.commandIssuer,
          commandDate: new Date(body.version.commandDate),
          dueDate: body.version.dueDate ? new Date(body.version.dueDate) : null,
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
              targetUnitId: recipient.targetUnitId,
              targetPositionId: recipient.targetPositionId,
            })),
          },
        },
      });

      return root;
    });

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
          include: { userProfile: true, position: true },
        },
        targetAreas: { include: { area: true } },
        recipients: {
          include: {
            targetUnit: true,
            targetPosition: true,
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
      'Only Executive can revise strategic directives.',
    );

    if (body.patch.recipients) {
      this.validateRecipients(body.patch.recipients);
    }

    const directive = await this.detail(directiveId, context);

    if (
      directive.ownerUnitId !== context.organizationUnitId &&
      directive.createdByAssignmentId !== context.primaryAssignmentId
    ) {
      throw new ApiException(
        'DIRECTIVE_NOT_MUTABLE',
        'Only the owning executive chain can revise this directive.',
        403,
      );
    }

    if (
      directive.status === DirectiveStatus.CANCELLED ||
      directive.status === DirectiveStatus.COMPLETED
    ) {
      throw new ApiException(
        'DIRECTIVE_NOT_MUTABLE',
        'Cancelled or completed directives cannot be revised.',
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
                targetUnitId: recipient.targetUnitId,
                targetPositionId: recipient.targetPositionId,
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
      'Only Executive can edit directive drafts.',
    );

    await this.getEditableVersion(versionId, context);

    await this.prisma.directiveVersion.update({
      where: { id: versionId },
      data: {
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
      'Only Executive can edit directive draft areas.',
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
      'Only Executive can edit directive recipients.',
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
          targetUnitId: recipient.targetUnitId,
          targetPositionId: recipient.targetPositionId,
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
      'Only Executive can publish strategic directives.',
    );

    if (body.confirmation !== 'PUBLISH') {
      throw new ApiException(
        'DIRECTIVE_PUBLISH_CONFIRMATION_REQUIRED',
        'Confirmation must be PUBLISH.',
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
        'Directive requires at least one target area and one recipient.',
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
      'Only Executive can distribute strategic directives.',
    );

    const version = await this.prisma.directiveVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: {
        directive: true,
        recipients: true,
      },
    });

    if (
      version.directive.ownerUnitId !== context.organizationUnitId &&
      version.directive.createdByAssignmentId !== context.primaryAssignmentId
    ) {
      throw new ApiException(
        'DIRECTIVE_NOT_DISTRIBUTABLE',
        'Only the owning executive chain can distribute this directive.',
        403,
      );
    }

    if (
      version.directive.status !== DirectiveStatus.PUBLISHED ||
      version.versionNumber !== version.directive.currentVersionNumber
    ) {
      throw new ApiException(
        'DIRECTIVE_NOT_DISTRIBUTABLE',
        'Only the current published directive can be distributed.',
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
          const profiles = await tx.userSeatAssignment.findMany({
            where: {
              isActive: true,
              validUntil: null,
              ...(recipient.targetPositionId
                ? { positionId: recipient.targetPositionId }
                : {}),
              ...(recipient.targetUnitId
                ? {
                    position: {
                      organizationUnitId: recipient.targetUnitId,
                    },
                  }
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
                title: `Directive ${version.directive.commandNumber}`,
                message: 'Directive baru telah didistribusikan.',
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
      recipient.targetPositionId &&
      recipient.targetPositionId !== context.positionId
    ) {
      throw new ApiException(
        'DIRECTIVE_RECIPIENT_NOT_OWNER',
        'Directive recipient does not belong to the current position.',
        403,
      );
    }

    if (
      recipient.targetUnitId &&
      recipient.targetUnitId !== context.organizationUnitId
    ) {
      throw new ApiException(
        'DIRECTIVE_RECIPIENT_NOT_OWNER',
        'Directive recipient does not belong to the current unit.',
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
        targetUnit: true,
        targetPosition: true,
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
      'Only Executive can access end-to-end directive tracking.',
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
            targetUnit: true,
            targetPosition: {
              include: {
                organizationUnit: true,
                role: true,
                assignments: {
                  where: {
                    isActive: true,
                    validUntil: null,
                    userProfile: {
                      deletedAt: null,
                      isActive: true,
                    },
                  },
                  orderBy: [{ isPrimary: 'desc' }, { validFrom: 'desc' }],
                  take: 1,
                  include: {
                    userProfile: true,
                  },
                },
              },
            },
          },
        },
        uukStrs: {
          where: { deletedAt: null },
          include: {
            ownerUnit: true,
            createdByAssignment: {
              include: {
                userProfile: true,
                position: {
                  include: {
                    organizationUnit: true,
                    role: true,
                  },
                },
              },
            },
            versions: {
              orderBy: { versionNumber: 'desc' },
              take: 1,
              include: {
                createdByAssignment: {
                  include: {
                    userProfile: true,
                    position: {
                      include: {
                        organizationUnit: true,
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
    });

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
        ownerUnit: true,
        createdByAssignment: {
          include: {
            userProfile: true,
            position: {
              include: {
                organizationUnit: true,
                role: true,
              },
            },
          },
        },
        uukStrVersion: {
          include: {
            uukStr: {
              include: {
                ownerUnit: true,
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
                position: {
                  include: {
                    organizationUnit: true,
                    role: true,
                  },
                },
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
                position: {
                  include: {
                    organizationUnit: true,
                    role: true,
                  },
                },
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
      const unitMatch = unitId ? task.ownerUnitId === unitId : true;
      return areaMatch && unitMatch;
    });

    const mapAreaScope = (scope: any) => ({
      areaId: scope.areaId,
      code: scope.area?.code ?? null,
      name: scope.area?.name ?? '-',
      level: scope.area?.level ?? '-',
      isPrimary: Boolean(scope.isPrimary),
    });

    const mapAssignmentActor = (assignment: any) =>
      assignment
        ? {
            assignmentId: assignment.id,
            fullName: assignment.userProfile?.fullName ?? null,
            username: assignment.userProfile?.username ?? null,
            positionId: assignment.position?.id ?? null,
            positionTitle: assignment.position?.title ?? null,
            organizationUnitId:
              assignment.position?.organizationUnit?.id ?? null,
            organizationUnitName:
              assignment.position?.organizationUnit?.name ?? null,
            roleCode: assignment.position?.role?.code ?? null,
            areaScopes: (assignment.areaScopes ?? []).map(mapAreaScope),
          }
        : null;

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
          assignment.assignee?.position?.role?.code ===
          RoleCode.FIELD_COORDINATOR,
      );

      const fcAssignmentsWithChildren = fieldCoordinatorAssignments.map(
        (assignment: any) => {
          const downstreamAssignments = task.assignments.filter(
            (candidate: any) =>
              candidate.assignerAssignmentId ===
                assignment.assigneeAssignmentId &&
              candidate.assignee?.position?.role?.code ===
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
        ownerUnitId: task.ownerUnitId,
        ownerUnit: task.ownerUnit,
        createdBy: {
          assignmentId: task.createdByAssignment?.id ?? null,
          fullName: task.createdByAssignment?.userProfile?.fullName ?? null,
          positionTitle: task.createdByAssignment?.position?.title ?? null,
          organizationUnitName:
            task.createdByAssignment?.position?.organizationUnit?.name ?? null,
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
              ownerUnitId: task.uukStrVersion.uukStr.ownerUnitId,
              ownerUnit: task.uukStrVersion.uukStr.ownerUnit,
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
      (left, right) =>
        right.updatedAt.getTime() - left.updatedAt.getTime(),
    );

    const regionalChains = version.recipients.map((recipient: any) => {
      const recipientUnitId =
        recipient.targetUnitId ??
        recipient.targetPosition?.organizationUnit?.id ??
        null;
      const forwarding =
        orderedForwardings.find(
          (item) => item.ownerUnitId === recipientUnitId,
        ) ?? null;
      const relatedTaskItems = forwarding
        ? tasksByUukId.get(forwarding.id) ?? []
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
          targetUnit: recipient.targetUnit,
          targetPosition: recipient.targetPosition
            ? {
                id: recipient.targetPosition.id,
                title: recipient.targetPosition.title,
                seatCode: recipient.targetPosition.seatCode,
                role: {
                  code: recipient.targetPosition.role?.code ?? null,
                  name: recipient.targetPosition.role?.name ?? null,
                },
                organizationUnit:
                  recipient.targetPosition.organizationUnit ?? null,
                assigneeName:
                  recipient.targetPosition.assignments[0]?.userProfile
                    ?.fullName ?? null,
                assigneeUsername:
                  recipient.targetPosition.assignments[0]?.userProfile
                    ?.username ?? null,
              }
            : null,
        },
        forwarding: forwarding
          ? {
              id: forwarding.id,
              status: forwarding.status,
              createdAt: forwarding.createdAt,
              updatedAt: forwarding.updatedAt,
              ownerUnitId: forwarding.ownerUnitId,
              ownerUnit: forwarding.ownerUnit,
              createdBy: {
                assignmentId: forwarding.createdByAssignment?.id ?? null,
                fullName:
                  forwarding.createdByAssignment?.userProfile?.fullName ??
                  null,
                positionTitle:
                  forwarding.createdByAssignment?.position?.title ?? null,
                organizationUnitName:
                  forwarding.createdByAssignment?.position?.organizationUnit
                    ?.name ?? null,
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
                        currentUukVersion.createdByAssignment?.position
                          ?.title ?? null,
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
          readCount: regionalChains.filter(
            (chain) => chain.oimStage.hasRead,
          ).length,
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
      'Only Executive can cancel strategic directives.',
    );

    const directive = await this.detail(directiveId, context);

    if (
      directive.ownerUnitId !== context.organizationUnitId &&
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
