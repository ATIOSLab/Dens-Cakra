"use client";

import Link from "next/link";

import { ArrowDownRight, ArrowRight, ArrowUpRight, CircleHelp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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

      <div>
        <SectionTitle>Status Administratif Jaring</SectionTitle>
        <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {statusBreakdown.groups.map((group) => (
            <Card key={group.key} size="sm">
              <CardHeader>
                <CardTitle className="text-sm">{group.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold tabular-nums text-[var(--dc-text-primary)]">
                  {formatNumber(group.value)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--dc-text-muted)]">
          Wilayah Belum Terpetakan: {formatNumber(statusBreakdown.withoutArea)} Jaring tanpa relasi wilayah.
        </p>
      </div>

      {insight ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ringkasan Otomatis untuk Pimpinan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed text-[var(--dc-text-secondary)]">
            <p>
              <strong>Fakta:</strong> Terdapat{" "}
              {formatNumber(cards.find((card) => card.key === "activeVerifiedJaring")?.value ?? 0)} Jaring Aktif
              Terverifikasi, dengan {formatNumber(cards.find((card) => card.key === "productiveJaring")?.value ?? 0)}{" "}
              Jaring Produktif ({formatPercent(cards.find((card) => card.key === "productivityPercent")?.value ?? 0)}{" "}
              produktivitas) dan {formatNumber(cards.find((card) => card.key === "notReportingJaring")?.value ?? 0)}{" "}
              Jaring Belum Mengirim Laporan.
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
  const maxBucket = Math.max(...frequencyDistribution.map((bucket) => bucket.value), 1);
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
        <div className="mt-3 space-y-2">
          {frequencyDistribution.map((bucket) => (
            <div key={bucket.label} className="flex items-center gap-3">
              <span className="w-40 shrink-0 text-xs text-[var(--dc-text-secondary)]">{bucket.label}</span>
              <div className="h-5 flex-1 overflow-hidden rounded bg-muted">
                <div
                  className="h-full bg-[var(--dc-primary)] transition-all"
                  style={{ width: `${Math.round((bucket.value / maxBucket) * 100)}%` }}
                />
              </div>
              <span className="w-12 text-right text-xs font-medium tabular-nums text-[var(--dc-text-primary)]">
                {formatNumber(bucket.value)}
              </span>
            </div>
          ))}
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
  const maxTrend = Math.max(...trend.points.map((point) => point.total), 1);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Total Laporan Jaring" value={formatNumber(pipeline.total)} />
        <StatTile label="Laporan menjadi Baket" value={formatNumber(pipeline.toBaket)} />
        <StatTile label="Persentase konversi" value={formatPercent(pipeline.conversionPercent)} />
        <StatTile label="Baket dari Laporan" value={formatNumber(baket.fromReport)} />
      </div>

      <div>
        <SectionTitle>Alur Pengolahan Laporan Jaring → Baket</SectionTitle>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary">Masuk</Badge>
          <span className="text-[var(--dc-text-muted)]">→</span>
          <Badge variant="secondary">Diproses</Badge>
          <span className="text-[var(--dc-text-muted)]">→</span>
          <Badge variant="secondary">Diverifikasi</Badge>
          <span className="text-[var(--dc-text-muted)]">→</span>
          <Badge>Baket</Badge>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4">
          {pipeline.byStage.map((stage) => (
            <StatTile key={stage.key} label={stage.label} value={formatNumber(stage.value)} />
          ))}
        </div>
      </div>

      <div>
        <SectionTitle>Tren Laporan Jaring</SectionTitle>
        <div className="mt-3 space-y-1">
          {trend.points.slice(-14).map((point) => (
            <div key={point.bucket} className="flex items-center gap-3">
              <span className="w-24 shrink-0 font-mono text-[11px] text-[var(--dc-text-muted)]">{point.bucket}</span>
              <div className="h-4 flex-1 overflow-hidden rounded bg-muted">
                <div
                  className="h-full bg-[var(--dc-primary)]"
                  style={{ width: `${Math.round((point.total / maxTrend) * 100)}%` }}
                />
              </div>
              <span className="w-10 text-right font-mono text-xs tabular-nums">{point.total}</span>
            </div>
          ))}
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
  return (
    <div className="space-y-4">
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

  const { metricsTrend } = state.data;
  return (
    <div className="space-y-4">
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
        <div className="space-y-1">
          <label
            className="block font-medium text-[10px] text-[var(--dc-text-muted)] uppercase"
            htmlFor="kpi-detail-metric"
          >
            Metrik
          </label>
          <NativeSelect id="kpi-detail-metric" value={metric} onChange={(event) => onMetricChange(event.target.value)}>
            {DETAIL_METRICS.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      {state.loading ? <KpiLoading rows={4} /> : null}
      {state.error ? <KpiError message={state.error} /> : null}
      {!state.loading && !state.error && !state.data ? (
        <KpiEmpty title="Tidak ada data" description="Detail data belum tersedia." />
      ) : null}
      {!state.loading && !state.error && state.data ? <DetailRows rows={state.data.rows} /> : null}
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
