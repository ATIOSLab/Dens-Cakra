import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { auth } from '../../lib/auth.js';
import { ApiContract } from '../../common/decorators/api-contract.decorator.js';
import { CurrentAccessContext } from '../../common/decorators/current-access-context.decorator.js';
import { DomainAccessGuard } from '../../common/guards/domain-access.guard.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request.js';
import { toWebHeaders } from '../../common/utils/node-headers.js';
import { apiResult } from '../../common/api/api-response.js';
import {
  AreaScopeQueryDto,
  RevokeOtherSessionsDto,
} from './dto/identity.dto.js';
import { IdentityService } from './identity.service.js';

@ApiTags('01. Identity Context & Authorization')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller('me')
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Get()
  @ApiContract({
    operationId: 'apiCtx001',
    contractId: 'API-CTX-001',
    summary: 'Ambil identitas dan profil pengguna aktif',
  })
  async getMe(@CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.identity.getMe(context));
  }

  @Get('authorization-context')
  @ApiContract({
    operationId: 'apiCtx002',
    contractId: 'API-CTX-002',
    summary: 'Ambil konteks authorization efektif',
  })
  getAuthorizationContext(
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(context);
  }

  @Get('area-scopes')
  @ApiContract({
    operationId: 'apiCtx003',
    contractId: 'API-CTX-003',
    summary: 'Ambil wilayah yang dapat diakses pengguna',
  })
  async getAreaScopes(
    @CurrentAccessContext() context: AuthorizationContext,
    @Query() query: AreaScopeQueryDto,
  ) {
    return apiResult(
      await this.identity.getAreaScopes(
        context,
        query.includeDescendants,
        query.level,
      ),
    );
  }

  @Post('revoke-other-sessions')
  @ApiContract({
    operationId: 'apiCtx004',
    contractId: 'API-CTX-004',
    summary: 'Cabut semua session lain',
    idempotent: true,
  })
  async revokeOtherSessions(
    @Req() request: AuthenticatedRequest,
    @CurrentAccessContext() context: AuthorizationContext,
    @Body() body: RevokeOtherSessionsDto,
  ) {
    await auth.api.revokeOtherSessions({
      headers: toWebHeaders(request.headers),
    });
    await this.identity.writeAudit({
      context,
      action: 'AUTH.REVOKE_OTHER_SESSIONS',
      metadata: body.reason ? { reason: body.reason } : undefined,
    });
    return apiResult({ revoked: true }, 'Other sessions were revoked.');
  }
}
