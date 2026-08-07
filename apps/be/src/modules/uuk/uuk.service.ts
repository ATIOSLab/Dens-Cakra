import { Injectable } from '@nestjs/common';
import {
  DirectiveStatus,
  Prisma,
  RoleCode,
  TaskStatus,
  UukStrSectionType,
  UukStrStatus,
} from '../../generated/prisma/client.js';
import { ApiException } from '../../common/api/api-exception.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CancelDto,
  CreateUukDto,
  CreateUukRevisionDto,
  PublishDto,
  ReplaceSectionsDto,
  SectionDto,
  UukQuery,
  UpdateUukVersionDto,
} from './uuk.dto.js';
import { UukSortField } from './uuk.dto.js';

const REQUIRED_UUK_SECTION_TYPES = new Set<UukStrSectionType>([
  UukStrSectionType.BASIS_BACKGROUND,
  UukStrSectionType.INVESTIGATION_TARGETS,
  UukStrSectionType.EEI_PIR,
  UukStrSectionType.COLLECTION_PLAN,
  UukStrSectionType.THREAT_RISK_ANALYSIS,
  UukStrSectionType.IMPLEMENTATION_MECHANISM,
  UukStrSectionType.COORDINATION_REPORTING,
  UukStrSectionType.RECOMMENDATION,
  UukStrSectionType.AUTHENTICATION,
]);

