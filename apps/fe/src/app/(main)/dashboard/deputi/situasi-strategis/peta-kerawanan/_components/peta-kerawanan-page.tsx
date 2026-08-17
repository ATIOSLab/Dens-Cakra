import Link from "next/link";

import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  EyeOff,
  Flame,
  Layers3,
  type LucideIcon,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DOMAIN_VISUALS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

import { PetaKerawananMap } from "./peta-kerawanan-map";

type Tone = "critical" | "high" | "medium" | "watch";

const toneClasses: Record<Tone, string> = {
  critical: "border-red-500/25 bg-red-500/10 text-red-500",
  high: "border-orange-500/25 bg-orange-500/10 text-orange-500",
  medium: "border-yellow-500/25 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500",
  watch: "border-emerald-500/25 bg-emerald-500/10 text-emerald-500",
};

const statusNames: Record<Tone, string> = {
  critical: "Kritis",
  high: "Waspada",
  medium: "Perhatian",
  watch: "Normal",
};

const metrics = [
  {
    label: "Indeks Kerawanan",
    value: "78.4",
    detail: "Naik 8.2 poin dalam 24 jam",
    tone: "critical",
    icon: ShieldAlert,
    url: "/dashboard/deputi/situasi-strategis/peta-kerawanan",
  },
  {
    label: "Hotspot Aktif",
    value: "17",
    detail: "5 titik prioritas eksekutif",
    tone: "high",
    icon: Flame,
    url: "/dashboard/deputi/situasi-strategis/peta-kerawanan",
  },
  {
    label: "Sebaran Laporan Jaring",
    value: "112",
    detail: "Titik laporan yang menjadi indikator situasi",
    tone: "medium",
    icon: DOMAIN_VISUALS.jaringReport.Icon,
    url: "/dashboard/deputi/produk-intelijen",
  },
  {
    label: "Blind Spot",
    value: "6",
    detail: "3 wilayah tanpa validasi silang",
    tone: "watch",
    icon: EyeOff,
    url: "/dashboard/deputi/situasi-strategis/peta-kerawanan",
  },
] satisfies Array<{
  label: string;
  value: string;
  detail: string;
  tone: Tone;
  icon: LucideIcon;
  url: string;
}>;

const layerStatus = [
  { label: "Ideologi", value: 58, tone: "medium" },
  { label: "Politik", value: 86, tone: "critical" },
  { label: "Ekonomi", value: 74, tone: "high" },
  { label: "Sosial Budaya", value: 69, tone: "high" },
  { label: "Pertahanan", value: 43, tone: "watch" },
  { label: "Keamanan", value: 81, tone: "critical" },
] satisfies Array<{ label: string; value: number; tone: Tone }>;

const priorityAreas = [
  {
    area: "Kota Utara",
    issue: "Aksi massa terkonsentrasi pada simpul pemerintahan dan logistik.",
    level: "Kritis",
    score: 91,
    tone: "critical",
  },
  {
    area: "Koridor Industri Timur",
    issue: "Narasi pemogokan meningkat dan memengaruhi rantai pasok.",
    level: "Waspada",
    score: 82,
    tone: "high",
  },
  {
    area: "Kabupaten Barat",
    issue: "Disinformasi bantuan sosial dan sentimen anti-pemerintah.",
    level: "Waspada",
    score: 76,
    tone: "high",
  },
] satisfies Array<{ area: string; issue: string; level: string; score: number; tone: Tone }>;

const blindSpots = [
  "Pesisir Utara memiliki 4 titik laporan yang perlu pembaruan koordinat.",
  "Kecamatan penyangga industri belum memiliki sumber pembanding 48 jam terakhir.",
  "Kanal komunitas lokal bergerak cepat, tetapi cakupan sumber organik masih tipis.",
];

