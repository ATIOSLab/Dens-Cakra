import { Injectable } from '@nestjs/common';
import {
  DirectiveStatus,
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
  NoteDto,
  ProgressDto,
  ReasonDto,
  ReassignDto,
  TargetAreasDto,
  TaskQuery,
  UpdateTaskDto,
} from './task.dto.js';

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
        { targetPositionId: context.positionId },
        { targetUnitId: context.organizationUnitId },
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
      { ownerUnitId: context.organizationUnitId },
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
            ownerUnitId: context.organizationUnitId,
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
      ownerUnit: true,
      createdByAssignment: {
        include: { userProfile: true, position: true },
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
              targetUnit: true,
              targetPosition: true,
            },
          },
        },
      },
      uukStrVersion: {
        include: {
          uukStr: {
            include: {
              ownerUnit: true,
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
              position: true,
              areaScopes: {
                where: { validUntil: null },
                include: { area: true },
              },
            },
          },
          assignee: {
            include: {
              userProfile: true,
              position: true,
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
          ownerUnit: true,
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
          position: { include: { role: true, organizationUnit: true } },
          userProfile: true,
        },
      },
      assignee: {
        include: {
          position: { include: { role: true, organizationUnit: true } },
          userProfile: true,
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
    return this.prisma.userSeatAssignment.findFirstOrThrow({
      where: {
        id: assignmentId,
        isActive: true,
        validUntil: null,
        userProfile: {
          deletedAt: null,
          isActive: true,
        },
        position: {
          isActive: true,
        },
      },
      include: {
        userProfile: true,
        position: {
          include: {
            role: true,
            organizationUnit: true,
          },
        },
        areaScopes: {
          where: { validUntil: null },
          include: { area: true },
        },
      },
    });
  }

  private async isPositionDescendantOf(
    descendantPositionId: string,
    ancestorPositionId: string,
  ) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        WITH RECURSIVE chain AS (
          SELECT "id", "reportsToPositionId"
          FROM "Position"
          WHERE "id" = ${descendantPositionId}
          UNION ALL
          SELECT parent."id", parent."reportsToPositionId"
          FROM "Position" parent
          JOIN chain ON parent."id" = chain."reportsToPositionId"
        )
        SELECT "id"
        FROM chain
        WHERE "id" = ${ancestorPositionId}
        LIMIT 1
      `,
    );

    return rows.length > 0;
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

  private async assertAssignableTarget(
    assigneeAssignmentId: string,
    context: AuthorizationContext,
    expectedRoleCode: RoleCode,
  ) {
    const assignee = await this.loadAssignmentTarget(assigneeAssignmentId);

    if (assignee.position.role.code !== expectedRoleCode) {
      throw new ApiException(
        'TASK_INVALID_ASSIGNEE_ROLE',
        `Assignment target must have role ${expectedRoleCode}.`,
        422,
      );
    }

    const isDescendant = await this.isPositionDescendantOf(
      assignee.positionId,
      context.positionId,
    );

    if (!isDescendant || assignee.positionId === context.positionId) {
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
    const assignmentWhere: Prisma.TaskAssignmentWhereInput = {
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
    };

    const where = this.taskAccessWhere(context, {
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.ownerUnitId ? { ownerUnitId: query.ownerUnitId } : {}),
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
    });

    return this.prisma.task.findMany({
      where,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        ownerUnit: true,
        directiveVersion: {
          include: {
            directive: true,
          },
        },
        uukStrVersion: {
          include: {
            uukStr: {
              include: {
                ownerUnit: true,
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
            Object.keys(assignmentWhere).length > 0
              ? assignmentWhere
              : undefined,
          include: {
            assigner: {
              include: {
                position: true,
                userProfile: true,
              },
            },
            assignee: {
              include: {
                position: true,
                userProfile: true,
              },
            },
          },
        },
        _count: { select: { assignments: true, childTasks: true } },
      },
    });
  }

  async create(body: CreateTaskDto, context: AuthorizationContext) {
    this.assertRole(
      context,
      [RoleCode.OPERATIONAL_INTELLIGENCE_MANAGER],
      'Only OIM can create operational tasks.',
    );

    if (body.ownerUnitId !== context.organizationUnitId) {
      throw new ApiException(
        'TASK_OWNER_UNIT_OUT_OF_SCOPE',
        'Tasks can only be created for the current organization unit.',
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
                ownerUnitId: context.organizationUnitId,
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
          'Directive source is not available for the current OIM area scope.',
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
              { ownerUnitId: context.organizationUnitId },
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
          'STR regional ini belum masuk ke cakupan wilayah OIM saat ini.',
          403,
        );
      }
    }

    const task = await this.prisma.task.create({
      data: {
        parentTaskId: body.parentTaskId,
        directiveVersionId: body.directiveVersionId,
        uukStrVersionId: body.uukStrVersionId,
        ownerUnitId: body.ownerUnitId,
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
    this.assertRole(
      context,
      [RoleCode.OPERATIONAL_INTELLIGENCE_MANAGER],
      'Only OIM can create child tasks.',
    );

    const parent = await this.taskDetail(taskId, context);

    if (
      parent.dueDate &&
      body.dueDate &&
      new Date(body.dueDate) > parent.dueDate
    ) {
      throw new ApiException(
        'DUE_DATE_EXCEEDS_PARENT',
        'Child due date cannot exceed parent.',
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
        ownerUnitId: parent.ownerUnitId,
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
    this.assertRole(
      context,
      [RoleCode.OPERATIONAL_INTELLIGENCE_MANAGER],
      'Only OIM can edit task drafts.',
    );

    const task = await this.taskDetail(taskId, context);

    if (
      task.ownerUnitId !== context.organizationUnitId &&
      task.createdByAssignmentId !== context.primaryAssignmentId
    ) {
      throw new ApiException(
        'TASK_NOT_MUTABLE',
        'Only the owning OIM chain can edit this task.',
        403,
      );
    }

    if (task.status !== TaskStatus.DRAFT) {
      throw new ApiException(
        'INVALID_STATE_TRANSITION',
        'Only draft tasks can be edited.',
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
    this.assertRole(
      context,
      [RoleCode.OPERATIONAL_INTELLIGENCE_MANAGER],
      'Only OIM can edit task target areas.',
    );

    const task = await this.taskDetail(taskId, context);

    if (
      task.ownerUnitId !== context.organizationUnitId &&
      task.createdByAssignmentId !== context.primaryAssignmentId
    ) {
      throw new ApiException(
        'TASK_NOT_MUTABLE',
        'Only the owning OIM chain can edit this task.',
        403,
      );
    }

    if (task.status !== TaskStatus.DRAFT) {
      throw new ApiException(
        'INVALID_STATE_TRANSITION',
        'Targets can only change while draft.',
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
        'Completed or cancelled tasks cannot be assigned.',
        409,
      );
    }

    let expectedRoleCode: RoleCode;

    if (context.roleCode === RoleCode.OPERATIONAL_INTELLIGENCE_MANAGER) {
      if (
        task.ownerUnitId !== context.organizationUnitId &&
        task.createdByAssignmentId !== context.primaryAssignmentId
      ) {
        throw new ApiException(
          'TASK_ASSIGN_OUT_OF_SCOPE',
          'Only the owning OIM chain can distribute this task.',
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
          'Field Coordinator can only distribute tasks assigned to their seat.',
          403,
        );
      }

      expectedRoleCode = RoleCode.FIELD_OFFICER;
    } else {
      throw new ApiException(
        'TASK_ROLE_FORBIDDEN',
        'Only OIM and Field Coordinator can distribute tasks.',
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
          'Assignment due date cannot exceed task.',
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
            position: { include: { role: true, organizationUnit: true } },
            userProfile: true,
          },
        },
        assignee: {
          include: {
            position: { include: { role: true, organizationUnit: true } },
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
        'Assignment cannot be reassigned.',
        409,
      );
    }

    let expectedRoleCode: RoleCode;

    if (context.roleCode === RoleCode.OPERATIONAL_INTELLIGENCE_MANAGER) {
      if (
        old.task.ownerUnitId !== context.organizationUnitId &&
        old.task.createdByAssignmentId !== context.primaryAssignmentId
      ) {
        throw new ApiException(
          'TASK_REASSIGN_OUT_OF_SCOPE',
          'Only the owning OIM chain can reassign Field Coordinator delivery.',
          403,
        );
      }
      expectedRoleCode = RoleCode.FIELD_COORDINATOR;
    } else if (context.roleCode === RoleCode.FIELD_COORDINATOR) {
      if (old.assignerAssignmentId !== context.primaryAssignmentId) {
        throw new ApiException(
          'TASK_REASSIGN_OUT_OF_SCOPE',
          'Field Coordinator can only reassign subordinate delivery they created.',
          403,
        );
      }
      expectedRoleCode = RoleCode.FIELD_OFFICER;
    } else {
      throw new ApiException(
        'TASK_ROLE_FORBIDDEN',
        'Only OIM and Field Coordinator can reassign tasks.',
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
        'Assignment due date cannot exceed task.',
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
    this.assertRole(
      context,
      [RoleCode.OPERATIONAL_INTELLIGENCE_MANAGER],
      'Only OIM can cancel tasks in this phase.',
    );

    const task = await this.taskDetail(taskId, context);

    if (
      task.ownerUnitId !== context.organizationUnitId &&
      task.createdByAssignmentId !== context.primaryAssignmentId
    ) {
      throw new ApiException(
        'TASK_CANCEL_OUT_OF_SCOPE',
        'Only the owning OIM chain can cancel this task.',
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
