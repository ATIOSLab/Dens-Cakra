"use client";

import Link from "next/link";

import {
  ArrowRight,
  CircleAlert,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";
import { DOMAIN_VISUALS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

import {
  dashboardStatusColor,
  formatDashboardNumber,
  formatDashboardPercent,
} from "./executive-dashboard-format";
import type { ExecutiveDashboardData } from "./executive-dashboard-types";

type Segment = {
  key: string;
  label: string;
  value: number;
  tone?: "primary" | "success" | "warning" | "danger" | "neutral";
};

type StatisticGroup = {
  key: string;
  title: string;
  description: string;
  totalLabel: string;
  total: number;
  href?: string;
  icon: LucideIcon;
  segments: Segment[];
};

function cardValue(data: ExecutiveDashboardData, key: string) {
  return data.overview.cards.find((card) => card.key === key)?.value ?? 0;
}

function toneColor(segment: Segment) {
  if (segment.tone === "success") return "var(--dc-success)";
  if (segment.tone === "warning") return "var(--dc-warning)";
  if (segment.tone === "danger") return "var(--dc-danger)";
  if (segment.tone === "neutral") return "var(--dc-neutral)";
  return dashboardStatusColor(segment.key, "var(--dc-primary)");
}

function percent(value: number, total: number) {
  return total <= 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

function buildStatisticGroups(data: ExecutiveDashboardData): StatisticGroup[] {
  const totalReports = cardValue(data, "totalReports");
  const baketCreatedReports = cardValue(data, "baketCreatedReports");
  const draftBakets = cardValue(data, "draftBakets");
  const validatedBakets = cardValue(data, "validatedBakets");
  const baketTotal = draftBakets + validatedBakets;
  const readyForBaket = Math.max(0, totalReports - baketCreatedReports);

  const network = data.operations.networkSummary;
  const followUp = data.operations.followUp.summary;
  const quality = data.analytics.dataQuality;
  const locatedReports = Math.max(0, quality.total - quality.missingLocation);

  const groups: StatisticGroup[] = [
    {
      key: "proses-baket",
      title: "Proses Baket dari Laporan Jaring",
      description: "Laporan yang sudah menjadi Baket dibandingkan laporan yang masih siap ditindaklanjuti.",
      totalLabel: "Total Laporan",
      total: totalReports,
      href: "/dashboard/laporan-jaring",
      icon: DOMAIN_VISUALS.jaringReport.Icon,
      segments: [
        { key: "BAKET_CREATED", label: "Baket Dibuat", value: baketCreatedReports, tone: "success" },
        { key: "READY_FOR_BAKET", label: "Siap Dibuat Baket", value: readyForBaket, tone: "warning" },
      ],
    },
    {
      key: "baket",
      title: "Bahan Keterangan (Baket)",
      description: "Baket yang masih draf dibandingkan Baket yang siap diteruskan.",
      totalLabel: "Total Bahan Keterangan (Baket)",
      total: baketTotal,
      href: "/dashboard/baket",
      icon: DOMAIN_VISUALS.baket.Icon,
      segments: [
        { key: "DRAFT", label: "Draf Baket", value: draftBakets, tone: "warning" },
        { key: "VALIDATED", label: "Baket Siap Diteruskan", value: validatedBakets, tone: "success" },
      ],
    },
    {
      key: "jaring-status",
      title: "Status Jaring",
      description: "Jaring aktif dan tidak aktif berdasarkan aktivitas laporan dalam 90 hari.",
      totalLabel: "Total Jaring",
      total: network.total,
      href: "/dashboard/daftar-jaring",
      icon: DOMAIN_VISUALS.jaring.Icon,
      segments: [
        { key: "ACTIVE", label: DOMAIN_TERMS.jaringActive90Days, value: network.active, tone: "success" },
        { key: "INACTIVE", label: DOMAIN_TERMS.jaringInactive90Days, value: network.inactive, tone: "neutral" },
        ...(network.otherStatus > 0
          ? [{ key: "OTHER", label: "Status Lain", value: network.otherStatus, tone: "warning" as const }]
          : []),
      ],
    },
    {
      key: "jaring-pelaporan",
      title: "Aktivitas Pelaporan Jaring",
      description: "Jaring yang mengirim laporan dibandingkan Jaring tanpa laporan pada periode aktif.",
      totalLabel: "Total Jaring",
      total: network.total,
      href: "/dashboard/daftar-jaring",
      icon: DOMAIN_VISUALS.performance.Icon,
      segments: [
        { key: "REPORTING", label: "Mengirim Laporan", value: network.reporting, tone: "primary" },
        { key: "WITHOUT_REPORTS", label: "Tanpa Laporan", value: network.withoutReports, tone: "warning" },
      ],
    },
    {
      key: "tindak-lanjut",
      title: "Tindak Lanjut",
      description: "Arahan dan tugas selesai dibandingkan pekerjaan yang belum selesai.",
      totalLabel: "Total Arahan/Tugas",
      total: followUp.total,
      icon: CircleAlert,
      segments: [
        { key: "COMPLETED", label: "Selesai", value: followUp.completed, tone: "success" },
        {
          key: "OPEN",
          label: "Belum Selesai",
          value: Math.max(0, followUp.total - followUp.completed),
          tone: followUp.overdue > 0 ? "danger" : "warning",
        },
      ],
    },
    {
      key: "lokasi",
      title: "Kualitas Lokasi Laporan",
      description: "Lokasi aktual laporan yang sudah terselesaikan dibandingkan yang belum terselesaikan.",
      totalLabel: "Total Laporan",
      total: quality.total,
      href: "/dashboard/laporan-jaring",
      icon: DOMAIN_VISUALS.intelligenceNetworkMap.Icon,
      segments: [
        { key: "WITHIN_SCOPE", label: "Lokasi Terselesaikan", value: locatedReports, tone: "success" },
        {
          key: "MISSING_LOCATION",
          label: "Lokasi Belum Terselesaikan",
          value: quality.missingLocation,
          tone: "warning",
        },
      ],
    },
  ];

  return groups.filter((group) => group.total > 0 || group.segments.some((segment) => segment.value > 0));
}

function StatisticCard({ group, buildHref }: { group: StatisticGroup; buildHref: (href: string) => string }) {
  const Icon = group.icon;
  const primarySegment = group.segments[0];
  const primaryPercentage = primarySegment ? percent(primarySegment.value, group.total) : 0;
  const primaryColor = primarySegment ? toneColor(primarySegment) : "var(--dc-primary)";
  const content = (
    <Card className="h-full min-h-[17rem] border-[var(--dc-border-subtle)] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[var(--dc-primary)] hover:shadow-[var(--dc-shadow-soft)] motion-reduce:hover:translate-y-0">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">{group.title}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">{group.description}</CardDescription>
          </div>
          <div
            className="grid size-10 shrink-0 place-items-center rounded-lg border"
            style={{
              borderColor: `color-mix(in srgb, ${primaryColor} 35%, transparent)`,
              backgroundColor: `color-mix(in srgb, ${primaryColor} 14%, transparent)`,
              color: primaryColor,
            }}
          >
            <Icon className="size-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{group.totalLabel}</p>
            <strong className="font-mono text-3xl tabular-nums">{formatDashboardNumber(group.total)}</strong>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{primarySegment?.label ?? "Rasio Utama"}</p>
            <strong className="font-mono text-lg tabular-nums">{formatDashboardPercent(primaryPercentage)}</strong>
          </div>
        </div>

        <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          {group.segments.map((segment) => (
            <span
              key={segment.key}
              className="h-full min-w-1"
              style={{ width: `${percent(segment.value, group.total)}%`, backgroundColor: toneColor(segment) }}
            />
          ))}
        </div>

        <dl className="space-y-2">
          {group.segments.map((segment) => {
            const segmentPercentage = percent(segment.value, group.total);
            return (
              <div key={segment.key} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 text-xs">
                <dt className="flex min-w-0 items-center gap-2 text-muted-foreground">
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: toneColor(segment) }} />
                  <span className="truncate">{segment.label}</span>
                </dt>
                <dd className="font-mono tabular-nums">{formatDashboardNumber(segment.value)}</dd>
                <dd className="w-12 text-right font-mono text-muted-foreground tabular-nums">
                  {formatDashboardPercent(segmentPercentage)}
                </dd>
              </div>
            );
          })}
        </dl>
      </CardContent>
    </Card>
  );

  if (!group.href) return content;
  return (
    <Link
      href={buildHref(group.href)}
      className="group rounded-[var(--dc-radius-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Buka rincian ${group.title}`}
    >
      <div className="relative h-full">
        {content}
        <ArrowRight className="absolute bottom-4 right-4 size-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
      </div>
    </Link>
  );
}

export function ExecutiveDashboardStatistics({
  data,
  buildHref,
}: {
  data: ExecutiveDashboardData;
  buildHref: (href: string) => string;
}) {
  const groups = buildStatisticGroups(data);

  return (
    <section aria-labelledby="dashboard-statistics-heading">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[var(--dc-primary)]">
            Statistik terstruktur
          </p>
          <h2 id="dashboard-statistics-heading" className="mt-1 text-lg font-semibold">
            Hitungan, Rasio, dan Pasangan Data
          </h2>
        </div>
        <p className="max-w-xl text-xs text-muted-foreground">
          Setiap kartu menampilkan total, pasangan hitungan, persentase, dan tautan ke data sumber.
        </p>
      </div>
      {groups.length === 0 ? (
        <div className="grid min-h-32 place-items-center rounded-md border border-dashed px-4 text-center text-sm text-muted-foreground">
          Belum ada statistik yang dapat dihitung pada filter aktif.
        </div>
      ) : (
        <div className={cn("grid gap-3", "[grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr))]")}>
          {groups.map((group) => (
            <StatisticCard key={group.key} group={group} buildHref={buildHref} />
          ))}
        </div>
      )}
    </section>
  );
}
