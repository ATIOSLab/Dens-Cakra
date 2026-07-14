import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
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
  DuplicateDto,
  AssignCategoryDto,
  CreateBaketFromMessageDto,
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
    access: 'public-signed',
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
    roles: ['field_officer'],
  })
  async list(
    @Query() query: MessageQuery,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.whatsAppService.list(query, context));
  }

  @Get('whatsapp-messages/:messageId')
  @UseGuards(SessionGuard, DomainAccessGuard)
  @ApiContract({
    operationId: 'apiWa003',
    contractId: 'API-WA-003',
    summary: 'Detail pesan WhatsApp',
    roles: ['field_officer'],
  })
  async get(
    @Param('messageId', ParseUUIDPipe) id: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.whatsAppService.get(id, context));
  }

  @Post('whatsapp-messages/:messageId/link-jaring')
  @UseGuards(SessionGuard, DomainAccessGuard)
  @ApiContract({
    operationId: 'apiWa004',
    contractId: 'API-WA-004',
    summary: 'Hubungkan pesan ke Jaring',
    roles: ['field_officer'],
    idempotent: true,
  })
  async link(
    @Param('messageId', ParseUUIDPipe) id: string,
    @Body() body: LinkDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.whatsAppService.link(id, body, context));
  }

  @Patch('whatsapp-messages/:messageId/category')
  @UseGuards(SessionGuard, DomainAccessGuard)
  @ApiContract({
    operationId: 'apiWa004b',
    contractId: 'API-WA-004B',
    summary: 'Assign kategori laporan WhatsApp',
    roles: ['field_officer'],
  })
  async assignCategory(
    @Param('messageId', ParseUUIDPipe) id: string,
    @Body() body: AssignCategoryDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.whatsAppService.assignCategory(id, body, context),
    );
  }

  @Post('whatsapp-messages/:messageId/validate')
  @UseGuards(SessionGuard, DomainAccessGuard)
  @ApiContract({
    operationId: 'apiWa005',
    contractId: 'API-WA-005',
    summary: 'Validasi format pesan',
    roles: ['field_officer'],
    idempotent: true,
  })
  async validate(
    @Param('messageId', ParseUUIDPipe) id: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.whatsAppService.validate(id, context));
  }

  @Post('whatsapp-messages/:messageId/resolve-area')
  @UseGuards(SessionGuard, DomainAccessGuard)
  @ApiContract({
    operationId: 'apiWa006',
    contractId: 'API-WA-006',
    summary: 'Resolve area pesan',
    roles: ['field_officer'],
    idempotent: true,
  })
  async resolve(
    @Param('messageId', ParseUUIDPipe) id: string,
    @Body() body: ResolveDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.whatsAppService.resolve(id, body, context));
  }

  @Post('whatsapp-messages/:messageId/route')
  @UseGuards(SessionGuard, DomainAccessGuard)
  @ApiContract({
    operationId: 'apiWa007',
    contractId: 'API-WA-007',
    summary: 'Route pesan ke Field Officer',
    roles: ['field_officer'],
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
    roles: ['field_officer'],
    idempotent: true,
  })
  async spam(
    @Param('messageId', ParseUUIDPipe) id: string,
    @Body() body: ReasonDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.whatsAppService.spam(id, body, context));
  }

  @Post('whatsapp-messages/:messageId/mark-duplicate')
  @UseGuards(SessionGuard, DomainAccessGuard)
  @ApiContract({
    operationId: 'apiWa009',
    contractId: 'API-WA-009',
    summary: 'Tandai duplikat',
    roles: ['field_officer'],
    idempotent: true,
  })
  async duplicate(
    @Param('messageId', ParseUUIDPipe) id: string,
    @Body() body: DuplicateDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.whatsAppService.duplicate(id, body, context));
  }

  @Get('whatsapp-messages/:messageId/routing-logs')
  @UseGuards(SessionGuard, DomainAccessGuard)
  @ApiContract({
    operationId: 'apiWa010',
    contractId: 'API-WA-010',
    summary: 'Routing logs pesan',
    roles: ['field_officer'],
  })
  async logs(
    @Param('messageId', ParseUUIDPipe) id: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.whatsAppService.logs(id, context));
  }

  @Post('whatsapp-messages/:messageId/create-baket')
  @UseGuards(SessionGuard, DomainAccessGuard)
  @ApiContract({
    operationId: 'apiWa011',
    contractId: 'API-WA-011',
    summary: 'Buat Baket dari pesan',
    roles: ['field_officer'],
    successStatus: 201,
    idempotent: true,
  })
  async createBaket(
    @Param('messageId', ParseUUIDPipe) id: string,
    @Body() body: CreateBaketFromMessageDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.whatsAppService.createBaket(id, body, context));
  }

  @Get('whatsapp-inbox/summary')
  @UseGuards(SessionGuard, DomainAccessGuard)
  @ApiContract({
    operationId: 'apiWa012',
    contractId: 'API-WA-012',
    summary: 'Ringkasan inbox WhatsApp',
    roles: ['field_officer'],
  })
  async summary(@CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.whatsAppService.summary(context));
  }
}
