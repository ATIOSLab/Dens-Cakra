"use client";

import { useMemo, useState } from "react";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BellRing,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  Clock3,
  FileStack,
  MapPin,
  RadioTower,
  RefreshCw,
  ShieldAlert,
  Siren,
  Target,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type ExecutiveOperationalView = "warning" | "emergency" | "monitoring" | "briefing";
type Tone = "danger" | "warning" | "info" | "success" | "neutral";

type Metric = { label: string; value: string; detail: string; icon: LucideIcon; tone: Tone };
type OperationalItem = {
  id: string;
  title: string;
  meta: string;
  time: string;
  status: string;
  tone: Tone;
  progress: number;
};
type FocusItem = { focus: string; owner: string; target: string; status: string; tone: Tone };
type PageDefinition = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  liveLabel: string;
  metrics: Metric[];
  primaryTitle: string;
  primaryDescription: string;
  items: OperationalItem[];
  distributionTitle: string;
  distributions: { label: string; value: number; tone: Tone }[];
  timeline: { time: string; title: string; meta: string }[];
  focusTitle: string;
  focus: FocusItem[];
};

const toneStyles: Record<Tone, string> = {
  danger: "border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400",
  warning: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  info: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  neutral: "border-border bg-muted/40 text-muted-foreground",
};

