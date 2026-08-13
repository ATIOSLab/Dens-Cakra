import type { LucideIcon } from "lucide-react";

import { DOMAIN_TERMS } from "@/lib/domain/terminology";
import { DOMAIN_VISUALS, SUPPORT_VISUALS } from "@/lib/domain/visual-system";

import { SYSTEM_ROLE_HOME_ROUTES, SYSTEM_ROLES, type SystemRole } from "./system-roles";

export type NavBadge = "new" | "soon";

export interface NavSubItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
  roles?: SystemRole[];
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
  roles?: SystemRole[];
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
  roles?: SystemRole[];
}

const EXECUTIVE_ROLE = [SYSTEM_ROLES.EXECUTIVE];
const REGIONAL_COMMANDER_ROLE = [SYSTEM_ROLES.REGIONAL_COMMANDER];
const OIM_ROLE = [SYSTEM_ROLES.OPERATIONAL_INTELLIGENCE_MANAGER];
const FIELD_COORDINATOR_ROLE = [SYSTEM_ROLES.FIELD_COORDINATOR];
const FIELD_OFFICER_ROLE = [SYSTEM_ROLES.FIELD_OFFICER];
const ADMIN_SYSTEM_ROLE = [SYSTEM_ROLES.ADMIN_SYSTEM];
const EXECUTIVE_AND_REGIONAL_ROLES = [SYSTEM_ROLES.EXECUTIVE, SYSTEM_ROLES.REGIONAL_COMMANDER];
const LEADERSHIP_MONITORING_ROLES = [
  SYSTEM_ROLES.EXECUTIVE,
  SYSTEM_ROLES.REGIONAL_COMMANDER,
  SYSTEM_ROLES.FIELD_COORDINATOR,
];
const INTELLIGENCE_DATA_READ_ROLES = [
  SYSTEM_ROLES.EXECUTIVE,
  SYSTEM_ROLES.REGIONAL_COMMANDER,
  SYSTEM_ROLES.OPERATIONAL_INTELLIGENCE_MANAGER,
  SYSTEM_ROLES.FIELD_COORDINATOR,
  SYSTEM_ROLES.FIELD_OFFICER,
];
const JARING_MANAGEMENT_ROLES = [
  SYSTEM_ROLES.EXECUTIVE,
  SYSTEM_ROLES.REGIONAL_COMMANDER,
  SYSTEM_ROLES.FIELD_COORDINATOR,
  SYSTEM_ROLES.FIELD_OFFICER,
];

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Menu Utama",
    items: [
      {
        id: "executive-home",
        title: "Beranda",
        url: SYSTEM_ROLE_HOME_ROUTES[SYSTEM_ROLES.EXECUTIVE],
        icon: DOMAIN_VISUALS.home.Icon,
        roles: EXECUTIVE_ROLE,
      },
      {
        id: "executive-command-center",
        title: "Pusat Komando",
        icon: DOMAIN_VISUALS.command.Icon,
        roles: EXECUTIVE_ROLE,
        subItems: [
          {
            id: "executive-command-center-overview",
            title: "Pusat Komando",
            url: "/dashboard/executive/pusat-komando",
            roles: EXECUTIVE_ROLE,
          },
          {
            id: "executive-briefing",
            title: "Laporan & Briefing",
            url: "/dashboard/executive/laporan-briefing",
            roles: EXECUTIVE_ROLE,
          },
        ],
      },
      {
        id: "executive-intelligence-network-map",
        title: DOMAIN_TERMS.intelligenceNetworkMap,
        url: "/dashboard/maps-intelijen-network",
        icon: DOMAIN_VISUALS.intelligenceNetworkMap.Icon,
        roles: EXECUTIVE_AND_REGIONAL_ROLES,
      },
      {
        id: "executive-intelligence-products",
        title: DOMAIN_TERMS.intelligenceReport,
        url: "/dashboard/executive/produk-intelijen",
        icon: DOMAIN_VISUALS.intelligenceReport.Icon,
        roles: EXECUTIVE_ROLE,
      },
      {
        id: "executive-performance",
        title: "Kinerja & Evaluasi",
        url: "/dashboard/executive/kinerja-evaluasi",
        icon: DOMAIN_VISUALS.performance.Icon,
        roles: EXECUTIVE_ROLE,
      },
      {
        id: "regional-home",
        title: "Beranda",
        url: SYSTEM_ROLE_HOME_ROUTES[SYSTEM_ROLES.REGIONAL_COMMANDER],
        icon: DOMAIN_VISUALS.home.Icon,
        roles: REGIONAL_COMMANDER_ROLE,
      },
      {
        id: "regional-intelligence-products",
        title: DOMAIN_TERMS.intelligenceReport,
        url: "/dashboard/regional-commander/laporan-produk-intelijen",
        icon: DOMAIN_VISUALS.intelligenceReport.Icon,
        roles: REGIONAL_COMMANDER_ROLE,
      },
      {
        id: "oim-home",
        title: "Beranda",
        url: SYSTEM_ROLE_HOME_ROUTES[SYSTEM_ROLES.OPERATIONAL_INTELLIGENCE_MANAGER],
        icon: DOMAIN_VISUALS.home.Icon,
        roles: OIM_ROLE,
      },
      {
        id: "oim-directives",
        title: "Direktif & Tugas",
        url: "/dashboard/oim/direktif-tugas",
        icon: DOMAIN_VISUALS.briefing.Icon,
        roles: OIM_ROLE,
      },
      {
        id: "oim-incoming-reports",
        title: "Laporan Masuk",
        url: "/dashboard/oim/laporan-masuk",
        icon: DOMAIN_VISUALS.jaringReport.Icon,
        roles: OIM_ROLE,
      },
      {
        id: "oim-analysis",
        title: "Analisis Intelijen",
        url: "/dashboard/oim/analisis-intelijen",
        icon: SUPPORT_VISUALS.analysis.Icon,
        roles: OIM_ROLE,
      },
      {
        id: "oim-products",
        title: DOMAIN_TERMS.intelligenceReport,
        icon: DOMAIN_VISUALS.intelligenceReport.Icon,
        roles: OIM_ROLE,
        subItems: [
          {
            id: "oim-information-reports-list",
            title: `Daftar ${DOMAIN_TERMS.informationReport}`,
            url: "/dashboard/oim/laporan-informasi",
            roles: OIM_ROLE,
          },
          {
            id: "oim-information-reports-create",
            title: `Buat ${DOMAIN_TERMS.informationReport}`,
            url: "/dashboard/oim/laporan-informasi/buat",
            roles: OIM_ROLE,
          },
          {
            id: "oim-products-list",
            title: "Daftar Laporan Intelijen",
            url: "/dashboard/oim/produk-intelijen/daftar-produk",
            roles: OIM_ROLE,
          },
          {
            id: "oim-products-create",
            title: "Buat Laporan Intelijen",
            url: "/dashboard/oim/produk-intelijen/buat-produk",
            roles: OIM_ROLE,
          },
        ],
      },
      {
        id: "shared-laporan-jaring",
        title: DOMAIN_TERMS.jaringReport,
        url: "/dashboard/laporan-jaring",
        icon: DOMAIN_VISUALS.jaringReport.Icon,
        roles: INTELLIGENCE_DATA_READ_ROLES,
      },
      {
        id: "shared-baket",
        title: DOMAIN_TERMS.baket,
        url: "/dashboard/baket",
        icon: DOMAIN_VISUALS.baket.Icon,
        roles: INTELLIGENCE_DATA_READ_ROLES,
      },
      {
        id: "oim-field-monitoring",
        title: "Monitoring Lapangan",
        url: "/dashboard/oim/monitoring-lapangan",
        icon: DOMAIN_VISUALS.monitoring.Icon,
        roles: OIM_ROLE,
      },
      {
        id: "oim-situation-map",
        title: "Peta Situasi",
        url: "/dashboard/oim/peta-situasi",
        icon: DOMAIN_VISUALS.intelligenceNetworkMap.Icon,
        roles: OIM_ROLE,
      },
      {
        id: "field-coordinator-home",
        title: "Beranda",
        url: SYSTEM_ROLE_HOME_ROUTES[SYSTEM_ROLES.FIELD_COORDINATOR],
        icon: DOMAIN_VISUALS.home.Icon,
        roles: FIELD_COORDINATOR_ROLE,
      },
      {
        id: "field-coordinator-gaswil",
        title: DOMAIN_TERMS.fieldOfficer,
        icon: DOMAIN_VISUALS.gaswil.Icon,
        roles: LEADERSHIP_MONITORING_ROLES,
        subItems: [
          {
            id: "field-coordinator-gaswil-distribution",
            title: "Sebaran Petugas Wilayah",
            url: "/dashboard/sebaran-gaswil",
            newTab: true,
            roles: LEADERSHIP_MONITORING_ROLES,
          },
          {
            id: "field-coordinator-gaswil-list",
            title: "Daftar Petugas Wilayah",
            url: "/dashboard/personel-lapangan",
            roles: LEADERSHIP_MONITORING_ROLES,
          },
        ],
      },
      {
        id: "field-coordinator-jaring",
        title: "Jaring",
        icon: DOMAIN_VISUALS.jaring.Icon,
        roles: JARING_MANAGEMENT_ROLES,
        subItems: [
          {
            id: "field-coordinator-jaring-distribution",
            title: "Sebaran Jaring",
            url: "/dashboard/sebaran-jaring",
            newTab: true,
            roles: LEADERSHIP_MONITORING_ROLES,
          },
          {
            id: "field-coordinator-jaring-list",
            title: "Daftar Jaring",
            url: "/dashboard/daftar-jaring",
            roles: JARING_MANAGEMENT_ROLES,
          },
          {
            id: "field-coordinator-jaring-coaching-history",
            title: DOMAIN_TERMS.jaringCoachingHistory,
            url: "/dashboard/laporan-pembinaan-jaring",
            roles: JARING_MANAGEMENT_ROLES,
          },
        ],
      },
      {
        id: "admin-system-home",
        title: "Beranda",
        url: SYSTEM_ROLE_HOME_ROUTES[SYSTEM_ROLES.ADMIN_SYSTEM],
        icon: DOMAIN_VISUALS.admin.Icon,
        roles: ADMIN_SYSTEM_ROLE,
      },
      {
        id: "admin-system-users",
        title: "Pengguna",
        url: "/dashboard/admin-system/pengguna",
        icon: DOMAIN_VISUALS.user.Icon,
        roles: ADMIN_SYSTEM_ROLE,
      },
      {
        id: "admin-system-dki-supervision",
        title: "Supervisi DKI",
        url: "/dashboard/admin-system/supervisi-dki",
        icon: DOMAIN_VISUALS.intelligenceNetworkMap.Icon,
        roles: ADMIN_SYSTEM_ROLE,
      },
      {
        id: "admin-system-wa-center",
        title: DOMAIN_TERMS.whatsappIntegration,
        url: "/dashboard/admin-system/integrasi-wa-center",
        icon: DOMAIN_VISUALS.jaringReport.Icon,
        roles: ADMIN_SYSTEM_ROLE,
      },
      {
        id: "admin-system-wa-activity-log",
        title: DOMAIN_TERMS.whatsappActivityLog,
        url: "/dashboard/admin-system/log-aktivitas-whatsapp",
        icon: DOMAIN_VISUALS.monitoring.Icon,
        roles: ADMIN_SYSTEM_ROLE,
      },
      {
        id: "admin-system-wa-notification-settings",
        title: DOMAIN_TERMS.whatsappNotificationSettings,
        url: "/dashboard/admin-system/notifikasi-whatsapp",
        icon: DOMAIN_VISUALS.notification.Icon,
        roles: ADMIN_SYSTEM_ROLE,
      },
      {
        id: "admin-system-smtp-settings",
        title: DOMAIN_TERMS.smtpSettings,
        url: "/dashboard/admin-system/pengaturan-smtp",
        icon: DOMAIN_VISUALS.notification.Icon,
        roles: ADMIN_SYSTEM_ROLE,
      },
      {
        id: "beranda-field-officer",
        title: "Beranda",
        url: "/dashboard/field-officer",
        icon: DOMAIN_VISUALS.home.Icon,
        roles: FIELD_OFFICER_ROLE,
      },
      {
        id: "admin-system-master-data",
        title: "Master Data",
        url: "/dashboard/admin-system/master-data",
        icon: DOMAIN_VISUALS.intelligenceReport.Icon,
        roles: ADMIN_SYSTEM_ROLE,
      },
      {
        id: "admin-system-security",
        title: "Keamanan & Audit",
        url: "/dashboard/admin-system/keamanan-audit",
        icon: DOMAIN_VISUALS.notification.Icon,
        roles: ADMIN_SYSTEM_ROLE,
      },
      {
        id: "admin-system-configuration",
        title: "Konfigurasi Sistem",
        url: "/dashboard/admin-system/konfigurasi-sistem",
        icon: DOMAIN_VISUALS.command.Icon,
        roles: ADMIN_SYSTEM_ROLE,
      },
    ],
  },
];

