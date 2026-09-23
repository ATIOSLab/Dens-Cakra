export const REPORT_PERIOD_PRESETS = [
  { value: "CURRENT_MONTH", label: "Bulan Berjalan (September 2026)" },
  { value: "LAST_7_DAYS", label: "7 Hari Terakhir" },
  { value: "LAST_14_DAYS", label: "14 Hari Terakhir" },
  { value: "LAST_30_DAYS", label: "30 Hari Terakhir" },
  { value: "TODAY", label: "Hari Ini" },
  { value: "CURRENT_YEAR", label: "Tahun Berjalan (2026)" },
  { value: "CUSTOM", label: "Rentang Kustom (Pilih Tanggal)" },
] as const;

export const REPORT_DKI_REGENCY_OPTIONS = [
  { value: "ALL", label: "Seluruh Wilayah DKI Jakarta (6 Kota/Kabupaten)" },
  { value: "31.71", label: "Kota Administrasi Jakarta Pusat" },
  { value: "31.72", label: "Kota Administrasi Jakarta Utara" },
  { value: "31.73", label: "Kota Administrasi Jakarta Barat" },
  { value: "31.74", label: "Kota Administrasi Jakarta Selatan" },
  { value: "31.75", label: "Kota Administrasi Jakarta Timur" },
  { value: "31.01", label: "Kabupaten Administrasi Kepulauan Seribu" },
] as const;

export function computeReportPresetDates(preset: string): { start: string; end: string } {
  const now = new Date();
  const formatYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const todayStr = formatYMD(now);

  switch (preset) {
    case "TODAY":
      return { start: todayStr, end: todayStr };
    case "LAST_7_DAYS": {
      const d = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      return { start: formatYMD(d), end: todayStr };
    }
    case "LAST_14_DAYS": {
      const d = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);
      return { start: formatYMD(d), end: todayStr };
    }
    case "LAST_30_DAYS": {
      const d = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      return { start: formatYMD(d), end: todayStr };
    }
    case "CURRENT_MONTH": {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: formatYMD(startOfMonth), end: todayStr };
    }
    case "CURRENT_YEAR": {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return { start: formatYMD(startOfYear), end: todayStr };
    }
    default:
      return { start: "2026-09-01", end: todayStr };
  }
}

export function formatReportDateIndo(dateStr: string): string {
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}
