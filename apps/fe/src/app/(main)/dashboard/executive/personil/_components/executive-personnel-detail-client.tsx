"use client";

import { type ReactNode, useMemo, useRef, useState } from "react";

import Link from "next/link";

import { motion } from "framer-motion";
import { Activity, BarChart3, ChevronLeft, ClipboardList, Cpu, Eye, FileText, MapPin, Network, User } from "lucide-react";

import { ViewModeToggle } from "@/app/(main)/dashboard/_components/view-mode-toggle";
import { type ColumnOption, ColumnVisibilityToggle } from "@/components/ui/column-visibility-toggle";
import { GaswilEntityLink } from "@/components/domain/gaswil-entity-link";
import { JaringIdentitySummary } from "@/components/domain/jaring-identity-summary";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { resolveJaringIdentity } from "@/lib/domain/jaring-identity";
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
  return area ? `${area.name} - ${area.level}` : "-";
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
      label: "Aktif",
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
    label: "Tidak Aktif",
    className: "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 dark:bg-rose-950/20",
    dotColor: "bg-rose-500",
  };
}

function getPhotoUrl(jaring: PersonnelJaringItem) {
  const fileId = jaring.profilePhotoFileId || jaring.profilePhotoFile?.id;
  return fileId ? `/api/files/${fileId}` : null;
}

/* -------------------------------------------------------------------------- */
/* MAIN EXPORT CLIENT COMPONENT                                               */
/* -------------------------------------------------------------------------- */

const PERSONIL_JARING_COLUMNS: ColumnOption[] = [
  { id: "foto", label: "Foto Jaring" },
  { id: "namaJaring", label: "Nama Jaring", alwaysVisible: true },
  { id: "kodeJaring", label: "Kode Jaring" },
  { id: "gaswil", label: "Petugas Wilayah (Gaswil)" },
  { id: "wilayahPenempatan", label: "Wilayah Penempatan" },
  { id: "whatsapp", label: "Nomor WhatsApp" },
  { id: "pekerjaan", label: "Pekerjaan" },
  { id: "kinerja", label: "Kinerja Jaring" },
  { id: "status", label: "Status Verifikasi" },
];

