"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import {
  Activity,
  BarChart3,
  ClipboardList,
  Cpu,
  Eye,
  type LucideIcon,
  MapPin,
  ShieldCheck,
  Signal,
  User,
} from "lucide-react";

import { ViewModeToggle } from "@/app/(main)/dashboard/_components/view-mode-toggle";
import { GaswilEntityLink } from "@/components/domain/gaswil-entity-link";
import { JaringIdentitySummary } from "@/components/domain/jaring-identity-summary";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { type ColumnOption, ColumnVisibilityToggle } from "@/components/ui/column-visibility-toggle";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { resolveJaringIdentity } from "@/lib/domain/jaring-identity";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";
import { DOMAIN_VISUALS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

import type { PersonnelAssignment, PersonnelDetail, PersonnelJaringItem } from "./executive-personnel-types";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function areaText(assignment?: PersonnelAssignment | null) {
  const area = assignment?.areas.find((item) => item.isPrimary) ?? assignment?.areas[0];
  return area ? `${areaLevelLabel(area.level)} ${area.name}` : "-";
}

function areaLevelLabel(level?: string | null) {
  const labels: Record<string, string> = {
    COUNTRY: "Negara",
    PROVINCE: "Provinsi",
    REGENCY: "Kabupaten",
    CITY: "Kota",
    DISTRICT: "Kecamatan",
    VILLAGE: "Desa",
    URBAN_VILLAGE: "Kelurahan",
  };

  return level ? (labels[level] ?? level) : "Wilayah";
}

function activityActionLabel(action: string) {
  const labels: Record<string, string> = {
    "POSITION.CREATE": "Jabatan dibuat",
    "POSITION.UPDATE": "Jabatan diperbarui",
    "POSITION.DELETE": "Jabatan dihapus",
    "USER.PROVISION": "Pengguna diprovision",
    "USER.UPDATE": "Profil pengguna diperbarui",
    "USER.ACTIVATE": "Pengguna diaktifkan",
    "USER.SUSPEND": "Pengguna ditangguhkan",
    "USER.ARCHIVE": "Pengguna diarsipkan",
    "JARING_OCCUPATION.CREATE": "Master pekerjaan jaring dibuat",
    "JARING_OCCUPATION.UPDATE": "Master pekerjaan jaring diperbarui",
    "JARING_OCCUPATION.DELETE": "Master pekerjaan jaring dihapus",
    "auth.session.network_resolved": "Lokasi jaringan sesi dikenali",
  };

  if (labels[action]) {
    return labels[action];
  }

  return action
    .replace(/[_./-]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function entityTypeLabel(entityType?: string | null) {
  const labels: Record<string, string> = {
    Position: "Jabatan",
    UserProfile: "Profil pengguna",
    User: "Akun auth",
    Jaring: "Jaring",
    JaringOccupation: "Master pekerjaan jaring",
    Session: "Sesi",
  };

  return entityType ? (labels[entityType] ?? entityType.replace(/([a-z])([A-Z])/g, "$1 $2")) : "Aktivitas";
}

/* -------------------------------------------------------------------------- */
/* TACTICAL BACKGROUND ANIMATIONS                                             */
/* -------------------------------------------------------------------------- */

function TacticalBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0" aria-hidden="true">
      {/* 1. Tactical Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.05] dark:opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, color-mix(in srgb, var(--dc-primary) 24%, transparent) 1px, transparent 1px),
            linear-gradient(to bottom, color-mix(in srgb, var(--dc-primary) 24%, transparent) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
        }}
      />

      {/* 2. Circuit Pattern Overlay */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.03] dark:opacity-[0.015] text-[var(--dc-primary)]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>Circuit Overlay Pattern</title>
        <defs>
          <pattern id="circuit-grid" width="128" height="128" patternUnits="userSpaceOnUse">
            <path
              d="M 0 64 L 32 64 L 48 48 L 80 48 L 96 64 L 128 64 M 64 0 L 64 32 L 48 48 M 64 80 L 64 128 M 48 48 L 48 80 M 80 48 L 80 96 L 96 112"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
            <circle cx="48" cy="48" r="2" fill="currentColor" />
            <circle cx="80" cy="48" r="2" fill="currentColor" />
            <circle cx="96" cy="64" r="2" fill="currentColor" />
            <circle cx="64" cy="32" r="2" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#circuit-grid)" />
      </svg>

      {/* 3. Subtle Digital Noise Overlay */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <title>Digital Noise Effect</title>
        <filter id="noise-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.04 0" />
        </filter>
      </svg>
      <div
        className="absolute inset-0 opacity-[0.4] dark:opacity-[0.35] pointer-events-none"
        style={{ filter: "url(#noise-filter)" }}
      />

      {/* 4. Radial Ambient Gradients */}
      <div className="absolute -top-[30%] -left-[10%] w-[60%] h-[70%] rounded-full bg-[var(--dc-primary)]/4 dark:bg-[var(--dc-primary)]/5 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-[20%] -right-[5%] w-[50%] h-[60%] rounded-full bg-[var(--dc-success)]/3 blur-[120px] pointer-events-none" />
    </div>
  );
}

function getJaringStatusBadge(rawStatus?: string | null) {
  const status = (rawStatus ?? "APPROVED").toUpperCase();
  if (status === "APPROVED" || status === "VERIFIED" || status === "ACTIVE") {
    return {
      label: "Terverifikasi",
      className:
        "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20",
    };
  }
  if (status === "PENDING" || status === "WAITING") {
    return {
      label: "Belum Terverifikasi",
      className: "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400 dark:bg-sky-950/20",
    };
  }
  if (status === "REJECTED") {
    return {
      label: "Ditolak",
      className: "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 dark:bg-rose-950/20",
    };
  }
  return {
    label: rawStatus ?? "Terverifikasi",
    className: "border-slate-500/40 bg-slate-500/10 text-slate-600 dark:text-slate-400 dark:bg-slate-900/20",
  };
}

function getJaringKinerjaBadge(rawStatus?: string | null) {
  const status = (rawStatus ?? "ACTIVE").toUpperCase();
  if (status === "ACTIVE") {
    return {
      label: DOMAIN_TERMS.jaringActive90Days,
      className:
        "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20",
      dotColor: "bg-emerald-500 animate-pulse",
    };
  }
  if (status === "TRANSFERRED") {
    return {
      label: "Dimutasi",
      className: "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400 dark:bg-sky-950/20",
      dotColor: "bg-sky-500",
    };
  }
  if (status === "ARCHIVED") {
    return {
      label: "Diarsipkan",
      className: "border-slate-500/40 bg-slate-500/10 text-slate-500 dark:text-slate-400 dark:bg-slate-900/20",
      dotColor: "bg-slate-500",
    };
  }
  return {
    label: DOMAIN_TERMS.jaringInactive90Days,
    className: "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 dark:bg-rose-950/20",
    dotColor: "bg-rose-500",
  };
}

function getPhotoUrl(jaring: PersonnelJaringItem) {
  const fileId = jaring.profilePhotoFileId ?? jaring.profilePhotoFile?.id;
  return fileId ? `/api/files/${fileId}` : null;
}

function percentage(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function formatPercent(value: number) {
  return `${value}%`;
}

function isJaringActive(jaring: PersonnelJaringItem) {
  if (jaring.lastReportAt) {
    const lastReportTime = new Date(jaring.lastReportAt).getTime();
    if (!Number.isNaN(lastReportTime)) {
      return lastReportTime >= Date.now() - 90 * 24 * 60 * 60 * 1000;
    }
  }
  return false;
}

function isJaringVerified(jaring: PersonnelJaringItem) {
  const status = (jaring.registrationStatus ?? jaring.status ?? "").toUpperCase();
  return status === "APPROVED" || status === "VERIFIED";
}

function profileStatusLabel(status?: string | null, isActive?: boolean) {
  if (!isActive) return "Tidak Aktif";

  const labels: Record<string, string> = {
    ACTIVE: "Aktif",
    INACTIVE: "Tidak Aktif",
    SUSPENDED: "Ditangguhkan",
    ARCHIVED: "Diarsipkan",
  };

  return status ? (labels[status.toUpperCase()] ?? status) : "Aktif";
}

function reportStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    DRAFT: "Draf Baket",
    SUBMITTED: "Dikirim",
    VERIFIED: "Terverifikasi",
    VALIDATED: DOMAIN_TERMS.validatedBaket,
    REJECTED: "Ditolak",
    NEEDS_REVISION: "Perlu Revisi",
  };

  return status ? (labels[status.toUpperCase()] ?? status.replace(/[_-]+/g, " ")) : "-";
}

function latestAssignmentLocation(assignments: PersonnelAssignment[]) {
  return assignments.find((assignment) => assignment.lastLocation)?.lastLocation ?? null;
}

/* -------------------------------------------------------------------------- */
/* MAIN EXPORT CLIENT COMPONENT                                               */
/* -------------------------------------------------------------------------- */

const PERSONEL_JARING_COLUMNS: ColumnOption[] = [
  { id: "foto", label: DOMAIN_TERMS.jaringAvatar },
  { id: "namaJaring", label: DOMAIN_TERMS.jaringName, alwaysVisible: true },
  { id: "kodeJaring", label: DOMAIN_TERMS.jaringCode },
  { id: "gaswil", label: DOMAIN_TERMS.fieldOfficer },
  { id: "wilayahPenempatan", label: DOMAIN_TERMS.jaringPlacementArea },
  { id: "whatsapp", label: DOMAIN_TERMS.jaringWhatsApp },
  { id: "pekerjaan", label: "Pekerjaan" },
  { id: "kinerja", label: DOMAIN_TERMS.jaringActivity90Days },
  { id: "status", label: "Status Verifikasi" },
  { id: "aksi", label: "Aksi" },
];

export function ExecutivePersonnelDetailClient({
  detail,
  backHref = "/dashboard/personel-lapangan",
}: {
  detail: PersonnelDetail;
  backHref?: string;
}) {
  const profile = detail.profile;
  const jaringList = detail.jaring ?? [];
  const baketCount = detail.summary?.baketCount ?? detail.reports.length;
  const [jaringViewMode, setJaringViewMode] = useState<"card" | "table">("card");
  const [jaringVisibleColumns, setJaringVisibleColumns] = useState<Record<string, boolean>>({});
  const isJaringColVisible = (id: string) => jaringVisibleColumns[id] !== false;
  const [jaringKelurahanFilter, setJaringKelurahanFilter] = useState("ALL");

  const jaringKelurahanOptions = useMemo(() => {
    const set = new Set<string>();
    jaringList.forEach((jaring) => {
      const displayArea =
        jaring.areaNames && jaring.areaNames.length > 0
          ? jaring.areaNames.join(", ")
          : (jaring.areaCoverages ?? [])
              .map((cov) => cov.area?.name)
              .filter(Boolean)
              .join(", ");

      const identity = resolveJaringIdentity({
        id: jaring.id,
        villageName: displayArea || "Belum diset",
      });

      if (identity.placementArea && identity.placementArea !== "Belum diset") {
        identity.placementArea.split(",").forEach((name) => {
          const trimmed = name.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });
    return Array.from(set).sort();
  }, [jaringList]);

  const filteredJaringList = useMemo(() => {
    if (jaringKelurahanFilter === "ALL") return jaringList;
    return jaringList.filter((jaring) => {
      const displayArea =
        jaring.areaNames && jaring.areaNames.length > 0
          ? jaring.areaNames.join(", ")
          : (jaring.areaCoverages ?? [])
              .map((cov) => cov.area?.name)
              .filter(Boolean)
              .join(", ");

      const identity = resolveJaringIdentity({
        id: jaring.id,
        villageName: displayArea || "Belum diset",
      });

      return identity.placementArea.toLowerCase().includes(jaringKelurahanFilter.toLowerCase());
    });
  }, [jaringList, jaringKelurahanFilter]);
  const jaringAreaSubtitle =
    jaringKelurahanFilter === "ALL"
      ? `Jumlah Jaring semua ${DOMAIN_TERMS.jaringPlacementArea}`
      : `Jumlah Jaring pada ${DOMAIN_TERMS.jaringPlacementArea} ${jaringKelurahanFilter}`;
  const [activityViewMode, setActivityViewMode] = useState<"card" | "table">("card");
  const [activityPeriodFrom, setActivityPeriodFrom] = useState("");
  const [activityPeriodTo, setActivityPeriodTo] = useState("");
  const [activityPage, setActivityPage] = useState(1);
  const [activityLimit, setActivityLimit] = useState(10);

  const filteredActivityLogs = useMemo(() => {
    const fromTime = activityPeriodFrom ? new Date(`${activityPeriodFrom}T00:00:00`).getTime() : null;
    const toTime = activityPeriodTo ? new Date(`${activityPeriodTo}T23:59:59.999`).getTime() : null;

    return detail.activityLogs.filter((log) => {
      const createdAt = new Date(log.createdAt).getTime();
      return (fromTime === null || createdAt >= fromTime) && (toTime === null || createdAt <= toTime);
    });
  }, [activityPeriodFrom, activityPeriodTo, detail.activityLogs]);
  const activityTotalPages = Math.max(1, Math.ceil(filteredActivityLogs.length / activityLimit));
  const safeActivityPage = Math.min(activityPage, activityTotalPages);
  const paginatedActivityLogs = filteredActivityLogs.slice(
    (safeActivityPage - 1) * activityLimit,
    safeActivityPage * activityLimit,
  );
  const activeAssignmentCount = detail.assignments.filter((assignment) => assignment.isActive).length;
  const historicalAssignmentCount = Math.max(0, detail.assignments.length - activeAssignmentCount);
  const activeAreaCount = detail.summary?.activeAreaCount ?? detail.currentAssignment?.areas.length ?? 0;
  const activeJaringCount = jaringList.filter(isJaringActive).length;
  const inactiveJaringCount = Math.max(0, jaringList.length - activeJaringCount);
  const verifiedJaringCount = jaringList.filter(isJaringVerified).length;
  const unverifiedJaringCount = Math.max(0, jaringList.length - verifiedJaringCount);
  const visibleBaketCount = detail.reports.length;
  const hiddenBaketCount = Math.max(0, baketCount - visibleBaketCount);
  const latestLocation = detail.currentAssignment?.lastLocation ?? latestAssignmentLocation(detail.assignments);
  const assignmentWithLocationCount = detail.assignments.filter((assignment) => assignment.lastLocation).length;
  const assignmentWithoutLocationCount = Math.max(0, detail.assignments.length - assignmentWithLocationCount);
  const summaryMetrics = [
    {
      label: DOMAIN_TERMS.jaring,
      value: jaringList.length,
      helper: `${formatPercent(percentage(activeJaringCount, jaringList.length))} aktif`,
      icon: DOMAIN_VISUALS.jaring.Icon,
      tone: DOMAIN_VISUALS.jaring.iconClass,
    },
    {
      label: DOMAIN_TERMS.baket,
      value: baketCount,
      helper: `${visibleBaketCount} data ditampilkan`,
      icon: DOMAIN_VISUALS.baket.Icon,
      tone: DOMAIN_VISUALS.baket.iconClass,
    },
    {
      label: DOMAIN_TERMS.assignmentArea,
      value: activeAreaCount,
      helper: `${activeAssignmentCount} penugasan aktif`,
      icon: MapPin,
      tone: "text-amber-500",
    },
    {
      label: "Status Petugas Wilayah",
      value: profileStatusLabel(profile.status, profile.isActive),
      helper: latestLocation ? `Sinyal ${formatDate(latestLocation.capturedAt)}` : "Belum ada sinyal lokasi",
      icon: Activity,
      tone: profile.isActive ? "text-emerald-500" : "text-rose-500",
    },
  ];
  const statisticPairs = [
    {
      title: DOMAIN_TERMS.jaringActivity90Days,
      description: `${activeJaringCount} aktif 90 hari dari ${jaringList.length} Jaring`,
      primaryLabel: DOMAIN_TERMS.jaringActive90Days,
      primaryValue: activeJaringCount,
      secondaryLabel: DOMAIN_TERMS.jaringInactive90Days,
      secondaryValue: inactiveJaringCount,
      total: jaringList.length,
      icon: Signal,
      primaryClassName: "bg-emerald-500",
      secondaryClassName: "bg-rose-500",
    },
    {
      title: "Status Verifikasi Jaring",
      description: `${verifiedJaringCount} terverifikasi dari ${jaringList.length} Jaring`,
      primaryLabel: "Terverifikasi",
      primaryValue: verifiedJaringCount,
      secondaryLabel: "Belum terverifikasi",
      secondaryValue: unverifiedJaringCount,
      total: jaringList.length,
      icon: ShieldCheck,
      primaryClassName: "bg-sky-500",
      secondaryClassName: "bg-amber-500",
    },
    {
      title: "Cakupan Penugasan",
      description: `${activeAssignmentCount} penugasan aktif dari ${detail.assignments.length} penugasan`,
      primaryLabel: "Penugasan Aktif",
      primaryValue: activeAssignmentCount,
      secondaryLabel: "Riwayat Penugasan",
      secondaryValue: historicalAssignmentCount,
      total: detail.assignments.length,
      icon: ClipboardList,
      primaryClassName: "bg-violet-500",
      secondaryClassName: "bg-slate-400",
    },
    {
      title: "Sinyal Lokasi",
      description: `${assignmentWithLocationCount} penugasan memiliki lokasi terakhir`,
      primaryLabel: "Ada Lokasi",
      primaryValue: assignmentWithLocationCount,
      secondaryLabel: "Tanpa Lokasi",
      secondaryValue: assignmentWithoutLocationCount,
      total: detail.assignments.length,
      icon: MapPin,
      primaryClassName: "bg-cyan-500",
      secondaryClassName: "bg-slate-400",
    },
  ];

  return (
    <main className="relative min-h-screen space-y-6 p-6">
      <TacticalBackground />

      <div className="relative z-10 space-y-6 text-foreground">
        <header className="relative overflow-hidden border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/85 p-5 dark:border-slate-800 dark:bg-[#080d14]/85">
          <div className="absolute top-0 left-0 h-full w-1 bg-[var(--dc-primary)]" />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <BackButton href={backHref} />
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] px-2 py-1 font-semibold text-[10px] text-[var(--dc-text-secondary)] uppercase tracking-wider">
                    Detail {DOMAIN_TERMS.fieldOfficer}
                  </span>
                  <span
                    className={cn(
                      "border px-2 py-1 font-semibold text-[10px] uppercase tracking-wider",
                      profile.isActive
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400",
                    )}
                  >
                    {profileStatusLabel(profile.status, profile.isActive)}
                  </span>
                </div>
                <h1 className="font-bold text-2xl tracking-tight text-foreground">
                  {profile.fullName ?? profile.username ?? profile.email}
                </h1>
                <p className="max-w-4xl text-sm text-[var(--dc-text-secondary)]">
                  {detail.currentAssignment?.title ?? "Belum ada jabatan aktif"} -{" "}
                  {detail.currentAssignment?.unit.name ?? "Unit belum tercatat"}
                </p>
              </div>
            </div>
            <dl className="grid min-w-0 gap-3 sm:grid-cols-2 lg:min-w-[360px]">
              <Field label="Email" value={profile.email} />
              <Field label="Nomor Telepon" value={profile.phone ?? "Belum tersedia"} />
              <Field label={DOMAIN_TERMS.assignmentArea} value={areaText(detail.currentAssignment)} />
              <Field
                label="Lokasi Terakhir"
                value={
                  latestLocation
                    ? `${latestLocation.area?.name ?? "Area belum terdeteksi"} - ${formatDate(latestLocation.capturedAt)}`
                    : "Belum tersedia"
                }
              />
            </dl>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryMetrics.map((metric) => (
            <div
              key={metric.label}
              className="flex min-h-28 items-center justify-between gap-3 border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80 p-4 dark:border-slate-800 dark:bg-[#080d14]/80"
            >
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--dc-text-muted)]">
                  {metric.label}
                </p>
                <p className="mt-2 truncate font-mono font-bold text-2xl text-[var(--dc-text-primary)]">
                  {metric.value}
                </p>
                <p className="mt-1 text-[11px] text-[var(--dc-text-secondary)]">{metric.helper}</p>
              </div>
              <metric.icon className={cn("size-5 shrink-0", metric.tone)} aria-hidden="true" />
            </div>
          ))}
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          {statisticPairs.map((item) => (
            <StatisticPairCard key={item.title} {...item} />
          ))}
        </section>

        <Tabs defaultValue="profil" className="space-y-4">
          <TabsList className="scrollbar-none flex h-11 w-full justify-start overflow-x-auto rounded-none border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/50 p-1 dark:border-slate-800 dark:bg-[#080d14]/60">
            <TabsTrigger
              value="profil"
              className="rounded-none px-6 font-mono text-[10px] uppercase tracking-wider border border-transparent data-[state=active]:border-[var(--dc-border)] data-[state=active]:bg-[var(--dc-primary-soft)] data-[state=active]:text-[var(--dc-primary)] transition-all text-[var(--dc-text-muted)] hover:text-foreground cursor-pointer dark:data-[state=active]:border-slate-800"
            >
              <User className="size-3.5 mr-2 text-[var(--dc-primary)]" />
              Profil
            </TabsTrigger>
            <TabsTrigger
              value="penugasan"
              className="rounded-none px-6 font-mono text-[10px] uppercase tracking-wider border border-transparent data-[state=active]:border-[var(--dc-border)] data-[state=active]:bg-[var(--dc-primary-soft)] data-[state=active]:text-[var(--dc-primary)] transition-all text-[var(--dc-text-muted)] hover:text-foreground cursor-pointer dark:data-[state=active]:border-slate-800"
            >
              <ClipboardList className="size-3.5 mr-2 text-[var(--dc-primary)]" />
              Penugasan
            </TabsTrigger>
            <TabsTrigger
              value="jaring"
              className="rounded-none px-6 font-mono text-[10px] uppercase tracking-wider border border-transparent data-[state=active]:border-[var(--dc-border)] data-[state=active]:bg-[var(--dc-primary-soft)] data-[state=active]:text-[var(--dc-primary)] transition-all text-[var(--dc-text-muted)] hover:text-foreground cursor-pointer dark:data-[state=active]:border-slate-800"
            >
              <DOMAIN_VISUALS.jaring.Icon className={`size-3.5 mr-2 ${DOMAIN_VISUALS.jaring.iconClass}`} />
              Jaring ({jaringList.length})
            </TabsTrigger>
            <TabsTrigger
              value="aktivitas"
              className="rounded-none px-6 font-mono text-[10px] uppercase tracking-wider border border-transparent data-[state=active]:border-[var(--dc-border)] data-[state=active]:bg-[var(--dc-primary-soft)] data-[state=active]:text-[var(--dc-primary)] transition-all text-[var(--dc-text-muted)] hover:text-foreground cursor-pointer dark:data-[state=active]:border-slate-800"
            >
              <Activity className="size-3.5 mr-2 text-[var(--dc-primary)]" />
              Aktivitas
            </TabsTrigger>
            <TabsTrigger
              value="baket"
              className="rounded-none px-6 font-mono text-[10px] uppercase tracking-wider border border-transparent data-[state=active]:border-[var(--dc-border)] data-[state=active]:bg-[var(--dc-primary-soft)] data-[state=active]:text-[var(--dc-primary)] transition-all text-[var(--dc-text-muted)] hover:text-foreground cursor-pointer dark:data-[state=active]:border-slate-800"
            >
              <DOMAIN_VISUALS.baket.Icon className={`size-3.5 mr-2 ${DOMAIN_VISUALS.baket.iconClass}`} />
              Baket ({baketCount})
            </TabsTrigger>
            <TabsTrigger
              value="kpi"
              className="rounded-none px-6 font-mono text-[10px] uppercase tracking-wider border border-transparent data-[state=active]:border-[var(--dc-border)] data-[state=active]:bg-[var(--dc-primary-soft)] data-[state=active]:text-[var(--dc-primary)] transition-all text-[var(--dc-text-muted)] hover:text-foreground cursor-pointer dark:data-[state=active]:border-slate-800"
            >
              <BarChart3 className="size-3.5 mr-2 text-[var(--dc-primary)]" />
              Statistik
            </TabsTrigger>
          </TabsList>

          {/* Profil Node View */}
          <TabsContent value="profil" className="outline-none">
            <section className="grid gap-4 xl:grid-cols-2">
              <InfoPanel
                title="Identitas Petugas"
                items={[
                  ["Nama", profile.fullName ?? "-"],
                  ["Username", profile.username ?? "-"],
                  ["Email", profile.email],
                  ["Nomor Telepon", profile.phone ?? "Belum tersedia"],
                  ["Status Petugas Wilayah", profileStatusLabel(profile.status, profile.isActive)],
                ]}
              />
              <InfoPanel
                title="Konteks Penugasan"
                items={[
                  ["Jabatan Aktif", detail.currentAssignment?.title ?? "Belum ada jabatan aktif"],
                  ["Unit", detail.currentAssignment?.unit.name ?? "Unit belum tercatat"],
                  [DOMAIN_TERMS.assignmentArea, areaText(detail.currentAssignment)],
                  ["Mulai Penugasan", formatDate(detail.currentAssignment?.validFrom)],
                  ["Akhir Penugasan", formatDate(detail.currentAssignment?.validUntil)],
                ]}
              />
            </section>
          </TabsContent>

          {/* Penugasan Node View */}
          <TabsContent value="penugasan" className="space-y-4 outline-none">
            {detail.assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="relative border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80 p-5 rounded-none overflow-hidden group select-none dark:border-slate-800 dark:bg-[#080d14]/80"
              >
                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[var(--dc-border-subtle)] dark:border-slate-700 group-hover:border-[var(--dc-primary)]/45 transition-colors" />
                <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[var(--dc-border-subtle)] dark:border-slate-700 group-hover:border-[var(--dc-primary)]/45 transition-colors" />

                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between border-b border-[var(--dc-border-subtle)] pb-3 dark:border-slate-900/60">
                  <div>
                    <h2 className="font-mono text-sm font-bold text-[var(--dc-text-primary)]">{assignment.title}</h2>
                    <p className="text-[10px] font-mono text-[var(--dc-text-muted)] mt-1">
                      {assignment.unit.name} - {assignment.seatCode}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "px-2 py-0.5 border text-[9px] font-mono tracking-wider font-semibold rounded-none uppercase",
                      assignment.isActive
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20"
                        : "border-slate-500/40 bg-slate-500/10 text-slate-500 dark:text-slate-400 dark:bg-slate-900/20",
                    )}
                  >
                    {assignment.isActive ? "AKTIF" : "RIWAYAT"}
                  </span>
                </div>
                <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                  <Field label={DOMAIN_TERMS.assignmentArea} value={areaText(assignment)} />
                  <Field label="Mulai" value={formatDate(assignment.validFrom)} />
                  <Field label="Selesai" value={formatDate(assignment.validUntil)} />
                </dl>
              </div>
            ))}
            {!detail.assignments.length ? <EmptyState title="Belum ada penugasan" /> : null}
          </TabsContent>

          {/* Jaring Node View */}
          <TabsContent value="jaring" className="space-y-4 outline-none">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80 p-3.5 dark:border-slate-800 dark:bg-[#080d14]/80">
              <div className="flex flex-wrap items-center gap-3">
                <div className="grid gap-0.5">
                  <span className="font-mono text-xs font-bold text-[var(--dc-text-primary)] uppercase tracking-wider">
                    Daftar Jaring ({filteredJaringList.length})
                  </span>
                  <span className="text-xs font-medium text-foreground">{jaringAreaSubtitle}</span>
                </div>
                {jaringKelurahanOptions.length > 0 && (
                  <NativeSelect
                    aria-label={`Filter ${DOMAIN_TERMS.jaringPlacementArea}`}
                    value={jaringKelurahanFilter}
                    onChange={(e) => setJaringKelurahanFilter(e.target.value)}
                    className="h-8 text-xs border-slate-200 dark:border-white/10 max-w-[200px]"
                  >
                    <option value="ALL">Semua {DOMAIN_TERMS.jaringPlacementArea}</option>
                    {jaringKelurahanOptions.map((kelName) => (
                      <option key={kelName} value={kelName}>
                        {kelName}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </div>
              <div className="flex items-center gap-2">
                <ColumnVisibilityToggle
                  columns={PERSONEL_JARING_COLUMNS}
                  visibleColumns={jaringVisibleColumns}
                  onChange={setJaringVisibleColumns}
                />
                <ViewModeToggle value={jaringViewMode} onValueChange={setJaringViewMode} />
              </div>
            </div>

            {jaringViewMode === "card" ? (
              filteredJaringList.map((jaring) => {
                const photoUrl = getPhotoUrl(jaring);
                const displayName = jaring.fullName ?? jaring.aliasName ?? "Tanpa Nama";
                const statusBadge = getJaringStatusBadge(jaring.registrationStatus ?? jaring.status);
                const caretakerAssignment = jaring.caretakerAssignments?.[0]?.fieldOfficerAssignment;
                const gaswilName = caretakerAssignment?.userProfile?.fullName ?? detail.profile.fullName;

                return (
                  <div
                    key={jaring.id}
                    className="relative border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80 p-5 rounded-none overflow-hidden group select-none dark:border-slate-800 dark:bg-[#080d14]/80 hover:border-[var(--dc-primary)]/40 transition-all"
                  >
                    <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[var(--dc-border-subtle)] dark:border-slate-700 group-hover:border-[var(--dc-primary)]/45 transition-colors" />
                    <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[var(--dc-border-subtle)] dark:border-slate-700 group-hover:border-[var(--dc-primary)]/45 transition-colors" />

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-[var(--dc-border-subtle)] pb-3.5 dark:border-slate-900/60">
                      <div className="flex items-center gap-3">
                        {/* Foto Profil */}
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-none border border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-900 flex items-center justify-center">
                          {photoUrl ? (
                            <img src={photoUrl} alt={displayName} className="size-full object-cover" />
                          ) : (
                            <User className="size-6 text-slate-400 dark:text-slate-600" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[var(--dc-primary)] uppercase tracking-wider">
                              {jaring.aliasName || jaring.fullName || jaring.id}
                            </span>
                            <h2 className="font-mono text-sm font-bold text-[var(--dc-text-primary)]">{displayName}</h2>
                          </div>
                          <p className="text-[10px] font-mono text-[var(--dc-text-muted)] mt-1">
                            {jaring.occupation?.name ?? "Pekerjaan belum diisi"}{" "}
                            {jaring.whatsappNumber ? ` - ${jaring.whatsappNumber}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "px-2 py-0.5 border text-[9px] font-mono tracking-wider font-semibold rounded-none uppercase whitespace-nowrap",
                            statusBadge.className,
                          )}
                        >
                          {statusBadge.label}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="h-8 px-2.5 text-xs rounded-lg gap-1.5 font-medium border-sky-500/30 text-sky-600 hover:bg-sky-500/10 dark:text-[#38BDF8]"
                        >
                          <Link href={`/dashboard/daftar-jaring/${jaring.id}`}>
                            <Eye className="size-3.5" />
                            Lihat Detail
                          </Link>
                        </Button>
                      </div>
                    </div>

                    <JaringIdentitySummary
                      source={{
                        id: jaring.id,
                        fullName: jaring.fullName,
                        aliasName: jaring.aliasName,
                        whatsappNumber: jaring.whatsappNumber,
                        profilePhotoFileId: jaring.profilePhotoFileId ?? jaring.profilePhotoFile?.id,
                        gaswilName,
                        gaswilAssignmentId: caretakerAssignment?.id ?? detail.currentAssignment?.id,
                        gaswilUserProfileId:
                          caretakerAssignment?.userProfile?.id ??
                          caretakerAssignment?.userProfileId ??
                          detail.profile.id,
                        villageName:
                          jaring.areaNames && jaring.areaNames.length > 0
                            ? jaring.areaNames.join(", ")
                            : (jaring.areaCoverages ?? [])
                                .map((cov) => cov.area?.name)
                                .filter(Boolean)
                                .join(", ") || "Belum diset",
                      }}
                      className="mt-4"
                    />

                    <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                      <Field label="Pekerjaan" value={jaring.occupation?.name ?? "Belum tersedia"} />
                      <Field label="Terdaftar" value={formatDate(jaring.registeredAt ?? jaring.createdAt)} />
                      <Field
                        label="Laporan Terakhir"
                        value={jaring.lastReportAt ? formatDate(jaring.lastReportAt) : "Belum pernah melapor"}
                      />
                      <Field
                        label={DOMAIN_TERMS.jaringActivity90Days}
                        value={isJaringActive(jaring) ? DOMAIN_TERMS.jaringActive90Days : DOMAIN_TERMS.jaringInactive90Days}
                      />
                    </dl>
                  </div>
                );
              })
            ) : (
              <div className="w-full overflow-x-auto select-none border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80 dark:border-slate-800 dark:bg-[#080d14]/80">
                <Table className="w-full min-w-[1100px]">
                  <TableHeader>
                    <TableRow className="border-b border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] dark:border-slate-800 dark:bg-slate-950/80">
                      {isJaringColVisible("foto") && (
                        <TableHead className="w-12 text-center font-mono text-[10px] uppercase tracking-wider text-[var(--dc-text-secondary)]">
                          {DOMAIN_TERMS.jaringAvatar}
                        </TableHead>
                      )}
                      {isJaringColVisible("namaJaring") && (
                        <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[var(--dc-text-secondary)]">
                          {DOMAIN_TERMS.jaringName}
                        </TableHead>
                      )}
                      {isJaringColVisible("kodeJaring") && (
                        <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[var(--dc-text-secondary)]">
                          {DOMAIN_TERMS.jaringCode}
                        </TableHead>
                      )}
                      {isJaringColVisible("gaswil") && (
                        <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[var(--dc-text-secondary)]">
                          {DOMAIN_TERMS.fieldOfficer}
                        </TableHead>
                      )}
                      {isJaringColVisible("wilayahPenempatan") && (
                        <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[var(--dc-text-secondary)]">
                          {DOMAIN_TERMS.jaringPlacementArea}
                        </TableHead>
                      )}
                      {isJaringColVisible("whatsapp") && (
                        <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[var(--dc-text-secondary)]">
                          {DOMAIN_TERMS.jaringWhatsApp}
                        </TableHead>
                      )}
                      {isJaringColVisible("pekerjaan") && (
                        <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[var(--dc-text-secondary)]">
                          Pekerjaan
                        </TableHead>
                      )}
                      {isJaringColVisible("kinerja") && (
                        <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[var(--dc-text-secondary)] text-center">
                          {DOMAIN_TERMS.jaringActivity90Days}
                        </TableHead>
                      )}
                      {isJaringColVisible("status") && (
                        <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[var(--dc-text-secondary)] text-center">
                          Status Verifikasi
                        </TableHead>
                      )}
                      {isJaringColVisible("aksi") && (
                        <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[var(--dc-text-secondary)] text-right">
                          Aksi
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJaringList.map((jaring) => {
                      const photoUrl = getPhotoUrl(jaring);
                      const areas = (jaring.areaCoverages ?? []).map((cov) => cov.area?.name).filter(Boolean);
                      const displayArea =
                        jaring.areaNames && jaring.areaNames.length > 0
                          ? jaring.areaNames.join(", ")
                          : areas.length > 0
                            ? areas.join(", ")
                            : "Belum diset";
                      const statusBadge = getJaringStatusBadge(jaring.registrationStatus ?? jaring.status);
                      const caretakerAssignment = jaring.caretakerAssignments?.[0]?.fieldOfficerAssignment;
                      const gaswilName = caretakerAssignment?.userProfile?.fullName ?? detail.profile.fullName;

                      const identity = resolveJaringIdentity({
                        id: jaring.id,
                        fullName: jaring.fullName,
                        aliasName: jaring.aliasName,
                        whatsappNumber: jaring.whatsappNumber,
                        profilePhotoFileId: jaring.profilePhotoFileId ?? jaring.profilePhotoFile?.id,
                        gaswilName,
                        gaswilAssignmentId: caretakerAssignment?.id ?? detail.currentAssignment?.id,
                        gaswilUserProfileId:
                          caretakerAssignment?.userProfile?.id ??
                          caretakerAssignment?.userProfileId ??
                          detail.profile.id,
                        villageName: displayArea,
                      });

                      return (
                        <TableRow
                          key={jaring.id}
                          className="border-b border-[var(--dc-border-subtle)] hover:bg-[var(--dc-primary-soft)]/10 dark:border-slate-900"
                        >
                          {isJaringColVisible("foto") && (
                            <TableCell className="align-middle">
                              <div className="size-8 overflow-hidden rounded-none border border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-900 flex items-center justify-center">
                                {photoUrl ? (
                                  <img src={photoUrl} alt={identity.name} className="size-full object-cover" />
                                ) : (
                                  <User className="size-4 text-slate-400 dark:text-slate-600" />
                                )}
                              </div>
                            </TableCell>
                          )}

                          {isJaringColVisible("namaJaring") && (
                            <TableCell className="align-middle font-mono font-bold text-xs text-foreground">
                              {identity.name}
                            </TableCell>
                          )}

                          {isJaringColVisible("kodeJaring") && (
                            <TableCell className="align-middle font-mono text-xs text-violet-600 dark:text-violet-400">
                              {identity.code}
                            </TableCell>
                          )}

                          {isJaringColVisible("gaswil") && (
                            <TableCell className="align-middle font-mono text-xs">
                              <GaswilEntityLink
                                name={identity.gaswilName}
                                assignmentId={identity.gaswilAssignmentId}
                                userProfileId={identity.gaswilUserProfileId}
                                href={identity.gaswilHref}
                              />
                            </TableCell>
                          )}

                          {isJaringColVisible("wilayahPenempatan") && (
                            <TableCell className="align-middle font-mono text-xs text-[var(--dc-text-primary)]">
                              {identity.placementArea}
                            </TableCell>
                          )}

                          {isJaringColVisible("whatsapp") && (
                            <TableCell className="align-middle font-mono text-xs">
                              {identity.whatsappNumber && identity.whatsappNumber !== "Belum tersedia" ? (
                                <a
                                  href={`https://wa.me/${identity.whatsappNumber.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-600 hover:underline dark:text-emerald-400"
                                >
                                  {identity.whatsappNumber}
                                </a>
                              ) : (
                                <span className="text-[var(--dc-text-muted)]">Belum tersedia</span>
                              )}
                            </TableCell>
                          )}

                          {isJaringColVisible("pekerjaan") && (
                            <TableCell className="align-middle font-mono text-xs text-[var(--dc-text-secondary)]">
                              {jaring.occupation?.name ?? "-"}
                            </TableCell>
                          )}

                          {isJaringColVisible("kinerja") && (
                            <TableCell className="align-middle text-center whitespace-nowrap">
                              {(() => {
                                const kinerja = getJaringKinerjaBadge(isJaringActive(jaring) ? "ACTIVE" : "INACTIVE");
                                return (
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1.5 px-2 py-0.5 font-mono font-semibold text-[9px] uppercase tracking-wider border rounded-none whitespace-nowrap",
                                      kinerja.className,
                                    )}
                                  >
                                    <span className={cn("size-1.5 rounded-full", kinerja.dotColor)} />
                                    {kinerja.label}
                                  </span>
                                );
                              })()}
                            </TableCell>
                          )}

                          {isJaringColVisible("status") && (
                            <TableCell className="align-middle text-center whitespace-nowrap">
                              <span
                                className={cn(
                                  "px-2 py-0.5 border text-[9px] font-mono tracking-wider font-semibold rounded-none uppercase inline-block whitespace-nowrap",
                                  statusBadge.className,
                                )}
                              >
                                {statusBadge.label}
                              </span>
                            </TableCell>
                          )}

                          {isJaringColVisible("aksi") && (
                            <TableCell className="align-middle text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="h-8 px-2.5 text-xs rounded-lg gap-1.5 font-medium border-sky-500/30 text-sky-600 hover:bg-sky-500/10 dark:text-[#38BDF8]"
                              >
                                <Link href={`/dashboard/daftar-jaring/${jaring.id}`}>
                                  <Eye className="size-3.5" />
                                  Lihat Detail
                                </Link>
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            {!jaringList.length ? <EmptyState title="Belum ada Jaring yang terdaftar untuk petugas ini" /> : null}
          </TabsContent>

          {/* Aktivitas Node View */}
          <TabsContent value="aktivitas" className="space-y-4 outline-none">
            <div className="flex flex-col gap-3 border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80 p-4 dark:border-slate-800 dark:bg-[#080d14]/80 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <label
                  className="space-y-1.5 font-mono text-[10px] text-[var(--dc-text-secondary)] uppercase"
                  htmlFor="activity-period-from"
                >
                  <span>Periode mulai</span>
                  <Input
                    id="activity-period-from"
                    className="h-9 bg-background/50"
                    max={activityPeriodTo || undefined}
                    onChange={(event) => {
                      setActivityPeriodFrom(event.target.value);
                      setActivityPage(1);
                    }}
                    type="date"
                    value={activityPeriodFrom}
                  />
                </label>
                <label
                  className="space-y-1.5 font-mono text-[10px] text-[var(--dc-text-secondary)] uppercase"
                  htmlFor="activity-period-to"
                >
                  <span>Periode selesai</span>
                  <Input
                    id="activity-period-to"
                    className="h-9 bg-background/50"
                    min={activityPeriodFrom || undefined}
                    onChange={(event) => {
                      setActivityPeriodTo(event.target.value);
                      setActivityPage(1);
                    }}
                    type="date"
                    value={activityPeriodTo}
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(activityPeriodFrom || activityPeriodTo) && (
                  <Button
                    className="h-9 font-mono text-[10px]"
                    onClick={() => {
                      setActivityPeriodFrom("");
                      setActivityPeriodTo("");
                      setActivityPage(1);
                    }}
                    type="button"
                    variant="ghost"
                  >
                    RESET PERIODE
                  </Button>
                )}
                <ViewModeToggle value={activityViewMode} onValueChange={setActivityViewMode} />
              </div>
            </div>

            {activityViewMode === "card" ? (
              paginatedActivityLogs.map((log) => (
                <div
                  key={log.id}
                  className="relative border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80 p-4 rounded-none dark:border-slate-800 dark:bg-[#080d14]/80"
                >
                  <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[var(--dc-border-subtle)] dark:border-slate-700" />
                  <p className="font-mono text-xs font-bold text-[var(--dc-text-primary)]">
                    {activityActionLabel(log.action)}
                  </p>
                  <p className="text-[10px] font-mono text-[var(--dc-text-secondary)] mt-1.5 leading-relaxed">
                    {entityTypeLabel(log.entityType)} {log.entityId ? `- ${log.entityId}` : ""} -{" "}
                    {formatDate(log.createdAt)}
                  </p>
                </div>
              ))
            ) : (
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Aktivitas</TableHead>
                    <TableHead>Entitas</TableHead>
                    <TableHead>Alamat IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedActivityLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs text-[var(--dc-text-secondary)]">
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell className="whitespace-normal font-medium">{activityActionLabel(log.action)}</TableCell>
                      <TableCell className="font-mono text-xs text-[var(--dc-text-secondary)]">
                        {entityTypeLabel(log.entityType)}
                        {log.entityId ? ` - ${log.entityId}` : ""}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-[var(--dc-text-secondary)]">
                        {log.ipAddress ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {!paginatedActivityLogs.length ? <EmptyState title="Belum ada log aktivitas pada periode ini" /> : null}
            {filteredActivityLogs.length ? (
              <TablePagination
                className="border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80"
                limit={activityLimit}
                onLimitChange={(limit) => {
                  setActivityLimit(limit);
                  setActivityPage(1);
                }}
                onPageChange={setActivityPage}
                page={safeActivityPage}
                total={filteredActivityLogs.length}
              />
            ) : null}
          </TabsContent>

          {/* Baket Node View */}
          <TabsContent value="baket" className="space-y-3 outline-none">
            {baketCount > detail.reports.length ? (
              <div className="border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80 px-4 py-3 font-mono text-[10px] text-[var(--dc-text-secondary)] dark:border-slate-800 dark:bg-[#080d14]/80">
                Menampilkan {detail.reports.length} {DOMAIN_TERMS.baket} terbaru dari total {baketCount} data.
              </div>
            ) : null}
            {detail.reports.map((report) => (
              <div
                key={report.id}
                className="relative border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80 p-4 rounded-none group dark:border-slate-800 dark:bg-[#080d14]/80"
              >
                <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[var(--dc-border-subtle)] dark:border-slate-700 group-hover:border-[var(--dc-primary)]/45 transition-colors" />

                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="font-mono text-xs font-bold text-[var(--dc-text-primary)]">{report.displayTitle}</h2>
                    <p className="text-[10px] font-mono text-[var(--dc-text-secondary)] mt-1.5 leading-relaxed">
                      {report.category?.name ?? "Tanpa kategori"} - {report.eventArea?.name ?? "Area belum ada"}
                    </p>
                  </div>
                  <span className="border border-[var(--dc-border-subtle)] px-2 py-0.5 text-[9px] font-mono tracking-wider font-semibold rounded-none uppercase bg-[var(--dc-surface-raised)] text-foreground dark:border-slate-800 dark:bg-slate-950">
                    {reportStatusLabel(report.status)}
                  </span>
                </div>
              </div>
            ))}
            {!detail.reports.length ? (
              <EmptyState title={`Belum ada ${DOMAIN_TERMS.baket} yang dihasilkan petugas ini`} />
            ) : null}
          </TabsContent>

          {/* Statistik Node View */}
          <TabsContent value="kpi" className="space-y-4 outline-none">
            <section className="grid gap-4 xl:grid-cols-2">
              <InfoPanel
                title="Ringkasan Statistik"
                items={[
        [DOMAIN_TERMS.jaring, `${jaringList.length} total`],
        [
          DOMAIN_TERMS.jaringActive90Days,
          `${activeJaringCount} (${formatPercent(percentage(activeJaringCount, jaringList.length))})`,
        ],
        [
          DOMAIN_TERMS.jaringInactive90Days,
          `${inactiveJaringCount} (${formatPercent(percentage(inactiveJaringCount, jaringList.length))})`,
        ],
                  [DOMAIN_TERMS.baket, `${baketCount} total`],
                  ["Data Baket Ditampilkan", `${visibleBaketCount} terbaru`],
                ]}
              />
              <InfoPanel
                title="Kelengkapan Operasional"
                items={[
                  [
                    "Jaring Terverifikasi",
                    `${verifiedJaringCount} (${formatPercent(percentage(verifiedJaringCount, jaringList.length))})`,
                  ],
                  [
                    "Jaring Belum Terverifikasi",
                    `${unverifiedJaringCount} (${formatPercent(percentage(unverifiedJaringCount, jaringList.length))})`,
                  ],
                  [DOMAIN_TERMS.assignmentArea, `${activeAreaCount} area aktif`],
                  [
                    "Penugasan dengan Lokasi",
                    `${assignmentWithLocationCount} (${formatPercent(percentage(assignmentWithLocationCount, detail.assignments.length))})`,
                  ],
                  ["Baket Tidak Ditampilkan", `${hiddenBaketCount} data`],
                ]}
              />
            </section>
            <section className="grid gap-3 lg:grid-cols-2">
              {statisticPairs.map((item) => (
                <StatisticPairCard key={item.title} {...item} />
              ))}
            </section>
            {detail.kpi.note ? (
              <div className="border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80 px-4 py-3 text-sm text-[var(--dc-text-secondary)] dark:border-slate-800 dark:bg-[#080d14]/80">
                {detail.kpi.note}
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* INFORMATION & STRUCTURE PANEL HELPERS                                      */
/* -------------------------------------------------------------------------- */

function StatisticPairCard({
  title,
  description,
  primaryLabel,
  primaryValue,
  secondaryLabel,
  secondaryValue,
  total,
  icon: Icon,
  primaryClassName,
  secondaryClassName,
}: {
  title: string;
  description: string;
  primaryLabel: string;
  primaryValue: number;
  secondaryLabel: string;
  secondaryValue: number;
  total: number;
  icon: LucideIcon;
  primaryClassName: string;
  secondaryClassName: string;
}) {
  const primaryPercent = percentage(primaryValue, total);
  const secondaryPercent = percentage(secondaryValue, total);

  return (
    <section className="border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80 p-4 dark:border-slate-800 dark:bg-[#080d14]/80">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-sm text-[var(--dc-text-primary)]">{title}</h2>
          <p className="mt-1 text-xs text-[var(--dc-text-secondary)]">{description}</p>
        </div>
        <Icon className="size-4 shrink-0 text-[var(--dc-primary)]" aria-hidden="true" />
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--dc-surface-raised)]">
        <div className="flex h-full">
          <div className={cn("h-full", primaryClassName)} style={{ width: `${primaryPercent}%` }} />
          <div className={cn("h-full", secondaryClassName)} style={{ width: `${secondaryPercent}%` }} />
        </div>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-[var(--dc-text-muted)]">{primaryLabel}</dt>
          <dd className="mt-1 font-mono font-bold text-lg text-[var(--dc-text-primary)]">
            {primaryValue}{" "}
            <span className="text-xs text-[var(--dc-text-secondary)]">({formatPercent(primaryPercent)})</span>
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-[var(--dc-text-muted)]">{secondaryLabel}</dt>
          <dd className="mt-1 font-mono font-bold text-lg text-[var(--dc-text-primary)]">
            {secondaryValue}{" "}
            <span className="text-xs text-[var(--dc-text-secondary)]">({formatPercent(secondaryPercent)})</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}

function InfoPanel({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <section className="relative border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80 p-5 rounded-none overflow-hidden group select-none hover:border-[var(--dc-primary)]/40 transition-all dark:border-slate-800 dark:bg-[#080d14]/80">
      {/* Corner Brackets */}
      <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-[var(--dc-border-subtle)] dark:border-slate-700 group-hover:border-[var(--dc-primary)]/60 transition-colors" />
      <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-[var(--dc-border-subtle)] dark:border-slate-700 group-hover:border-[var(--dc-primary)]/60 transition-colors" />
      <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-[var(--dc-border-subtle)] dark:border-slate-700 group-hover:border-[var(--dc-primary)]/60 transition-colors" />
      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-[var(--dc-border-subtle)] dark:border-slate-700 group-hover:border-[var(--dc-primary)]/60 transition-colors" />

      <div className="flex items-center gap-1.5 border-b border-[var(--dc-border-subtle)] pb-2 mb-4 dark:border-slate-900">
        <Cpu className="size-3.5 text-[var(--dc-primary)]" />
        <h2 className="text-[10px] font-mono font-bold tracking-widest text-[var(--dc-text-muted)] uppercase">
          {title}
        </h2>
      </div>

      <dl className="mt-4 grid gap-4 text-xs md:grid-cols-2">
        {items.map(([label, value]) => (
          <Field key={label} label={label} value={value} />
        ))}
      </dl>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="font-mono py-1.5 border-b border-[var(--dc-border-subtle)]/30 last:border-0 dark:border-slate-900/30">
      <dt className="text-[9px] tracking-wider text-[var(--dc-text-muted)] uppercase">{label}</dt>
      <dd className="mt-1 text-xs font-bold text-[var(--dc-text-primary)]">{value}</dd>
    </div>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="border border-dashed border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/30 py-8 px-4 text-center font-mono text-[11px] text-[var(--dc-text-muted)] uppercase rounded-none dark:border-slate-800 dark:bg-slate-950/20">
      {title}
    </div>
  );
}
