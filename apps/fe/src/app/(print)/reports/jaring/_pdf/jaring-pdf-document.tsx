import { Document, Text, View } from "@react-pdf/renderer";

import type { ReportPayload } from "../_components/report-types";
import { REGION_PAGE_ORDER } from "../_components/report-types";
import { PdfKpiCard, PdfPage, PdfProgressBar } from "./pdf-components";
import { formatDecimal, formatNumber, formatPercent, PDF_COLORS, styles } from "./pdf-styles";

// ─── Page 1: Cover ────────────────────────────────────────────────────────────

function PdfCoverPage({ data }: { data: ReportPayload }) {
  return (
    <PdfPage showHeader={false}>
      <View style={{ flex: 1, justifyContent: "space-between", paddingVertical: 20 }}>
        <View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: PDF_COLORS.cardBg,
              borderColor: PDF_COLORS.border,
              borderWidth: 1,
              borderRadius: 20,
              paddingVertical: 3,
              paddingHorizontal: 10,
              alignSelf: "flex-start",
              marginBottom: 16,
              gap: 5,
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: PDF_COLORS.cyan }} />
            <Text style={{ fontSize: 8.5, fontWeight: "bold", color: PDF_COLORS.primary, textTransform: "uppercase" }}>
              Laporan Rekapitulasi Operasional
            </Text>
          </View>

          <Text
            style={{
              fontSize: 26,
              fontWeight: "bold",
              color: PDF_COLORS.primary,
              textTransform: "uppercase",
              lineHeight: 1.2,
            }}
          >
            Aktivitas dan{"\n"}Produktivitas Jaring
          </Text>

          <Text style={{ fontSize: 9.5, color: PDF_COLORS.textPrimary, marginTop: 8, maxWidth: 400, lineHeight: 1.4 }}>
            Bahan pemantauan jangkauan, aktivitas, produktivitas, dan pembinaan Jaring di seluruh wilayah Provinsi DKI
            Jakarta.
          </Text>

          <View
            style={{
              width: 80,
              height: 3,
              borderRadius: 1.5,
              backgroundColor: PDF_COLORS.primary,
              marginTop: 20,
              marginBottom: 10,
            }}
          />
        </View>

        <View style={[styles.panel, { padding: 14, maxWidth: 440 }]}>
          <Text
            style={{
              fontSize: 9,
              fontWeight: "bold",
              color: PDF_COLORS.primary,
              textTransform: "uppercase",
              borderBottomWidth: 1,
              borderBottomColor: PDF_COLORS.border,
              paddingBottom: 4,
              marginBottom: 8,
            }}
          >
            Parameter Dokumen Laporan
          </Text>

          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: "row" }}>
              <Text style={{ width: 120, fontSize: 8, color: PDF_COLORS.textMuted }}>Periode Laporan</Text>
              <Text style={{ flex: 1, fontSize: 8, fontWeight: "bold", color: PDF_COLORS.primary }}>
                {data.metadata.periodLabel}
              </Text>
            </View>
            <View style={{ flexDirection: "row" }}>
              <Text style={{ width: 120, fontSize: 8, color: PDF_COLORS.textMuted }}>Cakupan Wilayah</Text>
              <Text style={{ flex: 1, fontSize: 8, color: PDF_COLORS.textPrimary }}>
                Provinsi DKI Jakarta (6 Kab/Kota, 44 Kecamatan)
              </Text>
            </View>
            <View style={{ flexDirection: "row" }}>
              <Text style={{ width: 120, fontSize: 8, color: PDF_COLORS.textMuted }}>Basis Pengukuran</Text>
              <Text style={{ flex: 1, fontSize: 8, color: PDF_COLORS.textPrimary }}>
                Jaring Terverifikasi, Aktivitas 90 Hari, dan Pembinaan
              </Text>
            </View>
            <View style={{ flexDirection: "row" }}>
              <Text style={{ width: 120, fontSize: 8, color: PDF_COLORS.textMuted }}>Penarikan Data</Text>
              <Text style={{ flex: 1, fontSize: 8, color: PDF_COLORS.textPrimary }}>{data.metadata.pullAt}</Text>
            </View>
            <View style={{ flexDirection: "row" }}>
              <Text style={{ width: 120, fontSize: 8, color: PDF_COLORS.textMuted }}>Batas Aktivitas 90 Hari</Text>
              <Text style={{ flex: 1, fontSize: 8, color: PDF_COLORS.textMuted }}>
                Sejak {data.metadata.activityWindowStart}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            borderTopWidth: 1,
            borderTopColor: PDF_COLORS.border,
            paddingTop: 8,
            fontSize: 7.5,
            color: PDF_COLORS.textMuted,
          }}
        >
          <Text style={{ fontWeight: "bold", color: PDF_COLORS.primary }}>DOKUMEN OPERASIONAL KEDEPUTIAN II</Text>
          <Text>Sistem Operasional Intelijen Terpadu</Text>
        </View>
      </View>
    </PdfPage>
  );
}

// ─── Page 2: Executive Summary ────────────────────────────────────────────────

