/**
 * Satu sumber kebenaran untuk definisi metrik, pemetaan status Jaring, dan
 * pemetaan tahap pengolahan Laporan Jaring pada menu KPI DENS CAKRA.
 *
 * File ini dipakai oleh dashboard KPI, ekspor, dan (melalui meta API) tooltip
 * frontend agar seluruh angka dihitung dengan cara yang sama.
 */

import {
  JaringRegistrationStatus,
  JaringStatus,
  WhatsAppMessageStatus,
} from '../../generated/prisma/client.js';

/**
 * Kelompok status Jaring (lapisan presentasi). Nilai teknis database
 * (`status` + `registrationStatus`) dipetakan ke istilah resmi tanpa mengubah
 * makna data. Lihat docs/DENS_CAKRA_GLOSSARY_SYSTEM.md.
 */
export const JARING_STATUS_GROUP = {
  ACTIVE_VERIFIED: 'ACTIVE_VERIFIED',
  VERIFIED_INACTIVE: 'VERIFIED_INACTIVE',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  REJECTED: 'REJECTED',
  UNVERIFIED: 'UNVERIFIED',
  OTHER: 'OTHER',
} as const;

export type JaringStatusGroup =
  (typeof JARING_STATUS_GROUP)[keyof typeof JARING_STATUS_GROUP];

export const JARING_STATUS_GROUP_LABELS: Record<JaringStatusGroup, string> = {
  [JARING_STATUS_GROUP.ACTIVE_VERIFIED]: 'Jaring Aktif Terverifikasi',
  [JARING_STATUS_GROUP.VERIFIED_INACTIVE]: 'Terverifikasi tetapi Nonaktif',
  [JARING_STATUS_GROUP.PENDING_APPROVAL]: 'Menunggu Persetujuan',
  [JARING_STATUS_GROUP.REJECTED]: 'Ditolak',
  [JARING_STATUS_GROUP.UNVERIFIED]: 'Belum Terverifikasi',
  [JARING_STATUS_GROUP.OTHER]: 'Status Lainnya',
};

export const JARING_STATUS_GROUP_DESCRIPTIONS: Record<
  JaringStatusGroup,
  string
> = {
  [JARING_STATUS_GROUP.ACTIVE_VERIFIED]:
    'Sudah disetujui (APPROVED) dan berstatus aktif (ACTIVE). Menjadi basis perhitungan produktivitas.',
  [JARING_STATUS_GROUP.VERIFIED_INACTIVE]:
    'Sudah disetujui (APPROVED) tetapi berstatus nonaktif, pindah, atau arsip. Tidak masuk basis produktivitas.',
  [JARING_STATUS_GROUP.PENDING_APPROVAL]:
    'Registrasi masuk dan belum disetujui (PENDING). Tidak masuk basis produktivitas.',
  [JARING_STATUS_GROUP.REJECTED]:
    'Registrasi atau verifikasinya ditolak (REJECTED). Tidak masuk basis produktivitas.',
  [JARING_STATUS_GROUP.UNVERIFIED]:
    'Belum menyelesaikan proses verifikasi. Pada model data saat ini setara dengan Menunggu Persetujuan (PENDING).',
  [JARING_STATUS_GROUP.OTHER]:
    'Kombinasi status aktual yang belum terpetakan. Ditampilkan sebagai indikator kualitas data.',
};

/** Status WhatsAppMessage yang dianggap laporan valid (bukan duplikat/spam/error). */
export const VALID_REPORT_MESSAGE_STATUSES: WhatsAppMessageStatus[] = [
  WhatsAppMessageStatus.RECEIVED,
  WhatsAppMessageStatus.ROUTED,
  WhatsAppMessageStatus.UNDER_REVIEW,
  WhatsAppMessageStatus.READY_FOR_BAKET,
  WhatsAppMessageStatus.PROCESSED,
];

/** Status WhatsAppMessage yang dianggap anomali/duplikat. */
export const INVALID_REPORT_MESSAGE_STATUSES: WhatsAppMessageStatus[] = [
  WhatsAppMessageStatus.DUPLICATE,
  WhatsAppMessageStatus.SPAM,
  WhatsAppMessageStatus.ERROR,
  WhatsAppMessageStatus.UNKNOWN_SENDER,
];

