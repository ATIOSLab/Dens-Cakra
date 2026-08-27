import { cn } from "@/lib/utils";

import type { KpiComparison } from "./kpi-types";

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

export function formatPercent(value: number): string {
  return `${new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

export function formatDurationMinutes(value: number): string {
  if (value < 60) return `${value} menit`;
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes > 0 ? `${hours} jam ${minutes} menit` : `${hours} jam`;
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "Belum tercatat";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Belum tercatat";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(date);
}

/** Konteks arah perubahan: naik belum tentu baik (mis. anomali). */
export type KpiTone = "neutral" | "positive" | "negative" | "warning";

export function comparisonTone(direction: KpiComparison["direction"], metricTone: string): KpiTone {
  if (direction === "flat") return "neutral";
  const up = direction === "up";
  if (metricTone === "danger" || metricTone === "warning") return up ? "negative" : "positive";
  if (metricTone === "positive") return up ? "positive" : "negative";
  return "neutral";
}

export const KPI_TONE_CLASSES: Record<KpiTone, string> = {
  neutral: "text-slate-600 dark:text-slate-300",
  positive: "text-emerald-600 dark:text-emerald-300",
  negative: "text-rose-600 dark:text-rose-300",
  warning: "text-amber-600 dark:text-amber-300",
};

export function comparisonLabel(comparison: KpiComparison): string {
  if (comparison.percent === null) {
    return comparison.direction === "flat"
      ? "Tetap"
      : `${comparison.delta > 0 ? "+" : ""}${formatNumber(comparison.delta)} dari periode sebelumnya`;
  }
  const sign = comparison.delta > 0 ? "+" : "";
  return `${sign}${formatPercent(comparison.percent)} dari periode sebelumnya`;
}

export const CARD_LABELS: Record<string, string> = {
  totalJaring: "Total Jaring yang Diajukan",
  verifiedJaring: "Total Jaring Terverifikasi",
  activeJaring: "Total Jaring Aktif",
  inactiveJaring: "Total Jaring Tidak Aktif",
  productiveJaring: "Jaring Produktif",
  notReportingJaring: "Jaring Belum Mengirim Laporan",
  productivityPercent: "Persentase Produktivitas",
  totalReports: "Total Laporan Jaring",
  reportsToBaket: "Laporan Menjadi Baket",
  baketManual: "Baket Manual",
  failedReports: "Laporan Gagal",
  verifiedKendala: "Kendala Terverifikasi",
  anomalies: "Anomali Pelaporan",
};

export const CARD_DESCRIPTIONS: Record<string, string> = {
  totalJaring: "Seluruh Jaring yang diajukan dan terdata dalam cakupan wilayah pengguna.",
  verifiedJaring: "Jaring disetujui (APPROVED), baik yang aktif maupun tidak aktif.",
  activeJaring: "Jaring terverifikasi (APPROVED) yang melapor dalam 90 hari terakhir.",
  inactiveJaring: "Jaring terverifikasi (APPROVED) yang tidak melapor dalam 90 hari terakhir.",
  productiveJaring: "Jaring Aktif Terverifikasi yang mengirim minimal satu Laporan Jaring valid.",
  notReportingJaring: "Jaring Aktif Terverifikasi tanpa Laporan Jaring valid pada periode.",
  productivityPercent: "Rasio Jaring Produktif terhadap Jaring Aktif Terverifikasi.",
  totalReports: "Jumlah sesi Laporan Jaring unik yang dikirim pada periode.",
  reportsToBaket: "Laporan Jaring yang sudah diolah menjadi Bahan Keterangan (Baket).",
  baketManual: "Baket yang dibuat tanpa relasi sumber Laporan Jaring.",
  failedReports: "Laporan yang gagal atau tidak selesai pada periode.",
  verifiedKendala: "Kejadian gangguan WhatsApp Center yang terekam pada log perangkat.",
  anomalies: "Jumlah kejadian anomali pelaporan yang terdeteksi pada periode.",
};

export function cardLabel(key: string): string {
  return CARD_LABELS[key] ?? key;
}

export function cardDescription(key: string): string {
  return CARD_DESCRIPTIONS[key] ?? "Metrik evaluasi kinerja Jaring.";
}

export function toneTextClass(tone: KpiTone): string {
  return cn("font-semibold", KPI_TONE_CLASSES[tone]);
}

/** Konversi timestamp ISO ke tanggal Jakarta (YYYY-MM-DD) agar sinkron dengan halaman tujuan. */
export function toJakartaDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * Bangun URL drill-down yang membawa filter aktif (periode, wilayah, pencarian)
 * agar data pada halaman tujuan sinkron dengan angka KPI yang ditampilkan.
 */
export function buildDrilldownUrl(
  base: string | null | undefined,
  period: { from?: string; to?: string } | null | undefined,
  filters: { areaId?: string; search?: string },
): string | null {
  if (!base) return null;
  const [path, existingQuery] = base.split("?");
  const params = new URLSearchParams(existingQuery ?? "");
  if (period?.from) params.set("from", toJakartaDate(period.from));
  if (period?.to) params.set("to", toJakartaDate(period.to));
  if (filters.areaId) params.set("areaId", filters.areaId);
  if (filters.search) params.set("search", filters.search);
  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}