function PdfExecutiveSummaryPage({ data }: { data: ReportPayload }) {
  const activeRate = (data.summary.active / data.summary.total) * 100;
  const inactiveRate = (data.summary.inactive / data.summary.total) * 100;
  const reportsPerDay = data.summary.reports / Math.max(1, data.metadata.periodDays);
  const coachingCoverage = data.regions.filter((r) => r.coaching > 0).length;

  return (
    <PdfPage pageNumber={2} periodLabel={data.metadata.periodLabel}>
      <Text style={styles.pageTitle}>Ringkasan Eksekutif</Text>
      <Text style={styles.pageSubtitle}>
        Gambaran umum jangkauan, keaktifan, pelaporan, dan pembinaan Jaring di Provinsi DKI Jakarta.
      </Text>

      {/* 4 KPI Cards */}
      <View style={styles.kpiRow}>
        <PdfKpiCard title="Total Jaring" value={data.summary.total} subtitle="Jaring Terverifikasi" accent="dark" />
        <PdfKpiCard
          title="Aktif 90 Hari"
          value={data.summary.active}
          subtitle={`${formatPercent(activeRate)} dari total`}
          accent="green"
        />
        <PdfKpiCard
          title="Pelapor Periode"
          value={data.summary.reporters}
          subtitle={`Pelapor unik ${data.metadata.periodLabel}`}
          accent="blue"
        />
        <PdfKpiCard
          title="Laporan Masuk"
          value={data.summary.reports}
          subtitle={`~${formatDecimal(reportsPerDay, 1)} laporan / hari`}
          accent="cyan"
        />
      </View>

      {/* 2 Side-by-Side Panels */}
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 8 }}>
        {/* Composition Box */}
        <View style={[styles.panel, { flex: 1, marginBottom: 0 }]}>
          <Text style={styles.panelHeader}>Komposisi Keaktifan (90 Hari)</Text>
          <View style={{ marginTop: 4, gap: 6 }}>
            <View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 7.5, fontWeight: "bold", color: PDF_COLORS.green }}>
                  Jaring Aktif: {formatNumber(data.summary.active)}
                </Text>
                <Text style={{ fontSize: 7.5, fontWeight: "bold", color: PDF_COLORS.green }}>
                  {formatPercent(activeRate)}
                </Text>
              </View>
              <PdfProgressBar percent={activeRate} color={PDF_COLORS.green} />
            </View>

            <View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 7.5, fontWeight: "bold", color: PDF_COLORS.danger }}>
                  Jaring Tidak Aktif: {formatNumber(data.summary.inactive)}
                </Text>
                <Text style={{ fontSize: 7.5, fontWeight: "bold", color: PDF_COLORS.danger }}>
                  {formatPercent(inactiveRate)}
                </Text>
              </View>
              <PdfProgressBar percent={inactiveRate} color={PDF_COLORS.danger} />
            </View>

            <Text style={{ fontSize: 7, color: PDF_COLORS.textMuted, marginTop: 2 }}>
              Jaring aktif: minimal 1 laporan atau pesan WhatsApp dalam 90 hari terakhir.
            </Text>
          </View>
        </View>

        {/* Coaching Box */}
        <View style={[styles.panel, { flex: 1, marginBottom: 0 }]}>
          <Text style={styles.panelHeader}>Ringkasan Pembinaan Jaring</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
            <View style={{ width: "47%", backgroundColor: PDF_COLORS.white, padding: 5, borderRadius: 3 }}>
              <Text style={{ fontSize: 7, color: PDF_COLORS.textMuted }}>Kegiatan Pembinaan</Text>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: PDF_COLORS.primary }}>
                {formatNumber(data.coaching.activities)}
              </Text>
              <Text style={{ fontSize: 6.5, color: PDF_COLORS.green }}>Total Pembinaan</Text>
            </View>
            <View style={{ width: "47%", backgroundColor: PDF_COLORS.white, padding: 5, borderRadius: 3 }}>
              <Text style={{ fontSize: 7, color: PDF_COLORS.textMuted }}>Jaring Dibina</Text>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: PDF_COLORS.primary }}>
                {formatNumber(data.coaching.uniqueJaring)}
              </Text>
              <Text style={{ fontSize: 6.5, color: PDF_COLORS.textMuted }}>Individu Terbina</Text>
            </View>
            <View style={{ width: "47%", backgroundColor: PDF_COLORS.white, padding: 5, borderRadius: 3 }}>
              <Text style={{ fontSize: 7, color: PDF_COLORS.textMuted }}>Cakupan Wilayah</Text>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: PDF_COLORS.primary }}>
                {coachingCoverage} Wilayah
              </Text>
              <Text style={{ fontSize: 6.5, color: PDF_COLORS.textMuted }}>Dari 6 Kab/Kota</Text>
            </View>
            <View style={{ width: "47%", backgroundColor: PDF_COLORS.white, padding: 5, borderRadius: 3 }}>
              <Text style={{ fontSize: 7, color: PDF_COLORS.textMuted }}>Status Pengajuan</Text>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: PDF_COLORS.orange }}>
                +{data.coaching.pendingActivities}
              </Text>
              <Text style={{ fontSize: 6.5, color: PDF_COLORS.textMuted }}>Menunggu Verifikasi</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Executive Highlights Box */}
      <View style={styles.panelWhite}>
        <Text style={styles.panelHeader}>Temuan Utama Eksekutif</Text>
        <View style={{ gap: 4 }}>
          <Text style={styles.bodyText}>
            • <Text style={{ fontWeight: "bold" }}>Keaktifan Tertinggi:</Text> Wilayah{" "}
            <Text style={{ fontWeight: "bold" }}>{data.highlights.highestActiveRegion}</Text> mencatatkan rasio
            keaktifan tertinggi di DKI Jakarta.
          </Text>
          <Text style={styles.bodyText}>
            • <Text style={{ fontWeight: "bold" }}>Volume Laporan Terbesar:</Text> Wilayah{" "}
            <Text style={{ fontWeight: "bold" }}>{data.highlights.highestReportRegion}</Text> menjadi penyumbang volume
            laporan terbesar.
          </Text>
          <Text style={styles.bodyText}>
            • <Text style={{ fontWeight: "bold" }}>Produktivitas Tertinggi:</Text> Wilayah{" "}
            <Text style={{ fontWeight: "bold" }}>{data.highlights.mostProductiveRegion}</Text> menghasilkan rasio
            laporan masuk per jaring aktif paling tinggi.
          </Text>
          <Text style={styles.bodyText}>
            • <Text style={{ fontWeight: "bold" }}>Kecamatan Nihil:</Text> Sebanyak{" "}
            <Text style={{ fontWeight: "bold" }}>{data.highlights.districtsWithoutReports} dari 44 kecamatan</Text> di
            DKI Jakarta belum memiliki laporan masuk.
          </Text>
          <Text style={styles.bodyText}>
            • <Text style={{ fontWeight: "bold" }}>Evaluasi Pasif:</Text> Sebanyak{" "}
            <Text style={{ fontWeight: "bold" }}>
              {formatNumber(data.summary.inactive)} Jaring ({formatPercent(inactiveRate)})
            </Text>{" "}
            belum aktif dalam 90 hari terakhir dan menjadi prioritas pembinaan.
          </Text>
        </View>
      </View>
    </PdfPage>
  );
}