const definitions: Record<ExecutiveOperationalView, PageDefinition> = {
  warning: {
    eyebrow: "Situasi Nasional",
    title: "Peringatan Dini",
    description: "Deteksi eskalasi, korelasi kejadian, dan kebutuhan atensi pimpinan secara nasional.",
    icon: BellRing,
    liveLabel: "12 alert aktif",
    metrics: [
      { label: "Alert Kritis", value: "4", detail: "+1 dalam 6 jam", icon: ShieldAlert, tone: "danger" },
      { label: "Prioritas Tinggi", value: "8", detail: "3 lintas wilayah", icon: AlertTriangle, tone: "warning" },
      { label: "Dalam Verifikasi", value: "15", detail: "Median 38 menit", icon: ClipboardCheck, tone: "info" },
      { label: "Tertangani 24 Jam", value: "27", detail: "90% sesuai SLA", icon: CheckCircle2, tone: "success" },
    ],
    primaryTitle: "Alert Prioritas",
    primaryDescription: "Urutan berdasarkan dampak, validitas sumber, dan laju eskalasi.",
    items: [
      {
        id: "ALT-260714-091",
        title: "Konsolidasi massa menjelang tahapan Pilkada Jawa Barat",
        meta: "Bandung · Sumber A-1 · 18 laporan terkait",
        time: "13.28 WIB",
        status: "Kritis",
        tone: "danger",
        progress: 92,
      },
      {
        id: "ALT-260714-087",
        title: "Anomali manifes kargo jalur laut Selat Malaka",
        meta: "Kepulauan Riau · Sumber A-2 · 9 laporan terkait",
        time: "12.54 WIB",
        status: "Tinggi",
        tone: "warning",
        progress: 78,
      },
      {
        id: "ALT-260714-073",
        title: "Indikasi pemantauan objek vital energi Banten",
        meta: "Cilegon · Sumber B-2 · 6 laporan terkait",
        time: "11.46 WIB",
        status: "Tinggi",
        tone: "warning",
        progress: 71,
      },
      {
        id: "ALT-260714-061",
        title: "Tekanan pasokan pangan wilayah lumbung nasional",
        meta: "Jawa Tengah · Sumber B-1 · 11 laporan terkait",
        time: "10.32 WIB",
        status: "Sedang",
        tone: "info",
        progress: 58,
      },
    ],
    distributionTitle: "Komposisi Alert",
    distributions: [
      { label: "Politik & Keamanan", value: 72, tone: "danger" },
      { label: "Ekonomi & Pangan", value: 54, tone: "warning" },
      { label: "Maritim & Perbatasan", value: 43, tone: "info" },
      { label: "Objek Vital", value: 31, tone: "success" },
    ],
    timeline: [
      { time: "13.34", title: "Validasi silang diterima", meta: "Korwil Bandung · ALT-091" },
      { time: "13.18", title: "Status dinaikkan menjadi Kritis", meta: "OIM Nasional · ALT-091" },
      { time: "12.56", title: "Alert maritim diteruskan", meta: "Binda Kepri · ALT-087" },
    ],
    focusTitle: "Tindak Lanjut Alert",
    focus: [
      {
        focus: "Pengamanan tahapan KPUD Jawa Barat",
        owner: "Binda Jawa Barat",
        target: "14 Jul, 15.00",
        status: "Berjalan",
        tone: "danger",
      },
      {
        focus: "Audit manifes kapal non-reguler",
        owner: "Binda Kepri",
        target: "14 Jul, 18.00",
        status: "Koordinasi",
        tone: "warning",
      },
      {
        focus: "Verifikasi gardu induk Suralaya",
        owner: "Binda Banten",
        target: "15 Jul, 08.00",
        status: "Terjadwal",
        tone: "info",
      },
    ],
  },
  emergency: {
    eyebrow: "Pusat Komando",
    title: "Operasi Darurat",
    description: "Kendali insiden aktif, sumber daya lintas unit, dan instruksi cepat tingkat pusat.",
    icon: Siren,
    liveLabel: "3 operasi aktif",
    metrics: [
      { label: "Insiden Aktif", value: "3", detail: "1 status kritis", icon: Siren, tone: "danger" },
      { label: "Personel Dikerahkan", value: "184", detail: "12 unit gabungan", icon: UsersRound, tone: "warning" },
      { label: "Kebutuhan Terbuka", value: "7", detail: "2 perlu otorisasi", icon: Target, tone: "info" },
      { label: "SLA Respons", value: "94%", detail: "Median 11 menit", icon: Clock3, tone: "success" },
    ],
    primaryTitle: "Papan Kendali Insiden",
    primaryDescription: "Operasi aktif dan progres stabilisasi terkini.",
    items: [
      {
        id: "OPS-260714-03",
        title: "Pengamanan objek vital energi Suralaya",
        meta: "Banten · 72 personel · Posko Alfa",
        time: "Mulai 11.05",
        status: "Kritis",
        tone: "danger",
        progress: 42,
      },
      {
        id: "OPS-260714-02",
        title: "Mitigasi konsentrasi massa KPUD Bandung",
        meta: "Jawa Barat · 86 personel · Posko Bravo",
        time: "Mulai 09.40",
        status: "Stabilisasi",
        tone: "warning",
        progress: 68,
      },
      {
        id: "OPS-260713-08",
        title: "Pengawasan pelabuhan non-reguler Batam",
        meta: "Kepulauan Riau · 26 personel · Posko Delta",
        time: "22 jam",
        status: "Terkendali",
        tone: "success",
        progress: 86,
      },
    ],
    distributionTitle: "Kesiapan Sumber Daya",
    distributions: [
      { label: "Personel lapangan", value: 88, tone: "success" },
      { label: "Kanal komunikasi", value: 96, tone: "success" },
      { label: "Dukungan logistik", value: 73, tone: "warning" },
      { label: "Evakuasi medis", value: 64, tone: "danger" },
    ],
    timeline: [
      { time: "13.36", title: "Tim pengamanan sektor timur tiba", meta: "OPS-03 · 18 personel" },
      { time: "13.08", title: "Permintaan dukungan medis", meta: "OPS-03 · Menunggu otorisasi" },
      { time: "12.42", title: "Perimeter Bravo diperluas", meta: "OPS-02 · Radius 1,2 km" },
    ],
    focusTitle: "Instruksi Komando",
    focus: [
      {
        focus: "Aktifkan dukungan medis sektor Suralaya",
        owner: "Pusat Operasi",
        target: "14 Jul, 14.10",
        status: "Otorisasi",
        tone: "danger",
      },
      {
        focus: "Perkuat kanal komunikasi Posko Bravo",
        owner: "Unit Teknis",
        target: "14 Jul, 14.30",
        status: "Berjalan",
        tone: "warning",
      },
      {
        focus: "Siapkan laporan stabilisasi Batam",
        owner: "Binda Kepri",
        target: "14 Jul, 17.00",
        status: "Penyusunan",
        tone: "info",
      },
    ],
  },
  monitoring: {
    eyebrow: "Kendali Nasional",
    title: "Monitoring Nasional",
    description: "Konsolidasi tugas strategis, pipeline laporan, dan performa wilayah dalam satu tampilan.",
    icon: RadioTower,
    liveLabel: "34 wilayah terhubung",
    metrics: [
      { label: "Tugas Berjalan", value: "146", detail: "38 strategis", icon: Target, tone: "info" },
      { label: "Sesuai SLA", value: "88%", detail: "+4% pekan ini", icon: CheckCircle2, tone: "success" },
      { label: "Perlu Atensi", value: "17", detail: "6 tenggat < 24 jam", icon: AlertTriangle, tone: "warning" },
      { label: "Laporan Masuk", value: "284", detail: "24 jam terakhir", icon: FileStack, tone: "neutral" },
    ],
    primaryTitle: "Status Wilayah",
    primaryDescription: "Kinerja komando berdasarkan penyelesaian tugas dan kualitas laporan.",
    items: [
      {
        id: "WIL-JABAR",
        title: "Binda Jawa Barat",
        meta: "42 tugas · 96 laporan · 1.284 personel",
        time: "13.38 WIB",
        status: "Atensi",
        tone: "warning",
        progress: 84,
      },
      {
        id: "WIL-KEPRI",
        title: "Binda Kepulauan Riau",
        meta: "26 tugas · 48 laporan · 438 personel",
        time: "13.35 WIB",
        status: "Sesuai SLA",
        tone: "success",
        progress: 91,
      },
      {
        id: "WIL-JATENG",
        title: "Binda Jawa Tengah",
        meta: "37 tugas · 72 laporan · 1.106 personel",
        time: "13.31 WIB",
        status: "Sesuai SLA",
        tone: "success",
        progress: 88,
      },
      {
        id: "WIL-BANTEN",
        title: "Binda Banten",
        meta: "21 tugas · 39 laporan · 612 personel",
        time: "13.27 WIB",
        status: "Tertunda",
        tone: "danger",
        progress: 69,
      },
    ],
    distributionTitle: "Pipeline Nasional",
    distributions: [
      { label: "Pengumpulan", value: 86, tone: "info" },
      { label: "Verifikasi", value: 71, tone: "warning" },
      { label: "Analisis", value: 63, tone: "warning" },
      { label: "Diseminasi", value: 48, tone: "success" },
    ],
    timeline: [
      { time: "13.38", title: "Laporan wilayah Jawa Barat diperbarui", meta: "12 laporan tervalidasi" },
      { time: "13.22", title: "Tugas Kepri mencapai SLA", meta: "MON-KEPRI-026" },
      { time: "12.58", title: "Backlog Banten meningkat", meta: "+4 laporan menunggu" },
    ],
    focusTitle: "Wilayah Perlu Atensi",
    focus: [
      {
        focus: "Backlog verifikasi laporan Banten",
        owner: "Korwil Banten",
        target: "14 Jul, 16.00",
        status: "Tertunda",
        tone: "danger",
      },
      {
        focus: "Kelengkapan bukti tugas Jawa Barat",
        owner: "Korwil Jabar",
        target: "14 Jul, 18.00",
        status: "Perbaikan",
        tone: "warning",
      },
      {
        focus: "Sinkronisasi data personel Jawa Tengah",
        owner: "Admin Jateng",
        target: "15 Jul, 09.00",
        status: "Terjadwal",
        tone: "info",
      },
    ],
  },
  briefing: {
    eyebrow: "Produk Pimpinan",
    title: "Laporan & Briefing",
    description: "Kompilasi ringkasan eksekutif, isu prioritas, dan paket briefing pimpinan.",
    icon: BookOpenCheck,
    liveLabel: "Briefing 14.00 WIB",
    metrics: [
      { label: "Paket Hari Ini", value: "4", detail: "2 siap diseminasi", icon: BookOpenCheck, tone: "info" },
      { label: "Isu Terpilih", value: "12", detail: "4 prioritas tinggi", icon: ShieldAlert, tone: "danger" },
      { label: "Menunggu Review", value: "3", detail: "Tenggat 45 menit", icon: Clock3, tone: "warning" },
      { label: "Briefing Selesai", value: "18", detail: "7 hari terakhir", icon: CheckCircle2, tone: "success" },
    ],
    primaryTitle: "Paket Briefing",
    primaryDescription: "Agenda terdekat dan status kelengkapan bahan pimpinan.",
    items: [
      {
        id: "BRF-260714-04",
        title: "Briefing Situasi Nasional Sore",
        meta: "6 isu · 14 lampiran · Pimpinan & Deputi",
        time: "14.00 WIB",
        status: "Siap",
        tone: "success",
        progress: 100,
      },
      {
        id: "BRF-260714-05",
        title: "Evaluasi Operasi Wilayah Barat",
        meta: "4 wilayah · 9 lampiran · Pusat Komando",
        time: "16.30 WIB",
        status: "Review",
        tone: "warning",
        progress: 82,
      },
      {
        id: "BRF-260715-01",
        title: "Morning Intelligence Update",
        meta: "8 isu · 11 lampiran · Pimpinan",
        time: "Besok, 07.30",
        status: "Penyusunan",
        tone: "info",
        progress: 56,
      },
    ],
    distributionTitle: "Komposisi Materi",
    distributions: [
      { label: "Politik & keamanan", value: 78, tone: "danger" },
      { label: "Operasi wilayah", value: 66, tone: "warning" },
      { label: "Ekonomi strategis", value: 52, tone: "info" },
      { label: "Maritim", value: 39, tone: "success" },
    ],
    timeline: [
      { time: "13.32", title: "Paket briefing sore dikunci", meta: "BRF-04 · v1.4" },
      { time: "13.10", title: "Lampiran operasi Banten ditambahkan", meta: "BRF-05 · 2 dokumen" },
      { time: "12.48", title: "Ringkasan pangan disetujui", meta: "Deputi II · v1.2" },
    ],
    focusTitle: "Materi Menunggu Review",
    focus: [
      {
        focus: "Ringkasan operasi Suralaya",
        owner: "Pusat Operasi",
        target: "14 Jul, 13.45",
        status: "Review",
        tone: "danger",
      },
      {
        focus: "Analisis konsolidasi massa Jawa Barat",
        owner: "OIM Nasional",
        target: "14 Jul, 14.15",
        status: "Revisi",
        tone: "warning",
      },
      {
        focus: "Ikhtisar Selat Malaka",
        owner: "Binda Kepri",
        target: "14 Jul, 15.00",
        status: "Siap",
        tone: "success",
      },
    ],
  },
};

