import { Injectable } from '@nestjs/common';
import {
  CommandRouteType,
  DirectiveStatus,
  JaringStatus,
  Prisma,
  RoleCode,
  TaskAssignmentStatus,
  TaskStatus,
  UukStrStatus,
} from '../../generated/prisma/client.js';
import { ApiException } from '../../common/api/api-exception.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  AssignTaskDto,
  CreateTaskDto,
  ForwardJaringInstructionDto,
  NoteDto,
  ProgressDto,
  ReasonDto,
  ReassignDto,
  TargetAreasDto,
  TaskQuery,
  UpdateTaskDto,
} from './task.dto.js';
import { TaskSortField } from './task.dto.js';

const OPEN_ASSIGNMENT_STATUSES = [
  TaskAssignmentStatus.SENT,
  TaskAssignmentStatus.READ,
  TaskAssignmentStatus.ACKNOWLEDGED,
  TaskAssignmentStatus.IN_PROGRESS,
  TaskAssignmentStatus.OVERDUE,
] as const;

const CLOSED_ASSIGNMENT_STATUSES = [
  TaskAssignmentStatus.COMPLETED,
  TaskAssignmentStatus.REASSIGNED,
  TaskAssignmentStatus.CANCELLED,
] as const;

@Injectable()
export class TaskService {
  constructor(private readonly prisma: PrismaService) {}

  private areaVisibilityWhere(
    areaIds: string[],
  ): Prisma.AdministrativeAreaWhereInput | undefined {
    if (areaIds.length === 0) {
      return undefined;
    }

    return {
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
    };
  }

  private areaIds(context: AuthorizationContext) {
    return context.areaScopes.map((scope) => scope.areaId);
  }

  private areaOverlapWhere(
    areaIds: string[],
  ): Prisma.TaskWhereInput | undefined {
    const areaWhere = this.areaVisibilityWhere(areaIds);

    if (!areaWhere) {
      return undefined;
    }

    return {
      targetAreas: {
        some: {
          area: areaWhere,
        },
      },
    };
  }

  private directiveRecipientWhere(
    context: AuthorizationContext,
  ): Prisma.DirectiveRecipientWhereInput {
    return {
      OR: [
        { targetAssignmentId: context.primaryAssignmentId },
        { targetAssignmentId: context.primaryAssignmentId },
      ],
    };
  }

  private taskAccessWhere(
    context: AuthorizationContext,
    extra: Prisma.TaskWhereInput = {},
  ): Prisma.TaskWhereInput {
    const areaVisibility = this.areaOverlapWhere(this.areaIds(context));

    const visibilityBranches: Prisma.TaskWhereInput[] = [
      { createdByAssignmentId: context.primaryAssignmentId },
      { ownerAssignmentId: context.primaryAssignmentId },
      {
        assignments: {
          some: {
            OR: [
              { assigneeAssignmentId: context.primaryAssignmentId },
              { assignerAssignmentId: context.primaryAssignmentId },
            ],
          },
        },
      },
      {
        directiveVersion: {
          recipients: {
            some: this.directiveRecipientWhere(context),
          },
        },
      },
      {
        uukStrVersion: {
          uukStr: {
            ownerAssignmentId: context.primaryAssignmentId,
          },
        },
      },
    ];

    if (areaVisibility) {
      visibilityBranches.push(areaVisibility);
    }

    return {
      AND: [{ deletedAt: null }, extra, { OR: visibilityBranches }],
    };
  }

  private taskDetailInclude(): Prisma.TaskInclude {
    return {
      ownerAssignment: true,
      createdByAssignment: {
        include: { userProfile: true, role: true },
      },
      parentTask: {
        select: {
          id: true,
          title: true,
          status: true,
          dueDate: true,
        },
      },
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
      uukStrVersion: {
        include: {
          uukStr: {
            include: {
              ownerAssignment: true,
              directiveVersion: {
                include: {
                  directive: true,
                },
              },
            },
          },
          sections: {
            orderBy: { orderNumber: 'asc' },
            include: {
              items: {
                orderBy: { orderNumber: 'asc' },
              },
            },
          },
        },
      },
      targetAreas: { include: { area: true } },
      assignments: {
        orderBy: { assignedAt: 'desc' },
        include: {
          assigner: {
            include: {
              userProfile: true,
              role: true,
              areaScopes: {
                where: { validUntil: null },
                include: { area: true },
              },
            },
          },
          assignee: {
            include: {
              userProfile: true,
              role: true,
              areaScopes: {
                where: { validUntil: null },
                include: { area: true },
              },
            },
          },
          progressLogs: {
            orderBy: { createdAt: 'asc' },
          },
          reassignedFrom: true,
          reassignedTo: true,
        },
      },
      childTasks: {
        include: {
          ownerAssignment: true,
          _count: {
            select: {
              assignments: true,
              childTasks: true,
            },
          },
        },
      },
    };
  }

  private assignmentDetailInclude(): Prisma.TaskAssignmentInclude {
    return {
      task: {
        include: this.taskDetailInclude(),
      },
      progressLogs: {
        orderBy: { createdAt: 'asc' },
      },
      assigner: {
        include: {
          role: true,
          userProfile: true,
          areaScopes: {
            where: { validUntil: null },
            include: { area: true },
          },
        },
      },
      assignee: {
        include: {
          role: true,
          userProfile: true,
          areaScopes: {
            where: { validUntil: null },
            include: { area: true },
          },
        },
      },
      reassignedFrom: true,
      reassignedTo: true,
    };
  }

