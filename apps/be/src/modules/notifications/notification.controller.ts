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
import { apiResult } from '../../common/api/api-response.js';
import { ApiContract } from '../../common/decorators/api-contract.decorator.js';
import { CurrentAccessContext } from '../../common/decorators/current-access-context.decorator.js';
import { DomainAccessGuard } from '../../common/guards/domain-access.guard.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { NotificationService } from './notification.service.js';
import { NotificationQuery, ReadAllDto } from './notification.dto.js';

@ApiTags('23. Notifications')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiContract({
    operationId: 'apiNot001',
    contractId: 'API-NOT-001',
    summary: 'Notifikasi pengguna',
    roles: ['admin_system', 'executive', 'regional_commander', 'operational_intelligence_manager', 'field_coordinator', 'field_officer'],
  })
  async list(
    @CurrentAccessContext() context: AuthorizationContext,
    @Query() query: NotificationQuery,
  ) {
    return apiResult(await this.notificationService.list(context, query));
  }

  @Get('unread-count')
  @ApiContract({
    operationId: 'apiNot002',
    contractId: 'API-NOT-002',
    summary: 'Jumlah unread',
    roles: ['admin_system', 'executive', 'regional_commander', 'operational_intelligence_manager', 'field_coordinator', 'field_officer'],
  })
  async unread(@CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.notificationService.unread(context));
  }

  @Post(':notificationId/read')
  @ApiContract({
    operationId: 'apiNot003',
    contractId: 'API-NOT-003',
    summary: 'Tandai satu notifikasi dibaca',
    roles: ['admin_system', 'executive', 'regional_commander', 'operational_intelligence_manager', 'field_coordinator', 'field_officer'],
    idempotent: true,
  })
  async read(
    @Param('notificationId', ParseUUIDPipe) id: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.notificationService.read(id, context));
  }

  @Post('read-all')
  @ApiContract({
    operationId: 'apiNot004',
    contractId: 'API-NOT-004',
    summary: 'Tandai semua dibaca',
    roles: ['admin_system', 'executive', 'regional_commander', 'operational_intelligence_manager', 'field_coordinator', 'field_officer'],
    idempotent: true,
  })
  async readAll(
    @Body() body: ReadAllDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.notificationService.readAll(body, context));
  }
}
