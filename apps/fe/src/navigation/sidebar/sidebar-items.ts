import {
  BellRing,
  BrainCircuit,
  ChartColumn,
  ClipboardList,
  Command,
  FileText,
  Inbox,
  LayoutDashboard,
  ListTodo,
  type LucideIcon,
  Map as MapIcon,
  MapPinned,
  Radar,
  ScrollText,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";

import { DOMAIN_TERMS } from "@/lib/domain/terminology";

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
const COORDINATOR_AND_REGIONAL_ROLES = [SYSTEM_ROLES.FIELD_COORDINATOR, SYSTEM_ROLES.REGIONAL_COMMANDER];

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Menu Utama",
    items: [
      {
        id: "executive-home",
        title: "Beranda Eksekutif",
        url: SYSTEM_ROLE_HOME_ROUTES[SYSTEM_ROLES.EXECUTIVE],
        icon: LayoutDashboard,
        roles: EXECUTIVE_ROLE,
      },
      {
        id: "executive-national-situation",
        title: "Situasi Nasional",
        icon: MapIcon,
        roles: EXECUTIVE_ROLE,
        subItems: [
          {
            id: "executive-risk-map",
            title: "Peta Kerawanan Nasional",
            url: "/dashboard/executive/situasi-nasional/peta-kerawanan",
            roles: EXECUTIVE_ROLE,
          },
          {
            id: "executive-early-warning",
            title: "Peringatan Dini",
            url: "/dashboard/executive/situasi-nasional/peringatan-dini",
            roles: EXECUTIVE_ROLE,
          },
        ],
      },
      {
        id: "executive-command-center",
        title: "Pusat Komando",
        icon: Command,
        roles: EXECUTIVE_ROLE,
        subItems: [
          {
            id: "executive-directives",
            title: "Direktif Strategis",
            url: "/dashboard/executive/pusat-komando/direktif",
            roles: EXECUTIVE_ROLE,
          },
          {
            id: "executive-emergency-operations",
            title: "Operasi Darurat",
            url: "/dashboard/executive/pusat-komando/operasi-darurat",
            roles: EXECUTIVE_ROLE,
          },
        ],
      },
      {
        id: "executive-national-monitoring",
        title: "Monitoring Nasional",
        url: "/dashboard/executive/monitoring-nasional",
        icon: Radar,
        roles: EXECUTIVE_ROLE,
      },
      {
        id: "executive-intelligence-network-map",
        title: DOMAIN_TERMS.intelligenceNetworkMap,
        url: "/dashboard/maps-intelijen-network",
        icon: MapPinned,
        roles: EXECUTIVE_ROLE,
      },
      {
        id: "executive-intelligence-products",
        title: "Produk Intelijen",
        url: "/dashboard/executive/produk-intelijen",
        icon: FileText,
        roles: EXECUTIVE_ROLE,
      },
      {
        id: "executive-personnel",
        title: DOMAIN_TERMS.personnel,
        url: "/dashboard/executive/personil",
        icon: Users,
        roles: EXECUTIVE_ROLE,
      },
      {
        id: "executive-performance",
        title: "Kinerja & Evaluasi",
        url: "/dashboard/executive/kinerja-evaluasi",
        icon: ChartColumn,
        roles: EXECUTIVE_ROLE,
      },
      {
        id: "executive-briefing",
        title: "Laporan & Briefing",
        url: "/dashboard/executive/laporan-briefing",
        icon: ClipboardList,
        roles: EXECUTIVE_ROLE,
      },
      {
        id: "regional-home",
        title: "Beranda",
        url: SYSTEM_ROLE_HOME_ROUTES[SYSTEM_ROLES.REGIONAL_COMMANDER],
        icon: LayoutDashboard,
        roles: REGIONAL_COMMANDER_ROLE,
      },
      {
        id: "oim-home",
        title: "Beranda",
        url: SYSTEM_ROLE_HOME_ROUTES[SYSTEM_ROLES.OPERATIONAL_INTELLIGENCE_MANAGER],
        icon: LayoutDashboard,
        roles: OIM_ROLE,
      },
      {
        id: "oim-directives",
        title: "Direktif & Tugas",
        url: "/dashboard/oim/direktif-tugas",
        icon: ClipboardList,
        roles: OIM_ROLE,
      },
      {
        id: "oim-incoming-reports",
        title: "Laporan Masuk",
        url: "/dashboard/oim/laporan-masuk",
        icon: Inbox,
        roles: OIM_ROLE,
      },
      {
        id: "oim-analysis",
        title: "Analisis Intelijen",
        url: "/dashboard/oim/analisis-intelijen",
        icon: BrainCircuit,
        roles: OIM_ROLE,
      },
      {
        id: "oim-products",
        title: "Produk Intelijen",
        icon: FileText,
        roles: OIM_ROLE,
        subItems: [
          {
            id: "oim-products-list",
            title: "Daftar Produk",
            url: "/dashboard/oim/produk-intelijen/daftar-produk",
            roles: OIM_ROLE,
          },
          {
            id: "oim-products-create",
            title: "Buat Produk",
            url: "/dashboard/oim/produk-intelijen/buat-produk",
            roles: OIM_ROLE,
          },
        ],
      },
      {
        id: "oim-field-monitoring",
        title: "Monitoring Lapangan",
        url: "/dashboard/oim/monitoring-lapangan",
        icon: Radar,
        roles: OIM_ROLE,
      },
      {
        id: "oim-situation-map",
        title: "Peta Situasi",
        url: "/dashboard/oim/peta-situasi",
        icon: MapPinned,
        roles: OIM_ROLE,
      },
      {
        id: "field-coordinator-home",
        title: "Beranda",
        url: SYSTEM_ROLE_HOME_ROUTES[SYSTEM_ROLES.FIELD_COORDINATOR],
        icon: LayoutDashboard,
        roles: FIELD_COORDINATOR_ROLE,
      },
      {
        id: "field-coordinator-tasks",
        title: "Monitoring",
        icon: ListTodo,
        roles: COORDINATOR_AND_REGIONAL_ROLES,
        subItems: [
          {
            id: "monitoring-intelijen-network",
            title: DOMAIN_TERMS.intelligenceNetworkMap,
            url: "/dashboard/maps-intelijen-network",
            roles: REGIONAL_COMMANDER_ROLE,
          },
          {
            id: "field-coordinator-tasks-monitoring",
            title: DOMAIN_TERMS.jaringReport,
            url: "/dashboard/laporan-jaring",
            roles: COORDINATOR_AND_REGIONAL_ROLES,
          },
          {
            id: "field-coordinator-baket",
            title: DOMAIN_TERMS.baket,
            url: "/dashboard/baket",
            roles: COORDINATOR_AND_REGIONAL_ROLES,
          },
          {
            id: "field-coordinator-laporan-pembinaan-jaring",
            title: DOMAIN_TERMS.jaringCoachingHistory,
            url: "/dashboard/laporan-pembinaan-jaring",
            roles: COORDINATOR_AND_REGIONAL_ROLES,
          },
        ],
      },
      {
        id: "field-coordinator-personnel",
        title: DOMAIN_TERMS.fieldOfficer,
        url: "/dashboard/personel-lapangan",
        icon: Users,
        roles: COORDINATOR_AND_REGIONAL_ROLES,
      },
      {
        id: "field-coordinator-jaring",
        title: "Jaring",
        icon: Users,
        roles: COORDINATOR_AND_REGIONAL_ROLES,
        subItems: [
          {
            id: "field-coordinator-jaring-distribution",
            title: "Sebaran Jaring",
            url: "/dashboard/sebaran-jaring",
            newTab: true,
            roles: COORDINATOR_AND_REGIONAL_ROLES,
          },
          {
            id: "field-coordinator-jaring-list",
            title: "Daftar Jaring",
            url: "/dashboard/daftar-jaring",
            roles: COORDINATOR_AND_REGIONAL_ROLES,
          },
        ],
      },
      {
        id: "admin-system-home",
        title: "Beranda Sistem",
        url: SYSTEM_ROLE_HOME_ROUTES[SYSTEM_ROLES.ADMIN_SYSTEM],
        icon: ShieldCheck,
        roles: ADMIN_SYSTEM_ROLE,
      },
      {
        id: "admin-system-users",
        title: "Pengguna",
        url: "/dashboard/admin-system/pengguna",
        icon: Users,
        roles: ADMIN_SYSTEM_ROLE,
      },
      {
        id: "admin-system-wa-center",
        title: DOMAIN_TERMS.whatsappIntegration,
        url: "/dashboard/admin-system/integrasi-wa-center",
        icon: Inbox,
        roles: ADMIN_SYSTEM_ROLE,
      },
      {
        id: "beranda-field-officer",
        title: "Beranda",
        url: "/dashboard/field-officer",
        icon: LayoutDashboard,
        roles: FIELD_OFFICER_ROLE,
      },
      {
        id: "field-officer-jaring",
        title: "Daftar Jaring",
        url: "/dashboard/daftar-jaring",
        icon: Users,
        roles: FIELD_OFFICER_ROLE,
      },
      {
        id: "field-officer-laporan-jaring",
        title: DOMAIN_TERMS.jaringReport,
        url: "/dashboard/laporan-jaring",
        icon: Send,
        roles: FIELD_OFFICER_ROLE,
      },
      {
        id: "field-officer-baket",
        title: DOMAIN_TERMS.baket,
        url: "/dashboard/baket",
        icon: FileText,
        roles: FIELD_OFFICER_ROLE,
      },
      {
        id: "field-officer-laporan-pembinaan",
        title: DOMAIN_TERMS.jaringCoachingHistory,
        url: "/dashboard/laporan-pembinaan-jaring",
        icon: ScrollText,
        roles: FIELD_OFFICER_ROLE,
      },
      {
        id: "admin-system-master-data",
        title: "Master Data",
        url: "/dashboard/admin-system/master-data",
        icon: FileText,
        roles: ADMIN_SYSTEM_ROLE,
      },
      {
        id: "admin-system-security",
        title: "Keamanan & Audit",
        url: "/dashboard/admin-system/keamanan-audit",
        icon: BellRing,
        roles: ADMIN_SYSTEM_ROLE,
      },
      {
        id: "admin-system-configuration",
        title: "Konfigurasi Sistem",
        url: "/dashboard/admin-system/konfigurasi-sistem",
        icon: Command,
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
      "admin-system-master-data",
      "admin-system-wa-center",
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
    "admin-system-wa-center",
    "admin-system-master-data",
    "admin-system-security",
    "admin-system-configuration",
  ]);
  const entityIds = new Set([
    "executive-personnel",
    "executive-intelligence-products",
    "oim-products",
    "field-coordinator-personnel",
    "field-coordinator-jaring",
    "field-officer-jaring",
  ]);

  const sections = [
    { id: 1, label: "Ringkasan", matches: (item: NavMainItem) => homeIds.has(item.id) },
    {
      id: 2,
      label: "Operasi & Monitoring",
      matches: (item: NavMainItem) =>
        !homeIds.has(item.id) && !entityIds.has(item.id) && !administrationIds.has(item.id),
    },
    { id: 3, label: "Data & Produk Intelijen", matches: (item: NavMainItem) => entityIds.has(item.id) },
    { id: 4, label: "Administrasi Sistem", matches: (item: NavMainItem) => administrationIds.has(item.id) },
  ];

  return sections
    .map((section) => ({
      id: section.id,
      label: section.label,
      items: accessibleItems.filter(section.matches),
    }))
    .filter((section) => section.items.length > 0);
}
