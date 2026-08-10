import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentAccessContext } from '../../common/decorators/current-access-context.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SYSTEM_ROLE_CATALOG } from '../../common/constants/system-role.js';
import { ApiContract } from '../../common/decorators/api-contract.decorator.js';
import { DomainAccessGuard } from '../../common/guards/domain-access.guard.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';

@ApiTags('01. Identity Context & Authorization')
@Controller('access')
export class AccessController {
  @Get('roles')
  @ApiContract({
    operationId: 'apiAccess001',
    contractId: 'API-ACCESS-001',
    summary: 'Ambil katalog role aplikasi',
    access: 'public-internal',
  })
  getRolesCatalog() {
    return {
      roles: SYSTEM_ROLE_CATALOG,
    };
  }

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
}
