import {
  AlertTriangle,
  Building2,
  ClipboardCheck,
  Database,
  FileText,
  Globe,
  LayoutDashboard,
  Map as MapIcon,
  MapPin,
  Monitor,
  Radio,
  Search,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";

export type NavBadge = "new" | "soon";

export interface NavMainLinkItem {
  id: string;
  title: string;
  url: string;
  icon?: React.ElementType;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

export interface NavMainParentItem extends Omit<NavMainLinkItem, "url"> {
  subItems: NavMainLinkItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "HAK AKSES",
    items: [
      {
        id: "dashboard-nasional",
        title: "Dashboard Nasional",
        url: "/dashboard/default",
        icon: LayoutDashboard,
      },
      {
        id: "seluruh-indonesia",
        title: "Seluruh Indonesia",
        url: "/dashboard/indonesia",
        icon: Globe,
      },
      {
        id: "seluruh-binda",
        title: "Seluruh BINDA",
        url: "/dashboard/regional",
        icon: MapIcon,
      },
      {
        id: "kpi-nasional",
        title: "KPI Nasional",
        url: "/dashboard/kpi",
        icon: Target,
      },
      {
        id: "master-data",
        title: "Master Data",
        url: "/dashboard/master",
        icon: Database,
      },
      {
        id: "ukstr",
        title: "Penjabaran UK/STR",
        url: "/dashboard/ukstr",
        icon: FileText,
      },
      {
        id: "answers",
        title: "Jawaban Lapangan",
        url: "/dashboard/answers",
        icon: ClipboardCheck,
      },
    ],
  },
];

export const adminSidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "OPERASIONAL",
    items: [
      {
        id: "monitoring-nasional",
        title: "Monitoring Nasional",
        url: "/dashboard/monitoring-nasional",
        icon: Monitor,
      },
      {
        id: "laporan-nasional",
        title: "Laporan Nasional",
        url: "/dashboard/reports",
        icon: FileText,
      },
      {
        id: "monitoring-binda",
        title: "Monitoring BINDA",
        url: "/dashboard/personnel",
        icon: Users,
      },
      {
        id: "ukstr",
        title: "Penjabaran UK/STR",
        url: "/dashboard/ukstr",
        icon: FileText,
      },
      {
        id: "answers",
        title: "Jawaban Lapangan",
        url: "/dashboard/answers",
        icon: ClipboardCheck,
      },
    ],
  },
];

export const kabinSidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "OPERASIONAL",
    items: [
      {
        id: "dashboard-binda",
        title: "Dashboard BINDA",
        url: "/dashboard/kabin-dashboard",
        icon: Building2,
      },
      {
        id: "kpi-wilayah",
        title: "KPI Wilayah",
        url: "/dashboard/kabin-kpi",
        icon: Target,
      },
      {
        id: "monitoring-personel",
        title: "Monitoring Personel",
        url: "/dashboard/kabin-monitoring",
        icon: Users,
      },
      {
        id: "ukstr",
        title: "Penjabaran UK/STR",
        url: "/dashboard/ukstr",
        icon: FileText,
      },
      {
        id: "answers",
        title: "Jawaban Lapangan",
        url: "/dashboard/answers",
        icon: ClipboardCheck,
      },
    ],
  },
];

export const adminRiauSidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "OPERASIONAL",
    items: [
      {
        id: "kelola-personel",
        title: "Kelola Personel",
        url: "/dashboard/riau-personnel",
        icon: Users,
      },
      {
        id: "verifikasi-laporan",
        title: "Verifikasi Laporan",
        url: "/dashboard/riau-verification",
        icon: ShieldCheck,
      },
      {
        id: "kpi-wilayah",
        title: "KPI Wilayah",
        url: "/dashboard/riau-kpi",
        icon: Target,
      },
      {
        id: "ukstr",
        title: "Penjabaran UK/STR",
        url: "/dashboard/ukstr",
        icon: FileText,
      },
      {
        id: "answers",
        title: "Jawaban Lapangan",
        url: "/dashboard/answers",
        icon: ClipboardCheck,
      },
    ],
  },
];

export const analisSidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "OPERASIONAL",
    items: [
      {
        id: "beranda",
        title: "Beranda",
        url: "/dashboard/analis-beranda",
        icon: LayoutDashboard,
      },
      {
        id: "komando-regional",
        title: "Komando Regional",
        url: "/dashboard/analis-regional",
        icon: Building2,
      },
      {
        id: "ukstr",
        title: "Penjabaran UK/STR",
        url: "/dashboard/ukstr",
        icon: FileText,
      },
      {
        id: "answers",
        title: "Jawaban Lapangan",
        url: "/dashboard/answers",
        icon: ClipboardCheck,
      },
      {
        id: "verifikasi",
        title: "Verifikasi",
        url: "/dashboard/analis-verification",
        icon: ShieldCheck,
      },
      {
        id: "analisis",
        title: "Analisis",
        url: "/dashboard/analis-analysis",
        icon: Search,
      },
      {
        id: "eskalasi",
        title: "Eskalasi",
        url: "/dashboard/analis-escalation",
        icon: Database,
      },
      {
        id: "peringatan-dini",
        title: "Peringatan Dini",
        url: "/dashboard/operator-alerts",
        icon: AlertTriangle,
      },
    ],
  },
];

export const koordinatorSidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "OPERASIONAL",
    items: [
      {
        id: "monitoring-wilayah",
        title: "Monitoring Wilayah",
        url: "/dashboard/koordinator-monitoring",
        icon: MapPin,
      },
      {
        id: "monitoring-personel",
        title: "Monitoring Personel",
        url: "/dashboard/koordinator-personnel",
        icon: Users,
      },
    ],
  },
];

export const operatorSidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "OPERASIONAL",
    items: [
      {
        id: "command-center",
        title: "Command Center",
        url: "/dashboard/operator-cc",
        icon: Monitor,
      },
      {
        id: "alert-center",
        title: "Peringatan Dini",
        url: "/dashboard/operator-alerts",
        icon: AlertTriangle,
      },
    ],
  },
];

export const personelSidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "OPERASIONAL",
    items: [
      {
        id: "buat-laporan",
        title: "Buat Laporan",
        url: "/dashboard/field-report",
        icon: FileText,
      },
      {
        id: "kpi-pribadi",
        title: "KPI Pribadi",
        url: "/dashboard/field-kpi",
        icon: Target,
      },
      {
        id: "panic-button",
        title: "Panic Button",
        url: "/dashboard/field-panic",
        icon: Radio,
      },
    ],
  },
];
