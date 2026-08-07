import { DOMAIN_TERMS } from "@/lib/domain/terminology";

export const SYSTEM_ROLES = {
  EXECUTIVE: "executive",
  REGIONAL_COMMANDER: "regional_commander",
  OPERATIONAL_INTELLIGENCE_MANAGER: "operational_intelligence_manager",
  FIELD_COORDINATOR: "field_coordinator",
  FIELD_OFFICER: "field_officer",
  ADMIN_SYSTEM: "admin_system",
} as const;

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

export const SYSTEM_ROLE_LABELS: Record<SystemRole, string> = {
  [SYSTEM_ROLES.EXECUTIVE]: "Eksekutif",
  [SYSTEM_ROLES.REGIONAL_COMMANDER]: "Komandan Regional",
  [SYSTEM_ROLES.OPERATIONAL_INTELLIGENCE_MANAGER]: "Manajer Intelijen Operasional",
  [SYSTEM_ROLES.FIELD_COORDINATOR]: "Koordinator Lapangan",
  [SYSTEM_ROLES.FIELD_OFFICER]: DOMAIN_TERMS.fieldOfficer,
  [SYSTEM_ROLES.ADMIN_SYSTEM]: "Admin Sistem",
};

export const SYSTEM_ROLE_HOME_ROUTES: Record<SystemRole, string> = {
  [SYSTEM_ROLES.EXECUTIVE]: "/dashboard/executive",
  [SYSTEM_ROLES.REGIONAL_COMMANDER]: "/dashboard/regional-commander",
  [SYSTEM_ROLES.OPERATIONAL_INTELLIGENCE_MANAGER]: "/dashboard/oim",
  [SYSTEM_ROLES.FIELD_COORDINATOR]: "/dashboard/field-coordinator",
  [SYSTEM_ROLES.FIELD_OFFICER]: "/dashboard/field-officer",
  [SYSTEM_ROLES.ADMIN_SYSTEM]: "/dashboard/admin-system",
};

export function getSystemRoleLabel(role: SystemRole): string {
  return SYSTEM_ROLE_LABELS[role];
}

export function getSystemRoleHomeRoute(role: SystemRole): string {
  return SYSTEM_ROLE_HOME_ROUTES[role];
}

export function isSystemRole(role: string): role is SystemRole {
  return Object.values(SYSTEM_ROLES).includes(role as SystemRole);
}

export function parseSystemRole(role: string | null | undefined): SystemRole | null {
  if (!role) {
    return null;
  }

  return isSystemRole(role) ? role : null;
}
