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
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
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
class AuditQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 50;
  @IsOptional() @IsUUID() actorUserProfileId?: string;
  @IsOptional() @IsUUID() actorAssignmentId?: string;
  @IsOptional() @IsString() @MaxLength(120) action?: string;
  @IsOptional() @IsString() @MaxLength(120) entityType?: string;
  @IsOptional() @IsString() @MaxLength(120) entityId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsString() @MaxLength(64) ipAddress?: string;
}
class AuditExportDto {
  @IsOptional() filters?: Record<string, unknown>;
  @IsIn(['CSV', 'JSON']) format!: 'CSV' | 'JSON';
  @IsString() @MinLength(2) @MaxLength(1000) reason!: string;
}
@ApiTags('24. Audit & Compliance')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller()
export class AuditController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: AsyncJobService,
  ) {}
  @Get('audit-logs')
  @ApiContract({
    operationId: 'apiAud001',
    contractId: 'API-AUD-001',
    summary: 'Cari audit log',
    roles: ['admin_system'],
  })
  async list(@Query() q: AuditQuery) {
    return apiResult(
      await this.prisma.auditLog.findMany({
        where: {
          ...(q.actorUserProfileId
            ? { actorUserProfileId: q.actorUserProfileId }
            : {}),
          ...(q.actorAssignmentId
            ? { actorAssignmentId: q.actorAssignmentId }
            : {}),
          ...(q.action ? { action: { contains: q.action } } : {}),
          ...(q.entityType ? { entityType: q.entityType } : {}),
          ...(q.entityId ? { entityId: q.entityId } : {}),
          ...(q.ipAddress ? { ipAddress: q.ipAddress } : {}),
          ...(q.from || q.to
            ? {
                createdAt: {
                  ...(q.from ? { gte: new Date(q.from) } : {}),
                  ...(q.to ? { lte: new Date(q.to) } : {}),
                },
              }
            : {}),
        },
        take: q.limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          actorUser: { select: { id: true, username: true, fullName: true } },
          actorAssignment: {
            select: {
              id: true,
              branch: true,
              role: { select: { id: true, code: true, name: true } },
              areaScopes: {
                where: { validUntil: null },
                orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
                select: {
                  isPrimary: true,
                  area: { select: { id: true, code: true, name: true, level: true } },
                },
              },
            },
          },
        },
      }),
    );
  }
  @Get('audit-logs/:auditLogId')
  @ApiContract({
    operationId: 'apiAud002',
    contractId: 'API-AUD-002',
    summary: 'Detail audit event',
    roles: ['admin_system'],
  })
  async detail(@Param('auditLogId', ParseUUIDPipe) id: string) {
    return apiResult(
      await this.prisma.auditLog.findUniqueOrThrow({
        where: { id },
        include: {
          actorUser: true,
          actorAssignment: { include: { role: true } },
        },
      }),
    );
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
    @Query() q: AuditQuery,
  ) {
    return apiResult(
      await this.prisma.auditLog.findMany({
        where: { entityType: type, entityId: id },
        take: q.limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
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
    @Body() b: AuditExportDto,
    @CurrentAccessContext() a: AuthorizationContext,
  ) {
    const job = await this.jobs.enqueue({
      type: 'AUDIT_EXPORT',
      payload: {
        filters: b.filters ?? {},
        format: b.format,
        reason: b.reason,
      } as Prisma.InputJsonValue,
      requestedById: a.primaryAssignmentId,
    });
    await this.prisma.auditLog.create({
      data: {
        actorUserProfileId: a.userProfileId,
        actorAssignmentId: a.primaryAssignmentId,
        action: 'AUDIT.EXPORT.REQUEST',
        entityType: 'AsyncJob',
        entityId: job.id,
        metadata: { format: b.format, reason: b.reason },
      },
    });
    return apiResult(job);
  }
}
