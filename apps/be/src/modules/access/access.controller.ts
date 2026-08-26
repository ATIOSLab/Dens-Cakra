import {
  Controller,
  Get,
  ParseEnumPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentAccessContext } from '../../common/decorators/current-access-context.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SYSTEM_ROLE_CATALOG } from '../../common/constants/system-role.js';
import { ApiContract } from '../../common/decorators/api-contract.decorator.js';
import { DomainAccessGuard } from '../../common/guards/domain-access.guard.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import { RoleCode } from '../../generated/prisma/client.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { DomainScopeService } from './domain-scope.service.js';

@ApiTags('01. Identity Context & Authorization')
@Controller('access')
export class AccessController {
  constructor(private readonly scope: DomainScopeService) {}

  @Get('me')
  @UseGuards(SessionGuard, DomainAccessGuard)
  @ApiContract({
    operationId: 'apiAccess002',
    contractId: 'API-ACCESS-002',
    summary: 'Ambil konteks akses pengguna aktif',
  })
  getMyAccess(
    @CurrentUser() user: unknown,
    @CurrentAccessContext() authorizationContext: AuthorizationContext | null,
  ) {
    return {
      user,
      availableRoles: SYSTEM_ROLE_CATALOG.map((role) => role.key),
      authorizationContext,
    };
  }

  @Get('assignable-assignments')
  @UseGuards(SessionGuard, DomainAccessGuard)
  @ApiContract({
    operationId: 'apiAccess003',
    contractId: 'API-ACCESS-003',
    summary: 'Daftar penugasan aktif dalam cakupan yang dapat ditugaskan',
  })
  listAssignableAssignments(
    @Query('roleCode', new ParseEnumPipe(RoleCode)) roleCode: RoleCode,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return this.scope.listAssignableAssignments(context, roleCode);
  }
}
