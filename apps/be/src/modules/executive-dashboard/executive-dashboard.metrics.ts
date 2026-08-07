import type { ExecutiveDashboardPeriod } from './executive-dashboard.dto.js';

export type DashboardDateRange = {
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
  timezone: 'Asia/Jakarta';
  period: ExecutiveDashboardPeriod;
};

export type MetricDefinition = {
  key: string;
  label: string;
  description: string;
  entity: string;
  dateField: string;
  denominator: string | null;
  permission: string;
  endpoint: string;
  format: 'number' | 'percentage';
  drilldown: string | null;
  cachePolicy: string;
};

export const EXECUTIVE_DASHBOARD_METRICS: MetricDefinition[] = [
  {
    key: 'totalReports',
    label: 'Total Laporan Jaring',
    description:
      'Jumlah sesi laporan Jaring unik yang sudah dikirim pada periode aktif.',
    entity: 'WhatsAppReportSession',
    dateField: 'submittedAt',
    denominator: null,
    permission: 'DomainScopeService.jaringWhere',
    endpoint: 'GET /dashboard/executive',
    format: 'number',
    drilldown: '/dashboard/laporan-jaring',
    cachePolicy: 'private scope, 15 detik',
  },
  {
    key: 'completeReports',
    label: 'Laporan Jaring Lengkap',
    description:
      'Laporan terkirim dengan isi, identitas Jaring, lokasi terselesaikan, dan bukti media.',
    entity: 'WhatsAppReportSession + WhatsAppMessage',
    dateField: 'submittedAt',
    denominator: 'totalReports',
    permission: 'DomainScopeService.jaringWhere',
    endpoint: 'GET /dashboard/executive',
    format: 'percentage',
    drilldown: '/dashboard/laporan-jaring?completeness=COMPLETE',
    cachePolicy: 'private scope, 15 detik',
  },
  {
    key: 'incompleteReports',
    label: 'Laporan Jaring Tidak Lengkap',
    description:
      'Laporan terkirim yang belum memenuhi salah satu unsur kelengkapan resmi.',
    entity: 'WhatsAppReportSession + WhatsAppMessage',
    dateField: 'submittedAt',
    denominator: 'totalReports',
    permission: 'DomainScopeService.jaringWhere',
    endpoint: 'GET /dashboard/executive',
    format: 'percentage',
    drilldown: '/dashboard/laporan-jaring?completeness=INCOMPLETE',
    cachePolicy: 'private scope, 15 detik',
  },
  {
    key: 'verifiedReports',
    label: 'Laporan Jaring Terverifikasi',
    description:
      'Laporan dengan hasil validasi Field Officer VALID; tetap dihitung sebagai laporan, bukan Baket.',
    entity: 'WhatsAppMessage',
    dateField: 'WhatsAppReportSession.submittedAt',
    denominator: 'totalReports',
    permission: 'DomainScopeService.jaringWhere',
    endpoint: 'GET /dashboard/executive',
    format: 'percentage',
    drilldown: '/dashboard/laporan-jaring?verificationStatus=VERIFIED',
    cachePolicy: 'private scope, 15 detik',
  },
  {
    key: 'draftBakets',
    label: 'Draf Baket',
    description:
      'Baket hasil konversi laporan yang status workflow-nya belum VERIFIED.',
    entity: 'Baket',
    dateField: 'WhatsAppReportSession.submittedAt',
    denominator: 'totalReports',
    permission: 'DomainScopeService.baketWhere melalui relasi laporan',
    endpoint: 'GET /dashboard/executive',
    format: 'number',
    drilldown: '/dashboard/laporan-jaring?stage=DRAFT_BAKET',
    cachePolicy: 'private scope, 15 detik',
  },
  {
    key: 'validatedBakets',
    label: 'Baket Tervalidasi',
    description:
      'Baket hasil konversi laporan dengan status workflow VERIFIED.',
    entity: 'Baket',
    dateField: 'WhatsAppReportSession.submittedAt',
    denominator: 'totalReports',
    permission: 'DomainScopeService.baketWhere melalui relasi laporan',
    endpoint: 'GET /dashboard/executive',
    format: 'number',
    drilldown: '/dashboard/laporan-jaring?stage=VALIDATED_BAKET',
    cachePolicy: 'private scope, 15 detik',
  },
  {
    key: 'urgentReports',
    label: 'Laporan Urgent',
    description: 'Laporan yang Baket versi aktifnya memiliki urgensi URGENT.',
    entity: 'BaketVersion',
    dateField: 'WhatsAppReportSession.submittedAt',
    denominator: 'totalReports',
    permission: 'DomainScopeService.jaringWhere',
    endpoint: 'GET /dashboard/executive',
    format: 'number',
    drilldown: '/dashboard/laporan-jaring?urgency=URGENT',
    cachePolicy: 'private scope, 15 detik',
  },
  {
    key: 'informationProducts',
    label: 'Produk Informasi',
    description:
      'Produk intelijen unik dalam cakupan pengguna dan periode aktif.',
    entity: 'IntelligenceProduct',
    dateField: 'createdAt',
    denominator: null,
    permission: 'DomainScopeService.productWhere',
    endpoint: 'GET /dashboard/executive',
    format: 'number',
    drilldown: '/dashboard/produk-intelijen',
    cachePolicy: 'private scope, 15 detik',
  },
  {
    key: 'needsCompletion',
    label: 'Perlu Dilengkapi',
    description:
      'Laporan terkirim yang belum memenuhi unsur kelengkapan resmi.',
    entity: 'WhatsAppReportSession + WhatsAppMessage',
    dateField: 'submittedAt',
    denominator: 'totalReports',
    permission: 'DomainScopeService.jaringWhere',
    endpoint: 'GET /dashboard/executive',
    format: 'number',
    drilldown: '/dashboard/laporan-jaring?completeness=INCOMPLETE',
    cachePolicy: 'private scope, 15 detik',
  },
  {
    key: 'waitingAction',
    label: 'Menunggu Tindakan',
    description:
      'Item yang memerlukan tindakan sesuai role aktif: peninjauan laporan atau approval yang ditugaskan.',
    entity: 'WhatsAppMessage + ProductApprovalStep',
    dateField: 'submittedAt',
    denominator: null,
    permission: 'Scope laporan dan targetAssignmentId pengguna aktif',
    endpoint: 'GET /dashboard/executive',
    format: 'number',
    drilldown: '/dashboard/laporan-jaring?verificationStatus=NEEDS_REVIEW',
    cachePolicy: 'private scope, 15 detik',
  },
];

export function comparison(current: number, previous: number) {
  const delta = current - previous;
  return {
    previous,
    delta,
    percent: previous === 0 ? null : Math.round((delta / previous) * 1000) / 10,
  };
}
