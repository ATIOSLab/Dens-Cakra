import {
  AdministrativeLevel,
  RoleCode,
} from '../../generated/prisma/client.js';

export type AreaWithDkiAncestry = {
  code?: string | null;
  officialCode?: string | null;
  name?: string | null;
  level: AdministrativeLevel;
  parent?: AreaWithDkiAncestry | null;
  ancestorLinks?: Array<{
    ancestor: AreaWithDkiAncestry;
  }>;
};

export const DKI_JAKARTA_PROVINCE_CODE = '31';
export const DKI_JAKARTA_PROVINCE_NAME_MATCHERS = [
  'dki jakarta',
  'daerah khusus ibukota jakarta',
] as const;
export const DKI_REGENCY_CITY_LEVELS = [
  AdministrativeLevel.REGENCY,
  AdministrativeLevel.CITY,
] as const;
export const DIRECTORATE_SUPERVISION_ROLE_CODES = [
  RoleCode.REGIONAL_COMMANDER,
  RoleCode.OPERATIONAL_INTELLIGENCE_MANAGER,
] as const;

export const DKI_SUPERVISION_RBAC_POLICY = {
  policyId: 'RBAC-DKI-DIRECTORATE-SUPERVISION',
  storageModel: 'UserOperationalAssignment.areaScopes',
  provinceCode: DKI_JAKARTA_PROVINCE_CODE,
  normalDirectorateScopeLevels: [AdministrativeLevel.PROVINCE],
  dkiDirectorateScopeLevels: DKI_REGENCY_CITY_LEVELS,
  directorateRoleCodes: DIRECTORATE_SUPERVISION_ROLE_CODES,
  allowsMultipleRegencyCitiesPerDirectorate: true,
  allowsMultipleDirectoratesPerRegencyCity: true,
  forbidsHardcodedDirectorateCityAssignment: true,
  commandLineUnchanged: true,
} as const;

export function isDkiJakartaProvince(area: AreaWithDkiAncestry) {
  if (area.level !== AdministrativeLevel.PROVINCE) return false;

  const code = area.officialCode ?? area.code ?? '';
  const name = area.name?.toLocaleLowerCase('id-ID') ?? '';
  return (
    code === DKI_JAKARTA_PROVINCE_CODE ||
    DKI_JAKARTA_PROVINCE_NAME_MATCHERS.some((matcher) =>
      name.includes(matcher),
    )
  );
}

export function belongsToDkiJakartaProvince(area: AreaWithDkiAncestry) {
  if (isDkiJakartaProvince(area)) return true;
  if (area.parent && belongsToDkiJakartaProvince(area.parent)) return true;
  return area.ancestorLinks?.some((link) => isDkiJakartaProvince(link.ancestor)) ?? false;
}

export function isDkiJakartaRegencyCity(area: AreaWithDkiAncestry) {
  return (
    DKI_REGENCY_CITY_LEVELS.includes(area.level as (typeof DKI_REGENCY_CITY_LEVELS)[number]) &&
    belongsToDkiJakartaProvince(area)
  );
}

export function isDirectorateSupervisionRole(roleCode: string) {
  return DIRECTORATE_SUPERVISION_ROLE_CODES.some((code) => code === roleCode);
}
