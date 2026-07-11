import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
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
import {
  DuplicateDto,
  LinkDto,
  MessageQuery,
  ReasonDto,
  ResolveDto,
  WebhookDto,
} from './whatsapp.dto.js';
import { WhatsAppService } from './whatsapp.service.js';

@ApiTags('12. WhatsApp Intake & Routing')
@Controller()
export class WhatsAppController {
  constructor(private readonly whatsAppService: WhatsAppService) {}

  @Post('webhooks/whatsapp/:channelCode')
  @HttpCode(202)
  @ApiContract({
    operationId: 'apiWa001',
    contractId: 'API-WA-001',
    summary: 'Webhook WhatsApp',
    permission: 'public-signed',
    successStatus: 202,
  })
  async webhook(
    @Param('channelCode') code: string,
    @Headers('x-webhook-signature') signature: string | undefined,
    @Body() body: WebhookDto,
  ) {
    return apiResult(await this.whatsAppService.webhook(code, signature, body));
  }

  @Get('whatsapp-messages')
  @UseGuards(SessionGuard, DomainAccessGuard)
  @ApiContract({
    operationId: 'apiWa002',
    contractId: 'API-WA-002',
    summary: 'Daftar pesan WhatsApp',
    permission: 'whatsapp.read',
  })
  async list(@Query() query: MessageQuery) {
    return apiResult(await this.whatsAppService.list(query));
  }

  @Get('whatsapp-messages/:messageId')
  @UseGuards(SessionGuard, DomainAccessGuard)
  @ApiContract({
    operationId: 'apiWa003',
    contractId: 'API-WA-003',
    summary: 'Detail pesan WhatsApp',
    permission: 'whatsapp.read',
  })
  async get(@Param('messageId', ParseUUIDPipe) id: string) {
    return apiResult(await this.whatsAppService.get(id));
  }

  @Post('whatsapp-messages/:messageId/link-jaring')
  @UseGuards(SessionGuard, DomainAccessGuard)
  @ApiContract({
    operationId: 'apiWa004',
    contractId: 'API-WA-004',
    summary: 'Hubungkan pesan ke Jaring',
    permission: 'whatsapp.route',
    idempotent: true,
  })
  async link(
    @Param('messageId', ParseUUIDPipe) id: string,
    @Body() body: LinkDto,
  ) {
    return apiResult(await this.whatsAppService.link(id, body));
  }

  @Post('whatsapp-messages/:messageId/validate')
  @UseGuards(SessionGuard, DomainAccessGuard)
  @ApiContract({
    operationId: 'apiWa005',
    contractId: 'API-WA-005',
    summary: 'Validasi format pesan',
    permission: 'whatsapp.validate',
    idempotent: true,
  })
  async validate(@Param('messageId', ParseUUIDPipe) id: string) {
    return apiResult(await this.whatsAppService.validate(id));
  }

  @Post('whatsapp-messages/:messageId/resolve-area')
  @UseGuards(SessionGuard, DomainAccessGuard)
  @ApiContract({
    operationId: 'apiWa006',
    contractId: 'API-WA-006',
    summary: 'Resolve area pesan',
    permission: 'whatsapp.resolve',
    idempotent: true,
  })
  async resolve(
    @Param('messageId', ParseUUIDPipe) id: string,
    @Body() body: ResolveDto,
  ) {
    return apiResult(await this.whatsAppService.resolve(id, body));
  }

  @Post('whatsapp-messages/:messageId/route')
  @UseGuards(SessionGuard, DomainAccessGuard)
  @ApiContract({
    operationId: 'apiWa007',
    contractId: 'API-WA-007',
    summary: 'Route pesan ke Field Officer',
    permission: 'whatsapp.route',
    idempotent: true,
  })
  async route(
    @Param('messageId', ParseUUIDPipe) id: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.whatsAppService.route(id, context));
  }

  @Post('whatsapp-messages/:messageId/mark-spam')
  @UseGuards(SessionGuard, DomainAccessGuard)
  @ApiContract({
    operationId: 'apiWa008',
    contractId: 'API-WA-008',
    summary: 'Tandai spam',
    permission: 'whatsapp.moderate',
    idempotent: true,
  })
  async spam(
    @Param('messageId', ParseUUIDPipe) id: string,
    @Body() body: ReasonDto,
  ) {
    return apiResult(await this.whatsAppService.spam(id, body));
  }

  @Post('whatsapp-messages/:messageId/mark-duplicate')
  @UseGuards(SessionGuard, DomainAccessGuard)
  @ApiContract({
    operationId: 'apiWa009',
    contractId: 'API-WA-009',
    summary: 'Tandai duplikat',
    permission: 'whatsapp.moderate',
    idempotent: true,
  })
  async duplicate(
    @Param('messageId', ParseUUIDPipe) id: string,
    @Body() body: DuplicateDto,
  ) {
    return apiResult(await this.whatsAppService.duplicate(id, body));
  }

  @Get('whatsapp-messages/:messageId/routing-logs')
  @UseGuards(SessionGuard, DomainAccessGuard)
  @ApiContract({
    operationId: 'apiWa010',
    contractId: 'API-WA-010',
    summary: 'Routing logs pesan',
    permission: 'whatsapp.read',
  })
  async logs(@Param('messageId', ParseUUIDPipe) id: string) {
    return apiResult(await this.whatsAppService.logs(id));
  }

  @Post('whatsapp-messages/:messageId/create-baket')
  @UseGuards(SessionGuard, DomainAccessGuard)
  @ApiContract({
    operationId: 'apiWa011',
    contractId: 'API-WA-011',
    summary: 'Buat Baket dari pesan',
    permission: 'baket.create',
    successStatus: 201,
    idempotent: true,
  })
  async createBaket(
    @Param('messageId', ParseUUIDPipe) id: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.whatsAppService.createBaket(id, context));
  }

  @Get('whatsapp-inbox/summary')
  @UseGuards(SessionGuard, DomainAccessGuard)
  @ApiContract({
    operationId: 'apiWa012',
    contractId: 'API-WA-012',
    summary: 'Ringkasan inbox WhatsApp',
    permission: 'whatsapp.read',
  })
  async summary() {
    return apiResult(await this.whatsAppService.summary());
  }
}
