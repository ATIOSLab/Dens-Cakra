import type { SystemRole } from "@/navigation/sidebar/system-roles";

/* ── Response shape from GET /dashboard/briefing ── */

export type DashboardOverviewCards = {
  bakets: number;
  tasks: number;
  directives: number;
  products: number;
  alerts: number;
  emergencies: number;
};

export type DashboardKpis = {
  completionRate: number;
  verificationStatuses: Record<string, number>;
  approvalBacklog: number;
  taskStatuses: Record<string, number>;
};

export type DashboardProductStatusItem = {
  status: string;
  _count: number;
};

export type DashboardAlertItem = {
  id: string;
  title: string;
  severity: string;
  status: string;
  createdAt: string;
  area?: { id: string; name: string } | null;
};

export type DashboardEmergencyItem = {
  id: string;
  title: string;
  severity: string;
  status: string;
  createdAt: string;
  area?: { id: string; name: string } | null;
};

export type DashboardBriefingData = {
  generatedAt: string;
  overview: {
    filters: Record<string, unknown>;
    cards: DashboardOverviewCards;
  };
  kpis: DashboardKpis;
  productStatus: DashboardProductStatusItem[] | Record<string, number>;
  priorityAlerts: DashboardAlertItem[];
  priorityEmergencies: DashboardEmergencyItem[];
};

/* ── Role-aware visibility config ── */

export type DashboardSection = "summaryCards" | "kpis" | "taskPipeline" | "alerts" | "emergencies" | "products";

export const ROLE_SECTIONS: Record<SystemRole, DashboardSection[]> = {
  executive: ["summaryCards", "kpis", "taskPipeline", "alerts", "emergencies", "products"],
  regional_commander: ["summaryCards", "kpis", "taskPipeline", "alerts", "emergencies", "products"],
  operational_intelligence_manager: ["summaryCards", "kpis", "taskPipeline", "alerts", "emergencies", "products"],
  field_coordinator: ["summaryCards", "kpis", "taskPipeline", "alerts", "emergencies"],
  field_officer: ["summaryCards", "taskPipeline"],
  admin_system: ["summaryCards"],
};
