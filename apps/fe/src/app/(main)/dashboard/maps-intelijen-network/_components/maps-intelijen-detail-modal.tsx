"use client";

import Link from "next/link";
import { Eye, ImageIcon, MapPin, User, UserCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EvidenceImageViewer } from "@/features/baket/components/evidence-image-viewer";
import { cn } from "@/lib/utils";

import {
  formatDateTime,
  getInitials,
  getUrgencyCardStyle,
  type MapIntelItem,
  verificationStatusBadgeVariant,
  verificationStatusLabel,
} from "./maps-intelijen-types";

interface MapsIntelijenDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItem: MapIntelItem | null;
  jaringPhotoUrl: string | null;
  matchingJaring: any;
  gaswilName: string;
  gaswilPhotoUrl: string | null;
  onFocusOnMap: (item: MapIntelItem) => void;
}

export function MapsIntelijenDetailModal({
  open,
  onOpenChange,
  selectedItem,
  jaringPhotoUrl,
  gaswilName,
  gaswilPhotoUrl,
  onFocusOnMap,
}: MapsIntelijenDetailModalProps) {
  if (!selectedItem) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6 font-sans sm:p-7 md:max-w-4xl">
        <div className="space-y-6">
          {/* Header Info */}
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "font-bold text-xs uppercase",
                    selectedItem.isBaket
                      ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : "border-slate-400 bg-slate-500/20 text-slate-700 dark:text-slate-300",
                  )}
                >
                  {selectedItem.isBaket ? "BAKET" : "LAPORAN JARING"}
                </Badge>

                <Badge
                  variant="outline"
                  className={cn(
                    "font-extrabold text-xs tracking-wider",
                    getUrgencyCardStyle(selectedItem.urgency).badge,
                  )}
                >
                  {selectedItem.urgency}
                </Badge>
              </div>

              <span className="font-bold font-mono text-muted-foreground text-xs">
                {selectedItem.report.referenceNumber || selectedItem.jaringCode}
              </span>
            </div>

            <DialogTitle className="mt-2 font-extrabold font-heading text-xl leading-snug">
              {selectedItem.displayTitle}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              ID Sesi: {selectedItem.id} • Masuk pada {formatDateTime(selectedItem.submittedAt)}
            </DialogDescription>
          </DialogHeader>

          {/* Jaring & Petugas Gaswil Profile Cards */}
          <div className="grid grid-cols-1 gap-4 rounded-xl border bg-muted/30 p-4 sm:grid-cols-2">
            {/* Jaring Profile */}
            <div className="flex items-center gap-3">
              <Avatar className="size-12 shrink-0 overflow-hidden rounded-full border-2 border-sky-500/40 shadow-xs">
                {jaringPhotoUrl ? (
                  <AvatarImage src={jaringPhotoUrl} alt={selectedItem.jaringName} className="size-full object-cover" />
                ) : null}
                <AvatarFallback className="bg-sky-600 font-extrabold text-white text-xs">
                  {getInitials(selectedItem.jaringName || selectedItem.jaringCode)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate font-bold text-foreground text-sm">{selectedItem.jaringName}</span>
                  <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 font-mono text-[10px] text-sky-600 dark:text-sky-400">
                    {selectedItem.jaringCode}
                  </Badge>
                </div>
                <p className="flex items-center gap-1 text-muted-foreground text-xs">
                  <User className="size-3 shrink-0 text-sky-500" /> Pelapor / Personel Jaring
                </p>
              </div>
            </div>

            {/* Petugas Gaswil */}
            <div className="flex items-center gap-3 border-t pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
              <Avatar className="size-12 shrink-0 overflow-hidden rounded-full border-2 border-emerald-500/40 shadow-xs">
                {gaswilPhotoUrl ? (
                  <AvatarImage src={gaswilPhotoUrl} alt={gaswilName} className="size-full object-cover" />
                ) : null}
                <AvatarFallback className="bg-emerald-600 font-extrabold text-white text-xs">
                  {getInitials(gaswilName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 space-y-0.5">
                <span className="block truncate font-bold text-foreground text-sm">
                  {gaswilName}
                </span>
                <p className="flex items-center gap-1 text-muted-foreground text-xs">
                  <UserCheck className="size-3 shrink-0 text-emerald-500" /> Petugas Wilayah
                </p>
              </div>
            </div>
          </div>

          {/* Main Content Box */}
          <div className="space-y-2">
            <h4 className="font-bold text-muted-foreground text-xs uppercase tracking-wider">
              Isi Laporan / Informasi Intelijen
            </h4>
            <div className="whitespace-pre-wrap rounded-xl border bg-muted/40 p-4 font-sans text-sm leading-relaxed">
              {selectedItem.content}
            </div>
          </div>

          {/* Metadata Details Grid */}
          <div className="grid grid-cols-2 gap-4 rounded-xl border bg-card p-4 text-xs sm:grid-cols-4">
            <div>
              <dt className="font-medium text-muted-foreground">
                {selectedItem.isBaket ? "Status Urgensi" : "Status Verifikasi"}
              </dt>
              <dd className="mt-1">
                {selectedItem.isBaket ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-extrabold text-xs tracking-wider",
                      getUrgencyCardStyle(selectedItem.urgency).badge,
                    )}
                  >
                    {selectedItem.urgency || "NORMAL"}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-bold text-xs",
                      verificationStatusBadgeVariant(selectedItem.verificationStatus),
                    )}
                  >
                    {verificationStatusLabel(selectedItem.verificationStatus)}
                  </Badge>
                )}
              </dd>
            </div>

            <div>
              <dt className="font-medium text-muted-foreground">Nomor Referensi</dt>
              <dd className="mt-1 font-bold font-mono text-foreground">
                {selectedItem.report.referenceNumber || selectedItem.jaringCode || selectedItem.id}
              </dd>
            </div>

            <div>
              <dt className="font-medium text-muted-foreground">Waktu Pelaporan</dt>
              <dd className="mt-1 font-bold text-foreground">
                {formatDateTime(selectedItem.submittedAt || selectedItem.report.reportedAt)}
              </dd>
            </div>

            <div className="col-span-2 border-t pt-3 sm:col-span-4">
              <dt className="flex items-center gap-1 font-medium text-muted-foreground">
                <MapPin className="size-3.5 text-sky-500" /> Lokasi Cakupan Wilayah
              </dt>
              <dd className="mt-0.5 font-semibold text-foreground">{selectedItem.locationName}</dd>
            </div>
          </div>

          {/* Media Attachments using EvidenceImageViewer */}
          {selectedItem.report.media && selectedItem.report.media.length > 0 ? (
            <div className="space-y-3">
              <h4 className="flex items-center gap-1.5 font-bold text-muted-foreground text-xs uppercase tracking-wider">
                <ImageIcon className="size-4 text-amber-500" /> Lampiran Dokumentasi & Foto (
                {selectedItem.report.media.length})
              </h4>
              <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200/80 bg-slate-50/50 p-3 sm:grid-cols-2 md:grid-cols-3 dark:border-white/10 dark:bg-slate-900/40">
                {selectedItem.report.media.map((media: any) => {
                  const fileId = media.fileId || media.id;
                  const srcUrl = media.url || media.fileUrl || `/api/files/${fileId}`;
                  return (
                    <div
                      key={media.id || fileId}
                      className="space-y-2 overflow-hidden rounded-lg border border-slate-200/80 bg-card p-2 shadow-2xs dark:border-white/10"
                    >
                      <EvidenceImageViewer
                        src={srcUrl}
                        alt={media.fileName || "Lampiran Media"}
                        fileName={media.fileName || "Foto Lampiran"}
                        caption={media.caption}
                      />
                      <div className="truncate px-1 font-mono text-[11px] text-muted-foreground">
                        {media.fileName || "Foto Lampiran"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Dialog Actions */}
          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onFocusOnMap(selectedItem);
              }}
              className="w-full gap-2 border-sky-500/40 font-semibold text-sky-600 text-xs hover:bg-sky-500/10 sm:w-auto dark:text-sky-400"
            >
              <MapPin className="size-4" /> Lihat Lokasi di Peta
            </Button>

            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="w-full font-semibold text-xs sm:w-auto"
              >
                Tutup
              </Button>

              <Button
                asChild
                size="sm"
                className="w-full gap-2 bg-primary font-bold text-primary-foreground text-xs shadow-xs sm:w-auto"
              >
                <Link
                  href={
                    selectedItem.isBaket
                      ? "/dashboard/baket"
                      : `/dashboard/laporan-jaring/${selectedItem.id}`
                  }
                >
                  <Eye className="size-4" /> Buka Detail
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
