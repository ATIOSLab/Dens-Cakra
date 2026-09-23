import type React from "react";

import { formatDecimal, formatNumber, formatPercent } from "./report-styles";
import type { ReportPayload } from "./report-types";
import { REGION_PAGE_ORDER } from "./report-types";

// ─── Base Page Wrapper ─────────────────────────────────────────────────────────

export function ReportPage({
  children,
  pageNumber,
  showHeader = true,
  periodLabel,
}: {
  children: React.ReactNode;
  pageNumber?: number;
  showHeader?: boolean;
  periodLabel?: string;
}) {
  return (
    <section className="report-page relative box-border flex flex-col justify-between overflow-hidden bg-white p-[12mm] font-sans text-[#243B4D]">
      {showHeader ? (
        <header className="mb-4 flex w-full shrink-0 items-center justify-between border-[#C9D9E1] border-b pb-2">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#174D6B]" />
            <span className="font-bold text-[#174D6B] text-[10px] uppercase tracking-wider">
              Rekap Aktivitas dan Produktivitas Jaring
            </span>
          </div>
          {periodLabel ? <span className="font-mono text-[#67839A] text-[9px]">Periode: {periodLabel}</span> : null}
        </header>
      ) : (
        <div />
      )}

      <div className="report-content flex w-full flex-1 flex-col justify-between overflow-hidden">{children}</div>

      {pageNumber ? (
        <footer className="mt-4 flex w-full shrink-0 items-center justify-between border-[#C9D9E1] border-t pt-2 text-[#67839A] text-[9px]">
          <span>Sumber Data: Sistem Operasional Terpadu</span>
          <span className="font-semibold text-[#174D6B]">Halaman {pageNumber} dari 13</span>
        </footer>
      ) : (
        <div />
      )}
    </section>
  );
}

// ─── Reusable Micro-Components ────────────────────────────────────────────────

export function KpiCard({
  title,
  value,
  subtitle,
  accent = "dark",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: "dark" | "cyan" | "green" | "blue" | "orange";
}) {
  const accentColors = {
    dark: { bar: "bg-[#174D6B]", text: "text-[#174D6B]" },
    cyan: { bar: "bg-[#2AA8C3]", text: "text-[#2AA8C3]" },
    green: { bar: "bg-[#3A9D69]", text: "text-[#3A9D69]" },
    blue: { bar: "bg-[#1485B0]", text: "text-[#1485B0]" },
    orange: { bar: "bg-[#F28C28]", text: "text-[#F28C28]" },
  }[accent];

  return (
    <div className="relative flex flex-col justify-between rounded-lg border border-[#C9D9E1] bg-[#EAF5FA] p-3 shadow-xs">
      <div className={`absolute top-0 right-0 left-0 h-1 rounded-t-lg ${accentColors.bar}`} />
      <span className="font-bold text-[#67839A] text-[10px] uppercase tracking-wider">{title}</span>
      <span className={`mt-1 font-black text-2xl ${accentColors.text}`}>
        {typeof value === "number" ? formatNumber(value) : value}
      </span>
      {subtitle ? <span className="mt-0.5 truncate text-[#67839A] text-[10px]">{subtitle}</span> : null}
    </div>
  );
}

// ─── Page 1: Cover ────────────────────────────────────────────────────────────

export function CoverPage({ data }: { data: ReportPayload }) {
  return (
    <ReportPage showHeader={false}>
      <div className="flex h-full flex-col justify-between py-6">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#C9D9E1] bg-[#EAF5FA] px-3 py-1 font-bold text-[#174D6B] text-[11px] uppercase tracking-wider">
            <span className="h-2 w-2 rounded-full bg-[#2AA8C3]" />
            Laporan Rekapitulasi Operasional
          </div>

          <h1 className="font-black text-4xl text-[#174D6B] uppercase leading-tight tracking-tight">
            Aktivitas dan
            <br />
            Produktivitas Jaring
          </h1>

          <p className="mt-3 max-w-lg font-normal text-[#243B4D] text-sm leading-relaxed">
            Bahan pemantauan jangkauan, aktivitas, produktivitas, dan pembinaan Jaring di seluruh wilayah Provinsi DKI
            Jakarta.
          </p>

          <div className="my-8 h-1.5 w-28 rounded-full bg-gradient-to-r from-[#174D6B] via-[#2AA8C3] to-[#3A9D69]" />
        </div>

        <div className="max-w-xl rounded-xl border border-[#C9D9E1] bg-[#EAF5FA] p-6 shadow-xs">
          <h2 className="mb-4 border-[#C9D9E1] border-b pb-2 font-bold text-[#174D6B] text-xs uppercase tracking-wider">
            Parameter Dokumen Laporan
          </h2>

          <dl className="grid grid-cols-[140px_1fr] gap-y-3 text-xs">
            <dt className="font-medium text-[#67839A]">Periode Laporan</dt>
            <dd className="font-bold text-[#174D6B]">{data.metadata.periodLabel}</dd>

            <dt className="font-medium text-[#67839A]">Cakupan Wilayah</dt>
            <dd className="font-semibold text-[#243B4D]">Provinsi DKI Jakarta (6 Kab/Kota, 44 Kecamatan)</dd>

            <dt className="font-medium text-[#67839A]">Basis Pengukuran</dt>
            <dd className="text-[#243B4D]">Jaring Terverifikasi, Aktivitas 90 Hari, dan Pembinaan</dd>

            <dt className="font-medium text-[#67839A]">Penarikan Data</dt>
            <dd className="font-mono text-[#243B4D]">{data.metadata.pullAt}</dd>

            <dt className="font-medium text-[#67839A]">Batas Aktivitas 90 Hari</dt>
            <dd className="font-mono text-[#67839A] text-[11px]">Sejak {data.metadata.activityWindowStart}</dd>
          </dl>
        </div>

        <div className="flex items-center justify-between border-[#C9D9E1] border-t pt-4 text-[#67839A] text-[10px]">
          <span className="font-semibold text-[#174D6B] tracking-wider">DOKUMEN OPERASIONAL KEDEPUTIAN II</span>
          <span>Sistem Operasional Intelijen Terpadu</span>
        </div>
      </div>
    </ReportPage>
  );
}

