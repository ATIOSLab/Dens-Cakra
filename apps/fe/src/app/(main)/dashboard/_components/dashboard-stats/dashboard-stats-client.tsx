"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  FileText,
  Flame,
  Layers3,
  Package,
  RadioTower,
  RefreshCw,
  ShieldAlert,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

import { DashboardLiveStatus } from "@/app/(main)/dashboard/_components/dashboard-live-status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/lib/auth/auth-client";
import { cn } from "@/lib/utils";
import { SYSTEM_ROLES, type SystemRole } from "@/navigation/sidebar/system-roles";

import {
  type DashboardAlertItem,
  type DashboardBriefingData,
  type DashboardEmergencyItem,
  type DashboardSection,
  ROLE_SECTIONS,
} from "./dashboard-stats-types";

/* ── Helpers ── */

function formatNumber(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function relativeTime(value?: string | null) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

const ROLE_LABELS: Record<SystemRole, string> = {
  [SYSTEM_ROLES.ADMIN_SYSTEM]: "Admin Sistem",
  [SYSTEM_ROLES.EXECUTIVE]: "Eksekutif",
  [SYSTEM_ROLES.FIELD_COORDINATOR]: "Koordinator Lapangan",
  [SYSTEM_ROLES.FIELD_OFFICER]: "Petugas Wilayah (Gaswil)",
  [SYSTEM_ROLES.OPERATIONAL_INTELLIGENCE_MANAGER]: "Manajer Intelijen Operasional",
  [SYSTEM_ROLES.REGIONAL_COMMANDER]: "Komandan Regional",
};

const SEVERITY_CONFIG: Record<string, { color: string; bg: string }> = {
  CRITICAL: { color: "var(--dc-danger)", bg: "var(--dc-danger-soft)" },
  HIGH: { color: "var(--dc-danger)", bg: "var(--dc-danger-soft)" },
  MEDIUM: { color: "var(--dc-warning)", bg: "var(--dc-warning-soft)" },
  LOW: { color: "var(--dc-info)", bg: "var(--dc-info-soft)" },
  INFORMATIONAL: { color: "var(--dc-neutral)", bg: "var(--dc-primary-soft)" },
};

const TASK_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Menunggu", color: "var(--dc-neutral)" },
  ASSIGNED: { label: "Ditugaskan", color: "var(--dc-info)" },
  ACKNOWLEDGED: { label: "Diterima", color: "var(--dc-primary)" },
  IN_PROGRESS: { label: "Berjalan", color: "var(--dc-warning)" },
  COMPLETED: { label: "Selesai", color: "var(--dc-success)" },
  OVERDUE: { label: "Terlambat", color: "var(--dc-danger)" },
  CANCELLED: { label: "Dibatalkan", color: "var(--dc-text-muted)" },
};

const VERIFICATION_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  VERIFIED: { label: "Terverifikasi", color: "var(--dc-success)" },
  IN_PROGRESS: { label: "Dalam Proses", color: "var(--dc-warning)" },
  PENDING: { label: "Belum Diverifikasi", color: "var(--dc-warning)" },
  REJECTED: { label: "Ditolak", color: "var(--dc-danger)" },
};

type ApiEnvelope<T> = { success: true; data: T } | { success: false; error?: { message?: string } };

const SUMMARY_SKELETON_KEYS = ["baket", "tugas", "direktif", "produk", "alert", "darurat"];
const SECTION_SKELETON_KEYS = ["kinerja", "pipeline", "verifikasi"];

/* ── Subcomponents ── */

function StatCard({
  icon: Icon,
  label,
  value,
  description,
  accentColor,
  index,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  description?: string;
  accentColor: string;
  index: number;
}) {
  return (
    <div
      className="group relative min-h-36 overflow-hidden rounded-[8px] border border-[var(--dc-border-subtle)] bg-card p-5 shadow-[var(--dc-shadow-card)] transition-[border-color,box-shadow] duration-200 hover:border-[color-mix(in_srgb,var(--dc-primary)_28%,var(--dc-border-subtle))] hover:shadow-[var(--dc-shadow-soft)]"
      style={{
        animationDelay: `${index * 60}ms`,
        animation: "dc-stat-fadein 0.5s ease-out both",
      }}
    >
      {/* Accent top line */}
      <div
        className="absolute inset-x-0 top-0 h-[2px] opacity-80 transition-opacity group-hover:opacity-100"
        style={{ background: accentColor }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="dc-eyebrow truncate text-[0.7rem] text-muted-foreground uppercase tracking-[0.08em]">{label}</p>
          <p className="mt-3 font-mono text-3xl font-bold tabular-nums tracking-tight">{formatNumber(value)}</p>
          {description && <p className="mt-2 truncate text-xs text-muted-foreground">{description}</p>}
        </div>
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-[8px] border border-[color-mix(in_srgb,currentColor_12%,transparent)]"
          style={{ background: `color-mix(in srgb, ${accentColor} 12%, transparent)` }}
        >
          <Icon className="size-5" style={{ color: accentColor }} />
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium tabular-nums">
          {formatNumber(value)} <span className="text-muted-foreground">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted/50">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 70%, white))`,
          }}
        />
      </div>
    </div>
  );
}

