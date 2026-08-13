const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktif",
  INACTIVE: "Tidak Aktif",
  APPROVED: "Disetujui",
  PENDING: "Menunggu",
  REJECTED: "Ditolak",
  SUBMITTED: "Terkirim",
  CLOSED: "Ditutup",
  EXPIRED: "Kedaluwarsa",
  CANCELLED: "Dibatalkan",
  LOW: "Rendah",
  NORMAL: "Normal",
  HIGH: "Tinggi",
  URGENT: "Mendesak",
  COMPLETE: "Selesai",
  INCOMPLETE: "Belum Selesai",
  WAITING: "Menunggu Tindakan",
  NEEDS_REVIEW: "Perlu Ditinjau",
  VERIFIED: "Tercatat",
  WAITING_FIELD_OFFICER_VERIFICATION: "Siap Dibuat Baket",
  NEEDS_FIELD_OFFICER_REVIEW: "Perlu Perbaikan",
  VERIFIED_BY_FIELD_OFFICER: "Siap Dibuat Baket",
  READY_FOR_BAKET: "Siap Dibuat Baket",
  BAKET_CREATED: "Laporan Jadi Baket",
  METADATA_RECORDED: "Laporan Jadi Baket",
  DRAFT: "Draf",
  READY_TO_SEND: "Siap Dikirim",
  SENT_TO_OIM: "Dikirim ke OIM",
  UNDER_VERIFICATION: "Dalam Proses",
  NEEDS_DEVELOPMENT: "Perlu Pengembangan",
  IN_PROGRESS: "Sedang Berjalan",
  ASSIGNED: "Ditugaskan",
  COMPLETED: "Selesai",
  PUBLISHED: "Diterbitkan",
  DISTRIBUTED: "Didistribusikan",
  SENT: "Dikirim",
  READ: "Dibaca",
  ACKNOWLEDGED: "Diterima",
  OVERDUE: "Lewat Tenggat",
  REASSIGNED: "Dialihkan",
  WITHIN_SCOPE: "Sesuai Wilayah Penugasan",
  OUTSIDE_SCOPE: "Di Luar Wilayah Penugasan",
  BORDER_AMBIGUOUS: "Batas Wilayah Ambigu",
  NOT_CHECKED: "Belum Diperiksa",
  NOT_DETERMINED: "Belum Ditentukan",
  WITH_ATTACHMENT: "Memiliki Lampiran",
  WITHOUT_ATTACHMENT: "Tanpa Lampiran",
  LAPORAN_JARING: "Laporan Jaring",
  WHATSAPP: "WhatsApp",
  WHATSAPP_LOCATION: "Live Location WhatsApp",
  DEVICE_GPS: "GPS Perangkat",
  MANUAL_PIN: "Pin Manual",
  MANUAL_COORDINATE: "Koordinat Manual",
  CORRECTED_BY_FIELD_OFFICER: "Dikoreksi Petugas Wilayah",
  SYSTEM_DERIVED: "Dihasilkan Sistem",
  NATIONAL: "Nasional",
  PROVINCE: "Provinsi",
  REGENCY: "Kabupaten",
  CITY: "Kota",
  DISTRICT: "Kecamatan",
  VILLAGE: "Kelurahan/Desa",
  URBAN_VILLAGE: "Kelurahan",
};

const ACTION_LABELS: Record<string, string> = {
  "JARING_REPORT.VERIFIED": "Laporan Jaring siap dibuat Baket",
  "JARING_REPORT.METADATA.CREATE": "Baket dibuat dari Laporan Jaring",
  "JARING_REPORT.METADATA.UPDATE": "Baket diperbarui dari Laporan Jaring",
  "WHATSAPP_MESSAGE.CONVERT_TO_BAKET": "Draf Baket dibuat dari laporan",
  "JARING.CREATE": "Jaring dibuat",
  "JARING.UPDATE": "Data Jaring diperbarui",
  "JARING.ACTIVE": "Jaring diaktifkan",
  "JARING.INACTIVE": "Jaring dinonaktifkan",
};

export function formatDashboardNumber(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);
}

export function formatDashboardPercent(value: number) {
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value)}%`;
}

export function formatDashboardDate(value: string | Date | null) {
  if (!value) return "Belum tersedia";
  return `${new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(new Date(value))} WIB`;
}

export function formatDashboardDuration(hours: number | null) {
  if (hours === null) return "Belum tersedia";
  if (hours < 24) return `${formatDashboardNumber(hours)} jam`;
  return `${formatDashboardNumber(Math.round((hours / 24) * 10) / 10)} hari`;
}

export function dashboardStatusLabel(value: string | null | undefined) {
  if (!value) return "Belum tersedia";
  return STATUS_LABELS[value] ?? value.replaceAll("_", " ");
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "var(--dc-success)",
  APPROVED: "var(--dc-success)",
  ACKNOWLEDGED: "var(--dc-success)",
  COMPLETE: "var(--dc-success)",
  COMPLETED: "var(--dc-success)",
  DISTRIBUTED: "var(--dc-success)",
  PUBLISHED: "var(--dc-success)",
  SENT: "var(--dc-success)",
  VERIFIED: "var(--dc-success)",
  VERIFIED_BY_FIELD_OFFICER: "var(--dc-success)",
  BAKET_CREATED: "var(--dc-success)",
  WITHIN_SCOPE: "var(--dc-success)",
  WITH_ATTACHMENT: "var(--dc-success)",
  HIGH: "var(--dc-danger)",
  URGENT: "var(--dc-danger)",
  OVERDUE: "var(--dc-danger)",
  OUTSIDE_SCOPE: "var(--dc-danger)",
  REJECTED: "var(--dc-danger)",
  INCOMPLETE: "var(--dc-warning)",
  NEEDS_REVIEW: "var(--dc-warning)",
  NEEDS_FIELD_OFFICER_REVIEW: "var(--dc-warning)",
  NEEDS_DEVELOPMENT: "var(--dc-warning)",
  WAITING: "var(--dc-warning)",
  WAITING_FIELD_OFFICER_VERIFICATION: "var(--dc-warning)",
  UNDER_VERIFICATION: "var(--dc-warning)",
  BORDER_AMBIGUOUS: "var(--dc-warning)",
  NORMAL: "var(--dc-info)",
  IN_PROGRESS: "var(--dc-info)",
  METADATA_RECORDED: "var(--dc-info)",
  READY_FOR_BAKET: "var(--dc-info)",
  READY_TO_SEND: "var(--dc-info)",
  SENT_TO_OIM: "var(--dc-info)",
  WHATSAPP_LOCATION: "var(--dc-info)",
  DEVICE_GPS: "var(--dc-primary)",
  LOW: "var(--dc-neutral)",
  DRAFT: "var(--dc-neutral)",
  INACTIVE: "var(--dc-neutral)",
  LAPORAN_JARING: "var(--dc-primary)",
  NOT_CHECKED: "var(--dc-neutral)",
  NOT_DETERMINED: "var(--dc-neutral)",
  WITHOUT_ATTACHMENT: "var(--dc-neutral)",
};

export function dashboardStatusColor(value: string | null | undefined, fallback = "var(--dc-primary)") {
  if (!value) return fallback;
  return STATUS_COLORS[value] ?? fallback;
}

export function dashboardActionLabel(value: string) {
  return ACTION_LABELS[value] ?? value.replaceAll(/[._]/g, " ");
}
