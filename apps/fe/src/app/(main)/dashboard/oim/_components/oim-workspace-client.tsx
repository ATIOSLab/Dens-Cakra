"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileCheck,
  FileDown,
  FileSearch,
  type LucideIcon,
  MapPin,
  MapPinned,
  Maximize2,
  Minus,
  Plus,
  Printer,
  RadioTower,
  RefreshCw,
  Send,
  ShieldCheck,
  UserRound,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { SortableTableHeader } from "@/app/(main)/dashboard/_components/sortable-table-header";
import { ViewModeToggle } from "@/app/(main)/dashboard/_components/view-mode-toggle";
import { GaswilEntityLink } from "@/components/domain/gaswil-entity-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FilterPanel } from "@/components/ui/filter-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { TableToolbar } from "@/components/ui/table-toolbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { administrativeAreaLabel } from "@/features/baket/administrative-area";
import { BaketAdministrativeArea } from "@/features/baket/components/baket-administrative-area";
import { EvidenceAttachmentViewer } from "@/features/baket/components/evidence-attachment-viewer";
import { EvidenceImageViewer } from "@/features/baket/components/evidence-image-viewer";
import { apiBrowserFetch, apiBrowserMutation } from "@/lib/api/browser-client";
import { findDkiJakartaProvinceFilterId } from "@/lib/domain/area-filter";
import { sortReportCategories } from "@/lib/domain/report-category-order";
import { DOMAIN_VISUALS, URGENCY_VISUALS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

import type { OimPageData, OimProductContext, OimView } from "./oim-types";

const SituationMap = dynamic(() => import("./oim-situation-map").then((module) => module.OimSituationMap), {
  ssr: false,
  loading: () => (
    <div className="h-[min(35rem,65svh)] min-h-[28rem] animate-pulse rounded-[var(--dc-radius-lg)] bg-muted" />
  ),
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

const DEFAULT_PRODUCT_CONTEXT: OimProductContext = {
  label: "Laporan Intelijen",
  listTitle: "Daftar Laporan Intelijen",
  createTitle: "Buat Laporan Intelijen",
  detailTitle: "Detail Laporan Intelijen",
  listPath: "/dashboard/oim/produk-intelijen/daftar-produk",
  createPath: "/dashboard/oim/produk-intelijen/buat-produk",
  detailBasePath: "/dashboard/oim/produk-intelijen/daftar-produk",
};

const VIEW_META: Record<OimView, [string, string, LucideIcon]> = {
  dashboard: ["Pusat Kendali OIM", "Ringkasan antrean intelijen dalam cakupan komando dan wilayah Anda.", RadioTower],
  reports: ["Laporan Masuk", "", FileSearch],
  "report-detail": ["Detail Baket", "Bukti, peta lokasi, versi, dan jejak keputusan.", FileSearch],
  "report-version": ["Snapshot Versi Baket", "Versi historis bersifat baca-saja.", DOMAIN_VISUALS.baket.Icon],
  verification: [
    "Neraca Penilaian",
    "Antrean penilaian keandalan sumber A–F dan kredibilitas informasi 1–6.",
    ClipboardCheck,
  ],
  "verification-detail": [
    "Lembar Verifikasi",
    "Daftar cek, rujukan silang, matriks, interpretasi, dan keputusan final.",
    ShieldCheck,
  ],
  analysis: [
    "Analisis Intelijen",
    "Analisis manual berbasis Bahan Keterangan (Baket) terverifikasi, tanpa pembuatan draf AI.",
    BarChart3,
  ],
  "analysis-new": ["Analisis Baru", "Pilih sumber terverifikasi dan mulai draf lima bagian.", Plus],
  "analysis-detail": [
    "Ruang Kerja Analisis",
    "Gabungkan beberapa Baket, susun analisis, lalu simpan sebagai draf atau final.",
    BarChart3,
  ],
  "analysis-edit": ["Ubah Analisis", "Perbarui versi aktif sebelum difinalkan.", BarChart3],
  "analysis-version": ["Versi Analisis", "Snapshot final tidak dapat diubah.", BarChart3],
  products: ["Laporan Intelijen", "Laporan Intelijen yang bersumber dari analisis final.", DOMAIN_VISUALS.intelligenceReport.Icon],
  "product-list": [
    "Daftar Laporan Intelijen",
    "Alur draf, revisi, pengajuan, dan versi Laporan Intelijen.",
    DOMAIN_VISUALS.intelligenceReport.Icon,
  ],
  "product-new": [
    "Buat Laporan Intelijen",
    "Pilih jenis laporan dan susun isinya dari analisis final beserta Baket sumber.",
    Plus,
  ],
  "product-detail": [
    "Detail Laporan Intelijen",
    "Metadata, sumber, versi, validasi, persetujuan, dan ketertelusuran.",
    DOMAIN_VISUALS.intelligenceReport.Icon,
  ],
  "product-edit": [
    "Ubah Laporan Intelijen",
    "Koreksi metadata draf dan konten versi aktif.",
    DOMAIN_VISUALS.intelligenceReport.Icon,
  ],
  "product-version": [
    "Versi Laporan Intelijen",
    "Snapshot Laporan Intelijen untuk audit dan cetak.",
    DOMAIN_VISUALS.intelligenceReport.Icon,
  ],
  approval: ["Pengajuan Persetujuan", "Laporan Intelijen final yang menunggu keputusan Kepala BIN Daerah (Kabinda).", Send],
  "approval-detail": ["Persiapan Pengajuan", "Finalkan Laporan Intelijen dan kunci versi untuk Kepala BIN Daerah (Kabinda).", Send],
  "workflow-detail": ["Linimasa Persetujuan", "Status keputusan Kepala BIN Daerah (Kabinda).", Send],
  monitoring: [
    "Monitoring Lapangan",
    "Beban kerja, tenggat, cakupan, laporan, personel, dan insiden pada rantai komando.",
    RadioTower,
  ],
  "monitoring-task": ["Monitoring Tugas", "Perkembangan lapangan dan laporan terkait.", RadioTower],
  "monitoring-report": ["Bahan Keterangan (Baket)", "Detail Baket dari konteks monitoring.", FileSearch],
  "monitoring-personnel": [
    "Profil Operasional Personel",
    "Beban kerja, tenggat, cakupan, dan posisi terakhir.",
    RadioTower,
  ],
  map: ["Peta Situasi", "Seluruh Baket masuk, batas cakupan, klaster, peta panas, dan peringatan.", MapPinned],
  "map-report": ["Baket pada Peta", "Detail laporan dan konteks spasial.", MapPinned],
  "map-alert": ["Detail Peringatan", "Situasi, tingkat risiko, lokasi, dan tindak lanjut.", AlertTriangle],
};

function rows(value: unknown): Row[] {
  if (Array.isArray(value)) return value as Row[];
  if (value && typeof value === "object" && Array.isArray((value as Row).items)) return (value as Row).items;
  return [];
}

function areaFilterIdentity(area: Row) {
  return {
    id: String(area.id ?? ""),
    name: String(area.name ?? ""),
    code: typeof area.code === "string" ? area.code : null,
    officialCode: typeof area.officialCode === "string" ? area.officialCode : null,
  };
}

function fieldOfficerUserName(assignment?: Row | null) {
  const profile = assignment?.userProfile;
  return profile?.fullName ?? profile?.authUser?.name ?? profile?.username ?? "User pengirim tidak teridentifikasi";
}

function currentVersion(item: Row) {
  return Array.isArray(item.versions) ? (item.versions[0] ?? {}) : (item.currentVersion ?? {});
}

function productContext(data?: OimPageData): OimProductContext {
  return { ...DEFAULT_PRODUCT_CONTEXT, ...(data?.productContext ?? {}) };
}

function isProductView(view: OimView) {
  return ["products", "product-list", "product-new", "product-detail", "product-edit", "product-version"].includes(
    view,
  );
}

function fmtDate(value?: string) {
  return value
    ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "—";
}

function baketStatusLabel(value?: string) {
  switch ((value ?? "").toUpperCase()) {
    case "SENT_TO_OIM":
      return "Sudah dikirim";
    case "UNDER_VERIFICATION":
      return "Sedang terverifikasi";
    case "NEEDS_DEVELOPMENT":
      return "Perlu pengembangan";
    case "VERIFIED":
      return "Terverifikasi";
    case "REJECTED":
      return "Ditolak";
    case "READY_TO_SEND":
      return "Siap dikirim";
    case "DRAFT":
      return "Draf";
    default:
      return value ?? "Belum ada";
  }
}

function StatusBadge({ value }: { value?: string }) {
  const danger = value === "REJECTED" || value === "URGENT";
  const success = value === "VERIFIED" || value === "VALIDATED" || value?.startsWith("APPROVED");
  const warning = value === "UNDER_VERIFICATION" || value === "IN_PROGRESS" || value === "NEEDS_DEVELOPMENT";
  const label = value === "VALIDATED" ? "FINAL" : baketStatusLabel(value);
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-1 font-semibold text-[11px]",
        danger && "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
        success &&
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
        warning &&
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
        !danger &&
          !success &&
          !warning &&
          "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-300",
      )}
    >
      {label}
    </Badge>
  );
}

function urgencyBadgeStyleFromColor(markerColor: string): React.CSSProperties {
  return {
    color: markerColor,
    backgroundColor: `${markerColor}15`,
    borderColor: `${markerColor}30`,
  };
}

