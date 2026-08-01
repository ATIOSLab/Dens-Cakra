"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  FileEdit,
  FileText,
  History,
  ImageIcon,
  MapPin,
  Paperclip,
  RefreshCw,
  ShieldCheck,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { EvidenceImageViewer } from "@/features/baket/components/evidence-image-viewer";
import { apiBrowserFetch, apiBrowserMutation } from "@/lib/api/browser-client";
import { cn } from "@/lib/utils";

import type {
  JaringReportSessionDetail,
  PriorityLevel,
  ReportCategoryOption,
  ReportHistoryEvent,
  ReportHistoryResponse,
  VerificationStatus,
} from "./laporan-jaring-types";

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "-";
  }
}

function verificationStatusLabel(status: VerificationStatus) {
  switch (status) {
    case "WAITING_FIELD_OFFICER_VERIFICATION":
      return "Menunggu Verifikasi";
    case "NEEDS_FIELD_OFFICER_REVIEW":
      return "Perlu Review";
    case "VERIFIED_BY_FIELD_OFFICER":
      return "Terverifikasi (Siap Baket)";
    case "METADATA_RECORDED":
      return "Metadata & Baket Tersimpan";
    default:
      return status;
  }
}

function verificationStatusBadgeVariant(status: VerificationStatus) {
  switch (status) {
    case "WAITING_FIELD_OFFICER_VERIFICATION":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "NEEDS_FIELD_OFFICER_REVIEW":
      return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400";
    case "VERIFIED_BY_FIELD_OFFICER":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-[#38BDF8]";
    case "METADATA_RECORDED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    default:
      return "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-400";
  }
}

const URGENCY_OPTIONS: { value: PriorityLevel; label: string }[] = [
  { value: "LOW", label: "Rendah (Low)" },
  { value: "NORMAL", label: "Normal (Normal)" },
  { value: "HIGH", label: "Tinggi (High)" },
  { value: "URGENT", label: "Mendesak (Urgent)" },
];

export function LaporanJaringDetailClient({ laporanId }: { laporanId: string }) {
  const router = useRouter();
  const [activeReport, setActiveReport] = useState<JaringReportSessionDetail | null>(null);
  const [categories, setCategories] = useState<ReportCategoryOption[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(true);

  // Media preview toggle state (initially hidden as requested)
  const [showMediaPreview, setShowMediaPreview] = useState(false);

  // Step 1: Verification form state
  const [verificationNote, setVerificationNote] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Step 2: Metadata form state
  const [categoryId, setCategoryId] = useState("");
  const [urgency, setUrgency] = useState<PriorityLevel>("NORMAL");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [normalizedContent, setNormalizedContent] = useState("");
  const [fieldOfficerNote, setFieldOfficerNote] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);

  // History modal state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyEvents, setHistoryEvents] = useState<ReportHistoryEvent[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch report categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await apiBrowserFetch<ReportCategoryOption[]>("/jaring/report-categories");
        setCategories(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error("Gagal memuat kategori laporan:", err);
      }
    }
    void loadCategories();
  }, []);

  // Fetch report detail
  async function fetchDetail() {
    setLoadingDetail(true);
    try {
      const detail = await apiBrowserFetch<JaringReportSessionDetail>(`/jaring/reports/${laporanId}`);
      setActiveReport(detail);
      // Populate Step 2 form fields
      setCategoryId(detail.reportCategory?.id || "");
      setUrgency(detail.urgency || "NORMAL");
      setTitle(detail.title || detail.submittedMessage?.referenceNumber || "Laporan Jaring");
      setContent(detail.content || "");
      setNormalizedContent(detail.normalizedContent || "");
      setFieldOfficerNote(detail.fieldOfficerNote || "");
      if (detail.incidentAt) {
        try {
          const d = new Date(detail.incidentAt);
          setEventTime(d.toISOString().slice(0, 16));
        } catch {
          setEventTime("");
        }
      } else {
        setEventTime("");
      }
    } catch (err) {
      console.error("Gagal memuat detail laporan:", err);
      toast.error("Detail laporan tidak ditemukan.");
    } finally {
      setLoadingDetail(false);
    }
  }

  useEffect(() => {
    void fetchDetail();
  }, [laporanId]);

  // Handler: Verify Report (Step 1)
  async function handleVerifyReport() {
    if (!activeReport) return;
    setIsVerifying(true);
    try {
      const updated = await apiBrowserMutation<JaringReportSessionDetail>(
        "POST",
        `/jaring/reports/${activeReport.id}/verify`,
        { note: verificationNote.trim() || undefined },
      );
      toast.success(
        updated.verificationStatus === "VERIFIED_BY_FIELD_OFFICER"
          ? "Laporan berhasil diverifikasi. Lanjutkan pengisian metadata & Baket."
          : "Laporan ditandai perlu review tambahan.",
      );
      setActiveReport(updated);
      setVerificationNote("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memproses verifikasi laporan.");
    } finally {
      setIsVerifying(false);
    }
  }

  // Handler: Save Metadata (Step 2)
  async function handleSaveMetadata() {
    if (!activeReport) return;
    if (!categoryId) {
      toast.error("Kategori laporan wajib dipilih.");
      return;
    }
    if (!urgency) {
      toast.error("Tingkat urgency wajib dipilih.");
      return;
    }
    setIsSavingMetadata(true);
    try {
      const updated = await apiBrowserMutation<JaringReportSessionDetail>(
        "PATCH",
        `/jaring/reports/${activeReport.id}/metadata`,
        {
          categoryId,
          urgency,
          title: title.trim() || undefined,
          content: content.trim() || undefined,
          normalizedContent: normalizedContent.trim() || undefined,
          fieldOfficerNote: fieldOfficerNote.trim() || undefined,
          eventTime: eventTime ? new Date(eventTime).toISOString() : undefined,
        },
      );
      toast.success("Metadata & Formulasi Baket berhasil disimpan.");
      setActiveReport(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan metadata laporan.");
    } finally {
      setIsSavingMetadata(false);
    }
  }

  // Handler: Open History Dialog
  async function handleOpenHistory() {
    if (!activeReport) return;
    setHistoryOpen(true);
    setLoadingHistory(true);
    try {
      const res = await apiBrowserFetch<ReportHistoryResponse>(`/jaring/reports/${activeReport.id}/history`);
      setHistoryEvents(res.events || []);
    } catch (err) {
      toast.error("Gagal memuat riwayat perubahan.");
    } finally {
      setLoadingHistory(false);
    }
  }

  const mediaList = activeReport?.media || [];

  return (
    <main className="space-y-6 p-4 md:p-6 lg:p-8 max-w-5xl mx-auto transition-colors duration-150">
      {/* HEADER & BREADCRUMB */}
      <div className="space-y-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard" className="text-muted-foreground hover:text-foreground">
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard/field-officer/laporan-jaring" className="text-muted-foreground hover:text-foreground">
                Laporan Jaring
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium text-foreground">Detail Laporan</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              asChild
              className="size-9 rounded-lg border-slate-200/80 dark:border-white/10 shrink-0"
            >
              <Link href="/dashboard/field-officer/laporan-jaring">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-sky-600 dark:text-[#38BDF8]">
                  {activeReport?.referenceNumber || laporanId}
                </span>
                {activeReport?.verificationStatus ? (
                  <span
                    className={cn(
                      "inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      verificationStatusBadgeVariant(activeReport.verificationStatus),
                    )}
                  >
                    {verificationStatusLabel(activeReport.verificationStatus)}
                  </span>
                ) : null}
              </div>
              <h1 className="font-bold text-2xl text-foreground mt-0.5">
                {activeReport?.title || "Detail Laporan Jaring"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleOpenHistory()}
              disabled={!activeReport}
              className="h-9 gap-1.5 text-xs rounded-lg"
            >
              <History className="size-4 text-sky-600 dark:text-[#38BDF8]" />
              Riwayat Perubahan & Audit Log
            </Button>
          </div>
        </div>
      </div>

      {loadingDetail ? (
        <Card className="p-16 text-center border border-slate-200/80 dark:border-white/10">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="size-8 animate-spin text-sky-600 dark:text-[#38BDF8]" />
            <p className="text-xs font-mono text-muted-foreground">Memuat detail laporan...</p>
          </div>
        </Card>
      ) : activeReport ? (
        <div className="space-y-6">
          {/* STEP 1: PEMERIKSAAN & VERIFIKASI FIELD OFFICER */}
          <Card className="border border-slate-200/80 dark:border-white/10 bg-card rounded-xl shadow-xs overflow-hidden">
            <CardHeader className="p-4 md:p-5 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-[#38BDF8] font-bold text-xs">
                  1
                </div>
                <div>
                  <CardTitle className="text-sm font-bold uppercase tracking-wide">
                    Step 1: Pemeriksaan & Verifikasi Field Officer
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Periksa keabsahan isi laporan WhatsApp dari Jaring sebelum dikonversi ke Baket.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 space-y-5">
              {/* LENGKAP INFORMASI INFORMASI LAPORAN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50/40 dark:bg-slate-900/30 space-y-1">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <User className="size-3.5 text-sky-600 dark:text-[#38BDF8]" />
                    Pengirim (Jaring Binaan):
                  </span>
                  <p className="font-semibold text-sm text-foreground">
                    {activeReport.jaringAlias || activeReport.jaringCode || activeReport.jaringId}
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50/40 dark:bg-slate-900/30 space-y-1">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Clock className="size-3.5 text-sky-600 dark:text-[#38BDF8]" />
                    Waktu Dikirim:
                  </span>
                  <p className="font-mono text-sm text-foreground">
                    {formatDateTime(activeReport.submittedAt || activeReport.createdAt)}
                  </p>
                </div>

                {/* JUDUL LAPORAN */}
                <div className="md:col-span-2 space-y-1">
                  <span className="text-muted-foreground font-medium">Judul Laporan:</span>
                  <p className="font-bold text-sm text-foreground bg-background p-2.5 rounded-lg border border-slate-200/80 dark:border-white/10">
                    {activeReport.title || "Laporan Jaring"}
                  </p>
                </div>

                {/* ISI PESAN WHATSAPP ASLI */}
                <div className="md:col-span-2 space-y-1">
                  <span className="text-muted-foreground font-medium">Isi Pesan WhatsApp Asli:</span>
                  <div className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50 dark:border-white/10 dark:bg-slate-950/40 font-mono text-xs whitespace-pre-wrap text-foreground leading-relaxed">
                    {activeReport.content || "Belum ada teks isi laporan."}
                  </div>
                </div>

                {/* INFORMASI KOORDINAT & WILAYAH LENGKAP */}
                <div className="md:col-span-2 space-y-2 p-3.5 rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50/40 dark:bg-slate-900/30">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                      <MapPin className="size-4 text-sky-600 dark:text-[#38BDF8]" />
                      Informasi Lokasi & Koordinat GPS Lengkap
                    </span>

                    {activeReport.location ? (
                      <a
                        href={`https://maps.google.com/?q=${activeReport.location.latitude},${activeReport.location.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-[#38BDF8] hover:underline"
                      >
                        Buka Google Maps <ExternalLink className="size-3" />
                      </a>
                    ) : null}
                  </div>

                  {activeReport.location ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1 text-[11px] font-mono">
                      <div>
                        <span className="text-muted-foreground block">Latitude:</span>
                        <span className="font-bold text-foreground">{activeReport.location.latitude}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Longitude:</span>
                        <span className="font-bold text-foreground">{activeReport.location.longitude}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Akurasi GPS:</span>
                        <span className="font-bold text-foreground">
                          {activeReport.location.accuracyMeters ? `±${activeReport.location.accuracyMeters}m` : "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Wilayah Teresolusi:</span>
                        <span className="font-bold text-foreground">
                          {activeReport.resolvedArea?.name || "-"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Tidak ada koordinat GPS terlampir.</p>
                  )}
                </div>

                {/* MEDIA LAMPIRAN (COLLAPSIBLE / TERSEMBUNYI SAAT BELUM DIBUKA) */}
                <div className="md:col-span-2 space-y-3 pt-2">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200/80 dark:border-white/10 bg-card shadow-2xs">
                    <div className="flex items-center gap-2">
                      <Paperclip className="size-4 text-sky-600 dark:text-[#38BDF8]" />
                      <span className="font-semibold text-xs text-foreground">
                        Lampiran Media ({mediaList.length} Berkas)
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        (Pratinjau gambar tersembunyi secara bawaan)
                      </span>
                    </div>

                    {mediaList.length > 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowMediaPreview(!showMediaPreview)}
                        className="h-8 gap-1.5 text-xs rounded-lg border-sky-500/30 text-sky-600 hover:bg-sky-500/10 dark:text-[#38BDF8]"
                      >
                        {showMediaPreview ? (
                          <>
                            <EyeOff className="size-3.5" />
                            Sembunyikan Pratinjau
                            <ChevronUp className="size-3.5" />
                          </>
                        ) : (
                          <>
                            <Eye className="size-3.5" />
                            Tampilkan Pratinjau ({mediaList.length})
                            <ChevronDown className="size-3.5" />
                          </>
                        )}
                      </Button>
                    ) : null}
                  </div>

                  {/* MEDIA PREVIEW GRID (HANYA TERLIHAT JIKA TOGGLE DIBUKA) */}
                  {showMediaPreview && mediaList.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-3 rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/40">
                      {mediaList.map((media) => (
                        <div
                          key={media.id}
                          className="rounded-lg border border-slate-200/80 dark:border-white/10 bg-card overflow-hidden shadow-2xs space-y-2 p-2"
                        >
                          <EvidenceImageViewer
                            src={`/api/files/${media.fileId}`}
                            alt={media.fileName || "Lampiran Media"}
                            fileName={media.fileName || "Foto Lampiran"}
                            caption={media.caption}
                          />
                          <div className="px-1 text-[11px] font-mono text-muted-foreground truncate">
                            {media.fileName}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Verification Action Form */}
              <div className="pt-4 border-t border-slate-200/80 dark:border-white/10 space-y-3">
                <label htmlFor="verify-note" className="font-medium text-xs text-foreground block">
                  Catatan Verifikasi Petugas Lapangan (opsional):
                </label>
                <Input
                  id="verify-note"
                  value={verificationNote}
                  onChange={(e) => setVerificationNote(e.target.value)}
                  placeholder="Masukkan catatan verifikasi atau arahan pengayaan data..."
                  className="h-9 text-xs bg-background"
                />

                <div className="flex items-center justify-end gap-3 pt-1">
                  <Button
                    disabled={isVerifying}
                    onClick={() => void handleVerifyReport()}
                    className="h-9 gap-1.5 text-xs rounded-lg bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600"
                  >
                    <ShieldCheck className="size-4" />
                    {isVerifying ? "Memproses Verifikasi..." : "Verifikasi & Setujui Laporan"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* STEP 2: METADATA & FORMULASI BAKET */}
          <Card
            className={cn(
              "border border-slate-200/80 dark:border-white/10 bg-card rounded-xl shadow-xs overflow-hidden transition-opacity",
              !activeReport.canFillMetadata && "opacity-60 pointer-events-none",
            )}
          >
            <CardHeader className="p-4 md:p-5 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                    2
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold uppercase tracking-wide">
                      Step 2: Metadata & Formulasi Baket
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Isi kategori, urgency, judul, dan formulasi narasi sebelum diterbitkan sebagai Baket.
                    </CardDescription>
                  </div>
                </div>
                {!activeReport.canFillMetadata ? (
                  <Badge variant="outline" className="text-[10px] font-mono">
                    Kunci (Selesaikan Step 1 Dulu)
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Kategori Laporan */}
                <div className="space-y-1.5">
                  <label htmlFor="category-select" className="font-medium text-xs text-foreground block">
                    Kategori Laporan <span className="text-rose-500">*</span>
                  </label>
                  <NativeSelect
                    id="category-select"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="h-9 text-xs bg-background"
                  >
                    <option value="">-- Pilih Kategori --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                {/* Urgency */}
                <div className="space-y-1.5">
                  <label htmlFor="urgency-select" className="font-medium text-xs text-foreground block">
                    Tingkat Urgensi (Urgency) <span className="text-rose-500">*</span>
                  </label>
                  <NativeSelect
                    id="urgency-select"
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as PriorityLevel)}
                    className="h-9 text-xs bg-background"
                  >
                    {URGENCY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                {/* Judul Laporan/Baket */}
                <div className="space-y-1.5 md:col-span-2">
                  <label htmlFor="title-input" className="font-medium text-xs text-foreground block">
                    Judul Laporan / Baket:
                  </label>
                  <Input
                    id="title-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Tuliskan judul laporan..."
                    className="h-9 text-xs bg-background"
                  />
                </div>

                {/* Formulasi Isi Baket */}
                <div className="space-y-1.5 md:col-span-2">
                  <label htmlFor="content-textarea" className="font-medium text-xs text-foreground block">
                    Formulasi Isi Laporan / Baket:
                  </label>
                  <Textarea
                    id="content-textarea"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Formulasikan isi Baket yang telah diperkaya..."
                    rows={5}
                    className="text-xs bg-background leading-relaxed"
                  />
                </div>

                {/* Normalized Content */}
                <div className="space-y-1.5 md:col-span-2">
                  <label htmlFor="normalized-textarea" className="font-medium text-xs text-foreground block">
                    Ringkasan Informasi (Normalized Content):
                  </label>
                  <Textarea
                    id="normalized-textarea"
                    value={normalizedContent}
                    onChange={(e) => setNormalizedContent(e.target.value)}
                    placeholder="Ringkasan poin-poin utama laporan..."
                    rows={2}
                    className="text-xs bg-background"
                  />
                </div>

                {/* Catatan Field Officer */}
                <div className="space-y-1.5 md:col-span-2">
                  <label htmlFor="fo-note-textarea" className="font-medium text-xs text-foreground block">
                    Catatan Tambahan Petugas Lapangan:
                  </label>
                  <Textarea
                    id="fo-note-textarea"
                    value={fieldOfficerNote}
                    onChange={(e) => setFieldOfficerNote(e.target.value)}
                    placeholder="Catatan analisis atau rekomendasi tindak lanjut..."
                    rows={2}
                    className="text-xs bg-background"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/80 dark:border-white/10">
                <Button
                  disabled={isSavingMetadata || !activeReport.canFillMetadata}
                  onClick={() => void handleSaveMetadata()}
                  className="h-9 gap-1.5 text-xs rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                >
                  <FileEdit className="size-4" />
                  {isSavingMetadata ? "Menyimpan Metadata..." : "Simpan Metadata & Formulasi Baket"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* DIALOG RIWAYAT PERUBAHAN & AUDIT LOG */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <History className="size-4 text-sky-600 dark:text-[#38BDF8]" />
              Riwayat Perubahan & Audit Log Laporan
            </DialogTitle>
            <DialogDescription className="text-xs">
              Histori kronologis verifikasi, pengubahan metadata, dan log audit sistem.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-4">
            {loadingHistory ? (
              <div className="flex py-12 justify-center items-center gap-2 text-xs text-muted-foreground font-mono">
                <RefreshCw className="size-4 animate-spin text-sky-600 dark:text-[#38BDF8]" />
                Memuat riwayat perubahan...
              </div>
            ) : historyEvents.length > 0 ? (
              <div className="relative pl-6 border-l-2 border-slate-200 dark:border-white/10 space-y-6">
                {historyEvents.map((evt) => (
                  <div key={evt.id} className="relative space-y-1">
                    <span className="absolute -left-[31px] top-0.5 flex size-4 items-center justify-center rounded-full bg-sky-500 ring-4 ring-background" />
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-foreground">{evt.action}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {formatDateTime(evt.createdAt)}
                      </span>
                    </div>
                    {evt.previousState || evt.newState ? (
                      <p className="text-xs text-muted-foreground">
                        Status: <code className="text-foreground">{evt.previousState || "-"}</code> &rarr;{" "}
                        <code className="text-foreground">{evt.newState || "-"}</code>
                      </p>
                    ) : null}

                    {/* Diff viewer if metadata or data change exists */}
                    {evt.beforeData || evt.afterData ? (
                      <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                        <div className="p-2 rounded bg-rose-500/5 border border-rose-500/20">
                          <span className="font-bold text-rose-600 dark:text-rose-400 block mb-1">Sebelum:</span>
                          <pre className="whitespace-pre-wrap font-mono text-[10px] text-muted-foreground overflow-x-auto">
                            {JSON.stringify(evt.beforeData, null, 2)}
                          </pre>
                        </div>
                        <div className="p-2 rounded bg-emerald-500/5 border border-emerald-500/20">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-1">Sesudah:</span>
                          <pre className="whitespace-pre-wrap font-mono text-[10px] text-muted-foreground overflow-x-auto">
                            {JSON.stringify(evt.afterData, null, 2)}
                          </pre>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Belum ada catatan riwayat perubahan.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
