"use client";

import { useCallback, useEffect, useState } from "react";

import { useSearchParams } from "next/navigation";

import { Clock, FileText, ImageIcon, Phone, RefreshCw, User } from "lucide-react";
import { toast } from "sonner";

import { GaswilEntityLink } from "@/components/domain/gaswil-entity-link";
import { JaringIdentitySummary } from "@/components/domain/jaring-identity-summary";
import { BackButton } from "@/components/ui/back-button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EvidenceAttachmentViewer } from "@/features/baket/components/evidence-attachment-viewer";
import { apiBrowserFetch } from "@/lib/api/browser-client";
import { DOMAIN_VISUALS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

import type { CoachingReportItem } from "./laporan-pembinaan-types";

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

interface RawJaringItem {
  id: string;
  aliasName?: string | null;
  fullName?: string | null;
  profilePhotoUrl?: string | null;
  profilePhotoFileId?: string | null;
  profilePhotoFile?: { id: string } | null;
  whatsappNumber?: string | null;
  registrationStatus?: string | null;
}

export function LaporanPembinaanDetailCoordinatorClient({ reportId }: { reportId: string }) {
  const searchParams = useSearchParams();
  const jaringIdParam = searchParams.get("jaringId");

  const [report, setReport] = useState<CoachingReportItem | null>(null);
  const [jaringInfo, setJaringInfo] = useState<RawJaringItem | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      let targetJaringId = jaringIdParam;

      // If jaringId is not in search params, fetch approved jarings to find which jaring owns this reportId
      if (!targetJaringId) {
        const jaringsRes = await apiBrowserFetch<{ items?: RawJaringItem[] } | RawJaringItem[]>("/jaring?limit=100");
        const jarings = Array.isArray(jaringsRes) ? jaringsRes : jaringsRes?.items || [];
        const approved = jarings.filter((j) => j.registrationStatus === "APPROVED");

        for (const j of approved) {
          try {
            const reports = await apiBrowserFetch<{ items?: CoachingReportItem[] } | CoachingReportItem[]>(
              `/jaring/${j.id}/coaching-reports?limit=100`,
            );
            const items = Array.isArray(reports) ? reports : reports?.items || [];
            if (items.some((r) => r.id === reportId)) {
              targetJaringId = j.id;
              setJaringInfo(j);
              break;
            }
          } catch {
            // Lanjutkan pencarian ke Jaring berikutnya jika salah satu permintaan gagal.
          }
        }
      } else {
        // Fetch Jaring profile for header info
        try {
          const jInfo = await apiBrowserFetch<RawJaringItem>(`/jaring/${targetJaringId}`);
          setJaringInfo(jInfo);
        } catch {
          setJaringInfo(null);
        }
      }

      if (!targetJaringId) {
        toast.error("Data Jaring tidak ditemukan untuk laporan ini.");
        setLoading(false);
        return;
      }

      // Fetch exact coaching report detail
      const detail = await apiBrowserFetch<CoachingReportItem>(
        `/jaring/${targetJaringId}/coaching-reports/${reportId}`,
      );
      setReport(detail);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat detail laporan pembinaan.");
    } finally {
      setLoading(false);
    }
  }, [jaringIdParam, reportId]);

  useEffect(() => {
    if (reportId) {
      void fetchDetail();
    }
  }, [fetchDetail, reportId]);

  return (
    <main className="dc-page">
      {/* BREADCRUMB */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Beranda</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/laporan-pembinaan-jaring">Riwayat Pembinaan Jaring</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Detail Pembinaan</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Detail Pembinaan Jaring</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground text-sm">
            Rincian catatan pembinaan, Petugas Wilayah (Gaswil), dan identitas Jaring terkait.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-auto">
          <BackButton href="/dashboard/laporan-pembinaan-jaring" label="Kembali ke Riwayat" />

          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchDetail()}
            disabled={loading}
            className="h-9 gap-2 text-xs"
          >
            <RefreshCw className={cn("size-3.5 text-emerald-500", loading && "animate-spin")} />
            Muat Ulang
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[250px] flex-col items-center justify-center rounded-lg border bg-card/50 p-8 text-center">
          <RefreshCw className="size-8 animate-spin text-emerald-500 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Memuat detail laporan pembinaan...</p>
        </div>
      ) : !report ? (
        <div className="flex min-h-[250px] flex-col items-center justify-center rounded-lg border bg-card/50 p-8 text-center">
          <FileText className="size-10 text-muted-foreground/50 mb-3" />
          <p className="text-base font-semibold text-foreground">Detail Laporan Tidak Ditemukan</p>
          <p className="mt-1 max-w-md text-muted-foreground text-xs">
            Laporan pembinaan mungkin sudah tidak tersedia atau berada di luar cakupan akses Anda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* MAIN CONTENT COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-slate-200/80 dark:border-white/10 shadow-xs">
              <CardHeader className="border-b border-slate-100 dark:border-white/5 pb-4">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3.5" /> Dilaporkan: {formatDateTime(report.reportedAt)}
                  </span>
                </div>

                <CardTitle className="font-heading font-bold text-2xl tracking-tight text-foreground">
                  {report.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="p-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <FileText className="size-4 text-emerald-500" /> Catatan Pembinaan
                </h4>
                <div className="prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap rounded-lg bg-slate-50 dark:bg-white/5 p-4 border border-slate-100 dark:border-white/5">
                  {report.content}
                </div>
              </CardContent>
            </Card>

            {report.attachments && report.attachments.length > 0 ? (
              <Card className="border-slate-200/80 dark:border-white/10 shadow-xs">
                <CardHeader className="border-b border-slate-100 dark:border-white/5 pb-4">
                  <CardTitle className="font-heading font-bold text-xl tracking-tight text-foreground flex items-center gap-2">
                    <ImageIcon className="size-4 text-emerald-500" /> Lampiran Foto
                    <span className="text-xs font-medium text-muted-foreground">
                      {report.attachments.length} berkas
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {report.attachments.map((attachment) => (
                      <EvidenceAttachmentViewer
                        key={attachment.fileId}
                        src={`/api/files/${attachment.fileId}`}
                        fileName={attachment.fileName ?? attachment.fileId}
                        mimeType={attachment.mimeType}
                        caption={attachment.caption}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>

          {/* SIDEBAR METADATA COLUMN */}
          <div className="space-y-6">
            {/* Kartu profil Petugas Wilayah (Gaswil) */}
            <Card className="border-slate-200/80 dark:border-white/10 shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-white/5">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <User className="size-4 text-sky-500" /> Petugas Wilayah (Gaswil)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div>
                  <p className="text-muted-foreground text-[11px]">Nama Lengkap</p>
                  <p className="font-semibold text-foreground text-sm">
                    <GaswilEntityLink
                      name={report.fieldOfficer?.userProfile?.fullName || "-"}
                      assignmentId={report.fieldOfficer?.assignmentId}
                      userProfileId={report.fieldOfficer?.userProfile?.id}
                    />
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px]">Username</p>
                  <p className="font-mono text-foreground">@{report.fieldOfficer?.userProfile?.username || "-"}</p>
                </div>
                {report.fieldOfficer?.userProfile?.phone && (
                  <div>
                    <p className="text-muted-foreground text-[11px]">Nomor Kontak</p>
                    <p className="font-mono text-foreground flex items-center gap-1">
                      <Phone className="size-3 text-emerald-500" /> {report.fieldOfficer.userProfile.phone}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Jaring Metadata Card */}
            <Card className="border-slate-200/80 dark:border-white/10 shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-white/5">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <DOMAIN_VISUALS.jaring.Icon className={`size-4 ${DOMAIN_VISUALS.jaring.iconClass}`} /> Jaring Terkait
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <JaringIdentitySummary
                  source={{
                    id: report.jaringId,
                    fullName: jaringInfo?.fullName,
                    jaringName: report.jaringName,
                    aliasName: jaringInfo?.aliasName,
                    jaringAlias: report.jaringAlias,
                    jaringCode: report.jaringCode,
                    whatsappNumber: jaringInfo?.whatsappNumber,
                    jaringWhatsAppNumber: report.jaringWhatsAppNumber,
                    profilePhotoFileId: jaringInfo?.profilePhotoFileId ?? jaringInfo?.profilePhotoFile?.id,
                    jaringProfilePhotoFileId: report.jaringProfilePhotoFileId,
                    gaswilName: report.fieldOfficer?.userProfile?.fullName,
                    gaswilAssignmentId: report.fieldOfficer?.assignmentId,
                    gaswilUserProfileId: report.fieldOfficer?.userProfile?.id,
                    assignedArea: report.assignedArea,
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </main>
  );
}
