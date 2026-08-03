"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  MapPin,
  Phone,
  RefreshCw,
  ScrollText,
  User,
  Users,
} from "lucide-react";

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiBrowserFetch } from "@/lib/api/browser-client";

import type { CoachingReportItem } from "@/app/(main)/dashboard/field-officer/laporan-pembinaan/_components/laporan-pembinaan-types";
import type { FieldOfficerJaring } from "@/server/field-ops/types";

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "-";
  }
}

interface DetailClientProps {
  jaringId: string;
  reportId: string;
}

export function LaporanPembinaanDetailClient({ jaringId, reportId }: DetailClientProps) {
  const [report, setReport] = useState<CoachingReportItem | null>(null);
  const [jaring, setJaring] = useState<FieldOfficerJaring | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchDetail() {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch report detail from backend endpoint GET /api/v1/jaring/:jaringId/coaching-reports/:reportId
      const data = await apiBrowserFetch<CoachingReportItem>(
        `/jaring/${jaringId}/coaching-reports/${reportId}`,
      );
      setReport(data);

      // 2. Fetch workspace to get full Jaring identity if available
      try {
        const wsRes = await fetch("/api/field-officer/workspace");
        if (wsRes.ok) {
          const wsData = await wsRes.json();
          if (Array.isArray(wsData?.jaring)) {
            const found = wsData.jaring.find((j: FieldOfficerJaring) => j.id === jaringId);
            if (found) {
              setJaring(found);
            }
          }
        }
      } catch {
        // ignore fallback
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat detail laporan pembinaan.");
    } fontId: {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchDetail();
  }, [jaringId, reportId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 max-w-5xl mx-auto w-full">
        <RefreshCw className="h-8 w-8 text-primary animate-spin mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Memuat detail laporan pembinaan...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 max-w-5xl mx-auto w-full text-center">
        <ScrollText className="h-12 w-12 text-destructive/50 mb-3" />
        <h3 className="text-base font-semibold text-foreground mb-1">Gagal Memuat Laporan</h3>
        <p className="text-xs text-muted-foreground max-w-md mb-4">{error || "Laporan pembinaan tidak ditemukan."}</p>
        <Link href="/dashboard/field-officer/laporan-pembinaan">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Daftar Laporan
          </Button>
        </Link>
      </div>
    );
  }

  const jaringAlias = jaring?.aliasName || jaring?.code || "Jaring";
  const jaringName = jaring?.fullName || jaringAlias;
  const areaName = jaring?.areaNames && jaring.areaNames.length > 0 ? jaring.areaNames.join(", ") : "-";

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-5xl mx-auto w-full">
      {/* Header Actions */}
      <div className="flex items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/field-officer/laporan-pembinaan">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                Laporan Pembinaan
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDateTime(report.reportedAt)}
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground mt-1">{report.title}</h1>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => void fetchDetail()} className="h-9 text-xs gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Jaring Info */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="p-4 pb-2 border-b">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" />
                Identitas Daftar Jaring
              </span>
              {jaring?.registrationStatus === "APPROVED" && (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                  Terverifikasi
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs">
            {jaring?.profilePhotoUrl && (
              <div className="flex justify-between items-center pb-1">
                <span className="text-muted-foreground">Foto Jaring:</span>
                <div className="size-14 overflow-hidden rounded-md border border-border bg-muted/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={jaring.profilePhotoUrl} alt={`Foto ${jaringAlias}`} className="size-full object-cover" />
                </div>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Kode Jaring:</span>
              <span className="font-semibold text-foreground font-mono">{jaring?.code || jaringAlias}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Nama Sandi / Alias:</span>
              <span className="font-semibold text-foreground font-mono">{jaringAlias}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Nama Lengkap:</span>
              <span className="font-medium text-foreground">{jaringName}</span>
            </div>
            {jaring?.nationalIdNumber && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">NIK / No. Identitas:</span>
                <span className="font-mono text-foreground">{jaring.nationalIdNumber}</span>
              </div>
            )}
            {jaring?.occupationName && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Pekerjaan:</span>
                <span className="font-medium text-foreground">{jaring.occupationName}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" /> WhatsApp:
              </span>
              {jaring?.whatsappNumber ? (
                <a
                  href={`https://wa.me/${jaring.whatsappNumber.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-primary hover:underline"
                >
                  {jaring.whatsappNumber}
                </a>
              ) : (
                <span className="font-mono text-foreground">{report.fieldOfficer?.userProfile?.phone || "-"}</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Kelurahan / Desa:
              </span>
              <span className="font-medium text-foreground">{areaName}</span>
            </div>
            {jaring?.address && (
              <div className="flex justify-between items-start pt-1">
                <span className="text-muted-foreground shrink-0">Alamat:</span>
                <span className="font-medium text-foreground text-right max-w-[220px]">{jaring.address}</span>
              </div>
            )}

            <div className="pt-2 border-t flex justify-end">
              <Link href={`/dashboard/field-officer/jaring-binaan/${jaringId}`}>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary">
                  Lihat Profil Jaring &rarr;
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Waktu & Metadata Laporan */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="p-4 pb-2 border-b">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              Waktu & Tanggal Laporan Pembinaan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Waktu Pembinaan:
              </span>
              <span className="font-semibold text-foreground">{formatDateTime(report.reportedAt)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Tanggal Input Laporan:
              </span>
              <span className="text-foreground">{formatDateTime(report.createdAt)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">ID Laporan:</span>
              <span className="font-mono text-[11px] text-muted-foreground">{report.id}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Title Section */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="p-4 pb-2 border-b bg-muted/30">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-primary" />
            Judul Laporan Pembinaan
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <h2 className="text-base font-bold text-foreground tracking-tight">{report.title}</h2>
        </CardContent>
      </Card>

      {/* Content Section */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="p-4 pb-3 border-b bg-muted/30">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-primary" />
            Isi Laporan Pembinaan
          </CardTitle>
          <CardDescription className="text-xs">
            Rincian bimbingan, petunjuk teknis, arahan lapangan, serta respon Jaring.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap font-sans bg-background p-4 rounded-lg border border-border/60">
            {report.content}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
