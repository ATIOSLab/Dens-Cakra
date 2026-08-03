"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Clock,
  ExternalLink,
  FileCheck2,
  FileText,
  ImageIcon,
  Mail,
  MailOpen,
  MapPin,
  UserCheck,
  UserRound,
} from "lucide-react";

import {
  formatFullAreaName,
  type JaringReportSessionDetail,
  type VerificationStatus,
} from "./laporan-jaring-types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { EvidenceImageViewer } from "@/features/baket/components/evidence-image-viewer";
import { apiBrowserFetch } from "@/lib/api/browser-client";

import { LaporanJaringLocationMap } from "./laporan-jaring-location-map";

function formatDateTime(value?: string | null) {
  if (!value) return "Belum tercatat";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Belum tercatat";
  }
}

function verificationStatusLabel(status: VerificationStatus) {
  switch (status) {
    case "IN_PROGRESS_BY_JARING":
    case "NOT_SUBMITTED":
    case "WAITING_FIELD_OFFICER_VERIFICATION":
      return "Belum Diverifikasi";
    case "NEEDS_FIELD_OFFICER_REVIEW":
      return "Perlu Review Petugas";
    case "VERIFIED_BY_FIELD_OFFICER":
      return "Terverifikasi Petugas";
    case "METADATA_RECORDED":
      return "Baket Dibuat";
  }
}

function isVerifiedReport(status: VerificationStatus) {
  return status === "VERIFIED_BY_FIELD_OFFICER" || status === "METADATA_RECORDED";
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

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError(null);
      try {
        const detail = await apiBrowserFetch<JaringReportSessionDetail>(`/jaring/reports/${reportSessionId}`);
        if (!cancelled) setReport(detail);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Detail laporan Jaring gagal dimuat.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadReport();
    return () => {
      cancelled = true;
    };
  }, [reportSessionId]);

  const reportTitle = report?.title || "Laporan Informasi Jaring";
  const readAt = report?.fieldOfficerReadAt ?? report?.readAt ?? null;
  const hasBeenRead = report?.isReadByFieldOfficer ?? report?.isRead ?? Boolean(readAt);
  const reportIsVerified = report ? isVerifiedReport(report.verificationStatus) : false;
  const areaLabel = formatFullAreaName(report?.resolvedArea);
  const media = report?.media || [];
  const googleMapsUrl = useMemo(() => {
    if (!report?.location) return null;
    return `https://www.google.com/maps?q=${report.location.latitude},${report.location.longitude}`;
  }, [report?.location]);

  const isFromBaket = backHref.includes("/baket");

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-6 lg:p-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Beranda</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={backHref}>
              {isFromBaket ? "Baket" : "Monitoring Laporan Jaring"}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Detail Laporan Jaring</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon" aria-label="Kembali ke daftar">
            <Link href={backHref}>
              <ArrowLeft />
            </Link>
          </Button>
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Telaah Pimpinan</p>
            <h1 className="text-2xl font-bold tracking-tight">Detail Laporan Jaring</h1>
          </div>
        </div>
        {googleMapsUrl ? (
          <Button asChild variant="outline" size="sm">
            <a href={googleMapsUrl} target="_blank" rel="noreferrer">
              <ExternalLink data-icon="inline-start" />
              Buka Lokasi
            </a>
          </Button>
        ) : null}
      </div>

      {loading ? (
        <DetailSkeleton />
      ) : error || !report ? (
        <Card>
          <CardHeader>
            <CardTitle>Detail laporan tidak dapat ditampilkan</CardTitle>
            <CardDescription>{error || "Laporan Jaring tidak ditemukan."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/dashboard/laporan-jaring">
                <ArrowLeft data-icon="inline-start" />
                Kembali ke Daftar
              </Link>
            </Button>
          </CardContent>
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
                  <Badge variant={reportIsVerified ? "secondary" : "outline"}>
                    {reportIsVerified ? <CheckCircle2 /> : <CircleDashed />}
                    {verificationStatusLabel(report.verificationStatus)}
                  </Badge>
                  <Badge variant={hasBeenRead ? "secondary" : "outline"}>
                    {hasBeenRead ? <MailOpen /> : <Mail />}
                    {hasBeenRead ? "Sudah dibaca petugas" : "Belum dibaca petugas"}
                  </Badge>
                  {reportIsVerified && report.urgency ? <Badge>{report.urgency}</Badge> : null}
                </div>
                <CardTitle className="text-2xl leading-tight md:text-3xl">{reportTitle}</CardTitle>
                <CardDescription>
                  Informasi utuh untuk telaah pimpinan, bersumber dari laporan Jaring dan hasil penanganan Field
                  Officer.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-6">
            <Alert>
              {hasBeenRead ? <MailOpen /> : <Mail />}
              <AlertTitle>
                {hasBeenRead ? "Sudah dibaca oleh Field Officer" : "Belum dibaca oleh Field Officer"}
              </AlertTitle>
              <AlertDescription>
                {hasBeenRead
                  ? `Petugas membuka laporan ini pada ${formatDateTime(readAt)}.`
                  : "Belum ada aktivitas baca dari Field Officer yang menangani laporan ini."}
              </AlertDescription>
            </Alert>

            <dl className="grid grid-cols-1 gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="flex gap-3">
                <UserRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <dt className="text-xs text-muted-foreground">Sumber Jaring</dt>
                  <dd className="font-semibold">{report.jaringAlias || report.jaringCode || report.jaringId}</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <UserCheck className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <dt className="text-xs text-muted-foreground">Gaswil (Petugas Lapangan)</dt>
                  <dd className="font-semibold">{report.gaswilName || "-"}</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <dt className="text-xs text-muted-foreground">Laporan diterima</dt>
                  <dd className="font-semibold">{formatDateTime(report.submittedAt || report.createdAt)}</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <dt className="text-xs text-muted-foreground">Waktu kejadian</dt>
                  <dd className="font-semibold">{formatDateTime(report.incidentAt)}</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <dt className="text-xs text-muted-foreground">Wilayah</dt>
                  <dd className="font-semibold">{areaLabel}</dd>
                </div>
              </div>
            </dl>

            <Separator />

            <section className="flex flex-col gap-3" aria-labelledby="isi-laporan-title">
              <div className="flex items-center gap-2">
                <FileText className="size-5 text-muted-foreground" />
                <h2 id="isi-laporan-title" className="text-lg font-semibold">
                  Isi Laporan Jaring
                </h2>
              </div>
              <div className="whitespace-pre-wrap rounded-lg border bg-muted/20 p-4 text-sm leading-7">
                {report.content || "Belum ada isi laporan yang dapat ditampilkan."}
              </div>
            </section>

            {reportIsVerified &&
            (report.reportCategory ||
              report.normalizedContent ||
              report.fieldOfficerNote ||
              report.baket?.latestVersion) ? (
              <section className="flex flex-col gap-4" aria-labelledby="hasil-telaah-title">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="size-5 text-muted-foreground" />
                  <h2 id="hasil-telaah-title" className="text-lg font-semibold">
                    Hasil Telaah Petugas
                  </h2>
                </div>
                <dl className="grid grid-cols-1 gap-4 rounded-lg border p-4 md:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Kategori</dt>
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
                      <dt className="text-xs text-muted-foreground">Catatan Field Officer</dt>
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
                    <EvidenceImageViewer
                      key={item.id}
                      src={`/api/files/${item.fileId}`}
                      alt={item.fileName || "Lampiran laporan Jaring"}
                      fileName={item.fileName || "Lampiran"}
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
