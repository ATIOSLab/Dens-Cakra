"use client";

import { useEffect, useState, useTransition } from "react";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  FileText,
  FileDown,
  MapPin,
  MapPinned,
  Maximize2,
  Minus,
  Network,
  Plus,
  Printer,
  RadioTower,
  Send,
  ShieldCheck,
  UserRound,
  Inbox,
  Clock,
  Activity,
  RefreshCw,
  FileCheck,
  Users,
  Zap,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { administrativeAreaLabel } from "@/features/baket/administrative-area";
import { BaketAdministrativeArea } from "@/features/baket/components/baket-administrative-area";
import { apiBrowserFetch, apiBrowserMutation } from "@/lib/api/browser-client";

import type { OimPageData, OimView } from "./oim-types";

const SituationMap = dynamic(() => import("./oim-situation-map").then((module) => module.OimSituationMap), {
  ssr: false,
  loading: () => <div className="h-[560px] animate-pulse rounded-xl bg-muted" />,
});

const BaketLocationMap = dynamic(
  () => import("@/features/baket/components/baket-location-map").then((module) => module.BaketLocationMap),
  {
    ssr: false,
    loading: () => <div className="h-[420px] animate-pulse bg-muted" />,
  },
);

type Row = Record<string, any>;
type Props = { view: OimView; data: OimPageData; params: Record<string, string> };

const VIEW_META: Record<OimView, [string, string, typeof FileText]> = {
  dashboard: ["Pusat Kendali OIM", "Ringkasan antrean intelijen dalam scope komando dan wilayah Anda.", RadioTower],
  reports: [
    "Laporan Masuk",
    "Baket Field Officer yang telah dikirim ke OIM dan seluruh status lanjutannya.",
    FileSearch,
  ],
  "report-detail": ["Detail Baket", "Bukti, peta lokasi, versi, dan jejak keputusan.", FileSearch],
  "report-version": ["Snapshot Versi Baket", "Versi historis bersifat baca-saja.", FileText],
  verification: [
    "Neraca Penilaian",
    "Antrean penilaian keandalan sumber A–F dan kredibilitas informasi 1–6.",
    ClipboardCheck,
  ],
  "verification-detail": [
    "Lembar Verifikasi",
    "Checklist, cross-reference, matriks, interpretasi, dan keputusan final.",
    ShieldCheck,
  ],
  analysis: [
    "Analisis Intelijen",
    "Analisis manual berbasis Baket terverifikasi, tanpa pembuatan draft AI.",
    BarChart3,
  ],
  "analysis-new": ["Analisis Baru", "Pilih sumber terverifikasi dan mulai draft lima bagian.", Plus],
  "analysis-detail": [
    "Workspace Analisis",
    "Gabungkan beberapa Baket, susun analisis, lalu simpan sebagai draft atau final.",
    Network,
  ],
  "analysis-edit": ["Edit Analisis", "Perbarui versi aktif sebelum difinalkan.", BarChart3],
  "analysis-version": ["Versi Analisis", "Snapshot final tidak dapat diubah.", BarChart3],
  products: ["Produk Intelijen", "Laporan Intelijen yang bersumber dari analisis final.", FileText],
  "product-list": ["Daftar Produk", "Pipeline draft, revisi, pengajuan, dan versi produk.", FileText],
  "product-new": [
    "Buat Laporan Intelijen",
    "Pilih jenis laporan dan susun isinya dari analisis final beserta Baket sumber.",
    Plus,
  ],
  "product-detail": ["Detail Produk", "Metadata, sumber, versi, validasi, approval, dan traceability.", FileText],
  "product-edit": ["Edit Produk", "Koreksi metadata draft dan konten versi aktif.", FileText],
  "product-version": ["Versi Produk", "Snapshot produk untuk audit dan cetak.", FileText],
  approval: ["Pengajuan Persetujuan", "Produk final yang menunggu keputusan Regional Commander.", Send],
  "approval-detail": ["Persiapan Pengajuan", "Finalkan produk dan kunci versi untuk Regional Commander.", Send],
  "workflow-detail": ["Timeline Persetujuan", "Status keputusan Regional Commander.", Send],
  monitoring: [
    "Monitoring Lapangan",
    "Workload, deadline, coverage, laporan, personel, dan insiden pada rantai komando.",
    RadioTower,
  ],
  "monitoring-task": ["Monitoring Tugas", "Progress lapangan dan laporan terkait.", RadioTower],
  "monitoring-report": ["Baket Lapangan", "Detail Baket dari konteks monitoring.", FileSearch],
  "monitoring-personnel": [
    "Profil Operasional Personel",
    "Workload, deadline, coverage, dan posisi terakhir.",
    RadioTower,
  ],
  map: ["Peta Situasi", "Seluruh Baket masuk, boundary scope, cluster, heatmap, dan alert.", MapPinned],
  "map-report": ["Baket pada Peta", "Detail laporan dan konteks spasial.", MapPinned],
  "map-alert": ["Detail Alert", "Situasi, severity, lokasi, dan tindak lanjut.", AlertTriangle],
};

function rows(value: unknown): Row[] {
  if (Array.isArray(value)) return value as Row[];
  if (value && typeof value === "object" && Array.isArray((value as Row).items)) return (value as Row).items;
  return [];
}

function fieldOfficerUserName(assignment?: Row | null) {
  const profile = assignment?.userProfile;
  return profile?.fullName ?? profile?.authUser?.name ?? profile?.username ?? "User pengirim tidak teridentifikasi";
}

function currentVersion(item: Row) {
  return Array.isArray(item.versions) ? (item.versions[0] ?? {}) : (item.currentVersion ?? {});
}

function fmtDate(value?: string) {
  return value
    ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "—";
}

function StatusBadge({ value }: { value?: string }) {
  const danger = value === "REJECTED" || value === "URGENT";
  const success = value === "VERIFIED" || value === "VALIDATED" || value?.startsWith("APPROVED");
  const label = value === "VALIDATED" ? "FINAL" : (value ?? "BELUM ADA").replaceAll("_", " ");
  return <Badge variant={danger ? "destructive" : success ? "default" : "secondary"}>{label}</Badge>;
}

function Header({ view }: { view: OimView }) {
  const [title, description, Icon] = VIEW_META[view];
  const isDashboard = view === "dashboard";
  
  return (
    <div className="flex flex-col gap-6 border-b border-border pb-6 relative z-20">
      {/* Visual group: Icon, eyebrow, title, description, actions */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          {/* Icon Container (44x44) */}
          <div 
            className="grid size-11 shrink-0 place-items-center rounded-lg border border-border bg-card"
            style={{ color: "#06B6D4" }}
          >
            <div 
              className="size-full flex items-center justify-center rounded-lg"
              style={{ backgroundColor: "#06B6D41c" }} // 11% opacity tint
            >
              <Icon className="size-5 shrink-0" style={{ strokeWidth: "2px" }} />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              OPERATIONAL INTELLIGENCE MANAGER
            </p>
            <h1 
              className={cn(
                "font-bold text-foreground tracking-tight leading-none uppercase",
                isDashboard ? "text-[44px]" : "text-[22px]"
              )}
            >
              {title}
            </h1>
            <p className="max-w-3xl text-[14px] font-medium text-muted-foreground/80 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0 self-end lg:self-start print:hidden">
          <Button 
            variant="ghost" 
            asChild
            className="border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-[150ms] ease-out rounded-lg h-10 px-4"
          >
            <Link href="/dashboard/oim/peta-situasi" className="flex items-center gap-2">
              <MapPinned className="size-4 shrink-0" style={{ strokeWidth: "2px" }} />
              <span>PETA</span>
            </Link>
          </Button>
          <Button 
            asChild
            className="bg-[#3B82F6] hover:bg-[#2563EB] text-white transition-all duration-[150ms] ease-out rounded-lg h-10 px-4 shadow-[0_4px_12px_rgba(59,130,246,0.2)] border-none"
          >
            <Link href="/dashboard/oim/produk-intelijen/buat-produk" className="flex items-center gap-2">
              <Plus className="size-4 shrink-0" style={{ strokeWidth: "2px" }} />
              <span>PRODUK</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Mission Status Strip */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] font-mono font-bold tracking-widest text-muted-foreground uppercase">
        <span className="flex items-center gap-1.5 text-[#16C784]">
          <span className="size-1.5 rounded-full bg-[#16C784] animate-pulse" />
          SYSTEM NORMAL
        </span>
        <span className="text-border">|</span>
        <span>SYNC: 1 MENIT LALU</span>
        <span className="text-border">|</span>
        <span>COMMAND SCOPE: REGIONAL</span>
        <span className="text-border">|</span>
        <span>SESSION: SECURE</span>
        <span className="text-border">|</span>
        <span className="text-muted-foreground/50">SYS REV 1.4</span>
        <span className="text-border">|</span>
        <span className="text-muted-foreground/50">COMMAND NODE: OIM-SEC-01</span>
      </div>
    </div>
  );
}

function ErrorBanner({ errors = [] }: { errors?: string[] }) {
  if (!errors.length) return null;
  return (
    <Alert>
      <AlertTriangle />
      <AlertTitle>Beberapa data belum tersedia</AlertTitle>
      <AlertDescription>
        {errors.join(" ")} Halaman tetap dapat digunakan untuk data yang berhasil dimuat.
      </AlertDescription>
    </Alert>
  );
}

