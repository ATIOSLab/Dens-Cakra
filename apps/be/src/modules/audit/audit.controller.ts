import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { apiResult } from '../../common/api/api-response.js';
import { ApiContract } from '../../common/decorators/api-contract.decorator.js';
import { DomainAccessGuard } from '../../common/guards/domain-access.guard.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import { AuditQueryDto } from './audit.dto.js';
import { AuditService } from './audit.service.js';

@ApiTags('24. Audit & Compliance')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller()
export class AuditController {
  constructor(private readonly audit: AuditService) {}

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
}