/** Tahap pengolahan Laporan Jaring (lapisan presentasi). */
export const REPORT_PROCESS_STAGE = {
  IN_PROGRESS: 'IN_PROGRESS',
  READY_FOR_BAKET: 'READY_FOR_BAKET',
  BAKET_CREATED: 'BAKET_CREATED',
  FAILED: 'FAILED',
} as const;

export type ReportProcessStage =
  (typeof REPORT_PROCESS_STAGE)[keyof typeof REPORT_PROCESS_STAGE];

export const REPORT_PROCESS_STAGE_LABELS: Record<ReportProcessStage, string> = {
  [REPORT_PROCESS_STAGE.IN_PROGRESS]: 'Dalam proses',
  [REPORT_PROCESS_STAGE.READY_FOR_BAKET]: 'Siap Dibuat Baket',
  [REPORT_PROCESS_STAGE.BAKET_CREATED]: 'Baket Dibuat',
  [REPORT_PROCESS_STAGE.FAILED]: 'Gagal/tidak selesai',
};

/** Memetakan pasangan status aktual ke kelompok status resmi. */
export function classifyJaringStatus(
  status: JaringStatus,
  registrationStatus: JaringRegistrationStatus,
): JaringStatusGroup {
  if (
    registrationStatus === JaringRegistrationStatus.APPROVED &&
    status === JaringStatus.ACTIVE
  ) {
    return JARING_STATUS_GROUP.ACTIVE_VERIFIED;
  }
  if (registrationStatus === JaringRegistrationStatus.APPROVED) {
    return JARING_STATUS_GROUP.VERIFIED_INACTIVE;
  }
  if (registrationStatus === JaringRegistrationStatus.PENDING) {
    return JARING_STATUS_GROUP.PENDING_APPROVAL;
  }
  if (registrationStatus === JaringRegistrationStatus.REJECTED) {
    return JARING_STATUS_GROUP.REJECTED;
  }
  return JARING_STATUS_GROUP.OTHER;
}

/** Daftar kelompok status yang menjadi basis produktivitas. */
export const PRODUCTIVITY_BASIS_GROUPS: JaringStatusGroup[] = [
  JARING_STATUS_GROUP.ACTIVE_VERIFIED,
];

export type KpiComparison = {
  previous: number;
  delta: number;
  percent: number | null;
  direction: 'up' | 'down' | 'flat';
};

export function compareMetric(
  current: number,
  previous: number,
): KpiComparison {
  const delta = current - previous;
  return {
    previous,
    delta,
    percent: previous === 0 ? null : Math.round((delta / previous) * 1000) / 10,
    direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
  };
}

