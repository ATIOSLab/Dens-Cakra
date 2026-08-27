"use client";

import Link from "next/link";

import { ArrowDownRight, ArrowRight, ArrowUpRight, CircleHelp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { DonutChart, HorizontalBar, TrendArea, VerticalBar } from "./kpi-charts";
import {
  buildDrilldownUrl,
  cardDescription,
  cardLabel,
  comparisonLabel,
  comparisonTone,
  formatDateTime,
  formatDurationMinutes,
  formatNumber,
  formatPercent,
  KPI_TONE_CLASSES,
} from "./kpi-presentation";
import { KpiEmpty, KpiError, KpiLoading } from "./kpi-states";
import type {
  KpiAnomalies,
  KpiAnomalyRow,
  KpiCard,
  KpiComparison,
  KpiDetail,
  KpiFilters,
  KpiGaswilRow,
  KpiJaringRow,
  KpiLeaderboardData,
  KpiProductivity,
  KpiRegionComparison,
  KpiReportsBaket,
  KpiSummary,
  KpiTrends,
  KpiWhatsappCenter,
} from "./kpi-types";

type FetchState<T> = { data: T | null; loading: boolean; error: string | null };

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-bold text-xs text-[var(--dc-text-muted)] uppercase tracking-wider">{children}</h3>;
}

function Delta({ comparison, metricTone }: { comparison: KpiComparison; metricTone: string }) {
  const tone = comparisonTone(comparison.direction, metricTone);
  const Icon = DIRECTION_ICONS[comparison.direction];
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs", KPI_TONE_CLASSES[tone])}>
      <Icon className="size-3.5" aria-hidden />
      {comparisonLabel(comparison)}
    </span>
  );
}

const DIRECTION_ICONS = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: ArrowRight,
} as const;

function MetricCard({ card, drilldown }: { card: KpiCard; drilldown?: string | null }) {
  const isPercent = card.key === "productivityPercent";
  return (
    <Card size="sm" className="min-w-0">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">{cardLabel(card.key)}</CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-[var(--dc-text-muted)] hover:text-[var(--dc-text-primary)]"
                aria-label={`Definisi ${cardLabel(card.key)}`}
              >
                <CircleHelp className="size-3.5" aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{cardDescription(card.key)}</TooltipContent>
          </Tooltip>
        </div>
        <CardDescription>{cardDescription(card.key)}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums text-[var(--dc-text-primary)]">
          {isPercent ? formatPercent(card.value) : formatNumber(card.value)}
        </div>
        {card.comparison ? (
          <Delta comparison={card.comparison} metricTone={card.tone} />
        ) : (
          <span className="inline-flex items-center gap-0.5 text-xs text-[var(--dc-text-muted)]">
            Perbandingan periode tidak tersedia
          </span>
        )}
        {drilldown ? (
          <Link
            href={drilldown}
            className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--dc-primary)] underline-offset-4 hover:underline"
          >
            Lihat detail
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MetodologiPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Metodologi Perhitungan</CardTitle>
        <CardDescription>
          Pedoman membaca seluruh angka agar Laporan Jaring yang sudah menjadi Baket tidak dihitung dua kali.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-xs leading-relaxed text-[var(--dc-text-secondary)]">
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            <strong>Total Laporan Jaring Masuk</strong> — seluruh Laporan Jaring unik yang berhasil dikirim dalam
            periode, termasuk yang kemudian menjadi Baket.
          </li>
          <li>
            <strong>Masih Berstatus Laporan Jaring</strong> — bagian dari Total yang belum dikonversi menjadi Baket.
          </li>
          <li>
            <strong>Sudah Menjadi Baket</strong> — bagian dari Total yang telah diproses menjadi Baket (bukan tambahan
            di luar Total).
          </li>
          <li>
            <strong>Jaring Produktif</strong> — Jaring Aktif Terverifikasi yang mengirim minimal satu Laporan Jaring
            valid dalam periode.
          </li>
        </ol>
        <div className="rounded-md border bg-muted/40 p-3 font-mono text-[11px]">
          Rumus: Total Laporan Jaring Masuk = Masih Berstatus Laporan Jaring + Sudah Menjadi Baket
        </div>
      </CardContent>
    </Card>
  );
}