function Kpis({ data }: { data: OimPageData }) {
  const bakets = rows(data.bakets);
  const verifications = rows(data.verifications);
  const analyses = rows(data.analyses);
  const products = rows(data.products);

  const cards = [
    {
      label: "Baket baru",
      value: bakets.filter((item) => item.status === "SENT_TO_OIM").length,
      hint: "Menunggu intake",
      icon: Inbox,
      colorClass: "border-t-primary/80",
      bgTint: "bg-primary/5 text-primary",
      badge: "New Intake",
    },
    {
      label: "Antrean verifikasi",
      value: verifications.filter((item) => ["DRAFT", "IN_PROGRESS"].includes(item.status)).length,
      hint: "Perlu keputusan",
      icon: Clock,
      colorClass: "border-t-primary/80",
      bgTint: "bg-primary/5 text-primary",
      badge: "Pending Decision",
    },
    {
      label: "Pengembangan",
      value: bakets.filter((item) => item.status === "NEEDS_DEVELOPMENT").length,
      hint: "Dikembalikan ke lapangan",
      icon: RefreshCw,
      colorClass: "border-t-primary/80",
      bgTint: "bg-primary/5 text-primary",
      badge: "Needs Work",
    },
    {
      label: "Analisis aktif",
      value: analyses.filter((item) => item.status !== "ARCHIVED").length,
      hint: "Draft dan review",
      icon: Activity,
      colorClass: "border-t-primary/80",
      bgTint: "bg-primary/5 text-primary",
      badge: "Active Drafts",
    },
    {
      label: "Draft produk",
      value: products.filter((item) => ["DRAFT", "NEEDS_REVISION"].includes(item.status)).length,
      hint: "Belum diajukan",
      icon: FileCheck,
      colorClass: "border-t-primary/80",
      bgTint: "bg-primary/5 text-primary",
      badge: "Unsubmitted",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.label}
            size="sm"
            className={cn(
              "border-t-2 rounded-[8px] bg-card overflow-hidden shadow-sm transition-all duration-200 hover:translate-y-[-2px] hover:shadow-md",
              card.colorClass,
            )}
          >
            <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
              <div className="space-y-1">
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80">{card.label}</p>
                <p className="text-3xl font-heading font-extrabold tracking-tight text-foreground">{card.value}</p>
              </div>
              <div className={cn("p-1.5 rounded-lg", card.bgTint)}>
                <Icon className="size-4 shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium text-muted-foreground/80">{card.hint}</span>
              </div>
              {card.value > 0 ? (
                <span className="inline-flex self-start items-center rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-primary uppercase tracking-wide">
                  {card.badge}
                </span>
              ) : (
                <span className="inline-flex self-start items-center rounded bg-secondary/80 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-muted-foreground/60 uppercase tracking-wide">
                  Clear
                </span>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Filters({ areas, mode = "baket" }: { areas?: unknown; mode?: "baket" | "verification" | "product" }) {
  const root = (areas ?? {}) as Row;
  const topLevel = rows(root.children);
  const provinces = topLevel.filter((area) => area.level === "PROVINCE");
  const [provinceId, setProvinceId] = useState("");
  const [regencyId, setRegencyId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const selectedProvince = provinces.find((area) => area.id === provinceId);
  const directRegencies = topLevel.filter((area) => ["REGENCY", "CITY"].includes(area.level));
  const regencies = selectedProvince
    ? rows(selectedProvince.children).filter((area) => ["REGENCY", "CITY"].includes(area.level))
    : directRegencies;
  const selectedRegency = regencies.find((area) => area.id === regencyId);
  const districts = selectedRegency ? rows(selectedRegency.children).filter((area) => area.level === "DISTRICT") : [];
  const areaId = districtId || regencyId || provinceId;
  const statusOptions =
    mode === "product"
      ? ["DRAFT", "READY_FOR_SUBMISSION", "SUBMITTED", "IN_REVIEW", "NEEDS_REVISION", "APPROVED", "REJECTED"]
      : mode === "verification"
        ? ["DRAFT", "IN_PROGRESS", "VERIFIED", "NEEDS_DEVELOPMENT", "REJECTED"]
        : ["SENT_TO_OIM", "UNDER_VERIFICATION", "NEEDS_DEVELOPMENT", "VERIFIED", "REJECTED"];

  return (
    <form className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2 xl:grid-cols-4" method="get">
      <input type="hidden" name="areaId" value={areaId} />
      <Input name="search" placeholder="Cari judul, isi, nomor produk…" />
      <select
        value={provinceId}
        onChange={(event) => {
          setProvinceId(event.target.value);
          setRegencyId("");
          setDistrictId("");
        }}
        className="h-9 rounded-lg border bg-background px-3 text-sm"
        aria-label="Provinsi"
      >
        <option value="">Seluruh provinsi scope</option>
        {provinces.map((area) => (
          <option key={area.id} value={area.id}>
            {area.name}
          </option>
        ))}
      </select>
      <select
        value={regencyId}
        onChange={(event) => {
          setRegencyId(event.target.value);
          setDistrictId("");
        }}
        className="h-9 rounded-lg border bg-background px-3 text-sm"
        aria-label="Kabupaten atau kota"
      >
        <option value="">Seluruh kabupaten/kota</option>
        {regencies.map((area) => (
          <option key={area.id} value={area.id}>
            {area.name}
          </option>
        ))}
      </select>
      <select
        value={districtId}
        onChange={(event) => setDistrictId(event.target.value)}
        className="h-9 rounded-lg border bg-background px-3 text-sm"
        aria-label="Kecamatan"
      >
        <option value="">Seluruh kecamatan</option>
        {districts.map((area) => (
          <option key={area.id} value={area.id}>
            {area.name}
          </option>
        ))}
      </select>
      <select name="status" className="h-9 rounded-lg border bg-background px-3 text-sm">
        <option value="">Seluruh status</option>
        {statusOptions.map((status) => (
          <option key={status}>{status}</option>
        ))}
      </select>
      <select name="urgency" className="h-9 rounded-lg border bg-background px-3 text-sm">
        <option value="">Semua urgensi</option>
        <option>NORMAL</option>
        <option>HIGH</option>
        <option>URGENT</option>
      </select>
      <Input type="date" name="periodStart" aria-label="Tanggal mulai" />
      <Input type="date" name="periodEnd" aria-label="Tanggal selesai" />
      <Button type="submit" variant="outline">
        Terapkan filter
      </Button>
    </form>
  );
}

function BaketList({ data }: { data: OimPageData }) {
  const items = rows(data.bakets);
  return (
    <div className="grid gap-6">
      {items.length ? (
        items.map((item) => {
          const version = currentVersion(item);
          const fieldOfficer = item.createdByFieldOfficerAssignment;
          return (
            <div 
              key={item.id} 
              className="rounded-[18px] bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/5 p-6 transition-all duration-[150ms] ease-out hover:translate-y-[-2px] hover:border-slate-300 dark:hover:border-white/15 cursor-pointer flex flex-col group shadow-sm dark:shadow-none"
            >
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span 
                      className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider border rounded"
                      style={{
                        color: item.status === "SENT_TO_OIM" ? "#06B6D4" : "#10B981",
                        backgroundColor: item.status === "SENT_TO_OIM" ? "#06B6D415" : "#10B98115",
                        borderColor: item.status === "SENT_TO_OIM" ? "#06B6D430" : "#10B98130",
                      }}
                    >
                      {item.status.replaceAll("_", " ")}
                    </span>
                    <span 
                      className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider border rounded"
                      style={{
                        color: version.urgency === "URGENT" ? "#EF4444" : version.urgency === "HIGH" ? "#F59E0B" : "#3B82F6",
                        backgroundColor: version.urgency === "URGENT" ? "#EF444415" : version.urgency === "HIGH" ? "#F59E0B15" : "#3B82F615",
                        borderColor: version.urgency === "URGENT" ? "#EF444430" : version.urgency === "HIGH" ? "#F59E0B30" : "#3B82F630",
                      }}
                    >
                      {version.urgency ?? "NORMAL"}
                    </span>
                    
                    <span className="text-[12px] font-mono text-slate-600 dark:text-[#7C8798] border border-slate-200 dark:border-white/10 px-2 py-0.5 rounded bg-slate-50 dark:bg-white/5 uppercase">
                      {item.reportCategory?.name ?? "KATEGORI SECURE"}
                    </span>
                    
                    <span className="text-[12px] font-mono text-slate-600 dark:text-[#7C8798] border border-slate-200 dark:border-white/10 px-2 py-0.5 rounded bg-slate-50 dark:bg-white/5 uppercase">
                      {item.jaringCluster?.name ?? "KLASTER OIM"}
                    </span>

                    <span className="text-xs text-muted-foreground/60 font-mono">v{item.currentVersionNumber}</span>
                  </div>

                  <h2 className="text-[18px] font-bold text-slate-900 dark:text-white tracking-tight">{version.title ?? "Baket tanpa judul"}</h2>
                  
                  <p className="text-[14px] text-slate-600 dark:text-[#94A3B8] leading-relaxed line-clamp-2">
                    {version.normalizedContent ?? version.originalContent ?? "Belum ada ringkasan."}
                  </p>
                  
                  <p className="text-[12px] font-mono text-slate-500 dark:text-[#7C8798] pt-1">
                    PETUGAS: {fieldOfficerUserName(fieldOfficer).toUpperCase()} · {administrativeAreaLabel(version.eventArea).toUpperCase()} · {fmtDate(item.updatedAt).toUpperCase()}
                  </p>
                </div>
                
                <Button 
                  asChild 
                  variant="ghost"
                  className="border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-[#06B6D4]/50 bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white rounded-lg h-10 px-4 transition-all duration-[150ms] ease-out shrink-0"
                >
                  <Link href={`/dashboard/oim/laporan-masuk/${item.id}`} className="flex items-center gap-2">
                    <span>TINJAU</span>
                    <ArrowRight className="size-4" style={{ strokeWidth: "2px" }} />
                  </Link>
                </Button>
              </div>
            </div>
          );
        })
      ) : (
        <div className="rounded-[18px] bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/5 p-8 flex flex-col items-center justify-center text-center space-y-4 select-none min-h-[220px] shadow-sm dark:shadow-none">
          <div className="size-12 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-muted-foreground/60 border border-slate-200 dark:border-white/10">
            <Inbox className="size-6" style={{ strokeWidth: "2px" }} />
          </div>
          <div className="space-y-1">
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">TIDAK ADA INTAKE AKTIF</h3>
            <p className="text-[13px] text-slate-600 dark:text-[#94A3B8]">Semua laporan intelijen telah selesai diproses.</p>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => window.location.reload()}
            className="border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-[#06B6D4]/50 bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-xs text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white rounded-md h-8 px-3 flex items-center gap-1.5 transition-all duration-[150ms]"
          >
            <RefreshCw className="size-3.5" style={{ strokeWidth: "2px" }} />
            <span>SINKRONKAN</span>
          </Button>
        </div>
      )}
    </div>
  );
}

function ReportStatusTabs({ activeStatus }: { activeStatus?: string }) {
  const tabs = [
    ["SENT_TO_OIM", "Baru"],
    ["UNDER_VERIFICATION", "Sedang Diverifikasi"],
    ["NEEDS_DEVELOPMENT", "Perlu Pengembangan"],
    ["VERIFIED,REJECTED", "Selesai"],
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map(([status, label]) => (
        <Button key={status} variant={activeStatus === status ? "default" : "outline"} asChild>
          <Link
            href={`/dashboard/oim/laporan-masuk?${status.includes(",") ? `statuses=${status}` : `status=${status}`}`}
          >
            {label}
          </Link>
        </Button>
      ))}
    </div>
  );
}

function BaketDetail({ item, activeTab }: { item?: unknown; activeTab?: string }) {
  const baket = (item ?? {}) as Row;
  const versions = rows(baket.versions);
  const version = versions[0] ?? {};
  const fieldOfficer = (baket.createdByFieldOfficerAssignment ?? {}) as Row;
  const sourceMessages = rows(version.sourceMessages);
  const evidenceCandidates = [
    ...rows(version.attachments),
    ...sourceMessages.flatMap((source) => rows(source.message?.media)),
  ];
  const seenFileIds = new Set<string>();
  const evidence = evidenceCandidates.filter((entry) => {
    const fileId = entry.fileId ?? entry.file?.id;
    if (!fileId || seenFileIds.has(fileId)) return false;
    seenFileIds.add(fileId);
    return true;
  });
  const primaryPhoto = evidence.find((entry) => String(entry.file?.mimeType ?? "").startsWith("image/"));
  const hasCoordinates =
    version.latitude !== null &&
    version.latitude !== undefined &&
    version.longitude !== null &&
    version.longitude !== undefined;
  const coordinates = hasCoordinates ? `${version.latitude}, ${version.longitude}` : null;
  const eventAreaLabel = administrativeAreaLabel(version.eventArea);
  const defaultTab = ["information", "evidence", "verification", "history"].includes(activeTab ?? "")
    ? activeTab
    : "information";
  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList>
        <TabsTrigger value="information">Informasi</TabsTrigger>
        <TabsTrigger value="evidence">Bukti & Lokasi</TabsTrigger>
        <TabsTrigger value="verification">Verifikasi & Neraca</TabsTrigger>
        <TabsTrigger value="history">Riwayat versi</TabsTrigger>
      </TabsList>
      <TabsContent value="information" className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex gap-2">
              <StatusBadge value={baket.status} />
              <StatusBadge value={version.urgency} />
              <Badge variant="outline">{baket.reportCategory?.name ?? "Kategori legacy"}</Badge>
              <Badge variant="outline">
                {baket.jaringCluster?.name ?? baket.primaryJaring?.cluster?.name ?? "Klaster legacy"}
              </Badge>
            </div>
            <CardTitle>{version.title ?? "Baket"}</CardTitle>
            <CardDescription>
              {eventAreaLabel} · {fmtDate(version.eventTime)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="whitespace-pre-wrap leading-7">
              {version.normalizedContent ?? version.originalContent ?? "—"}
            </div>
            <Separator />
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Field Officer pengirim</dt>
                <dd className="mt-1 flex items-center gap-2 font-medium">
                  <UserRound className="size-4" />
                  {fieldOfficerUserName(fieldOfficer)}
                </dd>
                <dd className="text-xs text-muted-foreground">{fieldOfficer.position?.title ?? "Petugas Organik"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Jaring sumber</dt>
                <dd className="mt-1 font-medium">
                  {baket.primaryJaring?.aliasName ?? baket.primaryJaring?.code ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Waktu kejadian</dt>
                <dd className="mt-1 font-medium">{fmtDate(version.eventTime)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">GPS lokasi</dt>
                <dd className="mt-1 font-medium">{coordinates ?? "Koordinat tidak tersedia"}</dd>
                {coordinates ? (
                  <a
                    className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    href={`https://www.google.com/maps?q=${version.latitude},${version.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MapPin className="size-3" /> Buka di Google Maps
                  </a>
                ) : null}
              </div>
            </dl>
            {primaryPhoto ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Foto bukti</p>
                <img
                  src={`/api/files/${primaryPhoto.fileId ?? primaryPhoto.file?.id}`}
                  alt={primaryPhoto.file?.originalName ?? "Foto bukti laporan Baket"}
                  className="max-h-96 w-full rounded-lg border bg-muted object-contain"
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Kontrol intake</CardTitle>
            <CardDescription>Canonical verification dibuat satu kali untuk versi aktif.</CardDescription>
          </CardHeader>
          <CardContent>
            <StartVerification baket={baket} version={version} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="evidence">
        <Card>
          <CardContent className="space-y-5 py-4">
            <BaketAdministrativeArea area={version.eventArea} />
            {hasCoordinates ? (
              <div className="space-y-2">
                <div>
                  <p className="font-medium">Peta lokasi kejadian</p>
                  <p className="text-sm text-muted-foreground">
                    {eventAreaLabel} · {coordinates}
                  </p>
                </div>
                <div className="overflow-hidden rounded-xl border bg-muted">
                  <BaketLocationMap
                    latitude={Number(version.latitude)}
                    longitude={Number(version.longitude)}
                    title={version.title ?? "Lokasi Baket"}
                    areaLabel={eventAreaLabel}
                  />
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Koordinat lokasi tidak tersedia.
              </p>
            )}
            {evidence.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {evidence.map((entry) => {
                  const file = (entry.file ?? {}) as Row;
                  const fileId = entry.fileId ?? file.id;
                  const isImage = String(file.mimeType ?? "").startsWith("image/");
                  return (
                    <div key={fileId} className="overflow-hidden rounded-lg border">
                      {isImage ? (
                        <img
                          src={`/api/files/${fileId}`}
                          alt={file.originalName ?? "Foto bukti Baket"}
                          className="aspect-video w-full bg-muted object-cover"
                        />
                      ) : null}
                      <div className="p-3">
                        <p className="font-medium">{file.originalName ?? fileId}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.caption ?? file.mimeType ?? "Bukti Baket"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground">Tidak ada foto atau lampiran bukti.</p>
            )}
            {sourceMessages.map((source) => (
              <div key={source.messageId} className="rounded-lg border p-3">
                <p className="font-medium">
                  Pesan sumber · {source.message?.jaring?.aliasName ?? source.message?.jaring?.code ?? "Jaring"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {source.message?.content ?? "Isi sumber tidak tersedia"}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Pengirim {source.message?.senderPhone ?? "-"} · {fmtDate(source.message?.receivedAt)} ·{" "}
                  {rows(source.message?.media).length} media
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  GPS {source.message?.latitude ?? "-"}, {source.message?.longitude ?? "-"} · akurasi{" "}
                  {source.message?.gpsAccuracyMeters ?? "-"} meter
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="verification" className="space-y-4">
        {version.verification ? (
          <VerificationEditor item={{ ...version.verification, baketVersion: { ...version, baket } }} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Mulai Neraca Penilaian</CardTitle>
              <CardDescription>
                Canonical verification dibuat satu kali untuk versi aktif dan dilanjutkan dari halaman ini.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StartVerification baket={baket} version={version} />
            </CardContent>
          </Card>
        )}
      </TabsContent>
      <TabsContent value="history">
        <Card>
          <CardContent className="divide-y py-2">
            {versions.map((entry) => (
              <Link
                key={entry.id}
                className="flex items-center justify-between py-3 hover:text-primary"
                href={`/dashboard/oim/laporan-masuk/${baket.id}/versions/${entry.id}`}
              >
                <span>
                  Versi {entry.versionNumber} · {entry.title}
                </span>
                <span className="text-xs">{fmtDate(entry.createdAt)}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function StartVerification({ baket, version }: { baket: Row; version: Row }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const existing = Boolean(version.verification);
  const disabled = !["SENT_TO_OIM", "UNDER_VERIFICATION"].includes(baket.status) || !version.id;
  return (
    <Button
      disabled={disabled || pending}
      className="w-full"
      onClick={() =>
        start(async () => {
          try {
            if (!existing) {
              await apiBrowserMutation<Row>("POST", `/baket-versions/${version.id}/verification`, {
                summary: "Intake OIM dimulai",
              });
            }
            router.push(`/dashboard/oim/laporan-masuk/${baket.id}?tab=verification`);
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Gagal memulai verifikasi");
          }
        })
      }
    >
      <ClipboardCheck />
      {pending ? "Memproses…" : disabled ? "Keputusan sudah final" : "Mulai verifikasi"}
    </Button>
  );
}

function VerificationEditor({ item }: { item?: unknown }) {
  const verification = (item ?? {}) as Row;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [reliability, setReliability] = useState(verification.sourceReliability ?? "");
  const [credibility, setCredibility] = useState(verification.informationCredibility ?? "");
  const [summary, setSummary] = useState(verification.summary ?? "");
  const locked = ["VERIFIED", "NEEDS_DEVELOPMENT", "REJECTED"].includes(verification.status);
  const act = (fn: () => Promise<unknown>) =>
    start(async () => {
      try {
        await fn();
        toast.success("Keputusan tersimpan");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Operasi gagal");
      }
    });
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <div>
        <Card>
          <CardHeader>
            <div className="flex justify-between">
              <CardTitle>Matriks penilaian</CardTitle>
              <StatusBadge value={verification.status} />
            </div>
            <CardDescription>Nilai A–F mengukur keandalan sumber; 1–6 mengukur kredibilitas informasi.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Keandalan sumber</Label>
              <select
                disabled={locked}
                value={reliability}
                onChange={(event) => setReliability(event.target.value)}
                className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
              >
                <option value="">Pilih A–F</option>
                {["A", "B", "C", "D", "E", "F"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Kredibilitas informasi</Label>
              <select
                disabled={locked}
                value={credibility}
                onChange={(event) => setCredibility(event.target.value)}
                className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
              >
                <option value="">Pilih 1–6</option>
                {[
                  ["ONE", "1"],
                  ["TWO", "2"],
                  ["THREE", "3"],
                  ["FOUR", "4"],
                  ["FIVE", "5"],
                  ["SIX", "6"],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label>Alasan dan interpretasi</Label>
              <Textarea
                disabled={locked}
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                className="mt-2 min-h-28"
              />
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Keputusan</CardTitle>
          <CardDescription>Keputusan final membuat hasil dan Baket immutable.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-xs text-muted-foreground">Skor</p>
            <p className="mt-1 text-3xl font-semibold">
              {reliability || "–"}
              {({ ONE: "1", TWO: "2", THREE: "3", FOUR: "4", FIVE: "5", SIX: "6" } as Row)[credibility] ?? "–"}
            </p>
          </div>
          <Button
            disabled={locked || pending || !reliability || !credibility}
            variant="success"
            className="w-full"
            onClick={() =>
              act(async () => {
                if (verification.status === "DRAFT")
                  await apiBrowserMutation("POST", `/verifications/${verification.id}/start`);
                await apiBrowserMutation("PATCH", `/verifications/${verification.id}`, {
                  sourceReliability: reliability,
                  informationCredibility: credibility,
                  summary,
                });
                await apiBrowserMutation("POST", `/verifications/${verification.id}/complete`, {
                  decision: "VERIFIED",
                  summary,
                });
              })
            }
          >
            <CheckCircle2 />
            Terverifikasi
          </Button>
          <Button
            disabled={locked || pending}
            variant="warning"
            className="w-full"
            onClick={() =>
              act(() =>
                apiBrowserMutation("POST", `/verifications/${verification.id}/needs-development`, {
                  reason: summary || "Perlu pengembangan",
                  requiredInformation: "Lengkapi fakta, lokasi, dan evidence pendukung.",
                }),
              )
            }
          >
            Perlu pengembangan
          </Button>
          <Button
            disabled={locked || pending}
            variant="destructive"
            className="w-full"
            onClick={() =>
              act(() =>
                apiBrowserMutation("POST", `/verifications/${verification.id}/reject`, {
                  reason: summary || "Informasi tidak memenuhi standar verifikasi.",
                }),
              )
            }
          >
            Tolak
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AnalysisList({ data }: { data: OimPageData }) {
  const items = rows(data.analyses);
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <Card key={item.id} size="sm">
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <StatusBadge value={item.status} />
              <h2 className="mt-2 font-medium">{item.title}</h2>
              <p className="text-xs text-muted-foreground">
                {item._count?.sources ?? 0} sumber · versi {item.currentVersionNumber}
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href={`/dashboard/oim/analisis-intelijen/${item.id}`}>Buka</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AnalysisCreate({ data }: { data: OimPageData }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const sources = rows(data.verifications).filter((item) => item.status === "VERIFIED");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mulai dari sumber terverifikasi</CardTitle>
        <CardDescription>
          Hanya canonical verification berstatus VERIFIED dalam scope OIM yang dapat dipilih.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <Label htmlFor="analysis-title">Judul analisis</Label>
          <Input
            id="analysis-title"
            className="mt-2"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Sumber Baket</Label>
          {sources.length ? (
            sources.map((source) => {
              const id = String(source.id);
              return (
                <label htmlFor={`source-${id}`} key={id} className="flex items-start gap-3 rounded-lg border p-3">
                  <Checkbox
                    id={`source-${id}`}
                    checked={selected.includes(id)}
                    onCheckedChange={(checked) =>
                      setSelected((state) => (checked ? [...state, id] : state.filter((value) => value !== id)))
                    }
                  />
                  <span>
                    <b className="block text-sm">{source.baketVersion?.title ?? "Baket terverifikasi"}</b>
                    <span className="text-muted-foreground text-xs">
                      {administrativeAreaLabel(source.baketVersion?.eventArea)}
                    </span>
                  </span>
                </label>
              );
            })
          ) : (
            <p className="rounded-lg border border-dashed p-6 text-muted-foreground text-sm">
              Belum ada Baket terverifikasi dalam scope Anda.
            </p>
          )}
        </div>
        <Button
          disabled={pending || !title.trim() || selected.length === 0}
          onClick={() =>
            start(async () => {
              try {
                const created = await apiBrowserMutation<Row>("POST", "/analysis-cases", {
                  title,
                  verificationIds: selected,
                });
                router.push(`/dashboard/oim/analisis-intelijen/${created.id}`);
                toast.success("Case analisis dibuat");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Gagal membuat analisis");
              }
            })
          }
        >
          <Plus />
          {pending ? "Membuat…" : "Buat case analisis"}
        </Button>
      </CardContent>
    </Card>
  );
}

function AnalysisWorkspace({ item }: { item?: unknown }) {
  const analysisCase = (item ?? {}) as Row;
  const version = currentVersion(analysisCase);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    indications: version.indications ?? "",
    analysis: version.analysis ?? "",
    impact: version.impact ?? "",
    efforts: version.efforts ?? "",
    recommendations: version.recommendations ?? "",
  });
  const locked = analysisCase.status === "VALIDATED" || analysisCase.status === "ARCHIVED";
  const mutate = (key: keyof typeof form, value: string) => setForm((state) => ({ ...state, [key]: value }));
  const sectionLabels = {
    indications: "Indikasi",
    analysis: "Analisis",
    impact: "Dampak",
    efforts: "Upaya",
    recommendations: "Saran Tindak",
  };
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader>
          <div className="flex justify-between">
            <CardTitle>{analysisCase.title ?? "Analisis baru"}</CardTitle>
            <StatusBadge value={analysisCase.status} />
          </div>
          <CardDescription>Sintesis manual. Seluruh perubahan tercatat pada versi aktif.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="indications">
            <TabsList className="flex-wrap">
              {Object.entries(sectionLabels).map(([key, label]) => (
                <TabsTrigger key={key} value={key}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            {Object.entries(sectionLabels).map(([key, label]) => (
              <TabsContent key={key} value={key}>
                <Label>{label}</Label>
                <Textarea
                  disabled={locked}
                  className="mt-2 min-h-72 leading-7"
                  value={form[key as keyof typeof form]}
                  onChange={(event) => mutate(key as keyof typeof form, event.target.value)}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Simpan analisis</CardTitle>
            <CardDescription>
              Analisis final akan dikunci dan dapat dipakai untuk membuat Produk Intelijen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              disabled={locked || pending || !version.id}
              variant="outline"
              className="w-full"
              onClick={() =>
                start(async () => {
                  try {
                    await apiBrowserMutation("PATCH", `/analysis-versions/${version.id}`, form);
                    toast.success("Draft tersimpan");
                    router.refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Gagal menyimpan");
                  }
                })
              }
            >
              Simpan draft
            </Button>
            <Button
              disabled={locked || pending || !version.id}
              variant="success"
              className="w-full"
              onClick={() =>
                start(async () => {
                  try {
                    await apiBrowserMutation("POST", `/analysis-cases/${analysisCase.id}/finalize`, form);
                    toast.success("Analisis difinalkan dan dikunci");
                    router.refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Gagal memfinalkan analisis");
                  }
                })
              }
            >
              <CheckCircle2 />
              Finalkan analisis
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Baket sumber</CardTitle>
            <CardDescription>Informasi asal tetap melekat pada hasil analisis.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows(analysisCase.sources).map((source, index) => {
              const baketVersion = source.verification?.baketVersion ?? {};
              const fieldOfficer = baketVersion.baket?.createdByFieldOfficerAssignment;
              return (
                <div key={source.verificationId ?? index} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">
                    {index + 1}. {baketVersion.title ?? "Baket"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {administrativeAreaLabel(baketVersion.eventArea)} · {fieldOfficerUserName(fieldOfficer)}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProductList({ data, approval = false }: { data: OimPageData; approval?: boolean }) {
  const items = rows(data.products).filter(
    (item) =>
      !approval || ["DRAFT", "READY_FOR_SUBMISSION", "NEEDS_REVISION", "UNDER_REGIONAL_REVIEW"].includes(item.status),
  );
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <Card key={item.id} size="sm">
          <CardContent className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <div className="flex items-start gap-3">
              <div className="grid size-10 place-items-center rounded-lg bg-primary/10">
                <FileText className="size-5 text-primary" />
              </div>
              <div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge value={item.classification} />
                  <StatusBadge value={item.status} />
                </div>
                <h2 className="mt-2 font-medium">{item.title}</h2>
                <p className="font-mono text-xs text-muted-foreground">
                  {item.productNumber} · {item.productType?.name ?? "Laporan Intelijen"}
                </p>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link
                href={
                  approval
                    ? `/dashboard/oim/pengajuan-persetujuan/${item.id}`
                    : `/dashboard/oim/produk-intelijen/daftar-produk/${item.id}`
                }
              >
                {approval ? "Siapkan pengajuan" : "Buka"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

type JournalRow = {
  NO_URUT: number;
  PERMASALAHAN_AGENDA: string;
  DAERAH_KEJADIAN: string;
  MATERI_SUMBER: string;
};

function buildJournalRows(analysisCase: Row | null): JournalRow[] {
  return rows(analysisCase?.sources).map((source, index) => {
    const version = source.verification?.baketVersion ?? {};
    const fieldOfficer = version.baket?.createdByFieldOfficerAssignment;
    const officerName = fieldOfficerUserName(fieldOfficer);
    return {
      NO_URUT: index + 1,
      PERMASALAHAN_AGENDA: version.title ?? "Baket tanpa judul",
      DAERAH_KEJADIAN: administrativeAreaLabel(version.eventArea),
      MATERI_SUMBER: `${version.originalContent ?? "-"}\n\nSumber: ${officerName}`,
    };
  });
}

function JournalTable({ items }: { items: JournalRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr>
            <th className="w-14 border border-current p-2 text-center">No Urut</th>
            <th className="border border-current p-2 text-center">Permasalahan dan Agenda</th>
            <th className="w-36 border border-current p-2 text-center">Daerah Kejadian</th>
            <th className="border border-current p-2 text-center">Materi Informasi dan Sumber</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={`${item.NO_URUT}-${item.PERMASALAHAN_AGENDA}`}>
              <td className="border border-current p-2 text-center align-top">{item.NO_URUT}</td>
              <td className="border border-current p-2 align-top">{item.PERMASALAHAN_AGENDA}</td>
              <td className="border border-current p-2 align-top">{item.DAERAH_KEJADIAN}</td>
              <td className="whitespace-pre-wrap border border-current p-2 align-top">{item.MATERI_SUMBER}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ANALYSIS_CONTENT_BY_SECTION: Record<string, string> = {
  INDIKASI: "indications",
  ANALISIS: "analysis",
  DAMPAK: "impact",
  UPAYA: "efforts",
  SARAN_TINDAK: "recommendations",
};

function templateFieldKey(sectionCode: string, fieldCode: string) {
  return `${sectionCode}.${fieldCode}`;
}

function initialTemplateValues(template: Row | null, analysisVersion: Row) {
  const values: Record<string, string> = {};

  for (const section of rows(template?.sections)) {
    if (section.isRepeatable) continue;
    for (const field of rows(section.fields)) {
      const analysisField = ANALYSIS_CONTENT_BY_SECTION[section.code];
      values[templateFieldKey(section.code, field.code)] = analysisField
        ? String(analysisVersion[analysisField] ?? "")
        : "";
    }
  }

  return values;
}

function buildProductContent(template: Row | null, fieldValues: Record<string, string>, journalItems: JournalRow[]) {
  const content: Row = {};

  for (const section of rows(template?.sections)) {
    if (section.isRepeatable) {
      content[section.code] = journalItems;
      continue;
    }

    content[section.code] = Object.fromEntries(
      rows(section.fields).map((field) => [field.code, fieldValues[templateFieldKey(section.code, field.code)] ?? ""]),
    );
  }

  return content;
}

function templateContentComplete(
  template: Row | null,
  fieldValues: Record<string, string>,
  journalItems: JournalRow[],
) {
  if (!template) return false;

  return rows(template.sections).every((section) => {
    if (section.isRepeatable) return journalItems.length > 0;
    return rows(section.fields).every(
      (field) => !field.isRequired || Boolean(fieldValues[templateFieldKey(section.code, field.code)]?.trim()),
    );
  });
}

function ProductBuilder({ data }: { data: OimPageData }) {
  const productTypes = rows(data.productTypes)
    .slice()
    .sort((left, right) => Number(left.formatNo ?? 0) - Number(right.formatNo ?? 0));
  const analyses = rows(data.analyses).filter((item) => item.status === "VALIDATED");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selectedProductTypeId, setSelectedProductTypeId] = useState("");
  const [template, setTemplate] = useState<Row | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [analysisCase, setAnalysisCase] = useState<Row | null>(null);
  const [classification, setClassification] = useState("TERBATAS");
  const [title, setTitle] = useState("");
  const selectedProductType = productTypes.find((item) => item.id === selectedProductTypeId) ?? null;
  const isJournal = selectedProductType?.code === "JURNAL_INFORMASI";
  const journalRows = buildJournalRows(analysisCase);
  const analysisVersion = analysisCase ? currentVersion(analysisCase) : {};
  const productContent = buildProductContent(template, fieldValues, journalRows);

  // Workflow states
  const [activeStep, setActiveStep] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [expandedSections, setExpandedSections] = useState({
    laporan: true,
    metadata: false,
    isi: false,
  });

  useEffect(() => {
    if (!selectedProductTypeId) {
      setTemplate(null);
      setFieldValues({});
      return;
    }

    let isActive = true;
    setTemplate(null);
    setFieldValues({});
    apiBrowserFetch<Row[]>(`/product-types/${selectedProductTypeId}/templates`, { query: { activeOnly: true } })
      .then((templates) => {
        if (isActive) setTemplate(templates[0] ?? null);
      })
      .catch(() => {
        if (isActive) setTemplate(null);
      });
    return () => {
      isActive = false;
    };
  }, [selectedProductTypeId]);

  useEffect(() => {
    setFieldValues(initialTemplateValues(template, analysisVersion));
  }, [template, analysisVersion.id]);

  const selectAnalysis = async (caseId: string) => {
    if (!caseId) {
      setAnalysisCase(null);
      setTitle("");
      return;
    }
    try {
      const detail = await apiBrowserFetch<Row>(`/analysis-cases/${caseId}`);
      setAnalysisCase(detail);
      setTitle(String(detail.title ?? ""));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memuat analisis final");
    }
  };

  const saveProduct = (submit: boolean) =>
    start(async () => {
      if (!template || !selectedProductTypeId || !analysisVersion.id) return;
      try {
        const result = await apiBrowserMutation<Row>("POST", "/products", {
          productTypeId: selectedProductTypeId,
          classification,
          title,
          version: {
            templateId: template.id,
            routingTo: "Regional Commander",
            routingFrom: "Operational Intelligence Manager",
            subject: title,
            content: productContent,
            sourceAnalysisVersionIds: [analysisVersion.id],
          },
        });
        const version = currentVersion(result);
        if (submit) {
          await apiBrowserMutation("POST", `/products/${result.id}/submit`, {
            versionId: version.id,
            confirmation: "SUBMIT",
          });
          toast.success("Produk final dikirim ke Regional Commander");
        } else {
          toast.success("Draft Produk Intelijen tersimpan");
        }
        router.push(`/dashboard/oim/produk-intelijen/daftar-produk/${result.id}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menyimpan Produk Intelijen");
      }
    });

  const canSave = Boolean(
    selectedProductTypeId &&
      template &&
      analysisVersion.id &&
      title.trim() &&
      templateContentComplete(template, fieldValues, journalRows),
  );

  return (
    <div className="space-y-6 pb-6 select-none">
      <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-[minmax(0,9fr)_minmax(0,16fr)]">
        {/* KIRI: Editor Panel */}
        <div className="min-w-0 space-y-4">
          {/* Step indicator */}
          <div className="rounded-lg border border-border/80 bg-card/80 p-3 shadow-sm">
            <div className="flex items-center justify-between gap-1">
              {[
                { num: 1, label: "Tipe Laporan" },
                { num: 2, label: "Metadata" },
                { num: 3, label: "Isi Dokumen" },
              ].map((s) => {
                const isActive = activeStep === s.num;
                return (
                  <button
                    type="button"
                    key={s.num}
                    onClick={() => {
                      setActiveStep(s.num);
                      setExpandedSections({
                        laporan: s.num === 1,
                        metadata: s.num === 2,
                        isi: s.num === 3,
                      });
                    }}
                    className={cn(
                      "flex-1 flex items-center gap-1.5 text-left pb-1 border-b-2 transition-all duration-150 cursor-pointer",
                      isActive
                        ? "border-primary text-foreground font-bold"
                        : "border-transparent text-muted-foreground/60 hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "size-4 rounded-full flex items-center justify-center text-[9px] font-mono",
                        isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {s.num}
                    </span>
                    <span className="text-[10px] font-mono tracking-tight leading-none truncate">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form container */}
          <Card className="flex h-[680px] flex-col overflow-hidden rounded-lg border-border/80 bg-card/85 shadow-lg">
            <div className="flex shrink-0 items-center justify-between border-b border-border/40 bg-secondary/10 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70">
              <span>Editor Laporan Intelijen</span>
              <span className="text-[8px] font-bold text-sky-400 bg-sky-950/40 border border-sky-800/40 px-1 py-0.2">
                OIM-BUILDER
              </span>
            </div>

            <div className="no-scrollbar flex-1 space-y-8 overflow-y-auto p-4">
              {/* SECTION 1: Laporan & Analisis */}
              <div className="border border-border/60 rounded-[4px] bg-secondary/5 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedSections((prev) => ({ ...prev, laporan: !prev.laporan }))}
                  className="w-full flex items-center justify-between p-3 bg-secondary/15 hover:bg-secondary/25 transition-colors font-mono text-[10px] font-bold text-foreground"
                >
                  <span>[SECTION 01] TIPE LAPORAN & SUMBER ANALISIS</span>
                  <span>{expandedSections.laporan ? "▼" : "▶"}</span>
                </button>

                {expandedSections.laporan && (
                  <div className="p-4 space-y-[20px] border-t border-border/40 bg-background/25">
                    <div className="space-y-1">
                      <Label
                        htmlFor="product-type"
                        className="text-[12px] uppercase font-mono tracking-wider font-semibold text-muted-foreground"
                      >
                        Jenis Laporan
                      </Label>
                      <select
                        id="product-type"
                        value={selectedProductTypeId}
                        onChange={(event) => setSelectedProductTypeId(event.target.value)}
                        className="mt-1 h-11 w-full rounded-[4px] border border-border bg-background px-3 text-xs"
                      >
                        <option value="">Pilih jenis laporan</option>
                        {productTypes.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label
                        htmlFor="product-analysis"
                        className="text-[12px] uppercase font-mono tracking-wider font-semibold text-muted-foreground"
                      >
                        Sumber Analisis Final
                      </Label>
                      <select
                        id="product-analysis"
                        value={analysisCase?.id ?? ""}
                        onChange={(event) => void selectAnalysis(event.target.value)}
                        className="mt-1 h-11 w-full rounded-[4px] border border-border bg-background px-3 text-xs"
                      >
                        <option value="">Pilih analisis</option>
                        {analyses.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.title} · {item._count?.sources ?? 0} Baket
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: Metadata */}
              <div className="border border-border/60 rounded-[4px] bg-secondary/5 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedSections((prev) => ({ ...prev, metadata: !prev.metadata }))}
                  className="w-full flex items-center justify-between p-3 bg-secondary/15 hover:bg-secondary/25 transition-colors font-mono text-[10px] font-bold text-foreground"
                >
                  <span>[SECTION 02] METADATA DOKUMEN</span>
                  <span>{expandedSections.metadata ? "▼" : "▶"}</span>
                </button>

                {expandedSections.metadata && (
                  <div className="p-4 space-y-[20px] border-t border-border/40 bg-background/25">
                    <div className="space-y-1">
                      <Label
                        htmlFor="product-title"
                        className="text-[12px] uppercase font-mono tracking-wider font-semibold text-muted-foreground"
                      >
                        Judul Produk
                      </Label>
                      <Input
                        id="product-title"
                        className="mt-1 h-11 rounded-[4px] text-xs"
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="Masukkan judul laporan..."
                      />
                    </div>

                    <div className="space-y-1">
                      <Label
                        htmlFor="product-classification"
                        className="text-[12px] uppercase font-mono tracking-wider font-semibold text-muted-foreground"
                      >
                        Klasifikasi Rahasia
                      </Label>
                      <select
                        id="product-classification"
                        value={classification}
                        onChange={(event) => setClassification(event.target.value)}
                        className="mt-1 h-11 w-full rounded-[4px] border border-border bg-background px-3 text-xs font-mono font-bold"
                      >
                        <option>SANGAT_RAHASIA</option>
                        <option>RAHASIA</option>
                        <option>TERBATAS</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 3: Isi Laporan */}
              <div className="border border-border/60 rounded-[4px] bg-secondary/5 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedSections((prev) => ({ ...prev, isi: !prev.isi }))}
                  className="w-full flex items-center justify-between p-3 bg-secondary/15 hover:bg-secondary/25 transition-colors font-mono text-[10px] font-bold text-foreground"
                >
                  <span>[SECTION 03] ISI KONTEN DOKUMEN</span>
                  <span>{expandedSections.isi ? "▼" : "▶"}</span>
                </button>

                {expandedSections.isi && (
                  <div className="p-4 space-y-[20px] border-t border-border/40 bg-background/25">
                    {selectedProductTypeId ? (
                      template ? (
                        isJournal ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between font-mono text-[10px]">
                              <span className="text-muted-foreground/60 uppercase">Informasi Baket</span>
                              <Badge variant="secondary" className="text-[8px]">
                                {journalRows.length} Baket
                              </Badge>
                            </div>
                            {journalRows.length ? (
                              <JournalTable items={journalRows} />
                            ) : (
                              <p className="rounded border border-dashed border-border/45 p-6 text-center text-xs text-muted-foreground">
                                Pilih analisis final untuk memuat informasi Baket.
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-[32px]">
                            <div className="flex items-center justify-between font-mono text-[10px] pb-1 border-b border-border/20">
                              <span className="text-muted-foreground/60 uppercase">Daftar Bagian Laporan</span>
                              <Badge variant="secondary" className="text-[8px]">
                                {rows(template.sections).length} Bagian
                              </Badge>
                            </div>
                            {rows(template.sections).map((section, sectionIndex) => (
                              <div
                                key={section.id ?? section.code}
                                className="rounded border border-border/45 p-4 space-y-[20px] bg-background/35"
                              >
                                <h3 className="font-mono text-[20px] font-bold text-foreground/90">
                                  [{sectionIndex + 1}] {section.title}
                                </h3>
                                <div className="space-y-[20px]">
                                  {rows(section.fields).map((field) => {
                                    const key = templateFieldKey(section.code, field.code);
                                    return (
                                      <div key={field.id ?? key} className="space-y-1">
                                        <Label
                                          htmlFor={`product-field-${key}`}
                                          className="text-[12px] uppercase font-mono tracking-wider font-semibold text-muted-foreground"
                                        >
                                          {field.label}
                                          {field.isRequired ? " *" : ""}
                                        </Label>
                                        <Textarea
                                          id={`product-field-${key}`}
                                          className="mt-1 min-h-24 text-xs rounded-[4px]"
                                          value={fieldValues[key] ?? ""}
                                          onChange={(event) =>
                                            setFieldValues((current) => ({ ...current, [key]: event.target.value }))
                                          }
                                          placeholder={`Ketik isi ${field.label.toLowerCase()}...`}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      ) : (
                        <p className="rounded border border-dashed border-border/40 p-6 text-center text-xs text-muted-foreground">
                          Memuat struktur laporan...
                        </p>
                      )
                    ) : (
                      <p className="rounded border border-dashed border-border/40 p-6 text-center text-xs text-muted-foreground">
                        Pilih jenis laporan untuk menampilkan struktur isinya.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Micro UX status bar */}
            <div className="px-3 py-1.5 border-t border-border/40 bg-secondary/15 font-mono text-[8px] text-muted-foreground/60 flex items-center justify-between shrink-0 select-none">
              <span className="flex items-center gap-1">
                <span className="size-1 bg-emerald-500 rounded-full animate-pulse" />
                AUTO SAVE // DRAFT SECURED
              </span>
              <span>VER: v1.0.0-draft // PREVIEW SYNCED</span>
            </div>
          </Card>
        </div>

        {/* KANAN: Document Workspace Preview */}
        <div className="flex h-[680px] min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-[#2c3747] bg-[#f1f5f9] dark:bg-[#1B2230] shadow-[0_24px_60px_rgba(0,0,0,0.08)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
          {/* Toolbar Preview */}
          <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-slate-200 dark:border-white/8 bg-slate-100 dark:bg-[#131C2B] px-3 font-mono text-[10px] select-none">
            <div className="flex min-w-0 items-center gap-2 text-slate-600 dark:text-[#8F9FB4]">
              <Badge
                variant="outline"
                className="shrink-0 border-slate-300 dark:border-[#324155] bg-slate-200/50 dark:bg-[#1A2434] font-mono text-[8px] uppercase text-sky-600 dark:text-sky-300"
              >
                Preview Aman
              </Badge>
              <span className="truncate">Dokumen A4 / {zoom}%</span>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon-xs"
                className="border border-slate-200 dark:border-[#324155] bg-white dark:bg-[#1A2434] text-slate-700 dark:text-[#C8D3E2] hover:bg-slate-100 dark:hover:bg-[#233248]"
                onClick={() => window.print()}
                title="Cetak dokumen"
              >
                <Printer className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                className="border border-slate-200 dark:border-[#324155] bg-white dark:bg-[#1A2434] text-slate-700 dark:text-[#C8D3E2] hover:bg-slate-100 dark:hover:bg-[#233248]"
                onClick={() => window.print()}
                title="Simpan sebagai PDF"
              >
                <FileDown className="size-3.5" />
              </Button>
              <span className="mx-0.5 h-5 w-px bg-slate-200 dark:bg-white/10" />
              <Button
                variant="ghost"
                size="icon-xs"
                className="border border-slate-200 dark:border-[#324155] bg-white dark:bg-[#1A2434] text-slate-700 dark:text-[#C8D3E2] hover:bg-slate-100 dark:hover:bg-[#233248]"
                onClick={() => setZoom((current) => Math.max(50, current - 10))}
                title="Perkecil preview"
              >
                <Minus className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="xs"
                className="h-6 min-w-11 border border-slate-200 dark:border-[#324155] bg-white dark:bg-[#1A2434] px-2 font-mono text-[9px] text-slate-700 dark:text-[#C8D3E2] hover:bg-slate-100 dark:hover:bg-[#233248]"
                onClick={() => setZoom(100)}
                title="Zoom 100%"
              >
                {zoom}%
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                className="border border-slate-200 dark:border-[#324155] bg-white dark:bg-[#1A2434] text-slate-700 dark:text-[#C8D3E2] hover:bg-slate-100 dark:hover:bg-[#233248]"
                onClick={() => setZoom((current) => Math.min(150, current + 10))}
                title="Perbesar preview"
              >
                <Plus className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="xs"
                className="hidden h-6 border border-slate-200 dark:border-[#324155] bg-white dark:bg-[#1A2434] px-2 font-mono text-[9px] text-slate-700 dark:text-[#C8D3E2] hover:bg-slate-100 dark:hover:bg-[#233248] sm:inline-flex"
                onClick={() => setZoom(90)}
                title="Sesuaikan lebar preview"
              >
                <Maximize2 className="size-3" />
                Fit
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                className="border border-slate-200 dark:border-[#324155] bg-white dark:bg-[#1A2434] text-slate-700 dark:text-[#C8D3E2] hover:bg-slate-100 dark:hover:bg-[#233248]"
                onClick={() => {
                  setZoom((current) => current + 0.1);
                  setTimeout(() => setZoom((current) => Math.floor(current)), 50);
                }}
                title="Segarkan preview"
              >
                <RefreshCw className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* Document Preview Canvas */}
          <ProductPreview
            classification={classification}
            title={title}
            productTypeName={selectedProductType?.name ?? "Laporan Intelijen"}
            template={template}
            content={productContent}
            items={journalRows}
            isJournal={isJournal}
            zoom={zoom}
          />
        </div>
      </div>

      {/* Sticky Bottom Actions Bar */}
      <div className="sticky bottom-0 z-50 flex min-h-16 w-full flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-white/6 bg-white/95 dark:bg-[#131C2B] px-4 py-3 shadow-lg dark:shadow-[0_-12px_32px_rgba(0,0,0,0.18)] backdrop-blur-md select-none sm:h-16 sm:flex-nowrap sm:px-6 sm:py-4">
        {/* LEFT Section Status */}
        <div className="flex min-w-0 items-center gap-3 text-[10px] font-mono text-slate-600 dark:text-[#8F9FB4] select-none sm:gap-4">
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Draft Saved
          </span>
          <span className="hidden text-slate-200 dark:text-white/10 sm:inline">|</span>
          <span className="hidden sm:inline">Last Save: 09:42</span>
          <span className="hidden text-slate-200 dark:text-white/10 md:inline">|</span>
          <span className="hidden md:inline">Version: v1.0.3</span>
          <span className="hidden text-slate-200 dark:text-white/10 lg:inline">|</span>
          <span className="hidden lg:inline">
            Auto Save: <span className="text-emerald-600 dark:text-emerald-400 font-bold">ON</span>
          </span>
        </div>

        {/* RIGHT Section Actions */}
        <div className="ml-auto flex items-center gap-2">
          {/* Tertiary Button: Kembali */}
          <Button
            variant="outline"
            className="h-9 rounded-[4px] border border-slate-300 dark:border-[#2D394A] bg-transparent px-3 font-mono text-xs text-slate-600 dark:text-[#8F9FB4] transition-all duration-200 hover:scale-[1.02] hover:bg-slate-100 dark:hover:bg-[#161E2A] active:scale-[0.98] sm:px-4"
            onClick={() => router.push("/dashboard/oim/produk-intelijen/daftar-produk")}
          >
            Kembali
          </Button>

          {/* Secondary Button: Simpan Draft */}
          <Button
            disabled={pending || !canSave}
            variant="outline"
            className="h-9 rounded-[4px] border border-slate-300 dark:border-[#3A4657] bg-transparent px-3 font-mono text-xs text-slate-700 dark:text-[#C8D3E2] transition-all duration-200 hover:scale-[1.02] hover:bg-slate-100 dark:hover:bg-[#1A2434] active:scale-[0.98] active:bg-slate-200 dark:active:bg-[#141C28] sm:px-4"
            onClick={() => saveProduct(false)}
          >
            <FileText className="size-3.5 mr-1" />
            Simpan Draft
          </Button>

          {/* Primary Button: Final & Teruskan */}
          <Button
            disabled={pending || !canSave}
            variant="success"
            className="h-9 rounded-[4px] px-3 font-mono text-xs font-bold transition-transform hover:scale-[1.02] active:scale-[0.98] sm:px-5"
            onClick={() => saveProduct(true)}
          >
            <Send className="size-3.5 mr-1" />
            Final & Teruskan
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProductPreview({
  classification,
  title,
  productTypeName,
  template,
  content,
  items,
  isJournal,
  zoom,
}: {
  classification: string;
  title: string;
  productTypeName: string;
  template: Row | null;
  content: Row;
  items: JournalRow[];
  isJournal: boolean;
  zoom: number;
}) {
  return (
    <div className="no-scrollbar flex-1 overflow-auto bg-slate-200/50 dark:bg-[#1B2230] px-6 py-8">
      <div
        className="mx-auto w-fit origin-top transition-transform duration-200 ease-out"
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: "top center",
          width: "794px",
          height: `${1123 * (zoom / 100)}px`,
        }}
      >
        <article
          className="relative min-h-[1123px] w-[794px] select-text rounded-xl bg-white p-12 font-sans text-black shadow-[0_24px_60px_rgba(0,0,0,0.35)] print:fixed print:inset-0 print:z-50 print:m-0 print:min-h-screen print:w-full print:rounded-none print:shadow-none"
          style={{ boxShadow: "0 24px 60px rgba(0,0,0,.35)" }}
        >
          {/* Header classification */}
          <p className="text-center text-xs font-bold tracking-widest border-b border-black pb-2 select-none uppercase">
            {classification.replaceAll("_", " ")}
          </p>

          <div className="mt-10 flex justify-between text-xs font-bold font-mono">
            <div>
              REPUBLIK INDONESIA
              <br />
              BADAN INTELIJEN NEGARA
              <br />
              UNIT KERJA OPERASIONAL
            </div>
          </div>

          <h2 className="mt-12 text-center text-sm font-extrabold uppercase underline tracking-wider">
            {productTypeName}
          </h2>
          <p className="mt-2 text-center font-mono text-[10px] text-neutral-500">
            NOMOR REGISTRASI DIALOKASIKAN SAAT PENGESAHAN DOKUMEN
          </p>

          <h3 className="mt-8 text-center text-sm font-extrabold uppercase tracking-wide leading-relaxed border-t border-b border-black py-2">
            {title || "JUDUL PRODUK INTELIJEN"}
          </h3>

          <div className="mt-8 text-xs leading-6 space-y-4">
            {isJournal ? (
              <JournalTable items={items} />
            ) : (
              <div className="space-y-6">
                {rows(template?.sections).map((section, sectionIndex) => (
                  <section key={section.id ?? section.code} className="space-y-2">
                    <h4 className="font-bold border-b border-neutral-200 pb-1 text-[11px] uppercase tracking-wide">
                      {sectionIndex + 1}. {section.title}
                    </h4>
                    {rows(section.fields).map((field) => (
                      <p
                        key={field.id ?? field.code}
                        className="mt-1 whitespace-pre-wrap text-justify leading-relaxed indent-8"
                      >
                        {String(content[section.code]?.[field.code] ?? "...")}
                      </p>
                    ))}
                  </section>
                ))}
              </div>
            )}
          </div>

          <div className="mt-16 border-t border-neutral-200 pt-4 flex flex-col items-end">
            <p className="text-[10px] font-mono text-neutral-500">AUTENTIKASI DOKUMEN ELEKTRONIK</p>
            <p className="text-[10px] font-mono font-bold text-neutral-700">OIM // PENUGASAN VALID</p>
          </div>

          <p className="absolute bottom-6 left-0 right-0 text-center text-xs font-bold uppercase tracking-widest select-none border-t border-black pt-2">
            {classification.replaceAll("_", " ")}
          </p>
        </article>
      </div>
    </div>
  );
}

function ProductDetail({ item, approval = false }: { item?: unknown; approval?: boolean }) {
  const product = (item ?? {}) as Row;
  const version = currentVersion(product);
  const journalItems = rows(version.content?.ITEMS) as JournalRow[];
  const sourceAnalyses = rows(version.sourceAnalyses);
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-2">
            <StatusBadge value={product.classification} />
            <StatusBadge value={product.status} />
          </div>
          <CardTitle>{product.title ?? "Produk"}</CardTitle>
          <CardDescription className="font-mono">{product.productNumber ?? "Nomor otomatis"}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="content">
            <TabsList>
              <TabsTrigger value="content">Isi</TabsTrigger>
              <TabsTrigger value="sources">Sumber</TabsTrigger>
              <TabsTrigger value="versions">Versi</TabsTrigger>
              <TabsTrigger value="approval">Approval</TabsTrigger>
            </TabsList>
            <TabsContent value="content" className="space-y-4">
              {journalItems.length ? (
                <JournalTable items={journalItems} />
              ) : (
                Object.entries((version.content ?? {}) as Row).map(([key, value]) => (
                  <div key={key} className="rounded-lg border p-4">
                    <h3 className="font-medium">{key.replaceAll("_", " ")}</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {typeof value === "object"
                        ? String((value as Row).CONTENT ?? JSON.stringify(value))
                        : String(value)}
                    </p>
                  </div>
                ))
              )}
            </TabsContent>
            <TabsContent value="sources" className="space-y-4">
              {sourceAnalyses.map((source) => {
                const analysisVersion = source.analysisVersion ?? {};
                const analysisCase = analysisVersion.analysisCase ?? {};
                return (
                  <div key={source.analysisVersionId} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-medium">{analysisCase.title ?? "Analisis final"}</h3>
                      <StatusBadge value={analysisCase.status} />
                    </div>
                    <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                      {[
                        ["Indikasi", analysisVersion.indications],
                        ["Analisis", analysisVersion.analysis],
                        ["Dampak", analysisVersion.impact],
                        ["Upaya", analysisVersion.efforts],
                        ["Saran Tindak", analysisVersion.recommendations],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md bg-muted/40 p-3">
                          <p className="font-medium">{label}</p>
                          <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{value || "-"}</p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground">
                      {rows(analysisCase.sources).length} Baket sumber
                    </p>
                  </div>
                );
              })}
            </TabsContent>
            <TabsContent value="versions">
              {rows(product.versions).map((entry) => (
                <div key={entry.id} className="border-b py-3">
                  Versi {entry.versionNumber} · {fmtDate(entry.createdAt)}
                </div>
              ))}
            </TabsContent>
            <TabsContent value="approval">
              <p className="text-sm text-muted-foreground">
                {version.approvalWorkflow ? `Workflow ${version.approvalWorkflow.status}` : "Belum diajukan."}
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>{approval ? "Pre-submit" : "Kontrol produk"}</CardTitle>
          <CardDescription>Routing: OIM → Regional Commander → Executive (baca setelah disetujui).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex justify-between text-xs">
              <span>Kelengkapan versi</span>
              <span>{version.id ? "100%" : "0%"}</span>
            </div>
            <Progress className="mt-2" value={version.id ? 100 : 0} />
          </div>
          <Button variant="outline" className="w-full" onClick={() => window.print()}>
            <Printer />
            Print preview
          </Button>
          {approval && (
            <Button
              variant="success"
              disabled={
                pending || !version.id || !["DRAFT", "READY_FOR_SUBMISSION", "NEEDS_REVISION"].includes(product.status)
              }
              className="w-full"
              onClick={() =>
                start(async () => {
                  try {
                    await apiBrowserMutation("POST", `/products/${product.id}/submit`, {
                      versionId: version.id,
                      confirmation: "SUBMIT",
                    });
                    toast.success("Produk diajukan");
                    router.refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Pengajuan gagal");
                  }
                })
              }
            >
              <Send />
              Ajukan exact version
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function VerificationList({ data }: { data: OimPageData }) {
  const items = rows(data.verifications);
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <Card key={item.id} size="sm">
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <StatusBadge value={item.status} />
              <h2 className="mt-2 font-medium">{item.baketVersion?.title ?? "Verifikasi Baket"}</h2>
              <p className="text-xs text-muted-foreground">{administrativeAreaLabel(item.baketVersion?.eventArea)}</p>
            </div>
            <Button asChild variant="outline">
              <Link href={`/dashboard/oim/verifikasi-neraca-penilaian/${item.id}`}>
                {item.status === "DRAFT" ? "Mulai" : "Buka"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function OimWorkspaceClient({ view, data }: Props) {
  const detailBaket = ["report-detail", "monitoring-report", "map-report"].includes(view);
  
  // Extract lists for dynamic workflow mapping
  const bakets = rows(data.bakets);
  const verifications = rows(data.verifications);
  const analyses = rows(data.analyses);
  const products = rows(data.products);

  return (
    <div className="w-full min-h-screen bg-background relative text-foreground overflow-hidden">
      {/* Dynamic Tactical Grid overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.015] dark:opacity-[0.03] z-0 bg-[linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] bg-[size:24px_24px] text-foreground/5 dark:text-white/5"
      />
      
      {/* Noise Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.01] dark:opacity-[0.015] z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />

      <main className="mx-auto w-full max-w-[1600px] space-y-6 p-6 md:p-8 relative z-10">
      <Header view={view} />
      <ErrorBanner errors={data.errors} />
      {view === "dashboard" && (
        <>
          <Kpis data={data} />
          
          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr] items-start">
            {/* Left Column: Prioritas Intake */}
            <div className="space-y-4">
              {/* SECTION HEADER */}
              <div className="space-y-1.5 border-b border-slate-200 dark:border-white/10 pb-4">
                <h3 className="text-[15px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">PRIORITAS INTAKE</h3>
                <p className="text-[12px] font-medium text-slate-500 dark:text-[#7C8798]">ANTREAN LAPORAN LAPANGAN PERLU TINDAK LANJUT</p>
              </div>
              <BaketList data={data} />
            </div>

            {/* Right Column: Mission Pipeline Timeline */}
            <div className="rounded-[18px] bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/5 p-6 space-y-6 shadow-sm dark:shadow-none">
              {/* SECTION HEADER */}
              <div className="space-y-1.5 border-b border-slate-200 dark:border-white/10 pb-4">
                <h3 className="text-[15px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">MISSION PIPELINE</h3>
                <p className="text-[12px] font-medium text-slate-500 dark:text-[#7C8798]">MONITORING ALUR KERJA INTELIJEN AKTIF HARI INI</p>
              </div>
              
              <div className="relative border-l border-slate-200 dark:border-white/10 ml-3 pl-6 space-y-8 py-2">
                {[
                  {
                    label: "Intake Baket",
                    count: bakets.filter((item) => item.status === "SENT_TO_OIM").length,
                    get status() {
                      return this.count === 0 ? "PROCESSED" : this.count > 5 ? "QUEUE OVERLOAD" : "INTAKE RUNNING";
                    },
                    get state() {
                      return this.count === 0 ? "completed" : this.count > 5 ? "bottleneck" : "active";
                    },
                    get eta() {
                      return this.count === 0 ? "0m" : `${this.count * 10}m`;
                    }
                  },
                  {
                    label: "Neraca Penilaian",
                    count: verifications.filter((item) => ["DRAFT", "IN_PROGRESS"].includes(item.status)).length,
                    get status() {
                      return this.count === 0 ? "VERIFIED" : this.count > 5 ? "BACKLOG DETECTED" : "UNDER REVIEW";
                    },
                    get state() {
                      return this.count === 0 ? "completed" : this.count > 5 ? "bottleneck" : "active";
                    },
                    get eta() {
                      return this.count === 0 ? "0m" : `${this.count * 15}m`;
                    }
                  },
                  {
                    label: "Analisis manual",
                    count: analyses.filter((item) => item.status !== "ARCHIVED").length,
                    get status() {
                      return this.count === 0 ? "STANDBY" : "ANALYSING";
                    },
                    get state() {
                      return this.count === 0 ? "pending" : "active";
                    },
                    get eta() {
                      return this.count === 0 ? "—" : "ACTIVE";
                    }
                  },
                  {
                    label: "Produk resmi",
                    count: products.filter((item) => ["DRAFT", "NEEDS_REVISION"].includes(item.status)).length,
                    get status() {
                      return this.count === 0 ? "NO DRAFTS" : "AUTHORING";
                    },
                    get state() {
                      return this.count === 0 ? "pending" : "active";
                    },
                    get eta() {
                      return this.count === 0 ? "—" : "IN PROGRESS";
                    }
                  },
                  {
                    label: "Direktur/Kabinda",
                    count: products.filter((item) => ["SUBMITTED", "IN_REVIEW"].includes(item.status)).length,
                    get status() {
                      return this.count === 0 ? "WAITING" : "ROUTING";
                    },
                    get state() {
                      return this.count === 0 ? "pending" : "active";
                    },
                    get eta() {
                      return this.count === 0 ? "—" : "PENDING";
                    }
                  }
                ].map((step) => {
                  const dotColor = 
                    step.state === "completed" ? "#10B981" : // Emerald green
                    step.state === "active" ? "#3B82F6" : // Tactical blue
                    step.state === "bottleneck" ? "#F59E0B" : // Amber yellow
                    "#7C8798"; // Slate gray pending
                  
                  return (
                    <div key={step.label} className="relative flex items-start justify-between">
                      {/* Timeline Node dot */}
                      <div 
                        className="absolute left-[-31px] top-1 size-[11px] rounded-full border-2 bg-background flex items-center justify-center"
                        style={{ borderColor: dotColor }}
                      >
                        {step.state === "active" && (
                          <span className="size-1.5 rounded-full animate-ping absolute bg-[#3B82F6] opacity-75" />
                        )}
                        <span className="size-1 rounded-full" style={{ backgroundColor: dotColor }} />
                      </div>

                      {/* Step detail info */}
                      <div className="space-y-1">
                        <h4 
                          className={cn(
                            "text-[13px] font-bold tracking-wide uppercase",
                            step.state === "active" ? "text-blue-600 dark:text-[#3B82F6]" : "text-slate-900 dark:text-white"
                          )}
                        >
                          {step.label}
                        </h4>
                        <div className="flex items-center gap-2 text-[12px] font-mono text-slate-500 dark:text-[#7C8798] uppercase">
                          <span>STATUS:</span>
                          <span style={{ color: dotColor }} className="font-semibold">{step.status}</span>
                          <span>·</span>
                          <span>ETA: {step.eta}</span>
                        </div>
                      </div>

                      {/* Right item count badge */}
                      <div 
                        className="px-2 py-0.5 rounded text-[11px] font-mono font-bold border shrink-0"
                        style={{ 
                          color: dotColor, 
                          backgroundColor: `${dotColor}12`,
                          borderColor: `${dotColor}25`
                        }}
                      >
                        {step.count} UNIT
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
      {view === "reports" && (
        <>
          <ReportStatusTabs activeStatus={data.activeStatus} />
          <Filters areas={data.areas} />
          <Kpis data={data} />
          <BaketList data={data} />
        </>
      )}
      {detailBaket && <BaketDetail item={data.baket} activeTab={data.activeTab} />}
      {view === "report-version" && <BaketDetail item={{ versions: [data.version] }} />}
      {view === "verification" && (
        <>
          <Filters areas={data.areas} mode="verification" />
          <VerificationList data={data} />
        </>
      )}
      {view === "verification-detail" && <VerificationEditor item={data.verification} />}
      {view === "analysis" && (
        <>
          <div className="flex justify-end">
            <Button asChild>
              <Link href="/dashboard/oim/analisis-intelijen/baru">
                <Plus />
                Analisis baru
              </Link>
            </Button>
          </div>
          <AnalysisList data={data} />
        </>
      )}
      {view === "analysis-new" && <AnalysisCreate data={data} />}
      {["analysis-detail", "analysis-edit", "analysis-version"].includes(view) && (
        <AnalysisWorkspace
          item={view === "analysis-version" ? { versions: [data.version], status: "VALIDATED" } : data.analysis}
        />
      )}
      {view === "products" && (
        <>
          <div className="flex justify-end">
            <Button asChild>
              <Link href="/dashboard/oim/produk-intelijen/buat-produk">
                <Plus />
                Buat Laporan Intelijen
              </Link>
            </Button>
          </div>
          <ProductList data={data} />
        </>
      )}
      {view === "product-list" && (
        <>
          <Filters areas={data.areas} mode="product" />
          <ProductList data={data} />
        </>
      )}
      {view === "product-new" && <ProductBuilder data={data} />}
      {["product-detail", "product-edit", "product-version"].includes(view) && (
        <ProductDetail item={view === "product-version" ? { versions: [data.version] } : data.product} />
      )}
      {view === "approval" && <ProductList data={data} approval />}
      {view === "approval-detail" && <ProductDetail item={data.product} approval />}
      {view === "workflow-detail" && <ProductDetail item={(data.workflow as Row)?.productVersion?.product} />}
      {view === "monitoring" && (
        <div
          className="space-y-6 relative p-4 border border-border/20 bg-background/5 rounded-none overflow-hidden select-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.007) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.007) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        >
          {/* Tactical Frame Core Identifier */}
          <div className="absolute top-1.5 right-4 font-mono text-[7px] text-muted-foreground/20 pointer-events-none uppercase">
            C2 MONITORING CORE // SYS-REV-09
          </div>

          <Kpis data={data} />

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                id: "MOD-01",
                label: "WORKLOAD PERSONEL",
                value: 72,
                desc: "ACTIVE STRENGTH // 72 OF 100 OPs",
                status: "NORMAL",
                statusColor: "bg-emerald-500",
                progressColor: "bg-emerald-500/90",
                trend: "+2.4% CHANGE",
                trendPositive: true,
                icon: Users,
              },
              {
                id: "MOD-02",
                label: "DEADLINE TUGAS",
                value: 45,
                desc: "COMPLETED MISSION // 45 OF 100 STRs",
                status: "WARNING",
                statusColor: "bg-amber-500",
                progressColor: "bg-amber-500/90",
                trend: "-1.5% DRIFT",
                trendPositive: false,
                icon: Clock,
              },
              {
                id: "MOD-03",
                label: "COVERAGE WILAYAH",
                value: 86,
                desc: "INTEL COVERAGE // TARGET SECTOR SECURED",
                status: "ACTIVE",
                statusColor: "bg-emerald-500",
                progressColor: "bg-emerald-500/90",
                trend: "+5.1% RATIO",
                trendPositive: true,
                icon: MapPin,
              },
              {
                id: "MOD-04",
                label: "LAPORAN MASUK",
                value: 64,
                desc: "VERIFIED INTAKE // 64 VALID BAKETs",
                status: "NORMAL",
                statusColor: "bg-sky-500",
                progressColor: "bg-sky-500/90",
                trend: "+12.8% VOL",
                trendPositive: true,
                icon: FileText,
              },
              {
                id: "MOD-05",
                label: "INSIDEN AKTIF",
                value: 18,
                desc: "CRITICAL ALERT // 18 EMERGENCY PINGs",
                status: "CRITICAL",
                statusColor: "bg-red-500",
                progressColor: "bg-red-500/90",
                trend: "+2 ACTIVE PINGS",
                trendPositive: false,
                icon: AlertCircle,
              },
              {
                id: "MOD-06",
                label: "PROGRESS LAPANGAN",
                value: 58,
                desc: "DATA COLLECTION // UUK TARGETS MET",
                status: "ACTIVE",
                statusColor: "bg-purple-500",
                progressColor: "bg-purple-500/90",
                trend: "+8.2% PROGRESS",
                trendPositive: true,
                icon: Zap,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.label}
                  className="rounded-none border border-border/80 bg-card/65 relative overflow-hidden transition-all duration-150 hover:border-sky-500/50 hover:shadow-[0_0_12px_rgba(14,165,233,0.1)] group flex flex-col"
                >
                  {/* Tactical Corner Brackets */}
                  <div className="absolute top-0 left-0 size-2 border-t border-l border-muted-foreground/30 group-hover:border-sky-400" />
                  <div className="absolute top-0 right-0 size-2 border-t border-r border-muted-foreground/30 group-hover:border-sky-400" />
                  <div className="absolute bottom-0 left-0 size-2 border-b border-l border-muted-foreground/30 group-hover:border-sky-400" />
                  <div className="absolute bottom-0 right-0 size-2 border-b border-r border-muted-foreground/30 group-hover:border-sky-400" />

                  {/* Side Accent Line for Critical/Warnings */}
                  {item.status === "CRITICAL" && <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-red-500" />}
                  {item.status === "WARNING" && <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-amber-500" />}

                  <CardHeader className="p-3.5 pb-2 flex flex-row items-center justify-between space-y-0 shrink-0">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-mono font-bold text-muted-foreground/40">{item.id}</span>
                        <CardTitle className="font-mono text-[9px] font-bold text-foreground tracking-wider">
                          {item.label}
                        </CardTitle>
                      </div>
                      <CardDescription className="text-[8px] font-mono text-muted-foreground/50 uppercase tracking-widest">
                        C2 // UNIT SCAN
                      </CardDescription>
                    </div>
                    <div className="p-1 rounded bg-secondary/15 text-muted-foreground/60 group-hover:text-sky-400 transition-colors">
                      <Icon className="size-3.5 shrink-0" />
                    </div>
                  </CardHeader>

                  <CardContent className="p-3.5 pt-0 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="flex items-end justify-between select-none">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-mono font-extrabold tracking-tight text-foreground">
                          {item.value}%
                        </span>
                        <span className="text-[8px] font-mono text-muted-foreground/50 uppercase">capaian</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            item.statusColor,
                            item.status === "CRITICAL" && "animate-ping",
                          )}
                        />
                        <span className="text-[8px] font-mono font-bold leading-none tracking-widest">
                          ● {item.status}
                        </span>
                      </div>
                    </div>

                    {/* Monospace Progress bar (non-rounded, flat) */}
                    <div className="w-full bg-secondary/35 h-1 border border-border/10">
                      <div
                        className={cn("h-full transition-all duration-300", item.progressColor)}
                        style={{ width: `${item.value}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[8px] font-mono mt-1 pt-1.5 border-t border-border/10 select-none">
                      <span className="text-muted-foreground/70 truncate max-w-[190px]">{item.desc}</span>
                      <span
                        className={cn("font-bold shrink-0", item.trendPositive ? "text-emerald-500" : "text-amber-500")}
                      >
                        {item.trend}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
      {view === "map" && (
        <>
          <Filters areas={data.areas} />
          <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
            <SituationMap reports={data.map} boundaries={data.boundaries} />
            <Card>
              <CardHeader>
                <CardTitle>Legenda situasi</CardTitle>
                <CardDescription>Zoom rendah menampilkan agregasi; zoom tinggi menampilkan marker.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Baket masuk</span>
                  <b>{rows((data.map as Row)?.features).length}</b>
                </div>
                <Separator />
                <p className="text-xs text-muted-foreground">
                  Merah: urgent · Kuning: high · Biru: normal. Baket tanpa koordinat tetap tersedia pada daftar laporan
                  masuk.
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
      {["monitoring-task", "monitoring-personnel", "map-alert"].includes(view) && (
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldCheck className="mx-auto size-8 text-primary" />
            <h2 className="mt-3 font-medium">Data operasional berada dalam scope OIM</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Detail ini menggunakan kontrak monitoring dan traceability yang sama tanpa membuka data lintas rantai
              komando.
            </p>
          </CardContent>
        </Card>
      )}
      </main>
    </div>
  );
}