export function percentage(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

/** Definisi metrik KPI sebagai sumber kebenaran (dipakai dashboard + ekspor + tooltip). */
export type KpiMetricDefinition = {
  key: string;
  label: string;
  description: string;
  formula: string;
  format: 'number' | 'percentage';
  entity: string;
  drilldown: string | null;
};

export const KPI_METRIC_DEFINITIONS: KpiMetricDefinition[] = [
  {
    key: 'totalJaring',
    label: 'Total Jaring yang Diajukan',
    description:
      'Jumlah seluruh Jaring yang diajukan dan terdata dalam cakupan wilayah pengguna.',
    formula: 'countDistinct(Jaring.id) dalam cakupan',
    format: 'number',
    entity: 'Jaring',
    drilldown: '/dashboard/daftar-jaring',
  },
  {
    key: 'verifiedJaring',
    label: 'Total Jaring Terverifikasi',
    description:
      'Jaring dengan status disetujui (APPROVED), baik yang aktif maupun tidak aktif.',
    formula: 'registrationStatus=APPROVED',
    format: 'number',
    entity: 'Jaring',
    drilldown: '/dashboard/daftar-jaring?registrationStatus=APPROVED',
  },
  {
    key: 'activeJaring',
    label: 'Total Jaring Aktif',
    description:
      'Jaring terverifikasi (APPROVED) yang melapor dalam 90 hari terakhir (status operasional).',
    formula: 'registrationStatus=APPROVED AND lastReportAt ≥ 90 hari terakhir',
    format: 'number',
    entity: 'Jaring',
    drilldown:
      '/dashboard/daftar-jaring?registrationStatus=APPROVED&activityStatus=ACTIVE',
  },
  {
    key: 'inactiveJaring',
    label: 'Total Jaring Tidak Aktif',
    description:
      'Jaring terverifikasi (APPROVED) yang tidak melapor dalam 90 hari terakhir (status operasional).',
    formula: 'registrationStatus=APPROVED AND lastReportAt < 90 hari terakhir',
    format: 'number',
    entity: 'Jaring',
    drilldown:
      '/dashboard/daftar-jaring?registrationStatus=APPROVED&activityStatus=INACTIVE',
  },
  {
    key: 'activeVerifiedJaring',
    label: 'Jaring Aktif Terverifikasi',
    description:
      'Jaring disetujui (APPROVED) dan berstatus aktif (ACTIVE). Basis perhitungan produktivitas.',
    formula: 'registrationStatus=APPROVED AND status=ACTIVE',
    format: 'number',
    entity: 'Jaring',
    drilldown: '/dashboard/daftar-jaring?registrationStatus=APPROVED',
  },
  {
    key: 'productiveJaring',
    label: 'Jaring Produktif',
    description:
      'Jaring Aktif Terverifikasi yang mengirim minimal satu Laporan Jaring valid pada periode.',
    formula: 'countDistinct(jaringId) dari Laporan Jaring valid',
    format: 'number',
    entity: 'Jaring',
    drilldown: '/dashboard/laporan-jaring',
  },
  {
    key: 'notReportingJaring',
    label: 'Jaring Belum Mengirim Laporan',
    description:
      'Jaring Aktif Terverifikasi tanpa Laporan Jaring valid pada periode.',
    formula: 'Aktif Terverifikasi − Produktif',
    format: 'number',
    entity: 'Jaring',
    drilldown: '/dashboard/daftar-jaring?activityStatus=ACTIVE',
  },
  {
    key: 'productivityPercent',
    label: 'Persentase Produktivitas',
    description: 'Rasio Jaring Produktif terhadap Jaring Aktif Terverifikasi.',
    formula: '(Produktif ÷ Aktif Terverifikasi) × 100%',
    format: 'percentage',
    entity: 'Jaring',
    drilldown: null,
  },
  {
    key: 'totalReports',
    label: 'Total Laporan Jaring',
    description: 'Jumlah sesi Laporan Jaring unik yang dikirim pada periode.',
    formula: 'countDistinct(WhatsAppReportSession.id)',
    format: 'number',
    entity: 'WhatsAppReportSession',
    drilldown: '/dashboard/laporan-jaring',
  },
  {
    key: 'reportsToBaket',
    label: 'Laporan Menjadi Baket',
    description:
      'Laporan Jaring yang sudah diolah menjadi Bahan Keterangan (Baket), dihitung satu kali per laporan.',
    formula: 'countDistinct(sesi dengan relasi Baket)',
    format: 'number',
    entity: 'Baket',
    drilldown: '/dashboard/baket',
  },
  {
    key: 'verifiedKendala',
    label: 'Kendala Terverifikasi',
    description:
      'Kejadian gangguan WhatsApp Center yang terekam pada log perangkat.',
    formula: 'count(kejadian gangguan dari log)',
    format: 'number',
    entity: 'WhatsAppDeviceActivityLog',
    drilldown: null,
  },
  {
    key: 'anomalies',
    label: 'Anomali Pelaporan',
    description:
      'Jumlah kejadian anomali pelaporan yang terdeteksi pada periode.',
    formula: 'count(kejadian anomali)',
    format: 'number',
    entity: 'Anomali',
    drilldown: null,
  },
];

/** Format angka gaya Indonesia (mis. 1.465) tanpa merusak desimal. */
export function formatIndonesianNumber(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value);
}

