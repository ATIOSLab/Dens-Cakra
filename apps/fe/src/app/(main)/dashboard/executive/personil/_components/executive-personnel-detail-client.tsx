"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  ChevronLeft,
  ClipboardList,
  Cpu,
  FileText,
  User,
} from "lucide-react";

import { BackButton } from "@/components/ui/back-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import type {
  PersonnelAssignment,
  PersonnelDetail,
} from "./executive-personnel-types";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function areaText(assignment?: PersonnelAssignment | null) {
  const area =
    assignment?.areas.find((item) => item.isPrimary) ?? assignment?.areas[0];
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
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0"
      aria-hidden="true"
    >
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
          <pattern
            id="circuit-grid"
            width="128"
            height="128"
            patternUnits="userSpaceOnUse"
          >
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
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.04 0"
          />
        </filter>
      </svg>
      <div
        className="absolute inset-0 opacity-[0.4] dark:opacity-[0.35] pointer-events-none"
        style={{ filter: "url(#noise-filter)" }}
      />

      {/* 4. Radial Ambient Gradients */}
      <div className="absolute -top-[30%] -left-[10%] w-[60%] h-[70%] rounded-full bg-[var(--dc-primary)]/4 dark:bg-[var(--dc-primary)]/5 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-[20%] -right-[5%] w-[50%] h-[60%] rounded-full bg-[var(--dc-success)]/3 blur-[120px] pointer-events-none" />

      {/* 5. Animated Scanning Line */}
      <motion.div
        className="absolute left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--dc-primary)]/20 to-transparent shadow-[0_0_10px_color-mix(in_srgb,var(--dc-primary)_30%,transparent)]"
        initial={{ top: "-5%" }}
        animate={{ top: "105%" }}
        transition={{
          duration: 9,
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear",
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* MAIN EXPORT CLIENT COMPONENT                                               */
/* -------------------------------------------------------------------------- */

export function ExecutivePersonnelDetailClient({
  detail,
  backHref = "/dashboard/executive/personil",
}: {
  detail: PersonnelDetail;
  backHref?: string;
}) {
  const profile = detail.profile;
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
            <BackButton href="/dashboard/executive/personil" />
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-mono font-bold tracking-tight text-foreground uppercase mt-2">
                {profile.fullName ?? profile.username ?? profile.email}
              </h1>
              <p className="max-w-3xl text-[11px] text-[var(--dc-text-secondary)] font-mono leading-relaxed">
                {profile.email} ·{" "}
                {detail.currentAssignment?.title ?? "Belum ada jabatan aktif"}
              </p>
            </div>
          </div>
        </header>

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
              value="aktivitas"
              className="rounded-none px-6 font-mono text-[10px] uppercase tracking-wider border border-transparent data-[state=active]:border-[var(--dc-border)] data-[state=active]:bg-[var(--dc-primary-soft)] data-[state=active]:text-[var(--dc-primary)] transition-all text-[var(--dc-text-muted)] hover:text-foreground cursor-pointer dark:data-[state=active]:border-slate-800"
            >
              <Activity className="size-3.5 mr-2 text-[var(--dc-primary)]" />
              Aktivitas
            </TabsTrigger>
            <TabsTrigger
              value="laporan"
              className="rounded-none px-6 font-mono text-[10px] uppercase tracking-wider border border-transparent data-[state=active]:border-[var(--dc-border)] data-[state=active]:bg-[var(--dc-primary-soft)] data-[state=active]:text-[var(--dc-primary)] transition-all text-[var(--dc-text-muted)] hover:text-foreground cursor-pointer dark:data-[state=active]:border-slate-800"
            >
              <FileText className="size-3.5 mr-2 text-[var(--dc-primary)]" />
              Laporan
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
            <section className="grid gap-4 lg:grid-cols-2">
              <InfoPanel
                title="Profil"
                items={[
                  ["Nama", profile.fullName ?? "-"],
                  ["Username", profile.username ?? "-"],
                  ["Email", profile.email],
                  ["Telepon", profile.phone ?? "-"],
                  ["Status", profile.status],
                  ["Role auth", profile.authRole],
                ]}
              />
              <InfoPanel
                title="Kondisi Operasional"
                items={[
                  ["Aktif", profile.isActive ? "Ya" : "Tidak"],
                  ["Auth banned", profile.authBanned ? "Ya" : "Tidak"],
                  [
                    "Lock operasional",
                    profile.operationalLockedAt
                      ? formatDate(profile.operationalLockedAt)
                      : "-",
                  ],
                  ["Login terakhir", formatDate(profile.lastLoginAt)],
                  ["Dibuat", formatDate(profile.createdAt)],
                  ["Diperbarui", formatDate(profile.updatedAt)],
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
                    <h2 className="font-mono text-sm font-bold text-[var(--dc-text-primary)]">
                      {assignment.title}
                    </h2>
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
                  <Field
                    label="Mulai"
                    value={formatDate(assignment.validFrom)}
                  />
                  <Field
                    label="Selesai"
                    value={formatDate(assignment.validUntil)}
                  />
                </dl>
              </div>
            ))}
            {!detail.assignments.length ? (
              <EmptyState title="Belum ada penugasan" />
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
                <div className="flex h-9 items-center gap-1 border border-[var(--dc-border-subtle)] bg-background/40 p-1">
                  <Button
                    className="h-7 rounded-none px-3 font-mono text-[10px]"
                    onClick={() => setActivityViewMode("card")}
                    size="sm"
                    type="button"
                    variant={activityViewMode === "card" ? "secondary" : "ghost"}
                  >
                    KARTU
                  </Button>
                  <Button
                    className="h-7 rounded-none px-3 font-mono text-[10px]"
                    onClick={() => setActivityViewMode("table")}
                    size="sm"
                    type="button"
                    variant={activityViewMode === "table" ? "secondary" : "ghost"}
                  >
                    TABEL
                  </Button>
                </div>
              </div>
            </div>

            {activityViewMode === "card" ? paginatedActivityLogs.map((log) => (
              <div
                key={log.id}
                className="relative border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80 p-4 rounded-none dark:border-slate-800 dark:bg-[#080d14]/80"
              >
                <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[var(--dc-border-subtle)] dark:border-slate-700" />
                <p className="font-mono text-xs font-bold text-[var(--dc-text-primary)]">
                  {activityActionLabel(log.action)}
                </p>
                <p className="text-[10px] font-mono text-[var(--dc-text-secondary)] mt-1.5 leading-relaxed">
                  {log.entityType} {log.entityId ? `· ${log.entityId}` : ""} ·{" "}
                  {formatDate(log.createdAt)}
                </p>
              </div>
            )) : (
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

          {/* Laporan Node View */}
          <TabsContent value="laporan" className="space-y-3 outline-none">
            {detail.reports.map((report) => (
              <div
                key={report.id}
                className="relative border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80 p-4 rounded-none group dark:border-slate-800 dark:bg-[#080d14]/80"
              >
                <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[var(--dc-border-subtle)] dark:border-slate-700 group-hover:border-[var(--dc-primary)]/45 transition-colors" />

                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="font-mono text-xs font-bold text-[var(--dc-text-primary)]">
                      {report.title}
                    </h2>
                    <p className="text-[10px] font-mono text-[var(--dc-text-secondary)] mt-1.5 leading-relaxed">
                      {report.category?.name ?? "Tanpa kategori"} ·{" "}
                      {report.eventArea?.name ?? "Area belum ada"}
                    </p>
                  </div>
                  <span className="border border-[var(--dc-border-subtle)] px-2 py-0.5 text-[9px] font-mono tracking-wider font-semibold rounded-none uppercase bg-[var(--dc-surface-raised)] text-foreground dark:border-slate-800 dark:bg-slate-950">
                    {report.status}
                  </span>
                </div>
              </div>
            ))}
            {!detail.reports.length ? (
              <EmptyState title="Belum ada laporan" />
            ) : null}
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

function InfoPanel({
  title,
  items,
}: {
  title: string;
  items: Array<[string, string]>;
}) {
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
      <dt className="text-[9px] tracking-wider text-[var(--dc-text-muted)] uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-xs font-bold text-[var(--dc-text-primary)]">
        {value}
      </dd>
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