function progressClass(tone: Tone) {
  if (tone === "danger") return "[&_[data-slot=progress-indicator]]:bg-red-500";
  if (tone === "warning") return "[&_[data-slot=progress-indicator]]:bg-amber-500";
  if (tone === "info") return "[&_[data-slot=progress-indicator]]:bg-sky-500";
  if (tone === "success") return "[&_[data-slot=progress-indicator]]:bg-emerald-500";
  return "[&_[data-slot=progress-indicator]]:bg-muted-foreground";
}

export function ExecutiveOperationalPage({ view }: { view: ExecutiveOperationalView }) {
  const definition = definitions[view];
  const [period, setPeriod] = useState("24 Jam");
  const [status, setStatus] = useState("Semua");
  const Icon = definition.icon;
  const statuses = useMemo(
    () => ["Semua", ...new Set(definition.items.map((item) => item.status))],
    [definition.items],
  );
  const visibleItems =
    status === "Semua" ? definition.items : definition.items.filter((item) => item.status === status);

  return (
    <div className="@container/main flex flex-col gap-4">
      <header className="flex flex-col gap-3 border-b pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-md border border-primary/25 bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
          <div>
            <p className="font-medium text-muted-foreground text-xs uppercase">{definition.eyebrow}</p>
            <h1 className="mt-1 font-semibold text-2xl">{definition.title}</h1>
            <p className="mt-1 max-w-3xl text-muted-foreground text-sm">{definition.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-primary/25 bg-primary/10 text-primary">
            <CircleDot className="size-3" /> {definition.liveLabel}
          </Badge>
          <div className="flex rounded-md border p-0.5">
            {["24 Jam", "7 Hari", "30 Hari"].map((item) => (
              <Button
                key={item}
                type="button"
                size="sm"
                variant={period === item ? "secondary" : "ghost"}
                className="h-7 rounded-sm px-2.5 text-xs"
                onClick={() => setPeriod(item)}
              >
                {item}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="icon" className="size-8" aria-label="Perbarui data" title="Perbarui data">
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {definition.metrics.map((metric) => {
          const MetricIcon = metric.icon;
          return (
            <Card key={metric.label} className="rounded-md shadow-none">
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-muted-foreground text-xs">{metric.label}</p>
                  <p className="mt-2 font-semibold text-2xl tabular-nums">{metric.value}</p>
                  <p className="mt-1 truncate text-muted-foreground text-xs">{metric.detail}</p>
                </div>
                <div
                  className={cn("grid size-9 shrink-0 place-items-center rounded-md border", toneStyles[metric.tone])}
                >
                  <MetricIcon className="size-4" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.75fr)]">
        <Card className="rounded-md shadow-none">
          <CardHeader className="gap-3 border-b py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">{definition.primaryTitle}</CardTitle>
              <p className="mt-1 text-muted-foreground text-xs">{definition.primaryDescription}</p>
            </div>
            <div className="flex max-w-full gap-1 overflow-x-auto">
              {statuses.map((item) => (
                <Button
                  key={item}
                  type="button"
                  size="sm"
                  variant={status === item ? "secondary" : "ghost"}
                  className="h-7 shrink-0 rounded-sm px-2.5 text-xs"
                  onClick={() => setStatus(item)}
                >
                  {item}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {visibleItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="grid w-full gap-3 px-4 py-3 text-left hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(0,1fr)_120px_80px] sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] text-muted-foreground">{item.id}</span>
                      <Badge
                        variant="outline"
                        className={cn("h-5 rounded-sm px-1.5 text-[10px]", toneStyles[item.tone])}
                      >
                        {item.status}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate font-medium text-sm">{item.title}</p>
                    <p className="mt-1 truncate text-muted-foreground text-xs">
                      <MapPin className="mr-1 inline size-3" />
                      {item.meta}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={item.progress} className={cn("h-1.5", progressClass(item.tone))} />
                    <span className="w-8 font-mono text-xs tabular-nums">{item.progress}%</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-muted-foreground text-xs sm:justify-end">
                    <span>{item.time}</span>
                    <ChevronRight className="size-4" />
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="rounded-md shadow-none">
            <CardHeader className="border-b py-3">
              <CardTitle className="text-base">{definition.distributionTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {definition.distributions.map((item) => (
                <div key={item.label}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span>{item.label}</span>
                    <span className="font-mono text-muted-foreground tabular-nums">{item.value}%</span>
                  </div>
                  <Progress value={item.value} className={cn("h-1.5", progressClass(item.tone))} />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="rounded-md shadow-none">
            <CardHeader className="border-b py-3">
              <CardTitle className="text-base">Pembaruan Terbaru</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {definition.timeline.map((item) => (
                  <div key={`${item.time}-${item.title}`} className="flex gap-3 px-4 py-3">
                    <span className="w-10 shrink-0 font-mono text-muted-foreground text-xs">{item.time}</span>
                    <Activity className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-xs">{item.title}</p>
                      <p className="mt-1 truncate text-[11px] text-muted-foreground">{item.meta}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Card className="rounded-md shadow-none">
        <CardHeader className="flex-row items-center justify-between border-b py-3">
          <CardTitle className="text-base">{definition.focusTitle}</CardTitle>
          <Badge variant="secondary" className="rounded-sm">
            {definition.focus.length} prioritas
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-muted/35 text-left text-muted-foreground text-xs">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Fokus</th>
                  <th className="px-4 py-2.5 font-medium">Penanggung Jawab</th>
                  <th className="px-4 py-2.5 font-medium">Target</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {definition.focus.map((item) => (
                  <tr key={item.focus} className="hover:bg-muted/25">
                    <td className="px-4 py-3 font-medium">{item.focus}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.owner}</td>
                    <td className="px-4 py-3 font-mono text-xs">{item.target}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={cn("rounded-sm", toneStyles[item.tone])}>
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

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-muted-foreground text-xs">
        <span className="flex items-center gap-1.5">
          <BarChart3 className="size-3.5" /> Periode aktif: {period}
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarClock className="size-3.5" /> Sinkronisasi 14 Jul 2026 13.40 WIB
        </span>
      </footer>
    </div>
  );
}