export function formatIndonesianPercent(value: number): string {
  return `${new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

/** Menyamarkan nomor telepon: +62 812-****-1234. */
export function maskPhone(value?: string | null): string {
  if (!value) return '-';
  const digits = value.replace(/\D/g, '');
  const national = digits.startsWith('62')
    ? digits.slice(2)
    : digits.startsWith('0')
      ? digits.slice(1)
      : digits;
  if (national.length < 7) return '••••••';
  return `+62 ${national.slice(0, 3)}-****-${national.slice(-4)}`;
}

/** Pilihan filter KPI (sumber kebenaran tunggal, dikirim lewat endpoint filters). */
export type KpiFilterOption = { value: string; label: string };

export const KPI_PERIOD_OPTIONS: KpiFilterOption[] = [
  { value: 'TODAY', label: 'Hari ini' },
  { value: 'YESTERDAY', label: 'Kemarin' },
  { value: 'LAST_7_DAYS', label: '7 hari terakhir' },
  { value: 'LAST_14_DAYS', label: '14 hari terakhir' },
  { value: 'LAST_30_DAYS', label: '30 hari terakhir' },
  { value: 'THIS_WEEK', label: 'Minggu berjalan' },
  { value: 'PREVIOUS_WEEK', label: 'Minggu sebelumnya' },
  { value: 'THIS_MONTH', label: 'Bulan berjalan' },
  { value: 'PREVIOUS_MONTH', label: 'Bulan sebelumnya' },
  { value: 'THIS_YEAR', label: 'Tahun berjalan' },
  { value: 'CUSTOM', label: 'Rentang tanggal khusus' },
];

export const KPI_JARING_STATUS_OPTIONS: KpiFilterOption[] = [
  { value: 'ALL', label: 'Semua status' },
  { value: 'ACTIVE_VERIFIED', label: 'Aktif Terverifikasi' },
  { value: 'VERIFIED_INACTIVE', label: 'Terverifikasi tetapi Nonaktif' },
  { value: 'PENDING_APPROVAL', label: 'Menunggu Persetujuan' },
  { value: 'REJECTED', label: 'Ditolak' },
  { value: 'UNVERIFIED', label: 'Belum Terverifikasi' },
  { value: 'OTHER', label: 'Status Lainnya' },
  { value: 'PRODUCTIVE', label: 'Produktif' },
  { value: 'NOT_REPORTING', label: 'Belum Mengirim Laporan' },
];

export const KPI_REPORT_STATUS_OPTIONS: KpiFilterOption[] = [
  { value: 'ALL', label: 'Semua Laporan Jaring' },
  { value: 'VALID', label: 'Valid' },
  { value: 'IN_PROGRESS', label: 'Dalam proses' },
  { value: 'READY_FOR_BAKET', label: 'Siap Dibuat Baket' },
  { value: 'BAKET_CREATED', label: 'Menjadi Baket' },
  { value: 'NOT_BAKET', label: 'Belum menjadi Baket' },
  { value: 'FAILED', label: 'Gagal' },
  { value: 'OTHER', label: 'Status lainnya' },
];

export const KPI_BAKET_SOURCE_OPTIONS: KpiFilterOption[] = [
  { value: 'ALL', label: 'Semua Baket' },
  { value: 'FROM_REPORT', label: 'Berasal dari Laporan Jaring' },
  { value: 'MANUAL', label: 'Dibuat manual' },
  { value: 'HAS_SOURCE', label: 'Memiliki relasi sumber' },
  { value: 'NO_SOURCE', label: 'Tidak memiliki relasi sumber' },
];

export const KPI_ANOMALY_OPTIONS: KpiFilterOption[] = [
  { value: 'ALL', label: 'Semua anomali' },
  { value: 'PENDING_REPORTING', label: 'Menunggu persetujuan melapor' },
  { value: 'REJECTED_REPORTING', label: 'Ditolak melapor' },
  { value: 'UNVERIFIED_REPORTING', label: 'Belum terverifikasi melapor' },
  { value: 'INACTIVE_REPORTING', label: 'Nonaktif melapor' },
  { value: 'SENDER_MISMATCH', label: 'Nomor pengirim tidak sesuai' },
  { value: 'DUPLICATE_REPORT', label: 'Duplikasi laporan' },
  { value: 'JARING_WITHOUT_AREA', label: 'Jaring tanpa wilayah' },
  { value: 'UNMAPPED_STATUS', label: 'Status tidak terpetakan' },
  {
    value: 'ACTIVE_VERIFIED_FAILED',
    label: 'Aktif Terverifikasi gagal melapor',
  },
  { value: 'BAKET_WITHOUT_SOURCE', label: 'Baket tanpa sumber' },
];

export const KPI_SORT_BY_OPTIONS: KpiFilterOption[] = [
  { value: 'productivity', label: 'Produktivitas tertinggi' },
  { value: 'reports', label: 'Laporan terbanyak' },
  { value: 'baket', label: 'Baket terbanyak' },
  { value: 'notReporting', label: 'Jaring belum mengirim terbanyak' },
  { value: 'activeVerified', label: 'Aktif Terverifikasi terbanyak' },
];