export function ExecutivePersonnelDetailClient({
  detail,
  backHref = "/dashboard/executive/personil",
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
          : (jaring.areaCoverages ?? []).map((cov) => cov.area?.name).filter(Boolean).join(", ");

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
          : (jaring.areaCoverages ?? []).map((cov) => cov.area?.name).filter(Boolean).join(", ");

      const identity = resolveJaringIdentity({
        id: jaring.id,
        villageName: displayArea || "Belum diset",
      });

      return identity.placementArea.toLowerCase().includes(jaringKelurahanFilter.toLowerCase());
    });
  }, [jaringList, jaringKelurahanFilter]);
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

  return (
    <main className="space-y-6 p-6 relative min-h-screen">
      {/* Background elements */}
      <TacticalBackground />

      <div className="relative z-10 space-y-6 text-foreground">
        {/* Header Section */}
        <header className="relative overflow-hidden rounded-none border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80 p-5 text-center select-none dark:border-slate-800 dark:bg-[#080d14]/80">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--dc-primary)]/20 to-transparent" />
          <div className="absolute top-0 left-0 w-[4px] h-full bg-[var(--dc-primary)]" />

          <div className="mb-4">
            <BackButton href={backHref} />
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-mono font-bold tracking-tight text-foreground uppercase mt-2">
                {profile.fullName ?? profile.username ?? profile.email}
              </h1>
              <p className="max-w-3xl text-[11px] text-[var(--dc-text-secondary)] font-mono leading-relaxed">
                {profile.email} · {detail.currentAssignment?.title ?? "Belum ada jabatan aktif"}
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Jaring Binaan",
              value: jaringList.length,
              icon: Network,
            },
            {
              label: "Baket Dihasilkan",
              value: baketCount,
              icon: FileText,
            },
            {
              label: "Wilayah Penugasan",
              value: detail.currentAssignment?.areas.length ?? 0,
              icon: MapPin,
            },
            {
              label: "Status Petugas",
              value: profile.isActive ? "Aktif" : "Tidak Aktif",
              icon: Activity,
            },
          ].map((metric) => (
            <div
              key={metric.label}
              className="flex min-h-24 items-center justify-between border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80 p-4 dark:border-slate-800 dark:bg-[#080d14]/80"
            >
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--dc-text-muted)]">
                  {metric.label}
                </p>
                <p className="mt-2 font-mono text-2xl font-bold text-[var(--dc-text-primary)]">{metric.value}</p>
              </div>
              <metric.icon className="size-5 text-[var(--dc-primary)]" aria-hidden="true" />
            </div>
          ))}
        </section>

        {/* Tab Selection */}
        <Tabs defaultValue="profil" className="space-y-4">
          <TabsList className="h-11 w-full justify-center rounded-none border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/50 p-1 dark:border-slate-800 dark:bg-[#080d14]/60">
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
              <Network className="size-3.5 mr-2 text-[var(--dc-primary)]" />
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
              <FileText className="size-3.5 mr-2 text-[var(--dc-primary)]" />
              Baket ({baketCount})
            </TabsTrigger>
            <TabsTrigger
              value="kpi"
              className="rounded-none px-6 font-mono text-[10px] uppercase tracking-wider border border-transparent data-[state=active]:border-[var(--dc-border)] data-[state=active]:bg-[var(--dc-primary-soft)] data-[state=active]:text-[var(--dc-primary)] transition-all text-[var(--dc-text-muted)] hover:text-foreground cursor-pointer dark:data-[state=active]:border-slate-800"
            >
              <BarChart3 className="size-3.5 mr-2 text-[var(--dc-primary)]" />
              KPI
            </TabsTrigger>
          </TabsList>

          {/* Profil Node View */}
          <TabsContent value="profil" className="outline-none">
            <section className="grid gap-4 lg:grid-cols-1 max-w-2xl">
              <InfoPanel
                title="Profil"
                items={[
                  ["Nama", profile.fullName ?? "-"],
                  ["Username", profile.username ?? "-"],
                  ["Email", profile.email],
                  ["Telepon", profile.phone ?? "-"],
                  ["Status", profile.status],
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
                      {assignment.unit.name} · {assignment.seatCode}
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
                  <Field label="Wilayah" value={areaText(assignment)} />
                  <Field label="Mulai" value={formatDate(assignment.validFrom)} />
                  <Field label="Selesai" value={formatDate(assignment.validUntil)} />
                </dl>
              </div>
            ))}
            {!detail.assignments.length ? <EmptyState title="Belum ada penugasan" /> : null}
          </TabsContent>

          {/* Jaring Binaan Node View */}
          <TabsContent value="jaring" className="space-y-4 outline-none">
            {/* Header with Kelurahan Filter & Mode Switcher */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80 p-3.5 dark:border-slate-800 dark:bg-[#080d14]/80">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-xs font-bold text-[var(--dc-text-primary)] uppercase tracking-wider">
                  Daftar Jaring Binaan ({filteredJaringList.length})
                </span>
                {jaringKelurahanOptions.length > 0 && (
                  <NativeSelect
                    aria-label="Filter Kelurahan"
                    value={jaringKelurahanFilter}
                    onChange={(e) => setJaringKelurahanFilter(e.target.value)}
                    className="h-8 text-xs border-slate-200 dark:border-white/10 max-w-[200px]"
                  >
                    <option value="ALL">Semua Kelurahan</option>
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
                  columns={PERSONIL_JARING_COLUMNS}
                  visibleColumns={jaringVisibleColumns}
                  onChange={setJaringVisibleColumns}
                />
                <ViewModeToggle value={jaringViewMode} onValueChange={setJaringViewMode} />
              </div>
            </div>

            {jaringViewMode === "card" ? (
              filteredJaringList.map((jaring) => {
                const photoUrl = getPhotoUrl(jaring);
                const areas = (jaring.areaCoverages ?? []).map((cov) => cov.area?.name).filter(Boolean);
                const displayName = jaring.fullName ?? jaring.aliasName ?? "Tanpa Nama";
                const statusBadge = getJaringStatusBadge(jaring.registrationStatus ?? jaring.status);
                const caretakerAssignment = jaring.caretakerAssignments?.[0]?.fieldOfficerAssignment;
                const gaswilName =
                  caretakerAssignment?.userProfile?.fullName ?? detail.profile.fullName;

                return (
                  <div
                    key={jaring.id}
                    className="relative border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80 p-5 rounded-none overflow-hidden group select-none dark:border-slate-800 dark:bg-[#080d14]/80 hover:border-[var(--dc-primary)]/40 transition-all"
                  >
                    <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[var(--dc-border-subtle)] dark:border-slate-700 group-hover:border-[var(--dc-primary)]/45 transition-colors" />
                    <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[var(--dc-border-subtle)] dark:border-slate-700 group-hover:border-[var(--dc-primary)]/45 transition-colors" />

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-[var(--dc-border-subtle)] pb-3.5 dark:border-slate-900/60">
                      <div className="flex items-center gap-3">
                        {/* Profile Photo */}
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
                            {jaring.whatsappNumber ? `· ${jaring.whatsappNumber}` : ""}
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
                            Detail
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
                          caretakerAssignment?.userProfile?.id ?? caretakerAssignment?.userProfileId ?? detail.profile.id,
                        villageName:
                          jaring.areaNames && jaring.areaNames.length > 0
                            ? jaring.areaNames.join(", ")
                            : (jaring.areaCoverages ?? []).map((cov) => cov.area?.name).filter(Boolean).join(", ") ||
                              "Belum diset",
                      }}
                      className="mt-4"
                    />

                    <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                      <Field label="Pekerjaan" value={jaring.occupation?.name ?? "Belum tersedia"} />
                      <Field label="Terdaftar" value={formatDate(jaring.registeredAt ?? jaring.createdAt)} />
                    </dl>
                  </div>
                );
              })
            ) : (
              <div className="w-full overflow-x-auto select-none border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80 dark:border-slate-800 dark:bg-[#080d14]/80">
                <Table className="w-full min-w-[1100px]">
                  <TableHeader>
                    <TableRow className="border-b border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] dark:border-slate-800 dark:bg-slate-950/80">
                      {isJaringColVisible("foto") && <TableHead className="w-12 text-center font-mono text-[10px] uppercase tracking-wider text-[var(--dc-text-secondary)]">Foto</TableHead>}
                      {isJaringColVisible("namaJaring") && <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[var(--dc-text-secondary)]">Nama Jaring</TableHead>}
                      {isJaringColVisible("kodeJaring") && <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[var(--dc-text-secondary)]">Kode Jaring</TableHead>}
                      {isJaringColVisible("gaswil") && <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[var(--dc-text-secondary)]">Petugas Wilayah (Gaswil)</TableHead>}
                      {isJaringColVisible("wilayahPenempatan") && <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[var(--dc-text-secondary)]">Wilayah Penempatan</TableHead>}
                      {isJaringColVisible("whatsapp") && <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[var(--dc-text-secondary)]">Nomor WhatsApp</TableHead>}
                      {isJaringColVisible("pekerjaan") && <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[var(--dc-text-secondary)]">Pekerjaan</TableHead>}
                      {isJaringColVisible("kinerja") && <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[var(--dc-text-secondary)] text-center">Kinerja Jaring</TableHead>}
                      {isJaringColVisible("status") && <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[var(--dc-text-secondary)] text-center">Status</TableHead>}
                      {isJaringColVisible("aksi") && <TableHead className="font-mono text-[10px] uppercase tracking-wider text-[var(--dc-text-secondary)] text-right">Aksi</TableHead>}
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
                      const gaswilName =
                        caretakerAssignment?.userProfile?.fullName ?? detail.profile.fullName;

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
                        <TableRow key={jaring.id} className="border-b border-[var(--dc-border-subtle)] hover:bg-[var(--dc-primary-soft)]/10 dark:border-slate-900">
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
                                const kinerja = getJaringKinerjaBadge(jaring.status);
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
                                  Detail
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
            {!jaringList.length ? (
              <EmptyState title="Belum ada jaring binaan yang terdaftar untuk petugas ini" />
            ) : null}
          </TabsContent>

          {/* Aktivitas Node View */}
          <TabsContent value="aktivitas" className="space-y-4 outline-none">
            <div className="flex flex-col gap-3 border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80 p-4 dark:border-slate-800 dark:bg-[#080d14]/80 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 font-mono text-[10px] text-[var(--dc-text-secondary)] uppercase">
                  <span>Periode mulai</span>
                  <Input
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
                <label className="space-y-1.5 font-mono text-[10px] text-[var(--dc-text-secondary)] uppercase">
                  <span>Periode selesai</span>
                  <Input
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
                    {log.entityType} {log.entityId ? `· ${log.entityId}` : ""} · {formatDate(log.createdAt)}
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
                        {log.entityId ? ` · ${log.entityId}` : ""}
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
                Menampilkan {detail.reports.length} Baket terbaru dari total {baketCount} Baket.
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
                      {report.category?.name ?? "Tanpa kategori"} · {report.eventArea?.name ?? "Area belum ada"}
                    </p>
                  </div>
                  <span className="border border-[var(--dc-border-subtle)] px-2 py-0.5 text-[9px] font-mono tracking-wider font-semibold rounded-none uppercase bg-[var(--dc-surface-raised)] text-foreground dark:border-slate-800 dark:bg-slate-950">
                    {report.status}
                  </span>
                </div>
              </div>
            ))}
            {!detail.reports.length ? <EmptyState title="Belum ada Baket yang dihasilkan petugas ini" /> : null}
          </TabsContent>

          {/* KPI Node View */}
          <TabsContent value="kpi" className="outline-none">
            <EmptyState title={detail.kpi.note} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* INFORMATION & STRUCTURE PANEL HELPERS                                      */
/* -------------------------------------------------------------------------- */

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