@Injectable()
export class UukService {
  constructor(private readonly prisma: PrismaService) {}

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
  ): Prisma.UukStrWhereInput | undefined {
    const areaIds = this.areaIds(context);

    if (areaIds.length === 0) {
      return undefined;
    }

    return {
      OR: [
        {
          directiveVersion: {
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
        {
          versions: {
            some: {
              tasks: {
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
            },
          },
        },
      ],
    };
  }

  private uukAccessWhere(
    context: AuthorizationContext,
    extra: Prisma.UukStrWhereInput = {},
  ): Prisma.UukStrWhereInput {
    const areaScope = this.areaScopeWhere(context);
    const visibilityBranches: Prisma.UukStrWhereInput[] = [
      { ownerAssignmentId: context.primaryAssignmentId },
      { createdByAssignmentId: context.primaryAssignmentId },
      {
        directiveVersion: {
          recipients: {
            some: this.recipientScopeWhere(context),
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
      throw new ApiException('UUK_ROLE_FORBIDDEN', message, 403);
    }
  }

  private validateSections(sections: SectionDto[]) {
    const sectionTypeSet = new Set<string>();
    const sectionOrderSet = new Set<number>();

    for (const section of sections) {
      if (sectionTypeSet.has(section.sectionType)) {
        throw new ApiException(
          'UUK_SECTION_TYPE_DUPLICATE',
          'Section type must be unique in a version.',
          409,
        );
      }
      if (sectionOrderSet.has(section.orderNumber)) {
        throw new ApiException(
          'UUK_SECTION_ORDER_DUPLICATE',
          'Section order number must be unique in a version.',
          409,
        );
      }

      sectionTypeSet.add(section.sectionType);
      sectionOrderSet.add(section.orderNumber);

      const itemCodeSet = new Set<string>();
      const itemOrderSet = new Set<number>();

      for (const item of section.items) {
        if (
          itemCodeSet.has(item.itemCode) ||
          itemOrderSet.has(item.orderNumber)
        ) {
          throw new ApiException(
            'UUK_SECTION_ITEM_DUPLICATE',
            'Section item code and order must be unique.',
            409,
          );
        }

        itemCodeSet.add(item.itemCode);
        itemOrderSet.add(item.orderNumber);
      }
    }
  }

  private isComplete(sections: SectionDto[]) {
    const typeSet = new Set(sections.map((section) => section.sectionType));

    for (const required of REQUIRED_UUK_SECTION_TYPES) {
      if (!typeSet.has(required)) {
        return false;
      }
    }

    return true;
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
        entityType: 'UukStr',
        entityId,
        ...(metadata ? { metadata } : {}),
      },
    });
  }

  private detail(id: string, context?: AuthorizationContext) {
    return this.prisma.uukStr.findFirstOrThrow({
      where: context
        ? this.uukAccessWhere(context, { id })
        : { id, deletedAt: null },
      include: {
        ownerAssignment: true,
        directiveVersion: {
          include: {
            directive: true,
            targetAreas: { include: { area: true } },
            recipients: {
              include: {
                targetAssignment: true,
              },
            },
          },
        },
        createdByAssignment: {
          include: { userProfile: true, role: true },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            createdByAssignment: {
              include: { userProfile: true, role: true },
            },
            sections: {
              orderBy: { orderNumber: 'asc' },
              include: {
                items: { orderBy: { orderNumber: 'asc' } },
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
                targetAreas: { include: { area: true } },
              },
            },
          },
        },
      },
    });
  }

  private versionDetail(versionId: string, context?: AuthorizationContext) {
    return this.prisma.uukStrVersion.findFirstOrThrow({
      where: context
        ? {
            id: versionId,
            uukStr: this.uukAccessWhere(context),
          }
        : { id: versionId },
      include: {
        uukStr: {
          include: {
            ownerAssignment: true,
            directiveVersion: {
              include: {
                directive: true,
                recipients: {
                  include: {
                    targetAssignment: true,
                  },
                },
              },
            },
          },
        },
        createdByAssignment: {
          include: { userProfile: true, role: true },
        },
        sections: {
          orderBy: { orderNumber: 'asc' },
          include: {
            items: { orderBy: { orderNumber: 'asc' } },
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
            targetAreas: { include: { area: true } },
          },
        },
      },
    });
  }

  private async getEditableVersion(
    versionId: string,
    context: AuthorizationContext,
  ) {
    const version = await this.prisma.uukStrVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: { uukStr: true },
    });

    if (
      version.uukStr.status === UukStrStatus.PUBLISHED ||
      version.uukStr.status === UukStrStatus.CANCELLED ||
      version.versionNumber !== version.uukStr.currentVersionNumber
    ) {
      throw new ApiException(
        'UUK_VERSION_IMMUTABLE',
        'Only the current unpublished UUK/STR version can be changed.',
        409,
      );
    }

    if (
      version.uukStr.ownerAssignmentId !== context.primaryAssignmentId &&
      version.uukStr.createdByAssignmentId !== context.primaryAssignmentId
    ) {
      throw new ApiException(
        'UUK_NOT_MUTABLE',
        'Only the owning regional chain can edit this UUK/STR.',
        403,
      );
    }

    return version;
  }

  private assertForwardingImmutable() {
    throw new ApiException(
      'UUK_FORWARDING_IMMUTABLE',
      'Regional forwarding only passes the published STR downward. Its content cannot be revised or edited.',
      409,
    );
  }

  private async replaceSectionsInternal(
    tx: Prisma.TransactionClient,
    versionId: string,
    sections: SectionDto[],
  ) {
    this.validateSections(sections);

    await tx.uukStrSection.deleteMany({
      where: { uukStrVersionId: versionId },
    });

    for (const section of sections) {
      await tx.uukStrSection.create({
        data: {
          uukStrVersionId: versionId,
          sectionType: section.sectionType,
          title: section.title,
          orderNumber: section.orderNumber,
          items: {
            create: section.items.map((item) => ({
              itemCode: item.itemCode,
              content: item.content,
              orderNumber: item.orderNumber,
            })),
          },
        },
      });
    }
  }

  async list(query: UukQuery, context: AuthorizationContext) {
    const sortOrder = query.sortOrder ?? 'desc';
    const orderBy: Prisma.UukStrOrderByWithRelationInput[] =
      query.sortBy === UukSortField.DUE_DATE
        ? [
            {
              directiveVersion: {
                dueDate: { sort: sortOrder, nulls: 'last' },
              },
            },
            { id: 'asc' },
          ]
        : [{ updatedAt: sortOrder }, { id: 'asc' }];

    const where = this.uukAccessWhere(context, {
        ...(query.status ? { status: query.status } : {}),
        ...(query.ownerAssignmentId ? { ownerAssignmentId: query.ownerAssignmentId } : {}),
        ...(query.directiveId
          ? {
              directiveVersion: {
                directiveId: query.directiveId,
              },
            }
          : {}),
        ...(query.directiveVersionIds?.length
          ? { directiveVersionId: { in: query.directiveVersionIds } }
          : {}),
        ...(query.search
          ? {
              OR: [
                {
                  versions: {
                    some: {
                      title: { contains: query.search, mode: 'insensitive' },
                    },
                  },
                },
                {
                  directiveVersion: {
                    directive: {
                      commandNumber: {
                        contains: query.search,
                        mode: 'insensitive',
                      },
                    },
                  },
                },
              ],
            }
          : {}),
      });
    const include = {
        ownerAssignment: true,
        directiveVersion: {
          include: {
            directive: true,
            recipients: {
              include: {
                targetAssignment: true,
              },
            },
          },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          include: {
            sections: {
              orderBy: { orderNumber: 'asc' },
              include: { items: true },
            },
          },
        },
      } satisfies Prisma.UukStrInclude;
    const items = await this.prisma.uukStr.findMany({
      where,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy,
      include,
    });
    if (!query.paginated) return items;

    const total = await this.prisma.uukStr.count({ where });
    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  }

  async create(body: CreateUukDto, context: AuthorizationContext) {
    this.assertRole(
      context,
      [RoleCode.REGIONAL_COMMANDER],
      'Only Regional Commander can create UUK/STR elaboration.',
    );

    if (body.ownerAssignmentId !== context.primaryAssignmentId) {
      throw new ApiException(
        'UUK_OWNER_UNIT_OUT_OF_SCOPE',
        'UUK/STR can only be created for the current organization unit.',
        403,
      );
    }

    this.validateSections(body.sections);

    const directiveVersion =
      await this.prisma.directiveVersion.findFirstOrThrow({
        where: {
          id: body.directiveVersionId,
          OR: [
            {
              directive: {
                deletedAt: null,
                ownerAssignmentId: context.primaryAssignmentId,
              },
            },
            {
              directive: {
                deletedAt: null,
              },
              recipients: {
                some: this.recipientScopeWhere(context),
              },
            },
          ],
        },
        include: {
          directive: true,
          recipients: true,
        },
      });

    if (
      directiveVersion.directive.status === DirectiveStatus.CANCELLED ||
      directiveVersion.directive.status === DirectiveStatus.COMPLETED
    ) {
      throw new ApiException(
        'UUK_DIRECTIVE_NOT_MUTABLE',
        'Cannot create UUK/STR under cancelled or completed directive.',
        409,
      );
    }

    const hasRecipient =
      directiveVersion.directive.ownerAssignmentId === context.primaryAssignmentId ||
      directiveVersion.recipients.some(
        (recipient) =>
          recipient.targetAssignmentId === context.primaryAssignmentId ||
          recipient.targetAssignmentId === context.primaryAssignmentId,
      );

    if (!hasRecipient) {
      throw new ApiException(
        'UUK_DIRECTIVE_NOT_ASSIGNED',
        'UUK/STR can only be elaborated from a directive received by the current command.',
        403,
      );
    }

    if (!this.isComplete(body.sections)) {
      throw new ApiException(
        'UUK_FORWARDING_INCOMPLETE',
        'Regional forwarding must carry the complete published STR content without omissions.',
        422,
      );
    }

    const uuk = await this.prisma.$transaction(async (tx) => {
      const root = await tx.uukStr.create({
        data: {
          directiveVersionId: body.directiveVersionId,
          ownerAssignmentId: body.ownerAssignmentId,
          createdByAssignmentId: context.primaryAssignmentId,
          status: UukStrStatus.PUBLISHED,
        },
      });

      const version = await tx.uukStrVersion.create({
        data: {
          uukStrId: root.id,
          versionNumber: 1,
          title: body.title,
          createdByAssignmentId: context.primaryAssignmentId,
        },
      });

      await this.replaceSectionsInternal(tx, version.id, body.sections);
      return root;
    });

    await this.audit(context, 'UUK.CREATE', uuk.id);
    return this.detail(uuk.id, context);
  }

  async get(uukStrId: string, context: AuthorizationContext) {
    return this.detail(uukStrId, context);
  }

  async versions(uukStrId: string, context: AuthorizationContext) {
    await this.detail(uukStrId, context);

    return this.prisma.uukStrVersion.findMany({
      where: { uukStrId },
      orderBy: { versionNumber: 'desc' },
      include: {
        createdByAssignment: {
          include: { userProfile: true, role: true },
        },
        sections: {
          orderBy: { orderNumber: 'asc' },
          include: {
            items: { orderBy: { orderNumber: 'asc' } },
          },
        },
      },
    });
  }

  async createVersion(
    uukStrId: string,
    body: CreateUukRevisionDto,
    context: AuthorizationContext,
  ) {
    this.assertRole(
      context,
      [RoleCode.REGIONAL_COMMANDER],
      'Only Regional Commander can revise UUK/STR.',
    );

    void uukStrId;
    void body;
    void context;
    this.assertForwardingImmutable();
  }

  async getVersion(versionId: string, context: AuthorizationContext) {
    return this.versionDetail(versionId, context);
  }

  async updateVersion(
    versionId: string,
    body: UpdateUukVersionDto,
    context: AuthorizationContext,
  ) {
    this.assertRole(
      context,
      [RoleCode.REGIONAL_COMMANDER],
      'Only Regional Commander can edit UUK/STR drafts.',
    );

    void versionId;
    void body;
    void context;
    this.assertForwardingImmutable();
  }

  async replaceSections(
    versionId: string,
    body: ReplaceSectionsDto,
    context: AuthorizationContext,
  ) {
    this.assertRole(
      context,
      [RoleCode.REGIONAL_COMMANDER],
      'Only Regional Commander can edit UUK/STR sections.',
    );

    void versionId;
    void body;
    void context;
    this.assertForwardingImmutable();
  }

  async publish(
    versionId: string,
    body: PublishDto,
    context: AuthorizationContext,
  ) {
    this.assertRole(
      context,
      [RoleCode.REGIONAL_COMMANDER],
      'Only Regional Commander can publish UUK/STR.',
    );

    if (body.confirmation !== 'PUBLISH') {
      throw new ApiException(
        'UUK_PUBLISH_CONFIRMATION_REQUIRED',
        'Confirmation must be PUBLISH.',
        422,
      );
    }

    const version = await this.getEditableVersion(versionId, context);
    const fullVersion = await this.versionDetail(versionId, context);

    if (
      fullVersion.sections.length < REQUIRED_UUK_SECTION_TYPES.size ||
      !this.isComplete(
        fullVersion.sections.map((section) => ({
          sectionType: section.sectionType,
          title: section.title,
          orderNumber: section.orderNumber,
          items: section.items.map((item) => ({
            itemCode: item.itemCode,
            content: item.content,
            orderNumber: item.orderNumber,
          })),
        })),
      )
    ) {
      throw new ApiException(
        'UUK_INCOMPLETE',
        'All required UUK/STR section types must be completed before publish.',
        422,
      );
    }

    await this.prisma.uukStr.update({
      where: { id: version.uukStrId },
      data: { status: UukStrStatus.PUBLISHED },
    });

    await this.audit(context, 'UUK.PUBLISH', version.uukStrId, { versionId });
    return this.detail(version.uukStrId, context);
  }

  async cancel(
    uukStrId: string,
    body: CancelDto,
    context: AuthorizationContext,
  ) {
    this.assertRole(
      context,
      [RoleCode.REGIONAL_COMMANDER],
      'Only Regional Commander can cancel UUK/STR.',
    );

    const uuk = await this.detail(uukStrId, context);

    if (
      uuk.ownerAssignmentId !== context.primaryAssignmentId &&
      uuk.createdByAssignmentId !== context.primaryAssignmentId
    ) {
      throw new ApiException(
        'UUK_NOT_MUTABLE',
        'Only the owning regional chain can cancel this UUK/STR.',
        403,
      );
    }

    if (uuk.status === UukStrStatus.CANCELLED) {
      return uuk;
    }

    const linkedTasks = uuk.versions.flatMap((version) => version.tasks);

    if (
      linkedTasks.length > 0 &&
      linkedTasks.every((task) => task.status === TaskStatus.COMPLETED)
    ) {
      throw new ApiException(
        'UUK_CANCEL_BLOCKED',
        'UUK/STR with fully completed linked tasks cannot be cancelled.',
        409,
      );
    }

    await this.prisma.uukStr.update({
      where: { id: uukStrId },
      data: { status: UukStrStatus.CANCELLED },
    });

    await this.audit(context, 'UUK.CANCEL', uukStrId, { reason: body.reason });
    return this.detail(uukStrId, context);
  }
}