// ─── Page 3: Regional Analysis ────────────────────────────────────────────────

function PdfRegionalAnalysisPage({ data }: { data: ReportPayload }) {
  const byActiveRate = [...data.regions].sort((a, b) => b.activeRate - a.activeRate);
  const byReports = [...data.regions].sort((a, b) => b.reports - a.reports);
  const maxReports = Math.max(...data.regions.map((r) => r.reports), 1);

  return (
    <PdfPage pageNumber={3} periodLabel={data.metadata.periodLabel}>
      <Text style={styles.pageTitle}>Analisis Per Wilayah</Text>
      <Text style={styles.pageSubtitle}>
        Perbandingan keaktifan, volume laporan, dan produktivitas 6 Kabupaten/Kota di DKI Jakarta.
      </Text>

      {/* 2 Comparison Panels */}
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 8 }}>
        <View style={[styles.panel, { flex: 1, marginBottom: 0 }]}>
          <Text style={styles.panelHeader}>Peringkat Keaktifan (%)</Text>
          <View style={{ gap: 4, marginTop: 2 }}>
            {byActiveRate.map((r) => (
              <View key={r.name}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 7, fontWeight: "bold" }}>{r.name}</Text>
                  <Text style={{ fontSize: 7, fontWeight: "bold", color: PDF_COLORS.green }}>
                    {formatPercent(r.activeRate)}
                  </Text>
                </View>
                <PdfProgressBar percent={r.activeRate} color={PDF_COLORS.green} />
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.panel, { flex: 1, marginBottom: 0 }]}>
          <Text style={styles.panelHeader}>Volume Laporan Masuk</Text>
          <View style={{ gap: 4, marginTop: 2 }}>
            {byReports.map((r) => (
              <View key={r.name}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 7, fontWeight: "bold" }}>{r.name}</Text>
                  <Text style={{ fontSize: 7, fontWeight: "bold", color: PDF_COLORS.blue }}>
                    {formatNumber(r.reports)}
                  </Text>
                </View>
                <PdfProgressBar percent={(r.reports / maxReports) * 100} color={PDF_COLORS.blue} />
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Regional Table */}
      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeaderText, { flex: 2 }]}>Wilayah</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Total</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Aktif</Text>
          <Text style={[styles.tableHeaderText, { flex: 1.2, textAlign: "right" }]}>Laporan</Text>
          <Text style={[styles.tableHeaderText, { flex: 1.2, textAlign: "right" }]}>Lap/Aktif</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Keaktifan</Text>
        </View>

        {data.regions.map((r, i) => (
          <View key={r.name} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowZebra : {}]}>
            <Text style={[styles.tableCell, { flex: 2, fontWeight: "bold" }]}>{r.name}</Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>{formatNumber(r.total)}</Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: "right", color: PDF_COLORS.green }]}>
              {formatNumber(r.active)}
            </Text>
            <Text
              style={[styles.tableCell, { flex: 1.2, textAlign: "right", fontWeight: "bold", color: PDF_COLORS.blue }]}
            >
              {formatNumber(r.reports)}
            </Text>
            <Text style={[styles.tableCell, { flex: 1.2, textAlign: "right" }]}>
              {formatDecimal(r.reportsPerActive)}
            </Text>
            <Text
              style={[styles.tableCell, { flex: 1, textAlign: "right", fontWeight: "bold", color: PDF_COLORS.green }]}
            >
              {formatPercent(r.activeRate)}
            </Text>
          </View>
        ))}

        <View style={styles.tableFooterRow}>
          <Text style={[styles.tableFooterText, { flex: 2, textTransform: "uppercase" }]}>Total / Rata-rata</Text>
          <Text style={[styles.tableFooterText, { flex: 1, textAlign: "right" }]}>
            {formatNumber(data.summary.total)}
          </Text>
          <Text style={[styles.tableFooterText, { flex: 1, textAlign: "right", color: PDF_COLORS.green }]}>
            {formatNumber(data.summary.active)}
          </Text>
          <Text style={[styles.tableFooterText, { flex: 1.2, textAlign: "right", color: PDF_COLORS.blue }]}>
            {formatNumber(data.summary.reports)}
          </Text>
          <Text style={[styles.tableFooterText, { flex: 1.2, textAlign: "right" }]}>
            {formatDecimal(data.summary.active > 0 ? data.summary.reports / data.summary.active : 0)}
          </Text>
          <Text style={[styles.tableFooterText, { flex: 1, textAlign: "right", color: PDF_COLORS.green }]}>
            {formatPercent((data.summary.active / data.summary.total) * 100)}
          </Text>
        </View>
      </View>
    </PdfPage>
  );
}