const correlations = [
  { title: "Aksi massa - logistik", value: "11 laporan", detail: "Kota Utara, Pelabuhan, Bekasi" },
  { title: "Disinformasi bansos", value: "7 laporan", detail: "Banten Barat, Tangerang, kanal lokal" },
  { title: "Isu upah industri", value: "9 laporan", detail: "Bekasi, Karawang, Bandung Raya" },
];

export function PetaKerawananPage() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Peta Kerawanan</h1>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <Link
              href={metric.url}
              key={metric.label}
              className="block transition-transform hover:scale-[1.01] active:scale-[0.99]"
            >
              <div className="rounded-xl border bg-card p-5 text-card-foreground ring-1 ring-foreground/5 shadow-sm h-full">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs font-medium">{metric.label}</p>
                    <p className="font-semibold text-3xl leading-none">{metric.value}</p>
                  </div>
                  <span className={cn("rounded-lg border p-2.5", toneClasses[metric.tone])}>
                    <Icon className="size-5" />
                  </span>
                </div>
                <p className="mt-4 text-muted-foreground text-xs leading-5">{metric.detail}</p>
              </div>
            </Link>
          );
        })}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Peta Ancaman & Drill-down</CardTitle>
          <CardDescription>
            Pilih layer untuk melihat fokus ancaman dan klik marker untuk membuka detail wilayah.
          </CardDescription>
          <CardAction>
            <Badge variant="outline">
              <BarChart3 className="size-3" />6 layer
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <PetaKerawananMap />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Status Layer Ancaman</CardTitle>
            <CardDescription>Ringkasan intensitas tiap layer Ipoleksosbudhankam.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {layerStatus.map((layer) => (
              <div key={layer.label}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">{layer.label}</span>
                    <Badge className={toneClasses[layer.tone]} variant="outline">
                      {statusNames[layer.tone]}
                    </Badge>
                  </div>
                  <span className="font-medium text-sm">{layer.value}%</span>
                </div>
                <Progress value={layer.value} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wilayah Prioritas</CardTitle>
            <CardDescription>Wilayah dengan skor tertinggi dan isu yang perlu atensi pimpinan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {priorityAreas.map((item) => (
              <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 md:grid-cols-[1fr_auto]" key={item.area}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={toneClasses[item.tone]} variant="outline">
                      {item.level}
                    </Badge>
                    <span className="text-muted-foreground text-xs">Skor {item.score}</span>
                  </div>
                  <p className="mt-2 font-medium text-sm">{item.area}</p>
                  <p className="mt-1 text-muted-foreground text-sm leading-5">{item.issue}</p>
                </div>
                <Button asChild aria-label={`Buka detail ${item.area}`} size="icon-sm" variant="ghost">
                  <Link href="/dashboard/deputi/produk-intelijen">
                    <ArrowUpRight />
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Korelasi Kejadian</CardTitle>
            <CardDescription>Keterhubungan laporan lintas wilayah, isu, dan aktor.</CardDescription>
            <CardAction>
              <span className="flex items-center justify-center rounded-lg border border-sky-500/25 bg-sky-500/10 p-2 text-sky-500">
                <Layers3 className="size-4" />
              </span>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-3">
            {correlations.map((item) => (
              <div className="rounded-lg border bg-muted/20 p-3" key={item.title}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="mt-1 text-muted-foreground text-xs">{item.detail}</p>
                  </div>
                  <Badge variant="secondary">{item.value}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Blind Spot</CardTitle>
            <CardDescription>Area yang perlu penguatan sumber dan validasi silang.</CardDescription>
            <CardAction>
              <span className="flex items-center justify-center rounded-lg border border-amber-500/25 bg-amber-500/10 p-2 text-amber-500">
                <AlertTriangle className="size-4" />
              </span>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-3">
            {blindSpots.map((item, index) => (
              <div className="flex gap-3 rounded-lg border bg-muted/20 p-3" key={item}>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border bg-background text-xs">
                  {index + 1}
                </span>
                <p className="text-sm leading-5">{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