  private async taskDetail(taskId: string, context: AuthorizationContext) {
    return this.prisma.task.findFirstOrThrow({
      where: this.taskAccessWhere(context, { id: taskId }),
      include: this.taskDetailInclude(),
    });
  }

  private async assignmentDetail(
    assignmentId: string,
    context: AuthorizationContext,
  ) {
    return this.prisma.taskAssignment.findFirstOrThrow({
      where: {
        id: assignmentId,
        task: this.taskAccessWhere(context),
      },
      include: this.assignmentDetailInclude(),
    });
  }

  private async loadAssignmentTarget(assignmentId: string) {
    return this.prisma.userOperationalAssignment.findFirstOrThrow({
      where: {
        id: assignmentId,
        isActive: true,
        validUntil: null,
        userProfile: {
          deletedAt: null,
          isActive: true,
        },
        role: {
          isActive: true,
        },
      },
      include: {
        userProfile: true,
        role: true,
        areaScopes: {
          where: { validUntil: null },
          include: { area: true },
        },
      },
    });
  }

  private async isAreaWithinScope(
    areaIds: string[],
    context: AuthorizationContext,
  ) {
    if (areaIds.length === 0) return false;

    const areaRootIds = context.areaScopes.map((scope) => scope.areaId);
    if (areaRootIds.length === 0) return true;
    if (areaIds.some((id) => areaRootIds.includes(id))) return true;

    const allowed = await this.prisma.administrativeAreaClosure.findFirst({
      where: {
        ancestorId: { in: areaRootIds },
        descendantId: { in: areaIds },
      },
      select: { descendantId: true },
    });

    return Boolean(allowed);
  }

  private assertRole(
    context: AuthorizationContext,
    allowedRoles: readonly RoleCode[],
    message: string,
  ) {
    if (!allowedRoles.includes(context.roleCode)) {
      throw new ApiException('TASK_ROLE_FORBIDDEN', message, 403);
    }
  }

  private assertBindaCommander(context: AuthorizationContext, message: string) {
    this.assertRole(context, [RoleCode.REGIONAL_COMMANDER], message);

    if (context.commandRouteType !== CommandRouteType.BINDA) {
      throw new ApiException('TASK_ROLE_FORBIDDEN', message, 403);
    }
  }

  private async assertAssignableTarget(
    assigneeAssignmentId: string,
    context: AuthorizationContext,
    expectedRoleCode: RoleCode,
  ) {
    const assignee = await this.loadAssignmentTarget(assigneeAssignmentId);

    if (assignee.role.code !== expectedRoleCode) {
      throw new ApiException(
        'TASK_INVALID_ASSIGNEE_ROLE',
        `Assignment target must have role ${expectedRoleCode}.`,
        422,
      );
    }

    const assigneeAreaIds = assignee.areaScopes.map((scope) => scope.areaId);
    const isSubordinate = await this.isAreaWithinScope(
      assigneeAreaIds,
      context,
    );

    if (!isSubordinate || assignee.id === context.primaryAssignmentId) {
      throw new ApiException(
        'TASK_ASSIGNEE_NOT_SUBORDINATE',
        'Assignment target must be in the current command chain.',
        403,
      );
    }

    return assignee;
  }

  private async assertTaskExecutionOwner(
    assignmentId: string,
    context: AuthorizationContext,
  ) {
    const assignment = await this.prisma.taskAssignment.findUniqueOrThrow({
      where: { id: assignmentId },
      include: {
        task: true,
      },
    });

    if (assignment.assigneeAssignmentId !== context.primaryAssignmentId) {
      throw new ApiException(
        'TASK_ASSIGNMENT_NOT_OWNER',
        'Only the assignee can execute this assignment.',
        403,
      );
    }

    return assignment;
  }