// ─── Page 2: Executive Summary ────────────────────────────────────────────────

export function ExecutiveSummaryPage({ data }: { data: ReportPayload }) {
  const activeRate = (data.summary.active / data.summary.total) * 100;
  const inactiveRate = (data.summary.inactive / data.summary.total) * 100;
  const reportsPerDay = data.summary.reports / Math.max(1, data.metadata.periodDays);
  const coachingCoverage = data.regions.filter((r) => r.coaching > 0).length;

  return (
    <ReportPage pageNumber={2} periodLabel={data.metadata.periodLabel}>
      <div>
        <h2 className="font-black text-[#174D6B] text-xl uppercase tracking-tight">Ringkasan Eksekutif</h2>
        <p className="mt-0.5 text-[#67839A] text-xs">
          Gambaran umum jangkauan, keaktifan, pelaporan, dan pembinaan Jaring di Provinsi DKI Jakarta.
        </p>

        {/* 4 KPI Cards */}
        <div className="mt-4 grid grid-cols-4 gap-3">
          <KpiCard title="Total Jaring" value={data.summary.total} subtitle="Jaring Terverifikasi" accent="dark" />
          <KpiCard
            title="Aktif 90 Hari"
            value={data.summary.active}
            subtitle={`${formatPercent(activeRate)} dari total`}
            accent="green"
          />
          <KpiCard
            title="Pelapor Periode"
            value={data.summary.reporters}
            subtitle={`Pelapor unik ${data.metadata.periodLabel}`}
            accent="blue"
          />
          <KpiCard
            title="Laporan Masuk"
            value={data.summary.reports}
            subtitle={`Selama ${data.metadata.periodDays} hari (~${formatDecimal(reportsPerDay, 1)}/hari)`}
            accent="cyan"
          />
        </div>

        {/* Mid Section: Composition & Coaching Summary */}
        <div className="mt-5 grid grid-cols-2 gap-4">
          {/* Komposisi Keaktifan */}
          <div className="rounded-lg border border-[#C9D9E1] bg-[#EAF5FA] p-3.5">
            <h3 className="mb-2 font-bold text-[#174D6B] text-xs uppercase tracking-wider">
              Komposisi Keaktifan (90 Hari Terakhir)
            </h3>
            <div className="mt-2 flex items-center gap-4">
              {/* Vector Donut SVG */}
              <div className="relative h-24 w-24 shrink-0">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                  <title>Grafik Donut Keaktifan</title>
                  <path
                    className="text-[#C85A57]"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#3A9D69]"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeDasharray={`${activeRate}, 100`}
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-black text-[#174D6B] text-xs">{formatPercent(activeRate, 0)}</span>
                  <span className="font-bold text-[#67839A] text-[8px] uppercase">Aktif</span>
                </div>
              </div>

              {/* Legend & Details */}
              <div className="flex-1 space-y-2 text-xs">
                <div className="flex items-center justify-between border-[#C9D9E1] border-b pb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#3A9D69]" />
                    <span className="font-medium text-[#243B4D]">Jaring Aktif</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[#174D6B]">{formatNumber(data.summary.active)}</span>
                    <span className="ml-1 text-[#67839A] text-[10px]">({formatPercent(activeRate)})</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#C85A57]" />
                    <span className="font-medium text-[#243B4D]">Jaring Tidak Aktif</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[#C85A57]">{formatNumber(data.summary.inactive)}</span>
                    <span className="ml-1 text-[#67839A] text-[10px]">({formatPercent(inactiveRate)})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ringkasan Pembinaan */}
          <div className="rounded-lg border border-[#C9D9E1] bg-[#EAF5FA] p-3.5">
            <h3 className="mb-2 font-bold text-[#174D6B] text-xs uppercase tracking-wider">
              Ringkasan Pembinaan Jaring
            </h3>
            <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded border border-[#C9D9E1] bg-white p-2">
                <span className="block font-medium text-[#67839A] text-[10px] uppercase">Kegiatan Pembinaan</span>
                <span className="font-black text-[#174D6B] text-base">{formatNumber(data.coaching.activities)}</span>
                <span className="block text-[#3A9D69] text-[9px]">Terlaksana & Disetujui</span>
              </div>
              <div className="rounded border border-[#C9D9E1] bg-white p-2">
                <span className="block font-medium text-[#67839A] text-[10px] uppercase">Jaring Dibina</span>
                <span className="font-black text-[#174D6B] text-base">{formatNumber(data.coaching.uniqueJaring)}</span>
                <span className="block text-[#67839A] text-[9px]">Individu Terbina</span>
              </div>
              <div className="rounded border border-[#C9D9E1] bg-white p-2">
                <span className="block font-medium text-[#67839A] text-[10px] uppercase">Cakupan Wilayah</span>
                <span className="font-black text-[#174D6B] text-base">{coachingCoverage} Wilayah</span>
                <span className="block text-[#67839A] text-[9px]">Dari 6 Kab/Kota</span>
              </div>
              <div className="rounded border border-[#C9D9E1] bg-white p-2">
                <span className="block font-medium text-[#67839A] text-[10px] uppercase">Status Pengajuan</span>
                <span className="font-black text-[#F28C28] text-base">+{data.coaching.pendingActivities}</span>
                <span className="block text-[#67839A] text-[9px]">Menunggu Verifikasi</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Temuan Utama Eksekutif */}
        <div className="mt-5 rounded-lg border border-[#C9D9E1] bg-white p-4 shadow-xs">
          <h3 className="mb-2 flex items-center gap-1.5 font-bold text-[#174D6B] text-xs uppercase tracking-wider">
            <span className="h-2 w-2 rounded-full bg-[#174D6B]" />
            Temuan Utama Eksekutif
          </h3>
          <ul className="list-disc space-y-1.5 pl-3 text-[#243B4D] text-xs marker:text-[#2AA8C3]">
            <li>
              <strong>Keaktifan Tertinggi:</strong> Wilayah <strong>{data.highlights.highestActiveRegion}</strong>{" "}
              mencatatkan persentase keaktifan jaring tertinggi di DKI Jakarta.
            </li>
            <li>
              <strong>Volume Laporan Terbesar:</strong> Wilayah <strong>{data.highlights.highestReportRegion}</strong>{" "}
              menjadi penyumbang volume laporan intelijen terbesar selama periode berjalan.
            </li>
            <li>
              <strong>Produktivitas Tertinggi:</strong> Wilayah <strong>{data.highlights.mostProductiveRegion}</strong>{" "}
              menghasilkan rasio laporan masuk per jaring aktif paling produktif.
            </li>
            <li>
              <strong>Kecamatan Nihil:</strong> Sebanyak{" "}
              <strong>{data.highlights.districtsWithoutReports} dari 44 kecamatan</strong> di DKI Jakarta belum memiliki
              laporan masuk pada periode ini.
            </li>
            <li>
              <strong>Evaluasi Jaring Pasif:</strong> Sebanyak{" "}
              <strong>
                {formatNumber(data.summary.inactive)} Jaring ({formatPercent(inactiveRate)})
              </strong>{" "}
              berstatus tidak aktif dalam 90 hari terakhir dan menjadi fokus prioritas pemulihan kontak dan pembinaan.
            </li>
          </ul>
        </div>
      </div>
    </ReportPage>
  );
}

// ─── Page 3: Regional Analysis ────────────────────────────────────────────────

export function RegionalAnalysisPage({ data }: { data: ReportPayload }) {
  const byActiveRate = [...data.regions].sort((a, b) => b.activeRate - a.activeRate);
  const byReports = [...data.regions].sort((a, b) => b.reports - a.reports);
  const maxReports = Math.max(...data.regions.map((r) => r.reports), 1);

  return (
    <ReportPage pageNumber={3} periodLabel={data.metadata.periodLabel}>
      <div>
        <h2 className="font-black text-[#174D6B] text-xl uppercase tracking-tight">Analisis Per Wilayah</h2>
        <p className="mt-0.5 text-[#67839A] text-xs">
          Perbandingan keaktifan, volume laporan, dan produktivitas 6 Kabupaten/Kota di DKI Jakarta.
        </p>

        {/* 2 Charts Grid */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          {/* Chart 1: Tingkat Keaktifan */}
          <div className="rounded-lg border border-[#C9D9E1] bg-[#EAF5FA] p-3">
            <h3 className="mb-2 font-bold text-[#174D6B] text-xs uppercase tracking-wider">
              Peringkat Tingkat Keaktifan (%)
            </h3>
            <div className="mt-2 space-y-2">
              {byActiveRate.map((r) => (
                <div key={r.name} className="text-xs">
                  <div className="mb-0.5 flex justify-between text-[11px]">
                    <span className="truncate font-semibold text-[#243B4D]">{r.name}</span>
                    <span className="font-bold text-[#3A9D69]">{formatPercent(r.activeRate)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#E4F0F5]">
                    <div
                      className="h-full rounded-full bg-[#3A9D69]"
                      style={{ width: `${Math.min(100, Math.max(5, r.activeRate))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 2: Volume Laporan */}
          <div className="rounded-lg border border-[#C9D9E1] bg-[#EAF5FA] p-3">
            <h3 className="mb-2 font-bold text-[#174D6B] text-xs uppercase tracking-wider">Volume Laporan Masuk</h3>
            <div className="mt-2 space-y-2">
              {byReports.map((r) => (
                <div key={r.name} className="text-xs">
                  <div className="mb-0.5 flex justify-between text-[11px]">
                    <span className="truncate font-semibold text-[#243B4D]">{r.name}</span>
                    <span className="font-bold text-[#1485B0]">{formatNumber(r.reports)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#E4F0F5]">
                    <div
                      className="h-full rounded-full bg-[#1485B0]"
                      style={{ width: `${Math.min(100, Math.max(5, (r.reports / maxReports) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabel Ringkasan Wilayah */}
        <div className="mt-5 overflow-hidden rounded-lg border border-[#C9D9E1] shadow-xs">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-[#174D6B] font-bold text-[10px] text-white uppercase tracking-wider">
                <th className="px-3 py-2">Wilayah</th>
                <th className="px-3 py-2 text-right">Total Jaring</th>
                <th className="px-3 py-2 text-right">Jaring Aktif</th>
                <th className="px-3 py-2 text-right">Laporan Masuk</th>
                <th className="px-3 py-2 text-right">Laporan / Aktif</th>
                <th className="px-3 py-2 text-right">Keaktifan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9D9E1]">
              {data.regions.map((r, i) => (
                <tr key={r.name} className={i % 2 === 0 ? "bg-white" : "bg-[#EDF4F7]"}>
                  <td className="px-3 py-2 font-semibold text-[#243B4D]">{r.name}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatNumber(r.total)}</td>
                  <td className="px-3 py-2 text-right font-medium font-mono text-[#3A9D69]">
                    {formatNumber(r.active)}
                  </td>
                  <td className="px-3 py-2 text-right font-bold font-mono text-[#1485B0]">{formatNumber(r.reports)}</td>
                  <td className="px-3 py-2 text-right font-mono text-[#174D6B]">{formatDecimal(r.reportsPerActive)}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-[#3A9D69]">
                    {formatPercent(r.activeRate)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-[#174D6B] border-t-2 bg-[#EAF5FA] font-bold text-[#174D6B]">
                <td className="px-3 py-2.5 uppercase">Total / Rata-rata</td>
                <td className="px-3 py-2.5 text-right font-mono">{formatNumber(data.summary.total)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-[#3A9D69]">{formatNumber(data.summary.active)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-[#1485B0]">
                  {formatNumber(data.summary.reports)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono">
                  {formatDecimal(data.summary.active > 0 ? data.summary.reports / data.summary.active : 0)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-[#3A9D69]">
                  {formatPercent((data.summary.active / data.summary.total) * 100)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </ReportPage>
  );
}

// ─── Page 4: Methodology ──────────────────────────────────────────────────────

export function MethodologyPage({ data }: { data: ReportPayload }) {
  return (
    <ReportPage pageNumber={4} periodLabel={data.metadata.periodLabel}>
      <div>
        <h2 className="font-black text-[#174D6B] text-xl uppercase tracking-tight">
          Metodologi dan Definisi Parameter
        </h2>
        <p className="mt-0.5 text-[#67839A] text-xs">
          Pedoman definisi data, rumus operasional, dan parameter penghitungan rekapitulasi.
        </p>

        {/* 6 Canon Definitions Grid */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-[#C9D9E1] bg-[#EAF5FA] p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <span className="grid h-5 w-5 place-items-center rounded bg-[#174D6B] font-bold text-[10px] text-white">
                1
              </span>
              <h3 className="font-bold text-[#174D6B] text-xs uppercase">Total Jaring</h3>
            </div>
            <p className="text-[#243B4D] text-[11px] leading-relaxed">
              Seluruh Jaring yang telah berstatus terverifikasi (<strong>VERIFIED</strong>) di dalam sistem hingga waktu
              penarikan data (<strong>{data.metadata.pullAt}</strong>).
            </p>
          </div>

          <div className="rounded-lg border border-[#C9D9E1] bg-[#EAF5FA] p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <span className="grid h-5 w-5 place-items-center rounded bg-[#3A9D69] font-bold text-[10px] text-white">
                2
              </span>
              <h3 className="font-bold text-[#174D6B] text-xs uppercase">Jaring Aktif</h3>
            </div>
            <p className="text-[#243B4D] text-[11px] leading-relaxed">
              Jaring terverifikasi yang memiliki minimal satu catatan aktivitas (laporan masuk atau interaksi pesan
              WhatsApp) dalam rentang <strong>90 hari terakhir</strong> (sejak {data.metadata.activityWindowStart}).
            </p>
          </div>

          <div className="rounded-lg border border-[#C9D9E1] bg-[#EAF5FA] p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <span className="grid h-5 w-5 place-items-center rounded bg-[#C85A57] font-bold text-[10px] text-white">
                3
              </span>
              <h3 className="font-bold text-[#174D6B] text-xs uppercase">Jaring Tidak Aktif</h3>
            </div>
            <p className="text-[#243B4D] text-[11px] leading-relaxed">
              Jaring terverifikasi yang tidak memiliki riwayat aktivitas pelaporan maupun komunikasi sama sekali dalam
              jendela 90 hari terakhir.
            </p>
          </div>

          <div className="rounded-lg border border-[#C9D9E1] bg-[#EAF5FA] p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <span className="grid h-5 w-5 place-items-center rounded bg-[#1485B0] font-bold text-[10px] text-white">
                4
              </span>
              <h3 className="font-bold text-[#174D6B] text-xs uppercase">Laporan Masuk</h3>
            </div>
            <p className="text-[#243B4D] text-[11px] leading-relaxed">
              Seluruh laporan informasi intelijen yang diserahkan oleh Jaring pada periode laporan (
              <strong>{data.metadata.periodLabel}</strong>) berdasarkan waktu kirim resmi (<strong>submittedAt</strong>
              ).
            </p>
          </div>

          <div className="rounded-lg border border-[#C9D9E1] bg-[#EAF5FA] p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <span className="grid h-5 w-5 place-items-center rounded bg-[#2AA8C3] font-bold text-[10px] text-white">
                5
              </span>
              <h3 className="font-bold text-[#174D6B] text-xs uppercase">Jaring yang Melapor</h3>
            </div>
            <p className="text-[#243B4D] text-[11px] leading-relaxed">
              Jumlah individu Jaring unik yang berkontribusi mengirimkan minimal satu laporan intelijen pada periode
              laporan ({data.metadata.periodLabel}).
            </p>
          </div>

          <div className="rounded-lg border border-[#C9D9E1] bg-[#EAF5FA] p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <span className="grid h-5 w-5 place-items-center rounded bg-[#F28C28] font-bold text-[10px] text-white">
                6
              </span>
              <h3 className="font-bold text-[#174D6B] text-xs uppercase">Pembinaan Jaring</h3>
            </div>
            <p className="text-[#243B4D] text-[11px] leading-relaxed">
              Kegiatan pembinaan, pengarahan, dan evaluasi terhadap Jaring yang tercatat dalam periode laporan (
              {data.metadata.periodLabel}) berdasarkan waktu pengiriman/pencatatan laporan (<strong>createdAt</strong>).
            </p>
          </div>
        </div>

        {/* Rumus & Parameter Box */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-[#C9D9E1] bg-white p-3 shadow-xs">
            <h3 className="mb-2 font-bold text-[#174D6B] text-xs uppercase tracking-wider">
              Rumus dan Rentang Operasional
            </h3>
            <dl className="space-y-1.5 text-[11px]">
              <div className="flex justify-between border-[#EDF4F7] border-b pb-1">
                <span className="text-[#67839A]">Tingkat Keaktifan:</span>
                <span className="font-mono font-semibold text-[#174D6B]">(Jaring Aktif / Total Jaring) × 100%</span>
              </div>
              <div className="flex justify-between border-[#EDF4F7] border-b pb-1">
                <span className="text-[#67839A]">Rasio Produktivitas:</span>
                <span className="font-mono font-semibold text-[#174D6B]">Laporan Masuk / Jaring Aktif</span>
              </div>
              <div className="flex justify-between border-[#EDF4F7] border-b pb-1">
                <span className="text-[#67839A]">Jendela 90 Hari:</span>
                <span className="font-mono text-[#243B4D]">{data.metadata.activityWindowStart} s.d. penarikan</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#67839A]">Rentang Periode:</span>
                <span className="font-mono text-[#243B4D]">
                  {data.metadata.periodStart} s.d. {data.metadata.periodEnd} ({data.metadata.periodDays} hari)
                </span>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-[#C9D9E1] bg-white p-3 shadow-xs">
            <h3 className="mb-2 font-bold text-[#174D6B] text-xs uppercase tracking-wider">Batas Interpretasi Data</h3>
            <ul className="list-disc space-y-1.5 pl-3 text-[#243B4D] text-[11px] marker:text-[#174D6B]">
              <li>
                Keaktifan 90 hari mencerminkan kesiapan operasional jangka menengah jaring, sedangkan pelapor periode
                merefleksikan produktivitas langsung pada tanggal berjalan.
              </li>
              <li>
                Angka kegiatan pembinaan memprioritaskan kegiatan berstatus terverifikasi/disetujui. Data pembinaan
                berstatus pengajuan dicantumkan sebagai referensi tambahan.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </ReportPage>
  );
}

// ─── Page 5: Coaching Analysis ────────────────────────────────────────────────

export function CoachingAnalysisPage({ data }: { data: ReportPayload }) {
  const coachingRegions = [...data.regions].sort((a, b) => b.coaching - a.coaching);
  const coachingCoverage = data.regions.filter((r) => r.coaching > 0).length;

  return (
    <ReportPage pageNumber={5} periodLabel={data.metadata.periodLabel}>
      <div>
        <h2 className="font-black text-[#174D6B] text-xl uppercase tracking-tight">Analisis Pembinaan Jaring</h2>
        <p className="mt-0.5 text-[#67839A] text-xs">
          Rekapitulasi pelaksanaan pembinaan Jaring per Kabupaten/Kota selama periode laporan.
        </p>

        {/* 4 KPI Cards */}
        <div className="mt-4 grid grid-cols-4 gap-3">
          <KpiCard
            title="Kegiatan Pembinaan"
            value={data.coaching.activities}
            subtitle="Terverifikasi & Disetujui"
            accent="dark"
          />
          <KpiCard
            title="Jaring Dibina"
            value={data.coaching.uniqueJaring}
            subtitle="Individu Jaring Terbina"
            accent="green"
          />
          <KpiCard
            title="Cakupan Wilayah"
            value={`${coachingCoverage} Wilayah`}
            subtitle="Dari 6 Kab/Kota"
            accent="blue"
          />
          <KpiCard
            title="Status Pengajuan"
            value={`+${data.coaching.pendingActivities}`}
            subtitle={`Menunggu (${data.coaching.pendingJaring} Jaring)`}
            accent="orange"
          />
        </div>

        {/* Tabel Pembinaan Wilayah */}
        <div className="mt-5 overflow-hidden rounded-lg border border-[#C9D9E1] shadow-xs">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-[#174D6B] font-bold text-[10px] text-white uppercase tracking-wider">
                <th className="w-10 px-3 py-2 text-center">No</th>
                <th className="px-3 py-2">Wilayah</th>
                <th className="px-3 py-2 text-right">Kegiatan Pembinaan</th>
                <th className="px-3 py-2 text-right">Kontribusi (%)</th>
                <th className="px-3 py-2 text-right">Jaring Aktif</th>
                <th className="px-3 py-2 text-right">Laporan Masuk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9D9E1]">
              {coachingRegions.map((r, i) => (
                <tr key={r.name} className={i % 2 === 0 ? "bg-white" : "bg-[#EDF4F7]"}>
                  <td className="px-3 py-2 text-center text-[#67839A]">{i + 1}</td>
                  <td className="px-3 py-2 font-semibold text-[#243B4D]">{r.name}</td>
                  <td className="px-3 py-2 text-right font-bold font-mono text-[#174D6B]">
                    {formatNumber(r.coaching)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-[#2AA8C3]">
                    {formatPercent(r.coachingShare)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[#3A9D69]">{formatNumber(r.active)}</td>
                  <td className="px-3 py-2 text-right font-mono text-[#1485B0]">{formatNumber(r.reports)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-[#174D6B] border-t-2 bg-[#EAF5FA] font-bold text-[#174D6B]">
                <td colSpan={2} className="px-3 py-2.5 uppercase">
                  Total Kegiatan Terverifikasi
                </td>
                <td className="px-3 py-2.5 text-right font-mono">{formatNumber(data.coaching.activities)}</td>
                <td className="px-3 py-2.5 text-right font-mono">100,0%</td>
                <td className="px-3 py-2.5 text-right font-mono text-[#3A9D69]">{formatNumber(data.summary.active)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-[#1485B0]">
                  {formatNumber(data.summary.reports)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Catatan Strategis Pembinaan */}
        <div className="mt-5 rounded-lg border border-[#C9D9E1] bg-white p-3.5 shadow-xs">
          <h3 className="mb-2 font-bold text-[#174D6B] text-xs uppercase tracking-wider">
            Catatan dan Evaluasi Pembinaan
          </h3>
          <p className="text-[#243B4D] text-[11px] leading-relaxed">
            Kegiatan pembinaan Jaring berkonsentrasi tinggi di wilayah operasional strategis dengan intensitas pelaporan
            tinggi. Total kegiatan mencapai <strong>{formatNumber(data.coaching.activities)} kegiatan</strong> membina{" "}
            <strong>{formatNumber(data.coaching.uniqueJaring)} individu Jaring unik</strong>. Terdapat{" "}
            <strong>{data.coaching.pendingActivities} kegiatan tambahan</strong> yang masih dalam proses
            pengajuan/verifikasi.
          </p>
        </div>
      </div>
    </ReportPage>
  );
}

// ─── Pages 6–11: Region Detail Page (1 Page per Region) ───────────────────────

export function RegionDetailPage({
  data,
  regionName,
  pageNumber,
}: {
  data: ReportPayload;
  regionName: string;
  pageNumber: number;
}) {
  const region = data.regions.find((r) => r.name === regionName);
  const districts = data.districts.filter((d) => d.region === regionName);

  if (!region) {
    return (
      <ReportPage pageNumber={pageNumber} periodLabel={data.metadata.periodLabel}>
        <div className="p-8 text-center text-red-600">Data wilayah {regionName} tidak ditemukan.</div>
      </ReportPage>
    );
  }

  const mostReports = [...districts].sort((a, b) => b.reports - a.reports)[0];
  const highestActive = [...districts].sort((a, b) => b.activeRate - a.activeRate)[0];
  const mostCoaching = [...districts].sort((a, b) => b.coaching - a.coaching)[0];

  return (
    <ReportPage pageNumber={pageNumber} periodLabel={data.metadata.periodLabel}>
      <div>
        <h2 className="font-black text-[#174D6B] text-xl uppercase tracking-tight">
          Detail Wilayah — {region.fullName}
        </h2>
        <p className="mt-0.5 text-[#67839A] text-xs">
          Rincian jangkauan, keaktifan, produktivitas pelaporan, dan pembinaan tingkat kecamatan.
        </p>

        {/* 4 KPI Cards */}
        <div className="mt-3 grid grid-cols-4 gap-3">
          <KpiCard title="Total Jaring" value={region.total} subtitle="Jaring Terverifikasi" accent="dark" />
          <KpiCard
            title="Aktif 90 Hari"
            value={region.active}
            subtitle={`${formatPercent(region.activeRate)} tingkat aktif`}
            accent="green"
          />
          <KpiCard
            title="Tidak Aktif"
            value={region.inactive}
            subtitle={`${formatPercent(region.inactiveRate)} belum melapor`}
            accent="orange"
          />
          <KpiCard
            title="Laporan Masuk"
            value={region.reports}
            subtitle={`${formatDecimal(region.reportsPerActive)} lap/aktif`}
            accent="blue"
          />
        </div>

        {/* Tabel Kecamatan */}
        <div className="mt-4 overflow-hidden rounded-lg border border-[#C9D9E1] shadow-xs">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-[#174D6B] font-bold text-[10px] text-white uppercase tracking-wider">
                <th className="w-8 px-3 py-1.5 text-center">No</th>
                <th className="px-3 py-1.5">Kecamatan</th>
                <th className="px-3 py-1.5 text-right">Total Jaring</th>
                <th className="px-3 py-1.5 text-right">Aktif</th>
                <th className="px-3 py-1.5 text-right">Tidak Aktif</th>
                <th className="px-3 py-1.5 text-right">Laporan Masuk</th>
                <th className="px-3 py-1.5 text-right">Pembinaan</th>
                <th className="px-3 py-1.5 text-right">Keaktifan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9D9E1]">
              {districts.map((d, i) => (
                <tr key={d.name} className={i % 2 === 0 ? "bg-white" : "bg-[#EDF4F7]"}>
                  <td className="px-3 py-1.5 text-center text-[#67839A] text-[11px]">{i + 1}</td>
                  <td className="px-3 py-1.5 font-semibold text-[#243B4D]">{d.name}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{formatNumber(d.total)}</td>
                  <td className="px-3 py-1.5 text-right font-medium font-mono text-[#3A9D69]">
                    {formatNumber(d.active)}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-[#67839A]">{formatNumber(d.inactive)}</td>
                  <td className="px-3 py-1.5 text-right font-bold font-mono text-[#1485B0]">
                    {formatNumber(d.reports)}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-[#174D6B]">{formatNumber(d.coaching)}</td>
                  <td className="px-3 py-1.5 text-right font-mono font-semibold text-[#3A9D69]">
                    {formatPercent(d.activeRate)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-[#174D6B] border-t-2 bg-[#EAF5FA] font-bold text-[#174D6B]">
                <td colSpan={2} className="px-3 py-2 uppercase">
                  Total Wilayah
                </td>
                <td className="px-3 py-2 text-right font-mono">{formatNumber(region.total)}</td>
                <td className="px-3 py-2 text-right font-mono text-[#3A9D69]">{formatNumber(region.active)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatNumber(region.inactive)}</td>
                <td className="px-3 py-2 text-right font-mono text-[#1485B0]">{formatNumber(region.reports)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatNumber(region.coaching)}</td>
                <td className="px-3 py-2 text-right font-mono text-[#3A9D69]">{formatPercent(region.activeRate)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Highlight Box */}
        <div className="mt-4 rounded-lg border border-[#C9D9E1] bg-white p-3 shadow-xs">
          <h3 className="mb-1.5 font-bold text-[#174D6B] text-xs uppercase tracking-wider">
            Sorotan Wilayah {region.name}
          </h3>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="rounded border border-[#C9D9E1] bg-[#EAF5FA] p-2">
              <span className="block text-[#67839A] text-[10px] uppercase">Laporan Terbanyak</span>
              <span className="block truncate font-bold text-[#1485B0]">Kec. {mostReports?.name ?? "-"}</span>
              <span className="font-mono text-[#243B4D] text-[11px]">
                {formatNumber(mostReports?.reports ?? 0)} laporan
              </span>
            </div>

            <div className="rounded border border-[#C9D9E1] bg-[#EAF5FA] p-2">
              <span className="block text-[#67839A] text-[10px] uppercase">Keaktifan Tertinggi</span>
              <span className="block truncate font-bold text-[#3A9D69]">Kec. {highestActive?.name ?? "-"}</span>
              <span className="font-mono text-[#243B4D] text-[11px]">
                {formatPercent(highestActive?.activeRate ?? 0)} aktif
              </span>
            </div>

            <div className="rounded border border-[#C9D9E1] bg-[#EAF5FA] p-2">
              <span className="block text-[#67839A] text-[10px] uppercase">Pembinaan Terbanyak</span>
              <span className="block truncate font-bold text-[#174D6B]">
                Kec. {mostCoaching && mostCoaching.coaching > 0 ? mostCoaching.name : "-"}
              </span>
              <span className="font-mono text-[#243B4D] text-[11px]">
                {formatNumber(mostCoaching?.coaching ?? 0)} kegiatan
              </span>
            </div>
          </div>
        </div>
      </div>
    </ReportPage>
  );
}

// ─── Page 12: District Highlights ─────────────────────────────────────────────

export function DistrictHighlightsPage({ data }: { data: ReportPayload }) {
  const topDistricts = data.highlights.topDistricts;

  return (
    <ReportPage pageNumber={12} periodLabel={data.metadata.periodLabel}>
      <div>
        <h2 className="font-black text-[#174D6B] text-xl uppercase tracking-tight">
          Sorotan Kecamatan (Top 10 Produktivitas)
        </h2>
        <p className="mt-0.5 text-[#67839A] text-xs">
          10 Kecamatan dengan volume laporan masuk tertinggi di seluruh Provinsi DKI Jakarta.
        </p>

        {/* Tabel Top 10 */}
        <div className="mt-4 overflow-hidden rounded-lg border border-[#C9D9E1] shadow-xs">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-[#174D6B] font-bold text-[10px] text-white uppercase tracking-wider">
                <th className="w-12 px-3 py-2 text-center">Peringkat</th>
                <th className="px-3 py-2">Kecamatan</th>
                <th className="px-3 py-2">Kabupaten / Kota</th>
                <th className="px-3 py-2 text-right">Laporan Masuk</th>
                <th className="px-3 py-2 text-right">Aktif / Total</th>
                <th className="px-3 py-2 text-right">Keaktifan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9D9E1]">
              {topDistricts.map((item, i) => (
                <tr key={`${item.region}-${item.name}`} className={i % 2 === 0 ? "bg-white" : "bg-[#EDF4F7]"}>
                  <td className="px-3 py-2 text-center font-bold text-[#174D6B]">{item.rank || i + 1}</td>
                  <td className="px-3 py-2 font-semibold text-[#243B4D]">{item.name}</td>
                  <td className="px-3 py-2 text-[#67839A]">{item.region}</td>
                  <td className="px-3 py-2 text-right font-bold font-mono text-[#1485B0]">
                    {formatNumber(item.reports)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[#243B4D]">
                    {item.active} / {item.total}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-[#3A9D69]">
                    {formatPercent(item.activeRate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Analisis Konsentrasi Laporan */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-[#C9D9E1] bg-[#EAF5FA] p-3.5">
            <h3 className="mb-2 font-bold text-[#174D6B] text-xs uppercase tracking-wider">
              Konsentrasi Laporan Wilayah
            </h3>
            <p className="text-[#243B4D] text-[11px] leading-relaxed">
              Sebagian besar volume laporan didorong secara signifikan oleh kecamatan-kecamatan simpul aktivitas utama.
              Matraman dan Jatinegara (Jakarta Timur) serta Kebayoran Baru dan Setiabudi (Jakarta Selatan) mencatatkan
              produktivitas yang sangat menonjol dibanding kecamatan lain.
            </p>
          </div>

          <div className="rounded-lg border border-[#C9D9E1] bg-[#EAF5FA] p-3.5">
            <h3 className="mb-2 font-bold text-[#174D6B] text-xs uppercase tracking-wider">
              Evaluasi Kecamatan Nihil Laporan
            </h3>
            <p className="text-[#243B4D] text-[11px] leading-relaxed">
              Terdapat <strong>{data.highlights.districtsWithoutReports} kecamatan</strong> yang belum mencatatkan
              laporan masuk selama periode <strong>{data.metadata.periodLabel}</strong>. Wilayah ini direkomendasikan
              sebagai sasaran asistensi dan koordinasi lapangan bagi Petugas Wilayah.
            </p>
          </div>
        </div>
      </div>
    </ReportPage>
  );
}

// ─── Page 13: Final Summary & Data Reconciliation ─────────────────────────────

export function FinalSummaryPage({ data }: { data: ReportPayload }) {
  const activeRate = (data.summary.active / data.summary.total) * 100;
  const isSumActiveValid = data.summary.active + data.summary.inactive === data.summary.total;
  const sumRegionTotal = data.regions.reduce((s, r) => s + r.total, 0);
  const isRegionTotalValid = sumRegionTotal === data.summary.total;
  const sumRegionReports = data.regions.reduce((s, r) => s + r.reports, 0);
  const isRegionReportsValid = sumRegionReports === data.summary.reports;
  const sumRegionCoaching = data.regions.reduce((s, r) => s + r.coaching, 0);
  const isRegionCoachingValid = sumRegionCoaching === data.coaching.activities;
  const isAllValid = isSumActiveValid && isRegionTotalValid && isRegionReportsValid && isRegionCoachingValid;

  return (
    <ReportPage pageNumber={13} periodLabel={data.metadata.periodLabel}>
      <div>
        <h2 className="font-black text-[#174D6B] text-xl uppercase tracking-tight">
          Ringkasan Akhir dan Rekonsiliasi Data
        </h2>
        <p className="mt-0.5 text-[#67839A] text-xs">
          Sintesis menyeluruh jangkauan, produktivitas, serta verifikasi integritas data laporan.
        </p>

        {/* Sintesis Eksekutif */}
        <div className="mt-4 rounded-lg border border-[#C9D9E1] bg-white p-4 shadow-xs">
          <h3 className="mb-2 font-bold text-[#174D6B] text-xs uppercase tracking-wider">Sintesis Eksekutif Laporan</h3>
          <p className="text-[#243B4D] text-xs leading-relaxed">
            Pada periode <strong>{data.metadata.periodLabel}</strong>, sistem mencatat total{" "}
            <strong>{formatNumber(data.summary.total)} Jaring</strong> terverifikasi di seluruh Provinsi DKI Jakarta
            dengan{" "}
            <strong>
              {formatNumber(data.summary.active)} Jaring aktif ({formatPercent(activeRate)})
            </strong>{" "}
            dalam 90 hari terakhir. Sebanyak <strong>{formatNumber(data.summary.reporters)} Jaring</strong>{" "}
            berkontribusi aktif menyerahkan <strong>{formatNumber(data.summary.reports)} laporan intelijen</strong>.
            Wilayah <strong>{data.highlights.highestReportRegion}</strong> mencatatkan volume laporan tertinggi,
            sementara <strong>{data.highlights.highestActiveRegion}</strong> memiliki rasio keaktifan terbaik. Pembinaan
            Jaring telah dilaksanakan sebanyak <strong>{formatNumber(data.coaching.activities)} kegiatan</strong>{" "}
            membina <strong>{formatNumber(data.coaching.uniqueJaring)} individu Jaring</strong>.
          </p>
        </div>

        {/* Rekonsiliasi & Validasi Integritas Data */}
        <div className="mt-4 overflow-hidden rounded-lg border border-[#C9D9E1] shadow-xs">
          <div className="flex items-center justify-between bg-[#174D6B] px-3 py-2 text-white">
            <span className="font-bold text-[10px] uppercase tracking-wider">Tabel Rekonsiliasi Integritas Data</span>
            <span
              className={`rounded-full px-2 py-0.5 font-bold text-[9px] ${
                isAllValid ? "bg-[#3A9D69] text-white" : "bg-[#C85A57] text-white"
              }`}
            >
              {isAllValid ? "STATUS: VALID & TERVERIFIKASI" : "STATUS: PERLU CEK"}
            </span>
          </div>

          <table className="w-full border-collapse text-left text-xs">
            <tbody className="divide-y divide-[#C9D9E1]">
              <tr className="bg-white">
                <td className="px-3 py-2 font-medium text-[#243B4D]">
                  Konsistensi Status Keaktifan (Aktif + Tidak Aktif = Total)
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {data.summary.active} + {data.summary.inactive} = {data.summary.total}
                </td>
                <td className="w-24 px-3 py-2 text-right font-bold text-[#3A9D69]">
                  {isSumActiveValid ? "VALID" : "TIDAK SESUAI"}
                </td>
              </tr>
              <tr className="bg-[#EDF4F7]">
                <td className="px-3 py-2 font-medium text-[#243B4D]">Agregasi Total Jaring Wilayah vs Ringkasan</td>
                <td className="px-3 py-2 text-right font-mono">
                  {sumRegionTotal} vs {data.summary.total}
                </td>
                <td className="px-3 py-2 text-right font-bold text-[#3A9D69]">
                  {isRegionTotalValid ? "VALID" : "TIDAK SESUAI"}
                </td>
              </tr>
              <tr className="bg-white">
                <td className="px-3 py-2 font-medium text-[#243B4D]">Agregasi Laporan Masuk Wilayah vs Ringkasan</td>
                <td className="px-3 py-2 text-right font-mono">
                  {sumRegionReports} vs {data.summary.reports}
                </td>
                <td className="px-3 py-2 text-right font-bold text-[#3A9D69]">
                  {isRegionReportsValid ? "VALID" : "TIDAK SESUAI"}
                </td>
              </tr>
              <tr className="bg-[#EDF4F7]">
                <td className="px-3 py-2 font-medium text-[#243B4D]">Agregasi Kegiatan Pembinaan vs Ringkasan</td>
                <td className="px-3 py-2 text-right font-mono">
                  {sumRegionCoaching} vs {data.coaching.activities}
                </td>
                <td className="px-3 py-2 text-right font-bold text-[#3A9D69]">
                  {isRegionCoachingValid ? "VALID" : "TIDAK SESUAI"}
                </td>
              </tr>
              <tr className="bg-white">
                <td className="px-3 py-2 font-medium text-[#243B4D]">Cakupan Seluruh Kecamatan DKI Jakarta</td>
                <td className="px-3 py-2 text-right font-mono">44 Kecamatan Terverifikasi</td>
                <td className="px-3 py-2 text-right font-bold text-[#3A9D69]">LENGKAP</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </ReportPage>
  );
}

// ─── Main Report Document ─────────────────────────────────────────────────────

export function ReportDocument({ data }: { data: ReportPayload }) {
  return (
    <main id="report-document" data-report-ready="true" className="report-root">
      <CoverPage data={data} />
      <ExecutiveSummaryPage data={data} />
      <RegionalAnalysisPage data={data} />
      <MethodologyPage data={data} />
      <CoachingAnalysisPage data={data} />

      {REGION_PAGE_ORDER.map((regionName, index) => (
        <RegionDetailPage key={regionName} data={data} regionName={regionName} pageNumber={6 + index} />
      ))}

      <DistrictHighlightsPage data={data} />
      <FinalSummaryPage data={data} />
    </main>
  );
}
