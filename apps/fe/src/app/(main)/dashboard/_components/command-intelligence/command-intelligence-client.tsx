"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Crosshair,
  ExternalLink,
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

import { JaringIdentitySummary } from "@/components/domain/jaring-identity-summary";
import { REPORT_URGENCY_COLORS, REPORT_URGENCY_LABELS } from "@/components/map/MapLegend";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EvidenceAttachmentViewer } from "@/features/baket/components/evidence-attachment-viewer";
import { cn } from "@/lib/utils";
import { getSystemRoleLabel, type SystemRole } from "@/navigation/sidebar/system-roles";

import { ReportTrendChart } from "./command-intelligence-charts";
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

const ACTIVITY_LABELS: Record<JaringActivityLevel, string> = {
  VERY_ACTIVE: "Sangat sering melapor",
  ACTIVE: "Melapor",
  DORMANT: "Senyap pada periode",
  NEVER_REPORTED: "Belum melapor",
};

const REGISTRATION_LABELS: Record<JaringRegistrationStatus, string> = {
  APPROVED: "Disetujui",
  PENDING: "Menunggu tinjauan",
  REJECTED: "Ditolak",
};

const REPORT_URGENCIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

const DEFAULT_FILTERS: FieldIntelligenceFilters = {
  search: "",
  period: "30d",
  registrationStatus: "ALL",
  activity: "ALL",
  urgency: "ALL",
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

function formatBytes(value?: number | null) {
  if (!value) return "Ukuran tidak tersedia";
  return (
    new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: value >= 1024 * 1024 ? 1 : 0,
    }).format(value >= 1024 * 1024 ? value / (1024 * 1024) : value / 1024) + (value >= 1024 * 1024 ? " MB" : " KB")
  );
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

function HudSurface({ children, className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "border border-border/80 bg-card/88 text-card-foreground shadow-[var(--dc-shadow-overlay)] backdrop-blur-xl",
        className,
      )}
      {...props}
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

function reportUrgency(value?: string | null) {
  const normalized = (value ?? "NORMAL").toUpperCase();
  return REPORT_URGENCIES.includes(normalized as (typeof REPORT_URGENCIES)[number])
    ? (normalized as (typeof REPORT_URGENCIES)[number])
    : "NORMAL";
}

function UrgencyBadge({ urgency }: { urgency?: string | null }) {
  const normalized = reportUrgency(urgency);
  return (
    <Badge variant="outline" className="dc-priority" data-priority={normalized}>
      Urgensi: {REPORT_URGENCY_LABELS[normalized]}
    </Badge>
  );
}

function ProfileField({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-border/60 border-b py-3 last:border-b-0 sm:grid-cols-[150px_1fr]">
      <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.14em]">{label}</span>
      <span className="break-words text-sm">{value ?? "—"}</span>
    </div>
  );
}

function ReportInfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-border/60 border-b py-2 last:border-b-0 sm:grid-cols-[130px_1fr]">
      <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.14em]">{label}</span>
      <span className="break-words text-sm">{value ?? "-"}</span>
    </div>
  );
}

function ReportTextSection({ title, value }: { title: string; value?: string | null }) {
  return (
    <section className="rounded-md border bg-muted/30 p-3">
      <h3 className="font-mono font-semibold text-primary text-xs uppercase tracking-[0.16em]">{title}</h3>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{value?.trim() || "-"}</p>
    </section>
  );
}

