import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { apiResult } from '../../common/api/api-response.js';
import { ApiContract } from '../../common/decorators/api-contract.decorator.js';
import { CurrentAccessContext } from '../../common/decorators/current-access-context.decorator.js';
import { DomainAccessGuard } from '../../common/guards/domain-access.guard.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import {
  MailSettingsService,
  TestSmtpSettingsDto,
  UpdateSmtpSettingsDto,
} from '../infrastructure/mail-settings.service.js';

@ApiTags('27. System Administration & Reference Data')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller()
export class SystemController {
  constructor(private readonly mailSettings: MailSettingsService) {}

  @Get('system/email-settings')
  @ApiContract({
    operationId: 'apiSys008',
    contractId: 'API-SYS-008',
    summary: 'Pengaturan SMTP email',
    roles: ['admin_system'],
  })
  async emailSettings() {
    return apiResult(await this.mailSettings.getSettings());
  }
  @Put('system/email-settings')
  @ApiContract({
    operationId: 'apiSys009',
    contractId: 'API-SYS-009',
    summary: 'Ubah pengaturan SMTP email',
    roles: ['admin_system'],
    idempotent: true,
  })
  async updateEmailSettings(
    @Body() body: UpdateSmtpSettingsDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.mailSettings.updateSettings(body, context));
  }
  @Post('system/email-settings/test')
  @ApiContract({
    operationId: 'apiSys010',
    contractId: 'API-SYS-010',
    summary: 'Kirim tes SMTP email',
    roles: ['admin_system'],
  })
  async testEmailSettings(
    @Body() body: TestSmtpSettingsDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.mailSettings.sendTest(body, context));
  }
}
