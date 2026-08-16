import { CheckCircle2, Clock, ExternalLink, ImageIcon, MapPin, Tag } from "lucide-react";

import { JaringIdentitySummary } from "@/components/domain/jaring-identity-summary";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BaketAdministrativeArea } from "@/features/baket/components/baket-administrative-area";
import { BaketLocationMap } from "@/features/baket/components/baket-location-map";
import { EvidenceAttachmentViewer } from "@/features/baket/components/evidence-attachment-viewer";
import { getUrgencyBadgeClass, getUrgencyLabel } from "@/lib/domain/operational-presentation";
import { cn } from "@/lib/utils";

import type { ReportMessageItem } from "../laporan-jaring/_components/laporan-jaring-types";
import { WhatsAppReportThread } from "../laporan-jaring/_components/whatsapp-report-thread";
import {
  type BaketRecord,
  currentBaketVersion,
  formatBaketAreaName,
  getBaketContent,
  getBaketDate,
  getBaketDisplayTitle,
  getBaketJaringIdentitySource,
  getBaketReferenceLabel,
  getBaketStatusLabel,
  getBaketVersionLabel,
} from "./baket-data";

type BaketDetailProps = {
  baket: BaketRecord;
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  try {
    return `${new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    }).format(new Date(value))} WIB`;
  } catch {
    return "-";
  }
}

