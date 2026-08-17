import { RoleCode } from '../../generated/prisma/client.js';
import { SYSTEM_ROLES, type SystemRole } from './system-role.js';

export const AUTH_ROLE_TO_DOMAIN_ROLE = {
  [SYSTEM_ROLES.ADMIN_SYSTEM]: RoleCode.ADMIN_SYSTEM,
  [SYSTEM_ROLES.NATIONAL_LEADER]: RoleCode.NATIONAL_LEADER,
  [SYSTEM_ROLES.EXECUTIVE]: RoleCode.EXECUTIVE,
  [SYSTEM_ROLES.REGIONAL_COMMANDER]: RoleCode.REGIONAL_COMMANDER,
  [SYSTEM_ROLES.FIELD_COORDINATOR]: RoleCode.FIELD_COORDINATOR,
  [SYSTEM_ROLES.FIELD_OFFICER]: RoleCode.FIELD_OFFICER,
} as const satisfies Record<SystemRole, RoleCode>;

export type AuthRole = keyof typeof AUTH_ROLE_TO_DOMAIN_ROLE;

export function mapAuthRoleToDomainRole(role: AuthRole) {
  return AUTH_ROLE_TO_DOMAIN_ROLE[role];
}
