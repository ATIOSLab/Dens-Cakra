"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  FileCheck2,
  MapPinned,
  RefreshCw,
  ShieldAlert,
  Target,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const metrics = [
  {
    label: "Alert Prioritas",
    value: "12",
    delta: "+3 hari ini",
    detail: "4 membutuhkan keputusan",
    icon: ShieldAlert,
    tone: "danger",
  },
  {
    label: "Wilayah Waspada",
    value: "7",
    delta: "21% nasional",
    detail: "2 wilayah meningkat",
    icon: MapPinned,
    tone: "warning",
  },
  {
    label: "Tugas Strategis",
    value: "38",
    delta: "84% sesuai SLA",
    detail: "6 tenggat < 24 jam",
    icon: Target,
    tone: "info",
  },
  {
    label: "Produk Menunggu",
    value: "5",
    delta: "2 sangat rahasia",
    detail: "Pengesahan eksekutif",
    icon: FileCheck2,
    tone: "success",
  },
] as const;

const priorityIssues = [
  {
    code: "ALR-260714-09",
    title: "Konsolidasi massa menjelang tahapan Pilkada Jawa Barat",
    region: "Jawa Barat",
    time: "13.28 WIB",
    status: "Kritis",
    tone: "danger",
  },
  {
    code: "ALR-260714-07",
    title: "Anomali manifes jalur laut di Selat Malaka",
    region: "Kepulauan Riau",
    time: "12.54 WIB",
    status: "Tinggi",
    tone: "warning",
  },
  {
    code: "ALR-260714-04",
    title: "Kerawanan distribusi pangan wilayah lumbung nasional",
    region: "Jawa Tengah",
    time: "11.40 WIB",
    status: "Sedang",
    tone: "info",
  },
] as const;

const decisions = [
  { title: "Otorisasi operasi pengamanan objek vital", meta: "Binda Banten", due: "45 menit", urgent: true },
  { title: "Pengesahan memorandum Selat Malaka", meta: "Binda Kepri", due: "2 jam", urgent: false },
  { title: "Arahan mitigasi pasokan pangan", meta: "Deputi II", due: "Hari ini", urgent: false },
] as const;

const regionalReadiness = [
  { region: "Jawa Barat", score: 92, personnel: "1.284", reports: 28, status: "Siaga" },
  { region: "Kepulauan Riau", score: 86, personnel: "438", reports: 14, status: "Waspada" },
  { region: "Jawa Tengah", score: 81, personnel: "1.106", reports: 19, status: "Waspada" },
  { region: "Banten", score: 78, personnel: "612", reports: 11, status: "Atensi" },
] as const;

const toneStyles = {
  danger: "border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400",
  warning: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  info: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
} as const;

function readinessTone(status: string) {
  if (status === "Siaga") return toneStyles.success;
  if (status === "Waspada") return toneStyles.warning;
  return toneStyles.danger;
}

