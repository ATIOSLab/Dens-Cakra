"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { Calendar, CheckCircle2, Inbox, MapPin, Phone, ShieldAlert, Tag, User } from "lucide-react";

import { JaringIdentitySummary } from "@/components/domain/jaring-identity-summary";
import { BackButton } from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EvidenceAttachmentViewer } from "@/features/baket/components/evidence-attachment-viewer";
import { EvidenceImageViewer } from "@/features/baket/components/evidence-image-viewer";
import type { FieldOfficerIncoming, FieldOfficerWorkspace } from "@/server/field-ops/types";

import { LeafletLocationPreview } from "../../_components/leaflet-location-preview";

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusTone(status: string) {
  switch (status.toUpperCase()) {
    case "PENDING":
      return "border-[#D97706]/35 bg-[#D97706]/10 text-[#D97706]";
    case "VALIDATED":
    case "VALID":
      return "border-[#16A34A]/35 bg-[#16A34A]/10 text-[#16A34A]";
    default:
      return "border-[#64748B]/35 bg-[#64748B]/10 text-[#64748B]";
  }
}

function validationLabel(status: string) {
  return status === "NOT_CHECKED" ? "MENUNGGU VALIDASI" : status;
}

type IncomingDetailClientProps = {
  messageId: string;
};