export function SummaryTab({ state, filters }: { state: FetchState<KpiSummary>; filters: KpiFilters }) {
  if (state.loading) return <KpiLoading rows={4} />;
  if (state.error) return <KpiError message={state.error} />;
  if (!state.data) return <KpiEmpty title="Tidak ada data" description="Ringkasan KPI belum tersedia." />;

  const { cards, statusBreakdown, insight, metricDefinitions, period } = state.data;
  const drilldownByKey = new Map(
    metricDefinitions.map((metric) => [metric.key, buildDrilldownUrl(metric.drilldown, period, filters)]),
  );
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {cards.map((card) => (
          <MetricCard key={card.key} card={card} drilldown={drilldownByKey.get(card.key)} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Status Administratif Jaring</CardTitle>
            <CardDescription>Distribusi status seluruh Jaring dalam cakupan.</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart
              items={statusBreakdown.groups.map((group) => ({
                key: group.key,
                label: group.label,
                value: group.value,
              }))}
              centerLabel="Jaring"
            />
          </CardContent>
        </Card>
        <MetodologiPanel />
      </div>
      <p className="mt-2 text-xs text-[var(--dc-text-muted)]">
        Wilayah Belum Terpetakan: {formatNumber(statusBreakdown.withoutArea)} Jaring tanpa relasi wilayah.
      </p>

      {insight ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ringkasan Otomatis untuk Pimpinan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed text-[var(--dc-text-secondary)]">
            <p>
              <strong>Fakta:</strong> Terdapat{" "}
              {formatNumber(cards.find((card) => card.key === "totalJaring")?.value ?? 0)} Jaring yang Diajukan,{" "}
              {formatNumber(cards.find((card) => card.key === "verifiedJaring")?.value ?? 0)} Jaring Terverifikasi,{" "}
              {formatNumber(cards.find((card) => card.key === "activeJaring")?.value ?? 0)} Jaring Aktif, dan{" "}
              {formatNumber(cards.find((card) => card.key === "inactiveJaring")?.value ?? 0)} Jaring Tidak Aktif.
            </p>
            {insight.topRegion ? (
              <p>
                <strong>Temuan:</strong> Wilayah paling produktif adalah {insight.topRegion.name} (
                {formatPercent(insight.topRegion.productivity)}).
              </p>
            ) : null}
            {insight.lowestRegion ? (
              <p>
                <strong>Perlu perhatian:</strong> Wilayah paling rendah produktivitasnya adalah{" "}
                {insight.lowestRegion.name} ({formatPercent(insight.lowestRegion.productivity)}).
              </p>
            ) : null}
            {insight.noReportRegions.length > 0 ? (
              <p>
                <strong>Wilayah tanpa laporan:</strong> {insight.noReportRegions.slice(0, 6).join(", ")}
                {insight.noReportRegions.length > 6 ? ", dan lainnya." : "."}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export function ProductivityTab({ state }: { state: FetchState<KpiProductivity> }) {
  if (state.loading) return <KpiLoading rows={4} />;
  if (state.error) return <KpiError message={state.error} />;
  if (!state.data) return <KpiEmpty title="Tidak ada data" description="Data produktivitas belum tersedia." />;

  const { metrics, frequencyDistribution, ranking } = state.data;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Jaring Aktif Terverifikasi" value={formatNumber(metrics.activeVerified)} />
        <StatTile label="Jaring Produktif" value={formatNumber(metrics.productive)} />
        <StatTile label="Jaring Belum Mengirim Laporan" value={formatNumber(metrics.notReporting)} />
        <StatTile label="Persentase Produktivitas" value={formatPercent(metrics.productivityPercent)} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Rata-rata laporan per Jaring Produktif" value={String(metrics.avgReportsPerProductive)} />
        <StatTile label="Jaring mengirim 1 laporan" value={formatNumber(metrics.oneReportJaring)} />
        <StatTile label="Jaring mengirim > 1 laporan" value={formatNumber(metrics.multipleReportJaring)} />
        <StatTile label="Jaring menghasilkan Baket" value={formatNumber(metrics.baketProducingJaring)} />
      </div>

      <div>
        <SectionTitle>Distribusi Frekuensi Pelaporan</SectionTitle>
        <div className="mt-3">
          <VerticalBar
            items={frequencyDistribution.map((bucket) => ({
              key: bucket.label,
              label: bucket.label,
              value: bucket.value,
            }))}
          />
        </div>
      </div>

      <div>
        <SectionTitle>Peringkat Wilayah</SectionTitle>
        <div className="mt-3">
          <RankingTable rows={ranking.items} />
        </div>
      </div>
    </div>
  );
}

function RankingTable({
  rows,
}: {
  rows: Array<{
    rank: number;
    name: string;
    activeVerified: number;
    productive: number;
    notReporting: number;
    totalReports: number;
    toBaket: number;
    productivity: number;
  }>;
}) {
  if (rows.length === 0)
    return <KpiEmpty title="Tidak ada wilayah" description="Belum ada data wilayah untuk ditampilkan." />;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Peringkat</TableHead>
          <TableHead>Wilayah</TableHead>
          <TableHead className="text-right">Aktif Terverifikasi</TableHead>
          <TableHead className="text-right">Produktif</TableHead>
          <TableHead className="text-right">Belum Mengirim</TableHead>
          <TableHead className="text-right">Total Laporan</TableHead>
          <TableHead className="text-right">Menjadi Baket</TableHead>
          <TableHead className="text-right">Produktivitas</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.name}>
            <TableCell className="font-mono text-xs">{row.rank}</TableCell>
            <TableCell className="font-medium">{row.name}</TableCell>
            <TableCell className="text-right tabular-nums">{formatNumber(row.activeVerified)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatNumber(row.productive)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatNumber(row.notReporting)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatNumber(row.totalReports)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatNumber(row.toBaket)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatPercent(row.productivity)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-semibold tabular-nums text-[var(--dc-text-primary)]">{value}</div>
      </CardContent>
    </Card>
  );
}

export function RegionTab({
  state,
  hasAreaId,
  onSelectRegion,
  onBack,
}: {
  state: FetchState<KpiRegionComparison>;
  hasAreaId: boolean;
  onSelectRegion: (areaId: string) => void;
  onBack: () => void;
}) {
  if (state.loading) return <KpiLoading rows={4} />;
  if (state.error) return <KpiError message={state.error} />;
  if (!state.data) return <KpiEmpty title="Tidak ada data" description="Perbandingan wilayah belum tersedia." />;

  const { breadcrumb, rows } = state.data;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--dc-text-muted)]">
        <span>{breadcrumb.label}</span>
        <Badge variant="secondary">{breadcrumb.root}</Badge>
        {hasAreaId ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
          >
            ← Kembali
          </button>
        ) : null}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Laporan per Wilayah</CardTitle>
            <CardDescription>Volume Laporan Jaring untuk setiap wilayah dalam cakupan.</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBar
              items={rows.items.map((row) => ({ key: row.id, label: row.name, value: row.totalReports }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Jaring Produktif per Wilayah</CardTitle>
            <CardDescription>Jumlah Jaring Aktif Terverifikasi yang mengirim laporan.</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBar items={rows.items.map((row) => ({ key: row.id, label: row.name, value: row.productive }))} />
          </CardContent>
        </Card>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Peringkat</TableHead>
            <TableHead>Wilayah</TableHead>
            <TableHead className="text-right">Produktivitas</TableHead>
            <TableHead className="text-right">Aktif Terverifikasi</TableHead>
            <TableHead className="text-right">Produktif</TableHead>
            <TableHead className="text-right">Belum Mengirim</TableHead>
            <TableHead className="text-right">Total Laporan</TableHead>
            <TableHead className="text-right">Menjadi Baket</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-[var(--dc-text-muted)]">
                Tidak ada data wilayah.
              </TableCell>
            </TableRow>
          ) : (
            rows.items.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs">{row.rank}</TableCell>
                <TableCell>
                  <button
                    type="button"
                    className="font-medium text-left underline-offset-4 hover:underline"
                    onClick={() => onSelectRegion(row.id)}
                    title={`Tampilkan detail ${row.name}`}
                  >
                    {row.name}
                  </button>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatPercent(row.productivity)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(row.activeVerified)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(row.productive)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(row.notReporting)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(row.totalReports)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(row.toBaket)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function ReportsTab({ state }: { state: FetchState<KpiReportsBaket> }) {
  if (state.loading) return <KpiLoading rows={4} />;
  if (state.error) return <KpiError message={state.error} />;
  if (!state.data)
    return <KpiEmpty title="Tidak ada data" description="Data Laporan Jaring dan Baket belum tersedia." />;

  const { pipeline, baket, trend, highestConversionRegions, lowestConversionRegions } = state.data;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Total Laporan Jaring" value={formatNumber(pipeline.total)} />
        <StatTile label="Laporan menjadi Baket" value={formatNumber(pipeline.toBaket)} />
        <StatTile label="Persentase konversi" value={formatPercent(pipeline.conversionPercent)} />
        <StatTile label="Baket dari Laporan" value={formatNumber(baket.fromReport)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Komposisi Total Laporan Jaring</CardTitle>
            <CardDescription>Bagian yang masih berstatus laporan dan yang sudah menjadi Baket.</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart
              items={[
                { key: "pending", label: "Masih Berstatus Laporan Jaring", value: pipeline.total - pipeline.toBaket },
                { key: "baket", label: "Sudah Menjadi Baket", value: pipeline.toBaket },
              ]}
              centerLabel="Laporan"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Alur Pengolahan Laporan Jaring → Baket</CardTitle>
            <CardDescription>Tahapan pemrosesan dari Laporan Jaring masuk hingga menjadi Baket.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="secondary">Masuk</Badge>
              <span className="text-[var(--dc-text-muted)]">→</span>
              <Badge variant="secondary">Diproses</Badge>
              <span className="text-[var(--dc-text-muted)]">→</span>
              <Badge variant="secondary">Diverifikasi</Badge>
              <span className="text-[var(--dc-text-muted)]">→</span>
              <Badge>Baket</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {pipeline.byStage.map((stage) => (
                <StatTile key={stage.key} label={stage.label} value={formatNumber(stage.value)} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <SectionTitle>Tren Laporan Jaring</SectionTitle>
        <div className="mt-3">
          <TrendArea points={trend.points} granularity={trend.granularity} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Konversi Baket Tertinggi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {highestConversionRegions.length === 0 ? (
              <p className="text-sm text-[var(--dc-text-muted)]">Belum ada data.</p>
            ) : (
              highestConversionRegions.map((region) => (
                <div key={region.name} className="flex justify-between text-sm">
                  <span>{region.name}</span>
                  <span className="tabular-nums text-[var(--dc-text-secondary)]">
                    {formatPercent(region.conversion)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Konversi Baket Terendah</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {lowestConversionRegions.length === 0 ? (
              <p className="text-sm text-[var(--dc-text-muted)]">Belum ada data.</p>
            ) : (
              lowestConversionRegions.map((region) => (
                <div key={region.name} className="flex justify-between text-sm">
                  <span>{region.name}</span>
                  <span className="tabular-nums text-[var(--dc-text-secondary)]">
                    {formatPercent(region.conversion)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function WhatsappTab({ state }: { state: FetchState<KpiWhatsappCenter> }) {
  if (state.loading) return <KpiLoading rows={4} />;
  if (state.error) return <KpiError message={state.error} />;
  if (!state.data)
    return <KpiEmpty title="Tidak ada data" description="Data kendala WhatsApp Center belum tersedia." />;

  const { summary, channelStatus, incidents, failedAttempts } = state.data;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatTile label="WhatsApp Center aktif" value={formatNumber(summary.active)} />
        <StatTile label="Tidak aktif" value={formatNumber(summary.inactive)} />
        <StatTile label="Terputus" value={formatNumber(summary.disconnected)} />
        <StatTile label="Suspend" value={formatNumber(summary.suspend)} />
        <StatTile label="Status tidak diketahui" value={formatNumber(summary.unknown)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Distribusi Status WhatsApp Center</CardTitle>
          <CardDescription>Kondisi saluran WhatsApp Center saat ini.</CardDescription>
        </CardHeader>
        <CardContent>
          <DonutChart
            items={[
              { key: "active", label: "Aktif", value: summary.active },
              { key: "inactive", label: "Tidak aktif", value: summary.inactive },
              { key: "disconnected", label: "Terputus", value: summary.disconnected },
              { key: "suspend", label: "Suspend", value: summary.suspend },
              { key: "unknown", label: "Status tidak diketahui", value: summary.unknown },
            ]}
            centerLabel="Saluran"
          />
        </CardContent>
      </Card>

      <div>
        <SectionTitle>Status WhatsApp Center</SectionTitle>
        <div className="mt-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Nomor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channelStatus.map((channel) => (
                <TableRow key={channel.id}>
                  <TableCell className="font-mono text-xs">{channel.code}</TableCell>
                  <TableCell>{channel.name}</TableCell>
                  <TableCell className="font-mono text-xs">{channel.number}</TableCell>
                  <TableCell>
                    <Badge variant={channel.status === "aktif" ? "default" : "secondary"}>{channel.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <SectionTitle>Kejadian Gangguan</SectionTitle>
        <div className="mt-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jenis</TableHead>
                <TableHead>Waktu mulai</TableHead>
                <TableHead>Waktu pulih</TableHead>
                <TableHead className="text-right">Durasi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-[var(--dc-text-muted)]">
                    Tidak ada kejadian gangguan pada periode ini.
                  </TableCell>
                </TableRow>
              ) : (
                incidents.map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell>
                      <Badge variant={incident.type === "error" ? "destructive" : "secondary"}>{incident.type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{formatDateTime(incident.startedAt)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {incident.recoveredAt ? formatDateTime(incident.recoveredAt) : "Masih terganggu"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatDurationMinutes(incident.durationMinutes)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <SectionTitle>Percobaan Pelaporan Gagal</SectionTitle>
        <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile label="Total gagal" value={formatNumber(failedAttempts.total)} />
          <StatTile label="Terbukti terkait" value={formatNumber(failedAttempts.proven)} />
          <StatTile label="Kemungkinan terkait" value={formatNumber(failedAttempts.possible)} />
          <StatTile label="Tidak terkait" value={formatNumber(failedAttempts.unrelated)} />
        </div>
      </div>
    </div>
  );
}

export function AnomaliesTab({ state }: { state: FetchState<KpiAnomalies> }) {
  if (state.loading) return <KpiLoading rows={4} />;
  if (state.error) return <KpiError message={state.error} />;
  if (!state.data) return <KpiEmpty title="Tidak ada data" description="Data anomali belum tersedia." />;

  const { rows } = state.data;
  const byType = new Map<string, { key: string; label: string; value: number }>();
  for (const row of rows) {
    const existing = byType.get(row.typeKey);
    if (existing) {
      existing.value += row.eventCount;
    } else {
      byType.set(row.typeKey, { key: row.typeKey, label: row.type, value: row.eventCount });
    }
  }
  const typeItems = [...byType.values()];
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Jumlah Kejadian per Jenis Anomali</CardTitle>
          <CardDescription>Frekuensi kejadian anomali yang terdeteksi dalam periode.</CardDescription>
        </CardHeader>
        <CardContent>
          <HorizontalBar items={typeItems} />
        </CardContent>
      </Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No.</TableHead>
            <TableHead>Jenis Anomali</TableHead>
            <TableHead>Wilayah</TableHead>
            <TableHead>Kecamatan</TableHead>
            <TableHead className="text-right">Jumlah Jaring</TableHead>
            <TableHead className="text-right">Jumlah Kejadian</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Keterangan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-[var(--dc-text-muted)]">
                Tidak ada anomali terdeteksi pada periode ini.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => <AnomalyRowView key={`${row.typeKey}-${row.no ?? ""}`} row={row} />)
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function AnomalyRowView({ row }: { row: KpiAnomalyRow }) {
  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{row.no ?? "-"}</TableCell>
      <TableCell className="font-medium">{row.type}</TableCell>
      <TableCell className="text-xs">{row.wilayah || "-"}</TableCell>
      <TableCell className="text-xs">{row.kecamatan || "-"}</TableCell>
      <TableCell className="text-right tabular-nums">{formatNumber(row.jaringCount)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatNumber(row.eventCount)}</TableCell>
      <TableCell>
        <Badge variant="destructive">{row.status}</Badge>
      </TableCell>
      <TableCell className="text-xs text-[var(--dc-text-secondary)]">{row.description}</TableCell>
    </TableRow>
  );
}

export function TrendsTab({ state }: { state: FetchState<KpiTrends> }) {
  if (state.loading) return <KpiLoading rows={4} />;
  if (state.error) return <KpiError message={state.error} />;
  if (!state.data) return <KpiEmpty title="Tidak ada data" description="Data tren belum tersedia." />;

  const { series, metricsTrend } = state.data;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tren Total Laporan dan Konversi Baket</CardTitle>
          <CardDescription>Perkembangan volume laporan dan yang menjadi Baket dari waktu ke waktu.</CardDescription>
        </CardHeader>
        <CardContent>
          <TrendArea points={series.points} granularity={series.granularity} />
        </CardContent>
      </Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Metrik</TableHead>
            <TableHead className="text-right">Periode sekarang</TableHead>
            <TableHead className="text-right">Periode pembanding</TableHead>
            <TableHead className="text-right">Selisih</TableHead>
            <TableHead>Perubahan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {metricsTrend.map((metric) => (
            <TableRow key={metric.key}>
              <TableCell className="font-medium">{metric.label}</TableCell>
              <TableCell className="text-right tabular-nums">
                {metric.key === "productivityPercent" || metric.key === "conversionPercent"
                  ? formatPercent(metric.current)
                  : formatNumber(metric.current)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {metric.key === "productivityPercent" || metric.key === "conversionPercent"
                  ? formatPercent(metric.previous)
                  : formatNumber(metric.previous)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {metric.comparison.delta > 0 ? "+" : ""}
                {metric.key === "productivityPercent" || metric.key === "conversionPercent"
                  ? formatPercent(metric.comparison.delta)
                  : formatNumber(metric.comparison.delta)}
              </TableCell>
              <TableCell>
                <Delta comparison={metric.comparison} metricTone="neutral" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

const DETAIL_DIMENSIONS = [
  { value: "wilayah", label: "Wilayah" },
  { value: "status", label: "Status Jaring" },
  { value: "waktu", label: "Waktu" },
  { value: "gaswil", label: "Petugas Wilayah (Gaswil)" },
  { value: "jaring", label: "Per Jaring" },
];

const DETAIL_METRICS = [
  { value: "totalJaring", label: "Jumlah Jaring" },
  { value: "activeVerifiedJaring", label: "Jaring Aktif Terverifikasi" },
  { value: "productiveJaring", label: "Jaring Produktif" },
  { value: "notReportingJaring", label: "Jaring Belum Mengirim" },
  { value: "productivityPercent", label: "Produktivitas (%)" },
  { value: "totalReports", label: "Total Laporan Jaring" },
  { value: "totalBaket", label: "Total Baket" },
  { value: "conversionPercent", label: "Konversi Baket (%)" },
  { value: "failedReports", label: "Laporan Gagal" },
  { value: "jaringWithoutArea", label: "Jaring tanpa Wilayah" },
];

export function DetailTab({
  state,
  dimension,
  metric,
  onDimensionChange,
  onMetricChange,
}: {
  state: FetchState<KpiDetail>;
  dimension: string;
  metric: string;
  onDimensionChange: (value: string) => void;
  onMetricChange: (value: string) => void;
}) {
  const isLeaderboard = dimension === "gaswil" || dimension === "jaring";
  const renderBody = () => {
    if (state.loading) return <KpiLoading rows={4} />;
    if (state.error) return <KpiError message={state.error} />;
    if (!state.data) return <KpiEmpty title="Tidak ada data" description="Detail data belum tersedia." />;
    if (dimension === "gaswil")
      return <GaswilLeaderboard items={(state.data.leaderboard?.items ?? []) as KpiGaswilRow[]} />;
    if (dimension === "jaring")
      return <JaringLeaderboard items={(state.data.leaderboard?.items ?? []) as KpiJaringRow[]} />;
    return <DetailRows rows={state.data.rows ?? []} />;
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label
            className="block font-medium text-[10px] text-[var(--dc-text-muted)] uppercase"
            htmlFor="kpi-detail-dimension"
          >
            Dimensi
          </label>
          <NativeSelect
            id="kpi-detail-dimension"
            value={dimension}
            onChange={(event) => onDimensionChange(event.target.value)}
          >
            {DETAIL_DIMENSIONS.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        {!isLeaderboard ? (
          <div className="space-y-1">
            <label
              className="block font-medium text-[10px] text-[var(--dc-text-muted)] uppercase"
              htmlFor="kpi-detail-metric"
            >
              Metrik
            </label>
            <NativeSelect
              id="kpi-detail-metric"
              value={metric}
              onChange={(event) => onMetricChange(event.target.value)}
            >
              {DETAIL_METRICS.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        ) : null}
      </div>

      {renderBody()}
    </div>
  );
}

const RANK_STYLES: Record<number, string> = {
  1: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  2: "bg-slate-400/20 text-slate-600 dark:text-slate-300",
  3: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
};

function RankCell({ rank }: { rank?: number }) {
  if (rank === undefined) return null;
  const medal = RANK_STYLES[rank] ?? "bg-muted text-[var(--dc-text-secondary)]";
  return (
    <TableCell className="w-16">
      <span
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-full font-mono text-xs font-semibold tabular-nums",
          medal,
        )}
      >
        {rank}
      </span>
    </TableCell>
  );
}

function GaswilLeaderboard({ items }: { items: KpiGaswilRow[] }) {
  const ranked = items.some((item) => item.rank !== undefined);
  if (items.length === 0)
    return (
      <KpiEmpty
        title="Tidak ada data"
        description="Belum ada Petugas Wilayah (Gaswil) dengan aktivitas pada periode ini."
      />
    );
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {ranked ? <TableHead className="w-16">Peringkat</TableHead> : null}
          <TableHead>Petugas Wilayah (Gaswil)</TableHead>
          <TableHead className="text-right">Binaan</TableHead>
          <TableHead className="text-right">Aktif</TableHead>
          <TableHead className="text-right">Melapor</TableHead>
          <TableHead className="text-right">Baket Dibuat</TableHead>
          <TableHead className="text-right">Baket dari Binaan</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((row) => (
          <TableRow key={row.id}>
            {ranked ? <RankCell rank={row.rank} /> : null}
            <TableCell className="font-medium">{row.name}</TableCell>
            <TableCell className="text-right tabular-nums">{formatNumber(row.binaan)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatNumber(row.aktif)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatNumber(row.melapor)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatNumber(row.baketDibuat)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatNumber(row.baketBinaan)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function JaringLeaderboard({ items }: { items: KpiJaringRow[] }) {
  const ranked = items.some((item) => item.rank !== undefined);
  if (items.length === 0)
    return <KpiEmpty title="Tidak ada data" description="Belum ada Jaring yang melapor pada periode ini." />;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {ranked ? <TableHead className="w-16">Peringkat</TableHead> : null}
          <TableHead>Jaring</TableHead>
          <TableHead>Wilayah</TableHead>
          <TableHead>Petugas Wilayah (Gaswil)</TableHead>
          <TableHead className="text-right">Laporan</TableHead>
          <TableHead className="text-right">Menjadi Baket</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((row) => (
          <TableRow key={row.id}>
            {ranked ? <RankCell rank={row.rank} /> : null}
            <TableCell>
              <div className="font-medium">{row.name}</div>
              {row.alias ? <div className="text-xs text-[var(--dc-text-muted)]">{row.alias}</div> : null}
            </TableCell>
            <TableCell className="text-xs">{row.wilayah}</TableCell>
            <TableCell className="text-xs">{row.gaswil}</TableCell>
            <TableCell className="text-right tabular-nums">{formatNumber(row.laporan)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatNumber(row.baket)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function LeaderboardTab({ state }: { state: FetchState<KpiLeaderboardData> }) {
  if (state.loading) return <KpiLoading rows={4} />;
  if (state.error) return <KpiError message={state.error} />;
  if (!state.data) return <KpiEmpty title="Tidak ada data" description="Data peringkat belum tersedia." />;

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle>Peringkat Petugas Wilayah (Gaswil)</SectionTitle>
        <p className="mt-1 text-xs text-[var(--dc-text-muted)]">
          Sepuluh teratas berdasarkan Jaring binaan yang melapor dan Baket dari binaan.
        </p>
        <div className="mt-3">
          <GaswilLeaderboard items={state.data.gaswil} />
        </div>
      </div>

      <div>
        <SectionTitle>Peringkat Jaring</SectionTitle>
        <p className="mt-1 text-xs text-[var(--dc-text-muted)]">
          Sepuluh teratas berdasarkan jumlah Laporan Jaring dan yang menjadi Baket.
        </p>
        <div className="mt-3">
          <JaringLeaderboard items={state.data.jaring} />
        </div>
      </div>
    </div>
  );
}

function DetailRows({ rows }: { rows: Array<{ dimension: string; value: number }> }) {
  const maxValue = Math.max(...rows.map((row) => row.value), 1);
  return (
    <div className="space-y-2">
      {rows.length === 0 ? (
        <KpiEmpty title="Tidak ada data" description="Tidak ada baris untuk dimensi dan metrik ini." />
      ) : (
        rows.map((row) => (
          <div key={row.dimension} className="flex items-center gap-3">
            <span className="w-56 shrink-0 truncate text-xs text-[var(--dc-text-secondary)]">{row.dimension}</span>
            <div className="h-5 flex-1 overflow-hidden rounded bg-muted">
              <div
                className="h-full bg-[var(--dc-primary)]"
                style={{ width: `${Math.round((row.value / maxValue) * 100)}%` }}
              />
            </div>
            <span className="w-16 text-right font-mono text-xs tabular-nums">{formatNumber(row.value)}</span>
          </div>
        ))
      )}
    </div>
  );
}
