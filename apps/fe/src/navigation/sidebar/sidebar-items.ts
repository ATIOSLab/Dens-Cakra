import { ClipboardList, type LucideIcon, UserPlus } from "lucide-react";

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
        id: "executive-intelligence-network-map",
        title: DOMAIN_TERMS.intelligenceNetworkMap,
        url: "/dashboard/peta-jejaring-intelijen",
        icon: DOMAIN_VISUALS.intelligenceNetworkMap.Icon,
        roles: EXECUTIVE_AND_REGIONAL_ROLES,
      },
      {
        id: "executive-intelligence-products",
        title: "Produk Intelijen",
        url: "/dashboard/deputi/produk-intelijen",
        icon: DOMAIN_VISUALS.intelligenceReport.Icon,
        roles: EXECUTIVE_ROLE,
      },
      {
        id: "executive-performance",
        title: "Kinerja & Evaluasi",
        url: "/dashboard/deputi/kinerja-evaluasi",
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
        title: "Produk Intelijen",
        url: "/dashboard/kabinda/laporan-produk-intelijen",
        icon: DOMAIN_VISUALS.intelligenceReport.Icon,
        roles: REGIONAL_COMMANDER_ROLE,
      },
      {
        id: "oim-directives",
        title: "Direktif & Tugas",
        url: "/dashboard/anev/direktif-tugas",
        icon: DOMAIN_VISUALS.briefing.Icon,
        roles: EXECUTIVE_AND_REGIONAL_ROLES,
      },
      {
        id: "oim-incoming-reports",
        title: "Laporan Masuk",
        url: "/dashboard/anev/laporan-masuk",
        icon: DOMAIN_VISUALS.jaringReport.Icon,
        roles: EXECUTIVE_AND_REGIONAL_ROLES,
      },
      {
        id: "oim-analysis",
        title: "Analisis Intelijen",
        url: "/dashboard/anev/analisis-intelijen",
        icon: SUPPORT_VISUALS.analysis.Icon,
        roles: EXECUTIVE_AND_REGIONAL_ROLES,
      },
      {
        id: "oim-products",
        title: DOMAIN_TERMS.intelligenceReport,
        icon: DOMAIN_VISUALS.intelligenceReport.Icon,
        roles: EXECUTIVE_AND_REGIONAL_ROLES,
        subItems: [
          {
            id: "oim-information-reports-list",
            title: `Daftar ${DOMAIN_TERMS.informationReport}`,
            url: "/dashboard/anev/laporan-informasi",
            roles: EXECUTIVE_AND_REGIONAL_ROLES,
          },
          {
            id: "oim-information-reports-create",
            title: `Buat ${DOMAIN_TERMS.informationReport}`,
            url: "/dashboard/anev/laporan-informasi/buat",
            roles: EXECUTIVE_AND_REGIONAL_ROLES,
          },
          {
            id: "oim-products-list",
            title: "Daftar Laporan Intelijen",
            url: "/dashboard/anev/produk-intelijen/daftar-produk",
            roles: EXECUTIVE_AND_REGIONAL_ROLES,
          },
          {
            id: "oim-products-create",
            title: "Buat Laporan Intelijen",
            url: "/dashboard/anev/produk-intelijen/buat-produk",
            roles: EXECUTIVE_AND_REGIONAL_ROLES,
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
        url: "/dashboard/anev/monitoring-lapangan",
        icon: DOMAIN_VISUALS.monitoring.Icon,
        roles: EXECUTIVE_AND_REGIONAL_ROLES,
      },
      {
        id: "oim-situation-map",
        title: "Peta Situasi",
        url: "/dashboard/anev/peta-situasi",
        icon: DOMAIN_VISUALS.intelligenceNetworkMap.Icon,
        roles: EXECUTIVE_AND_REGIONAL_ROLES,
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
            url: "/dashboard/daftar-petugas-wilayah",
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
        id: "admin-system-account-access",
        title: DOMAIN_TERMS.adminAccountAccessGroup,
        icon: DOMAIN_VISUALS.user.Icon,
        roles: ADMIN_SYSTEM_ROLE,
        subItems: [
          {
            id: "admin-system-users",
            title: "Pengguna",
            url: "/dashboard/admin-system/pengguna",
            roles: ADMIN_SYSTEM_ROLE,
          },
          {
            id: "admin-system-role-access",
            title: DOMAIN_TERMS.roleAccessSettings,
            url: "/dashboard/admin-system/role-hak-akses",
            roles: ADMIN_SYSTEM_ROLE,
          },
        ],
      },
      {
        id: "admin-system-structure-scope",
        title: DOMAIN_TERMS.adminStructureScopeGroup,
        icon: DOMAIN_VISUALS.admin.Icon,
        roles: ADMIN_SYSTEM_ROLE,
        subItems: [
          {
            id: "admin-system-dki-supervision",
            title: "Wilayah Supervisi DKI",
            url: "/dashboard/admin-system/supervisi-dki",
            roles: ADMIN_SYSTEM_ROLE,
          },
        ],
      },
      {
        id: "admin-system-reference-data",
        title: DOMAIN_TERMS.adminReferenceDataGroup,
        icon: DOMAIN_VISUALS.intelligenceReport.Icon,
        roles: ADMIN_SYSTEM_ROLE,
        subItems: [
          {
            id: "admin-system-master-data",
            title: "Master Data",
            url: "/dashboard/admin-system/master-data",
            roles: ADMIN_SYSTEM_ROLE,
          },
        ],
      },
      {
        id: "admin-system-whatsapp-email",
        title: DOMAIN_TERMS.adminWhatsappEmailGroup,
        icon: DOMAIN_VISUALS.notification.Icon,
        roles: ADMIN_SYSTEM_ROLE,
        subItems: [
          {
            id: "admin-system-wa-center",
            title: DOMAIN_TERMS.whatsappIntegration,
            url: "/dashboard/admin-system/integrasi-wa-center",
            roles: ADMIN_SYSTEM_ROLE,
          },
          {
            id: "admin-system-wa-activity-log",
            title: DOMAIN_TERMS.whatsappActivityLog,
            url: "/dashboard/admin-system/log-aktivitas-whatsapp",
            roles: ADMIN_SYSTEM_ROLE,
          },
          {
            id: "admin-system-wa-notification-settings",
            title: DOMAIN_TERMS.whatsappNotificationSettings,
            url: "/dashboard/admin-system/notifikasi-whatsapp",
            roles: ADMIN_SYSTEM_ROLE,
          },
          {
            id: "admin-system-smtp-settings",
            title: DOMAIN_TERMS.smtpSettings,
            url: "/dashboard/admin-system/pengaturan-smtp",
            roles: ADMIN_SYSTEM_ROLE,
          },
        ],
      },
      {
        id: "admin-system-security",
        title: "Keamanan & Audit",
        url: "/dashboard/admin-system/keamanan-audit",
        icon: DOMAIN_VISUALS.notification.Icon,
        roles: ADMIN_SYSTEM_ROLE,
      },
      {
        id: "beranda-field-officer",
        title: "Beranda",
        url: "/dashboard/petugas-wilayah",
        icon: DOMAIN_VISUALS.home.Icon,
        roles: FIELD_OFFICER_ROLE,
      },
      {
        id: "korwil-workspace",
        title: "Ruang Kerja Korwil",
        icon: DOMAIN_VISUALS.command.Icon,
        roles: FIELD_COORDINATOR_ROLE,
        subItems: [
          {
            id: "korwil-tasks",
            title: "Tugas Operasional",
            url: "/dashboard/koordinator-wilayah/tugas-operasional",
            icon: ClipboardList,
            roles: FIELD_COORDINATOR_ROLE,
          },
          {
            id: "korwil-monitoring",
            title: "Monitoring Tugas",
            url: "/dashboard/koordinator-wilayah/monitoring-tugas",
            icon: DOMAIN_VISUALS.monitoring.Icon,
            roles: FIELD_COORDINATOR_ROLE,
          },
          {
            id: "korwil-assignment",
            title: "Penugasan Petugas Wilayah",
            url: "/dashboard/koordinator-wilayah/penugasan-petugas-wilayah",
            icon: UserPlus,
            roles: FIELD_COORDINATOR_ROLE,
          },
        ],
      },
      {
        id: "regional-workspace",
        title: "Ruang Kerja Regional",
        icon: DOMAIN_VISUALS.command.Icon,
        roles: REGIONAL_COMMANDER_ROLE,
        subItems: [
          {
            id: "regional-uuk",
            title: "Direktif & Penjabaran UUK/STR",
            url: "/dashboard/kabinda/direktif-penjabaran-uuk-str",
            icon: DOMAIN_VISUALS.briefing.Icon,
            roles: REGIONAL_COMMANDER_ROLE,
          },
          {
            id: "regional-kpi",
            title: "KPI & Evaluasi",
            url: "/dashboard/kabinda/kpi-evaluasi",
            icon: DOMAIN_VISUALS.performance.Icon,
            roles: REGIONAL_COMMANDER_ROLE,
          },
          {
            id: "regional-early-warning-map",
            title: "Peta Peringatan Dini",
            url: "/dashboard/kabinda/peta-peringatan-dini",
            icon: DOMAIN_VISUALS.notification.Icon,
            roles: REGIONAL_COMMANDER_ROLE,
          },
        ],
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
      "admin-system-account-access",
      "admin-system-structure-scope",
      "admin-system-reference-data",
      "admin-system-whatsapp-email",
      "admin-system-security",
    ];
    accessibleItems.sort((left, right) => adminOrder.indexOf(left.id) - adminOrder.indexOf(right.id));
  }

  const homeIds = new Set([
    "executive-home",
    "regional-home",
    "field-coordinator-home",
    "beranda-field-officer",
    "admin-system-home",
  ]);
  const administrationIds = new Set([
    "admin-system-account-access",
    "admin-system-structure-scope",
    "admin-system-reference-data",
    "admin-system-whatsapp-email",
    "admin-system-security",
  ]);
  const dataIds = new Set(["shared-laporan-jaring", "shared-baket"]);
  const dataOrder = new Map(["shared-laporan-jaring", "shared-baket"].map((id, index) => [id, index]));
  const analysisProductIds = new Set([
    "oim-analysis",
    "oim-products",
    "regional-intelligence-products",
    "executive-intelligence-products",
  ]);
  const analysisProductOrder = new Map(
    ["oim-analysis", "oim-products", "regional-intelligence-products", "executive-intelligence-products"].map(
      (id, index) => [id, index],
    ),
  );
  const personnelNetworkIds = new Set(["field-coordinator-gaswil", "field-coordinator-jaring"]);
  const personnelNetworkOrder = new Map(
    ["field-coordinator-gaswil", "field-coordinator-jaring"].map((id, index) => [id, index]),
  );
  const workspaceIds = new Set(["korwil-workspace", "regional-workspace"]);
  const commandMonitoringOrder = new Map(
    [
      "oim-directives",
      "oim-incoming-reports",
      "oim-field-monitoring",
      "oim-situation-map",
      "executive-intelligence-network-map",
      "executive-performance",
    ].map((id, index) => [id, index]),
  );

  const sections = [
    { id: 1, label: "Ringkasan", matches: (item: NavMainItem) => homeIds.has(item.id) },
    { id: 2, label: "Ruang Kerja", matches: (item: NavMainItem) => workspaceIds.has(item.id) },
    {
      id: 3,
      label: "Komando & Monitoring",
      matches: (item: NavMainItem) =>
        !homeIds.has(item.id) &&
        !workspaceIds.has(item.id) &&
        !analysisProductIds.has(item.id) &&
        !personnelNetworkIds.has(item.id) &&
        !dataIds.has(item.id) &&
        !administrationIds.has(item.id),
    },
    {
      id: 4,
      label: "Analisis & Produk Intelijen",
      matches: (item: NavMainItem) => analysisProductIds.has(item.id),
    },
    { id: 5, label: "Personel & Jaring", matches: (item: NavMainItem) => personnelNetworkIds.has(item.id) },
    { id: 6, label: "Data Intelijen", matches: (item: NavMainItem) => dataIds.has(item.id) },
    { id: 7, label: "Administrasi Sistem", matches: (item: NavMainItem) => administrationIds.has(item.id) },
  ];

  return sections
    .map((section) => {
      const items = accessibleItems.filter(section.matches);

      if (section.label === "Analisis & Produk Intelijen") {
        items.sort(
          (left, right) => (analysisProductOrder.get(left.id) ?? 999) - (analysisProductOrder.get(right.id) ?? 999),
        );
      }
      if (section.label === "Komando & Monitoring") {
        items.sort(
          (left, right) => (commandMonitoringOrder.get(left.id) ?? 999) - (commandMonitoringOrder.get(right.id) ?? 999),
        );
      }
      if (section.label === "Data Intelijen") {
        items.sort((left, right) => (dataOrder.get(left.id) ?? 999) - (dataOrder.get(right.id) ?? 999));
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
