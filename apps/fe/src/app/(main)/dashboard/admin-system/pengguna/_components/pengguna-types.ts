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
  officialCode?: string | null;
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
  { value: "SUSPENDED", label: "Ditangguhkan" },
  { value: "ARCHIVED", label: "Diarsipkan" },
];

export const ROLE_CODE_OPTIONS: Array<{
  value: RoleCode;
  label: string;
}> = [
  { value: "ADMIN_SYSTEM", label: DOMAIN_TERMS.adminSystemRole },
  { value: "EXECUTIVE", label: DOMAIN_TERMS.executiveRole },
  { value: "REGIONAL_COMMANDER", label: DOMAIN_TERMS.regionalCommanderRole },
  {
    value: "OPERATIONAL_INTELLIGENCE_MANAGER",
    label: DOMAIN_TERMS.operationalIntelligenceManagerRole,
  },
  { value: "FIELD_COORDINATOR", label: DOMAIN_TERMS.fieldCoordinatorRole },
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

const AUTH_ROLE_TO_ROLE_CODE = Object.fromEntries(
  Object.entries(ROLE_CODE_TO_AUTH_ROLE).map(([roleCode, authRole]) => [authRole, roleCode]),
) as Record<SystemRole, RoleCode>;

const ROLE_CODE_SET = new Set<string>(ROLE_CODE_OPTIONS.map((option) => option.value));
const DKI_JAKARTA_PROVINCE_CODES = new Set(["31", "31.00", "31.0000"]);
const AREA_LEVEL_LABELS: Record<string, string> = {
  COUNTRY: "Negara",
  PROVINCE: "Provinsi",
  REGENCY: "Kabupaten",
  CITY: "Kota",
  DISTRICT: "Kecamatan",
  SUBDISTRICT: "Kelurahan/Desa",
  VILLAGE: "Kelurahan/Desa",
};

export type RbacDisplayStatus = "valid" | "warning" | "missing";

export type AssignmentRbacSummary = {
  roleCode: RoleCode | null;
  roleLabel: string;
  lineLabel: string;
  functionLabel: string;
  branchLabel: string;
  scopeRequirement: string;
  status: RbacDisplayStatus;
  message: string;
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
  if (!assignment) return null;

  const areaScopes = assignment.areaScopes;
  const primaryArea = areaScopes.find((scope) => scope.isPrimary)?.area ?? areaScopes[0]?.area ?? null;
  const legacyUnit = assignment.position?.organizationUnit ?? assignment.seat?.organizationUnit ?? null;

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

export function isKnownRoleCode(value?: string | null): value is RoleCode {
  return Boolean(value && ROLE_CODE_SET.has(value));
}

export function getRoleLabelByCode(roleCode?: string | null) {
  const option = ROLE_CODE_OPTIONS.find((item) => item.value === roleCode);
  return option?.label ?? "Role tidak terdaftar";
}

function getRoleCodeFromAuthRole(role?: string | null) {
  if (!role) return null;
  return role in AUTH_ROLE_TO_ROLE_CODE ? AUTH_ROLE_TO_ROLE_CODE[role as SystemRole] : null;
}

function getAssignmentRoleCode(assignment?: UserPositionAssignment | null, authRole?: string | null) {
  const rawRoleCode = assignment?.role?.code ?? assignment?.position?.role?.code ?? assignment?.seat?.role?.code ?? null;
  if (isKnownRoleCode(rawRoleCode)) return rawRoleCode;
  return getRoleCodeFromAuthRole(authRole);
}

function getAssignmentBranch(assignment?: UserPositionAssignment | null) {
  return assignment?.branch ?? assignment?.position?.branch ?? assignment?.seat?.branch ?? null;
}

function getBranchLabel(branch?: CommandRouteType | null) {
  if (branch === "PUSAT") return "Pusat";
  if (branch === "DIRECTORATE") return "Direktorat/Ditwil";
  if (branch === "BINDA") return DOMAIN_TERMS.regionalUnit;
  return "Belum ditetapkan";
}

function normalizedAreaCode(area: AreaSummary) {
  return (area.officialCode ?? area.code ?? "").trim();
}

function normalizedAreaLevel(area: AreaSummary) {
  return area.level.toUpperCase();
}

function isDkiJakartaProvinceArea(area: AreaSummary) {
  const code = normalizedAreaCode(area);
  const name = area.name.toLocaleLowerCase("id-ID");
  return (
    normalizedAreaLevel(area) === "PROVINCE" &&
    (DKI_JAKARTA_PROVINCE_CODES.has(code) ||
      name.includes("dki jakarta") ||
      name.includes("daerah khusus ibukota jakarta"))
  );
}

function isDkiRegencyCityArea(area: AreaSummary) {
  const level = normalizedAreaLevel(area);
  if (level !== "REGENCY" && level !== "CITY") return false;

  const code = normalizedAreaCode(area);
  const name = area.name.toLocaleLowerCase("id-ID");
  return code.startsWith("31.") || name.includes("jakarta") || name.includes("kepulauan seribu");
}

function hasOnlyAreaLevels(areaScopes: UserAreaScope[], levels: string[]) {
  const levelSet = new Set(levels);
  return areaScopes.length > 0 && areaScopes.every((scope) => levelSet.has(normalizedAreaLevel(scope.area)));
}

function hasValidDirectorateScope(areaScopes: UserAreaScope[]) {
  return (
    areaScopes.length > 0 &&
    areaScopes.every((scope) => {
      const level = normalizedAreaLevel(scope.area);
      if (isDkiJakartaProvinceArea(scope.area)) return false;
      if (level === "PROVINCE") return true;
      return isDkiRegencyCityArea(scope.area);
    })
  );
}

function formatAreaLevels(areaScopes: UserAreaScope[]) {
  const labels = [
    ...new Set(
      areaScopes.map((scope) => AREA_LEVEL_LABELS[normalizedAreaLevel(scope.area)] ?? normalizedAreaLevel(scope.area)),
    ),
  ];
  return labels.length ? labels.join(", ") : "Belum ada cakupan";
}

function buildSummary(input: Omit<AssignmentRbacSummary, "status" | "message">, valid: boolean, message: string) {
  return {
    ...input,
    status: valid ? "valid" : "warning",
    message,
  } satisfies AssignmentRbacSummary;
}

export function getAssignmentRbacSummary(
  assignment?: UserPositionAssignment | null,
  authRole?: string | null,
): AssignmentRbacSummary {
  const roleCode = getAssignmentRoleCode(assignment, authRole);
  const branch = getAssignmentBranch(assignment);
  const areaScopes = assignment?.areaScopes ?? [];
  const roleLabel = getRoleLabelByCode(roleCode);
  const branchLabel = getBranchLabel(branch);

  if (!roleCode) {
    return {
      roleCode: null,
      roleLabel,
      lineLabel: "Belum tervalidasi",
      functionLabel: "Role tidak terdaftar",
      branchLabel,
      scopeRequirement: "Gunakan role resmi RBAC",
      status: "missing",
      message: "Role akun tidak terdaftar dalam matriks RBAC.",
    };
  }

  if (roleCode === "ADMIN_SYSTEM") {
    return buildSummary(
      {
        roleCode,
        roleLabel,
        lineLabel: "Administrasi Sistem",
        functionLabel: DOMAIN_TERMS.systemAccount,
        branchLabel,
        scopeRequirement: "Akses sistem, bukan jabatan struktural BIN",
      },
      !branch || branch === "PUSAT",
      "Admin Sistem adalah akun sistem dan tidak masuk garis komando atau supervisi operasional.",
    );
  }

  if (roleCode === "EXECUTIVE") {
    return buildSummary(
      {
        roleCode,
        roleLabel,
        lineLabel: DOMAIN_TERMS.centralSupervisionLine,
        functionLabel: DOMAIN_TERMS.deputyUnit,
        branchLabel,
        scopeRequirement: "Cakupan nasional",
      },
      branch === "PUSAT" && hasOnlyAreaLevels(areaScopes, ["COUNTRY"]),
      `Deputi II wajib jalur Pusat dengan cakupan Negara. Cakupan saat ini: ${formatAreaLevels(areaScopes)}.`,
    );
  }

  if (roleCode === "REGIONAL_COMMANDER") {
    const isDirectorate = branch === "DIRECTORATE";
    return buildSummary(
      {
        roleCode,
        roleLabel,
        lineLabel: isDirectorate ? DOMAIN_TERMS.centralSupervisionLine : DOMAIN_TERMS.commandTerritorialLine,
        functionLabel: isDirectorate ? "Direktorat/Ditwil" : `${DOMAIN_TERMS.regionalUnit} - ${DOMAIN_TERMS.regionalLeader}`,
        branchLabel,
        scopeRequirement: isDirectorate
          ? "Provinsi non-DKI atau Kota/Kabupaten DKI"
          : "Provinsi komando Binda",
      },
      isDirectorate ? hasValidDirectorateScope(areaScopes) : branch === "BINDA" && hasOnlyAreaLevels(areaScopes, ["PROVINCE"]),
      isDirectorate
        ? `Direktorat/Ditwil memakai supervisi provinsi non-DKI atau kota/kabupaten DKI. Cakupan saat ini: ${formatAreaLevels(areaScopes)}.`
        : `Kabinda/Binda wajib jalur BINDA dengan cakupan Provinsi. Cakupan saat ini: ${formatAreaLevels(areaScopes)}.`,
    );
  }

  if (roleCode === "OPERATIONAL_INTELLIGENCE_MANAGER") {
    const isDirectorate = branch === "DIRECTORATE";
    return buildSummary(
      {
        roleCode,
        roleLabel,
        lineLabel: isDirectorate ? DOMAIN_TERMS.centralSupervisionLine : DOMAIN_TERMS.commandTerritorialLine,
        functionLabel: isDirectorate ? DOMAIN_TERMS.anevDirectorate : DOMAIN_TERMS.anevBinda,
        branchLabel,
        scopeRequirement: isDirectorate
          ? "Provinsi non-DKI atau Kota/Kabupaten DKI"
          : "Provinsi komando Binda",
      },
      isDirectorate ? hasValidDirectorateScope(areaScopes) : branch === "BINDA" && hasOnlyAreaLevels(areaScopes, ["PROVINCE"]),
      isDirectorate
        ? `Anev Direktorat mengikuti scope supervisi Direktorat/Ditwil. Cakupan saat ini: ${formatAreaLevels(areaScopes)}.`
        : `Anev Binda wajib jalur BINDA dengan cakupan Provinsi. Cakupan saat ini: ${formatAreaLevels(areaScopes)}.`,
    );
  }

  if (roleCode === "FIELD_COORDINATOR") {
    const isDirectorate = branch === "DIRECTORATE";
    return buildSummary(
      {
        roleCode,
        roleLabel,
        lineLabel: isDirectorate ? DOMAIN_TERMS.centralSupervisionLine : DOMAIN_TERMS.commandTerritorialLine,
        functionLabel: isDirectorate ? "Staf Subdit" : DOMAIN_TERMS.regionalCoordinator,
        branchLabel,
        scopeRequirement: isDirectorate ? "Kota/Kabupaten supervisi" : "Kabupaten/Kota komando Korwil",
      },
      (branch === "BINDA" || branch === "DIRECTORATE") && hasOnlyAreaLevels(areaScopes, ["REGENCY", "CITY"]),
      `Koordinator/Staf Subdit memakai cakupan Kabupaten/Kota. Cakupan saat ini: ${formatAreaLevels(areaScopes)}.`,
    );
  }

  return buildSummary(
    {
      roleCode,
      roleLabel,
      lineLabel: DOMAIN_TERMS.commandTerritorialLine,
      functionLabel: DOMAIN_TERMS.fieldOfficer,
      branchLabel,
      scopeRequirement: "Kecamatan penugasan Gaswil",
    },
    branch === "BINDA" && hasOnlyAreaLevels(areaScopes, ["DISTRICT"]),
    `Petugas Wilayah (Gaswil) wajib jalur BINDA dengan cakupan Kecamatan. Cakupan saat ini: ${formatAreaLevels(areaScopes)}.`,
  );
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
