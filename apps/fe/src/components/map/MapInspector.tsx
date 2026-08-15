// biome-ignore-all lint/nursery/useSortedClasses: Preserves selected finalkalife map UI class composition.

import type React from "react";
import { useMemo } from "react";

import { AlertTriangle, CheckCircle2, Clock, Compass, LoaderCircle, MapPinned, ShieldAlert, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DOMAIN_VISUALS } from "@/lib/domain/visual-system";

import { REPORT_URGENCY_COLORS, REPORT_URGENCY_LABELS } from "./MapLegend";
import { type PersonnelStatus, STATUS_COLORS, STATUS_LABELS } from "./utils/mapHelpers";

export type AreaSummary = {
  personnelCount: number;
  reportsCount: number;
  alertsCount: number;
  unitsCount: number;
  emergenciesCount: number;
};

export type SelectionType =
  | {
      kind: "personnel";
      properties: any;
      coordinates: [number, number];
      loading?: boolean;
      detailError?: string | null;
    }
  | {
      kind: "report";
      properties: any;
      coordinates: [number, number];
      loading?: boolean;
      detailError?: string | null;
    }
  | { kind: "cluster"; properties: any; leaves: GeoJSON.Feature[]; coordinates: [number, number] }
  | {
      kind: "area";
      properties: any;
      summary: AreaSummary;
      coordinates?: [number, number];
      loading?: boolean;
      detailError?: string | null;
    };

type MapInspectorProps = {
  selection: SelectionType | null;
  onClear: () => void;
};

function formatDateTime(value?: string | null) {
  if (!value) return "Belum ada ping lokasi";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Waktu tidak valid";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function normalizeStatus(value: unknown): PersonnelStatus {
  return typeof value === "string" && value in STATUS_LABELS ? (value as PersonnelStatus) : "OFFLINE";
}

function coordinateSourceLabel(value: unknown, hasLiveLocation: boolean) {
  if (!value) return hasLiveLocation ? "-" : "Centroid wilayah";
  const labels: Record<string, string> = {
    WHATSAPP_LOCATION: "Lokasi WhatsApp",
    DEVICE_GPS: "GPS perangkat",
    MANUAL_PIN: "Pin manual",
    MANUAL_COORDINATE: "Koordinat manual",
    CORRECTED_BY_FIELD_OFFICER: "Koreksi Petugas Wilayah (Gaswil)",
    SYSTEM_DERIVED: "Hasil sistem",
  };
  return labels[String(value)] ?? String(value);
}