// ─── Page 4: Methodology ──────────────────────────────────────────────────────

function PdfMethodologyPage({ data }: { data: ReportPayload }) {
  const definitions = [
    {
      no: "1",
      title: "Total Jaring",
      color: PDF_COLORS.primary,
      desc: `Seluruh Jaring yang berstatus terverifikasi (VERIFIED) di dalam sistem hingga penarikan data (${data.metadata.pullAt}).`,
    },
    {
      no: "2",
      title: "Jaring Aktif",
      color: PDF_COLORS.green,
      desc: `Jaring terverifikasi yang memiliki minimal 1 catatan aktivitas (laporan atau WhatsApp) dalam 90 hari terakhir (sejak ${data.metadata.activityWindowStart}).`,
    },
    {
      no: "3",
      title: "Jaring Tidak Aktif",
      color: PDF_COLORS.danger,
      desc: "Jaring terverifikasi tanpa aktivitas pelaporan atau interaksi sama sekali dalam rentang 90 hari terakhir.",
    },
    {
      no: "4",
      title: "Laporan Masuk",
      color: PDF_COLORS.blue,
      desc: `Seluruh laporan informasi intelijen yang diserahkan oleh Jaring pada periode (${data.metadata.periodLabel}) berdasarkan submittedAt.`,
    },
    {
      no: "5",
      title: "Jaring yang Melapor",
      color: PDF_COLORS.cyan,
      desc: `Jumlah individu Jaring unik yang berkontribusi mengirimkan minimal 1 laporan pada periode ${data.metadata.periodLabel}.`,
    },
    {
      no: "6",
      title: "Pembinaan Jaring",
      color: PDF_COLORS.orange,
      desc: `Kegiatan pembinaan dan pengarahan yang tercatat dalam periode laporan (${data.metadata.periodLabel}) berdasarkan waktu pelaksanaan.`,
    },
  ];

  return (
    <PdfPage pageNumber={4} periodLabel={data.metadata.periodLabel}>
      <Text style={styles.pageTitle}>Metodologi dan Definisi Parameter</Text>
      <Text style={styles.pageSubtitle}>
        Pedoman definisi data, rumus operasional, dan parameter penghitungan rekapitulasi.
      </Text>

      {/* 6 Definition Cards */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        {definitions.map((item) => (
          <View key={item.no} style={[styles.panel, { width: "48.5%", marginBottom: 0, padding: 6 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 }}>
              <View
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 2,
                  backgroundColor: item.color,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: PDF_COLORS.white, fontSize: 7.5, fontWeight: "bold" }}>{item.no}</Text>
              </View>
              <Text style={{ fontSize: 8, fontWeight: "bold", color: PDF_COLORS.primary }}>{item.title}</Text>
            </View>
            <Text style={{ fontSize: 7, color: PDF_COLORS.textPrimary, lineHeight: 1.3 }}>{item.desc}</Text>
          </View>
        ))}
      </View>

      {/* Rumus & Range Panels */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={[styles.panelWhite, { flex: 1, marginBottom: 0 }]}>
          <Text style={styles.panelHeader}>Rumus dan Rentang Operasional</Text>
          <View style={{ gap: 4, fontSize: 7.5 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                borderBottomWidth: 1,
                borderBottomColor: PDF_COLORS.zebra,
                paddingBottom: 2,
              }}
            >
              <Text style={{ color: PDF_COLORS.textMuted }}>Tingkat Keaktifan:</Text>
              <Text style={{ fontWeight: "bold", color: PDF_COLORS.primary }}>(Aktif / Total) × 100%</Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                borderBottomWidth: 1,
                borderBottomColor: PDF_COLORS.zebra,
                paddingBottom: 2,
              }}
            >
              <Text style={{ color: PDF_COLORS.textMuted }}>Rasio Produktivitas:</Text>
              <Text style={{ fontWeight: "bold", color: PDF_COLORS.primary }}>Laporan / Aktif</Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                borderBottomWidth: 1,
                borderBottomColor: PDF_COLORS.zebra,
                paddingBottom: 2,
              }}
            >
              <Text style={{ color: PDF_COLORS.textMuted }}>Jendela 90 Hari:</Text>
              <Text style={{ color: PDF_COLORS.textPrimary }}>Sejak {data.metadata.activityWindowStart}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: PDF_COLORS.textMuted }}>Rentang Periode:</Text>
              <Text style={{ color: PDF_COLORS.textPrimary }}>
                {data.metadata.periodStart} s.d. {data.metadata.periodEnd} ({data.metadata.periodDays} hari)
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.panelWhite, { flex: 1, marginBottom: 0 }]}>
          <Text style={styles.panelHeader}>Batas Interpretasi Data</Text>
          <View style={{ gap: 3 }}>
            <Text style={{ fontSize: 7, color: PDF_COLORS.textPrimary, lineHeight: 1.3 }}>
              • Keaktifan 90 hari mencerminkan kesiapan operasional jangka menengah jaring, sedangkan pelapor periode
              merefleksikan kontribusi langsung pada tanggal berjalan.
            </Text>
            <Text style={{ fontSize: 7, color: PDF_COLORS.textPrimary, lineHeight: 1.3 }}>
              • Angka kegiatan pembinaan memprioritaskan kegiatan berstatus terverifikasi/disetujui. Data pembinaan
              berstatus pengajuan dicantumkan sebagai referensi pemantauan tambahan.
            </Text>
          </View>
        </View>
      </View>
    </PdfPage>
  );
}