export function ExecutiveCommandPage() {
  return (
    <div className="@container/main flex flex-col gap-4">
      <header className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
              <CircleDot className="size-3" /> Nasional Aktif
            </Badge>
            <span className="text-muted-foreground text-xs">Pembaruan terakhir 13.40 WIB</span>
          </div>
          <h1 className="font-semibold text-2xl">Beranda Eksekutif</h1>
          <p className="mt-1 max-w-3xl text-muted-foreground text-sm">
            Ringkasan situasi, keputusan prioritas, dan kesiapan komando nasional.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <CalendarDays className="size-4" /> 14 Juli 2026
          </Button>
          <Button variant="outline" size="icon" className="size-8" aria-label="Perbarui data" title="Perbarui data">
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="rounded-md shadow-none">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-muted-foreground text-xs">{metric.label}</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-semibold text-2xl tabular-nums">{metric.value}</span>
                      <span className={cn("hidden text-xs sm:inline", toneStyles[metric.tone])}>{metric.delta}</span>
                    </div>
                    <p className="mt-1 truncate text-muted-foreground text-xs">{metric.detail}</p>
                  </div>
                  <div
                    className={cn("grid size-9 shrink-0 place-items-center rounded-md border", toneStyles[metric.tone])}
                  >
                    <Icon className="size-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
        <Card className="rounded-md shadow-none">
          <CardHeader className="flex-row items-center justify-between border-b py-3">
            <div>
              <CardTitle className="text-base">Isu Prioritas Nasional</CardTitle>
              <p className="mt-1 text-muted-foreground text-xs">Alert tervalidasi berdasarkan tingkat eskalasi.</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs">
              Lihat semua <ArrowUpRight className="size-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {priorityIssues.map((issue) => (
                <button
                  key={issue.code}
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <AlertTriangle className={cn("size-4 shrink-0", toneStyles[issue.tone])} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-mono text-[11px] text-muted-foreground">{issue.code}</span>
                      <Badge
                        variant="outline"
                        className={cn("h-5 rounded-sm px-1.5 text-[10px]", toneStyles[issue.tone])}
                      >
                        {issue.status}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate font-medium text-sm">{issue.title}</p>
                    <p className="mt-1 text-muted-foreground text-xs">
                      {issue.region} · {issue.time}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-md shadow-none">
          <CardHeader className="border-b py-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Antrean Keputusan</CardTitle>
              <Badge variant="secondary" className="rounded-sm">
                3 aktif
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {decisions.map((decision) => (
                <div key={decision.title} className="flex items-start gap-3 px-4 py-3">
                  <div
                    className={cn(
                      "mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border",
                      decision.urgent ? toneStyles.danger : toneStyles.warning,
                    )}
                  >
                    <Clock3 className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm leading-snug">{decision.title}</p>
                    <p className="mt-1 text-muted-foreground text-xs">{decision.meta}</p>
                  </div>
                  <span
                    className={cn("shrink-0 text-xs tabular-nums", decision.urgent && "text-red-600 dark:text-red-400")}
                  >
                    {decision.due}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
        <Card className="rounded-md shadow-none">
          <CardHeader className="flex-row items-center justify-between border-b py-3">
            <CardTitle className="text-base">Kesiapan Wilayah Prioritas</CardTitle>
            <span className="text-muted-foreground text-xs">Sampel 4 dari 34 wilayah</span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/35 text-left text-muted-foreground text-xs">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Wilayah</th>
                    <th className="px-4 py-2.5 font-medium">Kesiapan</th>
                    <th className="px-4 py-2.5 font-medium">Personel</th>
                    <th className="px-4 py-2.5 font-medium">Laporan 24 jam</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {regionalReadiness.map((item) => (
                    <tr key={item.region} className="hover:bg-muted/25">
                      <td className="px-4 py-3 font-medium">{item.region}</td>
                      <td className="px-4 py-3">
                        <div className="flex min-w-32 items-center gap-2">
                          <Progress value={item.score} className="h-1.5" />
                          <span className="w-8 font-mono text-xs tabular-nums">{item.score}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs tabular-nums">{item.personnel}</td>
                      <td className="px-4 py-3 font-mono text-xs tabular-nums">{item.reports}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={cn("rounded-sm", readinessTone(item.status))}>
                          {item.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-md shadow-none">
          <CardHeader className="border-b py-3">
            <CardTitle className="text-base">Agenda Komando</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            {[
              { time: "14.00", title: "Briefing situasi nasional", meta: "Ruang Komando Utama · 6 peserta" },
              { time: "16.30", title: "Evaluasi operasi wilayah barat", meta: "Konferensi aman · 4 wilayah" },
            ].map((agenda) => (
              <div key={agenda.time} className="flex gap-3">
                <div className="w-12 shrink-0 border-r text-center">
                  <p className="font-mono font-semibold text-sm">{agenda.time}</p>
                  <p className="text-[10px] text-muted-foreground">WIB</p>
                </div>
                <div>
                  <p className="font-medium text-sm">{agenda.title}</p>
                  <p className="mt-1 text-muted-foreground text-xs">{agenda.meta}</p>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2 border-t pt-3 text-muted-foreground text-xs">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" /> 3 agenda sebelumnya selesai
              tepat waktu
            </div>
          </CardContent>
        </Card>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-muted-foreground text-xs">
        <span className="flex items-center gap-1.5">
          <UsersRound className="size-3.5" /> 4.812 personel dalam scope komando
        </span>
        <span>Data mockup · sinkronisasi 14 Jul 2026 13.40 WIB</span>
      </footer>
    </div>
  );
}
