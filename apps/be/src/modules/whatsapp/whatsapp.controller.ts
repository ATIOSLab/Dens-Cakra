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
import { Throttle } from '@nestjs/throttler';
import { apiResult } from '../../common/api/api-response.js';
import { ApiContract } from '../../common/decorators/api-contract.decorator.js';
import { CurrentAccessContext } from '../../common/decorators/current-access-context.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { DomainAccessGuard } from '../../common/guards/domain-access.guard.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import {
  AssignCategoryDto,
  CreateBaketFromMessageDto,
  MessageQuery,
  ReasonDto,
  WebhookDto,
} from './whatsapp.dto.js';
import { WhatsAppService } from './whatsapp.service.js';

@ApiTags('12. WhatsApp Intake & Routing')
@Controller()
export class WhatsAppController {
  constructor(private readonly whatsAppService: WhatsAppService) {}

  @Post('webhooks/whatsapp/:channelCode')
  @HttpCode(202)
  @Public()
  @Throttle({ default: { limit: 600, ttl: 60_000 } })
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
}
