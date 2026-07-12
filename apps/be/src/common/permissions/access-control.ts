import { defaultStatements } from 'better-auth/plugins/admin/access';
import { createAccessControl } from 'better-auth/plugins/access';
import { SYSTEM_ROLES } from '../constants/system-role.js';

export const permissionStatements = {
  ...defaultStatements,
  directive: ['create', 'read', 'assign', 'track'],
  assignment: ['create', 'read', 'update', 'distribute'],
  intake: ['read', 'route', 'validate'],
  baket: ['create', 'read', 'verify', 'submit', 'return'],
  report: ['create', 'read', 'review', 'approve', 'return'],
  monitoring: ['read'],
  administration: ['read', 'manage'],
} as const;

export const accessControl = createAccessControl(permissionStatements);

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
  [SYSTEM_ROLES.EXECUTIVE]: accessControl.newRole({
    directive: ['create', 'read', 'track'],
    report: ['read', 'review', 'approve', 'return'],
    monitoring: ['read'],
  }),
  [SYSTEM_ROLES.REGIONAL_COMMANDER]: accessControl.newRole({
    directive: ['read', 'assign', 'track'],
    assignment: ['read'],
    report: ['read', 'review', 'approve', 'return'],
    monitoring: ['read'],
  }),
  [SYSTEM_ROLES.OPERATIONAL_INTELLIGENCE_MANAGER]: accessControl.newRole({
    directive: ['read'],
    assignment: ['create', 'read', 'update'],
    baket: ['read', 'verify', 'return'],
    report: ['create', 'read'],
    monitoring: ['read'],
  }),
  [SYSTEM_ROLES.FIELD_COORDINATOR]: accessControl.newRole({
    assignment: ['read', 'update', 'distribute'],
    monitoring: ['read'],
  }),
  [SYSTEM_ROLES.FIELD_OFFICER]: accessControl.newRole({
    intake: ['read', 'validate'],
    baket: ['create', 'read', 'submit'],
  }),
  [SYSTEM_ROLES.ADMIN_SYSTEM]: accessControl.newRole({
    ...adminSystemAdminPermissions,
    administration: ['read', 'manage'],
    monitoring: ['read'],
  }),
} as const;
