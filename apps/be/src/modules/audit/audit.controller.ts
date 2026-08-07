import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Prisma } from '../../generated/prisma/client.js';
import { apiResult } from '../../common/api/api-response.js';
import { ApiContract } from '../../common/decorators/api-contract.decorator.js';
import { CurrentAccessContext } from '../../common/decorators/current-access-context.decorator.js';
import { DomainAccessGuard } from '../../common/guards/domain-access.guard.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AsyncJobService } from '../runtime/async-job.service.js';
import {
  AuditExportDto,
  AuditQueryDto,
  AuditTrailQueryDto,
} from './audit.dto.js';
import { AuditService } from './audit.service.js';

@ApiTags('24. Audit & Compliance')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller()
export class AuditController {
  constructor(
    private readonly audit: AuditService,
    private readonly prisma: PrismaService,
    private readonly jobs: AsyncJobService,
  ) {}

  @Get('audit-logs')
  @ApiContract({
    operationId: 'apiAud001',
    contractId: 'API-AUD-001',
    summary: 'Panel pencarian dan ringkasan audit forensik',
    roles: ['admin_system'],
  })
  async list(@Query() query: AuditQueryDto) {
    return apiResult(await this.audit.list(query));
  }

  @Get('audit-logs/:auditLogId')
  @ApiContract({
    operationId: 'apiAud002',
    contractId: 'API-AUD-002',
    summary: 'Detail audit event forensik',
    roles: ['admin_system'],
  })
  async detail(@Param('auditLogId', ParseUUIDPipe) id: string) {
    return apiResult(await this.audit.detail(id));
  }

  @Get('entities/:entityType/:entityId/audit-trail')
  @ApiContract({
    operationId: 'apiAud003',
    contractId: 'API-AUD-003',
    summary: 'Audit trail resource',
    roles: ['admin_system'],
  })
  async trail(
    @Param('entityType') type: string,
    @Param('entityId') id: string,
    @Query() query: AuditTrailQueryDto,
  ) {
    return apiResult(await this.audit.trail(type, id, query.limit));
  }

  @Post('audit-exports')
  @ApiContract({
    operationId: 'apiAud004',
    contractId: 'API-AUD-004',
    summary: 'Minta export audit',
    roles: ['admin_system'],
    successStatus: 202,
    idempotent: true,
  })
  async export(
    @Body() body: AuditExportDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    const job = await this.jobs.enqueue({
      type: 'AUDIT_EXPORT',
      payload: {
        filters: body.filters ?? {},
        format: body.format,
        reason: body.reason,
      } as Prisma.InputJsonValue,
      requestedById: context.primaryAssignmentId,
    });
    await this.prisma.auditLog.create({
      data: {
        actorUserProfileId: context.userProfileId,
        actorAssignmentId: context.primaryAssignmentId,
        action: 'AUDIT.EXPORT.REQUEST',
        category: 'DATA_ACCESS',
        severity: 'MEDIUM',
        entityType: 'AsyncJob',
        entityId: job.id,
        metadata: { format: body.format, reason: body.reason },
      },
    });
    return apiResult(job);
  }
}