export function IncomingDetailClient({ messageId }: IncomingDetailClientProps) {
  const [workspace, setWorkspace] = useState<FieldOfficerWorkspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadWorkspace() {
      try {
        const response = await fetch("/api/field-officer/workspace");
        if (!response.ok) {
          throw new Error("Gagal mengambil data workspace.");
        }
        const data = await response.json();
        setWorkspace(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan koneksi.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadWorkspace();
  }, []);

  const message = useMemo(() => {
    if (!workspace) return null;
    return workspace.incoming.find((item) => item.id === messageId) || null;
  }, [workspace, messageId]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-24 animate-pulse rounded bg-slate-200 dark:bg-white/5" />
        <Card className="border-[var(--tactical-border)] bg-[var(--tactical-card-bg)]">
          <CardHeader>
            <div className="h-6 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-white/5" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-white/5" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-white/5" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !message) {
    return (
      <div className="p-6 space-y-4">
        <div>
          <BackButton href="/dashboard/field-officer" />
        </div>
        <Card className="border-[var(--tactical-border)] bg-[var(--tactical-card-bg)]">
          <CardContent className="py-8 text-center text-red-500 font-mono">
            {error || "Laporan tidak ditemukan atau telah diproses."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const jaring = workspace?.jaring.find((item) => item.id === message.jaringId);

  return (
    <div className="space-y-4 p-6">
      <div>
        <BackButton href="/dashboard/field-officer" label="Kembali ke Dashboard" />
      </div>

      <div className="tactical-card space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--tactical-border)] pb-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`tactical-badge rounded px-2 py-0.5 text-[11px] ${statusTone(message.status)}`}>
                {message.status}
              </span>
              <span className="tactical-badge rounded border border-[var(--tactical-border)] px-2 py-0.5 font-mono text-[11px] text-[var(--tactical-text-secondary)]">
                VAL: {validationLabel(message.validationSummary)}
              </span>
            </div>
            <h1 className="font-semibold text-[var(--tactical-text-primary)] text-2xl tracking-tight">
              {message.displayTitle || message.jaringAlias}
            </h1>
          </div>
        </div>

        <section className="rounded-lg border border-[var(--tactical-border)] bg-black/5 p-4 dark:bg-white/[0.01]">
          <JaringIdentitySummary
            source={{
              id: message.jaringId,
              fullName: jaring?.fullName,
              jaringAlias: message.jaringAlias,
              jaringCode: message.jaringCode,
              whatsappNumber: jaring?.whatsappNumber ?? message.senderPhone,
              profilePhotoUrl: jaring?.profilePhotoUrl,
              profilePhotoFileId: jaring?.profilePhotoFileId,
              gaswilName: workspace?.profile.name,
              gaswilHref: "/dashboard/profil",
              villageName: jaring?.areaNames.join(", ") || message.areaName,
            }}
          />
        </section>

        <div className="space-y-4">
          <h2 className="font-mono font-semibold text-xs text-[var(--tactical-text-secondary)] uppercase tracking-wider">
            Isi Laporan / Pesan Jaring
          </h2>
          <div className="rounded-lg border border-[var(--tactical-border)] bg-black/5 dark:bg-white/[0.01] p-4 text-[var(--tactical-text-primary)] text-base leading-relaxed whitespace-pre-wrap font-mono">
            {message.content || "Pesan belum memiliki isi teks."}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Metadata Grid */}
          <div className="space-y-4">
            <h2 className="font-mono font-semibold text-xs text-[var(--tactical-text-secondary)] uppercase tracking-wider">
              Informasi Pengiriman & Waktu
            </h2>
            <div className="rounded-lg border border-[var(--tactical-border)] p-4 space-y-3 font-mono text-sm">
              <div className="flex justify-between py-1 border-b border-[var(--tactical-border)]/50">
                <span className="text-[var(--tactical-text-secondary)]">DITERIMA SISTEM</span>
                <span>{formatDateTime(message.receivedAt)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border(--tactical-border)/50">
                <span className="text-[var(--tactical-text-secondary)]">WAKTU PELAPORAN</span>
                <span>{formatDateTime(message.reportedAt)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[var(--tactical-text-secondary)]">GPS TIME</span>
                <span>{formatDateTime(message.gpsSharedAt)}</span>
              </div>
            </div>
          </div>

          {/* Photo Verification */}
          {message.hasPhoto && (
            <div className="space-y-4">
              <h2 className="font-mono font-semibold text-xs text-[var(--tactical-text-secondary)] uppercase tracking-wider">
                Bukti Foto / Visual
              </h2>
              <div className="space-y-3 rounded-lg border border-[var(--tactical-green)]/20 bg-[var(--tactical-green)]/[0.02] p-4 text-[var(--tactical-green)] text-sm">
                <div className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>FOTO BUKTI TERVERIFIKASI</span>
                </div>
                {message.evidenceFiles.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {message.evidenceFiles.map((file, index) => (
                      <div
                        key={file.fileId}
                        className="overflow-hidden rounded-lg border border-[var(--tactical-border)] shadow-sm"
                      >
                        <EvidenceAttachmentViewer
                          src={file.url}
                          fileName={file.originalName || file.fileId}
                          mimeType={file.mimeType}
                          caption={file.caption || `Dokumentasi ${index + 1} · Jaring ${message.jaringCode}`}
                        />
                      </div>
                    ))}
                  </div>
                ) : message.photoUrl ? (
                  <div className="max-w-xs overflow-hidden rounded-lg border border-[var(--tactical-border)] shadow-sm">
                    <EvidenceImageViewer
                      src={message.photoUrl}
                      alt={`Foto bukti ${message.displayTitle || message.jaringAlias}`}
                      fileName={message.photoFileId || `${message.id}.jpg`}
                      caption={message.photoCaption || `Jaring ${message.jaringCode}`}
                    />
                  </div>
                ) : (
                  <p className="text-[var(--tactical-text-secondary)] text-xs opacity-80 font-mono">
                    Foto diterima oleh bot, tetapi file visual belum tersedia di storage.
                  </p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-[var(--tactical-text-muted)] border-t border-[var(--tactical-border)]/20 pt-2 mt-2">
                  <span>
                    FILE: {message.mediaCount > 0 ? `${message.mediaCount} DOKUMENTASI` : message.photoFileId || "-"}
                  </span>
                  <span>WA ID: {message.photoMessageId || "-"}</span>
                  {message.photoCaption && <span>CAPTION: {message.photoCaption}</span>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Location Section */}
        {message.latitude !== null && message.longitude !== null && (
          <div className="space-y-4 pt-4 border-t border-[var(--tactical-border)]">
            <h2 className="font-mono font-semibold text-xs text-[var(--tactical-text-secondary)] uppercase tracking-wider">
              Lokasi GPS / Peta Koordinat
            </h2>
            <div className="grid gap-4 md:grid-cols-[1fr_20rem] rounded-lg border border-[var(--tactical-border)] bg-black/10 p-4 dark:bg-white/[0.01]">
              <div className="space-y-3 text-[var(--tactical-text-secondary)] text-sm font-mono">
                <p className="font-medium text-[var(--tactical-text-primary)]">KOORDINAT KEJADIAN</p>
                <p className="text-sm">
                  {message.latitude.toFixed(7)}, {message.longitude.toFixed(7)}
                </p>
                <p className="text-[var(--tactical-text-muted)] text-xs">
                  AKURASI: {message.gpsAccuracyMeters !== null ? `${message.gpsAccuracyMeters} M` : "-"}
                </p>
                <a
                  href={`https://www.google.com/maps?q=${message.latitude},${message.longitude}`}
                  rel="noreferrer"
                  target="_blank"
                  className="mt-2 inline-flex items-center gap-1.5 rounded border border-[var(--tactical-border)] bg-white dark:bg-slate-900 px-3 py-1.5 font-medium font-mono text-[var(--tactical-text-secondary)] text-xs transition-colors hover:bg-[var(--tactical-text-secondary)]/10"
                >
                  <MapPin className="size-3.5" />
                  Buka di Google Maps
                </a>
              </div>
              <a
                href={`https://www.google.com/maps?q=${message.latitude},${message.longitude}`}
                rel="noreferrer"
                target="_blank"
                aria-label="Buka koordinat laporan di Google Maps"
                className="block overflow-hidden rounded-lg border border-[var(--tactical-border)] h-48"
              >
                <LeafletLocationPreview
                  latitude={message.latitude}
                  longitude={message.longitude}
                  title={message.displayTitle || message.jaringAlias}
                />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
