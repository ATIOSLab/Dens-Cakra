"use client";

import { useState } from "react";

import Link from "next/link";

import { Clock, ExternalLink, FileText, ImageIcon, MapPin, UserRound } from "lucide-react";

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
import { DOMAIN_VISUALS } from "@/lib/domain/visual-system";

import type { CoachingReportItem } from "./laporan-pembinaan-types";

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

export type LaporanPembinaanPreviewModalProps = {
  report: CoachingReportItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jaringContext?: {
    id?: string;
    fullName?: string | null;
    aliasName?: string | null;
    whatsappNumber?: string | null;
    profilePhotoFileId?: string | null;
    profilePhotoFile?: { id: string } | null;
  } | null;
};

export function LaporanPembinaanPreviewModal({
  report,
  open,
  onOpenChange,
  jaringContext,
}: LaporanPembinaanPreviewModalProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  if (!report) return null;

  const refCode =
    report.jaringCode ??
    report.jaringAlias ??
    jaringContext?.aliasName ??
    report.jaringName ??
    jaringContext?.fullName ??
    `# ${report.id.slice(0, 8)}`;

  const reportedDate = formatDateTime(report.createdAt ?? report.reportedAt);
  const gaswil = report.fieldOfficer?.userProfile;
  const attachments = report.attachments ?? [];
  const targetJaringId = report.jaringId ?? jaringContext?.id;
  const detailHref = `/dashboard/laporan-pembinaan-jaring/${report.id}?jaringId=${targetJaringId}`;

  // Area text resolution
  const areaName =
    report.assignedArea?.name ??
    report.villageName ??
    (report.assignedArea?.parent?.name ? `${report.assignedArea.name}, ${report.assignedArea.parent.name}` : null);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          {/* Modal Header */}
          <DialogHeader className="border-b border-border/70 bg-muted/20 p-5 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-slate-100 px-2 py-0.5 font-bold font-mono text-xs text-slate-700 dark:bg-white/10 dark:text-slate-300">
                {refCode}
              </span>

              <Badge
                variant="outline"
                className="border-emerald-500/40 bg-emerald-500/10 font-semibold text-[10px] text-emerald-700 dark:text-emerald-400 gap-1"
              >
                <DOMAIN_VISUALS.briefing.Icon className="size-3" />
                Riwayat Pembinaan
              </Badge>

              {gaswil?.fullName && (
                <span className="inline-flex items-center gap-1 rounded border border-emerald-500/20 bg-emerald-50 px-2 py-0.5 font-mono text-[11px] text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <UserRound className="size-3" />
                  Gaswil: {gaswil.fullName}
                </span>
              )}
            </div>

            <DialogTitle className="mt-2 text-left font-bold font-heading text-lg text-foreground leading-snug">
              {report.title}
            </DialogTitle>

            <DialogDescription className="mt-1 flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
              <span className="flex items-center gap-1">
                <Clock className="size-3.5 text-muted-foreground" />
                {reportedDate}
              </span>
              {areaName && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  {areaName}
                </span>
              )}
              {attachments.length > 0 && (
                <span className="flex items-center gap-1">
                  <ImageIcon className="size-3.5 text-amber-500" />
                  {attachments.length} foto lampiran
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Modal Scrollable Body */}
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {/* Bagian 1: Identitas Jaring & Petugas Wilayah (Gaswil) */}
            <div className="space-y-2">
              <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                Identitas Jaring & Petugas Wilayah (Gaswil)
              </h4>
              <div className="rounded-lg border border-border/70 bg-card p-3">
                <JaringIdentitySummary
                  source={{
                    id: targetJaringId,
                    fullName: report.jaringName || jaringContext?.fullName,
                    aliasName: report.jaringAlias || jaringContext?.aliasName,
                    jaringCode: report.jaringCode || jaringContext?.aliasName || targetJaringId,
                    whatsappNumber: report.jaringWhatsAppNumber || jaringContext?.whatsappNumber,
                    profilePhotoFileId:
                      report.jaringProfilePhotoFileId ||
                      jaringContext?.profilePhotoFileId ||
                      jaringContext?.profilePhotoFile?.id,
                    gaswilName: gaswil?.fullName,
                    gaswilAssignmentId: report.fieldOfficer?.assignmentId,
                    gaswilUserProfileId: gaswil?.id,
                    assignedArea: report.assignedArea,
                  }}
                  compact={false}
                />
              </div>
            </div>

            {/* Bagian 2: Catatan / Isi Pembinaan */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                <FileText className="size-3.5 text-emerald-500" />
                <span>Catatan Pembinaan</span>
              </div>
              <div className="max-h-72 overflow-y-auto rounded-lg border border-border/70 bg-muted/20 p-4 font-sans text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                {report.content || "Tidak ada catatan pembinaan tertulis."}
              </div>
            </div>

            {/* Bagian 3: Lampiran Foto jika ada */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                  <ImageIcon className="size-3.5 text-amber-500" />
                  <span>Lampiran Foto ({attachments.length})</span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {attachments.map((att, idx) => {
                    const src = `/api/files/${att.fileId}`;
                    return (
                      <button
                        key={att.fileId || idx}
                        type="button"
                        onClick={() => setSelectedPhoto(src)}
                        className="group relative aspect-video overflow-hidden rounded-lg border border-border bg-slate-100 text-left transition-all hover:ring-2 hover:ring-sky-500/50 dark:bg-slate-900"
                        title={att.caption || att.fileName || `Lampiran Foto ${idx + 1}`}
                      >
                        {/* biome-ignore lint/performance/noImgElement: user-uploaded evidence thumbnail */}
                        <img
                          src={`${src}?thumbnail=1`}
                          alt={att.caption || att.fileName || `Lampiran Foto ${idx + 1}`}
                          className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                        {att.caption ? (
                          <div className="absolute inset-x-0 bottom-0 p-1.5 text-[11px] text-white truncate">
                            {att.caption}
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
              <Link href={detailHref} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" />
                Buka Halaman Detail (Tab Baru)
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox Modal untuk Zoom Foto */}
      {selectedPhoto && (
        <Dialog open={Boolean(selectedPhoto)} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-3xl border-slate-800 bg-slate-950/95 p-2">
            <div className="relative flex max-h-[80vh] items-center justify-center overflow-hidden rounded">
              {/* biome-ignore lint/performance/noImgElement: photo zoom dialog */}
              <img
                src={selectedPhoto}
                alt="Pratinjau Foto Pembinaan"
                className="max-h-[78vh] w-auto rounded object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
