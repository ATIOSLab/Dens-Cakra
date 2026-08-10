"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  ImageIcon,
  MapPin,
  RefreshCw,
} from "lucide-react";

import { JaringIdentitySummary } from "@/components/domain/jaring-identity-summary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { EvidenceAttachmentViewer } from "@/features/baket/components/evidence-attachment-viewer";
import { apiBrowserFetch } from "@/lib/api/browser-client";
import { DOMAIN_VISUALS } from "@/lib/domain/visual-system";

import { LaporanJaringLocationMap } from "./laporan-jaring-location-map";
import {
  formatDateTime,
  urgencyBadgeClass,
  urgencyLabel,
  verificationStatusBadgeVariant,
  verificationStatusLabel,
} from "./laporan-jaring-presentation";
import { formatFullAreaName, type JaringReportSessionDetail, type VerificationStatus } from "./laporan-jaring-types";
import { WhatsAppReportThread } from "./whatsapp-report-thread";

function getReportDisplayStatus(report: JaringReportSessionDetail): VerificationStatus {
  return (report.processStatus ?? report.displayStatus ?? report.verificationStatus) as VerificationStatus;
}

function DetailSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-[360px] w-full" />
      </CardContent>
    </Card>
  );
}

export function LaporanJaringLeadershipDetailClient({
  reportSessionId,
  backHref = "/dashboard/laporan-jaring",
}: {
  reportSessionId: string;
  backHref?: string;
}) {
  const [report, setReport] = useState<JaringReportSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestInFlight = useRef(false);

  const loadReport = useCallback(
    async (silent = false) => {
      if (requestInFlight.current) return;
      requestInFlight.current = true;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const detail = await apiBrowserFetch<JaringReportSessionDetail>(`/jaring/reports/${reportSessionId}`);
        setReport(detail);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Detail laporan Jaring gagal dimuat.");
      } finally {
        requestInFlight.current = false;
        if (!silent) setLoading(false);
      }
    },
    [reportSessionId],
  );

  useEffect(() => {
    void loadReport();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadReport(true);
    }, 5_000);
    return () => window.clearInterval(interval);
  }, [loadReport]);

  const reportTitle = report?.displayTitle || "Laporan Informasi Jaring";
  const reportDisplayStatus = report ? getReportDisplayStatus(report) : "NOT_SUBMITTED";
  const reportHasBaket = Boolean(report?.baket);
  const areaLabel = formatFullAreaName(report?.resolvedArea);
  const media = report?.media || [];
  const googleMapsUrl = useMemo(() => {
    if (!report?.location) return null;
    return `https://www.google.com/maps?q=${report.location.latitude},${report.location.longitude}`;
  }, [report?.location]);

  const isFromBaket = backHref.includes("/baket");

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 sm:gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Beranda</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={backHref}>{isFromBaket ? "Baket" : "Monitoring Laporan Jaring"}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Detail Laporan Jaring</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <BackButton href={backHref} label="Kembali" />
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Telaah Pimpinan</p>
            <h1 className="text-2xl font-bold tracking-tight">Detail Laporan Jaring</h1>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadReport()} disabled={loading}>
          <RefreshCw className={loading ? "animate-spin" : undefined} />
          Muat Ulang
        </Button>
      </div>

      {loading ? (
        <DetailSkeleton />
      ) : error || !report ? (
        <Card>
          <CardHeader>
            <CardTitle>Detail laporan tidak dapat ditampilkan</CardTitle>
            <CardDescription>{error || "Laporan Jaring tidak ditemukan."}</CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {report.referenceNumber || report.id}
                  </Badge>
                  <Badge variant="outline" className={verificationStatusBadgeVariant(reportDisplayStatus)}>
                    <CheckCircle2 />
                    {verificationStatusLabel(reportDisplayStatus)}
                  </Badge>
                  {reportHasBaket && report.urgency ? (
                    <Badge variant="outline" className={urgencyBadgeClass(report.urgency)}>
                      {urgencyLabel(report.urgency)}
                    </Badge>
                  ) : null}
                </div>
                <CardTitle className="text-2xl leading-tight md:text-3xl">{reportTitle}</CardTitle>
                <CardDescription>
                  Informasi utuh untuk telaah pimpinan, bersumber dari laporan Jaring dan hasil penanganan Petugas
                  Wilayah (Gaswil).
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-6">
            <Alert>
              <FileCheck2 />
              <AlertTitle>{reportHasBaket ? "Baket Sudah Dibuat" : "Siap Dibuat Baket"}</AlertTitle>
              <AlertDescription>
                Laporan Jaring dapat langsung dijadikan Baket sesuai cakupan wilayah, hierarki, dan hak akses pengguna.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-5">
              <JaringIdentitySummary
                compact
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
                className="sm:col-span-2 lg:col-span-2"
              />
              <div className="flex gap-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <dt className="text-xs text-muted-foreground">Laporan diterima</dt>
                  <dd className="font-semibold">{formatDateTime(report.reportedAt)}</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <dt className="text-xs text-muted-foreground">Waktu pelaporan</dt>
                  <dd className="font-semibold">{formatDateTime(report.reportedAt)}</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <dt className="text-xs text-muted-foreground">Lokasi Aktual Laporan</dt>
                  <dd className="font-semibold">
                    {googleMapsUrl ? (
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-600 hover:underline dark:text-sky-400 inline-flex items-center gap-1 font-semibold"
                        title="Buka lokasi koordinat di Google Maps"
                      >
                        {areaLabel}
                        <ExternalLink className="size-3.5 shrink-0 opacity-70" />
                      </a>
                    ) : (
                      areaLabel
                    )}
                  </dd>
                </div>
              </div>
            </div>

            <Separator />

            <section className="flex flex-col gap-3" aria-labelledby="isi-laporan-title">
              <div className="flex items-center gap-2">
                <DOMAIN_VISUALS.jaringReport.Icon className={`size-5 ${DOMAIN_VISUALS.jaringReport.iconClass}`} />
                <h2 id="isi-laporan-title" className="text-lg font-semibold">
                  Isi Laporan Jaring (Tampilan WhatsApp)
                </h2>
              </div>
              <WhatsAppReportThread
                senderAlias={report.jaringAlias || report.jaringCode || "Pengirim Jaring"}
                messages={report.messages}
                fallbackContent={report.content ?? undefined}
                fallbackMedia={report.media}
                fallbackSentAt={report.reportedAt}
              />
            </section>

            {reportHasBaket &&
            (report.reportCategory ||
              report.normalizedContent ||
              report.fieldOfficerNote ||
              report.baket?.latestVersion) ? (
              <section className="flex flex-col gap-4" aria-labelledby="hasil-telaah-title">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="size-5 text-muted-foreground" />
                  <h2 id="hasil-telaah-title" className="text-lg font-semibold">
                    Baket dari Laporan Jaring
                  </h2>
                </div>
                <dl className="grid grid-cols-1 gap-4 rounded-lg border p-4 md:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Kategori Baket</dt>
                    <dd className="font-semibold">{report.reportCategory?.name || "Belum ditentukan"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Urgensi</dt>
                    <dd className="font-semibold">{report.urgency || "Belum ditentukan"}</dd>
                  </div>
                  {report.normalizedContent ? (
                    <div className="md:col-span-2">
                      <dt className="text-xs text-muted-foreground">Ringkasan Informasi</dt>
                      <dd className="mt-1 whitespace-pre-wrap leading-7">{report.normalizedContent}</dd>
                    </div>
                  ) : null}
                  {report.fieldOfficerNote ? (
                    <div className="md:col-span-2">
                      <dt className="text-xs text-muted-foreground">Catatan Petugas Wilayah (Gaswil)</dt>
                      <dd className="mt-1 whitespace-pre-wrap leading-7">{report.fieldOfficerNote}</dd>
                    </div>
                  ) : null}
                </dl>
              </section>
            ) : null}

            <Separator />

            <section className="flex flex-col gap-3" aria-labelledby="lampiran-title">
              <div className="flex items-center gap-2">
                <ImageIcon className="size-5 text-muted-foreground" />
                <h2 id="lampiran-title" className="text-lg font-semibold">
                  Lampiran Media
                </h2>
                <Badge variant="secondary">{media.length} berkas</Badge>
              </div>
              {media.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {media.map((item: any) => (
                    <EvidenceAttachmentViewer
                      key={item.id}
                      src={`/api/files/${item.fileId}`}
                      fileName={item.fileName || "Lampiran"}
                      mimeType={item.mimeType}
                      caption={item.caption}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Laporan ini tidak memiliki lampiran media.
                </p>
              )}
            </section>

            <Separator />

            <section className="flex flex-col gap-3" aria-labelledby="lokasi-title">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <MapPin className="size-5 text-muted-foreground" />
                  <h2 id="lokasi-title" className="text-lg font-semibold">
                    Lokasi Pembuatan Laporan
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Titik GPS yang dikirim pada saat laporan dibuat oleh Jaring.
                </p>
              </div>
              {report.location ? (
                <>
                  <LaporanJaringLocationMap
                    latitude={report.location.latitude}
                    longitude={report.location.longitude}
                    title={reportTitle}
                    areaLabel={areaLabel}
                    capturedAt={report.location.capturedAt}
                  />
                  <dl className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/20 p-4 md:grid-cols-4">
                    <div>
                      <dt className="text-xs text-muted-foreground">Latitude</dt>
                      <dd className="font-mono font-semibold">{report.location.latitude}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Longitude</dt>
                      <dd className="font-mono font-semibold">{report.location.longitude}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Akurasi GPS</dt>
                      <dd className="font-semibold">
                        {report.location.accuracyMeters ? `±${report.location.accuracyMeters} meter` : "Tidak tercatat"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Waktu perekaman</dt>
                      <dd className="font-semibold">{formatDateTime(report.location.capturedAt)}</dd>
                    </div>
                  </dl>
                </>
              ) : (
                <Alert>
                  <MapPin />
                  <AlertTitle>Koordinat lokasi belum tersedia</AlertTitle>
                  <AlertDescription>Jaring tidak menyertakan titik GPS ketika laporan ini dibuat.</AlertDescription>
                </Alert>
              )}
            </section>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
