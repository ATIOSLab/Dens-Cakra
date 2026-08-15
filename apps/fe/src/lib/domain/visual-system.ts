import {
  Archive,
  BellRing,
  BrainCircuit,
  ChartColumn,
  ClipboardList,
  Command,
  FileText,
  Inbox,
  LayoutDashboard,
  type LucideIcon,
  MapPinned,
  Network,
  Radar,
  ShieldCheck,
  Users,
} from "lucide-react";

export type DomainVisualKey =
  | "home"
  | "command"
  | "monitoring"
  | "intelligenceNetworkMap"
  | "performance"
  | "briefing"
  | "jaringReport"
  | "baket"
  | "intelligenceReport"
  | "jaring"
  | "gaswil"
  | "admin"
  | "user"
  | "notification";

export type DomainVisual = {
  Icon: LucideIcon;
  label: string;
  tone: "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate";
  colorClass: string;
  iconClass: string;
  markerColor: string;
};

export const DOMAIN_VISUALS = {
  home: {
    Icon: LayoutDashboard,
    label: "Beranda",
    tone: "cyan",
    colorClass: "text-cyan-300",
    iconClass: "text-cyan-400",
    markerColor: "#0ea5e9",
  },
  command: {
    Icon: Command,
    label: "Pusat Komando",
    tone: "slate",
    colorClass: "text-slate-200",
    iconClass: "text-slate-400",
    markerColor: "#64748b",
  },
  monitoring: {
    Icon: Radar,
    label: "Monitoring",
    tone: "cyan",
    colorClass: "text-cyan-300",
    iconClass: "text-cyan-400",
    markerColor: "#0ea5e9",
  },
  intelligenceNetworkMap: {
    Icon: MapPinned,
    label: "Peta Jejaring Intelijen",
    tone: "cyan",
    colorClass: "text-cyan-300",
    iconClass: "text-cyan-400",
    markerColor: "#0ea5e9",
  },
  performance: {
    Icon: ChartColumn,
    label: "Kinerja & Evaluasi",
    tone: "cyan",
    colorClass: "text-cyan-300",
    iconClass: "text-cyan-400",
    markerColor: "#0ea5e9",
  },
  briefing: {
    Icon: ClipboardList,
    label: "Laporan & Briefing",
    tone: "slate",
    colorClass: "text-slate-200",
    iconClass: "text-slate-400",
    markerColor: "#64748b",
  },
  jaringReport: {
    Icon: Inbox,
    label: "Laporan Jaring",
    tone: "cyan",
    colorClass: "text-cyan-300",
    iconClass: "text-cyan-400",
    markerColor: "#0ea5e9",
  },
  baket: {
    Icon: Archive,
    label: "Bahan Keterangan (Baket)",
    tone: "violet",
    colorClass: "text-violet-300",
    iconClass: "text-violet-400",
    markerColor: "#7c3aed",
  },
  intelligenceReport: {
    Icon: FileText,
    label: "Laporan Intelijen",
    tone: "emerald",
    colorClass: "text-emerald-300",
    iconClass: "text-emerald-400",
    markerColor: "#10b981",
  },
  jaring: {
    Icon: Network,
    label: "Jaring",
    tone: "cyan",
    colorClass: "text-cyan-300",
    iconClass: "text-cyan-400",
    markerColor: "#0ea5e9",
  },
  gaswil: {
    Icon: Users,
    label: "Petugas Wilayah (Gaswil)",
    tone: "emerald",
    colorClass: "text-emerald-300",
    iconClass: "text-emerald-400",
    markerColor: "#22c55e",
  },
  admin: {
    Icon: ShieldCheck,
    label: "Administrasi Sistem",
    tone: "amber",
    colorClass: "text-amber-300",
    iconClass: "text-amber-400",
    markerColor: "#f59e0b",
  },
  user: {
    Icon: Users,
    label: "Pengguna",
    tone: "slate",
    colorClass: "text-slate-200",
    iconClass: "text-slate-400",
    markerColor: "#64748b",
  },
  notification: {
    Icon: BellRing,
    label: "Notifikasi",
    tone: "amber",
    colorClass: "text-amber-300",
    iconClass: "text-amber-400",
    markerColor: "#f59e0b",
  },
} as const satisfies Record<DomainVisualKey, DomainVisual>;

export const SUPPORT_VISUALS = {
  analysis: { Icon: BrainCircuit, iconClass: "text-violet-400" },
  table: { Icon: ClipboardList, iconClass: "text-cyan-400" },
} as const;

export const URGENCY_VISUALS = {
  URGENT: { label: "Mendesak", colorClass: "text-rose-300", markerColor: "#e11d48" },
  HIGH: { label: "Tinggi", colorClass: "text-amber-300", markerColor: "#f59e0b" },
  NORMAL: { label: "Normal", colorClass: "text-emerald-300", markerColor: "#10b981" },
  LOW: { label: "Rendah", colorClass: "text-cyan-300", markerColor: "#0ea5e9" },
} as const;

export const PERSONNEL_LOCATION_VISUALS = {
  ONLINE: { label: "Aktif", colorClass: "text-emerald-300", markerColor: "#22c55e" },
  OFFLINE: { label: "Tidak Terhubung", colorClass: "text-slate-400", markerColor: "#64748b" },
} as const;

export const DC_TYPOGRAPHY = {
  pageTitle: "font-sans text-3xl font-semibold tracking-normal text-foreground",
  sectionTitle: "font-sans text-lg font-semibold tracking-normal text-foreground",
  cardTitle: "font-sans text-sm font-semibold tracking-normal text-foreground",
  body: "font-sans text-sm leading-6 text-muted-foreground",
  tableHeader: "font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
  metadata: "font-mono text-xs leading-5 text-muted-foreground",
  control: "font-sans text-sm font-medium tracking-normal",
} as const;

export const DC_CONTROLS = {
  input:
    "h-9 rounded-md border border-input bg-background/40 px-3 text-sm leading-5 text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/25 dark:hover:bg-input/45",
  selectTrigger:
    "h-9 rounded-md border border-input bg-background/40 px-2.5 text-sm leading-5 text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/25 dark:hover:bg-input/45",
  selectItem: "min-h-8 rounded-md px-2.5 py-1.5 text-sm leading-5 hover:bg-accent focus:bg-accent/80",
  card: "rounded-md border border-border/80 bg-card text-card-foreground shadow-[var(--dc-shadow-card)]",
} as const;
