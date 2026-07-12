import type {
  AdministrativeLevel,
  CommandRouteType,
  OrganizationType,
  PositionCode,
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
  positionId: string;
  positionCode: PositionCode;
  positionTitle: string;
  roleCode: RoleCode;
  organizationUnitId: string;
  organizationUnitName: string;
  organizationUnitType: OrganizationType;
  commandRouteType: CommandRouteType | null;
  permissions: string[];
  areaScopes: AuthorizationAreaScope[];
};