  private async audit(
    context: AuthorizationContext,
    action: string,
    id: string,
    data?: Prisma.InputJsonValue,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorUserProfileId: context.userProfileId,
        actorAssignmentId: context.primaryAssignmentId,
        action,
        entityType: 'Task',
        entityId: id,
        ...(data ? { metadata: data } : {}),
      },
    });
  }

  private async transition(
    id: string,
    allowed: TaskAssignmentStatus[],
    status: TaskAssignmentStatus,
    context: AuthorizationContext,
    note?: string,
    percent?: number,
  ) {
    const assignment = await this.assertTaskExecutionOwner(id, context);

    if (!allowed.includes(assignment.status)) {
      throw new ApiException(
        'INVALID_STATE_TRANSITION',
        `Cannot transition ${assignment.status} to ${status}.`,
        409,
      );
    }

    const now = new Date();
    const data: Prisma.TaskAssignmentUpdateInput = {
      status,
      ...(status === TaskAssignmentStatus.READ ? { readAt: now } : {}),
      ...(status === TaskAssignmentStatus.ACKNOWLEDGED
        ? { acknowledgedAt: now }
        : {}),
      ...(status === TaskAssignmentStatus.IN_PROGRESS
        ? { startedAt: assignment.startedAt ?? now }
        : {}),
      ...(status === TaskAssignmentStatus.COMPLETED
        ? { completedAt: now }
        : {}),
    };

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.taskAssignment.update({ where: { id }, data });

      await tx.taskProgressLog.create({
        data: {
          taskAssignmentId: id,
          status,
          progressPercent: percent,
          note,
          createdByAssignmentId: context.primaryAssignmentId,
        },
      });

      if (status === TaskAssignmentStatus.IN_PROGRESS) {
        await tx.task.update({
          where: { id: assignment.taskId },
          data: { status: TaskStatus.IN_PROGRESS },
        });
      }

      if (status === TaskAssignmentStatus.COMPLETED) {
        const remaining = await tx.taskAssignment.count({
          where: {
            taskId: assignment.taskId,
            status: { in: [...OPEN_ASSIGNMENT_STATUSES] },
          },
        });

        if (remaining === 0) {
          await tx.task.update({
            where: { id: assignment.taskId },
            data: { status: TaskStatus.COMPLETED },
          });
        }
      }

      return result;
    });

    await this.audit(context, `TASK.${status}`, assignment.taskId);
    return updated;
  }

  async list(query: TaskQuery, context: AuthorizationContext) {
    const now = new Date();
    const search = query.search?.trim();
    const effectiveDueRange =
      query.effectiveDueBefore || query.effectiveDueAfter
        ? {
            ...(query.effectiveDueBefore
              ? { lte: new Date(query.effectiveDueBefore) }
              : {}),
            ...(query.effectiveDueAfter
              ? { gte: new Date(query.effectiveDueAfter) }
              : {}),
          }
        : undefined;
    const assignmentWhere: Prisma.TaskAssignmentWhereInput = {
      ...(query.assignmentStatus ? { status: query.assignmentStatus } : {}),
      ...(query.assigneeAssignmentId
        ? { assigneeAssignmentId: query.assigneeAssignmentId }
        : {}),
      ...(query.dueBefore
        ? { dueDate: { lte: new Date(query.dueBefore) } }
        : {}),
      ...(query.dueAfter ? { dueDate: { gte: new Date(query.dueAfter) } } : {}),
      ...(query.overdue
        ? {
            dueDate: { lt: now },
            status: { in: [...OPEN_ASSIGNMENT_STATUSES] },
          }
        : {}),
      ...(query.relatedAssignmentId
        ? {
            OR: [
              { assigneeAssignmentId: query.relatedAssignmentId },
              { assignerAssignmentId: query.relatedAssignmentId },
            ],
          }
        : {}),
    };

    const where = this.taskAccessWhere(context, {
      AND: [
        ...(search
          ? [
              {
                OR: [
                  { title: { contains: search, mode: 'insensitive' } },
                  { description: { contains: search, mode: 'insensitive' } },
                  {
                    directiveVersion: {
                      is: {
                        OR: [
                          {
                            commandDescription: {
                              contains: search,
                              mode: 'insensitive',
                            },
                          },
                          {
                            directive: {
                              commandNumber: {
                                contains: search,
                                mode: 'insensitive',
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                  {
                    uukStrVersion: {
                      is: {
                        OR: [
                          { title: { contains: search, mode: 'insensitive' } },
                          {
                            uukStr: {
                              directiveVersion: {
                                directive: {
                                  commandNumber: {
                                    contains: search,
                                    mode: 'insensitive',
                                  },
                                },
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                  {
                    assignments: {
                      some: {
                        OR: [
                          {
                            assignmentNote: {
                              contains: search,
                              mode: 'insensitive',
                            },
                          },
                          {
                            assignee: {
                              userProfile: {
                                fullName: {
                                  contains: search,
                                  mode: 'insensitive',
                                },
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            ]
          : []),
        ...(query.classification
          ? [
              {
                OR: [
                  {
                    directiveVersion: {
                      is: { classification: query.classification },
                    },
                  },
                  {
                    uukStrVersion: {
                      is: {
                        uukStr: {
                          directiveVersion: {
                            classification: query.classification,
                          },
                        },
                      },
                    },
                  },
                ],
              },
            ]
          : []),
        ...(query.sourceUrgency
          ? [
              {
                OR: [
                  {
                    directiveVersion: {
                      is: { urgency: query.sourceUrgency },
                    },
                  },
                  {
                    uukStrVersion: {
                      is: {
                        uukStr: {
                          directiveVersion: { urgency: query.sourceUrgency },
                        },
                      },
                    },
                  },
                ],
              },
            ]
          : []),
        ...(effectiveDueRange
          ? [
              {
                OR: [
                  { directiveVersion: { is: { dueDate: effectiveDueRange } } },
                  {
                    directiveVersion: { is: null },
                    uukStrVersion: {
                      is: {
                        uukStr: {
                          directiveVersion: { dueDate: effectiveDueRange },
                        },
                      },
                    },
                  },
                  {
                    directiveVersion: { is: null },
                    uukStrVersion: { is: null },
                    dueDate: effectiveDueRange,
                  },
                ],
              },
            ]
          : []),
      ] as Prisma.TaskWhereInput[],
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.ownerAssignmentId
        ? { ownerAssignmentId: query.ownerAssignmentId }
        : {}),
      ...(query.parentTaskId ? { parentTaskId: query.parentTaskId } : {}),
      ...(query.directiveId
        ? {
            directiveVersion: {
              directiveId: query.directiveId,
            },
          }
        : {}),
      ...(query.uukStrId
        ? {
            uukStrVersion: {
              uukStrId: query.uukStrId,
            },
          }
        : {}),
      ...(query.areaId
        ? {
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
          }
        : {}),
      ...(query.dueBefore
        ? { dueDate: { lte: new Date(query.dueBefore) } }
        : {}),
      ...(query.dueAfter ? { dueDate: { gte: new Date(query.dueAfter) } } : {}),
      ...(query.overdue
        ? {
            dueDate: { lt: now },
            status: {
              in: [
                TaskStatus.DRAFT,
                TaskStatus.ASSIGNED,
                TaskStatus.IN_PROGRESS,
              ],
            },
          }
        : {}),
      ...(query.assigneeAssignmentId
        ? {
            assignments: {
              some: assignmentWhere,
            },
          }
        : {}),
      ...(query.relatedAssignmentId
        ? {
            assignments: {
              some: assignmentWhere,
            },
          }
        : {}),
    });

    const include = {
      ownerAssignment: true,
      directiveVersion: {
        include: {
          directive: true,
        },
      },
      uukStrVersion: {
        include: {
          uukStr: {
            include: {
              ownerAssignment: true,
              directiveVersion: {
                include: {
                  directive: true,
                },
              },
            },
          },
        },
      },
      targetAreas: { include: { area: true } },
      assignments: {
        where:
          Object.keys(assignmentWhere).length > 0 ? assignmentWhere : undefined,
        include: {
          assigner: {
            include: {
              role: true,
              userProfile: true,
            },
          },
          assignee: {
            include: {
              role: true,
              userProfile: true,
            },
          },
        },
      },
      _count: { select: { assignments: true, childTasks: true } },
    } satisfies Prisma.TaskInclude;
    const sortOrder = query.sortOrder ?? 'asc';

    if (query.sortBy === TaskSortField.EFFECTIVE_DUE_DATE) {
      const tasks = await this.prisma.task.findMany({
        where,
        orderBy: { id: 'asc' },
        include,
      });
      const timestamp = (task: (typeof tasks)[number]) => {
        const value = task.assignments[0]?.dueDate ?? task.dueDate;
        return value ? value.getTime() : null;
      };

      tasks.sort((left, right) => {
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

      const start = (query.page - 1) * query.limit;
      const items = tasks.slice(start, start + query.limit);
      if (!query.paginated) return items;

      const completed = tasks.filter(
        (task) => task.status === TaskStatus.COMPLETED,
      ).length;
      const inProgress = tasks.filter((task) =>
        (
          [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS] as TaskStatus[]
        ).includes(task.status),
      ).length;
      return {
        items,
        pagination: {
          page: query.page,
          limit: query.limit,
          total: tasks.length,
          totalPages: Math.max(1, Math.ceil(tasks.length / query.limit)),
        },
        summary: {
          total: tasks.length,
          completed,
          inProgress,
          completionRate:
            tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
        },
      };
    }

    const orderBy: Prisma.TaskOrderByWithRelationInput[] = query.sortBy
      ? [
          query.sortBy === TaskSortField.UPDATED_AT
            ? { updatedAt: sortOrder }
            : { dueDate: { sort: sortOrder, nulls: 'last' } },
          { id: 'asc' },
        ]
      : [{ dueDate: 'asc' }, { createdAt: 'desc' }];

    if (!query.paginated) {
      return this.prisma.task.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy,
        include,
      });
    }

    const [items, total, statuses] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy,
        include,
      }),
      this.prisma.task.count({ where }),
      this.prisma.task.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
    ]);
    const statusCount = new Map<TaskStatus, number>(
      statuses.map((item) => [item.status, Number(item._count._all)]),
    );
    const completed = statusCount.get(TaskStatus.COMPLETED) ?? 0;
    const inProgress =
      (statusCount.get(TaskStatus.ASSIGNED) ?? 0) +
      (statusCount.get(TaskStatus.IN_PROGRESS) ?? 0);

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
      summary: {
        total,
        completed,
        inProgress,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
    };
  }

  async create(body: CreateTaskDto, context: AuthorizationContext) {
    this.assertBindaCommander(
      context,
      'Hanya Kepala BIN Daerah (Kabinda) yang dapat membuat tugas operasional.',
    );

    if (body.ownerAssignmentId !== context.primaryAssignmentId) {
      throw new ApiException(
        'TASK_OWNER_UNIT_OUT_OF_SCOPE',
        'Tugas hanya dapat dibuat untuk unit organisasi saat ini.',
        403,
      );
    }

    const contextAreaIds = this.areaIds(context);
    const areaWhere = this.areaVisibilityWhere(contextAreaIds);

    if (body.directiveVersionId) {
      const directiveVersion = await this.prisma.directiveVersion.findFirst({
        where: {
          id: body.directiveVersionId,
          OR: [
            {
              directive: {
                deletedAt: null,
                status: { not: DirectiveStatus.CANCELLED },
                ownerAssignmentId: context.primaryAssignmentId,
              },
            },
            {
              directive: {
                deletedAt: null,
                status: { not: DirectiveStatus.CANCELLED },
              },
              recipients: {
                some: this.directiveRecipientWhere(context),
              },
            },
            ...(areaWhere
              ? [
                  {
                    targetAreas: {
                      some: {
                        area: areaWhere,
                      },
                    },
                  },
                ]
              : []),
          ],
        },
      });

      if (!directiveVersion) {
        throw new ApiException(
          'TASK_SOURCE_OUT_OF_SCOPE',
          'Sumber arahan strategis tidak tersedia dalam cakupan wilayah Kepala BIN Daerah (Kabinda) saat ini.',
          403,
        );
      }
    }

    if (body.uukStrVersionId) {
      const uukStrVersion = await this.prisma.uukStrVersion.findFirst({
        where: {
          id: body.uukStrVersionId,
          uukStr: {
            deletedAt: null,
            status: { not: UukStrStatus.CANCELLED },
            OR: [
              { ownerAssignmentId: context.primaryAssignmentId },
              {
                directiveVersion: {
                  recipients: {
                    some: this.directiveRecipientWhere(context),
                  },
                },
              },
              ...(areaWhere
                ? [
                    {
                      directiveVersion: {
                        targetAreas: {
                          some: {
                            area: areaWhere,
                          },
                        },
                      },
                    },
                  ]
                : []),
            ],
          },
        },
        include: {
          uukStr: {
            include: {
              directiveVersion: true,
            },
          },
        },
      });

      if (!uukStrVersion) {
        throw new ApiException(
          'TASK_SOURCE_OUT_OF_SCOPE',
          'STR regional ini belum masuk ke cakupan wilayah Kepala BIN Daerah (Kabinda) saat ini.',
          403,
        );
      }
    }

    const task = await this.prisma.task.create({
      data: {
        parentTaskId: body.parentTaskId,
        directiveVersionId: body.directiveVersionId,
        uukStrVersionId: body.uukStrVersionId,
        ownerAssignmentId: body.ownerAssignmentId,
        createdByAssignmentId: context.primaryAssignmentId,
        title: body.title,
        description: body.description,
        priority: body.priority,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        targetAreas: {
          create: body.targetAreaIds.map((areaId, index) => ({
            areaId,
            isPrimary: index === 0,
          })),
        },
      },
    });

    await this.audit(context, 'TASK.CREATE', task.id);
    return this.taskDetail(task.id, context);
  }

  async child(
    taskId: string,
    body: CreateTaskDto,
    context: AuthorizationContext,
  ) {
    this.assertBindaCommander(
      context,
      'Hanya Kepala BIN Daerah (Kabinda) yang dapat membuat tugas turunan.',
    );

    const parent = await this.taskDetail(taskId, context);

    if (
      parent.dueDate &&
      body.dueDate &&
      new Date(body.dueDate) > parent.dueDate
    ) {
      throw new ApiException(
        'DUE_DATE_EXCEEDS_PARENT',
        'Tenggat tugas turunan tidak boleh melewati tenggat tugas induk.',
        422,
      );
    }

    return this.create(
      {
        ...body,
        parentTaskId: taskId,
        directiveVersionId:
          body.directiveVersionId ?? parent.directiveVersionId ?? undefined,
        uukStrVersionId:
          body.uukStrVersionId ?? parent.uukStrVersionId ?? undefined,
        ownerAssignmentId: parent.ownerAssignmentId,
      },
      context,
    );
  }

  async get(taskId: string, context: AuthorizationContext) {
    return this.taskDetail(taskId, context);
  }

  async update(
    taskId: string,
    body: UpdateTaskDto,
    context: AuthorizationContext,
  ) {
    this.assertBindaCommander(
      context,
      'Hanya Kepala BIN Daerah (Kabinda) yang dapat mengubah draf tugas.',
    );

    const task = await this.taskDetail(taskId, context);

    if (
      task.ownerAssignmentId !== context.primaryAssignmentId &&
      task.createdByAssignmentId !== context.primaryAssignmentId
    ) {
      throw new ApiException(
        'TASK_NOT_MUTABLE',
        'Hanya Kepala BIN Daerah (Kabinda) pemilik yang dapat mengubah tugas ini.',
        403,
      );
    }

    if (task.status !== TaskStatus.DRAFT) {
      throw new ApiException(
        'INVALID_STATE_TRANSITION',
        'Hanya tugas berstatus draf yang dapat diubah.',
        409,
      );
    }

    await this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...body,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      },
    });

    await this.audit(context, 'TASK.UPDATE', taskId);
    return this.taskDetail(taskId, context);
  }

  async targets(
    taskId: string,
    body: TargetAreasDto,
    context: AuthorizationContext,
  ) {
    this.assertBindaCommander(
      context,
      'Hanya Kepala BIN Daerah (Kabinda) yang dapat mengubah wilayah sasaran tugas.',
    );

    const task = await this.taskDetail(taskId, context);

    if (
      task.ownerAssignmentId !== context.primaryAssignmentId &&
      task.createdByAssignmentId !== context.primaryAssignmentId
    ) {
      throw new ApiException(
        'TASK_NOT_MUTABLE',
        'Hanya Kepala BIN Daerah (Kabinda) pemilik yang dapat mengubah tugas ini.',
        403,
      );
    }

    if (task.status !== TaskStatus.DRAFT) {
      throw new ApiException(
        'INVALID_STATE_TRANSITION',
        'Wilayah sasaran hanya dapat diubah saat tugas masih draf.',
        409,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.taskTargetArea.deleteMany({ where: { taskId } });
      await tx.taskTargetArea.createMany({
        data: body.areaIds.map((areaId, index) => ({
          taskId,
          areaId,
          isPrimary: body.primaryAreaId
            ? areaId === body.primaryAreaId
            : index === 0,
        })),
      });
    });

    await this.audit(context, 'TASK.TARGETS.REPLACE', taskId);
    return (await this.taskDetail(taskId, context)).targetAreas;
  }

  async assign(
    taskId: string,
    body: AssignTaskDto,
    context: AuthorizationContext,
  ) {
    const task = await this.taskDetail(taskId, context);

    if (
      task.status === TaskStatus.COMPLETED ||
      task.status === TaskStatus.CANCELLED
    ) {
      throw new ApiException(
        'TASK_NOT_ASSIGNABLE',
        'Tugas yang sudah selesai atau dibatalkan tidak dapat didistribusikan.',
        409,
      );
    }

    let expectedRoleCode: RoleCode;

    if (
      context.roleCode === RoleCode.REGIONAL_COMMANDER &&
      context.commandRouteType === CommandRouteType.BINDA
    ) {
      if (
        task.ownerAssignmentId !== context.primaryAssignmentId &&
        task.createdByAssignmentId !== context.primaryAssignmentId
      ) {
        throw new ApiException(
          'TASK_ASSIGN_OUT_OF_SCOPE',
          'Hanya Kepala BIN Daerah (Kabinda) pemilik yang dapat mendistribusikan tugas ini.',
          403,
        );
      }
      expectedRoleCode = RoleCode.FIELD_COORDINATOR;
    } else if (context.roleCode === RoleCode.FIELD_COORDINATOR) {
      const coordinatorAssignment = task.assignments.find(
        (assignment) =>
          assignment.assigneeAssignmentId === context.primaryAssignmentId &&
          !CLOSED_ASSIGNMENT_STATUSES.some(
            (status) => status === assignment.status,
          ),
      );

      if (!coordinatorAssignment) {
        throw new ApiException(
          'TASK_ASSIGNMENT_NOT_OWNER',
          'Koordinator Wilayah (Korwil) hanya dapat mendistribusikan tugas yang ditetapkan untuk jabatannya.',
          403,
        );
      }

      expectedRoleCode = RoleCode.FIELD_OFFICER;
    } else {
      throw new ApiException(
        'TASK_ROLE_FORBIDDEN',
        'Hanya Kepala BIN Daerah (Kabinda) dan Koordinator Wilayah (Korwil) yang dapat mendistribusikan tugas.',
        403,
      );
    }

    for (const item of body.assignments) {
      if (
        task.dueDate &&
        item.dueDate &&
        new Date(item.dueDate) > task.dueDate
      ) {
        throw new ApiException(
          'DUE_DATE_EXCEEDS_PARENT',
          'Tenggat penugasan tidak boleh melewati tenggat tugas induk.',
          422,
        );
      }

      await this.assertAssignableTarget(
        item.assigneeAssignmentId,
        context,
        expectedRoleCode,
      );
    }

    const rows = await this.prisma.$transaction(async (tx) => {
      const created = await Promise.all(
        body.assignments.map((item) =>
          tx.taskAssignment.create({
            data: {
              taskId,
              assignerAssignmentId: context.primaryAssignmentId,
              assigneeAssignmentId: item.assigneeAssignmentId,
              dueDate: item.dueDate ? new Date(item.dueDate) : task.dueDate,
              assignmentNote: item.assignmentNote,
            },
          }),
        ),
      );

      await tx.task.update({
        where: { id: taskId },
        data: {
          status:
            task.status === TaskStatus.DRAFT
              ? TaskStatus.ASSIGNED
              : task.status,
        },
      });

      return created;
    });

    await this.audit(context, 'TASK.ASSIGN', taskId, {
      assignments: rows.map((row) => row.id),
    });
    return rows;
  }

  async assignments(taskId: string, context: AuthorizationContext) {
    await this.taskDetail(taskId, context);

    return this.prisma.taskAssignment.findMany({
      where: { taskId },
      orderBy: { assignedAt: 'desc' },
      include: {
        assigner: {
          include: {
            role: true,
            userProfile: true,
          },
        },
        assignee: {
          include: {
            role: true,
            userProfile: true,
          },
        },
        progressLogs: {
          orderBy: { createdAt: 'asc' },
        },
        reassignedFrom: true,
        reassignedTo: true,
      },
    });
  }

  async assignment(assignmentId: string, context: AuthorizationContext) {
    return this.assignmentDetail(assignmentId, context);
  }

  async read(assignmentId: string, context: AuthorizationContext) {
    return this.transition(
      assignmentId,
      [TaskAssignmentStatus.SENT],
      TaskAssignmentStatus.READ,
      context,
    );
  }

  async acknowledge(
    assignmentId: string,
    body: NoteDto,
    context: AuthorizationContext,
  ) {
    return this.transition(
      assignmentId,
      [TaskAssignmentStatus.READ],
      TaskAssignmentStatus.ACKNOWLEDGED,
      context,
      body.note,
    );
  }

  async start(
    assignmentId: string,
    body: NoteDto,
    context: AuthorizationContext,
  ) {
    return this.transition(
      assignmentId,
      [TaskAssignmentStatus.ACKNOWLEDGED],
      TaskAssignmentStatus.IN_PROGRESS,
      context,
      body.note,
    );
  }

  async progress(
    assignmentId: string,
    body: ProgressDto,
    context: AuthorizationContext,
  ) {
    return this.transition(
      assignmentId,
      [TaskAssignmentStatus.IN_PROGRESS],
      TaskAssignmentStatus.IN_PROGRESS,
      context,
      body.note,
      body.progressPercent,
    );
  }

  async complete(
    assignmentId: string,
    body: NoteDto,
    context: AuthorizationContext,
  ) {
    return this.transition(
      assignmentId,
      [TaskAssignmentStatus.IN_PROGRESS],
      TaskAssignmentStatus.COMPLETED,
      context,
      body.note,
      100,
    );
  }

  async forwardJaringInstruction(
    assignmentId: string,
    body: ForwardJaringInstructionDto,
    context: AuthorizationContext,
  ) {
    if (context.roleCode !== RoleCode.FIELD_OFFICER) {
      throw new ApiException(
        'TASK_JARING_FORWARD_FORBIDDEN',
        'Hanya Petugas Wilayah (Gaswil) yang dapat meneruskan instruksi lapangan ke Jaring.',
        403,
      );
    }

    const assignment = await this.prisma.taskAssignment.findFirst({
      where: {
        id: assignmentId,
        assigneeAssignmentId: context.primaryAssignmentId,
        status: { notIn: [...CLOSED_ASSIGNMENT_STATUSES] },
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            description: true,
            priority: true,
            dueDate: true,
          },
        },
        assigner: {
          select: {
            id: true,
            userProfile: { select: { fullName: true } },
            role: { select: { name: true } },
          },
        },
      },
    });

    if (!assignment) {
      throw new ApiException(
        'TASK_ASSIGNMENT_NOT_FOUND',
        'Penugasan Petugas Wilayah (Gaswil) tidak ditemukan atau sudah ditutup.',
        404,
      );
    }

    const instruction = body.instruction.trim();
    const targetFilter = body.jaringIds?.length
      ? { id: { in: body.jaringIds } }
      : {};
    const jaring = await this.prisma.jaring.findMany({
      where: {
        ...targetFilter,
        status: JaringStatus.ACTIVE,
        deletedAt: null,
        caretakerAssignments: {
          some: {
            fieldOfficerAssignmentId: context.primaryAssignmentId,
            isActive: true,
            OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
          },
        },
      },
      select: {
        id: true,
        aliasName: true,
        whatsappNumber: true,
      },
      orderBy: [{ aliasName: 'asc' }, { id: 'asc' }],
    });

    if (body.jaringIds?.length && jaring.length !== body.jaringIds.length) {
      throw new ApiException(
        'TASK_JARING_TARGET_OUT_OF_SCOPE',
        'Sebagian target Jaring tidak aktif atau bukan binaan Petugas Wilayah (Gaswil) ini.',
        403,
      );
    }

    if (jaring.length === 0) {
      throw new ApiException(
        'TASK_JARING_TARGET_EMPTY',
        'Tidak ada Jaring aktif untuk menerima instruksi.',
        422,
      );
    }

    const recipients = jaring.map((item) => ({
      id: item.id,
      aliasName: item.aliasName,
      whatsappNumber: item.whatsappNumber,
    }));
    const requestedAt = new Date();

    const [event] = await this.prisma.$transaction([
      this.prisma.outboxEvent.create({
        data: {
          topic: 'JARING_INSTRUCTION.DISPATCH_REQUESTED',
          aggregateType: 'TaskAssignment',
          aggregateId: assignment.id,
          payload: {
            assignmentId: assignment.id,
            taskId: assignment.taskId,
            taskTitle: assignment.task.title,
            taskDescription: assignment.task.description,
            taskPriority: assignment.task.priority,
            taskDueDate: assignment.task.dueDate?.toISOString() ?? null,
            fieldCoordinatorAssignmentId: assignment.assignerAssignmentId,
            fieldCoordinatorName:
              assignment.assigner.userProfile?.fullName ??
              assignment.assigner.role?.name ??
              null,
            fieldOfficerAssignmentId: context.primaryAssignmentId,
            instruction,
            coordinatorInstruction: assignment.assignmentNote,
            recipients,
            requestedAt: requestedAt.toISOString(),
          },
        },
      }),
      this.prisma.taskProgressLog.create({
        data: {
          taskAssignmentId: assignment.id,
          status: assignment.status,
          createdByAssignmentId: context.primaryAssignmentId,
          note: `Instruksi diteruskan ke ${jaring.length} Jaring.`,
        },
      }),
    ]);

    await this.audit(
      context,
      'TASK_ASSIGNMENT.FORWARD_JARING_INSTRUCTION',
      assignment.id,
      {
        outboxEventId: event.id,
        recipientCount: jaring.length,
      },
    );

    return {
      id: event.id,
      assignmentId: assignment.id,
      taskId: assignment.taskId,
      status: event.status,
      instruction,
      recipientCount: jaring.length,
      recipients,
      createdAt: event.createdAt,
    };
  }

  async reassign(
    assignmentId: string,
    body: ReassignDto,
    context: AuthorizationContext,
  ) {
    const old = await this.assignmentDetail(assignmentId, context);

    if (
      old.status === TaskAssignmentStatus.COMPLETED ||
      old.status === TaskAssignmentStatus.CANCELLED ||
      old.status === TaskAssignmentStatus.REASSIGNED
    ) {
      throw new ApiException(
        'INVALID_STATE_TRANSITION',
        'Penugasan tidak dapat dialihkan.',
        409,
      );
    }

    let expectedRoleCode: RoleCode;

    if (
      context.roleCode === RoleCode.REGIONAL_COMMANDER &&
      context.commandRouteType === CommandRouteType.BINDA
    ) {
      if (
        old.task.ownerAssignmentId !== context.primaryAssignmentId &&
        old.task.createdByAssignmentId !== context.primaryAssignmentId
      ) {
        throw new ApiException(
          'TASK_REASSIGN_OUT_OF_SCOPE',
          'Hanya Kepala BIN Daerah (Kabinda) pemilik yang dapat mengalihkan pengiriman Koordinator Wilayah (Korwil).',
          403,
        );
      }
      expectedRoleCode = RoleCode.FIELD_COORDINATOR;
    } else if (context.roleCode === RoleCode.FIELD_COORDINATOR) {
      if (old.assignerAssignmentId !== context.primaryAssignmentId) {
        throw new ApiException(
          'TASK_REASSIGN_OUT_OF_SCOPE',
          'Koordinator Wilayah (Korwil) hanya dapat mengalihkan pengiriman bawahan yang dibuatnya.',
          403,
        );
      }
      expectedRoleCode = RoleCode.FIELD_OFFICER;
    } else {
      throw new ApiException(
        'TASK_ROLE_FORBIDDEN',
        'Hanya Kepala BIN Daerah (Kabinda) dan Koordinator Wilayah (Korwil) yang dapat mengalihkan tugas.',
        403,
      );
    }

    if (
      old.task.dueDate &&
      body.dueDate &&
      new Date(body.dueDate) > old.task.dueDate
    ) {
      throw new ApiException(
        'DUE_DATE_EXCEEDS_PARENT',
        'Tenggat penugasan tidak boleh melewati tenggat tugas induk.',
        422,
      );
    }

    await this.assertAssignableTarget(
      body.assigneeAssignmentId,
      context,
      expectedRoleCode,
    );

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.taskAssignment.update({
        where: { id: assignmentId },
        data: { status: TaskAssignmentStatus.REASSIGNED },
      });

      return tx.taskAssignment.create({
        data: {
          taskId: old.taskId,
          assignerAssignmentId: context.primaryAssignmentId,
          assigneeAssignmentId: body.assigneeAssignmentId,
          reassignedFromId: assignmentId,
          dueDate: body.dueDate ? new Date(body.dueDate) : old.dueDate,
          assignmentNote: body.reason,
        },
      });
    });

    await this.audit(context, 'TASK.REASSIGN', old.taskId, {
      fromAssignmentId: assignmentId,
      toAssignmentId: created.id,
    });

    return created;
  }

  async cancel(taskId: string, body: ReasonDto, context: AuthorizationContext) {
    this.assertBindaCommander(
      context,
      'Hanya Kepala BIN Daerah (Kabinda) yang dapat membatalkan tugas pada tahap ini.',
    );

    const task = await this.taskDetail(taskId, context);

    if (
      task.ownerAssignmentId !== context.primaryAssignmentId &&
      task.createdByAssignmentId !== context.primaryAssignmentId
    ) {
      throw new ApiException(
        'TASK_CANCEL_OUT_OF_SCOPE',
        'Hanya Kepala BIN Daerah (Kabinda) pemilik yang dapat membatalkan tugas ini.',
        403,
      );
    }

    if (
      task.status === TaskStatus.COMPLETED ||
      task.status === TaskStatus.CANCELLED
    ) {
      throw new ApiException(
        'INVALID_STATE_TRANSITION',
        'Task cannot be cancelled.',
        409,
      );
    }

    await this.prisma.$transaction([
      this.prisma.task.update({
        where: { id: taskId },
        data: { status: TaskStatus.CANCELLED },
      }),
      this.prisma.taskAssignment.updateMany({
        where: {
          taskId,
          status: { in: [...OPEN_ASSIGNMENT_STATUSES] },
        },
        data: { status: TaskAssignmentStatus.CANCELLED },
      }),
    ]);

    await this.audit(context, 'TASK.CANCEL', taskId, { reason: body.reason });
    return this.taskDetail(taskId, context);
  }

  async cascade(taskId: string, context: AuthorizationContext) {
    await this.taskDetail(taskId, context);

    return this.prisma.$queryRaw(
      Prisma.sql`WITH RECURSIVE tree AS(SELECT *,0 depth FROM "Task" WHERE "id"=${taskId} UNION ALL SELECT child.*,tree.depth+1 FROM "Task" child JOIN tree ON child."parentTaskId"=tree."id")SELECT * FROM tree ORDER BY depth,"createdAt"`,
    );
  }

  async summary(taskId: string, context: AuthorizationContext) {
    await this.taskDetail(taskId, context);

    const grouped = await this.prisma.taskAssignment.groupBy({
      by: ['status'],
      where: { taskId },
      _count: { _all: true },
    });

    return {
      taskId,
      statuses: Object.fromEntries(
        grouped.map((group) => [group.status, group._count._all]),
      ),
      total: grouped.reduce((count, group) => count + group._count._all, 0),
    };
  }
}
