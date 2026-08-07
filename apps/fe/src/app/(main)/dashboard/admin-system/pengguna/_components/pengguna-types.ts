import type { PaginationMeta } from "@/lib/api/types";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";
import { SYSTEM_ROLE_LABELS, SYSTEM_ROLES, type SystemRole } from "@/navigation/sidebar/system-roles";

export type UserProfileStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";
export type RoleCode =
  | "ADMIN_SYSTEM"
  | "EXECUTIVE"
  | "REGIONAL_COMMANDER"
  | "OPERATIONAL_INTELLIGENCE_MANAGER"
  | "FIELD_COORDINATOR"
  | "FIELD_OFFICER";
export type PositionCode =
  | "ADMIN"
  | "DEPUTI_II"
  | "DIREKTUR_WILAYAH"
  | "KABINDA"
  | "KASUBDIT"
  | "KABAGOPS"
  | "STAF_SUBDIT"
  | "KORWIL"
  | "PETUGAS_ORGANIK";
export type CommandRouteType = "PUSAT" | "DIRECTORATE" | "BINDA";

export type UserRoleCatalogItem = {
  key: SystemRole;
  label: string;
  summary: string;
};

export type AccessMeResource = {
  authorizationContext: {
    authUserId: string;
    authRole: SystemRole;
    userProfileId: string;
    primaryAssignmentId: string;
    positionId: string;
    positionTitle: string;
    roleCode: RoleCode;
    organizationUnitId: string;
    organizationUnitName: string;
    areaScopes: Array<{
      areaId: string;
      code: string;
      name: string;
      level: string;
      isPrimary: boolean;
    }>;
  };
};

export type OrganizationUnitSummary = {
  id: string;
  code: string;
  name: string;
  type: string;
  branch?: CommandRouteType | null;
};

export type RoleSummary = {
  id?: string;
  code: RoleCode;
  name: string;
};

export type PositionSummary = {
  id: string;
  seatCode: string;
  code: PositionCode;
  title: string;
  branch?: CommandRouteType | null;
  isActive?: boolean;
  role?: RoleSummary | null;
  organizationUnit?: OrganizationUnitSummary | null;
  reportsTo?: {
    id: string;
    title: string;
  } | null;
  areaCoverages?: Array<{
    id: string;
    areaId?: string;
    isPrimary: boolean;
    area: AreaSummary;
  }>;
};

export type AreaSummary = {
  id: string;
  code: string;
  name: string;
  level: string;
};

export type AreaSearchResult = AreaSummary & {
  parent?: {
    id: string;
    name: string;
  } | null;
};

export type UserAreaScope = {
  id?: string;
  areaId?: string;
  isPrimary: boolean;
  validFrom?: string;
  validUntil?: string | null;
  area: AreaSummary;
};

export type UserPositionAssignment = {
  id: string;
  roleId?: string;
  branch?: CommandRouteType | null;
  userProfile?: {
    id?: string;
    username?: string | null;
    fullName?: string | null;
  };
  isPrimary?: boolean;
  isActive?: boolean;
  validFrom: string;
  validUntil?: string | null;
  seat?: {
    id: string;
    branch?: CommandRouteType | null;
    organizationUnit?: OrganizationUnitSummary | null;
    role?: RoleSummary | null;
  } | null;
  role?: RoleSummary | null;
  position?: PositionSummary | null;
  areaScopes: UserAreaScope[];
};

export type UserAuthSummary = {
  id: string;
  name?: string | null;
  email: string;
  role: SystemRole;
  banned: boolean;
};

export type UserListItem = {
  id: string;
  authUserId: string;
  username?: string | null;
  fullName?: string | null;
  phone?: string | null;
  status: UserProfileStatus;
  isActive: boolean;
  operationalLockedAt?: string | null;
  operationalLockedUntil?: string | null;
  operationalLockReason?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  authUser: UserAuthSummary;
  operationalAssignments?: UserPositionAssignment[];
  positionAssignments?: UserPositionAssignment[];
};

export type UserDetail = UserListItem;

export type UserProvisionResponse = {
  userProfile: UserDetail;
  generatedTempPassword: string | null;
};

export type UserListFacets = {
  status?: Record<UserProfileStatus, number>;
  security?: {
    locked?: number;
    unlocked?: number;
  };
};

export type UserListQueryState = {
  q: string;
  status: string;
  roleCode: string;
  unitId: string;
  areaId: string;
  page: number;
  limit: number;
  selected: string;
};