function hasRoleAccess(roles: SystemRole[] | undefined, role: SystemRole) {
  if (!roles?.length) {
    return true;
  }

  return roles.includes(role);
}

export function getSidebarItemsForRole(role: SystemRole): NavGroup[] {
  const accessibleItems = sidebarItems
    .filter((group) => hasRoleAccess(group.roles, role))
    .flatMap((group) =>
      group.items
        .filter((item) => hasRoleAccess(item.roles, role))
        .map((item) => {
          if (!item.subItems) {
            return item;
          }

          return {
            ...item,
            subItems: item.subItems.filter((subItem) => hasRoleAccess(subItem.roles, role)),
          };
        })
        .filter((item) => !item.subItems || item.subItems.length > 0),
    );

  if (role === SYSTEM_ROLES.ADMIN_SYSTEM) {
    const adminOrder = [
      "admin-system-home",
      "admin-system-users",
      "admin-system-dki-supervision",
      "admin-system-master-data",
      "admin-system-wa-center",
      "admin-system-wa-activity-log",
      "admin-system-wa-notification-settings",
      "admin-system-smtp-settings",
      "admin-system-security",
      "admin-system-configuration",
    ];
    accessibleItems.sort((left, right) => adminOrder.indexOf(left.id) - adminOrder.indexOf(right.id));
  }

  const homeIds = new Set([
    "executive-home",
    "regional-home",
    "oim-home",
    "field-coordinator-home",
    "beranda-field-officer",
    "admin-system-home",
  ]);
  const administrationIds = new Set([
    "admin-system-users",
    "admin-system-dki-supervision",
    "admin-system-wa-center",
    "admin-system-wa-activity-log",
    "admin-system-wa-notification-settings",
    "admin-system-smtp-settings",
    "admin-system-master-data",
    "admin-system-security",
    "admin-system-configuration",
  ]);
  const entityIds = new Set([
    "shared-laporan-jaring",
    "shared-baket",
    "regional-intelligence-products",
    "executive-intelligence-products",
    "oim-products",
  ]);
  const entityOrder = new Map(
    [
      "shared-laporan-jaring",
      "shared-baket",
      "regional-intelligence-products",
      "executive-intelligence-products",
      "oim-products",
    ].map((id, index) => [id, index]),
  );
  const personnelNetworkIds = new Set(["field-coordinator-gaswil", "field-coordinator-jaring"]);
  const personnelNetworkOrder = new Map(
    ["field-coordinator-gaswil", "field-coordinator-jaring"].map((id, index) => [id, index]),
  );

  const sections = [
    { id: 1, label: "Ringkasan", matches: (item: NavMainItem) => homeIds.has(item.id) },
    {
      id: 2,
      label: "Komando & Monitoring",
      matches: (item: NavMainItem) =>
        !homeIds.has(item.id) &&
        !personnelNetworkIds.has(item.id) &&
        !entityIds.has(item.id) &&
        !administrationIds.has(item.id),
    },
    { id: 3, label: "Personel & Jaring", matches: (item: NavMainItem) => personnelNetworkIds.has(item.id) },
    { id: 4, label: "Data & Produk Intelijen", matches: (item: NavMainItem) => entityIds.has(item.id) },
    { id: 5, label: "Administrasi Sistem", matches: (item: NavMainItem) => administrationIds.has(item.id) },
  ];

  return sections
    .map((section) => {
      const items = accessibleItems.filter(section.matches);

      if (section.label === "Data & Produk Intelijen") {
        items.sort((left, right) => (entityOrder.get(left.id) ?? 999) - (entityOrder.get(right.id) ?? 999));
      }
      if (section.label === "Personel & Jaring") {
        items.sort(
          (left, right) => (personnelNetworkOrder.get(left.id) ?? 999) - (personnelNetworkOrder.get(right.id) ?? 999),
        );
      }

      return {
        id: section.id,
        label: section.label,
        items,
      };
    })
    .filter((section) => section.items.length > 0);
}
