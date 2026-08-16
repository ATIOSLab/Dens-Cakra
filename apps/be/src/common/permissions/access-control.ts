import { defaultStatements } from 'better-auth/plugins/admin/access';
import { createAccessControl } from 'better-auth/plugins/access';
import { SYSTEM_ROLES } from '../constants/system-role.js';

export const accessControl = createAccessControl(defaultStatements);

const adminSystemAdminPermissions = {
  user: [
    'create',
    'list',
    'set-role',
    'ban',
    'impersonate',
    'impersonate-admins',
    'set-password',
    'set-email',
    'get',
    'update',
  ],
  session: ['list', 'revoke', 'delete'],
} as const;

export const accessControlRoles = {
  [SYSTEM_ROLES.EXECUTIVE]: accessControl.newRole({}),
  [SYSTEM_ROLES.REGIONAL_COMMANDER]: accessControl.newRole({}),
  [SYSTEM_ROLES.FIELD_COORDINATOR]: accessControl.newRole({}),
  [SYSTEM_ROLES.FIELD_OFFICER]: accessControl.newRole({}),
  [SYSTEM_ROLES.ADMIN_SYSTEM]: accessControl.newRole({
    ...adminSystemAdminPermissions,
  }),
} as const;