function ReportDetailDialog({
  item,
  open,
  onOpenChange,
}: {
  item: MapBaket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] !w-[96vw] !max-w-[1180px] overflow-hidden p-0">
        <DialogHeader className="border-border/70 border-b bg-gradient-to-br from-background via-background to-muted/30 px-6 pt-6 pb-5">
          <div className="flex flex-wrap items-center gap-2 pr-8">
            <UrgencyBadge urgency={item.urgency} />
            {item.category ? <Badge variant="secondary">{item.category.name}</Badge> : null}
          </div>
          <DialogTitle className="pt-2 text-2xl leading-8">{item.displayTitle ?? "Laporan tanpa isi"}</DialogTitle>
          <DialogDescription className="sr-only">Detail laporan dari titik peta.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90dvh-142px)]">
          <div className="grid gap-5 px-6 py-6 lg:grid-cols-[320px_1fr]">
            <aside className="h-fit rounded-xl border border-border/70 bg-card/85 p-4 shadow-sm">
              <h3 className="font-mono font-semibold text-primary text-xs uppercase tracking-[0.16em]">
                Metadata Laporan
              </h3>
              <div className="mt-3">
                {item.jaring ? (
                  <JaringIdentitySummary
                    compact
                    className="border-border/60 border-b pb-3"
                    source={{
                      id: item.jaring.id,
                      fullName: item.jaring.fullName,
                      aliasName: item.jaring.aliasName,
                      whatsappNumber: item.jaring.whatsappNumber,
                      profilePhotoFileId: item.jaring.profilePhotoFileId,
                      gaswilName: item.jaring.gaswilName,
                      gaswilAssignmentId: item.jaring.gaswilAssignmentId,
                      gaswilUserProfileId: item.jaring.gaswilUserProfileId,
                      villageName: item.jaring.areaPathLabel,
                    }}
                  />
                ) : null}
                <ReportInfoRow label="Kategori" value={item.category?.name} />
                <ReportInfoRow label="Urgensi" value={REPORT_URGENCY_LABELS[reportUrgency(item.urgency)]} />
                <ReportInfoRow label="Waktu pelaporan" value={formatDateTime(item.reportedAt)} />
                <ReportInfoRow label="Diterima" value={formatDateTime(item.createdAt)} />
                <ReportInfoRow label="Wilayah" value={item.areaName} />
                <div className="grid gap-1 border-border/60 border-b py-2 last:border-b-0 sm:grid-cols-[130px_1fr]">
                  <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.14em]">
                    Koordinat
                  </span>
                  <Button asChild variant="ghost" className="h-auto justify-start px-0 py-0 font-medium text-sm">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:text-primary"
                    >
                      <LocateFixed className="size-3.5" />
                      {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
                      <ExternalLink className="size-3.5 text-muted-foreground" />
                    </a>
                  </Button>
                </div>
                <ReportInfoRow
                  label="Akurasi"
                  value={item.gpsAccuracyMeters === null ? undefined : `${item.gpsAccuracyMeters} meter`}
                />
                <ReportInfoRow label="Waktu lokasi" value={formatDateTime(item.locationCapturedAt)} />
              </div>
            </aside>

            <div className="grid gap-5">
              <section className="rounded-xl border border-border/70 bg-card/85 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-mono font-semibold text-primary text-xs uppercase tracking-[0.16em]">
                    Isi laporan terstruktur
                  </h3>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-foreground/90 text-sm leading-7">
                  {item.normalizedContent?.trim() || "-"}
                </p>
              </section>

              <div className="grid gap-5 xl:grid-cols-2">
                <ReportTextSection title="Isi laporan asli" value={item.originalContent} />
                <ReportTextSection title="Catatan petugas" value={item.fieldOfficerNote} />
              </div>

              <section className="rounded-xl border border-border/70 bg-card/85 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-mono font-semibold text-primary text-xs uppercase tracking-[0.16em]">Lampiran</h3>
                  <Badge variant="secondary">{formatNumber(item.attachments.length)}</Badge>
                </div>
                {item.attachments.length > 0 ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {item.attachments.map((attachment) => (
                      <EvidenceAttachmentViewer
                        key={attachment.fileId}
                        src={`/api/files/${attachment.fileId}`}
                        fileName={attachment.fileName ?? attachment.fileId}
                        mimeType={attachment.mimeType}
                        caption={
                          attachment.caption ||
                          `${attachment.mimeType ?? "Berkas"} - ${formatBytes(attachment.sizeBytes)}`
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-muted-foreground text-sm">Tidak ada lampiran pada laporan ini.</p>
                )}
              </section>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function ReportHoverCard({ hover }: { hover: { item: MapBaket; x: number; y: number } }) {
  const urgency = reportUrgency(hover.item.urgency);
  return (
    <HudSurface
      className="pointer-events-none absolute z-40 hidden w-[300px] rounded-lg p-3 md:block"
      style={{
        left: hover.x + 24,
        top: Math.max(92, hover.y - 24),
        transform: hover.x > 920 ? "translateX(-108%)" : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[9px] text-primary uppercase tracking-[0.18em]">Pratinjau Laporan</p>
          <p className="mt-1 truncate font-semibold text-sm">{hover.item.displayTitle ?? "Laporan tanpa isi"}</p>
        </div>
        <span
          className="mt-1 size-2.5 shrink-0 rounded-full shadow-[0_0_12px_currentColor]"
          style={{ backgroundColor: REPORT_URGENCY_COLORS[urgency], color: REPORT_URGENCY_COLORS[urgency] }}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <UrgencyBadge urgency={hover.item.urgency} />
      </div>
      {hover.item.jaring ? (
        <JaringIdentitySummary
          compact
          className="mt-3 border-border/60 border-b pb-3"
          source={{
            id: hover.item.jaring.id,
            fullName: hover.item.jaring.fullName,
            aliasName: hover.item.jaring.aliasName,
            whatsappNumber: hover.item.jaring.whatsappNumber,
            profilePhotoFileId: hover.item.jaring.profilePhotoFileId,
            gaswilName: hover.item.jaring.gaswilName,
            gaswilAssignmentId: hover.item.jaring.gaswilAssignmentId,
            gaswilUserProfileId: hover.item.jaring.gaswilUserProfileId,
            villageName: hover.item.jaring.areaPathLabel,
          }}
        />
      ) : null}
      <div className="mt-3 grid grid-cols-[86px_1fr] gap-x-3 gap-y-1.5 text-xs">
        <span className="text-muted-foreground">Wilayah</span>
        <span className="truncate">{hover.item.areaName ?? "Belum terpetakan"}</span>
        <span className="text-muted-foreground">Kategori</span>
        <span className="truncate">{hover.item.category?.name ?? "Tanpa kategori"}</span>
        <span className="text-muted-foreground">Waktu</span>
        <span className="truncate">{formatDateTime(hover.item.createdAt)}</span>
      </div>
    </HudSurface>
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
              <div className="rounded-lg border bg-muted/45 p-4">
                <JaringIdentitySummary
                  source={{
                    id: item.id,
                    fullName: item.fullName,
                    aliasName: item.aliasName,
                    whatsappNumber: item.whatsappNumber,
                    profilePhotoFileId: item.profilePhotoFileId,
                    gaswilName: item.handler?.name,
                    gaswilAssignmentId: item.handler?.assignmentId,
                    gaswilUserProfileId: item.handler?.userProfileId,
                    villageName: item.area?.pathLabel,
                  }}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <RegistrationBadge status={item.registrationStatus} />
                  <ActivityBadge level={item.activity.level} />
                </div>
              </div>

              <section>
                <h3 className="font-mono font-semibold text-primary text-xs uppercase tracking-[0.18em]">
                  Aktivitas Laporan
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    ["Periode", item.activity.periodReports],
                    ["Seumur hidup", item.activity.lifetimeReports],
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
                  <ProfileField label="Nomor identitas" value={item.nationalIdNumber} />
                  <ProfileField label="Alamat" value={item.address} />
                  <ProfileField label="Pekerjaan" value={item.occupation?.name} />
                  <ProfileField label="Tempat kerja" value={item.workplace} />
                  <ProfileField label="Jabatan" value={item.jobTitle} />
                  <ProfileField label="Organisasi" value={item.organizationName} />
                  <ProfileField label="Afiliasi politik" value={item.politicalAffiliation} />
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
  const [hoveredMapBaket, setHoveredMapBaket] = useState<{ item: MapBaket; x: number; y: number } | null>(null);
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
    if (filters.urgency !== "ALL") params.set("urgency", filters.urgency);
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

  const handleBaketMapHover = useCallback(
    (hover: { id: string; x: number; y: number } | null) => {
      if (!hover || !data) {
        setHoveredMapBaket(null);
        return;
      }

      const item = data.map.baket.find((report) => report.id === hover.id);
      setHoveredMapBaket(item ? { item, x: hover.x, y: hover.y } : null);
    },
    [data],
  );

  const activeFilterCount = useMemo(
    () =>
      [
        filters.search,
        filters.registrationStatus !== "ALL",
        filters.activity !== "ALL",
        filters.urgency !== "ALL",
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
      description: `${formatNumber(data.summary.approvedJaring)} disetujui`,
    },
    {
      label: "Menunggu tinjauan",
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
      label: "Cakupan aktif",
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
          onBaketHover={handleBaketMapHover}
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
              {getSystemRoleLabel(role)} - {scopeLabel(data)}
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
                  <span
                    className="mt-1 size-2 shrink-0 rounded-full shadow-[0_0_10px_currentColor]"
                    style={{
                      backgroundColor: REPORT_URGENCY_COLORS[reportUrgency(report.version?.urgency)],
                      color: REPORT_URGENCY_COLORS[reportUrgency(report.version?.urgency)],
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-xs">
                      {report.version?.displayTitle ?? "Laporan tanpa isi"}
                    </span>
                    <span className="mt-1 block truncate text-[10px] text-muted-foreground">
                      {report.jaring?.aliasName ?? report.jaring?.fullName ?? "Jaring belum tertaut"}
                    </span>
                    <span className="mt-1 block font-mono text-[9px] text-muted-foreground">
                      {formatDateTime(report.createdAt)}
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

      {selectedMapJaring && (
        <HudSurface className="absolute right-3 bottom-12 left-3 rounded-lg p-3 md:bottom-10 md:left-auto md:w-[360px] xl:right-[356px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[9px] text-primary uppercase tracking-[0.18em]">Jaring terpilih</p>
              <p className="mt-1 truncate font-semibold text-sm">
                {selectedMapJaring.aliasName ?? selectedMapJaring.fullName ?? selectedMapJaring.id}
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
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <JaringIdentitySummary
              compact
              className="col-span-2 border-b border-border/60 pb-3"
              source={{
                id: selectedMapJaring.id,
                fullName: selectedMapJaring.fullName,
                aliasName: selectedMapJaring.aliasName,
                whatsappNumber: selectedMapJaring.whatsappNumber,
                profilePhotoFileId: selectedMapJaring.profilePhotoFileId,
                gaswilName: selectedMapJaring.gaswilName,
                gaswilAssignmentId: selectedMapJaring.gaswilAssignmentId,
                gaswilUserProfileId: selectedMapJaring.gaswilUserProfileId,
                villageName: selectedMapJaring.areaPathLabel,
              }}
            />
            <span className="text-muted-foreground">Status</span>
            <span className="text-right">{REGISTRATION_LABELS[selectedMapJaring.registrationStatus]}</span>
            <span className="text-muted-foreground">Aktivitas</span>
            <span className="text-right">{ACTIVITY_LABELS[selectedMapJaring.activityLevel]}</span>
            <span className="text-muted-foreground">Laporan periode</span>
            <span className="text-right font-mono">{formatNumber(selectedMapJaring.periodReports)}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            onClick={() => {
              updateFilter("search", selectedMapJaring.aliasName ?? selectedMapJaring.fullName ?? selectedMapJaring.id);
              setRegistryOpen(true);
            }}
          >
            <FileSearch data-icon="inline-start" />
            Buka di registri
          </Button>
        </HudSurface>
      )}

      <ReportDetailDialog
        item={selectedMapBaket}
        open={Boolean(selectedMapBaket)}
        onOpenChange={(open) => {
          if (!open) setSelectedMapBaket(null);
        }}
      />

      {hoveredMapBaket ? <ReportHoverCard hover={hoveredMapBaket} /> : null}

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
            Filter {activeFilterCount} - Mode {mapMode.toUpperCase()}
          </span>
          <span className="text-primary">Sistem aktif</span>
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
            <SheetTitle>Filter Peta Intelijen</SheetTitle>
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
                        <SelectItem value="PENDING">Menunggu tinjauan</SelectItem>
                        <SelectItem value="APPROVED">Disetujui</SelectItem>
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
                  <label htmlFor="urgency-filter" className="font-medium text-sm">
                    Urgensi Laporan
                  </label>
                  <Select value={filters.urgency} onValueChange={(value) => updateFilter("urgency", value)}>
                    <SelectTrigger id="urgency-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Prioritas laporan</SelectLabel>
                        <SelectItem value="ALL">Semua urgensi</SelectItem>
                        {REPORT_URGENCIES.map((urgency) => (
                          <SelectItem key={urgency} value={urgency}>
                            {REPORT_URGENCY_LABELS[urgency]}
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
                          {area.name} - {area.level}
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
            <SheetDescription>Ringkasan operasional dari cakupan peta yang sedang aktif.</SheetDescription>
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
                    <CardDescription>Rata-rata laporan per Jaring melapor</CardDescription>
                    <CardTitle className="font-mono text-3xl">{data.summary.averageReportsPerActiveJaring}</CardTitle>
                  </CardHeader>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Ritme Laporan</CardTitle>
                  <CardDescription>Total laporan pada periode aktif.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ReportTrendChart trend={data.trend} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Distribusi Urgensi</CardTitle>
                  <CardDescription>Sebaran prioritas laporan pada periode aktif.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {REPORT_URGENCIES.map((urgency) => (
                    <div key={urgency} className="flex items-center justify-between rounded-md border p-3">
                      <UrgencyBadge urgency={urgency} />
                      <span className="font-mono text-lg">
                        {formatNumber(
                          data.map.baket.filter((report) => reportUrgency(report.urgency) === urgency).length,
                        )}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Indeks Pelaporan</CardTitle>
                  <CardDescription>
                    Sangat sering melapor minimal 4 laporan; melapor 1-3 laporan pada periode.
                  </CardDescription>
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
              Seluruh status registrasi, termasuk Jaring yang menunggu tinjauan, serta frekuensi laporannya.
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
                        <TableHead className="min-w-[300px]">Identitas Jaring</TableHead>
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
                            <JaringIdentitySummary
                              compact
                              source={{
                                id: item.id,
                                fullName: item.fullName,
                                aliasName: item.aliasName,
                                whatsappNumber: item.whatsappNumber,
                                profilePhotoFileId: item.profilePhotoFileId,
                                gaswilName: item.handler?.name,
                                gaswilAssignmentId: item.handler?.assignmentId,
                                gaswilUserProfileId: item.handler?.userProfileId,
                                villageName: item.area?.pathLabel,
                              }}
                            />
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
                  Halaman {data.jaring.pagination.page} dari {Math.max(data.jaring.pagination.totalPages, 1)} -{" "}
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
