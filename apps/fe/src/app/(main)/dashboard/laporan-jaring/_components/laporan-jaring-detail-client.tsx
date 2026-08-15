"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  FileDiff,
  FileEdit,
  History,
  MapPin,
  Paperclip,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { JaringIdentitySummary } from "@/components/domain/jaring-identity-summary";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BackButton } from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { EvidenceAttachmentViewer } from "@/features/baket/components/evidence-attachment-viewer";
import { apiBrowserFetch, apiBrowserMutation } from "@/lib/api/browser-client";
import { sortReportCategories } from "@/lib/domain/report-category-order";
import { DOMAIN_VISUALS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

import {
  formatDateTime,
  JARING_REPORT_CATEGORY_FILTERS,
  urgencyBadgeClass,
  urgencyLabel,
  verificationStatusBadgeVariant,
  verificationStatusLabel,
} from "./laporan-jaring-presentation";
import {
  formatFullAreaName,
  type JaringReportSessionDetail,
  type PriorityLevel,
  type ReportCategoryOption,
  type ReportHistoryEvent,
  type ReportHistoryResponse,
} from "./laporan-jaring-types";
import { WhatsAppReportThread } from "./whatsapp-report-thread";

const URGENCY_OPTIONS: { value: PriorityLevel; label: string }[] = [
  { value: "LOW", label: "Rendah" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "Tinggi" },
  { value: "URGENT", label: "Mendesak" },
];

export function LaporanJaringDetailClient({
  laporanId,
  backHref = "/dashboard/laporan-jaring",
  readOnly = false,
}: {
  laporanId: string;
  backHref?: string;
  readOnly?: boolean;
}) {
  const _router = useRouter();
  const [activeReport, setActiveReport] = useState<JaringReportSessionDetail | null>(null);
  const [categories, setCategories] = useState<ReportCategoryOption[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(true);

  // Media preview toggle state (initially hidden as requested)
  const [showMediaPreview, setShowMediaPreview] = useState(false);

  // Baket form state
  const [categoryId, setCategoryId] = useState("");
  const [urgency, setUrgency] = useState<PriorityLevel>("NORMAL");
  const [content, setContent] = useState("");
  const [normalizedContent, setNormalizedContent] = useState("");
  const [fieldOfficerNote, setFieldOfficerNote] = useState("");
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const detailRequestInFlight = useRef(false);

  const [confirmSaveMetadataOpen, setConfirmSaveMetadataOpen] = useState(false);

  // History modal state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyEvents, setHistoryEvents] = useState<ReportHistoryEvent[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState<string>("ALL");
  const [expandBefore, setExpandBefore] = useState(false);
  const [expandAfter, setExpandAfter] = useState(false);

  // Fetch report categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await apiBrowserFetch<ReportCategoryOption[]>("/jaring/report-categories");
        setCategories(sortReportCategories(Array.isArray(res) ? res : []));
      } catch (err) {
        console.error("Gagal memuat kategori Baket:", err);
      }
    }
    void loadCategories();
  }, []);

  // Fetch report detail
  const fetchDetail = useCallback(
    async (silent = false) => {
      if (detailRequestInFlight.current) return;
      detailRequestInFlight.current = true;
      if (!silent) setLoadingDetail(true);
      try {
        const detail = await apiBrowserFetch<JaringReportSessionDetail>(`/jaring/reports/${laporanId}`);
        setActiveReport(detail);
        if (!silent) {
          setCategoryId(detail.reportCategory?.id || "");
          setUrgency(detail.urgency || "NORMAL");
          setContent(detail.content || "");
          setNormalizedContent(detail.normalizedContent || "");
          setFieldOfficerNote(detail.fieldOfficerNote || "");
        }
        if (!silent && !readOnly && detail.status === "SUBMITTED") {
          void apiBrowserMutation("PATCH", `/jaring/reports/${laporanId}/read`).catch(() => undefined);
          try {
            const stored: string[] = JSON.parse(localStorage.getItem("read_reports_jaring") || "[]");
            if (!stored.includes(laporanId)) {
              stored.push(laporanId);
              localStorage.setItem("read_reports_jaring", JSON.stringify(stored));
            }
          } catch {
            // Abaikan cache lokal yang tidak valid.
          }
        }
      } catch (err) {
        console.error("Gagal memuat detail laporan:", err);
        if (!silent) toast.error("Detail laporan tidak ditemukan.");
      } finally {
        detailRequestInFlight.current = false;
        if (!silent) setLoadingDetail(false);
      }
    },
    [laporanId, readOnly],
  );

  useEffect(() => {
    void fetchDetail();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void fetchDetail(true);
    }, 5_000);
    return () => window.clearInterval(interval);
  }, [fetchDetail]);

  function onClickSaveMetadata() {
    if (!activeReport) return;
    if (!categoryId) {
      toast.error("Kategori Baket wajib dipilih.");
      return;
    }
    if (!urgency) {
      toast.error("Tingkat urgency wajib dipilih.");
      return;
    }
    setConfirmSaveMetadataOpen(true);
  }

  // Handler: Save Metadata (Step 2)
  async function handleSaveMetadata() {
    if (!activeReport) return;
    if (!categoryId) {
      toast.error("Kategori Baket wajib dipilih.");
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
          content: content.trim() || undefined,
          normalizedContent: normalizedContent.trim() || undefined,
          fieldOfficerNote: fieldOfficerNote.trim() || undefined,
        },
      );
      toast.success("Informasi lanjutan berhasil disimpan dan Baket diterbitkan.");
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
      const events = res.events || [];
      setHistoryEvents(events);
      if (events.length > 0) {
        setSelectedEventId(events[0].id);
      }
    } catch (_err) {
      toast.error("Gagal memuat riwayat perubahan.");
    } finally {
      setLoadingHistory(false);
    }
  }

  const mediaList = activeReport?.media || [];

  const filteredEvents = historyEvents.filter((evt) => {
    if (historyCategoryFilter === "ALL") return true;
    return evt.source === historyCategoryFilter;
  });

  const selectedEvent = historyEvents.find((evt) => evt.id === selectedEventId) || filteredEvents[0] || null;

  function getActorLabel(evt: ReportHistoryEvent): string {
    if (evt.metadata?.actor) return String(evt.metadata.actor);
    if (evt.actorUserProfileId) return "Petugas Wilayah (Gaswil)";
    if (evt.action.includes("SUBMITTED")) return `Pengirim Jaring ${evt.metadata?.jaringCode || ""}`.trim();
    return "System";
  }

  function getEventDescription(evt: ReportHistoryEvent): string {
    if (evt.action.includes("VERIFIED")) return "Laporan Jaring siap dijadikan Baket";
    if (evt.action.includes("SUBMITTED")) return "Laporan berhasil dikirim oleh Jaring";
    if (evt.action.includes("METADATA")) return "Kategori dan formulasi Baket berhasil diperbarui";
    if (evt.action.includes("MEDIA")) return "Pratinjau media dan lampiran diperbarui";
    return "Log aktivitas sistem dicatat.";
  }

  function getSystemNoteText(evt: ReportHistoryEvent): string {
    if (evt.previousState || evt.newState) {
      return `Status proses laporan: ${evt.newState ?? evt.previousState ?? "READY_FOR_BAKET"}.`;
    }
    if (evt.metadata?.note) {
      return String(evt.metadata.note);
    }
    return `Aktivitas ${evt.action} berhasil diproses oleh sistem.`;
  }

  const isFromBaket = backHref.includes("/baket");

  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 transition-colors duration-150 sm:space-y-6">
      {/* BREADCRUMB */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/field-officer">Petugas Wilayah (Gaswil)</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={backHref}>{isFromBaket ? "Baket" : "Laporan Jaring"}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Detail {isFromBaket ? "Baket" : "Laporan"}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* HEADER */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <BackButton
              href={backHref}
              label="Kembali"
              className="h-9 shrink-0 rounded-lg border-slate-200/80 dark:border-white/10"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-sky-600 dark:text-sky-400">
                  {activeReport?.referenceNumber || laporanId}
                </span>
                {activeReport?.displayStatus ? (
                  <span
                    className={cn(
                      "inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      verificationStatusBadgeVariant(activeReport.displayStatus),
                    )}
                  >
                    {verificationStatusLabel(activeReport.displayStatus)}
                  </span>
                ) : null}
              </div>
              <h1 className="font-bold text-2xl text-foreground mt-0.5">
                {activeReport?.displayTitle || "Detail Laporan Jaring"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchDetail()}
              disabled={loadingDetail}
              className="h-9 gap-1.5 rounded-lg text-xs"
            >
              <RefreshCw className={cn("size-4", loadingDetail && "animate-spin")} />
              Muat Ulang
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleOpenHistory()}
              disabled={!activeReport}
              className="h-9 gap-1.5 text-xs rounded-lg"
            >
              <History className="size-4 text-sky-600 dark:text-sky-400" />
              Riwayat Perubahan & Audit Log
            </Button>
          </div>
        </div>
      </div>

      {loadingDetail ? (
        <Card className="p-16 text-center border border-slate-200/80 dark:border-white/10">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="size-8 animate-spin text-sky-600 dark:text-sky-400" />
            <p className="text-xs font-mono text-muted-foreground">Memuat detail laporan...</p>
          </div>
        </Card>
      ) : activeReport ? (
        (() => {
          const hasFormulatedMetadata =
            activeReport.processStatus === "BAKET_CREATED" || Boolean(activeReport.baket?.latestVersion);

          return (
            <div className="space-y-6">
              {/* RINGKASAN LAPORAN SUMBER */}
              <Card className="border border-slate-200/80 dark:border-white/10 bg-card rounded-xl shadow-xs overflow-hidden">
                <CardHeader className="p-4 md:p-5 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/40">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold text-xs">
                      1
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold uppercase tracking-wide">Laporan Jaring Sumber</CardTitle>
                      <CardDescription className="text-xs">
                        Laporan yang sudah dikirim dapat langsung dijadikan Baket sesuai cakupan hak akses.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 md:p-6 space-y-5">
                  {/* LENGKAP INFORMASI INFORMASI LAPORAN */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <JaringIdentitySummary
                      source={{
                        id: activeReport.jaringId,
                        jaringFullName: activeReport.jaringFullName,
                        jaringAlias: activeReport.jaringAlias,
                        jaringCode: activeReport.jaringCode,
                        jaringWhatsAppNumber: activeReport.jaringWhatsAppNumber,
                        jaringProfilePhotoFileId: activeReport.jaringProfilePhotoFileId,
                        profilePhotoUrl: activeReport.jaringProfilePhotoUrl,
                        gaswilName: activeReport.gaswilName,
                        gaswilAssignmentId: activeReport.gaswilAssignmentId,
                        gaswilUserProfileId: activeReport.gaswilUserProfileId,
                        placementArea: activeReport.placementArea,
                      }}
                      className="md:col-span-2"
                    />

                    <div className="p-3 rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50/40 dark:bg-slate-900/30 space-y-1 md:col-span-2">
                      <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                        <Clock className="size-3.5 text-sky-600 dark:text-sky-400" />
                        Waktu Dikirim:
                      </span>
                      <p className="font-mono text-sm text-foreground">{formatDateTime(activeReport.reportedAt)}</p>
                    </div>

                    {/* ISI PESAN WHATSAPP BUBBLE VIEW */}
                    <div className="md:col-span-2 space-y-1.5">
                      <span className="text-muted-foreground font-medium text-xs">
                        Tampilan Pesan WhatsApp Chat Bubble:
                      </span>
                      <WhatsAppReportThread
                        senderAlias={activeReport.jaringAlias || activeReport.jaringCode || "Pengirim"}
                        messages={activeReport.messages}
                        fallbackContent={activeReport.content ?? undefined}
                        fallbackMedia={mediaList}
                        fallbackSentAt={activeReport.reportedAt}
                      />
                    </div>

                    {/* INFORMASI KOORDINAT & WILAYAH LENGKAP */}
                    <div className="md:col-span-2 space-y-2 p-3.5 rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50/40 dark:bg-slate-900/30">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                          <MapPin className="size-4 text-sky-600 dark:text-sky-400" />
                          Informasi Lokasi & Koordinat GPS
                        </span>

                        {activeReport.location ? (
                          <a
                            href={`https://maps.google.com/?q=${activeReport.location.latitude},${activeReport.location.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
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
                              {formatFullAreaName(activeReport.resolvedArea)}
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
                          <Paperclip className="size-4 text-sky-600 dark:text-sky-400" />
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
                            className="h-8 gap-1.5 text-xs rounded-lg border-sky-500/30 text-sky-600 hover:bg-sky-500/10 dark:text-sky-400"
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
                              <EvidenceAttachmentViewer
                                src={`/api/files/${media.fileId}`}
                                fileName={media.fileName || "Lampiran Laporan"}
                                mimeType={media.mimeType}
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

                  {!readOnly &&
                    (activeReport.status === "ACTIVE" ? (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold text-amber-700 dark:text-amber-400">
                        Laporan masih disusun oleh Jaring. Pembuatan Baket tersedia setelah Jaring mengetik SELESAI.
                      </div>
                    ) : (
                      <div className="pt-3 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-sky-600 dark:text-sky-400">
                          <CheckCircle2 className="size-4 shrink-0 text-sky-500" />
                          <span>Laporan sudah siap dijadikan Baket.</span>
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>

              {/* PEMBUATAN BAKET */}
              {(!readOnly || hasFormulatedMetadata) && (
                <Card
                  className={cn(
                    "border border-slate-200/80 dark:border-white/10 bg-card rounded-xl shadow-xs overflow-hidden transition-opacity",
                    !readOnly && !activeReport.canFillMetadata && "opacity-60 pointer-events-none",
                  )}
                >
                  <CardHeader className="p-4 md:p-5 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                          2
                        </div>
                        <div>
                          <CardTitle className="text-sm font-bold uppercase tracking-wide">Pembuatan Baket</CardTitle>
                          <CardDescription className="text-xs">
                            {readOnly || activeReport.baket
                              ? "Kategori, urgensi, dan narasi Baket yang sudah dibuat dari Laporan Jaring."
                              : "Pilih kategori Baket, urgensi, dan formulasi narasi untuk menerbitkan Baket."}
                          </CardDescription>
                        </div>
                      </div>
                      {readOnly ? (
                        <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                          Mode Lihat (Read Only)
                        </Badge>
                      ) : activeReport.baket ? (
                        <Badge
                          variant="outline"
                          className="border-violet-500/40 bg-violet-500/10 text-[10px] font-mono text-violet-700 dark:text-violet-400"
                        >
                          {JARING_REPORT_CATEGORY_FILTERS.BAKET.label}
                        </Badge>
                      ) : !activeReport.canFillMetadata ? (
                        <Badge variant="outline" className="text-[10px] font-mono">
                          Terkunci (Laporan belum selesai)
                        </Badge>
                      ) : null}
                    </div>
                  </CardHeader>

                  {readOnly || activeReport.baket ? (
                    <CardContent className="p-4 md:p-6 space-y-4 text-xs">
                      {activeReport.baket && (
                        <div className="flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 p-3 font-semibold text-violet-700 text-xs dark:text-violet-400">
                          <CheckCircle2 className="size-4 shrink-0 text-violet-600 dark:text-violet-400" />
                          <span>Baket telah dibuat dari Laporan Jaring ini.</span>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50/40 dark:bg-slate-900/30 space-y-1">
                          <span className="text-muted-foreground font-medium block">Kategori Baket:</span>
                          <p className="font-semibold text-foreground">{activeReport.reportCategory?.name || "-"}</p>
                        </div>

                        <div className="p-3 rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50/40 dark:bg-slate-900/30 space-y-1">
                          <span className="text-muted-foreground font-medium block">Tingkat Urgensi:</span>
                          <Badge
                            variant="outline"
                            className={cn("font-semibold", urgencyBadgeClass(activeReport.urgency))}
                          >
                            {urgencyLabel(activeReport.urgency)}
                          </Badge>
                        </div>

                        <div className="md:col-span-2 space-y-1">
                          <span className="text-muted-foreground font-medium block">Formulasi Isi Baket:</span>
                          <div className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50 dark:border-white/10 dark:bg-slate-950/40 font-mono text-xs whitespace-pre-wrap text-foreground leading-relaxed">
                            {activeReport.content || "-"}
                          </div>
                        </div>

                        {activeReport.normalizedContent && (
                          <div className="md:col-span-2 space-y-1">
                            <span className="text-muted-foreground font-medium block">
                              Ringkasan Informasi (Normalized Content):
                            </span>
                            <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50 dark:border-white/10 dark:bg-slate-950/40 text-xs text-foreground">
                              {activeReport.normalizedContent}
                            </div>
                          </div>
                        )}

                        {activeReport.fieldOfficerNote && (
                          <div className="md:col-span-2 space-y-1">
                            <span className="text-muted-foreground font-medium block">
                              Catatan Tambahan Petugas Wilayah (Gaswil):
                            </span>
                            <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50 dark:border-white/10 dark:bg-slate-950/40 text-xs text-foreground">
                              {activeReport.fieldOfficerNote}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  ) : (
                    <CardContent className="p-4 md:p-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Kategori Baket */}
                        <div className="space-y-1.5">
                          <label htmlFor="category-select" className="font-medium text-xs text-foreground block">
                            Kategori Baket <span className="text-rose-500">*</span>
                          </label>
                          <NativeSelect
                            id="category-select"
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            className="h-9 text-xs bg-background"
                          >
                            <option value="">-- Pilih Kategori Baket --</option>
                            {sortReportCategories(categories).map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </NativeSelect>
                        </div>

                        {/* Tingkat Urgensi */}
                        <div className="space-y-1.5">
                          <label htmlFor="urgency-select" className="font-medium text-xs text-foreground block">
                            Tingkat Urgensi <span className="text-rose-500">*</span>
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

                        {/* Formulasi Isi Bahan Keterangan (Baket) */}
                        <div className="space-y-1.5 md:col-span-2">
                          <label htmlFor="content-textarea" className="font-medium text-xs text-foreground block">
                            Formulasi Isi Baket:
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

                        {/* Catatan Petugas Wilayah (Gaswil) */}
                        <div className="space-y-1.5 md:col-span-2">
                          <label htmlFor="fo-note-textarea" className="font-medium text-xs text-foreground block">
                            Catatan Tambahan Petugas Wilayah (Gaswil):
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
                          onClick={onClickSaveMetadata}
                          className="h-9 gap-1.5 text-xs rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                        >
                          <FileEdit className="size-4" />
                          {isSavingMetadata ? "Menyimpan Informasi Lanjutan..." : "Simpan & Buat Baket"}
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}
            </div>
          );
        })()
      ) : null}

      {/* DIALOG RIWAYAT PERUBAHAN & AUDIT LOG */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-4xl md:max-w-4xl lg:max-w-5xl w-[92vw] max-h-[90vh] md:max-h-[85vh] p-0 gap-0 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl">
          {/* MODAL HEADER */}
          <DialogHeader className="p-4 md:px-6 md:py-4 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <History className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    Riwayat Perubahan & Audit Log Laporan
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Histori kronologis pembuatan Baket, perubahan data, dan log audit sistem.
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* MODAL BODY (SPLIT VIEW) */}
          <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200/80 dark:divide-white/10 min-h-[480px] max-h-[calc(85vh-130px)] overflow-hidden">
            {/* LEFT SIDEBAR: TIMELINE LIST & FILTER */}
            <div className="md:col-span-5 lg:col-span-4 flex flex-col bg-slate-50/40 dark:bg-slate-900/20 overflow-hidden">
              {/* Filter Header */}
              <div className="p-3 border-b border-slate-200/80 dark:border-white/10 bg-background/50">
                <NativeSelect
                  value={historyCategoryFilter}
                  onChange={(e) => setHistoryCategoryFilter(e.target.value)}
                  className="h-8 text-xs bg-background"
                >
                  <option value="ALL">Semua Event</option>
                  <option value="report_history">Riwayat Laporan</option>
                  <option value="audit_log">Audit Log</option>
                </NativeSelect>
              </div>

              {/* Timeline Event List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {loadingHistory ? (
                  <div className="flex py-16 flex-col items-center justify-center gap-2 text-xs text-muted-foreground font-mono">
                    <RefreshCw className="size-5 animate-spin text-sky-600 dark:text-sky-400" />
                    Memuat riwayat...
                  </div>
                ) : filteredEvents.length > 0 ? (
                  filteredEvents.map((evt) => {
                    const isSelected = evt.id === selectedEvent?.id;
                    const actorName = getActorLabel(evt);

                    return (
                      <button
                        key={evt.id}
                        type="button"
                        onClick={() => {
                          setSelectedEventId(evt.id);
                          setExpandBefore(false);
                          setExpandAfter(false);
                        }}
                        className={cn(
                          "w-full relative flex items-start gap-3 p-3 rounded-xl cursor-pointer text-left transition-all",
                          isSelected
                            ? "bg-sky-500/10 dark:bg-sky-500/20 text-sky-950 dark:text-sky-100 border border-sky-500/30 shadow-2xs"
                            : "hover:bg-slate-200/60 dark:hover:bg-slate-800/50 border border-transparent text-foreground",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-1 flex size-2.5 rounded-full shrink-0 transition-colors",
                            isSelected ? "bg-sky-500 ring-4 ring-sky-500/20" : "bg-slate-300 dark:bg-slate-600",
                          )}
                        />
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <p className="font-mono text-xs font-bold truncate leading-tight">{evt.action}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{formatDateTime(evt.createdAt)}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            oleh <span className="font-medium">{actorName}</span>
                          </p>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-xs text-muted-foreground">Belum ada riwayat tercatat.</div>
                )}
              </div>

              <div className="p-3 border-t border-slate-200/80 dark:border-white/10 bg-background/50 mt-auto">
                <p className="text-center font-mono text-[11px] text-muted-foreground">
                  {filteredEvents.length.toLocaleString("id-ID")} event ditampilkan
                </p>
              </div>
            </div>

            {/* RIGHT PANE: EVENT DETAIL VIEW */}
            <div className="md:col-span-7 lg:col-span-8 flex flex-col p-5 md:p-6 overflow-y-auto space-y-5 bg-card">
              {selectedEvent ? (
                <>
                  {/* Event Header Info */}
                  <div className="space-y-3 pb-4 border-b border-slate-200/80 dark:border-white/10">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">
                          Event
                        </span>
                        <h3 className="font-mono text-base font-bold text-foreground tracking-tight">
                          {selectedEvent.action}
                        </h3>
                      </div>
                      <div className="text-right font-mono text-[11px] text-muted-foreground shrink-0 leading-tight">
                        <p>{formatDateTime(selectedEvent.createdAt)}</p>
                        <p className="mt-0.5">
                          oleh <span className="font-medium text-foreground">{getActorLabel(selectedEvent)}</span>
                        </p>
                      </div>
                    </div>

                    {/* Status transition / badge info */}
                    <div className="flex items-center gap-2 pt-1">
                      {selectedEvent.newState || selectedEvent.previousState ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 uppercase font-bold"
                        >
                          {selectedEvent.newState || selectedEvent.previousState}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 uppercase font-bold"
                        >
                          VERIFIED
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground font-medium">
                        {getEventDescription(selectedEvent)}
                      </span>
                    </div>
                  </div>

                  {/* Perubahan Data (Comparison View) */}
                  {selectedEvent.beforeData || selectedEvent.afterData ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <FileDiff className="size-4 text-sky-600 dark:text-sky-400" />
                        <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                          Perubahan Data
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {/* SEBELUM */}
                        <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/30 space-y-2">
                          <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block">Sebelum</span>
                          {selectedEvent.beforeData ? (
                            <div
                              className={cn(
                                "font-mono text-[11px] space-y-1 overflow-hidden transition-all",
                                !expandBefore && "max-h-[160px]",
                              )}
                            >
                              {Object.entries(selectedEvent.beforeData).map(([k, v]) => (
                                <div key={k} className="truncate leading-snug">
                                  <span className="text-rose-600 dark:text-rose-400 font-semibold">"{k}"</span>:{" "}
                                  <span className="text-rose-950 dark:text-rose-200">
                                    {v === null ? "null" : JSON.stringify(v)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic font-mono">- Kosong -</p>
                          )}
                          {selectedEvent.beforeData && Object.keys(selectedEvent.beforeData).length > 4 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandBefore(!expandBefore)}
                              className="h-6 px-0 text-[10px] text-muted-foreground hover:text-foreground font-mono gap-1 mt-1"
                            >
                              {expandBefore ? "Ringkas tampilan" : "Lihat selengkapnya"}
                              {expandBefore ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                            </Button>
                          ) : null}
                        </div>

                        {/* SESUDAH */}
                        <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/30 space-y-2">
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                            Sesudah
                          </span>
                          {selectedEvent.afterData ? (
                            <div
                              className={cn(
                                "font-mono text-[11px] space-y-1 overflow-hidden transition-all",
                                !expandAfter && "max-h-[160px]",
                              )}
                            >
                              {Object.entries(selectedEvent.afterData).map(([k, v]) => (
                                <div key={k} className="truncate leading-snug">
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">"{k}"</span>:{" "}
                                  <span className="text-emerald-950 dark:text-emerald-200">
                                    {v === null ? "null" : JSON.stringify(v)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic font-mono">- Kosong -</p>
                          )}
                          {selectedEvent.afterData && Object.keys(selectedEvent.afterData).length > 4 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandAfter(!expandAfter)}
                              className="h-6 px-0 text-[10px] text-muted-foreground hover:text-foreground font-mono gap-1 mt-1"
                            >
                              {expandAfter ? "Ringkas tampilan" : "Lihat selengkapnya"}
                              {expandAfter ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Catatan Sistem / Description Card */}
                  <div className="p-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-slate-900/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <DOMAIN_VISUALS.jaringReport.Icon className={`size-4 ${DOMAIN_VISUALS.jaringReport.iconClass}`} />
                      <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">Catatan Sistem</h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{getSystemNoteText(selectedEvent)}</p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center space-y-2">
                  <History className="size-8 opacity-40 text-sky-600" />
                  <p className="text-xs font-medium">
                    Pilih event dari daftar sebelah kiri untuk melihat detail riwayat.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* MODAL FOOTER */}
          <div className="p-3 md:px-6 md:py-3 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/50 flex items-center justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoryOpen(false)}
              className="h-8 px-4 text-xs font-medium rounded-lg"
            >
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ALERT DIALOG: KONFIRMASI BUAT BAKET */}
      <AlertDialog open={confirmSaveMetadataOpen} onOpenChange={setConfirmSaveMetadataOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <FileEdit className="size-5 shrink-0" />
              Konfirmasi Pembuatan Baket
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground pt-1">
              Apakah Anda yakin ingin menyimpan Informasi Lanjutan dan menerbitkan Baket Intelijen ini? Data yang
              tersimpan akan secara resmi terdaftar sebagai Baket.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2">
            <AlertDialogCancel className="h-8 text-xs">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleSaveMetadata()}
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700"
            >
              Ya, Simpan & Buat Baket
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
