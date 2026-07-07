import {
  Globe,
  Map,
  LayoutDashboard,
  Target,
  Database,
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
        id: "seluruh-indonesia",
        title: "Seluruh Indonesia",
        url: "/dashboard/indonesia",
        icon: Globe,
      },
      {
        id: "seluruh-binda",
        title: "Seluruh BINDA",
        url: "/dashboard/regional",
        icon: Map,
      },
      {
        id: "dashboard-nasional",
        title: "Dashboard Nasional",
        url: "/dashboard/default",
        icon: LayoutDashboard,
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
    ],
  },
];