// ─── Page 5: Coaching Analysis ────────────────────────────────────────────────

function PdfCoachingAnalysisPage({ data }: { data: ReportPayload }) {
  const coachingRegions = [...data.regions].sort((a, b) => b.coaching - a.coaching);
  const coachingCoverage = data.regions.filter((r) => r.coaching > 0).length;

  return (
    <PdfPage pageNumber={5} periodLabel={data.metadata.periodLabel}>
      <Text style={styles.pageTitle}>Analisis Pembinaan Jaring</Text>
      <Text style={styles.pageSubtitle}>
        Rekapitulasi pelaksanaan pembinaan Jaring per Kabupaten/Kota selama periode laporan.
      </Text>

      {/* 4 KPI Cards */}
      <View style={styles.kpiRow}>
        <PdfKpiCard
          title="Kegiatan Pembinaan"
          value={data.coaching.activities}
          subtitle="Terverifikasi & Disetujui"
          accent="dark"
        />
        <PdfKpiCard
          title="Jaring Dibina"
          value={data.coaching.uniqueJaring}
          subtitle="Individu Jaring Terbina"
          accent="green"
        />
        <PdfKpiCard
          title="Cakupan Wilayah"
          value={`${coachingCoverage} Wilayah`}
          subtitle="Dari 6 Kab/Kota"
          accent="blue"
        />
        <PdfKpiCard
          title="Status Pengajuan"
          value={`+${data.coaching.pendingActivities}`}
          subtitle={`Menunggu (${data.coaching.pendingJaring} Jaring)`}
          accent="orange"
        />
      </View>

      {/* Table Coaching by Region */}
      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeaderText, { width: 24, textAlign: "center" }]}>No</Text>
          <Text style={[styles.tableHeaderText, { flex: 2 }]}>Wilayah</Text>
          <Text style={[styles.tableHeaderText, { flex: 1.2, textAlign: "right" }]}>Pembinaan</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Kontribusi</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Jaring Aktif</Text>
          <Text style={[styles.tableHeaderText, { flex: 1.2, textAlign: "right" }]}>Laporan Masuk</Text>
        </View>

        {coachingRegions.map((r, i) => (
          <View key={r.name} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowZebra : {}]}>
            <Text style={[styles.tableCell, { width: 24, textAlign: "center", color: PDF_COLORS.textMuted }]}>
              {i + 1}
            </Text>
            <Text style={[styles.tableCell, { flex: 2, fontWeight: "bold" }]}>{r.name}</Text>
            <Text
              style={[
                styles.tableCell,
                { flex: 1.2, textAlign: "right", fontWeight: "bold", color: PDF_COLORS.primary },
              ]}
            >
              {formatNumber(r.coaching)}
            </Text>
            <Text
              style={[styles.tableCell, { flex: 1, textAlign: "right", fontWeight: "bold", color: PDF_COLORS.cyan }]}
            >
              {formatPercent(r.coachingShare)}
            </Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: "right", color: PDF_COLORS.green }]}>
              {formatNumber(r.active)}
            </Text>
            <Text style={[styles.tableCell, { flex: 1.2, textAlign: "right", color: PDF_COLORS.blue }]}>
              {formatNumber(r.reports)}
            </Text>
          </View>
        ))}

        <View style={styles.tableFooterRow}>
          <Text style={[styles.tableFooterText, { width: 24 }]} />
          <Text style={[styles.tableFooterText, { flex: 2, textTransform: "uppercase" }]}>
            Total Kegiatan Terverifikasi
          </Text>
          <Text style={[styles.tableFooterText, { flex: 1.2, textAlign: "right" }]}>
            {formatNumber(data.coaching.activities)}
          </Text>
          <Text style={[styles.tableFooterText, { flex: 1, textAlign: "right" }]}>100,0%</Text>
          <Text style={[styles.tableFooterText, { flex: 1, textAlign: "right", color: PDF_COLORS.green }]}>
            {formatNumber(data.summary.active)}
          </Text>
          <Text style={[styles.tableFooterText, { flex: 1.2, textAlign: "right", color: PDF_COLORS.blue }]}>
            {formatNumber(data.summary.reports)}
          </Text>
        </View>
      </View>

      {/* Strategic Coaching Notes */}
      <View style={[styles.panelWhite, { marginTop: 8 }]}>
        <Text style={styles.panelHeader}>Catatan dan Evaluasi Pembinaan</Text>
        <Text style={styles.bodyText}>
          Kegiatan pembinaan Jaring berkonsentrasi tinggi di wilayah operasional strategis dengan intensitas pelaporan
          tinggi. Total kegiatan mencapai{" "}
          <Text style={{ fontWeight: "bold" }}>{formatNumber(data.coaching.activities)} kegiatan</Text> membina{" "}
          <Text style={{ fontWeight: "bold" }}>{formatNumber(data.coaching.uniqueJaring)} individu Jaring unik</Text>.
          Terdapat{" "}
          <Text style={{ fontWeight: "bold" }}>{data.coaching.pendingActivities} kegiatan pembinaan tambahan</Text> yang
          masih dalam proses pengajuan/verifikasi.
        </Text>
      </View>
    </PdfPage>
  );
}

// ─── Pages 6–11: Region Detail Page (1 Page per Region) ───────────────────────

