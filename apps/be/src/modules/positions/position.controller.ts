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
  AssignmentListQueryDto,
  ChangeReportingLineDto,
  CloseAssignmentDto,
  CreatePositionAssignmentDto,
  CreatePositionDto,
  PositionListQueryDto,
  ReasonDto,
  ReplaceAssignmentScopesDto,
  SubordinateQueryDto,
  UpdatePositionDto,
  ValidateAssignmentScopesDto,
} from './dto/position.dto.js';
import { PositionService } from './position.service.js';

@ApiTags('05. Positions & Assignments')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller()
export class PositionController {
  constructor(private readonly positions: PositionService) {}

  @Get('command-network')
  @ApiContract({
    operationId: 'apiPosCommand001',
    contractId: 'API-POS-COMMAND-001',
    summary: 'Personel, organisasi, wilayah, dan Jaring dalam hierarki komando',
    roles: [
      'executive',
      'regional_commander',
      'operational_intelligence_manager',
      'field_coordinator',
    ],
  })
  async commandNetwork(@CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.positions.commandNetwork(context));
  }

  @Get('positions')
  @ApiContract({
    operationId: 'apiPos001',
    contractId: 'API-POS-001',
    summary: 'Daftar seat/jabatan',
    roles: [
      'admin_system',
      'executive',
      'regional_commander',
      'operational_intelligence_manager',
      'field_coordinator',
    ],
  })
  async list(
    @Query() q: PositionListQueryDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    const r = await this.positions.list(q, context);
    return apiResult(r.items, undefined, { pagination: r.pagination });
  }
  @Post('positions')
  @ApiContract({
    operationId: 'apiPos002',
    contractId: 'API-POS-002',
    summary: 'Buat seat/jabatan',
    roles: ['admin_system'],
    successStatus: 201,
    idempotent: true,
  })
  async create(
    @Body() b: CreatePositionDto,
    @CurrentAccessContext() a: AuthorizationContext,
  ) {
    return apiResult(await this.positions.create(b, a));
  }
  @Get('positions/:positionId')
  @ApiContract({
    operationId: 'apiPos003',
    contractId: 'API-POS-003',
    summary: 'Detail position',
    roles: [
      'admin_system',
      'executive',
      'regional_commander',
      'operational_intelligence_manager',
      'field_coordinator',
    ],
  })
  async detail(
    @Param('positionId', ParseUUIDPipe) id: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.positions.detail(id, context));
  }
  @Patch('positions/:positionId')
  @ApiContract({
    operationId: 'apiPos004',
    contractId: 'API-POS-004',
    summary: 'Ubah title/status position',
    roles: ['admin_system'],
  })
  async update(
    @Param('positionId', ParseUUIDPipe) id: string,
    @Body() b: UpdatePositionDto,
    @CurrentAccessContext() a: AuthorizationContext,
  ) {
    return apiResult(await this.positions.update(id, b, a));
  }
  @Post('positions/:positionId/change-reporting-line')
  @ApiContract({
    operationId: 'apiPos005',
    contractId: 'API-POS-005',
    summary: 'Ubah atasan jabatan',
    roles: ['admin_system'],
    idempotent: true,
  })
  async reporting(
    @Param('positionId', ParseUUIDPipe) id: string,
    @Body() b: ChangeReportingLineDto,
    @CurrentAccessContext() a: AuthorizationContext,
  ) {
    return apiResult(
      await this.positions.changeReportingLine(
        id,
        b.reportsToPositionId,
        b.reason,
        a,
      ),
    );
  }
  @Get('positions/:positionId/subordinates')
  @ApiContract({
    operationId: 'apiPos006',
    contractId: 'API-POS-006',
    summary: 'Daftar bawahan langsung/berjenjang',
    roles: [
      'admin_system',
      'executive',
      'regional_commander',
      'operational_intelligence_manager',
      'field_coordinator',
    ],
  })
  async subordinates(
    @Param('positionId', ParseUUIDPipe) id: string,
    @Query() q: SubordinateQueryDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.positions.subordinates(id, q.recursive, q.depth, context),
    );
  }
  @Get('positions/:positionId/reporting-chain')
  @ApiContract({
    operationId: 'apiPos007',
    contractId: 'API-POS-007',
    summary: 'Rantai komando position',
    roles: [
      'admin_system',
      'executive',
      'regional_commander',
      'operational_intelligence_manager',
      'field_coordinator',
    ],
  })
  async chain(@Param('positionId', ParseUUIDPipe) id: string) {
    return apiResult(await this.positions.reportingChain(id));
  }
  @Get('position-assignments')
  @ApiContract({
    operationId: 'apiAsg001',
    contractId: 'API-ASG-001',
    summary: 'Daftar assignment',
    roles: [
      'admin_system',
      'executive',
      'regional_commander',
      'operational_intelligence_manager',
      'field_coordinator',
      'field_officer',
    ],
  })
  async assignments(
    @Query() q: AssignmentListQueryDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    const r = await this.positions.assignments(q, context);
    return apiResult(r.items, undefined, { pagination: r.pagination });
  }
  @Post('position-assignments')
  @ApiContract({
    operationId: 'apiAsg002',
    contractId: 'API-ASG-002',
    summary: 'Buat assignment non-mutasi',
    roles: ['admin_system'],
    successStatus: 201,
    idempotent: true,
  })
  async createAssignment(
    @Body() b: CreatePositionAssignmentDto,
    @CurrentAccessContext() a: AuthorizationContext,
  ) {
    return apiResult(await this.positions.createAssignment(b, a));
  }
  @Get('position-assignments/:assignmentId')
  @ApiContract({
    operationId: 'apiAsg003',
    contractId: 'API-ASG-003',
    summary: 'Detail assignment',
    roles: [
      'admin_system',
      'executive',
      'regional_commander',
      'operational_intelligence_manager',
      'field_coordinator',
      'field_officer',
    ],
  })
  async assignment(
    @Param('assignmentId', ParseUUIDPipe) id: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.positions.assignment(id, context));
  }
  @Post('position-assignments/:assignmentId/close')
  @ApiContract({
    operationId: 'apiAsg004',
    contractId: 'API-ASG-004',
    summary: 'Tutup assignment',
    roles: ['admin_system'],
    idempotent: true,
  })
  async close(
    @Param('assignmentId', ParseUUIDPipe) id: string,
    @Body() b: CloseAssignmentDto,
    @CurrentAccessContext() a: AuthorizationContext,
  ) {
    return apiResult(
      await this.positions.closeAssignment(
        id,
        new Date(b.validUntil),
        b.reason,
        a,
      ),
    );
  }
  @Post('position-assignments/:assignmentId/set-primary')
  @ApiContract({
    operationId: 'apiAsg005',
    contractId: 'API-ASG-005',
    summary: 'Jadikan assignment utama',
    roles: ['admin_system'],
    idempotent: true,
  })
  async primary(
    @Param('assignmentId', ParseUUIDPipe) id: string,
    @Body() b: ReasonDto,
    @CurrentAccessContext() a: AuthorizationContext,
  ) {
    return apiResult(await this.positions.setPrimary(id, b.reason, a));
  }
  @Get('position-assignments/:assignmentId/area-scopes')
  @ApiContract({
    operationId: 'apiAsg006',
    contractId: 'API-ASG-006',
    summary: 'Ambil cakupan wilayah assignment',
    roles: ['admin_system'],
  })
  async scopes(@Param('assignmentId', ParseUUIDPipe) id: string) {
    return apiResult(await this.positions.scopes(id));
  }
  @Put('position-assignments/:assignmentId/area-scopes')
  @ApiContract({
    operationId: 'apiAsg007',
    contractId: 'API-ASG-007',
    summary: 'Ganti cakupan wilayah assignment',
    roles: ['admin_system'],
    idempotent: true,
  })
  async replaceScopes(
    @Param('assignmentId', ParseUUIDPipe) id: string,
    @Body() b: ReplaceAssignmentScopesDto,
    @CurrentAccessContext() a: AuthorizationContext,
  ) {
    return apiResult(await this.positions.replaceScopes(id, b, a));
  }
  @Post('position-assignments/:assignmentId/area-scopes/validate')
  @ApiContract({
    operationId: 'apiAsg008',
    contractId: 'API-ASG-008',
    summary: 'Preview validasi cakupan wilayah',
    roles: ['admin_system'],
  })
  async validateScopes(
    @Param('assignmentId', ParseUUIDPipe) id: string,
    @Body() b: ValidateAssignmentScopesDto,
  ) {
    return apiResult(await this.positions.validateScopes(id, b.areaIds));
  }
}
