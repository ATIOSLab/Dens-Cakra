import {
  CommandRouteType,
  RoleCode,
} from '../../generated/prisma/client.js';

/**
 * Perintah kewilayahan (role -> atasan langsung di garis komando).
 * Supervisi Direktorat/Ditwil (branch DIRECTORATE) adalah garis terpisah dan
 * tidak dimasukkan ke sini.
 */
const COMMAND_PARENT_ROLE: Partial<Record<RoleCode, RoleCode>> = {
  [RoleCode.FIELD_OFFICER]: RoleCode.FIELD_COORDINATOR,
  [RoleCode.FIELD_COORDINATOR]: RoleCode.REGIONAL_COMMANDER,
};

export function commandParentRole(roleCode: RoleCode): RoleCode | null {
  return COMMAND_PARENT_ROLE[roleCode] ?? null;
}

export function isTerritorialCommandBranch(branch: CommandRouteType): boolean {
  return branch === CommandRouteType.BINDA;
}