function formatEnum(value: unknown) {
  if (!value) return "-";
  const labels: Record<string, string> = {
    SENT_TO_OIM: "Dikirim ke OIM",
    UNDER_VERIFICATION: "Dalam Tinjauan",
    NEEDS_DEVELOPMENT: "Perlu Pengembangan",
    VERIFIED: "Disetujui",
    REJECTED: "Ditolak",
    PENDING: "Menunggu",
    APPROVED: "Disetujui",
    ACTIVE: "Aktif",
    INACTIVE: "Tidak Aktif",
  };
  if (labels[String(value)]) return labels[String(value)];
  return String(value)
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatReportDateTime(value: unknown) {
  return typeof value === "string" && value ? formatDateTime(value) : "-";
}

export function MapInspector({ selection, onClear }: MapInspectorProps) {
  const clusterStats = useMemo(() => {
    if (!selection || selection.kind !== "cluster") return null;
    const statuses: Record<string, number> = {};
    const units: Record<string, number> = {};
    let activeCount = 0;
    let offlineCount = 0;

    selection.leaves.forEach((leaf) => {
      const props = leaf.properties || {};
      const status = normalizeStatus(props.status);
      statuses[status] = (statuses[status] || 0) + 1;
      if (status === "OFFLINE") offlineCount += 1;
      else activeCount += 1;
      const unit = props.unitName || "Unit tidak diketahui";
      units[unit] = (units[unit] || 0) + 1;
    });

    const topUnit = Object.entries(units).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";
    return { total: selection.leaves.length, statuses, activeCount, offlineCount, topUnit };
  }, [selection]);

  return (
    <div className="flex h-full flex-col justify-between space-y-4">
      <Card className="no-scrollbar flex-1 overflow-y-auto border-border bg-card">
        <CardHeader className="border-border/40 border-b pb-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-heading font-semibold">
              <MapPinned className="size-4 text-primary" />
              Hasil Analisa
            </span>
            {selection && (
              <Button
                variant="ghost"
                size="xs"
                onClick={onClear}
                className="h-6 px-2 font-mono text-[10px] text-muted-foreground hover:text-foreground"
              >
                Bersihkan
              </Button>
            )}
          </CardTitle>
          <CardDescription className="text-xs">
            Analisa operasional berdasarkan objek peta yang dipilih.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-4 text-xs">
          {!selection ? (
            <div className="flex flex-col items-center justify-center space-y-2 py-10 text-center text-muted-foreground/60">
              <Compass className="size-8 stroke-[1.25] text-muted-foreground/45" />
              <p className="font-mono text-[10px] uppercase tracking-wide">Belum Ada Objek Dipilih</p>
              <p className="max-w-[200px] text-[11px]">
                Pilih penanda personel, penanda baket, atau batas wilayah pada peta untuk memuat hasil analisa.
              </p>
            </div>
          ) : selection.kind === "personnel" ? (
            <PersonnelInspector selection={selection} />
          ) : selection.kind === "report" ? (
            <ReportInspector selection={selection} />
          ) : selection.kind === "cluster" && clusterStats ? (
            <div className="space-y-3 font-mono">
              <div className="mb-2 flex items-center gap-2 border-border/20 border-b pb-2">
                <DOMAIN_VISUALS.gaswil.Icon className={`size-4 shrink-0 ${DOMAIN_VISUALS.gaswil.iconClass}`} />
                <span className="font-bold font-sans text-foreground text-sm">Ringkasan Kelompok Personel</span>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded border border-border/30 bg-secondary/15 p-2.5 text-center">
                <Metric label="Total" value={clusterStats.total} className="text-primary" />
                <Metric label="Terdeteksi" value={clusterStats.activeCount} className="text-emerald-500" />
                <Metric label="Tidak Aktif" value={clusterStats.offlineCount} className="text-muted-foreground/70" />
              </div>

              <div className="space-y-2 border-border/20 border-t pt-2">
                <span className="mb-1 block text-[9px] text-muted-foreground/60 uppercase">Distribusi Status</span>
                <div className="space-y-1 text-[10px]">
                  {Object.entries(clusterStats.statuses).map(([status, count]) => {
                    const normalized = normalizeStatus(status);
                    return (
                      <div key={status} className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="size-1.5 rounded-full"
                            style={{ backgroundColor: STATUS_COLORS[normalized] }}
                          />
                          {STATUS_LABELS[normalized]}
                        </span>
                        <strong className="font-bold text-foreground">{count} personel</strong>
                      </div>
                    );
                  })}
                </div>
              </div>

              <DataField label="Unit Kerja Terbanyak" value={clusterStats.topUnit} bordered />
            </div>
          ) : selection.kind === "area" ? (
            <AreaInspector selection={selection} />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function ReportInspector({ selection }: { selection: Extract<SelectionType, { kind: "report" }> }) {
  const properties = selection.properties;
  const urgency = String(properties.urgency || "NORMAL") as keyof typeof REPORT_URGENCY_COLORS;
  const urgencyColor = REPORT_URGENCY_COLORS[urgency] ?? REPORT_URGENCY_COLORS.NORMAL;

  return (
    <div className="space-y-3 font-mono">
      <div className="mb-2 flex items-center gap-2 border-border/20 border-b pb-2">
        <DOMAIN_VISUALS.baket.Icon className={`size-4 shrink-0 ${DOMAIN_VISUALS.baket.iconClass}`} />
        <span className="font-bold font-sans text-foreground text-sm">
          {properties.displayTitle || "Baket terpetakan"}
        </span>
      </div>

      {selection.loading && (
        <div className="flex items-center gap-2 rounded-[4px] border border-primary/25 bg-primary/5 px-2.5 py-2 text-primary">
          <LoaderCircle className="size-3.5 animate-spin" />
          <span>Memuat detail baket dari database...</span>
        </div>
      )}
      {selection.detailError && (
        <div className="rounded-[4px] border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-destructive">
          {selection.detailError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-[10.5px]">
        <DataField label="Status Baket" value={formatEnum(properties.status)} />
        <DataField
          label="Urgensi"
          value={<span style={{ color: urgencyColor }}>{REPORT_URGENCY_LABELS[urgency] ?? urgency}</span>}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-border/20 pt-2 text-[10.5px]">
        <DataField label="Kategori Baket" value={properties.reportCategoryName || "-"} breakWords />
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-border/20 pt-2 text-[10.5px]">
        <DataField label="Wilayah Kejadian" value={properties.areaName || "-"} breakWords />
        <DataField label="Waktu Pelaporan" value={formatReportDateTime(properties.reportedAt)} />
      </div>

      <div className="space-y-1 border-t border-border/20 pt-2">
        <span className="block text-[9px] uppercase text-muted-foreground/60">Informasi Baket</span>
        <p className="whitespace-pre-wrap break-words font-sans text-xs leading-5 text-foreground/90">
          {properties.normalizedContent || properties.originalContent || "Detail isi baket belum tersedia."}
        </p>
      </div>

      {properties.fieldOfficerNote ? (
        <DataField label="Catatan Petugas Wilayah (Gaswil)" value={properties.fieldOfficerNote} breakWords bordered />
      ) : null}

      <div className="grid grid-cols-2 gap-2 border-t border-border/20 pt-2 text-[10.5px]">
        <DataField label="Dibuat Oleh" value={properties.createdByName || "-"} breakWords />
        <DataField label="Jabatan" value={properties.createdByPosition || "-"} breakWords />
        <DataField label="Validasi Cakupan" value={formatEnum(properties.coverageValidationStatus)} breakWords />
        <DataField label="Status Validasi Baket" value={formatEnum(properties.verificationStatus)} breakWords />
      </div>

      <div className="grid grid-cols-4 gap-2 rounded-[4px] border border-border/40 bg-secondary/10 p-2.5 text-center">
        <Metric label="Versi" value={properties.versionNumber ?? "-"} />
        <Metric label="Sumber" value={properties.sourceCount ?? 0} />
        <Metric label="Lampiran" value={properties.attachmentCount ?? 0} />
        <Metric label="Peringatan" value={properties.alertCount ?? 0} />
      </div>

      <div className="space-y-1 border-t border-border/20 pt-2">
        <span className="block text-[9px] uppercase text-muted-foreground/60">Koordinat</span>
        <span className="block text-[10px] font-semibold text-sky-500">
          {selection.coordinates[0].toFixed(6)} E, {selection.coordinates[1].toFixed(6)} N
        </span>
      </div>
    </div>
  );
}

function PersonnelInspector({ selection }: { selection: Extract<SelectionType, { kind: "personnel" }> }) {
  const properties = selection.properties;
  const status = normalizeStatus(properties.status);
  const areaNames = Array.isArray(properties.areaNames) ? properties.areaNames.filter(Boolean).join(", ") : "";

  return (
    <div className="space-y-3 font-mono">
      <div className="mb-2 flex items-center gap-2 border-b border-border/20 pb-2">
        <User className="size-4 shrink-0 text-primary" />
        <span className="truncate font-sans text-sm font-bold text-foreground">{properties.userName || "-"}</span>
      </div>

      {selection.loading && (
        <div className="flex items-center gap-2 rounded-[4px] border border-primary/25 bg-primary/5 px-2.5 py-2 text-primary">
          <LoaderCircle className="size-3.5 animate-spin" />
          <span>Memuat detail dari database...</span>
        </div>
      )}
      {selection.detailError && (
        <div className="rounded-[4px] border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-destructive">
          {selection.detailError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-[10.5px]">
        <DataField label="Nama Pengguna" value={properties.username ? `@${properties.username}` : "-"} />
        <div>
          <span className="block text-[9px] uppercase text-muted-foreground/60">Status Lokasi</span>
          <span className="mt-0.5 flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
            <strong className="text-foreground">{STATUS_LABELS[status]}</strong>
          </span>
        </div>
      </div>

      <DataField label="Jabatan" value={properties.positionTitle || "-"} />
      <DataField label="Unit Kerja" value={properties.unitName || "-"} />

      <div className="grid grid-cols-2 gap-2 border-t border-border/20 pt-2 text-[10.5px]">
        <DataField label="Peran" value={properties.roleName || properties.positionCode || "-"} breakWords />
        <DataField label="Wilayah Tugas" value={areaNames || properties.areaName || "-"} breakWords />
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-border/20 pt-2 text-[10.5px]">
        <DataField label="Status Profil" value={properties.profileStatus || "-"} />
        <DataField
          label="Penugasan"
          value={properties.assignmentIsActive == null ? "-" : properties.assignmentIsActive ? "Aktif" : "Tidak aktif"}
        />
      </div>

      <div className="space-y-1 border-t border-border/20 pt-2">
        <span className="block text-[9px] uppercase text-muted-foreground/60">Koordinat</span>
        <span className="block text-[10px] font-semibold text-sky-500">
          {selection.coordinates[0].toFixed(6)} E, {selection.coordinates[1].toFixed(6)} N
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10.5px]">
        <DataField
          label="Sumber Koordinat"
          value={coordinateSourceLabel(properties.coordinateSource, Boolean(properties.hasLiveLocation))}
          breakWords
        />
        <DataField
          label="Akurasi GPS"
          value={properties.gpsAccuracyMeters != null ? `${properties.gpsAccuracyMeters} m` : "-"}
        />
      </div>

      <div className="space-y-1">
        <span className="block text-[9px] uppercase text-muted-foreground/60">Pembaruan Lokasi Terakhir</span>
        <span className="flex items-center gap-1 text-foreground/90">
          <Clock className="size-3 shrink-0 text-muted-foreground/60" />
          {formatDateTime(properties.capturedAt)}
        </span>
      </div>
    </div>
  );
}

function AreaInspector({ selection }: { selection: Extract<SelectionType, { kind: "area" }> }) {
  return (
    <div className="space-y-3 font-mono">
      <div className="mb-2 flex items-center gap-2 border-b border-border/20 pb-2">
        <MapPinned className="size-4 shrink-0 text-emerald-500" />
        <span className="truncate font-sans text-sm font-bold text-foreground">
          {selection.properties.name || "Batas Wilayah"}
        </span>
      </div>

      {selection.loading && (
        <div className="flex items-center gap-2 rounded-[4px] border border-primary/25 bg-primary/5 px-2.5 py-2 text-primary">
          <LoaderCircle className="size-3.5 animate-spin" />
          <span>Memuat ringkasan wilayah...</span>
        </div>
      )}
      {selection.detailError && (
        <div className="rounded-[4px] border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-destructive">
          {selection.detailError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-[10.5px]">
        <DataField label="Provinsi" value={selection.properties.provinceName || selection.properties.name || "-"} />
        <DataField label="Kabupaten" value={selection.properties.regencyName || "-"} />
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-border/20 pt-2">
        <AreaMetric
          icon={DOMAIN_VISUALS.gaswil.Icon}
          label="Personel"
          value={selection.summary?.personnelCount ?? 0}
          className={DOMAIN_VISUALS.gaswil.iconClass}
        />
        <AreaMetric
          icon={DOMAIN_VISUALS.baket.Icon}
          label="Baket"
          value={selection.summary?.reportsCount ?? 0}
          className={DOMAIN_VISUALS.baket.iconClass}
        />
        <AreaMetric
          icon={AlertTriangle}
          label="Peringatan"
          value={selection.summary?.alertsCount ?? 0}
          className="text-amber-500"
        />
        <AreaMetric
          icon={CheckCircle2}
          label="Unit"
          value={selection.summary?.unitsCount ?? 0}
          className="text-sky-500"
        />
        <AreaMetric
          icon={ShieldAlert}
          label="Insiden"
          value={selection.summary?.emergenciesCount ?? 0}
          className="text-destructive"
        />
      </div>
    </div>
  );
}

function DataField({
  label,
  value,
  breakWords = false,
  bordered = false,
}: {
  label: string;
  value: React.ReactNode;
  breakWords?: boolean;
  bordered?: boolean;
}) {
  return (
    <div className={bordered ? "border-t border-border/20 pt-2" : undefined}>
      <span className="block text-[9px] uppercase text-muted-foreground/60">{label}</span>
      <span
        className={`block font-sans font-medium leading-tight text-foreground/90 ${breakWords ? "break-words" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function Metric({
  label,
  value,
  className = "text-foreground",
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div>
      <span className="block text-[8px] uppercase text-muted-foreground/50">{label}</span>
      <span className={`text-lg font-bold ${className}`}>{value}</span>
    </div>
  );
}

function AreaMetric({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`size-3.5 ${className}`} />
      <div>
        <span className="block text-[8px] uppercase leading-none text-muted-foreground/50">{label}</span>
        <strong className="text-xs text-foreground">{value}</strong>
      </div>
    </div>
  );
}

export default MapInspector;
