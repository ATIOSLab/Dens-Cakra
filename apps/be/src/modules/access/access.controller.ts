import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentAccessContext } from '../../common/decorators/current-access-context.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SYSTEM_ROLE_CATALOG } from '../../common/constants/system-role.js';
import { DomainAccessGuard } from '../../common/guards/domain-access.guard.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';

@Controller('access')
export class AccessController {
  @Get('roles')
  getRolesCatalog() {
    return {
      roles: SYSTEM_ROLE_CATALOG,
    };
  }

  @Get('me')
  @UseGuards(SessionGuard, DomainAccessGuard)
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