export function BaketDetail({ baket }: BaketDetailProps) {
  const version = currentBaketVersion(baket);
  const sourceMessages = version?.sourceMessages ?? [];
  const attachments = version?.attachments ?? [];
  const urgencyLabel = getUrgencyLabel(version?.urgency);
  const urgencyBadgeClass = getUrgencyBadgeClass(version?.urgency);
  const statusLabel = getBaketStatusLabel(baket.status);
  const categoryName = baket.reportCategory?.name ?? "Belum tersedia";
  const content = getBaketContent(baket);
  const senderAlias = baket.primaryJaring?.aliasName ?? baket.primaryJaring?.fullName ?? "Pengirim Jaring";

  const rawLat = version?.latitude;
  const rawLng = version?.longitude;
  const latitude = rawLat != null && rawLat !== "" ? Number(rawLat) : Number.NaN;
  const longitude = rawLng != null && rawLng !== "" ? Number(rawLng) : Number.NaN;
  const hasLocation = Number.isFinite(latitude) && Number.isFinite(longitude);
  const areaLabel = formatBaketAreaName(version?.eventArea);
  const googleMapsUrl = hasLocation ? `https://www.google.com/maps?q=${latitude},${longitude}` : null;

  const sourceMessageItems: ReportMessageItem[] = sourceMessages
    .map((source, index) => {
      const message = source.message;
      const text = message?.content?.trim();
      if (!text) return null;
      return {
        id: source.messageId ?? message?.id ?? `source-${index}`,
        kind: "TEXT" as const,
        text,
        sentAt: message?.receivedAt ?? getBaketDate(baket),
      };
    })
    .filter((item): item is ReportMessageItem => item !== null);

  const verification = version?.verification;
  const hasVerification = [
    verification?.sourceReliability,
    verification?.informationCredibility,
    verification?.summary,
  ].some((value) => Boolean(value && String(value).trim()));

  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 sm:space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/baket">Bahan Keterangan (Baket)</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Detail Baket</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* HEADER */}
      <div className="space-y-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BackButton
              href="/dashboard/baket"
              label="Kembali"
              className="h-9 shrink-0 rounded-lg border-slate-200/80 dark:border-white/10"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold font-mono text-sm text-violet-600 dark:text-violet-400">
                  {getBaketReferenceLabel(baket)}
                </span>
                <Badge variant="outline" className="font-semibold">
                  {statusLabel}
                </Badge>
                <Badge variant="outline" className={cn("font-semibold", urgencyBadgeClass)}>
                  Urgensi: {urgencyLabel}
                </Badge>
                <Badge variant="outline" className="font-semibold">
                  Kategori: {categoryName}
                </Badge>
                <Badge variant="outline" className="font-mono">
                  {getBaketVersionLabel(baket)}
                </Badge>
              </div>
              <h1 className="mt-0.5 font-bold text-2xl text-foreground">{getBaketDisplayTitle(baket)}</h1>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1 — LAPORAN JARING SUMBER */}
      <Card className="overflow-hidden rounded-xl border border-slate-200/80 bg-card shadow-xs dark:border-white/10">
        <CardHeader className="border-slate-200/80 border-b bg-slate-50/50 p-4 md:p-5 dark:border-white/10 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-sky-500/10 font-bold text-sky-600 text-xs dark:text-sky-400">
              1
            </div>
            <div>
              <CardTitle className="font-bold text-sm uppercase tracking-wide">Laporan Jaring Sumber</CardTitle>
              <CardDescription className="text-xs">
                Laporan Jaring yang dipilih Petugas Wilayah (Gaswil) untuk diolah menjadi Bahan Keterangan (Baket).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-4 md:p-6">
          <JaringIdentitySummary source={getBaketJaringIdentitySource(baket)} className="md:col-span-2" />

          <div className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-slate-50/40 p-3 text-xs dark:border-white/10 dark:bg-slate-900/30">
            <Clock className="size-3.5 text-sky-600 dark:text-sky-400" />
            <span className="font-medium text-muted-foreground">Waktu Dikirim:</span>
            <span className="font-mono text-foreground text-sm">{formatDateTime(getBaketDate(baket))}</span>
          </div>

          <div className="space-y-1.5">
            <span className="font-medium text-muted-foreground text-xs">Tampilan Pesan WhatsApp Chat Bubble:</span>
            <WhatsAppReportThread
              senderAlias={senderAlias}
              messages={sourceMessageItems}
              fallbackContent={version?.originalContent ?? undefined}
            />
          </div>

          {hasLocation ? (
            <div className="space-y-2 rounded-lg border border-slate-200/80 bg-slate-50/40 p-3.5 dark:border-white/10 dark:bg-slate-900/30">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                  <MapPin className="size-4 text-sky-600 dark:text-sky-400" />
                  Informasi Lokasi & Koordinat GPS
                </span>
                {googleMapsUrl ? (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-sky-600 text-xs hover:underline dark:text-sky-400"
                  >
                    Buka Google Maps <ExternalLink className="size-3" />
                  </a>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1 font-mono text-[11px] md:grid-cols-4">
                <div>
                  <span className="block text-muted-foreground">Latitude:</span>
                  <span className="font-bold text-foreground">{latitude}</span>
                </div>
                <div>
                  <span className="block text-muted-foreground">Longitude:</span>
                  <span className="font-bold text-foreground">{longitude}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-muted-foreground">Wilayah Teresolusi:</span>
                  <span className="font-bold text-foreground">{areaLabel}</span>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* SECTION 2 — BAHAN KETERANGAN (BAKET) */}
      <Card className="overflow-hidden rounded-xl border border-slate-200/80 bg-card shadow-xs dark:border-white/10">
        <CardHeader className="border-slate-200/80 border-b bg-slate-50/50 p-4 md:p-5 dark:border-white/10 dark:bg-slate-900/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 font-bold text-violet-600 text-xs dark:text-violet-400">
                2
              </div>
              <div>
                <CardTitle className="font-bold text-sm uppercase tracking-wide">Bahan Keterangan (Baket)</CardTitle>
                <CardDescription className="text-xs">
                  Kategori, urgensi, dan narasi Baket yang disusun dari Laporan Jaring.
                </CardDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className="border-violet-500/40 bg-violet-500/10 font-mono text-[10px] text-violet-700 dark:text-violet-400"
            >
              {getBaketVersionLabel(baket)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 text-xs md:p-6">
          <div className="flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 p-3 font-semibold text-violet-700 dark:text-violet-400">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>Baket telah dibuat dari Laporan Jaring ini.</span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1 rounded-lg border border-slate-200/80 bg-slate-50/40 p-3 dark:border-white/10 dark:bg-slate-900/30">
              <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                <Tag className="size-3.5 text-violet-600 dark:text-violet-400" />
                Kategori Baket:
              </span>
              <p className="font-semibold text-foreground">{categoryName}</p>
            </div>

            <div className="space-y-1 rounded-lg border border-slate-200/80 bg-slate-50/40 p-3 dark:border-white/10 dark:bg-slate-900/30">
              <span className="font-medium text-muted-foreground">Tingkat Urgensi:</span>
              <Badge variant="outline" className={cn("font-semibold", urgencyBadgeClass)}>
                {urgencyLabel}
              </Badge>
            </div>
          </div>

          <div className="space-y-1">
            <span className="font-medium text-muted-foreground">Formulasi Isi Baket:</span>
            <div className="whitespace-pre-wrap rounded-lg border border-slate-200/80 bg-slate-50 p-3.5 font-mono text-xs leading-relaxed dark:border-white/10 dark:bg-slate-950/40">
              {content || "-"}
            </div>
          </div>

          {version?.fieldOfficerNote ? (
            <div className="space-y-1">
              <span className="font-medium text-muted-foreground">Catatan Tambahan Petugas Wilayah (Gaswil):</span>
              <div className="rounded-lg border border-slate-200/80 bg-slate-50 p-3 text-xs dark:border-white/10 dark:bg-slate-950/40">
                {version.fieldOfficerNote}
              </div>
            </div>
          ) : null}

          {hasVerification ? (
            <div className="space-y-2 rounded-lg border border-slate-200/80 bg-slate-50/40 p-3 dark:border-white/10 dark:bg-slate-900/30">
              <span className="font-medium text-muted-foreground">Penilaian Baket:</span>
              {verification?.sourceReliability ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Keandalan Sumber</span>
                  <span className="font-semibold text-foreground">{verification.sourceReliability}</span>
                </div>
              ) : null}
              {verification?.informationCredibility ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Kredibilitas Informasi</span>
                  <span className="font-semibold text-foreground">{verification.informationCredibility}</span>
                </div>
              ) : null}
              {verification?.summary ? <p className="text-foreground">{verification.summary}</p> : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* SECTION — LOKASI & WILAYAH ADMINISTRATIF */}
      <Card className="overflow-hidden rounded-xl border border-slate-200/80 bg-card shadow-xs dark:border-white/10">
        <CardHeader className="border-slate-200/80 border-b bg-slate-50/50 p-4 md:p-5 dark:border-white/10 dark:bg-slate-900/40">
          <CardTitle className="flex items-center gap-2 font-bold text-sm uppercase tracking-wide">
            <MapPin className="size-4 text-violet-600 dark:text-violet-400" />
            Lokasi & Wilayah Administratif
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6">
          {hasLocation ? (
            <BaketLocationMap
              latitude={latitude}
              longitude={longitude}
              title={getBaketDisplayTitle(baket)}
              areaLabel={areaLabel}
              urgency={version?.urgency}
            />
          ) : (
            <p className="rounded-lg border border-dashed p-4 text-muted-foreground text-sm">
              Koordinat lokasi belum tersedia pada Baket ini.
            </p>
          )}
          <BaketAdministrativeArea area={version?.eventArea} />
        </CardContent>
      </Card>

      {/* SECTION — LAMPIRAN MEDIA */}
      <Card className="overflow-hidden rounded-xl border border-slate-200/80 bg-card shadow-xs dark:border-white/10">
        <CardHeader className="border-slate-200/80 border-b bg-slate-50/50 p-4 md:p-5 dark:border-white/10 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <ImageIcon className="size-4 text-violet-600 dark:text-violet-400" />
            <CardTitle className="font-bold text-sm uppercase tracking-wide">Lampiran Media</CardTitle>
            <Badge variant="secondary">{attachments.length} berkas</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {attachments.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {attachments.map((attachment) => {
                const fileId = attachment.fileId ?? attachment.file?.id;
                if (!fileId) return null;
                return (
                  <EvidenceAttachmentViewer
                    key={fileId}
                    src={`/api/files/${fileId}`}
                    fileName={attachment.file?.originalName ?? fileId}
                    mimeType={attachment.file?.mimeType}
                    caption={attachment.caption}
                  />
                );
              })}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-4 text-muted-foreground text-sm">
              Baket ini tidak memiliki lampiran media.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
