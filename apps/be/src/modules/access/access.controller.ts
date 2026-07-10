import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import {
  SYSTEM_ROLE_CATALOG,
  SYSTEM_ROLES,
} from '../../common/constants/system-role.js';
import {
  accessControlRoles,
  permissionStatements,
} from '../../common/permissions/access-control.js';
import { RoleGuard } from '../../common/guards/role.guard.js';
import { SessionGuard } from '../../common/guards/session.guard.js';

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
  @UseGuards(SessionGuard)
  getMyAccess(@CurrentUser() user: unknown) {
    return {
      user,
      availableRoles: Object.keys(accessControlRoles),
    };
  }

  @Get('admin-only')
  @UseGuards(SessionGuard, RoleGuard)
  @Roles(SYSTEM_ROLES.ADMIN_SYSTEM)
  getAdminOnlyProbe() {
    return {
      ok: true,
      role: SYSTEM_ROLES.ADMIN_SYSTEM,
    };
  }
}
