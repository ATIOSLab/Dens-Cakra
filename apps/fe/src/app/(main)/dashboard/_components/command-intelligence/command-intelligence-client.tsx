"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Image from "next/image";

import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Crosshair,
  FileSearch,
  Filter,
  Layers3,
  List,
  LocateFixed,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  Radio,
  RefreshCw,
  Satellite,
  Search,
  ShieldAlert,
  UsersRound,
  X,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { SYSTEM_ROLES, type SystemRole } from "@/navigation/sidebar/system-roles";

import { ReportPipelineChart, ReportTrendChart } from "./command-intelligence-charts";
import { CommandIntelligenceMap, type CommandMapLayers, type CommandMapMode } from "./command-intelligence-map";
import type {
  FieldIntelligenceDashboard,
  FieldIntelligenceFilters,
  FieldIntelligenceJaring,
  JaringActivityLevel,
  JaringRegistrationStatus,
} from "./types";

type ApiEnvelope<T> = { success: true; data: T } | { success: false; error?: { message?: string } };

type CommandIntelligenceClientProps = {
  initialData: FieldIntelligenceDashboard | null;
  initialError: string | null;
  role: SystemRole;
};

type MapJaring = FieldIntelligenceDashboard["map"]["jaring"][number];
type MapBaket = FieldIntelligenceDashboard["map"]["baket"][number];

const ROLE_LABELS: Record<SystemRole, string> = {
  [SYSTEM_ROLES.ADMIN_SYSTEM]: "Administrator Sistem",
  [SYSTEM_ROLES.EXECUTIVE]: "Executive",
  [SYSTEM_ROLES.FIELD_COORDINATOR]: "Koordinator Lapangan",
  [SYSTEM_ROLES.FIELD_OFFICER]: "Petugas Lapangan",
  [SYSTEM_ROLES.OPERATIONAL_INTELLIGENCE_MANAGER]: "OIM",
  [SYSTEM_ROLES.REGIONAL_COMMANDER]: "Komandan Regional",
};

const ACTIVITY_LABELS: Record<JaringActivityLevel, string> = {
  VERY_ACTIVE: "Sangat aktif",
  ACTIVE: "Aktif",
  DORMANT: "Dormant",
  NEVER_REPORTED: "Belum melapor",
};

const REGISTRATION_LABELS: Record<JaringRegistrationStatus, string> = {
  APPROVED: "Terverifikasi",
  PENDING: "Belum diverifikasi",
  REJECTED: "Ditolak",
};

const REPORT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  READY_TO_SEND: "Siap kirim",
  SENT_TO_OIM: "Terkirim OIM",
  UNDER_VERIFICATION: "Dalam verifikasi",
  NEEDS_DEVELOPMENT: "Perlu pendalaman",
  VERIFIED: "Terverifikasi",
  REJECTED: "Ditolak",
};

