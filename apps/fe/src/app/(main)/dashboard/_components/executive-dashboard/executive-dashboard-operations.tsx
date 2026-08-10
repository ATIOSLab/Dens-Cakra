"use client";

import Link from "next/link";

import {
  Activity,
  AlertTriangle,
  ArchiveX,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  DatabaseZap,
  FileX2,
  Gauge,
  type LucideIcon,
  MapPin,
  ShieldAlert,
  UserPlus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";
import { DOMAIN_VISUALS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

import {
  dashboardActionLabel,
  dashboardStatusColor,
  dashboardStatusLabel,
  formatDashboardDate,
  formatDashboardDuration,
  formatDashboardNumber,
  formatDashboardPercent,
} from "./executive-dashboard-format";
import type { DashboardReportItem, ExecutiveDashboardData } from "./executive-dashboard-types";

type DashboardTone = "primary" | "success" | "warning" | "danger" | "neutral";

function toneClass(tone: DashboardTone) {
  if (tone === "success") {
    return "border-[color-mix(in_srgb,var(--dc-success)_35%,transparent)] bg-[var(--dc-success-soft)] text-[var(--dc-success)]";
  }
  if (tone === "warning") {
    return "border-[color-mix(in_srgb,var(--dc-warning)_35%,transparent)] bg-[var(--dc-warning-soft)] text-[var(--dc-warning)]";
  }
  if (tone === "danger") {
    return "border-[color-mix(in_srgb,var(--dc-danger)_35%,transparent)] bg-[var(--dc-danger-soft)] text-[var(--dc-danger)]";
  }
  if (tone === "neutral") {
    return "border-[var(--dc-border-subtle)] bg-muted/30 text-muted-foreground";
  }
  return "border-[color-mix(in_srgb,var(--dc-primary)_35%,transparent)] bg-[var(--dc-primary-soft)] text-[var(--dc-primary)]";
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="grid min-h-28 place-items-center rounded-lg border border-dashed px-4 text-center text-muted-foreground text-sm">
      {children}
    </div>
  );
}

function percent(value: number, total: number) {
  return total <= 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

function ReportRow({ item, buildHref }: { item: DashboardReportItem; buildHref: (href: string) => string }) {
  const areaName = item.area ? item.area.name : "Wilayah belum ditentukan";
  const urgencyTone = item.urgency === "URGENT" ? "destructive" : item.urgency === "HIGH" ? "secondary" : "outline";
  return (
    <Link
      href={buildHref(item.drilldown)}
      className="group grid min-h-24 gap-3 rounded-lg border border-transparent px-3 py-3 transition-colors hover:border-[var(--dc-border-subtle)] hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.55fr)_auto] lg:items-center"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[0.68rem] text-[var(--dc-primary)]">
            {item.referenceNumber ?? "Tanpa referensi"}
          </span>
          {item.urgency && <Badge variant={urgencyTone}>{dashboardStatusLabel(item.urgency)}</Badge>}
          <Badge variant="outline">{dashboardStatusLabel(item.workflow)}</Badge>
        </div>
        <p className="mt-1 line-clamp-2 font-medium text-sm">{item.title}</p>
        <p className="mt-1 text-muted-foreground text-xs">
          {item.jaring.name} - {areaName}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-muted-foreground">Diterima</span>
        <span className="text-right">{formatDashboardDate(item.reportedAt)}</span>
        <span className="text-muted-foreground">Usia</span>
        <span className="text-right">{formatDashboardDuration(item.ageHours)}</span>
      </div>
      <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
      {item.priorityReasons.length > 0 && (
        <p className="text-[0.7rem] text-muted-foreground lg:col-span-3">
          Dasar prioritas: {item.priorityReasons.join(" - ")}
        </p>
      )}
    </Link>
  );
}

export function LeadershipAttentionPanel({
  items,
  buildHref,
}: {
  items: ExecutiveDashboardData["overview"]["attention"];
  buildHref: (href: string) => string;
}) {
  return (
    <Card className="border-[color-mix(in_srgb,var(--dc-warning)_35%,var(--dc-border-subtle))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--dc-warning)_5%,var(--card)),var(--card))]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-lg bg-[var(--dc-warning-soft)]">
            <ShieldAlert className="size-5 text-[var(--dc-warning)]" />
          </div>
          <div>
            <CardTitle>Perlu Perhatian Pimpinan</CardTitle>
            <CardDescription>
              Urutan memakai urgensi, tindakan yang dibutuhkan, tenggat, dan waktu penerimaan.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState>Tidak ada kondisi yang membutuhkan perhatian pada filter aktif.</EmptyState>
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {items.map((item) => (
              <Link
                key={`${item.id}-${item.type}`}
                href={buildHref(item.drilldown)}
                className="group flex min-h-24 items-start gap-3 rounded-lg border border-[var(--dc-border-subtle)] bg-card/70 p-3 transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <AlertTriangle
                  className={cn(
                    "mt-0.5 size-4 shrink-0 text-[var(--dc-warning)]",
                    item.tone === "danger" && "text-[var(--dc-danger)]",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{item.reason}</p>
                  <p className="mt-1 line-clamp-1 text-muted-foreground text-xs">
                    {item.referenceNumber ?? item.title} - {item.area?.name ?? item.jaring.name}
                  </p>
                  <p className="mt-2 text-muted-foreground text-xs">
                    {formatDashboardDuration(item.ageHours)}
                    {item.dueAt ? ` - Tenggat ${formatDashboardDate(item.dueAt)}` : ""}
                  </p>
                </div>
                <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function NetworkSummaryPanel({
  summary,
  buildHref,
}: {
  summary: ExecutiveDashboardData["operations"]["networkSummary"];
  buildHref: (href: string) => string;
}) {
  const activeRate = percent(summary.active, summary.total);
  const inactiveRate = percent(summary.inactive, summary.total);
  const newRate = percent(summary.newlyRegistered, summary.total);
  const reportingRate = percent(summary.reporting, summary.total);
  const withoutReportsRate = percent(summary.withoutReports, summary.total);
  const items: Array<{
    label: string;
    value: number;
    format: "number" | "percent";
    href: string;
    icon: LucideIcon;
    tone: DashboardTone;
    helper: string;
  }> = [
    {
      label: "Total Jaring",
      value: summary.total,
      format: "number",
      href: "/dashboard/daftar-jaring",
      icon: DOMAIN_VISUALS.jaring.Icon,
      tone: "primary",
      helper: "Seluruh Jaring dalam cakupan hak akses aktif.",
    },
    {
      label: DOMAIN_TERMS.jaringActive90Days,
      value: summary.active,
      format: "number",
      href: "/dashboard/daftar-jaring?activityStatus=ACTIVE",
      icon: Activity,
      tone: "success",
      helper: `${formatDashboardPercent(activeRate)} dari total Jaring.`,
    },
    {
      label: DOMAIN_TERMS.jaringInactive90Days,
      value: summary.inactive,
      format: "number",
      href: "/dashboard/daftar-jaring?activityStatus=INACTIVE",
      icon: ArchiveX,
      tone: "warning",
      helper: `${formatDashboardPercent(inactiveRate)} dari total Jaring.`,
    },
    {
      label: "Jaring Baru",
      value: summary.newlyRegistered,
      format: "number",
      href: "/dashboard/daftar-jaring?sortBy=newest",
      icon: UserPlus,
      tone: "primary",
      helper: `${formatDashboardPercent(newRate)} dari total Jaring.`,
    },
    {
      label: "Mengirim Laporan",
      value: summary.reporting,
      format: "number",
      href: "/dashboard/laporan-jaring",
      icon: DOMAIN_VISUALS.jaringReport.Icon,
      tone: "success",
      helper: `${formatDashboardPercent(reportingRate)} dari total Jaring.`,
    },
    {
      label: "Tanpa Laporan",
      value: summary.withoutReports,
      format: "number",
      href: "/dashboard/daftar-jaring",
      icon: FileX2,
      tone: "warning",
      helper: `${formatDashboardPercent(withoutReportsRate)} dari total Jaring.`,
    },
    {
      label: "Rata-rata Laporan",
      value: summary.averageReports,
      format: "number",
      href: "/dashboard/laporan-jaring",
      icon: Gauge,
      tone: "neutral",
      helper: "Rata-rata laporan per Jaring pelapor.",
    },
  ];
  return (
    <section aria-labelledby="network-summary-heading">
      <div className="mb-3 flex items-center gap-2">
        <DOMAIN_VISUALS.jaring.Icon className={`size-5 ${DOMAIN_VISUALS.jaring.iconClass}`} />
        <h2 id="network-summary-heading" className="font-semibold text-lg">
          Ringkasan Jaring
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={buildHref(item.href)}
              className="group rounded-[var(--dc-radius-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Buka data ${item.label}`}
            >
              <Card className="h-full min-h-36 border-[var(--dc-border-subtle)] transition-[border-color,transform,box-shadow] group-hover:-translate-y-0.5 group-hover:border-[var(--dc-primary)] group-hover:shadow-[var(--dc-shadow-soft)] motion-reduce:group-hover:translate-y-0">
                <CardContent className="flex h-full flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={cn("grid size-8 shrink-0 place-items-center rounded-lg border", toneClass(item.tone))}
                    >
                      <Icon className="size-4" />
                    </span>
                    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-3 text-muted-foreground text-xs">{item.label}</p>
                  <strong className="mt-1 font-mono text-2xl tabular-nums">
                    {item.format === "percent" ? formatDashboardPercent(item.value) : formatDashboardNumber(item.value)}
                  </strong>
                  <p className="mt-auto pt-2 text-[0.66rem] leading-4 text-muted-foreground">{item.helper}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function NumericCell({ children }: { children: React.ReactNode }) {
  return <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">{children}</TableCell>;
}

function MobileRankingCard({
  rank,
  title,
  subtitle,
  metrics,
}: {
  rank: number;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  metrics: Array<{ label: string; value: React.ReactNode }>;
}) {
  return (
    <article className="rounded-lg border border-[var(--dc-border-subtle)] p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted font-mono text-xs">{rank}</span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-sm">{title}</h3>
          {subtitle ? <p className="mt-1 text-muted-foreground text-xs">{subtitle}</p> : null}
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0">
            <dt className="truncate text-muted-foreground text-[0.65rem]">{metric.label}</dt>
            <dd className="mt-1 font-mono text-sm tabular-nums">{metric.value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function RankingTables({
  operations,
  buildHref,
}: {
  operations: ExecutiveDashboardData["operations"];
  buildHref: (href: string) => string;
}) {
  return (
    <Tabs defaultValue="jaring">
      <TabsList className="mb-4 h-auto min-h-11 w-full justify-start overflow-x-auto">
        <TabsTrigger value="jaring">Jaring</TabsTrigger>
        <TabsTrigger value="gaswil">Petugas Wilayah</TabsTrigger>
        <TabsTrigger value="wilayah">Wilayah</TabsTrigger>
      </TabsList>
      <TabsContent value="jaring">
        {operations.jaringRanking.length === 0 ? (
          <EmptyState>Belum ada Jaring dalam cakupan aktif.</EmptyState>
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {operations.jaringRanking.map((item, index) => (
                <MobileRankingCard
                  key={item.id}
                  rank={index + 1}
                  title={
                    <Link className="hover:underline" href={item.drilldown}>
                      {item.name}
                    </Link>
                  }
                  subtitle={`${item.gaswil ?? "Petugas Wilayah belum tersedia"} - ${item.area ?? "Wilayah belum tersedia"}`}
                  metrics={[
                    { label: "Laporan", value: formatDashboardNumber(item.reports) },
                    { label: "Baket Dibuat", value: formatDashboardNumber(item.verified) },
                  ]}
                />
              ))}
            </div>
            <div className="hidden md:block">
              <Table className="min-w-[980px] text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Jaring</TableHead>
                    <TableHead>Petugas Wilayah</TableHead>
                    <TableHead>Wilayah</TableHead>
                    <TableHead className="text-right">Laporan</TableHead>
                    <TableHead className="text-right">Baket Dibuat</TableHead>
                    <TableHead className="text-right">Draf Baket</TableHead>
                    <TableHead>Aktivitas Terakhir</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operations.jaringRanking.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-center font-mono">{index + 1}</TableCell>
                      <TableCell>
                        <Link className="font-medium hover:underline" href={item.drilldown}>
                          {item.name}
                        </Link>
                        <p className="mt-1 text-muted-foreground">
                          {dashboardStatusLabel(item.status)} - {dashboardStatusLabel(item.registrationStatus)}
                        </p>
                      </TableCell>
                      <TableCell>{item.gaswil ?? "Belum tersedia"}</TableCell>
                      <TableCell>{item.area ?? "Belum tersedia"}</TableCell>
                      <NumericCell>{formatDashboardNumber(item.reports)}</NumericCell>
                      <NumericCell>{formatDashboardNumber(item.verified)}</NumericCell>
                      <NumericCell>{formatDashboardNumber(item.draftBakets)}</NumericCell>
                      <TableCell className="whitespace-nowrap">{formatDashboardDate(item.lastReportAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </TabsContent>
      <TabsContent value="gaswil">
        {operations.fieldOfficerRanking.length === 0 ? (
          <EmptyState>Belum ada aktivitas Petugas Wilayah pada cakupan aktif.</EmptyState>
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {operations.fieldOfficerRanking.map((item, index) => (
                <MobileRankingCard
                  key={item.id}
                  rank={index + 1}
                  title={
                    <Link className="hover:underline" href={buildHref(item.drilldown)}>
                      {item.name}
                    </Link>
                  }
                  subtitle={item.area ?? "Wilayah penugasan belum tersedia"}
                  metrics={[
                    { label: DOMAIN_TERMS.jaringActive90Days, value: formatDashboardNumber(item.activeJaring) },
                    { label: "Laporan", value: formatDashboardNumber(item.reports) },
                    { label: "Baket Dibuat", value: formatDashboardNumber(item.verified) },
                    { label: "Respons Rata-rata", value: formatDashboardDuration(item.averageVerificationHours) },
                  ]}
                />
              ))}
            </div>
            <div className="hidden md:block">
              <Table className="min-w-[960px] text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Petugas Wilayah</TableHead>
                    <TableHead>Wilayah Penugasan</TableHead>
                    <TableHead className="text-right">Jaring</TableHead>
                    <TableHead className="text-right">{DOMAIN_TERMS.jaringActive90Days}</TableHead>
                    <TableHead className="text-right">Laporan</TableHead>
                    <TableHead className="text-right">Baket Dibuat</TableHead>
                    <TableHead className="text-right">Draf Baket</TableHead>
                    <TableHead className="text-right">Respons Rata-rata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operations.fieldOfficerRanking.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-center font-mono">{index + 1}</TableCell>
                      <TableCell className="font-medium">
                        <Link className="hover:underline" href={buildHref(item.drilldown)}>
                          {item.name}
                        </Link>
                      </TableCell>
                      <TableCell>{item.area ?? "Belum tersedia"}</TableCell>
                      <NumericCell>{formatDashboardNumber(item.jaring)}</NumericCell>
                      <NumericCell>{formatDashboardNumber(item.activeJaring)}</NumericCell>
                      <NumericCell>{formatDashboardNumber(item.reports)}</NumericCell>
                      <NumericCell>{formatDashboardNumber(item.verified)}</NumericCell>
                      <NumericCell>{formatDashboardNumber(item.draftBakets)}</NumericCell>
                      <NumericCell>{formatDashboardDuration(item.averageVerificationHours)}</NumericCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </TabsContent>
      <TabsContent value="wilayah">
        {operations.regionalRanking.length === 0 ? (
          <EmptyState>Belum ada data wilayah pada filter aktif.</EmptyState>
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {operations.regionalRanking.map((item, index) => (
                <MobileRankingCard
                  key={item.id}
                  rank={index + 1}
                  title={
                    <Link
                      className="hover:underline"
                      href={buildHref(`/dashboard/laporan-jaring?areaId=${encodeURIComponent(item.id)}`)}
                    >
                      {item.name}
                    </Link>
                  }
                  subtitle={dashboardStatusLabel(item.level)}
                  metrics={[
                    { label: "Laporan", value: formatDashboardNumber(item.reports) },
                    { label: DOMAIN_TERMS.jaringActive90Days, value: formatDashboardNumber(item.activeJaring) },
                    { label: "Baket Dibuat", value: formatDashboardNumber(item.verified) },
                  ]}
                />
              ))}
            </div>
            <div className="hidden md:block">
              <Table className="min-w-[920px] text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Wilayah</TableHead>
                    <TableHead className="text-right">Laporan</TableHead>
                    <TableHead className="text-right">{DOMAIN_TERMS.jaringActive90Days}</TableHead>
                    <TableHead className="text-right">Baket Dibuat</TableHead>
                    <TableHead className="text-right">Draf Baket</TableHead>
                    <TableHead>Perlu Perhatian</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operations.regionalRanking.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-center font-mono">{index + 1}</TableCell>
                      <TableCell>
                        <Link
                          className="font-medium hover:underline"
                          href={buildHref(`/dashboard/laporan-jaring?areaId=${encodeURIComponent(item.id)}`)}
                        >
                          {item.name}
                        </Link>
                        <p className="mt-1 text-muted-foreground">{dashboardStatusLabel(item.level)}</p>
                      </TableCell>
                      <NumericCell>{formatDashboardNumber(item.reports)}</NumericCell>
                      <NumericCell>{formatDashboardNumber(item.activeJaring)}</NumericCell>
                      <NumericCell>{formatDashboardNumber(item.verified)}</NumericCell>
                      <NumericCell>{formatDashboardNumber(item.draftBakets)}</NumericCell>
                      <TableCell className="max-w-72 text-muted-foreground">
                        {item.attentionReasons.length > 0
                          ? item.attentionReasons.join(" - ")
                          : "Tidak ada indikator perhatian"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </TabsContent>
      <TabsContent value="unavailable" className="space-y-3">
        {operations.unavailableRankings.map((item) => (
          <div key={item.key} className="rounded-lg border border-dashed p-4">
            <p className="font-medium text-sm">{item.label} - Belum tersedia</p>
            <p className="mt-1 text-muted-foreground text-xs">{item.reason}</p>
          </div>
        ))}
      </TabsContent>
    </Tabs>
  );
}

export function PerformanceRankingPanel({
  operations,
  buildHref,
}: {
  operations: ExecutiveDashboardData["operations"];
  buildHref: (href: string) => string;
}) {
  return (
    <Card className="border-[var(--dc-border-subtle)]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <DOMAIN_VISUALS.gaswil.Icon className={`size-5 ${DOMAIN_VISUALS.gaswil.iconClass}`} />
          <CardTitle>Aktivitas Pelaporan Wilayah dan Jaring</CardTitle>
        </div>
        <CardDescription>
          Seluruh peringkat menggunakan laporan unik pada dataset terfilter; tidak ada skor kinerja buatan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RankingTables operations={operations} buildHref={buildHref} />
      </CardContent>
    </Card>
  );
}

export function PriorityReportPanel({
  operations,
  buildHref,
}: {
  operations: ExecutiveDashboardData["operations"];
  buildHref: (href: string) => string;
}) {
  const views = operations.reportViews;
  const panel = (items: DashboardReportItem[], empty: string) =>
    items.length === 0 ? (
      <EmptyState>{empty}</EmptyState>
    ) : (
      <div className="divide-y divide-[var(--dc-border-subtle)]">
        {items.map((item) => (
          <ReportRow key={item.id} item={item} buildHref={buildHref} />
        ))}
      </div>
    );
  return (
    <Card className="border-[var(--dc-border-subtle)]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ClipboardList className="size-5 text-[var(--dc-primary)]" />
          <CardTitle>Laporan Prioritas</CardTitle>
        </div>
        <CardDescription>Dasar pengurutan selalu ditampilkan pada setiap laporan.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="urgent">
          <TabsList className="mb-4 h-auto min-h-11 w-full justify-start overflow-x-auto">
            <TabsTrigger value="urgent">Paling Mendesak</TabsTrigger>
            <TabsTrigger value="latest">Terbaru</TabsTrigger>
            <TabsTrigger value="followup">Banyak Ditindaklanjuti</TabsTrigger>
            <TabsTrigger value="waiting">Menunggu Terlama</TabsTrigger>
          </TabsList>
          <TabsContent value="urgent">{panel(views.mostUrgent, "Tidak ada laporan mendesak.")}</TabsContent>
          <TabsContent value="latest">{panel(views.latest, "Tidak ada laporan pada filter aktif.")}</TabsContent>
          <TabsContent value="followup">
            {panel(views.mostFollowedUp, "Belum ada permintaan tindak lanjut pada periode aktif.")}
          </TabsContent>
          <TabsContent value="waiting">
            {panel(views.waitingLongest, "Tidak ada laporan yang sedang menunggu tindakan.")}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function StatusList({ title, items }: { title: string; items: Array<{ key: string; label: string; value: number }> }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return (
    <div>
      <h3 className="mb-3 font-semibold text-sm">{title}</h3>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-muted-foreground text-xs">Belum ada data.</p>
        ) : (
          items.map((item) => (
            <div key={item.key} className="space-y-1 rounded-md p-1.5">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: dashboardStatusColor(item.key) }}
                  />
                  <span className="truncate">{dashboardStatusLabel(item.label)}</span>
                </span>
                <span className="font-mono tabular-nums">
                  {formatDashboardNumber(item.value)}{" "}
                  <span className="text-muted-foreground">/ {formatDashboardNumber(total)}</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${total === 0 ? 0 : Math.round((item.value / total) * 100)}%`,
                    backgroundColor: dashboardStatusColor(item.key),
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function FollowUpAndQualityPanel({
  data,
  buildHref,
}: {
  data: ExecutiveDashboardData;
  buildHref: (href: string) => string;
}) {
  const quality = data.analytics.dataQuality;
  const followUp = data.operations.followUp;
  const summary = [
    ["Total Arahan", followUp.summary.total],
    ["Belum Dimulai", followUp.summary.notStarted],
    ["Sedang Berjalan", followUp.summary.inProgress],
    ["Selesai", followUp.summary.completed],
    ["Mendekati Tenggat", followUp.summary.approachingDue],
    ["Lewat Tenggat", followUp.summary.overdue],
  ] as const;
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="border-[var(--dc-border-subtle)]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClipboardList className="size-5 text-[var(--dc-primary)]" />
            <CardTitle>Arahan dan Tindak Lanjut</CardTitle>
          </div>
          <CardDescription>
            Tenggat mendekat berarti maksimal {followUp.approachingDueDefinitionHours} jam dari waktu pemuatan data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-2 sm:grid-cols-3">
            {summary.map(([label, value]) => (
              <div key={label} className="min-h-20 rounded-lg border border-[var(--dc-border-subtle)] bg-muted/10 p-3">
                <p className="text-muted-foreground text-xs">{label}</p>
                <strong className="mt-2 block font-mono text-xl tabular-nums">{formatDashboardNumber(value)}</strong>
              </div>
            ))}
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <StatusList title="Tugas" items={followUp.tasks} />
            <StatusList title="Direktif" items={followUp.directives} />
          </div>
          <div className="flex min-h-16 items-center justify-between rounded-lg border border-[var(--dc-border-subtle)] p-3">
            <span className="text-muted-foreground text-sm">Persetujuan produk ditugaskan kepada Anda</span>
            <strong className="font-mono text-xl tabular-nums">
              {formatDashboardNumber(followUp.pendingApprovals)}
            </strong>
          </div>
          {followUp.items.length === 0 ? (
            <EmptyState>Tidak ada arahan atau tugas terbuka pada filter aktif.</EmptyState>
          ) : (
            <div className="space-y-2">
              {followUp.items.map((item) => (
                <Link
                  key={`${item.kind}-${item.id}`}
                  href={buildHref(item.drilldown)}
                  className="block rounded-lg border border-[var(--dc-border-subtle)] p-3 transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="line-clamp-2 font-medium text-sm">{item.title}</p>
                      <p className="mt-1 text-muted-foreground text-xs">
                        {item.sender} ke {item.recipient ?? "Penerima belum tersedia"}
                      </p>
                    </div>
                    <Badge variant={item.overdue ? "destructive" : "outline"}>
                      {dashboardStatusLabel(item.status)}
                    </Badge>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                    <span>{item.area?.name ?? "Wilayah belum tersedia"}</span>
                    <span>{dashboardStatusLabel(item.urgency)}</span>
                    <span className="sm:text-right">
                      {item.dueAt ? formatDashboardDate(item.dueAt) : "Tanpa tenggat"}
                    </span>
                  </div>
                  {item.progress !== null && <Progress className="mt-3 h-1.5" value={item.progress} />}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="border-[var(--dc-border-subtle)]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <DatabaseZap className="size-5 text-[var(--dc-primary)]" />
            <CardTitle>Kualitas Data Operasional</CardTitle>
          </div>
          <CardDescription>Semua angka memakai definisi yang sama dengan filter dan kartu utama.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Tanpa uraian", quality.missingDescription],
              ["Baket tanpa kategori", quality.missingCategory],
              ["Lokasi belum terselesaikan", quality.missingLocation],
              ["Tanpa lampiran", quality.missingAttachment],
              ["Lokasi belum diperiksa", quality.notCheckedLocation],
              ["Jaring tanpa Petugas Wilayah", quality.jaringWithoutFieldOfficer],
              ["Jaring tanpa Wilayah Penugasan", quality.jaringWithoutArea],
              ["Relasi organisasi belum tersambung", quality.incompleteOrganizationRelation],
            ].map(([label, value]) => (
              <div key={String(label)} className="min-h-24 rounded-lg border border-[var(--dc-border-subtle)] p-3">
                <dt className="text-muted-foreground text-xs">{label}</dt>
                <dd className="mt-2 font-mono text-xl tabular-nums">{formatDashboardNumber(Number(value))}</dd>
              </div>
            ))}
          </dl>
          {quality.unavailableFields.map((field) => (
            <p key={field.key} className="mt-3 text-muted-foreground text-xs">
              <strong>{field.label}:</strong> {field.reason}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function RecentActivityPanel({
  items,
  buildHref,
}: {
  items: ExecutiveDashboardData["operations"]["recentActivity"];
  buildHref: (href: string) => string;
}) {
  return (
    <Card className="border-[var(--dc-border-subtle)]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock3 className="size-5 text-[var(--dc-primary)]" />
          <CardTitle>Aktivitas Terbaru</CardTitle>
        </div>
        <CardDescription>Jejak aktivitas penting yang berada dalam periode dan cakupan aktif.</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState>Belum ada jejak aktivitas yang relevan pada periode dan cakupan aktif.</EmptyState>
        ) : (
          <ol className="divide-y divide-[var(--dc-border-subtle)]">
            {items.map((item) => {
              const content = (
                <div className="grid min-h-20 gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CheckCircle2 className="size-4 text-[var(--dc-primary)]" />
                      <p className="font-medium text-sm">{dashboardActionLabel(item.action)}</p>
                      {item.reference && <Badge variant="outline">{item.reference}</Badge>}
                    </div>
                    <p className="mt-1 line-clamp-1 text-muted-foreground text-xs">{item.title}</p>
                    <p className="mt-1 text-muted-foreground text-xs">
                      {item.actor} - {item.role ?? "Sistem"} - {item.unit ?? "Unit tidak tersedia"}
                    </p>
                    {item.statusChange && (
                      <p className="mt-1 text-muted-foreground text-xs">
                        {dashboardStatusLabel(item.statusChange.before)} menjadi{" "}
                        {dashboardStatusLabel(item.statusChange.after)}
                      </p>
                    )}
                  </div>
                  <time className="whitespace-nowrap text-muted-foreground text-xs">
                    {formatDashboardDate(item.occurredAt)}
                  </time>
                </div>
              );
              return (
                <li key={item.id}>
                  {item.drilldown ? (
                    <Link className="block rounded-lg px-2 hover:bg-muted/20" href={buildHref(item.drilldown)}>
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