export type UserListPageResource = {
  items: UserListItem[];
  pagination?: PaginationMeta;
  facets?: UserListFacets;
};

export const USER_STATUS_OPTIONS: Array<{
  value: UserProfileStatus;
  label: string;
}> = [
  { value: "ACTIVE", label: "Aktif" },
  { value: "PENDING", label: "Menunggu" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "ARCHIVED", label: "Archived" },
];

export const ROLE_CODE_OPTIONS: Array<{
  value: RoleCode;
  label: string;
}> = [
  { value: "ADMIN_SYSTEM", label: "Admin Sistem" },
  { value: "EXECUTIVE", label: "Eksekutif" },
  { value: "REGIONAL_COMMANDER", label: "Komandan Regional" },
  {
    value: "OPERATIONAL_INTELLIGENCE_MANAGER",
    label: "Manajer Intelijen Operasional",
  },
  { value: "FIELD_COORDINATOR", label: "Koordinator Lapangan" },
  { value: "FIELD_OFFICER", label: DOMAIN_TERMS.fieldOfficer },
];

export const POSITION_CODE_OPTIONS: Array<{
  value: PositionCode;
  label: string;
}> = [
  { value: "ADMIN", label: "Admin" },
  { value: "DEPUTI_II", label: "Deputi II" },
  { value: "DIREKTUR_WILAYAH", label: "Direktur Wilayah" },
  { value: "KABINDA", label: "Kabinda" },
  { value: "KASUBDIT", label: "Kasubdit" },
  { value: "KABAGOPS", label: "Kabagops" },
  { value: "STAF_SUBDIT", label: "Staf Subdit" },
  { value: "KORWIL", label: "Korwil" },
  { value: "PETUGAS_ORGANIK", label: DOMAIN_TERMS.fieldOfficer },
];

export const ROLE_CODE_TO_AUTH_ROLE: Record<RoleCode, SystemRole> = {
  ADMIN_SYSTEM: SYSTEM_ROLES.ADMIN_SYSTEM,
  EXECUTIVE: SYSTEM_ROLES.EXECUTIVE,
  REGIONAL_COMMANDER: SYSTEM_ROLES.REGIONAL_COMMANDER,
  OPERATIONAL_INTELLIGENCE_MANAGER: SYSTEM_ROLES.OPERATIONAL_INTELLIGENCE_MANAGER,
  FIELD_COORDINATOR: SYSTEM_ROLES.FIELD_COORDINATOR,
  FIELD_OFFICER: SYSTEM_ROLES.FIELD_OFFICER,
};

export function getUserAssignments(user: UserListItem | UserDetail) {
  return user.operationalAssignments ?? user.positionAssignments ?? [];
}

export function getPrimaryAssignment(user: UserListItem | UserDetail) {
  const assignments = getUserAssignments(user);
  return (
    assignments.find(
      (assignment) => assignment.isPrimary !== false && assignment.isActive !== false && !assignment.validUntil,
    ) ??
    assignments.find((assignment) => assignment.isPrimary !== false) ??
    assignments[0] ??
    null
  );
}

export function getAssignmentRoleSummary(assignment?: UserPositionAssignment | null) {
  return assignment?.role ?? assignment?.position?.role ?? assignment?.seat?.role ?? null;
}

export function getAssignmentUnitSummary(assignment?: UserPositionAssignment | null) {
  const primaryArea =
    assignment?.areaScopes?.find((scope) => scope.isPrimary)?.area ?? assignment?.areaScopes?.[0]?.area ?? null;
  const legacyUnit = assignment?.position?.organizationUnit ?? assignment?.seat?.organizationUnit ?? null;

  if (legacyUnit) {
    return legacyUnit;
  }

  if (primaryArea) {
    return {
      id: primaryArea.id,
      code: primaryArea.code,
      name: primaryArea.name,
      type: primaryArea.level,
      branch: assignment?.branch ?? null,
    } satisfies OrganizationUnitSummary;
  }

  return null;
}

export function isUserLocked(user: UserListItem | UserDetail) {
  if (!user.operationalLockedAt) {
    return false;
  }

  if (!user.operationalLockedUntil) {
    return true;
  }

  return new Date(user.operationalLockedUntil).getTime() > Date.now();
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatDateOnly(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function toDateTimeLocalValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - timezoneOffset * 60_000);

  return localDate.toISOString().slice(0, 16);
}

export function toIsoFromLocalValue(value: string) {
  return new Date(value).toISOString();
}

export function getRoleLabel(role: SystemRole) {
  return SYSTEM_ROLE_LABELS[role];
}
