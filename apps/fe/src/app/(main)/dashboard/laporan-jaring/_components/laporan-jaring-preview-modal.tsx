"use client";

import Link from "next/link";

import { Clock, ExternalLink, FileText, ImageIcon, MapPin, MessageSquare, ShieldAlert } from "lucide-react";

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

import { formatDateTime, verificationStatusBadgeVariant, verificationStatusLabel } from "./laporan-jaring-presentation";
import { formatFullAreaName, type JaringReportSessionDetail, type PriorityLevel } from "./laporan-jaring-types";

type LaporanJaringPreviewModalProps = {
  report: JaringReportSessionDetail | null;
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

export function LaporanJaringPreviewModal({ report, open, onOpenChange }: LaporanJaringPreviewModalProps) {
  if (!report) return null;

  const urgencyStyle = getUrgencyBadgeStyle(report.urgency);
  const displayStatus = report.displayStatus ?? report.verificationStatus;
  const refNum =
    report.referenceNumber ??
    report.submittedMessage?.referenceNumber ??
    report.jaringAlias ??
    report.jaringCode ??
    `# ${report.id.slice(0, 8)}`;
  const title = report.displayTitle || report.content || "Laporan Jaring";
  const fullContent = report.normalizedContent || report.content || "-";
  const locationName = formatFullAreaName(report.resolvedArea);
  const mediaCount = report.media?.length ?? report.counts?.media ?? 0;
  const messagesCount = report.messages?.length ?? report.counts?.contentParts ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        {/* Modal Header */}
        <DialogHeader className="border-b border-border/70 bg-muted/20 p-5 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-slate-100 px-2 py-0.5 font-bold font-mono text-xs text-slate-700 dark:bg-white/10 dark:text-slate-300">
              {refNum}
            </span>

            {report.urgency ? (
              <Badge
                variant="outline"
                className={cn("font-bold text-[10px] uppercase tracking-wider", urgencyStyle.badge)}
              >
                {urgencyStyle.label}
              </Badge>
            ) : null}

            {report.reportCategory?.name ? (
              <Badge
                variant="outline"
                className="border-violet-500/40 bg-violet-500/10 font-semibold text-[10px] text-violet-700 dark:text-violet-400"
              >
                {report.reportCategory.name}
              </Badge>
            ) : null}

            <Badge
              variant="outline"
              className={cn("px-2 py-0.5 font-medium text-[10px]", verificationStatusBadgeVariant(displayStatus))}
            >
              {verificationStatusLabel(displayStatus)}
            </Badge>
          </div>

          <DialogTitle className="mt-2 text-left font-bold font-heading text-lg text-foreground leading-snug">
            {title}
          </DialogTitle>

          <DialogDescription className="mt-1 flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
            <span className="flex items-center gap-1">
              <Clock className="size-3.5 text-muted-foreground" />
              {formatDateTime(report.reportedAt)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              {locationName}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="size-3.5 text-sky-500" />
              {messagesCount} pesan
            </span>
            <span className="flex items-center gap-1">
              <ImageIcon className="size-3.5 text-amber-500" />
              {mediaCount} media
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Modal Scrollable Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Section 1: Profil Sumber / Jaring */}
          <div className="space-y-2">
            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
              Identitas Sumber & Pembina Wilayah
            </h4>
            <div className="rounded-lg border border-border/70 bg-card p-3">
              <JaringIdentitySummary
                source={{
                  id: report.jaringId,
                  jaringFullName: report.jaringFullName,
                  jaringAlias: report.jaringAlias,
                  jaringCode: report.jaringCode,
                  jaringWhatsAppNumber: report.jaringWhatsAppNumber,
                  jaringProfilePhotoFileId: report.jaringProfilePhotoFileId,
                  profilePhotoUrl: report.jaringProfilePhotoUrl,
                  gaswilName: report.gaswilName,
                  gaswilAssignmentId: report.gaswilAssignmentId,
                  gaswilUserProfileId: report.gaswilUserProfileId,
                  placementArea: report.placementArea,
                }}
                compact={false}
              />
            </div>
          </div>

          {/* Section 2: Isi Laporan */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
              <FileText className="size-3.5 text-sky-500" />
              <span>Isi Laporan Jaring</span>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-lg border border-border/70 bg-muted/20 p-4 font-sans text-foreground text-sm leading-relaxed whitespace-pre-wrap">
              {fullContent}
            </div>
          </div>

          {/* Section 3: Catatan Petugas Wilayah (Gaswil) if any */}
          {report.fieldOfficerNote ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                <ShieldAlert className="size-3.5" />
                <span>Catatan Petugas Wilayah (Gaswil)</span>
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-900 text-xs dark:text-amber-200 whitespace-pre-wrap">
                {report.fieldOfficerNote}
              </div>
            </div>
          ) : null}

          {/* Section 4: Lampiran Media / Foto if any */}
          {report.media && report.media.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                <ImageIcon className="size-3.5 text-amber-500" />
                <span>Lampiran Foto ({report.media.length})</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {report.media.map((med, idx) => {
                  const src = med.fileUrl || (med.fileId ? `/api/files/${med.fileId}` : "");
                  return (
                    <a
                      key={med.id || idx}
                      href={src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-video overflow-hidden rounded-lg border border-border bg-slate-100 dark:bg-slate-900"
                    >
                      {src ? (
                        /* biome-ignore lint/performance/noImgElement: dynamic user-uploaded attachment */
                        <img
                          src={src}
                          alt={med.caption || med.fileName || `Lampiran ${idx + 1}`}
                          className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-muted-foreground text-xs">
                          <ImageIcon className="size-6" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                      {med.caption ? (
                        <div className="absolute inset-x-0 bottom-0 p-1.5 text-[11px] text-white truncate">
                          {med.caption}
                        </div>
                      ) : null}
                    </a>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Section 5: Rangkaian Pesan Masuk if any */}
          {report.messages && report.messages.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                <MessageSquare className="size-3.5 text-sky-500" />
                <span>Rangkaian Pesan Masuk ({report.messages.length})</span>
              </div>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-border/70 bg-muted/20 p-3">
                {report.messages.map((msg, i) => (
                  <div
                    key={msg.id || i}
                    className="rounded-md border border-border/50 bg-card p-2.5 text-xs shadow-2xs"
                  >
                    <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="font-bold font-mono uppercase">{msg.kind}</span>
                      <span>{msg.sentAt ? formatDateTime(msg.sentAt) : ""}</span>
                    </div>
                    {msg.kind === "TEXT" && <p className="whitespace-pre-wrap text-foreground">{msg.text}</p>}
                    {(msg.kind === "IMAGE" || msg.kind === "VIDEO") && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <ImageIcon className="size-4 text-amber-500" />
                        <span>{msg.caption || msg.fileName || "Berkas Media"}</span>
                      </div>
                    )}
                    {msg.kind === "LIVE_LOCATION" && (
                      <div className="flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400">
                        <MapPin className="size-3.5" />
                        <span>
                          {msg.latitude}, {msg.longitude}
                        </span>
                      </div>
                    )}
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
            <Link href={`/dashboard/laporan-jaring/${report.id}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              Buka Halaman Detail (Tab Baru)
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
