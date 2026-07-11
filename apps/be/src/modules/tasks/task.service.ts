import { Injectable } from '@nestjs/common';
import {
  Prisma,
  TaskAssignmentStatus,
  TaskStatus,
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

@Injectable()
export class TaskService {
  constructor(private readonly prisma: PrismaService) {}

  private detail(id: string) {
    return this.prisma.task.findFirstOrThrow({
      where: { id, deletedAt: null },
      include: {
        ownerUnit: true,
        targetAreas: { include: { area: true } },
        assignments: {
          include: {
            assignee: { include: { userProfile: true, position: true } },
            progressLogs: true,
          },
        },
        childTasks: true,
      },
    });
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
    const assignment = await this.prisma.taskAssignment.findUniqueOrThrow({
      where: { id },
    });
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
        ? { startedAt: now }
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
      if (
        status === TaskAssignmentStatus.COMPLETED &&
        (await tx.taskAssignment.count({
          where: {
            taskId: assignment.taskId,
            status: { not: TaskAssignmentStatus.COMPLETED },
          },
        })) === 0
      ) {
        await tx.task.update({
          where: { id: assignment.taskId },
          data: { status: TaskStatus.COMPLETED },
        });
      }
      return result;
    });
    await this.audit(context, `TASK.${status}`, assignment.taskId);
    return updated;
  }

  async list(query: TaskQuery) {
    return this.prisma.task.findMany({
      where: {
        deletedAt: null,
        ...(query.status ? { status: query.status } : {}),
        ...(query.ownerUnitId ? { ownerUnitId: query.ownerUnitId } : {}),
        ...(query.areaId
          ? {
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
            }
          : {}),
      },
      take: query.limit,
      orderBy: { createdAt: 'desc' },
      include: {
        targetAreas: { include: { area: true } },
        _count: { select: { assignments: true, childTasks: true } },
      },
    });
  }

  async create(body: CreateTaskDto, context: AuthorizationContext) {
    const task = await this.prisma.$transaction(async (tx) =>
      tx.task.create({
        data: {
          parentTaskId: body.parentTaskId,
          directiveVersionId: body.directiveVersionId,
          uukStrVersionId: body.uukStrVersionId,
          ownerUnitId: body.ownerUnitId,
          createdByAssignmentId: context.primaryAssignmentId,
          title: body.title,
          description: body.description,
          classification: body.classification,
          priority: body.priority,
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          targetAreas: {
            create: body.targetAreaIds.map((areaId, index) => ({
              areaId,
              isPrimary: index === 0,
            })),
          },
        },
      }),
    );
    await this.audit(context, 'TASK.CREATE', task.id);
    return this.detail(task.id);
  }

  async child(
    taskId: string,
    body: CreateTaskDto,
    context: AuthorizationContext,
  ) {
    const parent = await this.prisma.task.findUniqueOrThrow({
      where: { id: taskId },
    });
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
    return this.create({ ...body, parentTaskId: taskId }, context);
  }

  async get(taskId: string) {
    return this.detail(taskId);
  }

  async update(
    taskId: string,
    body: UpdateTaskDto,
    context: AuthorizationContext,
  ) {
    const task = await this.prisma.task.findUniqueOrThrow({
      where: { id: taskId },
    });
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
    return this.detail(taskId);
  }

  async targets(
    taskId: string,
    body: TargetAreasDto,
    context: AuthorizationContext,
  ) {
    const task = await this.prisma.task.findUniqueOrThrow({
      where: { id: taskId },
    });
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
    return (await this.detail(taskId)).targetAreas;
  }

  async assign(
    taskId: string,
    body: AssignTaskDto,
    context: AuthorizationContext,
  ) {
    const task = await this.prisma.task.findUniqueOrThrow({
      where: { id: taskId },
    });
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
        data: { status: TaskStatus.ASSIGNED },
      });
      return created;
    });
    await this.audit(context, 'TASK.ASSIGN', taskId);
    return rows;
  }

  async assignments(taskId: string) {
    return this.prisma.taskAssignment.findMany({
      where: { taskId },
      include: {
        assigner: { include: { position: true } },
        assignee: { include: { position: true, userProfile: true } },
        progressLogs: true,
      },
    });
  }

  async assignment(assignmentId: string) {
    return this.prisma.taskAssignment.findUniqueOrThrow({
      where: { id: assignmentId },
      include: {
        task: { include: { targetAreas: { include: { area: true } } } },
        progressLogs: true,
        assigner: { include: { position: true } },
        assignee: { include: { position: true } },
      },
    });
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
    const old = await this.prisma.taskAssignment.findUniqueOrThrow({
      where: { id: assignmentId },
    });
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
    return this.prisma.$transaction(async (tx) => {
      await tx.taskAssignment.update({
        where: { id: assignmentId },
        data: { status: TaskAssignmentStatus.REASSIGNED },
      });
      const created = await tx.taskAssignment.create({
        data: {
          taskId: old.taskId,
          assignerAssignmentId: context.primaryAssignmentId,
          assigneeAssignmentId: body.assigneeAssignmentId,
          reassignedFromId: assignmentId,
          dueDate: body.dueDate ? new Date(body.dueDate) : old.dueDate,
          assignmentNote: body.reason,
        },
      });
      return created;
    });
  }

  async cancel(taskId: string, body: ReasonDto, context: AuthorizationContext) {
    const task = await this.prisma.task.findUniqueOrThrow({
      where: { id: taskId },
    });
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
          status: {
            notIn: [
              TaskAssignmentStatus.COMPLETED,
              TaskAssignmentStatus.REASSIGNED,
            ],
          },
        },
        data: { status: TaskAssignmentStatus.CANCELLED },
      }),
    ]);
    await this.audit(context, 'TASK.CANCEL', taskId, { reason: body.reason });
    return this.detail(taskId);
  }

  async cascade(taskId: string) {
    return this.prisma.$queryRaw(
      Prisma.sql`WITH RECURSIVE tree AS(SELECT *,0 depth FROM "Task" WHERE "id"=${taskId} UNION ALL SELECT child.*,tree.depth+1 FROM "Task" child JOIN tree ON child."parentTaskId"=tree."id")SELECT * FROM tree ORDER BY depth,"createdAt"`,
    );
  }

  async summary(taskId: string) {
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
