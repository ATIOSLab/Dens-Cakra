"use client";

import Link from "next/link";

import { Clock, ExternalLink, FileCheck, FileText, MapPin, MessageSquare, Paperclip, ShieldCheck } from "lucide-react";

import { JaringIdentitySummary } from "@/components/domain/jaring-identity-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import {
  type BaketRecord,
  currentBaketVersion,
  formatBaketAreaName,
  getBaketContent,
  getBaketDate,
  getBaketDisplayTitle,
  getBaketHref,
  getBaketJaringIdentitySource,
  getBaketReferenceLabel,
  getBaketStatusLabel,
  getBaketVersionLabel,
  type PriorityLevel,
} from "./baket-data";

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

const BAKET_SOURCE_LABELS = {
  name: "Nama Sumber",
  code: "Kode Sumber",
  placementArea: "Wilayah Sumber",
} as const;

type BaketPreviewModalProps = {
  baket: BaketRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function getUrgencyBadgeStyle(urgency?: PriorityLevel | null) {
  switch (urgency) {
    case "URGENT":
      return {
        badge: "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/50",
        label: "Mendesak",
      };
    case "HIGH":
      return {
        badge: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/50",
        label: "Tinggi",
      };
    case "NORMAL":
      return {
        badge: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40",
        label: "Normal",
      };
    case "LOW":
      return {
        badge: "bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/40",
        label: "Rendah",
      };
    default:
      return {
        badge: "bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/40",
        label: "Normal",
      };
  }
}

export function BaketPreviewModal({ baket, open, onOpenChange }: BaketPreviewModalProps) {
  if (!baket) return null;

  const version = currentBaketVersion(baket);
  const urgencyStyle = getUrgencyBadgeStyle(version?.urgency);
  const refNum = getBaketReferenceLabel(baket);
  const title = getBaketDisplayTitle(baket);
  const content = getBaketContent(baket);
  const locationName = formatBaketAreaName(version?.eventArea);
  const dateLabel = formatDateTime(getBaketDate(baket));
  const versionLabel = getBaketVersionLabel(baket);
  const statusLabel = getBaketStatusLabel(baket.status);

  const attachments = version?.attachments ?? [];
  const sourceMessages = version?.sourceMessages ?? [];
  const verification = version?.verification;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        {/* Modal Header */}
        <DialogHeader className="border-b border-border/70 bg-muted/20 p-5 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-slate-100 px-2 py-0.5 font-bold font-mono text-xs text-slate-700 dark:bg-white/10 dark:text-slate-300">
              {refNum}
            </span>

            {version?.urgency ? (
              <Badge
                variant="outline"
                className={cn("font-bold text-[10px] uppercase tracking-wider", urgencyStyle.badge)}
              >
                {urgencyStyle.label}
              </Badge>
            ) : null}

            <Badge
              variant="outline"
              className="border-violet-500/40 bg-violet-500/10 font-semibold text-[10px] text-violet-700 dark:text-violet-400"
            >
              {baket.reportCategory?.name ?? "Tanpa Kategori"}
            </Badge>

            <Badge
              variant="outline"
              className="border-sky-500/40 bg-sky-500/10 font-semibold text-[10px] text-sky-700 dark:text-sky-400"
            >
              {statusLabel}
            </Badge>

            <span className="font-mono text-[11px] text-muted-foreground">{versionLabel}</span>
          </div>

          <DialogTitle className="mt-2 text-left font-bold font-heading text-lg text-foreground leading-snug">
            {title}
          </DialogTitle>

          <DialogDescription className="mt-1 flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
            <span className="flex items-center gap-1">
              <Clock className="size-3.5 text-muted-foreground" />
              {dateLabel}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              {locationName}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="size-3.5 text-sky-500" />
              {sourceMessages.length} sumber tertaut
            </span>
            <span className="flex items-center gap-1">
              <Paperclip className="size-3.5 text-amber-500" />
              {attachments.length} lampiran
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Modal Scrollable Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Section 1: Identitas Sumber & Pembina Wilayah */}
          <div className="space-y-2">
            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
              Identitas Sumber & Pembina Wilayah
            </h4>
            <div className="rounded-lg border border-border/70 bg-card p-3">
              <JaringIdentitySummary
                source={getBaketJaringIdentitySource(baket)}
                labelOverrides={BAKET_SOURCE_LABELS}
                compact={false}
              />
            </div>
          </div>

          {/* Section 2: Isi Bahan Keterangan */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
              <FileText className="size-3.5 text-sky-500" />
              <span>Isi Bahan Keterangan (Baket)</span>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-lg border border-border/70 bg-muted/20 p-4 font-sans text-foreground text-sm leading-relaxed whitespace-pre-wrap">
              {content || "Tidak ada rincian bahan keterangan."}
            </div>
          </div>

          {/* Section 3: Catatan Petugas Wilayah (Gaswil) if any */}
          {version?.fieldOfficerNote ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                <FileCheck className="size-3.5" />
                <span>Catatan Petugas Wilayah</span>
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-900 text-xs dark:text-amber-200 whitespace-pre-wrap">
                {version.fieldOfficerNote}
              </div>
            </div>
          ) : null}

          {/* Section 4: Penilaian Verifikasi Intelijen if any */}
          {verification ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Penilaian & Kredibilitas Intelijen</span>
              </div>
              <div className="grid grid-cols-1 gap-2 rounded-lg border border-border/70 bg-card p-3 sm:grid-cols-2">
                <div className="rounded border border-border/50 bg-muted/30 p-2.5">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Keandalan Sumber</div>
                  <div className="mt-0.5 font-bold font-mono text-foreground text-sm">
                    {verification.sourceReliability || "-"}
                  </div>
                </div>
                <div className="rounded border border-border/50 bg-muted/30 p-2.5">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Kebenaran Informasi</div>
                  <div className="mt-0.5 font-bold font-mono text-foreground text-sm">
                    {verification.informationCredibility || "-"}
                  </div>
                </div>
                {verification.summary ? (
                  <div className="col-span-full rounded border border-border/50 bg-muted/20 p-2.5 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Ringkasan Validasi: </span>
                    {verification.summary}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Section 5: Lampiran Berkas / Foto if any */}
          {attachments.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                <Paperclip className="size-3.5 text-amber-500" />
                <span>Lampiran Bukti ({attachments.length})</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {attachments.map((att, idx) => {
                  const fileId = att.fileId ?? att.file?.id;
                  const src = fileId ? `/api/files/${fileId}` : "";
                  const fileName = att.file?.originalName || att.caption || `Lampiran ${idx + 1}`;
                  const isImage = att.file?.mimeType?.startsWith("image/") || (!att.file?.mimeType && fileId);

                  return (
                    <a
                      key={fileId || idx}
                      href={src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-video overflow-hidden rounded-lg border border-border bg-slate-100 dark:bg-slate-900"
                    >
                      {isImage && src ? (
                        /* biome-ignore lint/performance/noImgElement: dynamic user-uploaded attachment */
                        <img
                          src={src}
                          alt={fileName}
                          className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex size-full flex-col items-center justify-center p-2 text-center text-muted-foreground text-xs">
                          <Paperclip className="size-5 mb-1" />
                          <span className="truncate max-w-full text-[10px]">{fileName}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                      {att.caption ? (
                        <div className="absolute inset-x-0 bottom-0 p-1.5 text-[11px] text-white truncate">
                          {att.caption}
                        </div>
                      ) : null}
                    </a>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Section 6: Pesan Sumber Tertaut if any */}
          {sourceMessages.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                <MessageSquare className="size-3.5 text-sky-500" />
                <span>Sumber Pesan Tertaut ({sourceMessages.length})</span>
              </div>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-border/70 bg-muted/20 p-3">
                {sourceMessages.map((sm, i) => (
                  <div
                    key={sm.messageId || i}
                    className="rounded-md border border-border/50 bg-card p-2.5 text-xs shadow-2xs"
                  >
                    <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="font-bold font-mono">{sm.message?.referenceNumber || `#${i + 1}`}</span>
                      <span>{sm.message?.receivedAt ? formatDateTime(sm.message.receivedAt) : ""}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-foreground">{sm.message?.content || "-"}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="flex flex-col-reverse items-center justify-between gap-2 border-t border-border/70 bg-muted/30 p-4 sm:flex-row sm:justify-between">
          <DialogClose asChild>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              Tutup
            </Button>
          </DialogClose>

          <Button
            asChild
            size="sm"
            className="w-full gap-1.5 bg-sky-600 font-semibold text-white hover:bg-sky-700 dark:bg-sky-600 dark:hover:bg-sky-500 sm:w-auto"
          >
            <Link href={getBaketHref(baket)} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              Buka Halaman Detail (Tab Baru)
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
