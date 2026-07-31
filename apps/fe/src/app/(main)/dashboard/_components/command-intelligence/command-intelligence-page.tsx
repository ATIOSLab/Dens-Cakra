import { apiServerGet } from "@/lib/api/server-client";
import { requireRole } from "@/lib/auth/server-session";
import type { SystemRole } from "@/navigation/sidebar/system-roles";

import { CommandIntelligenceClient } from "./command-intelligence-client";
import type { FieldIntelligenceDashboard } from "./types";

type CommandIntelligencePageProps = {
  role: SystemRole;
};

export async function CommandIntelligencePage({ role }: CommandIntelligencePageProps) {
  await requireRole(role);

  let initialData: FieldIntelligenceDashboard | null = null;
  let initialError: string | null = null;
  try {
    initialData = await apiServerGet<FieldIntelligenceDashboard>("/dashboard/field-intelligence", {
      page: 1,
      limit: 12,
      period: "30d",
    });
  } catch {
    initialError = "Data komando belum dapat dimuat. Gunakan tombol muat ulang setelah layanan backend tersedia.";
  }

  return <CommandIntelligenceClient initialData={initialData} initialError={initialError} role={role} />;
}
