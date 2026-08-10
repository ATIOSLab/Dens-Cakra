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
    key: 'baketCreatedReports',
    label: 'Baket Dibuat',
    description:
      'Laporan Jaring yang sudah ditindaklanjuti menjadi Bahan Keterangan (Baket).',
    entity: 'Baket',
    dateField: 'WhatsAppReportSession.submittedAt',
    denominator: 'totalReports',
    permission: 'DomainScopeService.jaringWhere',
    endpoint: 'GET /dashboard/executive',
    format: 'percentage',
    drilldown: '/dashboard/baket',
    cachePolicy: 'private scope, 15 detik',
  },
  {
    key: 'draftBakets',
    label: 'Draf Baket',
    description:
      'Baket hasil konversi laporan yang masih berada pada alur kerja awal.',
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
      'Baket hasil konversi laporan dengan status alur kerja tervalidasi.',
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
    label: 'Laporan Mendesak',
    description: 'Laporan yang Baket versi aktifnya memiliki urgensi mendesak.',
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
    label: 'Produk Intelijen',
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
    key: 'waitingAction',
    label: 'Menunggu Tindakan',
    description:
      'Item yang memerlukan tindakan sesuai peran aktif: pembuatan Baket, pengembangan Baket, atau persetujuan yang ditugaskan.',
    entity: 'WhatsAppMessage + ProductApprovalStep',
    dateField: 'submittedAt',
    denominator: null,
    permission: 'Scope laporan dan targetAssignmentId pengguna aktif',
    endpoint: 'GET /dashboard/executive',
    format: 'number',
    drilldown: '/dashboard/laporan-jaring',
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
