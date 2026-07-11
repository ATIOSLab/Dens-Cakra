import { Injectable } from '@nestjs/common';
import {
  DirectiveStatus,
  Prisma,
  RecipientStatus,
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

  private detail(id: string) {
    return this.prisma.directive.findFirstOrThrow({
      where: { id, deletedAt: null },
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
                assignments: true,
                targetAreas: {
                  include: {
                    area: {
                      include: { ancestorLinks: true },
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

  private versionDetail(versionId: string) {
    return this.prisma.directiveVersion.findUniqueOrThrow({
      where: { id: versionId },
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
            assignments: true,
            targetAreas: {
              include: {
                area: {
                  include: { ancestorLinks: true },
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

  private async getEditableVersion(versionId: string) {
    const version = await this.prisma.directiveVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: { directive: true },
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

    return version;
  }

  private directiveListWhere(
    query: DirectiveQuery,
    context?: AuthorizationContext,
  ): Prisma.DirectiveWhereInput {
    return {
      deletedAt: null,
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
      ...(query.classification
        ? {
            versions: {
              some: { classification: query.classification },
            },
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
                      ],
                    },
                  },
                },
              },
            },
          }
        : {}),
      ...(query.assignedToMe && context
        ? {
            versions: {
              some: {
                recipients: {
                  some: {
                    OR: [
                      { targetPositionId: context.positionId },
                      { targetUnitId: context.organizationUnitId },
                    ],
                  },
                },
              },
            },
          }
        : {}),
    };
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
            recipients: true,
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
    return this.detail(directive.id);
  }

  async get(directiveId: string) {
    return this.detail(directiveId);
  }

  async versions(directiveId: string) {
    return this.prisma.directiveVersion.findMany({
      where: { directiveId },
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
    if (body.patch.recipients) {
      this.validateRecipients(body.patch.recipients);
    }

    const directive = await this.prisma.directive.findUniqueOrThrow({
      where: { id: directiveId },
    });
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
    return this.versionDetail(newVersion.id);
  }

  async getVersion(versionId: string) {
    return this.versionDetail(versionId);
  }

  async updateVersion(
    versionId: string,
    body: UpdateDirectiveVersionDto,
    context: AuthorizationContext,
  ) {
    await this.getEditableVersion(versionId);
    await this.prisma.directiveVersion.update({
      where: { id: versionId },
      data: {
        strategicIssue: body.strategicIssue,
        commandDescription: body.commandDescription,
        ...(body.dueDate ? { dueDate: new Date(body.dueDate) } : {}),
      },
    });
    await this.audit(context, 'DIRECTIVE.VERSION.UPDATE', versionId);
    return this.versionDetail(versionId);
  }

  async replaceAreas(
    versionId: string,
    body: ReplaceAreasDto,
    context: AuthorizationContext,
  ) {
    await this.getEditableVersion(versionId);
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
    return (await this.versionDetail(versionId)).targetAreas;
  }

  async replaceRecipients(
    versionId: string,
    body: ReplaceRecipientsDto,
    context: AuthorizationContext,
  ) {
    await this.getEditableVersion(versionId);
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
    return (await this.versionDetail(versionId)).recipients;
  }

  async publish(
    versionId: string,
    body: PublishDirectiveDto,
    context: AuthorizationContext,
  ) {
    if (body.confirmation !== 'PUBLISH') {
      throw new ApiException(
        'DIRECTIVE_PUBLISH_CONFIRMATION_REQUIRED',
        'Confirmation must be PUBLISH.',
        422,
      );
    }

    const version = await this.getEditableVersion(versionId);
    const fullVersion = await this.versionDetail(versionId);
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
    return this.detail(version.directiveId);
  }

  async distribute(
    versionId: string,
    body: DistributeDirectiveDto,
    context: AuthorizationContext,
  ) {
    const version = await this.prisma.directiveVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: { directive: true, recipients: true },
    });
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
        const unitRecipients = version.recipients.filter(
          (item) => item.targetUnitId,
        );
        for (const recipient of unitRecipients) {
          const profiles = await tx.positionAssignment.findMany({
            where: {
              position: {
                organizationUnitId: recipient.targetUnitId ?? undefined,
              },
              isActive: true,
              validUntil: null,
            },
            select: { userProfileId: true },
          });

          for (const profile of profiles) {
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
    areaId?: string,
    unitId?: string,
    includeTasks = 'true',
  ) {
    const directive = await this.detail(directiveId);
    const version = directive.versions.find(
      (item) => item.versionNumber === directive.currentVersionNumber,
    );
    const tasks = (version?.tasks ?? []).filter((task) => {
      const areaMatch = areaId
        ? task.targetAreas.some(
            (target) =>
              target.areaId === areaId ||
              target.area.ancestorLinks.some(
                (link) => link.ancestorId === areaId,
              ),
          )
        : true;
      const unitMatch = unitId ? task.ownerUnitId === unitId : true;
      return areaMatch && unitMatch;
    });

    const baketCount = await this.prisma.baket.count({
      where: {
        taskAssignment: {
          task: {
            directiveVersionId: version?.id,
          },
        },
      },
    });

    return {
      directiveId,
      versionId: version?.id ?? null,
      recipientSummary: {
        total: version?.recipients.length ?? 0,
        acknowledged:
          version?.recipients.filter(
            (recipient) => recipient.status === RecipientStatus.ACKNOWLEDGED,
          ).length ?? 0,
        read:
          version?.recipients.filter(
            (recipient) => recipient.status === RecipientStatus.READ,
          ).length ?? 0,
        delivered:
          version?.recipients.filter(
            (recipient) => recipient.status === RecipientStatus.DELIVERED,
          ).length ?? 0,
        failed:
          version?.recipients.filter(
            (recipient) => recipient.status === RecipientStatus.FAILED,
          ).length ?? 0,
      },
      taskSummary: {
        total: tasks.length,
        assigned: tasks.filter((task) => task.status === TaskStatus.ASSIGNED)
          .length,
        inProgress: tasks.filter(
          (task) => task.status === TaskStatus.IN_PROGRESS,
        ).length,
        completed: tasks.filter((task) => task.status === TaskStatus.COMPLETED)
          .length,
        cancelled: tasks.filter((task) => task.status === TaskStatus.CANCELLED)
          .length,
      },
      baketCount,
      tasks: includeTasks === 'true' ? tasks : undefined,
    };
  }

  async cancel(
    directiveId: string,
    body: RequiredReasonDto,
    context: AuthorizationContext,
  ) {
    const directive = await this.detail(directiveId);
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
    return this.detail(directiveId);
  }
}
