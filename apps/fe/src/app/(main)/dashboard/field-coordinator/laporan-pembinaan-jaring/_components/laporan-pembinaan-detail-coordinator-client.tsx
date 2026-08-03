"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Phone,
  RefreshCw,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiBrowserFetch } from "@/lib/api/browser-client";
import { cn } from "@/lib/utils";

import type { CoachingReportItem } from "@/app/(main)/dashboard/field-officer/laporan-pembinaan/_components/laporan-pembinaan-types";

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
  code: string;
  aliasName?: string | null;
  fullName?: string | null;
  profilePhotoUrl?: string | null;
  whatsappNumber?: string | null;
  registrationStatus?: string | null;
}

export function LaporanPembinaanDetailCoordinatorClient({ reportId }: { reportId: string }) {
  const searchParams = useSearchParams();
  const jaringIdParam = searchParams.get("jaringId");

  const [report, setReport] = useState<CoachingReportItem | null>(null);
  const [jaringInfo, setJaringInfo] = useState<RawJaringItem | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchDetail() {
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
          } catch {}
        }
      } else {
        // Fetch Jaring profile for header info
        try {
          const jInfo = await apiBrowserFetch<RawJaringItem>(`/jaring/${targetJaringId}`);
          setJaringInfo(jInfo);
        } catch {}
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
      console.error("Gagal memuat detail laporan pembinaan:", err);
      toast.error("Detail laporan pembinaan tidak ditemukan.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (reportId) {
      void fetchDetail();
    }
  }, [reportId, jaringIdParam]);

  return (
    <main className="space-y-6 p-4 md:p-6 lg:p-8 max-w-[1200px] mx-auto transition-colors duration-150">
      {/* BREADCRUMB */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/field-coordinator">Field Coordinator</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/field-coordinator/laporan-pembinaan-jaring">Laporan Pembinaan Jaring</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Detail Pembinaan</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* HEADER BAR */}
      <div className="flex items-center justify-between gap-4">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="gap-2 text-xs"
        >
          <Link href="/dashboard/field-coordinator/laporan-pembinaan-jaring">
            <ArrowLeft className="size-4" /> Kembali ke Daftar
          </Link>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchDetail()}
          disabled={loading}
          className="h-8 gap-2 text-xs"
        >
          <RefreshCw className={cn("size-3.5 text-emerald-500", loading && "animate-spin")} />
          Refresh Data
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl bg-card border-slate-200 dark:border-white/10">
          <RefreshCw className="size-8 animate-spin text-emerald-500 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Memuat detail laporan pembinaan...</p>
        </div>
      ) : !report ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl bg-card border-slate-200 dark:border-white/10">
          <FileText className="size-10 text-muted-foreground/50 mb-3" />
          <p className="text-base font-semibold text-foreground">Detail Laporan Tidak Ditemukan</p>
          <Button asChild variant="outline" size="sm" className="mt-4 text-xs">
            <Link href="/dashboard/field-coordinator/laporan-pembinaan-jaring">Kembali ke Daftar</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* MAIN CONTENT COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-slate-200/80 dark:border-white/10 shadow-xs">
              <CardHeader className="border-b border-slate-100 dark:border-white/5 pb-4">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono text-xs">
                    Sandi: {jaringInfo?.aliasName || jaringInfo?.code || report.jaringAlias || report.jaringCode || "-"}
                  </Badge>
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
          </div>

          {/* SIDEBAR METADATA COLUMN */}
          <div className="space-y-6">
            {/* Field Officer Profile Card */}
            <Card className="border-slate-200/80 dark:border-white/10 shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-white/5">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <User className="size-4 text-sky-500" /> Petugas Field Officer
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div>
                  <p className="text-muted-foreground text-[11px]">Nama Lengkap</p>
                  <p className="font-semibold text-foreground text-sm">
                    {report.fieldOfficer?.userProfile?.fullName || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px]">Username</p>
                  <p className="font-mono text-foreground">
                    @{report.fieldOfficer?.userProfile?.username || "-"}
                  </p>
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
                  <Users className="size-4 text-emerald-500" /> Jaring Terkait
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                {jaringInfo?.profilePhotoUrl && (
                  <div>
                    <p className="text-muted-foreground text-[11px] mb-1.5">Foto Jaring</p>
                    <div className="size-16 overflow-hidden rounded-md border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-900/50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={jaringInfo.profilePhotoUrl}
                        alt={`Foto ${jaringInfo.aliasName || jaringInfo.code}`}
                        className="size-full object-cover"
                      />
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground text-[11px]">Sandi / Alias</p>
                  <p className="font-semibold text-foreground text-sm">
                    {jaringInfo?.aliasName || report.jaringAlias || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px]">Kode Jaring</p>
                  <p className="font-mono text-foreground">
                    {jaringInfo?.code || report.jaringCode || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px]">Nama Lengkap Personel Jaring</p>
                  <p className="font-medium text-foreground">
                    {jaringInfo?.fullName || report.jaringName || "-"}
                  </p>
                </div>
                {jaringInfo?.whatsappNumber && (
                  <div>
                    <p className="text-muted-foreground text-[11px]">WhatsApp</p>
                    <a
                      href={`https://wa.me/${jaringInfo.whatsappNumber.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <Phone className="size-3" /> {jaringInfo.whatsappNumber}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </main>
  );
}
