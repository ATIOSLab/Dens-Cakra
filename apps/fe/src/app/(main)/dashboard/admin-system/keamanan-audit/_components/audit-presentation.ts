export const CATEGORY_LABELS: Record<string, string> = {
  ACTIVITY: "Aktivitas Pengguna",
  AUTHENTICATION: "Autentikasi",
  SECURITY: "Keamanan & Akses",
  ADMINISTRATION: "Administrasi Sistem",
  DATA_ACCESS: "Akses & Ekspor Data",
  INTELLIGENCE_OPERATION: "Operasi Intelijen",
  INTEGRATION: "Integrasi",
  SYSTEM: "Sistem",
};

export const SEVERITY_LABELS: Record<string, string> = {
  INFO: "Informasi",
  LOW: "Rendah",
  MEDIUM: "Sedang",
  HIGH: "Tinggi",
  CRITICAL: "Kritis",
};

export const OUTCOME_LABELS: Record<string, string> = {
  SUCCESS: "Berhasil",
  FAILURE: "Gagal",
  DENIED: "Ditolak",
};

export function formatAuditDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

export function formatIpAddress(value: string | null | undefined) {
  if (!value?.trim() || ["::", "0.0.0.0"].includes(value.trim().toLowerCase())) return "-";
  return value;
}

export function actorName(actor: { fullName?: string | null; username?: string | null } | null | undefined) {
  return actor?.fullName ?? actor?.username ?? "Sistem / anonim";
}

export function severityClass(severity: string) {
  if (severity === "CRITICAL") return "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  if (severity === "HIGH") return "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300";
  if (severity === "MEDIUM") return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (severity === "LOW") return "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  return "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300";
}

export function outcomeClass(outcome: string) {
  if (outcome === "DENIED") return "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  if (outcome === "FAILURE") return "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300";
  return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
}

export function categoryClass(category: string) {
  if (category === "SECURITY" || category === "AUTHENTICATION") {
    return "border-violet-500/35 bg-violet-500/10 text-violet-700 dark:text-violet-300";
  }
  if (category === "INTELLIGENCE_OPERATION") {
    return "border-cyan-500/35 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300";
  }
  if (category === "ADMINISTRATION") {
    return "border-blue-500/35 bg-blue-500/10 text-blue-700 dark:text-blue-300";
  }
  if (category === "INTEGRATION") {
    return "border-teal-500/35 bg-teal-500/10 text-teal-700 dark:text-teal-300";
  }
  return "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300";
}
