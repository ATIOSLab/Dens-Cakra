"use client";

import Link from "next/link";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  type LucideIcon,
  MapPinned,
  Siren,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";
import { DOMAIN_VISUALS } from "@/lib/domain/visual-system";
import { getSystemRoleLabel, type SystemRole } from "@/navigation/sidebar/system-roles";

import { formatDashboardDate, formatDashboardNumber, formatDashboardPercent } from "./executive-dashboard-format";
import type { DashboardCard, ExecutiveDashboardData } from "./executive-dashboard-types";

function cardByKey(cards: DashboardCard[], key: string) {
  return cards.find((card) => card.key === key);
}

function percent(value: number, total: number) {
  return total <= 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

function metricValue(cards: DashboardCard[], key: string) {
  return cardByKey(cards, key)?.value ?? 0;
}

function SummaryMetric({
  label,
  value,
  helper,
  href,
  icon: Icon,
  tone = "primary",
  buildHref,
}: {
  label: string;
  value: number | string;
  helper: string;
  href?: string | null;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "danger" | "neutral";
  buildHref: (href: string) => string;
}) {
  const toneClass =
    tone === "success"
      ? "text-[var(--dc-success)] bg-[var(--dc-success-soft)] border-[color-mix(in_srgb,var(--dc-success)_35%,transparent)]"
      : tone === "warning"
        ? "text-[var(--dc-warning)] bg-[var(--dc-warning-soft)] border-[color-mix(in_srgb,var(--dc-warning)_35%,transparent)]"
        : tone === "danger"
          ? "text-[var(--dc-danger)] bg-[var(--dc-danger-soft)] border-[color-mix(in_srgb,var(--dc-danger)_35%,transparent)]"
          : tone === "neutral"
            ? "text-muted-foreground bg-muted/30 border-[var(--dc-border-subtle)]"
            : "text-[var(--dc-primary)] bg-[var(--dc-primary-soft)] border-[color-mix(in_srgb,var(--dc-primary)_35%,transparent)]";

  const content = (
    <Card className="group h-full min-h-32 border-[var(--dc-border-subtle)] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[var(--dc-primary)] hover:shadow-[var(--dc-shadow-soft)] motion-reduce:hover:translate-y-0">
      <CardContent className="flex h-full flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <span className={`grid size-9 shrink-0 place-items-center rounded-lg border ${toneClass}`}>
            <Icon className="size-4" />
          </span>
          {href ? (
            <ArrowRight className="size-4 text-muted-foreground opacity-60 transition-transform group-hover:translate-x-1" />
          ) : null}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">{label}</p>
        <strong className="mt-1 font-mono text-2xl tabular-nums text-foreground">
          {typeof value === "number" ? formatDashboardNumber(value) : value}
        </strong>
        <p className="mt-auto pt-2 text-[0.68rem] leading-4 text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );

  if (!href) return content;
  return (
    <Link
      href={buildHref(href)}
      className="rounded-[var(--dc-radius-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Buka data ${label}`}
    >
      {content}
    </Link>
  );
}

function SignalRow({
  label,
  value,
  description,
  href,
  tone,
  icon: Icon,
  buildHref,
}: {
  label: string;
  value: number;
  description: string;
  href: string;
  tone: "warning" | "danger" | "neutral";
  icon: LucideIcon;
  buildHref: (href: string) => string;
}) {
  const toneClass =
    tone === "danger"
      ? "text-[var(--dc-danger)] bg-[var(--dc-danger-soft)]"
      : tone === "warning"
        ? "text-[var(--dc-warning)] bg-[var(--dc-warning-soft)]"
        : "text-muted-foreground bg-muted/30";

  return (
    <Link
      href={buildHref(href)}
      className="group flex items-start gap-3 rounded-lg border border-[var(--dc-border-subtle)] p-3 transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${toneClass}`}>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium">{label}</span>
          <strong className="font-mono text-lg tabular-nums">{formatDashboardNumber(value)}</strong>
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
      </span>
      <ArrowRight className="mt-1 size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

export function ExecutiveDashboardAnalysisOverview({
  data,
  role,
  buildHref,
}: {
  data: ExecutiveDashboardData;
  role: SystemRole;
  buildHref: (href: string) => string;
}) {
  const cards = data.overview.cards;
  const totalReports = metricValue(cards, "totalReports");
  const baketCreatedReports = metricValue(cards, "baketCreatedReports");
  const draftBakets = metricValue(cards, "draftBakets");
  const validatedBakets = metricValue(cards, "validatedBakets");
  const urgentReports = metricValue(cards, "urgentReports");
  const productTotal = data.analytics.products.total;
  const network = data.operations.networkSummary;
  const followUp = data.operations.followUp.summary;
  const quality = data.analytics.dataQuality;
  const baketCreatedRate = percent(baketCreatedReports, totalReports);
  const activeJaringRate = percent(network.active, network.total);
  const productRate = percent(productTotal, totalReports);
  const resolvedLocationCount = Math.max(0, quality.total - quality.missingLocation);
  const healthItems = [
    ["Lokasi belum terselesaikan", quality.missingLocation],
    ["Tanpa lampiran", quality.missingAttachment],
    ["Jaring tanpa Petugas Wilayah", quality.jaringWithoutFieldOfficer],
    ["Jaring tanpa Wilayah Penugasan", quality.jaringWithoutArea],
    ["Relasi organisasi belum tersambung", quality.incompleteOrganizationRelation],
  ].filter(([, value]) => Number(value) > 0);
  const jaringHelper =
    network.total > 0
      ? `${formatDashboardNumber(network.active)} aktif (${formatDashboardPercent(activeJaringRate)}), ${formatDashboardNumber(network.inactive)} tidak aktif`
      : "Belum ada Jaring dalam cakupan aktif";
  const reportHelper =
    totalReports > 0
      ? `${formatDashboardNumber(baketCreatedReports)} sudah menjadi ${DOMAIN_TERMS.baket}`
      : "Belum ada Laporan Jaring pada periode aktif";
  const baketCreatedHelper =
    totalReports > 0
      ? `${formatDashboardPercent(baketCreatedRate)} dari ${DOMAIN_TERMS.jaringReport}; ${formatDashboardNumber(draftBakets)} draf, ${formatDashboardNumber(validatedBakets)} tervalidasi`
      : "Belum ada pembanding Laporan Jaring";
  const draftBaketHelper =
    baketCreatedReports > 0
      ? `${formatDashboardPercent(percent(draftBakets, baketCreatedReports))} dari laporan yang sudah menjadi Baket`
      : "Belum ada Draf Baket pada filter aktif";
  const validatedBaketHelper =
    baketCreatedReports > 0
      ? `${formatDashboardPercent(percent(validatedBakets, baketCreatedReports))} dari laporan yang sudah menjadi Baket`
      : "Belum ada Baket Tervalidasi pada filter aktif";
  const productHelper =
    totalReports > 0
      ? `${formatDashboardPercent(productRate)} terhadap total Laporan Jaring`
      : "Belum ada pembanding laporan";
  const personnelHref =
    role === "executive"
      ? "/dashboard/personel-lapangan"
      : role === "operational_intelligence_manager"
        ? "/dashboard/oim/monitoring-lapangan"
        : "/dashboard/personel-lapangan";

  const scopeAreas =
    data.scope.areas.length > 0
      ? data.scope.areas
          .map((area) =>
            data.scope.supervisionMode === "DKI_REGENCY_CITY" && (area.level === "CITY" || area.level === "REGENCY")
              ? `${area.name} (DKI)`
              : area.name,
          )
          .slice(0, 3)
          .join(", ")
      : "Cakupan mengikuti kewenangan peran";
  const scopeSummary =
    data.scope.supervisionMode === "DKI_REGENCY_CITY"
      ? "Supervisi DKI berbasis kota/kabupaten administratif sesuai penugasan admin."
      : data.scope.scopeDescription;

  const canViewIntelligenceProducts = role !== "field_coordinator";
  const isLeadershipRole =
    role === "executive" || role === "regional_commander" || role === "operational_intelligence_manager";

  return (
    <section aria-labelledby="analysis-overview-heading" className="space-y-4">
      <Card className="overflow-hidden border-[var(--dc-border-subtle)] bg-[linear-gradient(135deg,var(--card),color-mix(in_srgb,var(--dc-primary)_6%,var(--card)))] shadow-[var(--dc-shadow-card)]">
        <CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-[var(--dc-primary-soft)] font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[var(--dc-primary)] hover:bg-[var(--dc-primary-soft)]">
                Analisis Operasional
              </Badge>
              <Badge variant="outline">{getSystemRoleLabel(role)}</Badge>
            </div>
            <h2 id="analysis-overview-heading" className="mt-3 text-2xl font-bold tracking-tight">
              Pusat Analisis {data.scope.label || getSystemRoleLabel(role)}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Ringkasan ini menggabungkan Laporan Jaring, Bahan Keterangan (Baket), status Jaring, tindak lanjut, dan
              Produk Intelijen dalam cakupan akses pengguna.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-[var(--dc-border-subtle)] bg-card/70 p-3">
                <p className="text-xs text-muted-foreground">Periode data</p>
                <p className="mt-1 text-sm font-medium">
                  {formatDashboardDate(data.period.from)} - {formatDashboardDate(data.period.to)}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--dc-border-subtle)] bg-card/70 p-3">
                <p className="text-xs text-muted-foreground">Unit dan hak akses</p>
                <p className="mt-1 truncate text-sm font-medium">
                  {data.scope.organizationUnitName} - {data.scope.supervisionLabel}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--dc-border-subtle)] bg-card/70 p-3">
                <p className="text-xs text-muted-foreground">Wilayah cakupan</p>
                <p className="mt-1 truncate text-sm font-medium">{scopeAreas}</p>
                <p className="mt-1 line-clamp-2 text-[0.68rem] leading-4 text-muted-foreground">{scopeSummary}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--dc-border-subtle)] bg-card/75 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Siren className="size-4 text-[var(--dc-warning)]" />
              <h3 className="text-sm font-semibold">Prioritas Analisis</h3>
            </div>
            <div className="space-y-2">
              {isLeadershipRole && (
                <SignalRow
                  label="Perhatian Pimpinan"
                  value={data.overview.attention.length}
                  description="Laporan atau tindak lanjut yang perlu dicermati lebih dulu."
                  href="#leadership-attention"
                  tone="warning"
                  icon={AlertTriangle}
                  buildHref={(href) => href}
                />
              )}
              <SignalRow
                label="Laporan Mendesak"
                value={urgentReports}
                description="Laporan berurgensi mendesak dalam filter aktif."
                href="/dashboard/laporan-jaring?urgency=URGENT"
                tone="danger"
                icon={Siren}
                buildHref={buildHref}
              />
              <SignalRow
                label="Lewat Tenggat"
                value={followUp.overdue}
                description="Arahan atau tugas yang melewati tenggat."
                href="#priority-reports"
                tone={followUp.overdue > 0 ? "danger" : "neutral"}
                icon={ClipboardList}
                buildHref={(href) => href}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="space-y-2">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[var(--dc-primary)]">
            Jaringan Pelaporan
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryMetric
              label="Korwil"
              value={network.korwilCount}
              helper={`${formatDashboardNumber(network.gaswilCount)} Petugas Wilayah (Gaswil) dalam cakupan`}
              href={personnelHref}
              icon={MapPinned}
              buildHref={buildHref}
            />
            <SummaryMetric
              label="Petugas Wilayah (Gaswil)"
              value={network.gaswilCount}
              helper={`${formatDashboardNumber(network.total)} Jaring binaan terhubung ke cakupan aktif`}
              href={personnelHref}
              icon={DOMAIN_VISUALS.gaswil.Icon}
              tone="neutral"
              buildHref={buildHref}
            />
            <SummaryMetric
              label="Jaring"
              value={network.total}
              helper={jaringHelper}
              href="/dashboard/daftar-jaring"
              icon={DOMAIN_VISUALS.jaring.Icon}
              buildHref={buildHref}
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[var(--dc-primary)]">
            Rantai Produk Intelijen
          </p>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
            <SummaryMetric
              label={DOMAIN_TERMS.jaringReport}
              value={totalReports}
              helper={reportHelper}
              href="/dashboard/laporan-jaring"
              icon={DOMAIN_VISUALS.jaringReport.Icon}
              buildHref={buildHref}
            />
            <SummaryMetric
              label="Laporan Jadi Baket"
              value={baketCreatedReports}
              helper={baketCreatedHelper}
              href="/dashboard/baket"
              icon={DOMAIN_VISUALS.baket.Icon}
              tone="success"
              buildHref={buildHref}
            />
            <SummaryMetric
              label={DOMAIN_TERMS.draftBaket}
              value={draftBakets}
              helper={draftBaketHelper}
              href="/dashboard/baket?status=DRAFT"
              icon={DOMAIN_VISUALS.baket.Icon}
              tone="warning"
              buildHref={buildHref}
            />
            <SummaryMetric
              label={DOMAIN_TERMS.validatedBaket}
              value={validatedBakets}
              helper={validatedBaketHelper}
              href="/dashboard/baket?status=VERIFIED"
              icon={DOMAIN_VISUALS.baket.Icon}
              tone="success"
              buildHref={buildHref}
            />
            {canViewIntelligenceProducts && (
              <SummaryMetric
                label={DOMAIN_TERMS.intelligenceReport}
                value={productTotal}
                helper={productHelper}
                href="/dashboard/produk-intelijen"
                icon={DOMAIN_VISUALS.intelligenceReport.Icon}
                tone="success"
                buildHref={buildHref}
              />
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card className="border-[var(--dc-border-subtle)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="size-4 text-[var(--dc-success)]" />
              Kesehatan Data dan Pelaporan
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[var(--dc-border-subtle)] bg-muted/15 p-3">
              <p className="text-xs text-muted-foreground">Titik lokasi terekam</p>
              <strong className="mt-1 block font-mono text-xl tabular-nums">
                {formatDashboardNumber(resolvedLocationCount)}
              </strong>
            </div>
            {healthItems.length === 0 ? (
              <div className="rounded-lg border border-[color-mix(in_srgb,var(--dc-success)_35%,transparent)] bg-[var(--dc-success-soft)] p-3 sm:col-span-2">
                <p className="text-xs text-muted-foreground">Kondisi data utama</p>
                <strong className="mt-1 block text-sm text-[var(--dc-success)]">
                  Tidak ada isu data utama pada filter aktif.
                </strong>
              </div>
            ) : (
              healthItems.slice(0, 4).map(([label, value]) => (
                <div key={label} className="rounded-lg border border-[var(--dc-border-subtle)] bg-muted/15 p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <strong className="mt-1 block font-mono text-xl tabular-nums">
                    {formatDashboardNumber(Number(value))}
                  </strong>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-[var(--dc-border-subtle)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPinned className="size-4 text-[var(--dc-primary)]" />
              Jalur Analisis Cepat
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {[
              ["Laporan prioritas", "#priority-reports"],
              ["Peringkat wilayah dan Jaring", "#operations-ranking"],
              ["Tindak lanjut dan kualitas", "#follow-up-quality"],
              ["Ringkasan Jaring", "#network-summary"],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="group flex min-h-10 items-center justify-between rounded-lg border border-[var(--dc-border-subtle)] px-3 text-sm transition-colors hover:bg-muted/20"
              >
                <span>{label}</span>
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </a>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