const URGENCY_BADGE_STYLES: Record<string, React.CSSProperties> = {
  URGENT: urgencyBadgeStyleFromColor(URGENCY_VISUALS.URGENT.markerColor),
  HIGH: urgencyBadgeStyleFromColor(URGENCY_VISUALS.HIGH.markerColor),
  NORMAL: urgencyBadgeStyleFromColor(URGENCY_VISUALS.NORMAL.markerColor),
  LOW: urgencyBadgeStyleFromColor(URGENCY_VISUALS.LOW.markerColor),
};

function urgencyBadgeStyle(value?: string) {
  return URGENCY_BADGE_STYLES[value ?? "NORMAL"] ?? URGENCY_BADGE_STYLES.NORMAL;
}

function Header({ view, data }: { view: OimView; data?: OimPageData }) {
  const [metaTitle, metaDescription, Icon] = VIEW_META[view];
  const context = productContext(data);
  const title =
    view === "product-list" || view === "products"
      ? context.listTitle
      : view === "product-new"
        ? context.createTitle
        : ["product-detail", "product-edit", "product-version"].includes(view)
          ? context.detailTitle
          : metaTitle;
  const description =
    isProductView(view) && data?.productContext
      ? `${context.label} disusun dari analisis final dan Bahan Keterangan (Baket) sumber.`
      : metaDescription;
  const router = useRouter();

  const root = (data?.areas ?? {}) as Row;
  const topLevel = rows(root.children);
  const provinces = topLevel.filter((area) => area.level === "PROVINCE");
  const defaultProvinceId = findDkiJakartaProvinceFilterId(provinces.map(areaFilterIdentity));
  const provinceName = provinces.find((area) => area.id === defaultProvinceId)?.name || provinces[0]?.name || "REGIONAL";

  const hasBackButton = [
    "report-detail",
    "analysis-detail",
    "analysis-new",
    "analysis-edit",
    "product-new",
    "product-edit",
    "product-detail",
  ].includes(view);

  const backButtonSettings = hasBackButton
    ? {
        href:
          view === "report-detail"
            ? "/dashboard/oim/laporan-masuk"
            : ["analysis-detail", "analysis-new", "analysis-edit"].includes(view)
              ? "/dashboard/oim/analisis-intelijen"
              : ["product-new", "product-edit", "product-detail"].includes(view)
                ? context.listPath
                : undefined,
      }
    : undefined;

  return (
    <div className="flex flex-col gap-4 relative z-20 pb-2">
      <PageHeader
        title={title}
        description={description}
        backButton={backButtonSettings}
        badge={
          <div className="flex items-center gap-2">
            <div
              className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-card"
              style={{ color: "#06B6D4" }}
            >
              <div
                className="size-full flex items-center justify-center rounded-lg"
                style={{ backgroundColor: "#06B6D41c" }}
              >
                <Icon className="size-4 shrink-0" style={{ strokeWidth: "2px" }} />
              </div>
            </div>
          </div>
        }
        actions={
          <div className="flex items-center gap-3 shrink-0 print:hidden">
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
              <Link href={context.createPath} className="flex items-center gap-2">
                <Plus className="size-4 shrink-0" style={{ strokeWidth: "2px" }} />
                <span>LAPORAN</span>
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-2.5 mt-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          MANAJER OPERASIONAL INTELIJEN
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] font-mono font-bold tracking-widest text-muted-foreground uppercase">
          <span className="flex items-center gap-1.5 text-[#16C784]">
            <span className="size-1.5 rounded-full bg-[#16C784] animate-pulse" />
            SISTEM NORMAL
          </span>
          <span className="text-border">|</span>
          <span>SYNC: 1 MENIT LALU</span>
          <span className="text-border">|</span>
          <span>WILAYAH CAKUPAN: {provinceName.toUpperCase()}</span>
          <span className="text-border">|</span>
          <span>SESI: AMAN</span>
          <span className="text-border">|</span>
          <span className="text-muted-foreground/50">NODE KOMANDO: OIM-SEC-01</span>
        </div>
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
      icon: DOMAIN_VISUALS.baket.Icon,
      colorClass: "border-t-primary/80",
      bgTint: "bg-primary/5 text-primary",
      badge: "Intake Baru",
    },
    {
      label: "Antrean verifikasi",
      value: verifications.filter((item) => ["DRAFT", "IN_PROGRESS"].includes(item.status)).length,
      hint: "Perlu keputusan",
      icon: Clock,
      colorClass: "border-t-primary/80",
      bgTint: "bg-primary/5 text-primary",
      badge: "Menunggu Keputusan",
    },
    {
      label: "Pengembangan",
      value: bakets.filter((item) => item.status === "NEEDS_DEVELOPMENT").length,
      hint: "Dikembalikan ke lapangan",
      icon: RefreshCw,
      colorClass: "border-t-primary/80",
      bgTint: "bg-primary/5 text-primary",
      badge: "Perlu Perbaikan",
    },
    {
      label: "Analisis aktif",
      value: analyses.filter((item) => item.status !== "ARCHIVED").length,
      hint: "Draf dan peninjauan",
      icon: Activity,
      colorClass: "border-t-primary/80",
      bgTint: "bg-primary/5 text-primary",
      badge: "Draf Aktif",
    },
    {
      label: "Draf Laporan Intelijen",
      value: products.filter((item) => ["DRAFT", "NEEDS_REVISION"].includes(item.status)).length,
      hint: "Belum diajukan",
      icon: FileCheck,
      colorClass: "border-t-primary/80",
      bgTint: "bg-primary/5 text-primary",
      badge: "Belum Diajukan",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.label}
            size="sm"
            className={cn(
              "min-h-[152px] overflow-hidden rounded-[8px] border border-border border-t-2 bg-card shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-primary/25 hover:shadow-md",
              card.colorClass,
            )}
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4 pb-2">
              <div className="space-y-1">
                <p className="font-mono text-[11px] text-muted-foreground/80 uppercase tracking-[0.08em]">
                  {card.label}
                </p>
                <p className="font-heading text-3xl font-extrabold tabular-nums tracking-tight text-foreground">
                  {card.value}
                </p>
              </div>
              <div className={cn("p-1.5 rounded-lg", card.bgTint)}>
                <Icon className="size-4 shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 px-4 pt-0 pb-4">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium text-muted-foreground/80">{card.hint}</span>
              </div>
              {card.value > 0 ? (
                <span className="inline-flex self-start items-center rounded-full bg-primary/10 px-2 py-0.5 font-mono font-semibold text-[10px] text-primary">
                  {card.badge}
                </span>
              ) : (
                <span className="inline-flex self-start items-center rounded-full bg-secondary/80 px-2 py-0.5 font-mono font-semibold text-[10px] text-muted-foreground/70">
                  Bersih
                </span>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function getClassificationStyles(value?: string) {
  const norm = (value ?? "").toUpperCase();
  switch (norm) {
    case "BIASA":
      return {
        color: "#3B82F6", // Blue
        bgColor: "#3B82F615",
        borderColor: "#3B82F630",
        label: "BIASA",
      };
    case "TERBATAS":
      return {
        color: "#10B981", // Green
        bgColor: "#10B98115",
        borderColor: "#10B98130",
        label: "TERBATAS",
      };
    case "RAHASIA":
      return {
        color: "#F59E0B", // Yellow/Gold
        bgColor: "#F59E0B15",
        borderColor: "#F59E0B30",
        label: "RAHASIA",
      };
    case "SANGAT_RAHASIA":
      return {
        color: "#EF4444", // Red
        bgColor: "#EF444415",
        borderColor: "#EF444430",
        label: "SANGAT RAHASIA",
      };
    default:
      return {
        color: "#7C8798", // Gray
        bgColor: "#7C879815",
        borderColor: "#7C879830",
        label: value ?? "—",
      };
  }
}

function productStatusLabel(value?: string) {
  switch ((value ?? "").toUpperCase()) {
    case "DRAFT":
      return "Draf";
    case "READY_FOR_SUBMISSION":
      return "Siap Diajukan";
    case "SUBMITTED":
      return "Diajukan";
    case "IN_REVIEW":
      return "Sedang Ditinjau";
    case "NEEDS_REVISION":
      return "Perlu Revisi";
    case "APPROVED":
      return "Disetujui";
    case "REJECTED":
      return "Ditolak";
    case "UNDER_REGIONAL_REVIEW":
      return "Peninjauan Regional";
    default:
      return value ?? "—";
  }
}

function getProductStatusStyles(value?: string) {
  const norm = (value ?? "").toUpperCase();
  const label = productStatusLabel(norm);
  if (["APPROVED"].includes(norm)) {
    return { color: "#10B981", bgColor: "#10B98115", borderColor: "#10B98130", label };
  }
  if (["NEEDS_REVISION"].includes(norm)) {
    return { color: "#F59E0B", bgColor: "#F59E0B15", borderColor: "#F59E0B30", label };
  }
  if (["REJECTED"].includes(norm)) {
    return { color: "#EF4444", bgColor: "#EF444415", borderColor: "#EF444430", label };
  }
  if (["READY_FOR_SUBMISSION", "SUBMITTED", "IN_REVIEW", "UNDER_REGIONAL_REVIEW"].includes(norm)) {
    return { color: "#06B6D4", bgColor: "#06B6D415", borderColor: "#06B6D430", label };
  }
  return { color: "#7C8798", bgColor: "#7C879815", borderColor: "#7C879830", label };
}

function statusLabelIndo(status: string) {
  switch (status.toUpperCase()) {
    case "SENT_TO_OIM":
      return "Baru";
    case "UNDER_VERIFICATION":
      return "Sedang Terverifikasi";
    case "NEEDS_DEVELOPMENT":
      return "Perlu Pengembangan";
    case "VERIFIED":
      return "Selesai (Terverifikasi)";
    case "REJECTED":
      return "Selesai (Ditolak)";
    case "DRAFT":
      return "Draf";
    case "READY_FOR_SUBMISSION":
      return "Siap Diajukan";
    case "SUBMITTED":
      return "Diajukan";
    case "IN_REVIEW":
      return "Sedang Ditinjau";
    case "NEEDS_REVISION":
      return "Perlu Revisi";
    case "APPROVED":
      return "Disetujui";
    case "IN_PROGRESS":
      return "Sedang Diproses";
    default:
      return status;
  }
}

function Filters({
  areas,
  reportCategories,
  mode = "baket",
  productLabel = "Laporan Intelijen",
}: {
  areas?: unknown;
  reportCategories?: unknown;
  mode?: "baket" | "verification" | "product";
  productLabel?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const root = (areas ?? {}) as Row;
  const categories = sortReportCategories(rows(reportCategories));
  const topLevel = rows(root.children);
  const provinces = topLevel.filter((area) => area.level === "PROVINCE");
  const provinceId = findDkiJakartaProvinceFilterId(provinces.map(areaFilterIdentity)) || provinces[0]?.id || "";

  // Controlled filter states
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [regencyId, setRegencyId] = useState(searchParams.get("regencyId") || "");
  const [districtId, setDistrictId] = useState(searchParams.get("districtId") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [urgency, setUrgency] = useState(searchParams.get("urgency") || "");
  const [classification, setClassification] = useState(searchParams.get("classification") || "");
  const [categoryId, setCategoryId] = useState(searchParams.get("categoryId") || "");
  const [periodStart, setPeriodStart] = useState(searchParams.get("periodStart") || "");
  const [periodEnd, setPeriodEnd] = useState(searchParams.get("periodEnd") || "");

  // Debounced search state
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Sync state with URL search params changes
  useEffect(() => {
    setSearch(searchParams.get("search") || "");
    setRegencyId(searchParams.get("regencyId") || "");
    setDistrictId(searchParams.get("districtId") || "");
    setStatus(searchParams.get("status") || "");
    setUrgency(searchParams.get("urgency") || "");
    setClassification(searchParams.get("classification") || "");
    setCategoryId(searchParams.get("categoryId") || "");
    setPeriodStart(searchParams.get("periodStart") || "");
    setPeriodEnd(searchParams.get("periodEnd") || "");
  }, [searchParams]);

  const selectedProvince = provinces.find((area) => area.id === provinceId);
  const directRegencies = topLevel.filter((area) => ["REGENCY", "CITY"].includes(area.level));
  const regencies = selectedProvince
    ? rows(selectedProvince.children).filter((area) => ["REGENCY", "CITY"].includes(area.level))
    : directRegencies;
  const selectedRegency = regencies.find((area) => area.id === regencyId);
  const districts = selectedRegency ? rows(selectedRegency.children).filter((area) => area.level === "DISTRICT") : [];
  const areaId = districtId || regencyId || provinceId;
  const selectedDistrict = districts.find((area) => area.id === districtId);
  const areaSubtitle = selectedDistrict
    ? `Jumlah data Kecamatan ${selectedDistrict.name}`
    : selectedRegency
      ? `Jumlah data Kota/Kabupaten ${selectedRegency.name}`
      : "Jumlah data cakupan akses aktif";
  const statusOptions =
    mode === "product"
      ? ["DRAFT", "READY_FOR_SUBMISSION", "SUBMITTED", "IN_REVIEW", "NEEDS_REVISION", "APPROVED", "REJECTED"]
      : mode === "verification"
        ? ["DRAFT", "IN_PROGRESS", "VERIFIED", "NEEDS_DEVELOPMENT", "REJECTED"]
        : ["SENT_TO_OIM", "UNDER_VERIFICATION", "NEEDS_DEVELOPMENT", "VERIFIED", "REJECTED"];

  // Automatically apply parameters on change
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (regencyId) params.set("regencyId", regencyId);
    if (districtId) params.set("districtId", districtId);
    if (areaId) params.set("areaId", areaId);
    if (status) params.set("status", status);
    if (urgency) params.set("urgency", urgency);
    if (classification && mode === "product") params.set("classification", classification);
    if (categoryId && mode === "baket") params.set("categoryId", categoryId);
    if (periodStart) params.set("periodStart", periodStart);
    if (periodEnd) params.set("periodEnd", periodEnd);

    const newQuery = params.toString();
    const currentQuery = searchParams.toString();

    if (newQuery !== currentQuery) {
      router.push(`${window.location.pathname}?${newQuery}`);
    }
  }, [
    debouncedSearch,
    regencyId,
    districtId,
    areaId,
    status,
    urgency,
    classification,
    categoryId,
    periodStart,
    periodEnd,
    mode,
    router,
    searchParams,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const activeFilterCount = [
    search,
    regencyId,
    districtId,
    status,
    urgency,
    classification,
    categoryId,
    periodStart,
    periodEnd,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearch("");
    setRegencyId("");
    setDistrictId("");
    setStatus("");
    setUrgency("");
    setClassification("");
    setCategoryId("");
    setPeriodStart("");
    setPeriodEnd("");
  };

  return (
    <form className="animate-in fade-in" onSubmit={handleSubmit}>
      <FilterPanel
        title={
          mode === "product"
            ? `Filter ${productLabel}`
            : mode === "verification"
              ? "Filter verifikasi"
              : "Filter laporan"
        }
        description={`Filter diterapkan pada seluruh dataset sesuai cakupan akses Anda. ${areaSubtitle}.`}
        activeFilterCount={activeFilterCount}
        onReset={resetFilters}
      >
        <Input
          name="search"
          aria-label="Cari laporan"
          placeholder="Cari judul, isi, nomor laporan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 border-border bg-background text-sm text-foreground"
        />

        {/* Kota/Kabupaten Select */}
        <SearchableSelect
          aria-label="Filter Kota/Kabupaten"
          value={regencyId || "ALL"}
          options={[
            { value: "ALL", label: "Semua Kota/Kabupaten" },
            ...regencies.map((area) => ({ value: area.id, label: area.name })),
          ]}
          onValueChange={(val) => {
            setRegencyId(val === "ALL" ? "" : val);
            setDistrictId("");
          }}
          placeholder="Semua Kota/Kabupaten"
          searchPlaceholder="Cari Kota/Kabupaten..."
          emptyText="Kota/Kabupaten tidak ditemukan."
          className="h-10 border-border bg-background text-sm text-foreground"
        />

        {/* Kecamatan Select */}
        <SearchableSelect
          aria-label="Filter kecamatan"
          value={districtId || "ALL"}
          options={[
            {
              value: "ALL",
              label: regencyId ? "Semua Kecamatan" : "Pilih Kota/Kabupaten dahulu",
              disabled: !regencyId,
            },
            ...districts.map((area) => ({ value: area.id, label: area.name })),
          ]}
          onValueChange={(val) => setDistrictId(val === "ALL" ? "" : val)}
          disabled={!regencyId}
          placeholder={regencyId ? "Semua Kecamatan" : "Pilih Kota/Kabupaten dahulu"}
          searchPlaceholder="Cari Kecamatan..."
          emptyText="Kecamatan tidak ditemukan."
          className="h-10 border-border bg-background text-sm text-foreground"
        />

        {/* Status Select */}
        <Select value={status || "ALL"} onValueChange={(val) => setStatus(val === "ALL" ? "" : val)}>
          <SelectTrigger
            aria-label="Filter status"
            className="h-10 border-border bg-background text-sm text-foreground"
          >
            <SelectValue placeholder="Seluruh status" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[300px] overflow-y-auto">
            <SelectItem value="ALL">Seluruh status</SelectItem>
            {statusOptions.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {statusLabelIndo(opt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Urgensi Select */}
        <Select value={urgency || "ALL"} onValueChange={(val) => setUrgency(val === "ALL" ? "" : val)}>
          <SelectTrigger
            aria-label="Filter urgensi"
            className="h-10 border-border bg-background text-sm text-foreground"
          >
            <SelectValue placeholder="Semua urgensi" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="ALL">Semua urgensi</SelectItem>
            <SelectItem value="NORMAL">NORMAL</SelectItem>
            <SelectItem value="HIGH">HIGH</SelectItem>
            <SelectItem value="URGENT">URGENT</SelectItem>
          </SelectContent>
        </Select>

        {/* Classification Select (for Product mode) */}
        {mode === "product" ? (
          <Select value={classification || "ALL"} onValueChange={(val) => setClassification(val === "ALL" ? "" : val)}>
            <SelectTrigger
              aria-label="Filter klasifikasi"
              className="h-10 border-border bg-background text-sm text-foreground"
            >
              <SelectValue placeholder="Semua klasifikasi" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="ALL">Semua klasifikasi</SelectItem>
              <SelectItem value="BIASA">BIASA</SelectItem>
              <SelectItem value="TERBATAS">TERBATAS</SelectItem>
              <SelectItem value="RAHASIA">RAHASIA</SelectItem>
              <SelectItem value="SANGAT_RAHASIA">SANGAT RAHASIA</SelectItem>
            </SelectContent>
          </Select>
        ) : null}

        {/* Kategori Select (for Baket mode) */}
        {mode === "baket" ? (
          <SearchableSelect
            aria-label="Filter kategori"
            value={categoryId || "ALL"}
            options={[
              { value: "ALL", label: "Semua kategori" },
              ...categories.map((category) => ({ value: String(category.id), label: String(category.name ?? "") })),
            ]}
            onValueChange={(val) => setCategoryId(val === "ALL" ? "" : val)}
            placeholder="Semua kategori"
            searchPlaceholder="Cari kategori..."
            emptyText="Kategori tidak ditemukan."
            className="h-10 border-border bg-background text-sm text-foreground"
          />
        ) : null}

        <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
          <label htmlFor="oim-period-start" className="space-y-1">
            <span className="block text-xs font-medium text-muted-foreground">Periode Mulai</span>
            <Input
              id="oim-period-start"
              type="date"
              name="periodStart"
              aria-label="Periode mulai"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="h-10 border-border bg-background text-sm text-foreground"
            />
          </label>
          <label htmlFor="oim-period-end" className="space-y-1">
            <span className="block text-xs font-medium text-muted-foreground">Periode Selesai</span>
            <Input
              id="oim-period-end"
              type="date"
              name="periodEnd"
              aria-label="Periode selesai"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="h-10 border-border bg-background text-sm text-foreground"
            />
          </label>
        </div>
      </FilterPanel>
    </form>
  );
}

function paginationNumbers(currentPage: number, totalPages: number) {
  const list: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  for (let i = start; i <= end; i++) {
    list.push(i);
  }
  return list;
}

function BaketList({ data }: { data: OimPageData }) {
  const searchParams = useSearchParams();
  const initialItems = useMemo(() => rows(data.bakets), [data.bakets]);
  const [items, setItems] = useState<Row[]>(initialItems);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [dateSortDirection, setDateSortDirection] = useState<"asc" | "desc">("desc");
  const [isSorting, setIsSorting] = useState(false);

  useEffect(() => {
    setItems(initialItems);
    setPage(1);
  }, [initialItems]);

  async function sortByDate(direction: "asc" | "desc") {
    try {
      setIsSorting(true);
      const selectedStatuses = searchParams.get("statuses") || undefined;
      const result = await apiBrowserFetch<unknown>("/bakets", {
        query: {
          limit: 100,
          status: searchParams.get("status") || (selectedStatuses ? undefined : "SENT_TO_OIM"),
          statuses: selectedStatuses,
          areaId: searchParams.get("areaId") || undefined,
          search: searchParams.get("search") || undefined,
          urgency: searchParams.get("urgency") || undefined,
          categoryId: searchParams.get("categoryId") || undefined,
          from: searchParams.get("periodStart") || undefined,
          to: searchParams.get("periodEnd") || undefined,
          sortBy: "updatedAt",
          sortOrder: direction,
        },
      });

      setItems(rows(result));
      setDateSortDirection(direction);
      setPage(1);
    } catch {
      toast.error("Urutan tanggal laporan belum dapat diperbarui.");
    } finally {
      setIsSorting(false);
    }
  }

  const totalPages = Math.ceil(items.length / rowsPerPage) || 1;
  const safePage = Math.min(page, totalPages);
  const paginatedItems = items.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);
  const startRow = (safePage - 1) * rowsPerPage + 1;
  const endRow = Math.min(safePage * rowsPerPage, items.length);

  const paginationControls = (
    <TablePagination
      page={safePage}
      limit={rowsPerPage}
      total={items.length}
      onPageChange={setPage}
      onLimitChange={(limit) => {
        setRowsPerPage(limit);
        setPage(1);
      }}
      loading={isSorting}
    />
  );

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex items-center justify-between border-slate-200 border-b pb-3 dark:border-white/5">
        <h3 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
          Daftar Laporan ({items.length})
        </h3>
        <ViewModeToggle value={viewMode} onValueChange={setViewMode} buttonClassName="size-7" />
      </div>

      {items.length ? (
        viewMode === "table" ? (
          <div className="min-w-0 overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#131A26] dark:shadow-none">
            <div className="overflow-x-auto">
              <Table className="min-w-[1180px]">
                <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur dark:bg-[#131A26]/95">
                  <TableRow className="hover:bg-transparent border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                    <TableHead className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#7C8798] pl-6 py-3.5">
                      Status & Urgensi
                    </TableHead>
                    <TableHead className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#7C8798] py-3.5">
                      Judul Laporan
                    </TableHead>
                    <TableHead className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#7C8798] py-3.5">
                      Kategori
                    </TableHead>
                    <TableHead className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#7C8798] py-3.5">
                      Pengirim
                    </TableHead>
                    <TableHead className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#7C8798] py-3.5">
                      Wilayah
                    </TableHead>
                    <SortableTableHeader
                      className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#7C8798] py-3.5"
                      column="updatedAt"
                      sortDirection={dateSortDirection}
                      onSortChange={(direction) => {
                        void sortByDate(direction);
                      }}
                    >
                      Tanggal
                    </SortableTableHeader>
                    <TableHead className="w-24 py-3.5 pr-6 text-right font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider dark:text-[#7C8798]">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className={isSorting ? "opacity-50" : undefined}>
                  {paginatedItems.map((item) => {
                    const version = currentVersion(item);
                    const fieldOfficer = item.createdByFieldOfficerAssignment;
                    return (
                      <TableRow
                        key={item.id}
                        className="border-slate-200 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <TableCell className="pl-6 py-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className="rounded-full border px-2 py-0.5 font-mono font-bold text-[10px] tracking-wide"
                              style={{
                                color: item.status === "SENT_TO_OIM" ? "#06B6D4" : "#10B981",
                                backgroundColor: item.status === "SENT_TO_OIM" ? "#06B6D415" : "#10B98115",
                                borderColor: item.status === "SENT_TO_OIM" ? "#06B6D430" : "#10B98130",
                              }}
                            >
                              {baketStatusLabel(item.status)}
                            </span>
                            <span
                              className="rounded-full border px-2 py-0.5 font-mono font-bold text-[10px] tracking-wide"
                              style={urgencyBadgeStyle(version.urgency)}
                            >
                              {version.urgency ?? "NORMAL"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 max-w-[280px]">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 leading-relaxed">
                            {version.displayTitle ?? "Baket tanpa isi"}
                          </h4>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="text-[10.5px] font-mono text-slate-600 dark:text-[#7C8798] border border-slate-200 dark:border-white/10 px-1.5 py-0.5 rounded bg-slate-50 dark:bg-white/5 uppercase">
                              {item.reportCategory?.name ?? "Tidak tersedia"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 font-mono text-xs text-slate-700 dark:text-[#94A3B8]">
                          <GaswilEntityLink
                            name={fieldOfficerUserName(fieldOfficer)}
                            assignmentId={fieldOfficer.id}
                            userProfileId={fieldOfficer.userProfile?.id}
                          />
                        </TableCell>
                        <TableCell className="py-4 font-mono text-xs text-slate-700 dark:text-[#94A3B8]">
                          {administrativeAreaLabel(version.eventArea)}
                        </TableCell>
                        <TableCell className="py-4 font-mono text-xs text-slate-500 dark:text-[#7C8798] whitespace-nowrap">
                          {fmtDate(item.updatedAt)}
                        </TableCell>
                        <TableCell className="pr-6 py-4 text-right">
                          <Button
                            asChild
                            variant="ghost"
                            className="border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-[#06B6D4]/50 bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white rounded-lg h-8 px-3 transition-all duration-[150ms] ease-out cursor-pointer"
                          >
                            <Link href={`/dashboard/oim/laporan-masuk/${item.id}`}>Tinjau</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {paginationControls}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-6">
              {paginatedItems.map((item) => {
                const version = currentVersion(item);
                const fieldOfficer = item.createdByFieldOfficerAssignment;
                return (
                  <div
                    key={item.id}
                    className="group flex flex-col rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 hover:shadow-md dark:border-white/5 dark:bg-[#131A26] dark:shadow-none dark:hover:border-white/15"
                  >
                    <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="rounded-full border px-2 py-0.5 font-mono font-bold text-[10px] tracking-wide"
                            style={{
                              color: item.status === "SENT_TO_OIM" ? "#06B6D4" : "#10B981",
                              backgroundColor: item.status === "SENT_TO_OIM" ? "#06B6D415" : "#10B98115",
                              borderColor: item.status === "SENT_TO_OIM" ? "#06B6D430" : "#10B98130",
                            }}
                          >
                            {baketStatusLabel(item.status)}
                          </span>
                          <span
                            className="rounded-full border px-2 py-0.5 font-mono font-bold text-[10px] tracking-wide"
                            style={urgencyBadgeStyle(version.urgency)}
                          >
                            {version.urgency ?? "NORMAL"}
                          </span>

                          <span className="text-[12px] font-mono text-slate-600 dark:text-[#7C8798] border border-slate-200 dark:border-white/10 px-2 py-0.5 rounded bg-slate-50 dark:bg-white/5 uppercase">
                            Kategori: {item.reportCategory?.name ?? "Tidak tersedia"}
                          </span>

                          <span className="text-xs text-muted-foreground/60 font-mono">
                            v{item.currentVersionNumber}
                          </span>
                        </div>

                        <h2 className="line-clamp-2 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                          {version.displayTitle ?? "Baket tanpa isi"}
                        </h2>

                        <p className="text-[14px] text-slate-600 dark:text-[#94A3B8] leading-relaxed line-clamp-2">
                          {version.normalizedContent ?? version.originalContent ?? "Belum ada ringkasan."}
                        </p>

                        <p className="pt-1 font-mono text-xs text-slate-500 dark:text-[#7C8798]">
                          Petugas:{" "}
                          <GaswilEntityLink
                            name={fieldOfficerUserName(fieldOfficer)}
                            assignmentId={fieldOfficer.id}
                            userProfileId={fieldOfficer.userProfile?.id}
                          />{" "}
                          · {administrativeAreaLabel(version.eventArea)} · {fmtDate(item.updatedAt)}
                        </p>
                      </div>

                      <Button
                        asChild
                        variant="ghost"
                        className="border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-[#06B6D4]/50 bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white rounded-lg h-10 px-4 transition-all duration-[150ms] ease-out shrink-0 cursor-pointer"
                      >
                        <Link href={`/dashboard/oim/laporan-masuk/${item.id}`} className="flex items-center gap-2">
                          <span>Tinjau</span>
                          <ArrowRight className="size-4" style={{ strokeWidth: "2px" }} />
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#131A26] dark:shadow-none">
              {paginationControls}
            </div>
          </div>
        )
      ) : (
        <div className="flex min-h-[220px] select-none flex-col items-center justify-center space-y-4 rounded-[8px] border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-white/5 dark:bg-[#131A26] dark:shadow-none">
          <div className="size-12 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-muted-foreground/60 border border-slate-200 dark:border-white/10">
            <DOMAIN_VISUALS.baket.Icon className="size-6" style={{ strokeWidth: "2px" }} />
          </div>
          <div className="space-y-1">
            <h3 className="text-[15px] font-bold text-slate-900 tracking-tight dark:text-white">
              Tidak ada intake aktif
            </h3>
            <p className="text-[13px] text-slate-600 dark:text-[#94A3B8]">
              Semua laporan intelijen telah selesai diproses.
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() => window.location.reload()}
            className="border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-[#06B6D4]/50 bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-xs text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white rounded-md h-8 px-3 flex items-center gap-1.5 transition-all duration-[150ms] cursor-pointer"
          >
            <RefreshCw className="size-3.5" style={{ strokeWidth: "2px" }} />
            <span>Sinkronkan</span>
          </Button>
        </div>
      )}
    </div>
  );
}

function ReportStatusTabs({ activeStatus }: { activeStatus?: string }) {
  const tabs = [
    ["SENT_TO_OIM", "Baru"],
    ["UNDER_VERIFICATION", "Sedang Terverifikasi"],
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
              <Badge variant="outline">KATEGORI: {baket.reportCategory?.name ?? "Kategori legacy"}</Badge>
            </div>
            <CardTitle>{version.displayTitle ?? "Baket"}</CardTitle>
            <CardDescription>
              {eventAreaLabel} · {fmtDate(version.reportedAt)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="whitespace-pre-wrap leading-7">
              {version.normalizedContent ?? version.originalContent ?? "—"}
            </div>
            <Separator />
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Petugas Wilayah (Gaswil) Pengirim</dt>
                <dd className="mt-1 flex items-center gap-2 font-medium">
                  <UserRound className="size-4" />
                  <GaswilEntityLink
                    name={fieldOfficerUserName(fieldOfficer)}
                    assignmentId={fieldOfficer.id}
                    userProfileId={fieldOfficer.userProfile?.id}
                  />
                </dd>
                <dd className="text-xs text-muted-foreground">{fieldOfficer.position?.title ?? "Petugas Organik"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Jaring sumber</dt>
                <dd className="mt-1 font-medium">
                  {baket.primaryJaring?.aliasName ?? baket.primaryJaring?.fullName ?? baket.primaryJaring?.id ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Waktu pelaporan</dt>
                <dd className="mt-1 font-medium">{fmtDate(version.reportedAt)}</dd>
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
                <div className="max-w-56 overflow-hidden rounded-lg border bg-muted">
                  <EvidenceImageViewer
                    src={`/api/files/${primaryPhoto.fileId ?? primaryPhoto.file?.id}`}
                    alt={primaryPhoto.file?.originalName ?? "Foto bukti laporan Baket"}
                    fileName={
                      primaryPhoto.file?.originalName ?? String(primaryPhoto.fileId ?? primaryPhoto.file?.id ?? "bukti")
                    }
                    caption={primaryPhoto.caption ?? primaryPhoto.file?.mimeType}
                  />
                </div>
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
                    title={version.displayTitle ?? "Lokasi Baket"}
                    areaLabel={eventAreaLabel}
                    urgency={version.urgency}
                  />
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Koordinat lokasi tidak tersedia.
              </p>
            )}
            {evidence.length ? (
              <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(11rem,13rem))]">
                {evidence.map((entry) => {
                  const file = (entry.file ?? {}) as Row;
                  const fileId = entry.fileId ?? file.id;
                  return (
                    <EvidenceAttachmentViewer
                      key={fileId}
                      src={`/api/files/${fileId}`}
                      fileName={String(file.originalName ?? fileId)}
                      mimeType={String(file.mimeType ?? "application/octet-stream")}
                      caption={String(entry.caption ?? file.mimeType ?? "Bukti Baket")}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground">Tidak ada foto atau lampiran bukti.</p>
            )}
            {sourceMessages.map((source) => (
              <div key={source.messageId} className="rounded-lg border p-3">
                <p className="font-medium">
                  Pesan sumber ·{" "}
                  {source.message?.jaring?.aliasName ??
                    source.message?.jaring?.fullName ??
                    source.message?.jaring?.id ??
                    "Jaring"}
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
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button disabled={disabled || pending} className="w-full">
          <ClipboardCheck />
          {pending ? "Memproses…" : disabled ? "Keputusan sudah final" : "Mulai verifikasi"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mulai Verifikasi Laporan?</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin memulai verifikasi untuk laporan Baket ini?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Kembali</AlertDialogCancel>
          <AlertDialogAction
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
            Ya, Mulai
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={locked || pending || !reliability || !credibility} variant="success" className="w-full">
                <CheckCircle2 />
                Terverifikasi
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Verifikasi Laporan Baket?</AlertDialogTitle>
                <AlertDialogDescription>
                  Apakah Anda yakin ingin menyelesaikan penilaian dan menetapkan status laporan ini sebagai
                  Terverifikasi?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Kembali</AlertDialogCancel>
                <AlertDialogAction
                  variant="success"
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
                  Ya, Verifikasi
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={locked || pending} variant="warning" className="w-full">
                Perlu pengembangan
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Minta Pengembangan Laporan?</AlertDialogTitle>
                <AlertDialogDescription>
                  Apakah Anda yakin status laporan ini perlu pengembangan lebih lanjut?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Kembali</AlertDialogCancel>
                <AlertDialogAction
                  variant="warning"
                  onClick={() =>
                    act(() =>
                      apiBrowserMutation("POST", `/verifications/${verification.id}/needs-development`, {
                        reason: summary || "Perlu pengembangan",
                        requiredInformation: "Lengkapi fakta, lokasi, dan evidence pendukung.",
                      }),
                    )
                  }
                >
                  Ya, Minta Pengembangan
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={locked || pending} variant="destructive" className="w-full">
                Tolak
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tolak Laporan Baket?</AlertDialogTitle>
                <AlertDialogDescription>
                  Apakah Anda yakin ingin menolak laporan Baket ini? Keputusan ini tidak dapat dibatalkan.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Kembali</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() =>
                    act(() =>
                      apiBrowserMutation("POST", `/verifications/${verification.id}/reject`, {
                        reason: summary || "Informasi tidak memenuhi standar verifikasi.",
                      }),
                    )
                  }
                >
                  Ya, Tolak
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

function AnalysisList({ data }: { data: OimPageData }) {
  const items = rows(data.analyses);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const totalPages = Math.ceil(items.length / rowsPerPage) || 1;
  const safePage = Math.min(page, totalPages);
  const paginatedItems = items.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);
  const startRow = (safePage - 1) * rowsPerPage + 1;
  const endRow = Math.min(safePage * rowsPerPage, items.length);

  const paginationControls = (
    <TablePagination
      page={safePage}
      limit={rowsPerPage}
      total={items.length}
      onPageChange={setPage}
      onLimitChange={(limit) => {
        setRowsPerPage(limit);
        setPage(1);
      }}
    />
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-2">
        <h3 className="font-mono text-xs font-bold tracking-wider text-slate-500 dark:text-[#7C8798] uppercase">
          Daftar Analisis ({items.length})
        </h3>
        <ViewModeToggle value={viewMode} onValueChange={setViewMode} buttonClassName="size-7" />
      </div>

      {items.length ? (
        viewMode === "table" ? (
          <div className="rounded-[18px] bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm dark:shadow-none">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                    <TableHead className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#7C8798] pl-6 py-3.5">
                      Status
                    </TableHead>
                    <TableHead className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#7C8798] py-3.5">
                      Judul Analisis
                    </TableHead>
                    <TableHead className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#7C8798] py-3.5">
                      Sumber
                    </TableHead>
                    <TableHead className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#7C8798] py-3.5">
                      Versi Aktif
                    </TableHead>
                    <SortableTableHeader
                      className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#7C8798] py-3.5"
                      column="updatedAt"
                    >
                      Terakhir Diperbarui
                    </SortableTableHeader>
                    <TableHead className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#7C8798] pr-6 py-3.5 text-right">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((item) => (
                    <TableRow
                      key={item.id}
                      className="border-slate-200 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <TableCell className="pl-6 py-4">
                        <StatusBadge value={item.status} />
                      </TableCell>
                      <TableCell className="font-medium text-slate-900 dark:text-white py-4 max-w-sm truncate">
                        {item.title}
                      </TableCell>
                      <TableCell className="text-slate-500 dark:text-[#7C8798] py-4">
                        {item._count?.sources ?? 0} sumber
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500 dark:text-[#7C8798] py-4">
                        v{item.currentVersionNumber}
                      </TableCell>
                      <TableCell className="text-slate-500 dark:text-[#7C8798] py-4">
                        {fmtDate(item.updatedAt)}
                      </TableCell>
                      <TableCell className="pr-6 py-4 text-right">
                        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                          <Link href={`/dashboard/oim/analisis-intelijen/${item.id}`}>Buka</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {paginationControls}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {paginatedItems.map((item) => (
                <Card key={item.id} className="border border-slate-200 dark:border-white/5 bg-white dark:bg-[#131A26]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge value={item.status} />
                      <span className="font-mono text-xs text-muted-foreground">v{item.currentVersionNumber}</span>
                    </div>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 mt-2">
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3 text-xs text-slate-500 dark:text-[#7C8798]">
                    <div className="flex justify-between items-center">
                      <span>{item._count?.sources ?? 0} Sumber Laporan</span>
                      <span>Diperbarui: {fmtDate(item.updatedAt)}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2 border-t border-slate-200 dark:border-white/5 flex justify-end">
                    <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                      <Link href={`/dashboard/oim/analisis-intelijen/${item.id}`}>Buka</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
            <div className="rounded-[18px] bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm dark:shadow-none">
              {paginationControls}
            </div>
          </div>
        )
      ) : (
        <div className="rounded-[18px] bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/5 p-8 text-center text-muted-foreground text-sm">
          Tidak ada analisis intelijen tersedia.
        </div>
      )}
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
          Hanya verifikasi kanonis berstatus terverifikasi dalam cakupan OIM yang dapat dipilih.
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
                    <b className="block text-sm">
                      {source.baketVersion?.title ?? "Bahan Keterangan (Baket) terverifikasi"}
                    </b>
                    <span className="text-muted-foreground text-xs">
                      {administrativeAreaLabel(source.baketVersion?.eventArea)}
                    </span>
                  </span>
                </label>
              );
            })
          ) : (
            <p className="rounded-lg border border-dashed p-6 text-muted-foreground text-sm">
              Belum ada Bahan Keterangan (Baket) terverifikasi dalam cakupan Anda.
            </p>
          )}
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={pending || !title.trim() || selected.length === 0}>
              <Plus />
              {pending ? "Membuat..." : "Buat kasus analisis"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Buat Kasus Analisis?</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin membuat kasus analisis baru dengan {selected.length} sumber Bahan Keterangan
                (Baket) terverifikasi yang dipilih?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Kembali</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  start(async () => {
                    try {
                      const created = await apiBrowserMutation<Row>("POST", "/analysis-cases", {
                        title,
                        verificationIds: selected,
                      });
                      router.push(`/dashboard/oim/analisis-intelijen/${created.id}`);
                      toast.success("Kasus analisis berhasil dibuat");
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Gagal membuat analisis");
                    }
                  })
                }
              >
                Ya, Buat
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
              Analisis final akan dikunci dan dapat dipakai untuk membuat Laporan Intelijen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={locked || pending || !version.id} variant="outline" className="w-full">
                  Simpan draf
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Simpan Draf Analisis?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Apakah Anda yakin ingin menyimpan perubahan analisis ini sebagai draf?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Kembali</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      start(async () => {
                        try {
                          await apiBrowserMutation("PATCH", `/analysis-versions/${version.id}`, form);
                          toast.success("Draf tersimpan");
                          router.refresh();
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "Gagal menyimpan");
                        }
                      })
                    }
                  >
                    Ya, Simpan
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={locked || pending || !version.id} variant="success" className="w-full">
                  <CheckCircle2 />
                  Finalkan analisis
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Finalkan Analisis Intelijen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Apakah Anda yakin ingin memfinalkan analisis ini? Analisis yang difinalkan akan dikunci dan siap
                    digunakan untuk membuat Laporan Intelijen.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Kembali</AlertDialogCancel>
                  <AlertDialogAction
                    variant="success"
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
                    Ya, Finalkan
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
                    {administrativeAreaLabel(baketVersion.eventArea)} ·{" "}
                    <GaswilEntityLink
                      name={fieldOfficerUserName(fieldOfficer)}
                      assignmentId={fieldOfficer?.id}
                      userProfileId={fieldOfficer?.userProfile?.id}
                    />
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
  const searchParams = useSearchParams();
  const context = productContext(data);
  const initialItems = useMemo(
    () =>
      rows(data.products).filter(
        (item) =>
          !approval ||
          ["DRAFT", "READY_FOR_SUBMISSION", "NEEDS_REVISION", "UNDER_REGIONAL_REVIEW"].includes(item.status),
      ),
    [approval, data.products],
  );
  const [items, setItems] = useState<Row[]>(initialItems);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [dateSortDirection, setDateSortDirection] = useState<"asc" | "desc">("desc");
  const [isSorting, setIsSorting] = useState(false);

  useEffect(() => {
    setItems(initialItems);
    setPage(1);
  }, [initialItems]);

  async function sortByDate(direction: "asc" | "desc") {
    try {
      setIsSorting(true);
      const result = await apiBrowserFetch<unknown>("/products", {
        query: {
          page: 1,
          limit: 100,
          areaId: searchParams.get("areaId") || undefined,
          search: searchParams.get("search") || undefined,
          status: searchParams.get("status") || undefined,
          classification: searchParams.get("classification") || undefined,
          productTypeId: context.productTypeId ?? searchParams.get("productTypeId") ?? undefined,
          periodFrom: searchParams.get("periodStart") || undefined,
          periodTo: searchParams.get("periodEnd") || undefined,
          sortBy: "updatedAt",
          sortOrder: direction,
        },
      });

      setItems(
        rows(result).filter(
          (item) =>
            !approval ||
            ["DRAFT", "READY_FOR_SUBMISSION", "NEEDS_REVISION", "UNDER_REGIONAL_REVIEW"].includes(item.status),
        ),
      );
      setDateSortDirection(direction);
      setPage(1);
    } catch {
      toast.error("Urutan tanggal Laporan Intelijen belum dapat diperbarui.");
    } finally {
      setIsSorting(false);
    }
  }

  const totalPages = Math.ceil(items.length / rowsPerPage) || 1;
  const safePage = Math.min(page, totalPages);
  const paginatedItems = items.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);
  const startRow = (safePage - 1) * rowsPerPage + 1;
  const endRow = Math.min(safePage * rowsPerPage, items.length);

  const paginationControls = (
    <TablePagination
      page={safePage}
      limit={rowsPerPage}
      total={items.length}
      onPageChange={setPage}
      onLimitChange={(limit) => {
        setRowsPerPage(limit);
        setPage(1);
      }}
      loading={isSorting}
    />
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-2">
        <h3 className="font-mono text-xs font-bold tracking-wider text-slate-500 dark:text-[#7C8798] uppercase">
          {context.listTitle} ({items.length})
        </h3>
        <ViewModeToggle value={viewMode} onValueChange={setViewMode} buttonClassName="size-7" />
      </div>

      {items.length ? (
        viewMode === "table" ? (
          <div className="rounded-[18px] bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm dark:shadow-none">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                    <TableHead className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#7C8798] pl-6 py-3.5">
                      Klasifikasi & Status
                    </TableHead>
                    <TableHead className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#7C8798] py-3.5">
                      Judul Laporan
                    </TableHead>
                    <TableHead className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#7C8798] py-3.5">
                      Nomor Laporan
                    </TableHead>
                    <TableHead className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#7C8798] py-3.5">
                      Jenis Laporan
                    </TableHead>
                    <SortableTableHeader
                      className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#7C8798] py-3.5"
                      column="updatedAt"
                      sortDirection={dateSortDirection}
                      onSortChange={(direction) => void sortByDate(direction)}
                    >
                      Tanggal
                    </SortableTableHeader>
                    <TableHead className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#7C8798] pr-6 py-3.5 text-right">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className={isSorting ? "opacity-60 transition-opacity" : "transition-opacity"}>
                  {paginatedItems.map((item) => {
                    const classStyle = getClassificationStyles(item.classification);
                    const statusStyle = getProductStatusStyles(item.status);
                    return (
                      <TableRow
                        key={item.id}
                        className="border-slate-200 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <TableCell className="pl-6 py-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className="px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider border rounded"
                              style={{
                                color: classStyle.color,
                                backgroundColor: classStyle.bgColor,
                                borderColor: classStyle.borderColor,
                              }}
                            >
                              {classStyle.label}
                            </span>
                            <span
                              className="px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider border rounded"
                              style={{
                                color: statusStyle.color,
                                backgroundColor: statusStyle.bgColor,
                                borderColor: statusStyle.borderColor,
                              }}
                            >
                              {statusStyle.label}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 max-w-[320px]">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                            {item.title ?? "Laporan Intelijen tanpa judul"}
                          </h4>
                        </TableCell>
                        <TableCell className="py-4 font-mono text-xs text-slate-700 dark:text-[#94A3B8]">
                          {item.productNumber ?? "—"}
                        </TableCell>
                        <TableCell className="py-4 font-mono text-xs text-slate-700 dark:text-[#94A3B8] uppercase">
                          {item.productType?.name ?? "Laporan Intelijen"}
                        </TableCell>
                        <TableCell className="py-4 font-mono text-xs text-slate-500 dark:text-[#7C8798] whitespace-nowrap">
                          {fmtDate(item.updatedAt)}
                        </TableCell>
                        <TableCell className="pr-6 py-4 text-right">
                          <Button
                            asChild
                            variant="ghost"
                            className="border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-[#06B6D4]/50 bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white rounded-lg h-8 px-3 transition-all duration-[150ms] ease-out cursor-pointer"
                          >
                            <Link
                              href={
                                approval
                                  ? `/dashboard/oim/pengajuan-persetujuan/${item.id}`
                                  : `${context.detailBasePath}/${item.id}`
                              }
                            >
                              {approval ? "Siapkan pengajuan" : "Buka"}
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {paginationControls}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3">
              {paginatedItems.map((item) => {
                const classStyle = getClassificationStyles(item.classification);
                const statusStyle = getProductStatusStyles(item.status);
                return (
                  <Card
                    key={item.id}
                    size="sm"
                    className="bg-white dark:bg-[#131A26] border-slate-200 dark:border-white/5"
                  >
                    <CardContent className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                      <div className="flex items-start gap-3">
                        <div className="grid size-10 place-items-center rounded-lg bg-primary/10">
                          <DOMAIN_VISUALS.intelligenceReport.Icon className={`size-5 ${DOMAIN_VISUALS.intelligenceReport.iconClass}`} />
                        </div>
                        <div>
                          <div className="flex flex-wrap gap-2">
                            <span
                              className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider border rounded"
                              style={{
                                color: classStyle.color,
                                backgroundColor: classStyle.bgColor,
                                borderColor: classStyle.borderColor,
                              }}
                            >
                              {classStyle.label}
                            </span>
                            <span
                              className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider border rounded"
                              style={{
                                color: statusStyle.color,
                                backgroundColor: statusStyle.bgColor,
                                borderColor: statusStyle.borderColor,
                              }}
                            >
                              {statusStyle.label}
                            </span>
                          </div>
                          <h2 className="mt-2 font-medium">{item.title}</h2>
                          <p className="font-mono text-xs text-muted-foreground">
                            {item.productNumber} · {item.productType?.name ?? "Laporan Intelijen"}
                          </p>
                        </div>
                      </div>
                      <Button asChild variant="outline" className="cursor-pointer">
                        <Link
                          href={
                            approval
                              ? `/dashboard/oim/pengajuan-persetujuan/${item.id}`
                              : `${context.detailBasePath}/${item.id}`
                          }
                        >
                          {approval ? "Siapkan pengajuan" : "Buka"}
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <div className="rounded-[18px] bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm dark:shadow-none">
              {paginationControls}
            </div>
          </div>
        )
      ) : (
        <div className="rounded-[18px] bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/5 p-8 flex flex-col items-center justify-center text-center space-y-4 select-none min-h-[220px] shadow-sm dark:shadow-none">
          <div className="size-12 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-muted-foreground/60 border border-slate-200 dark:border-white/10">
            <DOMAIN_VISUALS.intelligenceReport.Icon className="size-6" style={{ strokeWidth: "2px" }} />
          </div>
          <div className="space-y-1">
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              TIDAK ADA LAPORAN
            </h3>
            <p className="text-[13px] text-slate-600 dark:text-[#94A3B8]">
              Belum ada {context.label} yang terdaftar.
            </p>
          </div>
        </div>
      )}
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
      PERMASALAHAN_AGENDA: version.displayTitle ?? "Baket tanpa isi",
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
  const context = productContext(data);
  const productTypes = rows(data.productTypes)
    .filter((item) => !context.productTypeId || item.id === context.productTypeId)
    .slice()
    .sort((left, right) => Number(left.formatNo ?? 0) - Number(right.formatNo ?? 0));
  const analyses = rows(data.analyses).filter((item) => item.status === "VALIDATED");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selectedProductTypeId, setSelectedProductTypeId] = useState(context.productTypeId ?? "");
  const [template, setTemplate] = useState<Row | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [analysisCase, setAnalysisCase] = useState<Row | null>(null);
  const [classification, setClassification] = useState("TERBATAS");
  const [title, setTitle] = useState("");
  const selectedProductType = productTypes.find((item) => item.id === selectedProductTypeId) ?? null;
  const isJournal = selectedProductType?.code === "JURNAL_INFORMASI";
  const journalRows = buildJournalRows(analysisCase);
  const analysisVersion = useMemo(() => (analysisCase ? currentVersion(analysisCase) : {}), [analysisCase]);
  const productContent = buildProductContent(template, fieldValues, journalRows);

  // Alur kerja Laporan Intelijen
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
  }, [template, analysisVersion]);

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
            routingTo: "Kepala BIN Daerah (Kabinda)",
            routingFrom: "Manajer Intelijen Operasional",
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
          toast.success(`${context.label} final dikirim ke Kepala BIN Daerah (Kabinda)`);
        } else {
          toast.success(`Draf ${context.label} tersimpan`);
        }
        router.push(`${context.detailBasePath}/${result.id}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : `Gagal menyimpan ${context.label}`);
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
          <Card className="flex h-[min(42rem,72svh)] min-h-[30rem] flex-col overflow-hidden border-border/80 bg-card/85 shadow-lg">
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
                        Judul Laporan
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
                SIMPAN OTOMATIS - DRAF AMAN
              </span>
              <span>VER: v1.0.0-draf - PRATINJAU SINKRON</span>
            </div>
          </Card>
        </div>

        {/* KANAN: Document Workspace Preview */}
        <div className="flex h-[min(42rem,72svh)] min-h-[30rem] min-w-0 flex-col overflow-hidden rounded-[var(--dc-radius-lg)] border border-slate-200 bg-[#f1f5f9] shadow-[0_24px_60px_rgba(0,0,0,0.08)] dark:border-[#2c3747] dark:bg-[#1B2230] dark:shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
          {/* Toolbar Preview */}
          <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-slate-200 dark:border-white/8 bg-slate-100 dark:bg-[#131C2B] px-3 font-mono text-[10px] select-none">
            <div className="flex min-w-0 items-center gap-2 text-slate-600 dark:text-[#8F9FB4]">
              <Badge
                variant="outline"
                className="shrink-0 border-slate-300 dark:border-[#324155] bg-slate-200/50 dark:bg-[#1A2434] font-mono text-[8px] uppercase text-sky-600 dark:text-sky-300"
              >
                Pratinjau Aman
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
                title="Perkecil pratinjau"
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
                title="Perbesar pratinjau"
              >
                <Plus className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="xs"
                className="hidden h-6 border border-slate-200 dark:border-[#324155] bg-white dark:bg-[#1A2434] px-2 font-mono text-[9px] text-slate-700 dark:text-[#C8D3E2] hover:bg-slate-100 dark:hover:bg-[#233248] sm:inline-flex"
                onClick={() => setZoom(90)}
                title="Sesuaikan lebar pratinjau"
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
                title="Segarkan pratinjau"
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
            Draf Tersimpan
          </span>
          <span className="hidden text-slate-200 dark:text-white/10 sm:inline">|</span>
          <span className="hidden sm:inline">Terakhir disimpan: 09:42</span>
          <span className="hidden text-slate-200 dark:text-white/10 md:inline">|</span>
          <span className="hidden md:inline">Versi: v1.0.3</span>
          <span className="hidden text-slate-200 dark:text-white/10 lg:inline">|</span>
          <span className="hidden lg:inline">
            Simpan otomatis: <span className="text-emerald-600 dark:text-emerald-400 font-bold">Aktif</span>
          </span>
        </div>

        {/* RIGHT Section Actions */}
        <div className="ml-auto flex items-center gap-2">
          {/* Secondary Button: Simpan Draf */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                disabled={pending || !canSave}
                variant="outline"
                className="h-9 rounded-[4px] border border-slate-300 dark:border-[#3A4657] bg-transparent px-3 font-mono text-xs text-slate-700 dark:text-[#C8D3E2] transition-all duration-200 hover:scale-[1.02] hover:bg-slate-100 dark:hover:bg-[#1A2434] active:scale-[0.98] active:bg-slate-200 dark:active:bg-[#141C28] sm:px-4"
              >
                <DOMAIN_VISUALS.intelligenceReport.Icon className="mr-1 size-3.5" />
                Simpan Draf
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Simpan Draf Laporan?</AlertDialogTitle>
                <AlertDialogDescription>
                  Apakah Anda yakin ingin menyimpan perubahan Laporan Intelijen ini sebagai draf?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Kembali</AlertDialogCancel>
                <AlertDialogAction onClick={() => saveProduct(false)}>Ya, Simpan</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Primary Button: Final & Teruskan */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                disabled={pending || !canSave}
                variant="success"
                className="h-9 rounded-[4px] px-3 font-mono text-xs font-bold transition-transform hover:scale-[1.02] active:scale-[0.98] sm:px-5"
              >
                <Send className="size-3.5 mr-1" />
                Final & Teruskan
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Kirim Laporan Intelijen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Apakah Anda yakin ingin memfinalkan Laporan Intelijen ini?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Kembali</AlertDialogCancel>
                <AlertDialogAction variant="success" onClick={() => saveProduct(true)}>
                  Ya, Kirim
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
            {title || "JUDUL LAPORAN INTELIJEN"}
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
            <p className="text-[10px] font-mono font-bold text-neutral-700">OIM - PENUGASAN VALID</p>
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
          <CardTitle>{product.title ?? "Laporan Intelijen"}</CardTitle>
          <CardDescription className="font-mono">{product.productNumber ?? "Nomor otomatis"}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="content">
            <TabsList>
              <TabsTrigger value="content">Isi</TabsTrigger>
              <TabsTrigger value="sources">Sumber</TabsTrigger>
              <TabsTrigger value="versions">Versi</TabsTrigger>
              <TabsTrigger value="approval">Persetujuan</TabsTrigger>
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
                  Versi {entry.versionNumber} - {fmtDate(entry.createdAt)}
                </div>
              ))}
            </TabsContent>
            <TabsContent value="approval">
              <p className="text-sm text-muted-foreground">
                {version.approvalWorkflow ? `Alur Persetujuan ${version.approvalWorkflow.status}` : "Belum diajukan."}
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>{approval ? "Pra-pengajuan" : "Kontrol Laporan Intelijen"}</CardTitle>
          <CardDescription>{"Alur: OIM -> Kepala BIN Daerah (Kabinda) -> Deputi II (baca setelah disetujui)."}</CardDescription>
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
            Cetak pratinjau
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
                    toast.success("Laporan Intelijen diajukan");
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
      <div className="absolute inset-0 pointer-events-none opacity-[0.015] dark:opacity-[0.03] z-0 bg-[linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] bg-[size:24px_24px] text-foreground/5 dark:text-white/5" />

      {/* Noise Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.01] dark:opacity-[0.015] z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      <main className="relative z-10 mx-auto w-full max-w-[1600px] space-y-5 sm:space-y-6">
        <Header view={view} data={data} />
        <ErrorBanner errors={data.errors} />
        {view === "dashboard" && (
          <>
            <Kpis data={data} />

            <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start">
              {/* Left Column: Prioritas Intake */}
              <div className="min-w-0 space-y-4">
                {/* SECTION HEADER */}
                <div className="space-y-1.5 border-b border-slate-200 dark:border-white/10 pb-4">
                  <h3 className="text-[15px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    PRIORITAS INTAKE
                  </h3>
                  <p className="text-[12px] font-medium text-slate-500 dark:text-[#7C8798]">
                    ANTREAN LAPORAN LAPANGAN PERLU TINDAK LANJUT
                  </p>
                </div>
                <BaketList data={data} />
              </div>

              {/* Right Column: Mission Pipeline Timeline */}
              <div className="min-w-0 rounded-[18px] bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/5 p-6 space-y-6 shadow-sm dark:shadow-none">
                {/* SECTION HEADER */}
                <div className="space-y-1.5 border-b border-slate-200 dark:border-white/10 pb-4">
                  <h3 className="text-[15px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    PIPELINE MISI
                  </h3>
                  <p className="text-[12px] font-medium text-slate-500 dark:text-[#7C8798]">
                    MONITORING ALUR KERJA INTELIJEN AKTIF HARI INI
                  </p>
                </div>

                <div className="relative border-l border-slate-200 dark:border-white/10 ml-3 pl-6 space-y-8 py-2">
                  {[
                    {
                      label: "Intake Baket",
                      count: bakets.filter((item) => item.status === "SENT_TO_OIM").length,
                      get status() {
                        return this.count === 0
                          ? "SELESAI DIPROSES"
                          : this.count > 5
                            ? "ANTREAN PENUH"
                            : "INTAKE BERJALAN";
                      },
                      get state() {
                        return this.count === 0 ? "completed" : this.count > 5 ? "bottleneck" : "active";
                      },
                      get eta() {
                        return this.count === 0 ? "0m" : `${this.count * 10}m`;
                      },
                    },
                    {
                      label: "Neraca Penilaian",
                      count: verifications.filter((item) => ["DRAFT", "IN_PROGRESS"].includes(item.status)).length,
                      get status() {
                        return this.count === 0
                          ? "TERVERIFIKASI"
                          : this.count > 5
                            ? "TERDETEKSI PENUMPUKAN"
                            : "DALAM TINJAUAN";
                      },
                      get state() {
                        return this.count === 0 ? "completed" : this.count > 5 ? "bottleneck" : "active";
                      },
                      get eta() {
                        return this.count === 0 ? "0m" : `${this.count * 15}m`;
                      },
                    },
                    {
                      label: "Analisis manual",
                      count: analyses.filter((item) => item.status !== "ARCHIVED").length,
                      get status() {
                        return this.count === 0 ? "SIAGA" : "MENGANALISIS";
                      },
                      get state() {
                        return this.count === 0 ? "pending" : "active";
                      },
                      get eta() {
                        return this.count === 0 ? "—" : "AKTIF";
                      },
                    },
                    {
                      label: "Laporan Intelijen resmi",
                      count: products.filter((item) => ["DRAFT", "NEEDS_REVISION"].includes(item.status)).length,
                      get status() {
                        return this.count === 0 ? "TIDAK ADA DRAF" : "PENULISAN";
                      },
                      get state() {
                        return this.count === 0 ? "pending" : "active";
                      },
                      get eta() {
                        return this.count === 0 ? "—" : "DALAM PROSES";
                      },
                    },
                    {
                      label: "Direktur/Kabinda",
                      count: products.filter((item) => ["SUBMITTED", "IN_REVIEW"].includes(item.status)).length,
                      get status() {
                        return this.count === 0 ? "MENUNGGU" : "PENGIRIMAN";
                      },
                      get state() {
                        return this.count === 0 ? "pending" : "active";
                      },
                      get eta() {
                        return this.count === 0 ? "—" : "TERTUNDA";
                      },
                    },
                  ].map((step) => {
                    const dotColor =
                      step.state === "completed"
                        ? "#10B981"
                        : // Emerald green
                          step.state === "active"
                          ? "#3B82F6"
                          : // Tactical blue
                            step.state === "bottleneck"
                            ? "#F59E0B"
                            : // Amber yellow
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
                              step.state === "active"
                                ? "text-blue-600 dark:text-[#3B82F6]"
                                : "text-slate-900 dark:text-white",
                            )}
                          >
                            {step.label}
                          </h4>
                          <div className="flex items-center gap-2 text-[12px] font-mono text-slate-500 dark:text-[#7C8798] uppercase">
                            <span>STATUS:</span>
                            <span style={{ color: dotColor }} className="font-semibold">
                              {step.status}
                            </span>
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
                            borderColor: `${dotColor}25`,
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
            <Filters areas={data.areas} reportCategories={data.reportCategories} />
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
        {view === "products" && <ProductList data={data} />}
        {view === "product-list" && (
          <>
            <Filters areas={data.areas} mode="product" productLabel={productContext(data).label} />
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
              Inti Monitoring C2 - SYS-REV-09
            </div>

            <Kpis data={data} />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  id: "MOD-01",
                  label: "BEBAN KERJA PERSONEL",
                  value: 72,
                  desc: "Kekuatan aktif - 72 dari 100 operasi",
                  status: "NORMAL",
                  statusColor: "bg-emerald-500",
                  progressColor: "bg-emerald-500/90",
                  trend: "+2.4% perubahan",
                  trendPositive: true,
                  icon: Users,
                },
                {
                  id: "MOD-02",
                  label: "TENGGAT TUGAS",
                  value: 45,
                  desc: "Misi selesai - 45 dari 100 STR",
                  status: "PERINGATAN",
                  statusColor: "bg-amber-500",
                  progressColor: "bg-amber-500/90",
                  trend: "-1.5% deviasi",
                  trendPositive: false,
                  icon: Clock,
                },
                {
                  id: "MOD-03",
                  label: "CAKUPAN WILAYAH",
                  value: 86,
                  desc: "Cakupan intelijen - sektor sasaran terkendali",
                  status: "AKTIF",
                  statusColor: "bg-emerald-500",
                  progressColor: "bg-emerald-500/90",
                  trend: "+5.1% rasio",
                  trendPositive: true,
                  icon: MapPin,
                },
                {
                  id: "MOD-04",
                  label: "LAPORAN MASUK",
                  value: 64,
                  desc: "Intake terverifikasi - 64 Baket valid",
                  status: "NORMAL",
                  statusColor: "bg-sky-500",
                  progressColor: "bg-sky-500/90",
                  trend: "+12.8% volume",
                  trendPositive: true,
                  icon: DOMAIN_VISUALS.baket.Icon,
                },
                {
                  id: "MOD-05",
                  label: "INSIDEN AKTIF",
                  value: 18,
                  desc: "Peringatan kritis - 18 sinyal darurat",
                  status: "KRITIS",
                  statusColor: "bg-red-500",
                  progressColor: "bg-red-500/90",
                  trend: "+2 sinyal aktif",
                  trendPositive: false,
                  icon: AlertCircle,
                },
                {
                  id: "MOD-06",
                  label: "PERKEMBANGAN LAPANGAN",
                  value: 58,
                  desc: "Pengumpulan data - target UUK terpenuhi",
                  status: "AKTIF",
                  statusColor: "bg-purple-500",
                  progressColor: "bg-purple-500/90",
                  trend: "+8.2% perkembangan",
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

                    {item.status === "KRITIS" && <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-red-500" />}
                    {item.status === "PERINGATAN" && (
                      <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-amber-500" />
                    )}

                    <CardHeader className="p-3.5 pb-2 flex flex-row items-center justify-between space-y-0 shrink-0">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] font-mono font-bold text-muted-foreground/40">{item.id}</span>
                          <CardTitle className="font-mono text-[9px] font-bold text-foreground tracking-wider">
                            {item.label}
                          </CardTitle>
                        </div>
                        <CardDescription className="text-[8px] font-mono text-muted-foreground/50 uppercase tracking-widest">
                          C2 - Pindai unit
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
                              item.status === "KRITIS" && "animate-ping",
                            )}
                          />
                          <span className="text-[8px] font-mono font-bold leading-none tracking-widest">
                            Status: {item.status}
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
                          className={cn(
                            "font-bold shrink-0",
                            item.trendPositive ? "text-emerald-500" : "text-amber-500",
                          )}
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
            <Filters areas={data.areas} reportCategories={data.reportCategories} />
            <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
              <SituationMap reports={data.map} boundaries={data.boundaries} />
              <Card>
                <CardHeader>
                  <CardTitle>Legenda situasi</CardTitle>
                  <CardDescription>Zoom rendah menampilkan agregasi; zoom tinggi menampilkan penanda.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Baket masuk</span>
                    <b>{rows((data.map as Row)?.features).length}</b>
                  </div>
                  <Separator />
                  <p className="text-xs text-muted-foreground">
                    Merah: mendesak - Kuning: tinggi - Biru: normal. Baket tanpa koordinat tetap tersedia pada daftar
                    laporan masuk.
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
              <h2 className="mt-3 font-medium">Data operasional berada dalam cakupan OIM</h2>
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
