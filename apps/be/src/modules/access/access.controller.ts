import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentAccessContext } from '../../common/decorators/current-access-context.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permission.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import {
  SYSTEM_ROLE_CATALOG,
  SYSTEM_ROLES,
} from '../../common/constants/system-role.js';
import {
  accessControlRoles,
  permissionStatements,
} from '../../common/permissions/access-control.js';
import { DomainAccessGuard } from '../../common/guards/domain-access.guard.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';

@Controller('access')
export class AccessController {
  @Get('roles')
  getRolesCatalog() {
    return {
      roles: SYSTEM_ROLE_CATALOG,
      statements: permissionStatements,
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
      availableRoles: Object.keys(accessControlRoles),
      authorizationContext,
    };
  }

  @Get('domain-context')
  @UseGuards(SessionGuard, DomainAccessGuard)
  getDomainContext(
    @CurrentAccessContext() authorizationContext: AuthorizationContext | null,
  ) {
    return {
      authorizationContext,
    };
  }

  @Get('admin-only')
  @UseGuards(SessionGuard, DomainAccessGuard)
  @Roles(SYSTEM_ROLES.ADMIN_SYSTEM)
  @RequirePermissions('administration.manage')
  getAdminOnlyProbe() {
    return {
      ok: true,
      role: SYSTEM_ROLES.ADMIN_SYSTEM,
      permission: 'administration.manage',
    };
  }

  @Get('field-coordinator-probe')
  @UseGuards(SessionGuard, DomainAccessGuard)
  @Roles(SYSTEM_ROLES.FIELD_COORDINATOR)
  @RequirePermissions('assignment.distribute')
  getFieldCoordinatorProbe(
    @CurrentAccessContext() authorizationContext: AuthorizationContext | null,
  ) {
    return {
      ok: true,
      role: SYSTEM_ROLES.FIELD_COORDINATOR,
      permission: 'assignment.distribute',
      commandRouteType: authorizationContext?.commandRouteType ?? null,
    };
  }
}
