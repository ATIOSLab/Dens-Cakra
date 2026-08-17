import type {
  AdministrativeLevel,
  CommandRouteType,
  RoleCode,
  UserProfileStatus,
} from '../../generated/prisma/client.js';
import type { SystemRole } from '../constants/system-role.js';

export type AuthorizationAreaScope = {
  areaId: string;
  code: string;
  name: string;
  level: AdministrativeLevel;
  isPrimary: boolean;
};

export type AuthorizationContext = {
  authUserId: string;
  authRole: SystemRole;
  userProfileId: string;
  userProfileStatus: UserProfileStatus;
  primaryAssignmentId: string;
  operationalAssignmentId: string;
  positionId: string;
  positionCode: RoleCode;
  positionTitle: string;
  roleCode: RoleCode;
  organizationUnitId: string;
  organizationUnitName: string;
  organizationUnitType: CommandRouteType;
  commandRouteType: CommandRouteType;
  permissions: string[];
  areaScopes: AuthorizationAreaScope[];
};
