import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { apiResult } from '../../common/api/api-response.js';
import { ApiContract } from '../../common/decorators/api-contract.decorator.js';
import { CurrentAccessContext } from '../../common/decorators/current-access-context.decorator.js';
import { DomainAccessGuard } from '../../common/guards/domain-access.guard.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import {
  ExecutiveDashboardFilterQueryDto,
  ExecutiveDashboardQueryDto,
} from './executive-dashboard.dto.js';
import { ExecutiveDashboardService } from './executive-dashboard.service.js';

const DASHBOARD_ROLES = [
  'executive',
  'regional_commander',
  'operational_intelligence_manager',
  'field_coordinator',
] as const;

@ApiTags('Dashboard Eksekutif')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller('dashboard/executive')
export class ExecutiveDashboardController {
  constructor(private readonly service: ExecutiveDashboardService) {}

  @Get()
  @ApiContract({
    operationId: 'apiExecutiveDashboard001',
    contractId: 'API-EXECUTIVE-DASHBOARD-001',
    summary: 'Ringkasan eksekutif dan operasional berbasis scope',
    roles: [...DASHBOARD_ROLES],
  })
  async dashboard(
    @Query() query: ExecutiveDashboardQueryDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.service.dashboard(query, context));
  }

  @Get('filters')
  @ApiContract({
    operationId: 'apiExecutiveDashboard002',
    contractId: 'API-EXECUTIVE-DASHBOARD-002',
    summary: 'Pilihan filter dashboard sesuai scope pengguna',
    roles: [...DASHBOARD_ROLES],
  })
  async filters(
    @Query() query: ExecutiveDashboardFilterQueryDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.service.filters(query, context));
  }
}
