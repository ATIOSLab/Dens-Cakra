"use client";

import Link from "next/link";

import {
  Activity,
  AlertTriangle,
  ArchiveX,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  DatabaseZap,
  FileX2,
  Gauge,
  type LucideIcon,
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

function EmptyState({ children }: { children: React.ReactNode }) {
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
function NumericCell({ children }: { children: React.ReactNode }) {
  return <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">{children}</TableCell>;
}

type JaringRankingItem = {
  id: string;
  code: string | null;
  name: string;
  status: string;
  registrationStatus: string;
  gaswil: string | null;
  area: string | null;
  reports: number;
  verified: number;
  draftBakets: number;
  lastReportAt: string | null;
  drilldown: string;
};

function entityMeta(items: Array<string | null | undefined>) {
  return items.filter((item): item is string => Boolean(item?.trim()));
}

function JaringRankingTitle({ item, href }: { item: JaringRankingItem; href: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <Link className="block truncate font-medium hover:underline" href={href}>
        {item.name}
      </Link>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-[0.68rem]">
        {item.code ? (
          <span className="rounded border border-[var(--dc-border-subtle)] bg-muted/30 px-1.5 py-0.5 font-mono text-[0.62rem]">
            {DOMAIN_TERMS.jaringCode}: {item.code}
          </span>
        ) : null}
        <span>
          {dashboardStatusLabel(item.status)} - {dashboardStatusLabel(item.registrationStatus)}
        </span>
      </div>
    </div>
  );
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
          <div className="min-w-0 font-medium text-sm">{title}</div>
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
          <EmptyState>Belum ada {DOMAIN_TERMS.jaring} dalam cakupan aktif.</EmptyState>
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {operations.jaringRanking.map((item, index) => (
                <MobileRankingCard
                  key={item.id}
                  rank={index + 1}
                  title={<JaringRankingTitle item={item} href={buildHref(item.drilldown)} />}
                  subtitle={entityMeta([
                    item.gaswil ? `${DOMAIN_TERMS.fieldOfficer}: ${item.gaswil}` : null,
                    item.area ? `Wilayah: ${item.area}` : null,
                  ]).join(" - ")}
                  metrics={[
                    { label: DOMAIN_TERMS.jaringReport, value: formatDashboardNumber(item.reports) },
                    { label: "Laporan Jadi Baket", value: formatDashboardNumber(item.verified) },
                    { label: DOMAIN_TERMS.draftBaket, value: formatDashboardNumber(item.draftBakets) },
                  ]}
                />
              ))}
            </div>
            <div className="hidden md:block">
              <Table className="min-w-[1040px] text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>{DOMAIN_TERMS.jaringName}</TableHead>
                    <TableHead>{DOMAIN_TERMS.fieldOfficer}</TableHead>
                    <TableHead>Wilayah</TableHead>
                    <TableHead className="text-right">{DOMAIN_TERMS.jaringReport}</TableHead>
                    <TableHead className="text-right">Laporan Jadi Baket</TableHead>
                    <TableHead className="text-right">{DOMAIN_TERMS.draftBaket}</TableHead>
                    <TableHead>Aktivitas Terakhir</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operations.jaringRanking.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-center font-mono">{index + 1}</TableCell>
                      <TableCell>
                        <JaringRankingTitle item={item} href={buildHref(item.drilldown)} />
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
          <EmptyState>Belum ada aktivitas {DOMAIN_TERMS.fieldOfficer} pada cakupan aktif.</EmptyState>
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
                    { label: DOMAIN_TERMS.jaringReport, value: formatDashboardNumber(item.reports) },
                    { label: "Laporan Jadi Baket", value: formatDashboardNumber(item.verified) },
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
                    <TableHead>{DOMAIN_TERMS.fieldOfficer}</TableHead>
                    <TableHead>{DOMAIN_TERMS.assignmentArea}</TableHead>
                    <TableHead className="text-right">{DOMAIN_TERMS.jaring}</TableHead>
                    <TableHead className="text-right">{DOMAIN_TERMS.jaringActive90Days}</TableHead>
                    <TableHead className="text-right">{DOMAIN_TERMS.jaringReport}</TableHead>
                    <TableHead className="text-right">Laporan Jadi Baket</TableHead>
                    <TableHead className="text-right">{DOMAIN_TERMS.draftBaket}</TableHead>
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
                      href={buildHref(`/dashboard/baket?areaId=${encodeURIComponent(item.id)}`)}
                    >
                      {item.name}
                    </Link>
                  }
                  subtitle={dashboardStatusLabel(item.level)}
                  metrics={[
                    { label: DOMAIN_TERMS.jaringReport, value: formatDashboardNumber(item.reports) },
                    { label: DOMAIN_TERMS.jaringActive90Days, value: formatDashboardNumber(item.activeJaring) },
                    { label: "Laporan Jadi Baket", value: formatDashboardNumber(item.verified) },
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
                    <TableHead className="text-right">{DOMAIN_TERMS.jaringReport}</TableHead>
                    <TableHead className="text-right">{DOMAIN_TERMS.jaringActive90Days}</TableHead>
                    <TableHead className="text-right">Laporan Jadi Baket</TableHead>
                    <TableHead className="text-right">{DOMAIN_TERMS.draftBaket}</TableHead>
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
                          href={buildHref(`/dashboard/baket?areaId=${encodeURIComponent(item.id)}`)}
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