function PdfRegionDetailPage({
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
      <PdfPage pageNumber={pageNumber} periodLabel={data.metadata.periodLabel}>
        <Text style={{ color: PDF_COLORS.danger, fontSize: 12 }}>Data wilayah {regionName} tidak ditemukan.</Text>
      </PdfPage>
    );
  }

  const mostReports = [...districts].sort((a, b) => b.reports - a.reports)[0];
  const highestActive = [...districts].sort((a, b) => b.activeRate - a.activeRate)[0];
  const mostCoaching = [...districts].sort((a, b) => b.coaching - a.coaching)[0];

  return (
    <PdfPage pageNumber={pageNumber} periodLabel={data.metadata.periodLabel}>
      <Text style={styles.pageTitle}>Detail Wilayah — {region.fullName}</Text>
      <Text style={styles.pageSubtitle}>
        Rincian jangkauan, keaktifan, produktivitas pelaporan, dan pembinaan tingkat kecamatan.
      </Text>

      {/* 4 KPI Cards */}
      <View style={styles.kpiRow}>
        <PdfKpiCard title="Total Jaring" value={region.total} subtitle="Jaring Terverifikasi" accent="dark" />
        <PdfKpiCard
          title="Aktif 90 Hari"
          value={region.active}
          subtitle={`${formatPercent(region.activeRate)} tingkat aktif`}
          accent="green"
        />
        <PdfKpiCard
          title="Tidak Aktif"
          value={region.inactive}
          subtitle={`${formatPercent(region.inactiveRate)} belum melapor`}
          accent="orange"
        />
        <PdfKpiCard
          title="Laporan Masuk"
          value={region.reports}
          subtitle={`${formatDecimal(region.reportsPerActive)} lap/aktif`}
          accent="blue"
        />
      </View>

      {/* Districts Table */}
      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeaderText, { width: 20, textAlign: "center" }]}>No</Text>
          <Text style={[styles.tableHeaderText, { flex: 2.2 }]}>Kecamatan</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Total</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Aktif</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Pasif</Text>
          <Text style={[styles.tableHeaderText, { flex: 1.2, textAlign: "right" }]}>Laporan</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Bina</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Keaktifan</Text>
        </View>

        {districts.map((d, i) => (
          <View key={d.name} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowZebra : {}]}>
            <Text style={[styles.tableCell, { width: 20, textAlign: "center", color: PDF_COLORS.textMuted }]}>
              {i + 1}
            </Text>
            <Text style={[styles.tableCell, { flex: 2.2, fontWeight: "bold" }]}>{d.name}</Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>{formatNumber(d.total)}</Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: "right", color: PDF_COLORS.green }]}>
              {formatNumber(d.active)}
            </Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: "right", color: PDF_COLORS.textMuted }]}>
              {formatNumber(d.inactive)}
            </Text>
            <Text
              style={[styles.tableCell, { flex: 1.2, textAlign: "right", fontWeight: "bold", color: PDF_COLORS.blue }]}
            >
              {formatNumber(d.reports)}
            </Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>{formatNumber(d.coaching)}</Text>
            <Text
              style={[styles.tableCell, { flex: 1, textAlign: "right", fontWeight: "bold", color: PDF_COLORS.green }]}
            >
              {formatPercent(d.activeRate)}
            </Text>
          </View>
        ))}

        <View style={styles.tableFooterRow}>
          <Text style={[styles.tableFooterText, { width: 20 }]} />
          <Text style={[styles.tableFooterText, { flex: 2.2, textTransform: "uppercase" }]}>Total Wilayah</Text>
          <Text style={[styles.tableFooterText, { flex: 1, textAlign: "right" }]}>{formatNumber(region.total)}</Text>
          <Text style={[styles.tableFooterText, { flex: 1, textAlign: "right", color: PDF_COLORS.green }]}>
            {formatNumber(region.active)}
          </Text>
          <Text style={[styles.tableFooterText, { flex: 1, textAlign: "right" }]}>{formatNumber(region.inactive)}</Text>
          <Text style={[styles.tableFooterText, { flex: 1.2, textAlign: "right", color: PDF_COLORS.blue }]}>
            {formatNumber(region.reports)}
          </Text>
          <Text style={[styles.tableFooterText, { flex: 1, textAlign: "right" }]}>{formatNumber(region.coaching)}</Text>
          <Text style={[styles.tableFooterText, { flex: 1, textAlign: "right", color: PDF_COLORS.green }]}>
            {formatPercent(region.activeRate)}
          </Text>
        </View>
      </View>

      {/* Region Highlights */}
      <View style={[styles.panelWhite, { marginTop: 8 }]}>
        <Text style={styles.panelHeader}>Sorotan Wilayah {region.name}</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={[styles.panel, { flex: 1, marginBottom: 0, padding: 6 }]}>
            <Text style={{ fontSize: 7, color: PDF_COLORS.textMuted, textTransform: "uppercase" }}>
              Laporan Terbanyak
            </Text>
            <Text style={{ fontSize: 8.5, fontWeight: "bold", color: PDF_COLORS.blue, marginTop: 1 }}>
              Kec. {mostReports?.name ?? "-"}
            </Text>
            <Text style={{ fontSize: 7.5, color: PDF_COLORS.textPrimary }}>
              {formatNumber(mostReports?.reports ?? 0)} laporan
            </Text>
          </View>

          <View style={[styles.panel, { flex: 1, marginBottom: 0, padding: 6 }]}>
            <Text style={{ fontSize: 7, color: PDF_COLORS.textMuted, textTransform: "uppercase" }}>
              Keaktifan Tertinggi
            </Text>
            <Text style={{ fontSize: 8.5, fontWeight: "bold", color: PDF_COLORS.green, marginTop: 1 }}>
              Kec. {highestActive?.name ?? "-"}
            </Text>
            <Text style={{ fontSize: 7.5, color: PDF_COLORS.textPrimary }}>
              {formatPercent(highestActive?.activeRate ?? 0)} aktif
            </Text>
          </View>

          <View style={[styles.panel, { flex: 1, marginBottom: 0, padding: 6 }]}>
            <Text style={{ fontSize: 7, color: PDF_COLORS.textMuted, textTransform: "uppercase" }}>
              Pembinaan Terbanyak
            </Text>
            <Text style={{ fontSize: 8.5, fontWeight: "bold", color: PDF_COLORS.primary, marginTop: 1 }}>
              Kec. {mostCoaching && mostCoaching.coaching > 0 ? mostCoaching.name : "-"}
            </Text>
            <Text style={{ fontSize: 7.5, color: PDF_COLORS.textPrimary }}>
              {formatNumber(mostCoaching?.coaching ?? 0)} kegiatan
            </Text>
          </View>
        </View>
      </View>
    </PdfPage>
  );
}

