import {
  BellRing,
  BriefcaseBusiness,
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
  Siren,
  TriangleAlert,
  Users,
} from "lucide-react";

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
        id: "executive-intelligence-products",
        title: "Produk Intelijen",
        url: "/dashboard/executive/produk-intelijen",
        icon: FileText,
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
        id: "regional-command",
        title: "Komando Regional",
        url: "/dashboard/regional-commander/komando-regional",
        icon: Command,
        roles: REGIONAL_COMMANDER_ROLE,
      },
      {
        id: "regional-directives",
        title: "Direktif & Penjabaran UUK/STR",
        url: "/dashboard/regional-commander/direktif-penjabaran-uuk-str",
        icon: ScrollText,
        roles: REGIONAL_COMMANDER_ROLE,
      },
      {
        id: "regional-task-monitoring",
        title: "Monitoring Tugas",
        url: "/dashboard/regional-commander/monitoring-tugas",
        icon: ListTodo,
        roles: REGIONAL_COMMANDER_ROLE,
      },
      {
        id: "regional-intelligence-products",
        title: "Laporan & Produk Intelijen",
        url: "/dashboard/regional-commander/laporan-produk-intelijen",
        icon: FileText,
        roles: REGIONAL_COMMANDER_ROLE,
      },
      {
        id: "regional-map-warning",
        title: "Peta & Peringatan Dini",
        url: "/dashboard/regional-commander/peta-peringatan-dini",
        icon: BellRing,
        roles: REGIONAL_COMMANDER_ROLE,
      },
      {
        id: "regional-personnel-network",
        title: "Personel & Jaring",
        url: "/dashboard/regional-commander/personel-jaring",
        icon: Users,
        roles: REGIONAL_COMMANDER_ROLE,
      },
      {
        id: "regional-kpi",
        title: "KPI & Evaluasi",
        url: "/dashboard/regional-commander/kpi-evaluasi",
        icon: ChartColumn,
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
        id: "field-coordinator-operational-tasks",
        title: "Tugas Operasional",
        url: "/dashboard/field-coordinator/tugas-operasional",
        icon: ListTodo,
        roles: FIELD_COORDINATOR_ROLE,
      },
      {
        id: "field-coordinator-assignment",
        title: "Penugasan Field Officer",
        url: "/dashboard/field-coordinator/penugasan-field-officer",
        icon: ClipboardList,
        roles: FIELD_COORDINATOR_ROLE,
      },
      {
        id: "field-coordinator-monitoring",
        title: "Monitoring Tugas",
        url: "/dashboard/field-coordinator/monitoring-tugas",
        icon: Radar,
        roles: FIELD_COORDINATOR_ROLE,
      },
      {
        id: "field-coordinator-personnel",
        title: "Personel Lapangan",
        url: "/dashboard/field-coordinator/personel-lapangan",
        icon: Users,
        roles: FIELD_COORDINATOR_ROLE,
      },
      {
        id: "field-coordinator-map",
        title: "Peta Lapangan",
        url: "/dashboard/field-coordinator/peta-lapangan",
        icon: MapPinned,
        roles: FIELD_COORDINATOR_ROLE,
      },
      {
        id: "field-coordinator-emergency",
        title: "Laporan Darurat",
        url: "/dashboard/field-coordinator/laporan-darurat",
        icon: TriangleAlert,
        roles: FIELD_COORDINATOR_ROLE,
      },
      {
        id: "admin-system-home",
        title: "Dashboard Sistem",
        url: SYSTEM_ROLE_HOME_ROUTES[SYSTEM_ROLES.ADMIN_SYSTEM],
        icon: ShieldCheck,
        roles: ADMIN_SYSTEM_ROLE,
      },
      {
        id: "admin-system-organization",
        title: "Organisasi & Wilayah",
        url: "/dashboard/admin-system/organisasi-wilayah",
        icon: MapPinned,
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
        id: "admin-system-positions",
        title: "Jabatan",
        url: "/dashboard/admin-system/jabatan-reporting-line",
        icon: BriefcaseBusiness,
        roles: ADMIN_SYSTEM_ROLE,
      },
      {
        id: "admin-system-wa-center",
        title: "Integrasi WA Center",
        url: "/dashboard/admin-system/integrasi-wa-center",
        icon: Inbox,
        roles: ADMIN_SYSTEM_ROLE,
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
  {
    id: 2,
    label: "Mission",
    roles: FIELD_OFFICER_ROLE,
    items: [
      {
        id: "field-officer-home",
        title: "Beranda",
        url: SYSTEM_ROLE_HOME_ROUTES[SYSTEM_ROLES.FIELD_OFFICER],
        icon: LayoutDashboard,
        roles: FIELD_OFFICER_ROLE,
      },
      {
        id: "field-officer-tasks",
        title: "Tugas Saya",
        url: "/dashboard/field-officer/tugas-saya",
        icon: ListTodo,
        roles: FIELD_OFFICER_ROLE,
      },
    ],
  },
  {
    id: 3,
    label: "Network",
    roles: FIELD_OFFICER_ROLE,
    items: [
      {
        id: "field-officer-network",
        title: "Jaring Binaan",
        url: "/dashboard/field-officer/jaring-binaan",
        icon: Users,
        roles: FIELD_OFFICER_ROLE,
      },
      {
        id: "field-officer-network-inbox",
        title: "Kotak Masuk Jaring",
        url: "/dashboard/field-officer/kotak-masuk-jaring",
        icon: Inbox,
        roles: FIELD_OFFICER_ROLE,
      },
    ],
  },
  {
    id: 4,
    label: "Report",
    roles: FIELD_OFFICER_ROLE,
    items: [
      {
        id: "field-officer-baket",
        title: "Buat Baket",
        url: "/dashboard/field-officer/buat-baket",
        icon: Send,
        roles: FIELD_OFFICER_ROLE,
      },
    ],
  },
  {
    id: 5,
    label: "Field",
    roles: FIELD_OFFICER_ROLE,
    items: [
      {
        id: "field-officer-map",
        title: "Peta",
        icon: MapPinned,
        roles: FIELD_OFFICER_ROLE,
        subItems: [
          {
            id: "field-officer-agent-map",
            title: "Peta Agen",
            url: "/dashboard/field-officer/peta/agen",
            icon: Users,
            roles: FIELD_OFFICER_ROLE,
          },
          {
            id: "field-officer-report-map",
            title: "Peta Laporan",
            url: "/dashboard/field-officer/peta/laporan",
            icon: MapIcon,
            roles: FIELD_OFFICER_ROLE,
          },
        ],
      },
    ],
  },
  {
    id: 6,
    label: "System",
    roles: FIELD_OFFICER_ROLE,
    items: [
      {
        id: "field-officer-emergency",
        title: "Laporan Darurat",
        url: "/dashboard/field-officer/laporan-darurat",
        icon: Siren,
        roles: FIELD_OFFICER_ROLE,
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
  return sidebarItems
    .filter((group) => hasRoleAccess(group.roles, role))
    .map((group) => ({
      ...group,
      items: group.items
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
    }))
    .filter((group) => group.items.length > 0);
}
