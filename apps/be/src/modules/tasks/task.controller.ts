import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { apiResult } from '../../common/api/api-response.js';
import { ApiContract } from '../../common/decorators/api-contract.decorator.js';
import { CurrentAccessContext } from '../../common/decorators/current-access-context.decorator.js';
import { DomainAccessGuard } from '../../common/guards/domain-access.guard.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import {
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
import { TaskService } from './task.service.js';

@ApiTags('10. Tasks & Execution Cascade')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller()
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get('tasks')
  @ApiContract({
    operationId: 'apiTask001',
    contractId: 'API-TASK-001',
    summary: 'Daftar tugas',
    roles: ['executive', 'regional_commander', 'operational_intelligence_manager', 'field_coordinator', 'field_officer'],
  })
  async list(
    @Query() query: TaskQuery,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.taskService.list(query, context));
  }

  @Post('tasks')
  @ApiContract({
    operationId: 'apiTask002',
    contractId: 'API-TASK-002',
    summary: 'Buat tugas',
    roles: ['regional_commander', 'operational_intelligence_manager', 'field_coordinator'],
    successStatus: 201,
    idempotent: true,
  })
  async create(
    @Body() body: CreateTaskDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.taskService.create(body, context));
  }

  @Post('tasks/:taskId/child-tasks')
  @ApiContract({
    operationId: 'apiTask003',
    contractId: 'API-TASK-003',
    summary: 'Buat child task',
    roles: ['regional_commander', 'operational_intelligence_manager', 'field_coordinator'],
    successStatus: 201,
    idempotent: true,
  })
  async child(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() body: CreateTaskDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.taskService.child(taskId, body, context));
  }

  @Get('tasks/:taskId')
  @ApiContract({
    operationId: 'apiTask004',
    contractId: 'API-TASK-004',
    summary: 'Detail tugas',
    roles: ['executive', 'regional_commander', 'operational_intelligence_manager', 'field_coordinator', 'field_officer'],
  })
  async get(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.taskService.get(taskId, context));
  }

  @Patch('tasks/:taskId')
  @ApiContract({
    operationId: 'apiTask005',
    contractId: 'API-TASK-005',
    summary: 'Ubah draft tugas',
    roles: ['regional_commander', 'operational_intelligence_manager', 'field_coordinator'],
  })
  async update(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() body: UpdateTaskDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.taskService.update(taskId, body, context));
  }

  @Put('tasks/:taskId/target-areas')
  @ApiContract({
    operationId: 'apiTask006',
    contractId: 'API-TASK-006',
    summary: 'Ganti target area tugas',
    roles: ['regional_commander', 'operational_intelligence_manager', 'field_coordinator'],
    idempotent: true,
  })
  async targets(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() body: TargetAreasDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.taskService.targets(taskId, body, context));
  }

  @Post('tasks/:taskId/assignments')
  @ApiContract({
    operationId: 'apiTask007',
    contractId: 'API-TASK-007',
    summary: 'Assign tugas',
    roles: ['regional_commander', 'operational_intelligence_manager', 'field_coordinator'],
    successStatus: 201,
    idempotent: true,
  })
  async assign(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() body: AssignTaskDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.taskService.assign(taskId, body, context));
  }

  @Get('tasks/:taskId/assignments')
  @ApiContract({
    operationId: 'apiTask008',
    contractId: 'API-TASK-008',
    summary: 'Daftar assignment tugas',
    roles: ['executive', 'regional_commander', 'operational_intelligence_manager', 'field_coordinator', 'field_officer'],
  })
  async assignments(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.taskService.assignments(taskId, context));
  }

  @Get('task-assignments/:assignmentId')
  @ApiContract({
    operationId: 'apiTask009',
    contractId: 'API-TASK-009',
    summary: 'Detail task assignment',
    roles: ['executive', 'regional_commander', 'operational_intelligence_manager', 'field_coordinator', 'field_officer'],
  })
  async assignment(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.taskService.assignment(assignmentId, context));
  }

  @Post('task-assignments/:assignmentId/mark-read')
  @ApiContract({
    operationId: 'apiTask010',
    contractId: 'API-TASK-010',
    summary: 'Tandai tugas dibaca',
    roles: ['regional_commander', 'field_coordinator', 'field_officer'],
    idempotent: true,
  })
  async read(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.taskService.read(assignmentId, context));
  }

  @Post('task-assignments/:assignmentId/acknowledge')
  @ApiContract({
    operationId: 'apiTask011',
    contractId: 'API-TASK-011',
    summary: 'Acknowledge tugas',
    roles: ['regional_commander', 'field_coordinator', 'field_officer'],
    idempotent: true,
  })
  async acknowledge(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() body: NoteDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.taskService.acknowledge(assignmentId, body, context),
    );
  }

  @Post('task-assignments/:assignmentId/start')
  @ApiContract({
    operationId: 'apiTask012',
    contractId: 'API-TASK-012',
    summary: 'Mulai tugas',
    roles: ['regional_commander', 'field_coordinator', 'field_officer'],
    idempotent: true,
  })
  async start(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() body: NoteDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.taskService.start(assignmentId, body, context));
  }

  @Post('task-assignments/:assignmentId/progress')
  @ApiContract({
    operationId: 'apiTask013',
    contractId: 'API-TASK-013',
    summary: 'Update progres tugas',
    roles: ['regional_commander', 'field_coordinator', 'field_officer'],
    idempotent: true,
  })
  async progress(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() body: ProgressDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.taskService.progress(assignmentId, body, context),
    );
  }

  @Post('task-assignments/:assignmentId/complete')
  @ApiContract({
    operationId: 'apiTask014',
    contractId: 'API-TASK-014',
    summary: 'Selesaikan tugas',
    roles: ['regional_commander', 'field_coordinator', 'field_officer'],
    idempotent: true,
  })
  async complete(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() body: NoteDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.taskService.complete(assignmentId, body, context),
    );
  }

  @Post('task-assignments/:assignmentId/reassign')
  @ApiContract({
    operationId: 'apiTask015',
    contractId: 'API-TASK-015',
    summary: 'Alihkan assignment',
    roles: ['regional_commander', 'field_coordinator'],
    successStatus: 201,
    idempotent: true,
  })
  async reassign(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() body: ReassignDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.taskService.reassign(assignmentId, body, context),
    );
  }

  @Post('tasks/:taskId/cancel')
  @ApiContract({
    operationId: 'apiTask016',
    contractId: 'API-TASK-016',
    summary: 'Batalkan tugas',
    roles: ['regional_commander', 'operational_intelligence_manager', 'field_coordinator'],
    idempotent: true,
  })
  async cancel(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() body: ReasonDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.taskService.cancel(taskId, body, context));
  }

  @Get('tasks/:taskId/cascade')
  @ApiContract({
    operationId: 'apiTask017',
    contractId: 'API-TASK-017',
    summary: 'Hierarki cascade tugas',
    roles: ['executive', 'regional_commander', 'operational_intelligence_manager', 'field_coordinator', 'field_officer'],
  })
  async cascade(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.taskService.cascade(taskId, context));
  }

  @Get('tasks/:taskId/progress-summary')
  @ApiContract({
    operationId: 'apiTask018',
    contractId: 'API-TASK-018',
    summary: 'Ringkasan progres tugas',
    roles: ['executive', 'regional_commander', 'operational_intelligence_manager', 'field_coordinator', 'field_officer'],
  })
  async summary(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.taskService.summary(taskId, context));
  }
}