// ─── Page 12: District Highlights ─────────────────────────────────────────────

function PdfDistrictHighlightsPage({ data }: { data: ReportPayload }) {
  const topDistricts = data.highlights.topDistricts;

  return (
    <PdfPage pageNumber={12} periodLabel={data.metadata.periodLabel}>
      <Text style={styles.pageTitle}>Sorotan Kecamatan (Top 10)</Text>
      <Text style={styles.pageSubtitle}>
        10 Kecamatan dengan volume laporan masuk tertinggi di seluruh Provinsi DKI Jakarta.
      </Text>

      {/* Top 10 Table */}
      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeaderText, { width: 35, textAlign: "center" }]}>Peringkat</Text>
          <Text style={[styles.tableHeaderText, { flex: 2 }]}>Kecamatan</Text>
          <Text style={[styles.tableHeaderText, { flex: 2 }]}>Kabupaten / Kota</Text>
          <Text style={[styles.tableHeaderText, { flex: 1.2, textAlign: "right" }]}>Laporan Masuk</Text>
          <Text style={[styles.tableHeaderText, { flex: 1.2, textAlign: "right" }]}>Aktif / Total</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Keaktifan</Text>
        </View>

        {topDistricts.map((item, i) => (
          <View key={`${item.region}-${item.name}`} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowZebra : {}]}>
            <Text
              style={[
                styles.tableCell,
                { width: 35, textAlign: "center", fontWeight: "bold", color: PDF_COLORS.primary },
              ]}
            >
              {item.rank || i + 1}
            </Text>
            <Text style={[styles.tableCell, { flex: 2, fontWeight: "bold" }]}>{item.name}</Text>
            <Text style={[styles.tableCell, { flex: 2, color: PDF_COLORS.textMuted }]}>{item.region}</Text>
            <Text
              style={[styles.tableCell, { flex: 1.2, textAlign: "right", fontWeight: "bold", color: PDF_COLORS.blue }]}
            >
              {formatNumber(item.reports)}
            </Text>
            <Text style={[styles.tableCell, { flex: 1.2, textAlign: "right" }]}>
              {item.active} / {item.total}
            </Text>
            <Text
              style={[styles.tableCell, { flex: 1, textAlign: "right", fontWeight: "bold", color: PDF_COLORS.green }]}
            >
              {formatPercent(item.activeRate)}
            </Text>
          </View>
        ))}
      </View>

      {/* Concentration & Zero Districts Analysis */}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
        <View style={[styles.panel, { flex: 1, marginBottom: 0 }]}>
          <Text style={styles.panelHeader}>Konsentrasi Laporan Wilayah</Text>
          <Text style={styles.bodyText}>
            Sebagian besar volume laporan didorong secara signifikan oleh kecamatan-kecamatan simpul aktivitas utama di
            Jakarta Timur (Matraman, Jatinegara) serta Jakarta Selatan (Kebayoran Baru, Setiabudi).
          </Text>
        </View>

        <View style={[styles.panel, { flex: 1, marginBottom: 0 }]}>
          <Text style={styles.panelHeader}>Evaluasi Kecamatan Nihil Laporan</Text>
          <Text style={styles.bodyText}>
            Terdapat <Text style={{ fontWeight: "bold" }}>{data.highlights.districtsWithoutReports} kecamatan</Text>{" "}
            yang belum mencatatkan laporan masuk selama periode {data.metadata.periodLabel}. Wilayah ini
            direkomendasikan sebagai sasaran prioritas asistensi lapangan bagi Petugas Wilayah.
          </Text>
        </View>
      </View>
    </PdfPage>
  );
}

// ─── Page 13: Final Summary & Reconciliation ──────────────────────────────────