const DEFAULT_FILTERS: FieldIntelligenceFilters = {
  search: "",
  period: "30d",
  registrationStatus: "ALL",
  activity: "ALL",
  baketStatus: "ALL",
  areaId: "ALL",
  page: 1,
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatDateTime(value?: string | null) {
  if (!value) return "Belum tersedia";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Belum tersedia";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function initials(value?: string | null) {
  if (!value) return "JR";
  const words = value.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words.at(-1)?.[0] ?? ""}`.toUpperCase();
}

function scopeLabel(data: FieldIntelligenceDashboard) {
  if (data.scope.nationalAccess) return "Seluruh wilayah nasional";
  if (data.scope.areas.length > 0) return data.scope.areas.map((area) => area.name).join(", ");
  return data.scope.organizationUnit.name;
}

function registrationVariant(status: JaringRegistrationStatus) {
  if (status === "REJECTED") return "destructive" as const;
  if (status === "APPROVED") return "default" as const;
  return "secondary" as const;
}

function HudSurface({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "border border-border/80 bg-card/88 text-card-foreground shadow-[var(--dc-shadow-overlay)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

function IconTooltipButton({
  label,
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button {...props} className={className} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function MetricTile({
  label,
  value,
  description,
  attention,
}: {
  label: string;
  value: string;
  description: string;
  attention?: boolean;
}) {
  return (
    <div className="min-w-0 border-border/70 border-r px-3 py-2 last:border-r-0">
      <p className="truncate font-mono text-[9px] text-muted-foreground uppercase tracking-[0.18em]">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className={cn("font-mono font-semibold text-xl tabular-nums", attention && "text-destructive")}>{value}</p>
        <span className="hidden truncate text-[10px] text-muted-foreground xl:inline">{description}</span>
      </div>
    </div>
  );
}

function RegistrationBadge({ status }: { status: JaringRegistrationStatus }) {
  return <Badge variant={registrationVariant(status)}>{REGISTRATION_LABELS[status]}</Badge>;
}

function ActivityBadge({ level }: { level: JaringActivityLevel }) {
  return <Badge variant={level === "NEVER_REPORTED" ? "outline" : "secondary"}>{ACTIVITY_LABELS[level]}</Badge>;
}

function ProfileField({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-border/60 border-b py-3 last:border-b-0 sm:grid-cols-[150px_1fr]">
      <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.14em]">{label}</span>
      <span className="break-words text-sm">{value ?? "—"}</span>
    </div>
  );
}

function JaringDossier({
  item,
  open,
  onOpenChange,
}: {
  item: FieldIntelligenceJaring | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Dossier Jaring</SheetTitle>
          <SheetDescription>Identitas, cakupan, pengampu, dan rekam aktivitas laporan.</SheetDescription>
        </SheetHeader>
        {item ? (
          <ScrollArea className="min-h-0 flex-1 px-4 pb-6">
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-4 rounded-lg border bg-muted/45 p-4">
                <div className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-md border bg-background font-mono font-semibold text-primary">
                  {item.profilePhotoFileId ? (
                    <Image
                      src={`/api/files/${item.profilePhotoFileId}`}
                      alt={item.aliasName ?? item.fullName ?? item.code}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    initials(item.aliasName ?? item.fullName ?? item.code)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-lg">{item.aliasName ?? item.fullName ?? item.code}</p>
                  <p className="font-mono text-muted-foreground text-xs">{item.code}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <RegistrationBadge status={item.registrationStatus} />
                    <ActivityBadge level={item.activity.level} />
                  </div>
                </div>
              </div>

              <section>
                <h3 className="font-mono font-semibold text-primary text-xs uppercase tracking-[0.18em]">
                  Aktivitas Laporan
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ["Periode", item.activity.periodReports],
                    ["Seumur hidup", item.activity.lifetimeReports],
                    ["Terverifikasi", item.activity.verifiedReports],
                    ["Belum valid", item.activity.unverifiedReports],
                  ].map(([label, value]) => (
                    <Card key={String(label)}>
                      <CardHeader className="pb-2">
                        <CardDescription>{label}</CardDescription>
                        <CardTitle className="font-mono text-2xl">{formatNumber(Number(value))}</CardTitle>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="font-mono font-semibold text-primary text-xs uppercase tracking-[0.18em]">
                  Identitas & cakupan
                </h3>
                <div className="mt-2">
                  <ProfileField label="Nama lengkap" value={item.fullName} />
                  <ProfileField label="Nomor identitas" value={item.nationalIdNumber} />
                  <ProfileField label="WhatsApp" value={item.whatsappNumber} />
                  <ProfileField label="Alamat" value={item.address} />
                  <ProfileField label="Wilayah" value={item.area?.pathLabel} />
                  <ProfileField label="Pekerjaan" value={item.occupation?.name} />
                  <ProfileField label="Tempat kerja" value={item.workplace} />
                  <ProfileField label="Jabatan" value={item.jobTitle} />
                  <ProfileField label="Organisasi" value={item.organizationName} />
                  <ProfileField label="Afiliasi politik" value={item.politicalAffiliation} />
                  <ProfileField label="Pengampu" value={item.handler?.name} />
                  <ProfileField label="Posisi pengampu" value={item.handler?.positionTitle} />
                  <ProfileField label="Laporan terakhir" value={formatDateTime(item.activity.lastReportAt)} />
                  <ProfileField label="Catatan" value={item.notes} />
                </div>
              </section>
            </div>
          </ScrollArea>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export function CommandIntelligenceClient({ initialData, initialError, role }: CommandIntelligenceClientProps) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState(initialError);
  const [filters, setFilters] = useState<FieldIntelligenceFilters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(false);
  const [layers, setLayers] = useState<CommandMapLayers>({ jaring: true, baket: true });
  const [mapMode, setMapMode] = useState<CommandMapMode>("street");
  const [filterOpen, setFilterOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [registryOpen, setRegistryOpen] = useState(false);
  const [selectedJaring, setSelectedJaring] = useState<FieldIntelligenceJaring | null>(null);
  const [selectedMapJaring, setSelectedMapJaring] = useState<MapJaring | null>(null);
  const [selectedMapBaket, setSelectedMapBaket] = useState<MapBaket | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const skippedInitialRequest = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({
    center: [117.5, -2.5] as [number, number],
    zoom: 4.2,
    pitch: 0,
    bearing: 0,
  });
  const [pointer, setPointer] = useState({ latitude: -2.5, longitude: 117.5 });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(filters.page),
      limit: "12",
      period: filters.period,
    });
    if (filters.search.trim()) params.set("search", filters.search.trim());
    if (filters.registrationStatus !== "ALL") params.set("registrationStatus", filters.registrationStatus);
    if (filters.activity !== "ALL") params.set("activity", filters.activity);
    if (filters.baketStatus !== "ALL") params.set("baketStatus", filters.baketStatus);
    if (filters.areaId !== "ALL") params.set("areaId", filters.areaId);

    try {
      const response = await fetch(`/api/v1/dashboard/field-intelligence?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const payload = (await response.json()) as ApiEnvelope<FieldIntelligenceDashboard>;
      if (!response.ok || payload.success === false) {
        throw new Error(
          payload.success === false
            ? (payload.error?.message ?? "Panel komando gagal dimuat.")
            : "Panel komando gagal dimuat.",
        );
      }
      setData(payload.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Panel komando gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (!skippedInitialRequest.current && initialData) {
      skippedInitialRequest.current = true;
      return;
    }
    skippedInitialRequest.current = true;
    const timer = window.setTimeout(
      () => {
        void loadData();
      },
      filters.search ? 350 : 0,
    );
    return () => window.clearTimeout(timer);
  }, [filters, initialData, loadData]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === rootRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    handleFullscreenChange();
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const root = rootRef.current;
    if (!root) return;

    if (document.fullscreenElement === root) {
      await document.exitFullscreen();
      return;
    }

    await root.requestFullscreen();
  }, []);

  const updateFilter = useCallback(
    <Key extends keyof FieldIntelligenceFilters>(key: Key, value: FieldIntelligenceFilters[Key]) => {
      setFilters((current) => ({ ...current, [key]: value, page: key === "page" ? Number(value) : 1 }));
    },
    [],
  );

  const handleJaringMapSelect = useCallback(
    (jaringId: string) => {
      if (!data) return;
      setSelectedMapBaket(null);
      setSelectedMapJaring(data.map.jaring.find((item) => item.id === jaringId) ?? null);
    },
    [data],
  );

  const handleBaketMapSelect = useCallback(
    (baketId: string) => {
      if (!data) return;
      setSelectedMapJaring(null);
      setSelectedMapBaket(data.map.baket.find((item) => item.id === baketId) ?? null);
    },
    [data],
  );

  const activeFilterCount = useMemo(
    () =>
      [
        filters.search,
        filters.registrationStatus !== "ALL",
        filters.activity !== "ALL",
        filters.baketStatus !== "ALL",
        filters.areaId !== "ALL",
      ].filter(Boolean).length,
    [filters],
  );

  if (!data) {
    return (
      <div
        data-content-padding="false"
        className="grid h-[calc(100dvh-var(--dashboard-header-height))] place-items-center"
      >
        <Alert variant="destructive" className="max-w-xl">
          <ShieldAlert />
          <AlertTitle>Panel komando belum tersedia</AlertTitle>
          <AlertDescription>{error ?? "Layanan data belum merespons."}</AlertDescription>
          <Button className="mt-4" onClick={() => void loadData()}>
            <RefreshCw data-icon="inline-start" />
            Muat ulang
          </Button>
        </Alert>
      </div>
    );
  }

  const metrics = [
    {
      label: "Jaring cakupan",
      value: formatNumber(data.summary.totalJaring),
      description: `${formatNumber(data.summary.approvedJaring)} terverifikasi`,
    },
    {
      label: "Belum diverifikasi",
      value: formatNumber(data.summary.pendingJaring),
      description: `${formatNumber(data.summary.rejectedJaring)} ditolak`,
      attention: data.summary.pendingJaring > 0,
    },
    {
      label: "Laporan periode",
      value: formatNumber(data.summary.reportsInPeriod),
      description: `${formatNumber(data.summary.totalReports)} sepanjang waktu`,
    },
    {
      label: "Coverage aktif",
      value: `${data.summary.reportingCoverage}%`,
      description: `${formatNumber(data.summary.reportingJaring)} Jaring melapor`,
    },
  ];

  return (
    <div
      ref={rootRef}
      data-content-padding="false"
      className={cn(
        "relative h-[calc(100dvh-var(--dashboard-header-height))] min-h-[620px] overflow-hidden bg-background text-foreground",
        isFullscreen && "h-screen min-h-screen",
      )}
    >
      <div className="absolute inset-0">
        <CommandIntelligenceMap
          data={data}
          layers={layers}
          mode={mapMode}
          onJaringSelect={handleJaringMapSelect}
          onBaketSelect={handleBaketMapSelect}
          onViewportChange={setViewport}
          onPointerMove={setPointer}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,var(--dc-overlay)_140%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background/70 to-transparent" />

      <HudSurface className="absolute top-3 right-3 left-3 flex min-h-14 items-center justify-between gap-3 rounded-lg px-3 py-2 md:left-4 md:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-md border border-primary/30 bg-primary/10 text-primary">
            <Crosshair className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-mono font-semibold text-sm uppercase tracking-[0.16em]">
                Cakra Intelligence Map
              </p>
              <Badge variant="outline" className="hidden sm:inline-flex">
                <Radio className="text-primary" />
                Live
              </Badge>
            </div>
            <p className="truncate text-muted-foreground text-xs">
              {ROLE_LABELS[role]} · {scopeLabel(data)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden text-right lg:block">
            <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-[0.16em]">Sinkronisasi</p>
            <p className="font-mono text-primary text-xs">{formatDateTime(data.generatedAt)}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void toggleFullscreen()}>
            {isFullscreen ? <Minimize2 data-icon="inline-start" /> : <Maximize2 data-icon="inline-start" />}
            <span className="hidden sm:inline">{isFullscreen ? "Keluar penuh" : "Layar penuh"}</span>
          </Button>
          <Button variant="outline" size="sm" disabled={loading} onClick={() => void loadData()}>
            {loading ? <Spinner data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" />}
            <span className="hidden sm:inline">Segarkan</span>
          </Button>
        </div>
      </HudSurface>

      <HudSurface className="absolute top-[78px] right-3 left-20 hidden grid-cols-4 overflow-hidden rounded-lg lg:grid xl:right-[356px]">
        {metrics.map((metric) => (
          <MetricTile key={metric.label} {...metric} />
        ))}
      </HudSurface>

      <HudSurface className="absolute top-[78px] left-3 flex flex-col gap-1 rounded-lg p-1.5 md:top-20 md:left-4">
        <IconTooltipButton
          label={layers.jaring ? "Sembunyikan layer Jaring" : "Tampilkan layer Jaring"}
          variant={layers.jaring ? "secondary" : "ghost"}
          size="icon-sm"
          onClick={() => setLayers((current) => ({ ...current, jaring: !current.jaring }))}
        >
          <UsersRound />
        </IconTooltipButton>
        <IconTooltipButton
          label={layers.baket ? "Sembunyikan layer Laporan" : "Tampilkan layer Laporan"}
          variant={layers.baket ? "secondary" : "ghost"}
          size="icon-sm"
          onClick={() => setLayers((current) => ({ ...current, baket: !current.baket }))}
        >
          <CircleDot />
        </IconTooltipButton>
        <Separator />
        <IconTooltipButton label="Filter data" variant="ghost" size="icon-sm" onClick={() => setFilterOpen(true)}>
          <Filter />
        </IconTooltipButton>
        <IconTooltipButton label="Analitik" variant="ghost" size="icon-sm" onClick={() => setAnalyticsOpen(true)}>
          <BarChart3 />
        </IconTooltipButton>
        <IconTooltipButton label="Registri Jaring" variant="ghost" size="icon-sm" onClick={() => setRegistryOpen(true)}>
          <List />
        </IconTooltipButton>
        <Separator />
        <IconTooltipButton
          label={mapMode === "satellite" ? "Mode peta jalan" : "Mode peta satelit"}
          variant={mapMode === "satellite" ? "secondary" : "ghost"}
          size="icon-sm"
          onClick={() => setMapMode((current) => (current === "street" ? "satellite" : "street"))}
        >
          {mapMode === "street" ? <Satellite /> : <MapIcon />}
        </IconTooltipButton>
      </HudSurface>

      <HudSurface className="absolute top-[78px] right-3 hidden w-[332px] overflow-hidden rounded-lg xl:block">
        <div className="flex items-center justify-between px-3 py-2.5">
          <div>
            <p className="font-mono font-semibold text-xs uppercase tracking-[0.16em]">Live intelligence</p>
            <p className="text-[11px] text-muted-foreground">Laporan terbaru dalam cakupan</p>
          </div>
          <Badge variant="secondary">{formatNumber(data.recentReports.length)}</Badge>
        </div>
        <Separator />
        <ScrollArea className="h-[min(48dvh,430px)]">
          <div className="flex flex-col">
            {data.recentReports.length > 0 ? (
              data.recentReports.slice(0, 10).map((report) => (
                <button
                  key={report.id}
                  type="button"
                  className="flex w-full gap-3 border-border/60 border-b px-3 py-3 text-left transition-colors hover:bg-accent"
                  onClick={() => handleBaketMapSelect(report.id)}
                >
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-primary shadow-[0_0_10px_var(--dc-primary)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-xs">
                      {report.version?.title ?? "Laporan tanpa judul"}
                    </span>
                    <span className="mt-1 block truncate text-[10px] text-muted-foreground">
                      {report.jaring?.aliasName ??
                        report.jaring?.fullName ??
                        report.jaring?.code ??
                        "Sumber belum tertaut"}
                    </span>
                    <span className="mt-1 flex items-center justify-between gap-2 font-mono text-[9px] text-muted-foreground">
                      <span>{REPORT_STATUS_LABELS[report.status] ?? report.status}</span>
                      <span>{formatDateTime(report.createdAt)}</span>
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <div className="grid h-48 place-items-center px-6 text-center text-muted-foreground text-xs">
                Belum ada Laporan pada periode aktif.
              </div>
            )}
          </div>
        </ScrollArea>
      </HudSurface>

      <HudSurface className="absolute bottom-9 left-3 hidden min-w-56 rounded-lg p-3 md:left-20 md:block">
        <div className="flex items-center gap-2">
          <Layers3 className="size-4 text-primary" />
          <p className="font-mono font-semibold text-[10px] uppercase tracking-[0.16em]">Layer aktif</p>
        </div>
        <div className="mt-2 flex items-center justify-between gap-5 text-xs">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary" />
            Jaring {formatNumber(data.map.jaring.length)}
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[var(--dc-warning)]" />
            Laporan {formatNumber(data.map.baket.length)}
          </span>
        </div>
      </HudSurface>

      {(selectedMapJaring || selectedMapBaket) && (
        <HudSurface className="absolute right-3 bottom-12 left-3 rounded-lg p-3 md:bottom-10 md:left-auto md:w-[360px] xl:right-[356px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[9px] text-primary uppercase tracking-[0.18em]">
                {selectedMapJaring ? "Jaring terpilih" : "Laporan terpilih"}
              </p>
              <p className="mt-1 truncate font-semibold text-sm">
                {selectedMapJaring
                  ? (selectedMapJaring.aliasName ?? selectedMapJaring.fullName ?? selectedMapJaring.code)
                  : (selectedMapBaket?.title ?? "Laporan")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Tutup informasi pilihan"
              onClick={() => {
                setSelectedMapJaring(null);
                setSelectedMapBaket(null);
              }}
            >
              <X />
            </Button>
          </div>
          {selectedMapJaring ? (
            <>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <span className="text-muted-foreground">Status</span>
                <span className="text-right">{REGISTRATION_LABELS[selectedMapJaring.registrationStatus]}</span>
                <span className="text-muted-foreground">Aktivitas</span>
                <span className="text-right">{ACTIVITY_LABELS[selectedMapJaring.activityLevel]}</span>
                <span className="text-muted-foreground">Laporan periode</span>
                <span className="text-right font-mono">{formatNumber(selectedMapJaring.periodReports)}</span>
                <span className="text-muted-foreground">Wilayah</span>
                <span className="truncate text-right">{selectedMapJaring.areaName}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => {
                  updateFilter("search", selectedMapJaring.code);
                  setRegistryOpen(true);
                }}
              >
                <FileSearch data-icon="inline-start" />
                Buka di registri
              </Button>
            </>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <span className="text-muted-foreground">Status</span>
              <span className="text-right">
                {REPORT_STATUS_LABELS[selectedMapBaket?.status ?? ""] ?? selectedMapBaket?.status}
              </span>
              <span className="text-muted-foreground">Jaring</span>
              <span className="truncate text-right">
                {selectedMapBaket?.jaring?.aliasName ?? selectedMapBaket?.jaring?.code ?? "Belum tertaut"}
              </span>
              <span className="text-muted-foreground">Wilayah</span>
              <span className="truncate text-right">{selectedMapBaket?.areaName ?? "Belum terpetakan"}</span>
            </div>
          )}
        </HudSurface>
      )}

      <div className="absolute inset-x-0 bottom-0 flex h-7 items-center justify-between gap-3 border-border/80 border-t bg-card/90 px-3 font-mono text-[9px] text-muted-foreground backdrop-blur-lg">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <LocateFixed className="size-3 text-primary" />
            {pointer.latitude.toFixed(4)}, {pointer.longitude.toFixed(4)}
          </span>
          <span className="hidden sm:inline">ZOOM {viewport.zoom.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline">
            FILTER {activeFilterCount} · MODE {mapMode.toUpperCase()}
          </span>
          <span className="text-primary">SYSTEM ONLINE</span>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="absolute right-3 bottom-10 left-3 md:right-auto md:left-20 md:max-w-md">
          <ShieldAlert />
          <AlertTitle>Sinkronisasi terganggu</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="left" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Filter intelligence map</SheetTitle>
            <SheetDescription>Seluruh layer, panel, dan registri mengikuti filter ini.</SheetDescription>
          </SheetHeader>
          <ScrollArea className="min-h-0 flex-1 px-4 pb-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label htmlFor="command-search" className="font-medium text-sm">
                  Pencarian Jaring
                </label>
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="command-search"
                    value={filters.search}
                    onChange={(event) => updateFilter("search", event.target.value)}
                    placeholder="Kode, alias, nama, wilayah..."
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label htmlFor="period-filter" className="font-medium text-sm">
                    Periode
                  </label>
                  <Select
                    value={filters.period}
                    onValueChange={(value) => updateFilter("period", value as FieldIntelligenceFilters["period"])}
                  >
                    <SelectTrigger id="period-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="7d">7 hari</SelectItem>
                        <SelectItem value="30d">30 hari</SelectItem>
                        <SelectItem value="90d">90 hari</SelectItem>
                        <SelectItem value="all">Seluruh waktu</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="registration-filter" className="font-medium text-sm">
                    Status Jaring
                  </label>
                  <Select
                    value={filters.registrationStatus}
                    onValueChange={(value) =>
                      updateFilter("registrationStatus", value as FieldIntelligenceFilters["registrationStatus"])
                    }
                  >
                    <SelectTrigger id="registration-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="ALL">Semua status</SelectItem>
                        <SelectItem value="PENDING">Belum diverifikasi</SelectItem>
                        <SelectItem value="APPROVED">Terverifikasi</SelectItem>
                        <SelectItem value="REJECTED">Ditolak</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label htmlFor="activity-filter" className="font-medium text-sm">
                    Keaktifan
                  </label>
                  <Select
                    value={filters.activity}
                    onValueChange={(value) => updateFilter("activity", value as FieldIntelligenceFilters["activity"])}
                  >
                    <SelectTrigger id="activity-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="ALL">Semua aktivitas</SelectItem>
                        {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="baket-filter" className="font-medium text-sm">
                    Status Laporan
                  </label>
                  <Select value={filters.baketStatus} onValueChange={(value) => updateFilter("baketStatus", value)}>
                    <SelectTrigger id="baket-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Riwayat Laporan</SelectLabel>
                        <SelectItem value="ALL">Semua status</SelectItem>
                        {Object.entries(REPORT_STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="area-filter" className="font-medium text-sm">
                  Wilayah
                </label>
                <Select value={filters.areaId} onValueChange={(value) => updateFilter("areaId", value)}>
                  <SelectTrigger id="area-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="ALL">Seluruh wilayah cakupan</SelectItem>
                      {data.filters.areas.map((area) => (
                        <SelectItem key={area.id} value={area.id}>
                          {area.name} · {area.level}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-sm">Layer Jaring</p>
                  <p className="text-muted-foreground text-xs">
                    {formatNumber(data.map.jaring.length)} titik terpetakan
                  </p>
                </div>
                <Switch
                  checked={layers.jaring}
                  onCheckedChange={(checked) => setLayers((current) => ({ ...current, jaring: checked }))}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-sm">Layer Laporan</p>
                  <p className="text-muted-foreground text-xs">
                    {formatNumber(data.map.baket.length)} laporan terpetakan
                  </p>
                </div>
                <Switch
                  checked={layers.baket}
                  onCheckedChange={(checked) => setLayers((current) => ({ ...current, baket: checked }))}
                />
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                  setLayers({ jaring: true, baket: true });
                }}
              >
                <RefreshCw data-icon="inline-start" />
                Reset filter
              </Button>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Sheet open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
        <SheetContent className="w-full sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>Analitik Laporan & Jaring</SheetTitle>
            <SheetDescription>Ringkasan operasional dari scope peta yang sedang aktif.</SheetDescription>
          </SheetHeader>
          <ScrollArea className="min-h-0 flex-1 px-4 pb-6">
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardDescription>Jaring melapor</CardDescription>
                    <CardTitle className="font-mono text-3xl">{formatNumber(data.summary.reportingJaring)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardDescription>Jaring senyap</CardDescription>
                    <CardTitle className="font-mono text-3xl">{formatNumber(data.summary.silentJaring)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardDescription>Rata-rata laporan</CardDescription>
                    <CardTitle className="font-mono text-3xl">{data.summary.averageReportsPerActiveJaring}</CardTitle>
                  </CardHeader>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Ritme Laporan</CardTitle>
                  <CardDescription>Total, terverifikasi, dan belum terverifikasi pada periode aktif.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ReportTrendChart trend={data.trend} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Pipeline Laporan</CardTitle>
                  <CardDescription>Distribusi status pemrosesan laporan.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ReportPipelineChart pipeline={data.reportPipeline} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Indeks keaktifan</CardTitle>
                  <CardDescription>Sangat aktif ≥4 laporan; aktif 1–3 laporan pada periode.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {(Object.keys(ACTIVITY_LABELS) as JaringActivityLevel[]).map((level) => (
                    <div key={level} className="flex items-center justify-between rounded-md border p-3">
                      <ActivityBadge level={level} />
                      <span className="font-mono text-lg">{formatNumber(data.activityStatuses[level] ?? 0)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Sheet open={registryOpen} onOpenChange={setRegistryOpen}>
        <SheetContent side="bottom" className="h-[82dvh]">
          <SheetHeader>
            <SheetTitle>Registri Jaring</SheetTitle>
            <SheetDescription>
              Seluruh status registrasi, termasuk Jaring yang belum diverifikasi, serta frekuensi laporannya.
            </SheetDescription>
          </SheetHeader>
          <Tabs defaultValue="table" className="min-h-0 flex-1 px-4 pb-4">
            <TabsList>
              <TabsTrigger value="table">Daftar Jaring</TabsTrigger>
              <TabsTrigger value="summary">Ringkasan status</TabsTrigger>
            </TabsList>
            <TabsContent value="table" className="min-h-0">
              <div className="overflow-hidden rounded-md border">
                <ScrollArea className="h-[52dvh]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Jaring</TableHead>
                        <TableHead>Wilayah</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Keaktifan</TableHead>
                        <TableHead className="text-right">Laporan</TableHead>
                        <TableHead>Laporan terakhir</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.jaring.items.map((item) => (
                        <TableRow
                          key={item.id}
                          className="cursor-pointer"
                          onClick={() => {
                            setRegistryOpen(false);
                            setSelectedJaring(item);
                          }}
                        >
                          <TableCell>
                            <p className="font-medium">{item.aliasName ?? item.fullName ?? item.code}</p>
                            <p className="font-mono text-muted-foreground text-xs">{item.code}</p>
                          </TableCell>
                          <TableCell className="max-w-64 truncate">
                            {item.area?.pathLabel ?? "Belum dipetakan"}
                          </TableCell>
                          <TableCell>
                            <RegistrationBadge status={item.registrationStatus} />
                          </TableCell>
                          <TableCell>
                            <ActivityBadge level={item.activity.level} />
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatNumber(item.activity.periodReports)}
                            <span className="block text-[10px] text-muted-foreground">
                              {formatNumber(item.activity.lifetimeReports)} total
                            </span>
                          </TableCell>
                          <TableCell>{formatDateTime(item.activity.lastReportAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-muted-foreground text-xs">
                  Halaman {data.jaring.pagination.page} dari {Math.max(data.jaring.pagination.totalPages, 1)} ·{" "}
                  {formatNumber(data.jaring.pagination.total)} Jaring
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.page <= 1 || loading}
                    onClick={() => updateFilter("page", filters.page - 1)}
                  >
                    <ChevronLeft data-icon="inline-start" />
                    Sebelumnya
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.page >= data.jaring.pagination.totalPages || loading}
                    onClick={() => updateFilter("page", filters.page + 1)}
                  >
                    Berikutnya
                    <ChevronRight data-icon="inline-end" />
                  </Button>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="summary">
              <div className="grid gap-4 sm:grid-cols-3">
                {(["APPROVED", "PENDING", "REJECTED"] as JaringRegistrationStatus[]).map((status) => (
                  <Card key={status}>
                    <CardHeader>
                      <RegistrationBadge status={status} />
                      <CardTitle className="font-mono text-4xl">
                        {formatNumber(data.registrationStatuses[status] ?? 0)}
                      </CardTitle>
                      <CardDescription>Jaring berstatus {REGISTRATION_LABELS[status].toLowerCase()}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <JaringDossier
        item={selectedJaring}
        open={Boolean(selectedJaring)}
        onOpenChange={(open) => {
          if (!open) setSelectedJaring(null);
        }}
      />
    </div>
  );
}
