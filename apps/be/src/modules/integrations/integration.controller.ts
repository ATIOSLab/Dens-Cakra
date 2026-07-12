import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import {
  CreateIntegrationDto,
  IntegrationQuery,
  ReasonDto,
  TestIntegrationDto,
  UpdateIntegrationDto,
  UpdateWhatsappControlDto,
  WebhookQuery,
} from './integration.dto.js';
import { IntegrationService } from './integration.service.js';

@ApiTags('26. Integration Administration')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller()
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Get('integration-channels')
  @ApiContract({
    operationId: 'apiInt001',
    contractId: 'API-INT-001',
    summary: 'Daftar channel integrasi',
    permission: 'integration.read',
  })
  async list(@Query() query: IntegrationQuery) {
    return apiResult(await this.integrationService.list(query));
  }

  @Get('integration-channels/whatsapp-control')
  @ApiContract({
    operationId: 'apiInt011',
    contractId: 'API-INT-011',
    summary: 'Ringkasan kontrol WhatsApp',
    permission: 'integration.read',
  })
  async whatsappControl() {
    return apiResult(await this.integrationService.whatsappControl());
  }

  @Post('integration-channels')
  @ApiContract({
    operationId: 'apiInt002',
    contractId: 'API-INT-002',
    summary: 'Buat channel',
    permission: 'integration.manage',
    successStatus: 201,
    idempotent: true,
  })
  async create(
    @Body() body: CreateIntegrationDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.integrationService.create(body, context));
  }

  @Get('integration-channels/:channelId')
  @ApiContract({
    operationId: 'apiInt003',
    contractId: 'API-INT-003',
    summary: 'Detail channel',
    permission: 'integration.read',
  })
  async detail(@Param('channelId', ParseUUIDPipe) id: string) {
    return apiResult(await this.integrationService.detail(id));
  }

  @Patch('integration-channels/:channelId')
  @ApiContract({
    operationId: 'apiInt004',
    contractId: 'API-INT-004',
    summary: 'Ubah channel',
    permission: 'integration.manage',
  })
  async update(
    @Param('channelId', ParseUUIDPipe) id: string,
    @Body() body: UpdateIntegrationDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.integrationService.update(id, body, context));
  }

  @Patch('integration-channels/whatsapp-control/:channelId')
  @ApiContract({
    operationId: 'apiInt012',
    contractId: 'API-INT-012',
    summary: 'Ubah bot dan nomor pengirim WhatsApp',
    permission: 'integration.manage',
  })
  async updateWhatsappControl(
    @Param('channelId', ParseUUIDPipe) id: string,
    @Body() body: UpdateWhatsappControlDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.integrationService.updateWhatsappControl(id, body, context),
    );
  }

  @Post('integration-channels/whatsapp-control/:channelId/request-qr')
  @ApiContract({
    operationId: 'apiInt013',
    contractId: 'API-INT-013',
    summary: 'Minta QR atau pairing code WhatsApp baru',
    permission: 'integration.manage',
    idempotent: true,
  })
  async requestWhatsappQr(
    @Param('channelId', ParseUUIDPipe) id: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.integrationService.requestWhatsappQr(id, context),
    );
  }

  @Post('integration-channels/:channelId/activate')
  @ApiContract({
    operationId: 'apiInt005',
    contractId: 'API-INT-005',
    summary: 'Aktifkan channel',
    permission: 'integration.manage',
    idempotent: true,
  })
  async activate(
    @Param('channelId', ParseUUIDPipe) id: string,
    @Body() body: ReasonDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.integrationService.activate(id, body, context));
  }

  @Post('integration-channels/:channelId/deactivate')
  @ApiContract({
    operationId: 'apiInt006',
    contractId: 'API-INT-006',
    summary: 'Nonaktifkan channel',
    permission: 'integration.manage',
    idempotent: true,
  })
  async deactivate(
    @Param('channelId', ParseUUIDPipe) id: string,
    @Body() body: ReasonDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.integrationService.deactivate(id, body, context),
    );
  }

  @Post('integration-channels/:channelId/test')
  @ApiContract({
    operationId: 'apiInt007',
    contractId: 'API-INT-007',
    summary: 'Tes koneksi',
    permission: 'integration.manage',
    idempotent: true,
  })
  async test(
    @Param('channelId', ParseUUIDPipe) id: string,
    @Body() body: TestIntegrationDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.integrationService.test(id, body, context));
  }

  @Get('integration-channels/:channelId/webhook-events')
  @ApiContract({
    operationId: 'apiInt008',
    contractId: 'API-INT-008',
    summary: 'Daftar webhook event',
    permission: 'integration.read',
  })
  async events(
    @Param('channelId', ParseUUIDPipe) id: string,
    @Query() query: WebhookQuery,
  ) {
    return apiResult(await this.integrationService.events(id, query));
  }

  @Get('webhook-events/:eventId')
  @ApiContract({
    operationId: 'apiInt009',
    contractId: 'API-INT-009',
    summary: 'Detail webhook event',
    permission: 'integration.read',
  })
  async event(@Param('eventId', ParseUUIDPipe) id: string) {
    return apiResult(await this.integrationService.event(id));
  }

  @Post('webhook-events/:eventId/retry')
  @ApiContract({
    operationId: 'apiInt010',
    contractId: 'API-INT-010',
    summary: 'Retry event gagal',
    permission: 'integration.retry',
    successStatus: 202,
    idempotent: true,
  })
  async retry(
    @Param('eventId', ParseUUIDPipe) id: string,
    @Body() body: ReasonDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.integrationService.retry(id, body, context));
  }
}
