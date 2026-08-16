import { apiServerGet } from "@/lib/api/server-client";
import { requireRole } from "@/lib/auth/server-session";
import type { SystemRole } from "@/navigation/sidebar/system-roles";

import { ExecutiveDashboardPage } from "../executive-dashboard/executive-dashboard-page";
import { DashboardStatsClient } from "./dashboard-stats-client";
import type { DashboardBriefingData } from "./dashboard-stats-types";

type DashboardStatsPageProps = {
  role: SystemRole;
  searchParams?: Record<string, string | string[] | undefined>;
};

export async function DashboardStatsPage({ role, searchParams }: DashboardStatsPageProps) {
  if (role === "executive" || role === "regional_commander" || role === "field_coordinator") {
    return <ExecutiveDashboardPage role={role} searchParams={searchParams} />;
  }

  await requireRole(role);

  let initialData: DashboardBriefingData | null = null;
  let initialError: string | null = null;

  try {
    initialData = await apiServerGet<DashboardBriefingData>("/dashboard/briefing");
  } catch {
    initialError = "Data dashboard belum dapat dimuat. Gunakan tombol refresh setelah layanan backend tersedia.";
  }

  return <DashboardStatsClient initialData={initialData} initialError={initialError} role={role} />;
}
