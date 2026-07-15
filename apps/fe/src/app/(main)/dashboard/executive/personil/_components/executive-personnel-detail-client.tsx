"use client";

import Link from "next/link";
import { Activity, BarChart3, ClipboardList, FileText, User } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { PersonnelAssignment, PersonnelDetail } from "./executive-personnel-types";

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

export function ExecutivePersonnelDetailClient({ detail }: { detail: PersonnelDetail }) {
  const profile = detail.profile;

  return (
    <main className="space-y-6 p-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="inline-flex border border-[var(--dc-border-subtle)] px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Detail Personel
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal">
            {profile.fullName ?? profile.username ?? profile.email}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {profile.email} · {detail.currentAssignment?.title ?? "Belum ada jabatan aktif"}
          </p>
        </div>
        <Link
          href="/dashboard/executive/personil"
          className="border border-[var(--dc-border-subtle)] px-4 py-2 text-sm font-semibold"
        >
          Kembali
        </Link>
      </header>

      <Tabs defaultValue="profil" className="space-y-4">
        <TabsList className="h-11 rounded-none border border-[var(--dc-border-subtle)] bg-muted/20 p-1">
          <TabsTrigger value="profil" className="rounded-none px-4">
            <User className="size-4" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="penugasan" className="rounded-none px-4">
            <ClipboardList className="size-4" />
            Penugasan
          </TabsTrigger>
          <TabsTrigger value="aktivitas" className="rounded-none px-4">
            <Activity className="size-4" />
            Aktivitas
          </TabsTrigger>
          <TabsTrigger value="laporan" className="rounded-none px-4">
            <FileText className="size-4" />
            Laporan
          </TabsTrigger>
          <TabsTrigger value="kpi" className="rounded-none px-4">
            <BarChart3 className="size-4" />
            KPI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profil">
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
                ["Lock operasional", profile.operationalLockedAt ? formatDate(profile.operationalLockedAt) : "-"],
                ["Login terakhir", formatDate(profile.lastLoginAt)],
                ["Dibuat", formatDate(profile.createdAt)],
                ["Diperbarui", formatDate(profile.updatedAt)],
              ]}
            />
          </section>
        </TabsContent>

        <TabsContent value="penugasan">
          <section className="space-y-4">
            {detail.assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="border border-[var(--dc-border-subtle)] bg-card/50 p-4"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="font-semibold">{assignment.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {assignment.unit.name} · {assignment.seatCode}
                    </p>
                  </div>
                  <span className="border border-cyan-500/70 px-2 py-1 text-xs font-semibold text-cyan-300">
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
            {!detail.assignments.length ? (
              <EmptyState title="Belum ada penugasan" />
            ) : null}
          </section>
        </TabsContent>

        <TabsContent value="aktivitas">
          <section className="space-y-3">
            {detail.activityLogs.map((log) => (
              <div key={log.id} className="border border-[var(--dc-border-subtle)] bg-card/50 p-4">
                <p className="font-semibold">{log.action}</p>
                <p className="text-sm text-muted-foreground">
                  {log.entityType} {log.entityId ? `· ${log.entityId}` : ""} · {formatDate(log.createdAt)}
                </p>
              </div>
            ))}
            {!detail.activityLogs.length ? <EmptyState title="Belum ada log aktivitas" /> : null}
          </section>
        </TabsContent>

        <TabsContent value="laporan">
          <section className="space-y-3">
            {detail.reports.map((report) => (
              <div key={report.id} className="border border-[var(--dc-border-subtle)] bg-card/50 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="font-semibold">{report.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {report.category?.name ?? "Tanpa kategori"} · {report.eventArea?.name ?? "Area belum ada"}
                    </p>
                  </div>
                  <span className="border border-[var(--dc-border-subtle)] px-2 py-1 text-xs font-semibold">
                    {report.status}
                  </span>
                </div>
              </div>
            ))}
            {!detail.reports.length ? <EmptyState title="Belum ada laporan" /> : null}
          </section>
        </TabsContent>

        <TabsContent value="kpi">
          <EmptyState title={detail.kpi.note} />
        </TabsContent>
      </Tabs>
    </main>
  );
}

function InfoPanel({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <section className="border border-[var(--dc-border-subtle)] bg-card/50 p-5">
      <h2 className="font-semibold">{title}</h2>
      <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        {items.map(([label, value]) => (
          <Field key={label} label={label} value={value} />
        ))}
      </dl>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="border border-dashed border-[var(--dc-border-subtle)] bg-card/30 p-8 text-center text-muted-foreground">
      {title}
    </div>
  );
}