function CircularGauge({ value, label, color }: { value: number; label: string; color: string }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative size-24">
        <svg aria-hidden="true" className="size-24 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={radius} fill="none" strokeWidth="6" className="stroke-muted/30" />
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            style={{
              stroke: color,
              strokeDasharray: circumference,
              strokeDashoffset: offset,
              transition: "stroke-dashoffset 1s ease-out",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-lg font-bold tabular-nums">{value}%</span>
        </div>
      </div>
      <p className="text-center text-[0.68rem] text-muted-foreground">{label}</p>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const config = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.LOW;
  return (
    <span
      className="inline-flex items-center rounded-sm px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider"
      style={{
        color: config.color,
        background: config.bg,
      }}
    >
      {severity}
    </span>
  );
}

function AlertListItem({ item }: { item: DashboardAlertItem }) {
  return (
    <div className="group flex items-start gap-3 rounded-md border border-transparent p-2.5 transition-colors hover:border-[var(--dc-border-subtle)] hover:bg-muted/30">
      <div
        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md"
        style={{
          background: (SEVERITY_CONFIG[item.severity] ?? SEVERITY_CONFIG.LOW).bg,
        }}
      >
        <AlertTriangle
          className="size-3.5"
          style={{ color: (SEVERITY_CONFIG[item.severity] ?? SEVERITY_CONFIG.LOW).color }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="line-clamp-2 text-sm font-medium leading-5">{item.title}</p>
          <SeverityBadge severity={item.severity} />
        </div>
        <div className="mt-1 flex items-center gap-2 text-[0.68rem] text-muted-foreground">
          {item.area?.name && <span>{item.area.name}</span>}
          {item.area?.name && <span>·</span>}
          <span>{relativeTime(item.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

function EmergencyListItem({ item }: { item: DashboardEmergencyItem }) {
  return (
    <div className="group flex items-start gap-3 rounded-md border border-transparent p-2.5 transition-colors hover:border-[var(--dc-border-subtle)] hover:bg-muted/30">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--dc-danger-soft)]">
        <Flame className="size-3.5 text-[var(--dc-danger)]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="line-clamp-2 text-sm font-medium leading-5">{item.title}</p>
          <SeverityBadge severity={item.severity} />
        </div>
        <div className="mt-1 flex items-center gap-2 text-[0.68rem] text-muted-foreground">
          {item.area?.name && <span>{item.area.name}</span>}
          {item.area?.name && <span>·</span>}
          <span>{relativeTime(item.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-1">
      <Icon className="size-5 text-[var(--dc-primary)]" />
      <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="min-h-36 animate-pulse rounded-[8px] border border-[var(--dc-border-subtle)] bg-card/60 p-5">
      <div className="h-3 w-24 rounded bg-muted/50" />
      <div className="mt-3 h-7 w-16 rounded bg-muted/50" />
      <div className="mt-2 h-3 w-32 rounded bg-muted/40" />
    </div>
  );
}

function SkeletonSection() {
  return (
    <div className="animate-pulse rounded-[8px] border border-[var(--dc-border-subtle)] bg-card/60 p-5">
      <div className="h-4 w-28 rounded bg-muted/50" />
      <div className="mt-4 space-y-3">
        <div className="h-3 w-full rounded bg-muted/40" />
        <div className="h-3 w-5/6 rounded bg-muted/40" />
        <div className="h-3 w-4/6 rounded bg-muted/40" />
      </div>
    </div>
  );
}

/* ── Main Component ── */

type DashboardStatsClientProps = {
  initialData: DashboardBriefingData | null;
  initialError: string | null;
  role: SystemRole;
};

export function DashboardStatsClient({ initialData, initialError, role }: DashboardStatsClientProps) {
  const { data: sessionData } = useSession();
  const displayName = sessionData?.user?.name || ROLE_LABELS[role];
  const [data, setData] = useState(initialData);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const skippedInitialRef = useRef(false);

  const visibleSections = ROLE_SECTIONS[role] ?? ROLE_SECTIONS.field_officer;

  const hasSection = useCallback((section: DashboardSection) => visibleSections.includes(section), [visibleSections]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/dashboard/briefing", {
        cache: "no-store",
        credentials: "include",
      });
      const payload = (await response.json()) as ApiEnvelope<DashboardBriefingData>;
      if (!response.ok || payload.success === false) {
        throw new Error(
          payload.success === false
            ? (payload.error?.message ?? "Gagal memuat data dashboard.")
            : "Gagal memuat data dashboard.",
        );
      }
      setData(payload.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal memuat data dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadData();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [autoRefresh, loadData]);

  useEffect(() => {
    if (!skippedInitialRef.current && initialData) {
      skippedInitialRef.current = true;
      return;
    }
    skippedInitialRef.current = true;
  }, [initialData]);

  /* ── Error state ── */
  if (!data && error) {
    return (
      <div className="grid min-h-[60dvh] place-items-center">
        <Alert variant="destructive" className="max-w-xl">
          <ShieldAlert />
          <AlertTitle>Dashboard tidak tersedia</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button className="mt-4" onClick={() => void loadData()}>
            <RefreshCw data-icon="inline-start" />
            Muat ulang
          </Button>
        </Alert>
      </div>
    );
  }

  /* ── Loading skeleton ── */
  if (!data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {SUMMARY_SKELETON_KEYS.map((key) => (
            <SkeletonCard key={key} />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {SECTION_SKELETON_KEYS.map((key) => (
            <SkeletonSection key={key} />
          ))}
        </div>
      </div>
    );
  }

  const { cards } = data.overview;
  const { kpis } = data;

  /* ── Build summary card data ── */
  const summaryCards = [
    {
      icon: FileText,
      label: "Total Baket",
      value: cards.bakets,
      description: "Bahan Keterangan dalam periode",
      accentColor: "var(--dc-primary)",
      section: "summaryCards" as DashboardSection,
    },
    {
      icon: Target,
      label: "Tugas",
      value: cards.tasks,
      description: "Penugasan lapangan",
      accentColor: "var(--dc-info)",
      section: "summaryCards" as DashboardSection,
    },
    {
      icon: Layers3,
      label: "Direktif",
      value: cards.directives,
      description: "Perintah komando",
      accentColor: "var(--dc-warning)",
      section: "summaryCards" as DashboardSection,
    },
    {
      icon: Package,
      label: "Produk Intelijen",
      value: cards.products,
      description: "Produk yang dihasilkan",
      accentColor: "var(--dc-success)",
      section: "products" as DashboardSection,
    },
    {
      icon: AlertTriangle,
      label: "Alert Aktif",
      value: cards.alerts,
      description: "Peringatan situasional",
      accentColor: "var(--dc-danger)",
      section: "alerts" as DashboardSection,
    },
    {
      icon: Flame,
      label: "Insiden Darurat",
      value: cards.emergencies,
      description: "Kejadian darurat",
      accentColor: "#f97316",
      section: "emergencies" as DashboardSection,
    },
  ];

  const visibleCards = summaryCards.filter(
    (card) => hasSection("summaryCards") && (card.section === "summaryCards" || hasSection(card.section)),
  );

  /* ── Task pipeline data ── */
  const taskStatuses = kpis.taskStatuses ?? {};
  const taskTotal = Object.values(taskStatuses).reduce((sum, n) => sum + n, 0);

  /* ── Verification data ── */
  const verificationStatuses = kpis.verificationStatuses ?? {};
  const verificationTotal = Object.values(verificationStatuses).reduce((sum, n) => sum + n, 0);

  /* ── Product status ── */
  const productStatusMap: Record<string, number> = Array.isArray(data.productStatus)
    ? Object.fromEntries(data.productStatus.map((item) => [item.status, item._count]))
    : (data.productStatus as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <section className="relative overflow-hidden rounded-xl border border-cyan-300/15 bg-[#06111f] px-5 py-5 text-slate-100 shadow-[0_18px_50px_rgba(2,8,23,0.2)] sm:px-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              "linear-gradient(rgba(56,189,248,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.06) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            maskImage: "linear-gradient(to right, black, transparent 80%)",
          }}
        />
        <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-cyan-400/10 blur-[90px]" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border border-cyan-300/20 bg-cyan-300/10 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-cyan-200 hover:bg-cyan-300/10">
                <RadioTower className="size-3.5" /> Pusat Operasi
              </Badge>
              <Badge className="border border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/[0.06]">
                {ROLE_LABELS[role]}
              </Badge>
            </div>
            <h1 className="mt-3 text-balance text-2xl font-bold tracking-tight text-white md:text-[28px]">
              Selamat Datang, {displayName}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Ringkasan operasional berbasis data dan kewenangan aktif Anda.
            </p>
            {data.generatedAt && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.07] px-2.5 py-1 text-xs text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                <span>Diperbarui {formatDateTime(data.generatedAt)}</span>
              </p>
            )}
          </div>
          <div className="rounded-lg bg-white/95 p-0.5 text-slate-950 shadow-lg dark:bg-slate-950/90 dark:text-slate-100">
            <DashboardLiveStatus
              updatedAt={data.generatedAt}
              autoRefresh={autoRefresh}
              loading={loading}
              onToggleAutoRefresh={() => setAutoRefresh((current) => !current)}
              onRefresh={() => void loadData()}
            />
          </div>
        </div>
      </section>

      {error && (
        <Alert variant="destructive" className="animate-in fade-in">
          <ShieldAlert className="size-4" />
          <AlertTitle>Gagal memuat data terbaru</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Summary Cards ── */}
      {hasSection("summaryCards") && (
        <section
          className={cn(
            "grid gap-4",
            visibleCards.length <= 3 && "grid-cols-1 sm:grid-cols-2 md:grid-cols-3",
            visibleCards.length === 4 && "grid-cols-2 md:grid-cols-4",
            visibleCards.length === 5 && "grid-cols-2 md:grid-cols-3 xl:grid-cols-5",
            visibleCards.length >= 6 && "grid-cols-2 md:grid-cols-3 xl:grid-cols-6",
          )}
        >
          {visibleCards.map((card, i) => (
            <StatCard key={card.label} index={i} {...card} />
          ))}
        </section>
      )}

      {/* ── KPI + Task Pipeline + Verification ── */}
      {(hasSection("kpis") || hasSection("taskPipeline")) && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {/* KPI Gauge */}
          {hasSection("kpis") && (
            <Card className="rounded-[8px] border-[var(--dc-border-subtle)] bg-card shadow-[var(--dc-shadow-card)]">
              <CardHeader className="pb-3">
                <SectionHeader icon={TrendingUp} title="Indikator Kinerja" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-around gap-4">
                  <CircularGauge value={kpis.completionRate} label="Penyelesaian Tugas" color="var(--dc-success)" />
                  <Separator orientation="vertical" className="h-20" />
                  <div className="space-y-3">
                    <div className="text-center">
                      <p className="font-mono text-2xl font-bold tabular-nums text-[var(--dc-warning)]">
                        {formatNumber(kpis.approvalBacklog)}
                      </p>
                      <p className="text-[0.65rem] text-muted-foreground">Antrean Persetujuan</p>
                    </div>
                    <div className="text-center">
                      <p className="font-mono text-lg font-semibold tabular-nums">{formatNumber(verificationTotal)}</p>
                      <p className="text-[0.65rem] text-muted-foreground">Total Verifikasi</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Task Pipeline */}
          {hasSection("taskPipeline") && (
            <Card className="rounded-[8px] border-[var(--dc-border-subtle)] bg-card shadow-[var(--dc-shadow-card)]">
              <CardHeader className="pb-3">
                <SectionHeader icon={Activity} title="Pipeline Tugas" />
                <p className="text-[0.68rem] text-muted-foreground">{formatNumber(taskTotal)} tugas total</p>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {Object.entries(taskStatuses).map(([status, count]) => {
                  const config = TASK_STATUS_CONFIG[status] ?? {
                    label: status,
                    color: "var(--dc-neutral)",
                  };
                  return (
                    <ProgressBar
                      key={status}
                      label={config.label}
                      value={count}
                      total={taskTotal}
                      color={config.color}
                    />
                  );
                })}
                {Object.keys(taskStatuses).length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">Belum ada data tugas</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Verification Breakdown */}
          {hasSection("kpis") && (
            <Card className="rounded-[8px] border-[var(--dc-border-subtle)] bg-card shadow-[var(--dc-shadow-card)]">
              <CardHeader className="pb-3">
                <SectionHeader icon={CheckCircle2} title="Status Verifikasi" />
                <p className="text-[0.68rem] text-muted-foreground">
                  {formatNumber(verificationTotal)} total verifikasi
                </p>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {Object.entries(verificationStatuses).map(([status, count]) => {
                  const config = VERIFICATION_STATUS_CONFIG[status] ?? {
                    label: status,
                    color: "var(--dc-neutral)",
                  };
                  return (
                    <ProgressBar
                      key={status}
                      label={config.label}
                      value={count}
                      total={verificationTotal}
                      color={config.color}
                    />
                  );
                })}
                {Object.keys(verificationStatuses).length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">Belum ada data verifikasi</p>
                )}
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* ── Alerts + Emergencies + Products row ── */}
      {(hasSection("alerts") || hasSection("emergencies") || hasSection("products")) && (
        <section
          className={cn("grid gap-4", hasSection("products") ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2")}
        >
          {/* Priority Alerts */}
          {hasSection("alerts") && (
            <Card className="rounded-[8px] border-[var(--dc-border-subtle)] bg-card shadow-[var(--dc-shadow-card)]">
              <CardHeader className="pb-2">
                <SectionHeader icon={AlertTriangle} title="Alert Prioritas" />
              </CardHeader>
              <CardContent>
                {data.priorityAlerts.length > 0 ? (
                  <div className="space-y-1">
                    {data.priorityAlerts.map((alert) => (
                      <AlertListItem key={alert.id} item={alert} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <div className="flex size-10 items-center justify-center rounded-full bg-[var(--dc-success-soft)]">
                      <CheckCircle2 className="size-5 text-[var(--dc-success)]" />
                    </div>
                    <p className="text-sm text-muted-foreground">Tidak ada alert aktif</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Priority Emergencies */}
          {hasSection("emergencies") && (
            <Card className="rounded-[8px] border-[var(--dc-border-subtle)] bg-card shadow-[var(--dc-shadow-card)]">
              <CardHeader className="pb-2">
                <SectionHeader icon={Zap} title="Insiden Darurat" />
              </CardHeader>
              <CardContent>
                {data.priorityEmergencies.length > 0 ? (
                  <div className="space-y-1">
                    {data.priorityEmergencies.map((emergency) => (
                      <EmergencyListItem key={emergency.id} item={emergency} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <div className="flex size-10 items-center justify-center rounded-full bg-[var(--dc-success-soft)]">
                      <CheckCircle2 className="size-5 text-[var(--dc-success)]" />
                    </div>
                    <p className="text-sm text-muted-foreground">Tidak ada insiden darurat</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Product Status */}
          {hasSection("products") && (
            <Card className="rounded-[8px] border-[var(--dc-border-subtle)] bg-card shadow-[var(--dc-shadow-card)]">
              <CardHeader className="pb-2">
                <SectionHeader icon={BarChart3} title="Produk Intelijen" />
              </CardHeader>
              <CardContent>
                {Object.keys(productStatusMap).length > 0 ? (
                  <div className="space-y-2.5">
                    {Object.entries(productStatusMap).map(([status, count]) => {
                      const productTotal = Object.values(productStatusMap).reduce((sum, n) => sum + n, 0);
                      const statusLabels: Record<string, string> = {
                        DRAFT: "Draf",
                        REVIEW: "Peninjauan",
                        APPROVED: "Disetujui",
                        PUBLISHED: "Dipublikasi",
                        ARCHIVED: "Diarsipkan",
                        REJECTED: "Ditolak",
                      };
                      const statusColors: Record<string, string> = {
                        DRAFT: "var(--dc-neutral)",
                        REVIEW: "var(--dc-warning)",
                        APPROVED: "var(--dc-success)",
                        PUBLISHED: "var(--dc-primary)",
                        ARCHIVED: "var(--dc-text-muted)",
                        REJECTED: "var(--dc-danger)",
                      };
                      return (
                        <ProgressBar
                          key={status}
                          label={statusLabels[status] ?? status}
                          value={count}
                          total={productTotal}
                          color={statusColors[status] ?? "var(--dc-neutral)"}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <div className="flex size-10 items-center justify-center rounded-full bg-muted/30">
                      <Package className="size-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">Belum ada produk intelijen</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* ── CSS Animation Keyframe ── */}
      <style>{`
        @keyframes dc-stat-fadein {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