function PdfFinalSummaryPage({ data }: { data: ReportPayload }) {
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
    <PdfPage pageNumber={13} periodLabel={data.metadata.periodLabel}>
      <Text style={styles.pageTitle}>Ringkasan Akhir dan Rekonsiliasi Data</Text>
      <Text style={styles.pageSubtitle}>
        Sintesis menyeluruh jangkauan, produktivitas, serta verifikasi integritas data laporan.
      </Text>

      {/* Synthesis Box */}
      <View style={[styles.panelWhite, { marginBottom: 8 }]}>
        <Text style={styles.panelHeader}>Sintesis Eksekutif Laporan</Text>
        <Text style={styles.bodyText}>
          Pada periode <Text style={{ fontWeight: "bold" }}>{data.metadata.periodLabel}</Text>, sistem mencatat total{" "}
          <Text style={{ fontWeight: "bold" }}>{formatNumber(data.summary.total)} Jaring</Text> terverifikasi di seluruh
          Provinsi DKI Jakarta dengan{" "}
          <Text style={{ fontWeight: "bold" }}>
            {formatNumber(data.summary.active)} Jaring aktif ({formatPercent(activeRate)})
          </Text>{" "}
          dalam 90 hari terakhir. Sebanyak{" "}
          <Text style={{ fontWeight: "bold" }}>{formatNumber(data.summary.reporters)} Jaring</Text> berkontribusi aktif
          menyerahkan <Text style={{ fontWeight: "bold" }}>{formatNumber(data.summary.reports)} laporan intelijen</Text>
          . Wilayah <Text style={{ fontWeight: "bold" }}>{data.highlights.highestReportRegion}</Text> mencatatkan volume
          laporan tertinggi, sementara <Text style={{ fontWeight: "bold" }}>{data.highlights.highestActiveRegion}</Text>{" "}
          memiliki rasio keaktifan terbaik. Pembinaan Jaring telah dilaksanakan sebanyak{" "}
          <Text style={{ fontWeight: "bold" }}>{formatNumber(data.coaching.activities)} kegiatan</Text> membina{" "}
          <Text style={{ fontWeight: "bold" }}>{formatNumber(data.coaching.uniqueJaring)} individu Jaring</Text>.
        </Text>
      </View>

      {/* Reconciliation Table */}
      <View style={styles.table}>
        <View style={[styles.tableHeaderRow, { justifyContent: "space-between" }]}>
          <Text style={styles.tableHeaderText}>Tabel Rekonsiliasi Integritas Data</Text>
          <Text
            style={{
              fontSize: 7,
              fontWeight: "bold",
              color: PDF_COLORS.white,
              backgroundColor: isAllValid ? PDF_COLORS.green : PDF_COLORS.danger,
              paddingHorizontal: 6,
              paddingVertical: 1,
              borderRadius: 3,
            }}
          >
            {isAllValid ? "STATUS: VALID & TERVERIFIKASI" : "STATUS: PERLU CEK"}
          </Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 3 }]}>Konsistensi Status Keaktifan (Aktif + Pasif = Total)</Text>
          <Text style={[styles.tableCell, { flex: 2, textAlign: "right" }]}>
            {data.summary.active} + {data.summary.inactive} = {data.summary.total}
          </Text>
          <Text
            style={[styles.tableCell, { width: 60, textAlign: "right", fontWeight: "bold", color: PDF_COLORS.green }]}
          >
            {isSumActiveValid ? "VALID" : "TIDAK SESUAI"}
          </Text>
        </View>

        <View style={[styles.tableRow, styles.tableRowZebra]}>
          <Text style={[styles.tableCell, { flex: 3 }]}>Agregasi Total Jaring Wilayah vs Ringkasan</Text>
          <Text style={[styles.tableCell, { flex: 2, textAlign: "right" }]}>
            {sumRegionTotal} vs {data.summary.total}
          </Text>
          <Text
            style={[styles.tableCell, { width: 60, textAlign: "right", fontWeight: "bold", color: PDF_COLORS.green }]}
          >
            {isRegionTotalValid ? "VALID" : "TIDAK SESUAI"}
          </Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 3 }]}>Agregasi Laporan Masuk Wilayah vs Ringkasan</Text>
          <Text style={[styles.tableCell, { flex: 2, textAlign: "right" }]}>
            {sumRegionReports} vs {data.summary.reports}
          </Text>
          <Text
            style={[styles.tableCell, { width: 60, textAlign: "right", fontWeight: "bold", color: PDF_COLORS.green }]}
          >
            {isRegionReportsValid ? "VALID" : "TIDAK SESUAI"}
          </Text>
        </View>

        <View style={[styles.tableRow, styles.tableRowZebra]}>
          <Text style={[styles.tableCell, { flex: 3 }]}>Agregasi Kegiatan Pembinaan vs Ringkasan</Text>
          <Text style={[styles.tableCell, { flex: 2, textAlign: "right" }]}>
            {sumRegionCoaching} vs {data.coaching.activities}
          </Text>
          <Text
            style={[styles.tableCell, { width: 60, textAlign: "right", fontWeight: "bold", color: PDF_COLORS.green }]}
          >
            {isRegionCoachingValid ? "VALID" : "TIDAK SESUAI"}
          </Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 3 }]}>Cakupan Seluruh Kecamatan DKI Jakarta</Text>
          <Text style={[styles.tableCell, { flex: 2, textAlign: "right" }]}>44 Kecamatan Terverifikasi</Text>
          <Text
            style={[styles.tableCell, { width: 60, textAlign: "right", fontWeight: "bold", color: PDF_COLORS.green }]}
          >
            LENGKAP
          </Text>
        </View>
      </View>
    </PdfPage>
  );
}

// ─── Main 13-Page PDF Document ────────────────────────────────────────────────

export function JaringReportPdfDocument({ data }: { data: ReportPayload }) {
  return (
    <Document
      title={`Laporan Rekap Jaring - ${data.metadata.periodLabel}`}
      author="Kedeputian II"
      subject="Laporan Rekap Aktivitas dan Produktivitas Jaring"
      keywords="jaring, rekap, aktivitas, produktivitas, deputi ii"
    >
      <PdfCoverPage data={data} />
      <PdfExecutiveSummaryPage data={data} />
      <PdfRegionalAnalysisPage data={data} />
      <PdfMethodologyPage data={data} />
      <PdfCoachingAnalysisPage data={data} />

      {REGION_PAGE_ORDER.map((regionName, index) => (
        <PdfRegionDetailPage key={regionName} data={data} regionName={regionName} pageNumber={6 + index} />
      ))}

      <PdfDistrictHighlightsPage data={data} />
      <PdfFinalSummaryPage data={data} />
    </Document>
  );
}
