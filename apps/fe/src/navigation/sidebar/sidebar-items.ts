import {
  BellRing,
  BrainCircuit,
  ChartColumn,
  CheckCheck,
  ClipboardList,
  Command,
  FileSearch,
  FileText,
  Inbox,
  LayoutDashboard,
  ListTodo,
  type LucideIcon,
  Map,
  MapPinned,
  Radar,
  ScrollText,
  Send,
  ShieldCheck,
  Siren,
  TriangleAlert,
  Users,
} from "lucide-react";

import {
  SYSTEM_ROLES,
  SYSTEM_ROLE_HOME_ROUTES,
  type SystemRole,
} from "./system-roles";

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
        id: "executive-strategic-situation",
        title: "Situasi Strategis",
        icon: Map,
        roles: EXECUTIVE_ROLE,
        subItems: [
          {
            id: "executive-risk-map",
            title: "Peta Kerawanan",
            url: "/dashboard/executive/situasi-strategis/peta-kerawanan",
            roles: EXECUTIVE_ROLE,
          },
          {
            id: "executive-early-warning",
            title: "Peringatan Dini",
            url: "/dashboard/executive/situasi-strategis/peringatan-dini",
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
            title: "Direktif",
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
        id: "executive-intelligence-products",
        title: "Produk Intelijen",
        url: "/dashboard/executive/produk-intelijen",
        icon: FileText,
        roles: EXECUTIVE_ROLE,
      },
      {
        id: "executive-approval",
        title: "Persetujuan",
        url: "/dashboard/executive/persetujuan",
        icon: CheckCheck,
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
        id: "regional-field-responses",
        title: "Jawaban Lapangan",
        url: "/dashboard/regional-commander/jawaban-lapangan",
        icon: FileSearch,
        roles: REGIONAL_COMMANDER_ROLE,
      },
      {
        id: "regional-intelligence-reports",
        title: "Laporan Intelijen",
        url: "/dashboard/regional-commander/laporan-intelijen",
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
        id: "oim-verification",
        title: "Verifikasi & Neraca Penilaian",
        url: "/dashboard/oim/verifikasi-neraca-penilaian",
        icon: ShieldCheck,
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
        url: "/dashboard/oim/produk-intelijen",
        icon: FileText,
        roles: OIM_ROLE,
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
        id: "field-coordinator-field-tasks",
        title: "Tugas Lapangan",
        icon: ListTodo,
        roles: FIELD_COORDINATOR_ROLE,
        subItems: [
          {
            id: "field-coordinator-received-tasks",
            title: "Tugas Diterima",
            url: "/dashboard/field-coordinator/tugas-lapangan/tugas-diterima",
            roles: FIELD_COORDINATOR_ROLE,
          },
          {
            id: "field-coordinator-team-assignment",
            title: "Penugasan Tim",
            url: "/dashboard/field-coordinator/tugas-lapangan/penugasan-tim",
            roles: FIELD_COORDINATOR_ROLE,
          },
        ],
      },
      {
        id: "field-coordinator-reports",
        title: "Laporan Lapangan",
        url: "/dashboard/field-coordinator/laporan-lapangan",
        icon: ClipboardList,
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
        id: "field-coordinator-personnel",
        title: "Personel & Jaring",
        url: "/dashboard/field-coordinator/personel-jaring",
        icon: Users,
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
      {
        id: "field-officer-baket",
        title: "Kirim Baket",
        url: "/dashboard/field-officer/kirim-baket",
        icon: Send,
        roles: FIELD_OFFICER_ROLE,
      },
      {
        id: "field-officer-reports",
        title: "Laporan Saya",
        url: "/dashboard/field-officer/laporan-saya",
        icon: ClipboardList,
        roles: FIELD_OFFICER_ROLE,
      },
      {
        id: "field-officer-map",
        title: "Peta Tugas",
        url: "/dashboard/field-officer/peta-tugas",
        icon: MapPinned,
        roles: FIELD_OFFICER_ROLE,
      },
      {
        id: "field-officer-emergency",
        title: "Laporan Darurat",
        url: "/dashboard/field-officer/laporan-darurat",
        icon: Siren,
        roles: FIELD_OFFICER_ROLE,
      },
      {
        id: "admin-system-home",
        title: "Beranda Admin Sistem",
        url: SYSTEM_ROLE_HOME_ROUTES[SYSTEM_ROLES.ADMIN_SYSTEM],
        icon: ShieldCheck,
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
