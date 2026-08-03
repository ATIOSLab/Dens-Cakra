import { apiServerGet } from "@/lib/api/server-client";
import { requireRole } from "@/lib/auth/server-session";
import type { SystemRole } from "@/navigation/sidebar/system-roles";

import { DashboardStatsClient } from "./dashboard-stats-client";
import type { DashboardBriefingData } from "./dashboard-stats-types";

type DashboardStatsPageProps = {
  role: SystemRole;
};

export async function DashboardStatsPage({ role }: DashboardStatsPageProps) {
  await requireRole(role);

  let initialData: DashboardBriefingData | null = null;
  let initialError: string | null = null;

  try {
    initialData = await apiServerGet<DashboardBriefingData>("/dashboard/briefing");
  } catch {
    initialError =
      "Data dashboard belum dapat dimuat. Gunakan tombol refresh setelah layanan backend tersedia.";
  }

  return (
    <DashboardStatsClient
      initialData={initialData}
      initialError={initialError}
      role={role}
    />
  );
}
