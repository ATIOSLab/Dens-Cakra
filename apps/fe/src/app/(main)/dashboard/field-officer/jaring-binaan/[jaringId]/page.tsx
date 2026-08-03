"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  LayoutGrid,
  Network,
  Plus,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Table as TableIcon,
  UserRound,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { FieldOfficerJaring, FieldOfficerWorkspace } from "@/server/field-ops/types";
import { apiBrowserFetch } from "@/lib/api/browser-client";
import { cn } from "@/lib/utils";
import { JaringReportCardItem } from "@/app/(main)/dashboard/field-coordinator/verifikasi-jaring/verification-client";


function formatDateOnly(value?: string | null) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusTone(status: string) {
  const value = status.toUpperCase();
  if (value.includes("BELUM AKTIF") || value.includes("PENDING")) {
    return "dark:bg-amber-950/40 bg-amber-50 dark:text-amber-300 text-amber-700 dark:border-amber-500/20 border-amber-200";
  }
  if (value.includes("INACTIVE") || value.includes("REJECTED") || value.includes("NONAKTIF")) {
    return "dark:bg-red-950/40 bg-red-50 dark:text-red-400 text-red-700 dark:border-red-500/20 border-red-200";
  }
  if (value.includes("ACTIVE") || value.includes("COMPLETED") || value.includes("VALID") || value.includes("AKTIF")) {
    return "dark:bg-emerald-950/40 bg-emerald-50 dark:text-[#22C55E] text-emerald-700 dark:border-emerald-500/20 border-emerald-200";
  }
  return "dark:bg-slate-800/40 bg-slate-50 dark:text-slate-400 text-slate-700 dark:border-slate-500/20 border-slate-200";
}

function operationalStatusLabel(jaring: FieldOfficerJaring) {
  if (jaring.registrationStatus === "REJECTED") return "NONAKTIF";
  if (jaring.registrationStatus === "PENDING") return "BELUM AKTIF";
  if (jaring.status === "ACTIVE") return "AKTIF";
  if (jaring.status === "INACTIVE") return "NONAKTIF";
  return jaring.status;
}

function registrationStatusLabel(status: FieldOfficerJaring["registrationStatus"]) {
  if (status === "PENDING") return "BELUM TERVERIFIKASI";
  if (status === "REJECTED") return "DITOLAK / REVISI";
  return "TERVERIFIKASI";
}

function registrationStatusTone(status: FieldOfficerJaring["registrationStatus"]) {
  if (status === "PENDING") {
    return "dark:bg-amber-950/40 bg-amber-50 dark:text-amber-300 text-amber-700 dark:border-amber-500/20 border-amber-200";
  }
  if (status === "REJECTED") {
    return "dark:bg-red-950/40 bg-red-50 dark:text-red-400 text-red-700 dark:border-red-500/20 border-red-200";
  }
  return "dark:bg-emerald-950/40 bg-emerald-50 dark:text-[#22C55E] text-emerald-700 dark:border-emerald-500/20 border-emerald-200";
}

function resolveJaringDistrictNames(jaring: FieldOfficerJaring, workspace: FieldOfficerWorkspace | null) {
  if (!workspace) {
    return "-";
  }

  const districtNames = new Set<string>();

  for (const areaId of jaring.areaIds ?? []) {
    const directDistrict = workspace.districtAreas.find((area) => area.areaId === areaId);
    if (directDistrict?.name) {
      districtNames.add(directDistrict.name);
      continue;
    }

    const village = workspace.villageAreas.find((area) => area.areaId === areaId);
    if (!village) {
      continue;
    }

    const district =
      workspace.districtAreas.find((area) => area.areaId === village.parentAreaId) ??
      workspace.districtAreas.find(
        (area) => Boolean(village.parentOfficialCode) && area.officialCode === village.parentOfficialCode,
      ) ??
      workspace.districtAreas.find(
        (area) =>
          village.code.startsWith(`${area.code}.`) ||
          Boolean(area.officialCode && village.officialCode?.startsWith(`${area.officialCode}.`)),
      );

    if (district?.name) {
      districtNames.add(district.name);
    }
  }

  return Array.from(districtNames).join(", ") || "-";
}

type PageProps = {
  params: Promise<{
    jaringId: string;
  }>;
};

export default function JaringDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { jaringId } = React.use(params);
  const [workspace, setWorkspace] = React.useState<FieldOfficerWorkspace | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [visiblePin, setVisiblePin] = React.useState(false);
  const [photoPreviewOpen, setPhotoPreviewOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"information" | "reports" | "coaching">("information");
  const [reports, setReports] = React.useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = React.useState(false);
  const [reportsLoaded, setReportsLoaded] = React.useState(false);
  const [expandedReportIds, setExpandedReportIds] = React.useState<Set<string>>(new Set());
  const [reportsViewMode, setReportsViewMode] = React.useState<"card" | "table">("card");
  const [reportsPage, setReportsPage] = React.useState(1);
  const [reportsLimit, setReportsLimit] = React.useState(10);
  const [coachingReports, setCoachingReports] = React.useState<any[]>([]);
  const [coachingLoading, setCoachingLoading] = React.useState(false);
  const [coachingLoaded, setCoachingLoaded] = React.useState(false);


  const loadCoachingReports = React.useCallback(async () => {
    setCoachingLoading(true);
    try {
      const res = await apiBrowserFetch<{ items?: any[] } | any[]>(`/jaring/${jaringId}/coaching-reports`);
      const itemsList = Array.isArray(res) ? res : res?.items || [];
      setCoachingReports(itemsList);
      setCoachingLoaded(true);
    } catch (err) {
      console.error("Gagal memuat laporan pembinaan:", err);
    } finally {
      setCoachingLoading(false);
    }
  }, [jaringId]);

  React.useEffect(() => {
    if (activeTab === "coaching" && !coachingLoaded) {
      void loadCoachingReports();
    }
  }, [activeTab, coachingLoaded, loadCoachingReports]);

  const reportsTotalPages = Math.ceil(reports.length / reportsLimit) || 1;
  const paginatedReports = React.useMemo(() => {
    const start = (reportsPage - 1) * reportsLimit;
    return reports.slice(start, start + reportsLimit);
  }, [reports, reportsPage, reportsLimit]);
  const reportsStartIndex = reports.length === 0 ? 0 : (reportsPage - 1) * reportsLimit + 1;
  const reportsEndIndex = Math.min(reportsPage * reportsLimit, reports.length);

  const toggleReportExpand = (id: string) => {
    setExpandedReportIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  React.useEffect(() => {
    if (activeTab === "reports" && !reportsLoaded) {
      let cancelled = false;
      async function loadReports() {
        setReportsLoading(true);
        try {
          const res = await apiBrowserFetch<{ items?: any[] } | any[]>(`/jaring/${jaringId}/reports`);
          if (!cancelled) {
            const itemsList = Array.isArray(res) ? res : res?.items || [];
            setReports(itemsList);
            setReportsLoaded(true);
          }
        } catch (err) {
          console.error("Gagal memuat laporan jaring:", err);
        } finally {
          if (!cancelled) setReportsLoading(false);
        }
      }
      void loadReports();
      return () => {
        cancelled = true;
      };
    }
  }, [activeTab, jaringId, reportsLoaded]);

  React.useEffect(() => {
    async function loadWorkspace() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/field-officer/workspace", {
          cache: "no-store",
        });
        const body = (await response.json()) as FieldOfficerWorkspace | { message?: string };

        if (!response.ok) {
          throw new Error("message" in body ? body.message : "Gagal memuat workspace.");
        }

        setWorkspace(body as FieldOfficerWorkspace);
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Gagal memuat detail jaring.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadWorkspace();
  }, []);

  const jaring = React.useMemo(() => {
    if (!workspace) return null;
    return workspace.jaring.find((item) => item.id === jaringId) ?? null;
  }, [workspace, jaringId]);

  const gaswilName = React.useMemo(() => {
    if (!jaring) return "-";
    const caretaker = (jaring as any).caretakerAssignments?.[0]?.fieldOfficerAssignment?.userProfile;
    return (jaring as any).fieldOfficerName || caretaker?.fullName || caretaker?.username || workspace?.profile?.name || "-";
  }, [jaring, workspace]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="size-8 animate-spin text-[#38BDF8]" />
          <p className="text-xs text-muted-foreground font-mono">Memuat detail jaring...</p>
        </div>
      </div>
    );
  }

  if (error || !jaring) {
    return (
      <div className="p-6 max-w-xl mx-auto space-y-4">
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-red-600 dark:text-red-400">
          <h3 className="font-bold text-sm">Gagal memuat data</h3>
          <p className="text-xs mt-1">{error || "Data Jaring tidak ditemukan."}</p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href="/dashboard/field-officer/jaring-binaan">
            <ArrowLeft className="mr-2 size-4" /> Kembali ke Daftar
          </Link>
        </Button>
      </div>
    );
  }

  const villageNames = jaring.areaNames?.join(", ") || "-";
  const districtNames = resolveJaringDistrictNames(jaring, workspace);

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto transition-colors duration-150">
      {/* Header / Breadcrumb */}
      <div className="flex items-center justify-between border-b dark:border-blue-400/12 border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 rounded-[6px] dark:border-blue-400/12 border-slate-200 dark:bg-[#111827] bg-white dark:hover:bg-blue-400/5 hover:bg-slate-100 text-muted-foreground hover:text-foreground transition-all duration-150 ease-out font-medium"
          >
            <Link href="/dashboard/field-officer/jaring-binaan">
              <ArrowLeft className="mr-1.5 size-3.5 stroke-[1.5] dark:text-[#38BDF8] text-sky-600" />
              Kembali
            </Link>
          </Button>
          <div className="h-4 w-px dark:bg-blue-400/12 bg-slate-200" />
          <h2 className="text-xl font-bold tracking-tight dark:text-[#F8FAFC] text-slate-900 flex items-center gap-2 font-heading">
            <Users className="size-5 stroke-[1.5] dark:text-[#38BDF8] text-sky-600" />
            DETAIL JARING: <span className="font-mono tracking-wide">{jaring.aliasName}</span>
          </h2>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex border-b dark:border-blue-400/12 border-slate-200 font-mono text-[11px] overflow-x-auto whitespace-nowrap scrollbar-none gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("information")}
          className={`px-4 py-2 border-b-2 transition-all duration-150 font-semibold cursor-pointer text-xs ${
            activeTab === "information"
              ? "dark:border-[#38BDF8] border-sky-600 dark:text-[#38BDF8] text-sky-600 dark:bg-blue-400/5 bg-sky-50"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          PROFIL
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("reports")}
          className={`px-4 py-2 border-b-2 transition-all duration-150 font-semibold cursor-pointer text-xs ${
            activeTab === "reports"
              ? "dark:border-[#38BDF8] border-sky-600 dark:text-[#38BDF8] text-sky-600 dark:bg-blue-400/5 bg-sky-50"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          LAPORAN JARING
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("coaching")}
          className={`px-4 py-2 border-b-2 transition-all duration-150 font-semibold cursor-pointer text-xs ${
            activeTab === "coaching"
              ? "dark:border-[#38BDF8] border-sky-600 dark:text-[#38BDF8] text-sky-600 dark:bg-blue-400/5 bg-sky-50"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          HISTORY PEMBINAAN
        </button>
      </div>

      {/* Tab Contents */}
      <div className="max-w-3xl mx-auto pt-2 space-y-6">
        {activeTab === "information" && (
          <div className="space-y-6">
            <Card className="border dark:border-blue-400/12 border-slate-200 dark:bg-[#111827] bg-white rounded-[10px] shadow-sm border-t-2 dark:border-t-[#38BDF8]/40 border-t-sky-500/40 hover:-translate-y-[2px] dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:shadow-md transition-all duration-150 ease-out overflow-hidden">
              <CardHeader className="pb-3 pt-4 px-5">
                <div className="flex items-center gap-3 w-full pb-2.5 border-b dark:border-blue-400/12 border-slate-200">
                  <Network className="size-4.5 stroke-[1.5] dark:text-[#38BDF8] text-sky-600 shrink-0" />
                  <h3 className="text-[14px] font-bold dark:text-[#F8FAFC] text-slate-800 uppercase tracking-[0.08em] shrink-0">
                    Profil & Data Pribadi
                  </h3>
                  <div className="h-[1px] flex-1 bg-gradient-to-r dark:from-blue-400/12 dark:to-transparent from-slate-200 to-transparent" />
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-4 pt-1 divide-y dark:divide-blue-400/8 divide-slate-100">
                <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                  <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">Foto</span>
                  <div className="flex items-center gap-3">
                    <div className="flex size-20 items-center justify-center overflow-hidden rounded-lg border dark:border-blue-400/12 border-slate-200 bg-slate-100 dark:bg-slate-900/50">
                      {jaring.profilePhotoUrl ? (
                        <button
                          type="button"
                          onClick={() => setPhotoPreviewOpen(true)}
                          className="group relative size-full cursor-zoom-in overflow-hidden"
                          aria-label={`Buka popup foto ${jaring.aliasName}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={jaring.profilePhotoUrl}
                            alt={`Foto ${jaring.aliasName}`}
                            className="size-full object-cover transition-transform duration-150 group-hover:scale-105"
                          />
                          <span className="absolute inset-0 grid place-items-center bg-black/0 text-[10px] font-semibold uppercase tracking-[0.14em] text-white opacity-0 transition-all duration-150 group-hover:bg-black/35 group-hover:opacity-100">
                            Lihat
                          </span>
                        </button>
                      ) : (
                        <UserRound className="size-8 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {jaring.profilePhotoUrl ? "Foto profil Jaring tersimpan." : "Belum ada foto profil."}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                  <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">
                    Nama Sandi / Alias
                  </span>
                  <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px] break-words">
                    {jaring.aliasName}
                  </span>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                  <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">
                    Nama Lengkap
                  </span>
                  <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px]">
                    {jaring.fullName || "-"}
                  </span>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                  <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">
                    NIK / KTP
                  </span>
                  <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px] font-mono">
                    {jaring.nationalIdNumber || "-"}
                  </span>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                  <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">
                    Gaswil
                  </span>
                  <span className="dark:text-emerald-400 text-emerald-700 font-semibold text-[15px]">
                    {gaswilName}
                  </span>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                  <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">
                    WhatsApp
                  </span>
                  {jaring.whatsappNumber ? (
                    <a
                      href={`https://wa.me/${jaring.whatsappNumber.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dark:text-[#38BDF8] text-sky-600 font-semibold text-[15px] font-mono hover:underline inline-flex items-center gap-1.5"
                    >
                      {jaring.whatsappNumber}
                    </a>
                  ) : (
                    <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px] font-mono">-</span>
                  )}
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                  <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">
                    PIN Registrasi
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold tracking-[0.15em] text-[15px] dark:text-[#F8FAFC] text-slate-900 bg-slate-100 dark:bg-slate-900/50 px-2 py-0.5 rounded border dark:border-blue-400/8 border-slate-200">
                      {visiblePin ? jaring.code : "••••••"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setVisiblePin(!visiblePin)}
                      className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                    >
                      {visiblePin ? <EyeOff className="size-4 stroke-[1.5]" /> : <Eye className="size-4 stroke-[1.5]" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                  <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">
                    Jenis Kelamin
                  </span>
                  <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px]">
                    {jaring.gender === "MALE" ? "Laki-laki" : jaring.gender === "FEMALE" ? "Perempuan" : "-"}
                  </span>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                  <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">
                    Tempat Lahir
                  </span>
                  <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px]">
                    {jaring.birthPlace || "-"}
                  </span>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                  <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">
                    Tanggal Lahir
                  </span>
                  <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px]">
                    {formatDateOnly(jaring.birthDate)}
                  </span>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-start">
                  <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">Alamat</span>
                  <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px] whitespace-pre-wrap">
                    {jaring.address || "-"}
                  </span>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                  <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">
                    Kelurahan/Desa
                  </span>
                  <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px]">{villageNames}</span>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                  <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">
                    Kecamatan
                  </span>
                  <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px]">{districtNames}</span>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                  <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">Kinerja</span>
                  <span
                    className={`w-fit border rounded-[4px] px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${statusTone(operationalStatusLabel(jaring))}`}
                  >
                    {operationalStatusLabel(jaring)}
                  </span>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                  <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">
                    Status Verifikasi
                  </span>
                  <span
                    className={`w-fit border rounded-[4px] px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${registrationStatusTone(jaring.registrationStatus)}`}
                  >
                    {registrationStatusLabel(jaring.registrationStatus)}
                  </span>
                </div>

                {jaring.registrationStatus === "REJECTED" && jaring.rejectionReason ? (
                  <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-start">
                    <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">
                      Alasan Penolakan
                    </span>
                    <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-sm dark:border-red-500/20 dark:bg-red-950/30 dark:text-red-300">
                      {jaring.rejectionReason}
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border dark:border-blue-400/12 border-slate-200 dark:bg-[#111827] bg-white rounded-[10px] shadow-sm border-t-2 dark:border-t-[#38BDF8]/40 border-t-sky-500/40 hover:-translate-y-[2px] dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:shadow-md transition-all duration-150 ease-out overflow-hidden">
              <CardHeader className="pb-3 pt-4 px-5">
                <div className="flex items-center gap-3 w-full pb-2.5 border-b dark:border-blue-400/12 border-slate-200">
                  <BriefcaseBusiness className="size-4.5 stroke-[1.5] dark:text-[#38BDF8] text-sky-600 shrink-0" />
                  <h3 className="text-[14px] font-bold dark:text-[#F8FAFC] text-slate-800 uppercase tracking-[0.08em] shrink-0">
                    Pekerjaan & Karir
                  </h3>
                  <div className="h-[1px] flex-1 bg-gradient-to-r dark:from-blue-400/12 dark:to-transparent from-slate-200 to-transparent" />
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-4 pt-1 divide-y dark:divide-blue-400/8 divide-slate-100">
                <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                  <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">
                    Pekerjaan
                  </span>
                  <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px]">
                    {jaring.occupationName || "-"}
                  </span>
                </div>
                <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                  <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">
                    Tempat Kerja
                  </span>
                  <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px]">
                    {jaring.workplace || "-"}
                  </span>
                </div>
                <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                  <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">
                    Jabatan
                  </span>
                  <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px]">
                    {jaring.jobTitle || "-"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border dark:border-blue-400/12 border-slate-200 dark:bg-[#111827] bg-white rounded-[10px] shadow-sm border-t-2 dark:border-t-[#38BDF8]/40 border-t-sky-500/40 hover:-translate-y-[2px] dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:shadow-md transition-all duration-150 ease-out overflow-hidden">
              <CardHeader className="pb-3 pt-4 px-5">
                <div className="flex items-center gap-3 w-full pb-2.5 border-b dark:border-blue-400/12 border-slate-200">
                  <ShieldCheck className="size-4.5 stroke-[1.5] dark:text-[#38BDF8] text-sky-600 shrink-0" />
                  <h3 className="text-[14px] font-bold dark:text-[#F8FAFC] text-slate-800 uppercase tracking-[0.08em] shrink-0">
                    Afiliasi & Catatan
                  </h3>
                  <div className="h-[1px] flex-1 bg-gradient-to-r dark:from-blue-400/12 dark:to-transparent from-slate-200 to-transparent" />
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-4 pt-1 divide-y dark:divide-blue-400/8 divide-slate-100">
                <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                  <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">
                    Organisasi
                  </span>
                  <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px]">
                    {jaring.organizationName || "-"}
                  </span>
                </div>
                <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                  <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">
                    Afiliasi Politik
                  </span>
                  <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px]">
                    {jaring.politicalAffiliation || "-"}
                  </span>
                </div>
                <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                  <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">
                    Tanggal Bergabung
                  </span>
                  <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px]">
                    {formatDateOnly(jaring.joinedAt)}
                  </span>
                </div>
                <div className="flex flex-col pt-3.5 pb-2">
                  <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide mb-2">
                    Kebermanfaatan
                  </span>
                  <p className="p-3 border border-border rounded bg-slate-50 dark:bg-slate-950/40 text-xs leading-relaxed max-h-[120px] overflow-y-auto whitespace-pre-wrap dark:text-slate-300 text-slate-700 dark:border-blue-400/8">
                    {jaring.notes || (
                      <span className="italic dark:text-slate-500 text-slate-400">Belum ada kebermanfaatan</span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "reports" && (
          <div className="space-y-4">
            {/* Header Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b dark:border-blue-400/12 border-slate-200 pb-3">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <FileText className="size-4 text-sky-600 dark:text-[#38BDF8]" />
                Daftar Laporan Jaring ({reports.length})
              </h3>

              <div className="flex items-center gap-3">
                {/* Row limit select */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                  <span>Tampilkan:</span>
                  <select
                    value={reportsLimit}
                    onChange={(e) => {
                      setReportsLimit(Number(e.target.value));
                      setReportsPage(1);
                    }}
                    className="h-7 rounded border border-slate-200 bg-white dark:bg-slate-900 px-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-blue-400/12 cursor-pointer"
                  >
                    <option value={5}>5 baris</option>
                    <option value={10}>10 baris</option>
                    <option value={20}>20 baris</option>
                    <option value={50}>50 baris</option>
                  </select>
                </div>

                {/* View mode toggle */}
                <div className="flex items-center rounded-md border border-slate-200 bg-slate-100/80 p-0.5 dark:border-blue-400/12 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => setReportsViewMode("card")}
                    title="Tampilan Kartu"
                    className={cn(
                      "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                      reportsViewMode === "card"
                        ? "bg-white text-sky-600 shadow-sm dark:bg-[#111827] dark:text-[#38BDF8]"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <LayoutGrid className="size-3.5" />
                    <span>Kartu</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportsViewMode("table")}
                    title="Tampilan Tabel"
                    className={cn(
                      "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                      reportsViewMode === "table"
                        ? "bg-white text-sky-600 shadow-sm dark:bg-[#111827] dark:text-[#38BDF8]"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <TableIcon className="size-3.5" />
                    <span>Tabel</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            {reportsLoading ? (
              <div className="flex py-12 justify-center items-center gap-2 text-xs text-muted-foreground font-mono">
                <RefreshCw className="size-4 animate-spin text-sky-600 dark:text-[#38BDF8]" />
                Memuat laporan jaring...
              </div>
            ) : reports.length > 0 ? (
              <div className="space-y-4">
                {reportsViewMode === "card" ? (
                  <div className="space-y-3">
                    {paginatedReports.map((rep) => (
                      <JaringReportCardItem
                        key={rep.id}
                        rep={rep}
                        jaringId={jaringId}
                        isExpanded={expandedReportIds.has(rep.id)}
                        onToggleExpand={() => toggleReportExpand(rep.id)}
                        detailHref={`/dashboard/field-officer/laporan-jaring/${rep.id}`}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-white dark:border-blue-400/12 dark:bg-[#111827] overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-900/60">
                        <TableRow className="border-b border-slate-200 dark:border-blue-400/12">
                          <TableHead className="text-center font-bold text-xs uppercase tracking-wider w-[50px]">No</TableHead>
                          <TableHead className="text-center font-bold text-xs uppercase tracking-wider w-[160px]">No. Referensi</TableHead>
                          <TableHead className="text-center font-bold text-xs uppercase tracking-wider">Judul & Isi Laporan</TableHead>
                          <TableHead className="text-center font-bold text-xs uppercase tracking-wider w-[140px]">Status</TableHead>
                          <TableHead className="text-center font-bold text-xs uppercase tracking-wider w-[160px]">Waktu Dikirim</TableHead>
                          <TableHead className="text-center font-bold text-xs uppercase tracking-wider w-[100px]">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-slate-100 dark:divide-blue-400/8">
                        {paginatedReports.map((rep, idx) => {
                          const refNum = rep.referenceNumber || rep.submittedMessage?.referenceNumber || rep.id.slice(0, 8);
                          const title = rep.title || rep.submittedMessage?.title || "Laporan Jaring";
                          const content = rep.content || rep.submittedMessage?.content || "";
                          const status = rep.status || rep.currentState || "SUBMITTED";

                          return (
                            <TableRow key={rep.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                              <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                {reportsStartIndex + idx}
                              </TableCell>
                              <TableCell className="text-center font-mono text-xs font-bold text-sky-600 dark:text-[#38BDF8]">
                                {refNum}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="font-semibold text-xs text-foreground">{title}</div>
                                {content && <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{content}</div>}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="text-[10px] font-mono mx-auto">
                                  {status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                                {formatDateTime(rep.submittedAt || rep.incidentAt || rep.createdAt)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  asChild
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2.5 text-xs font-medium border-sky-500/30 text-sky-600 hover:bg-sky-500/10 dark:text-[#38BDF8]"
                                >
                                  <Link href={`/dashboard/field-officer/laporan-jaring/${rep.id}`}>
                                    <Eye className="size-3.5 mr-1" />
                                    Detail
                                  </Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Pagination Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 text-xs text-muted-foreground border-t border-slate-200 dark:border-blue-400/12">
                  <div>
                    Menampilkan <span className="font-medium text-foreground">{reportsStartIndex}</span> - <span className="font-medium text-foreground">{reportsEndIndex}</span> dari <span className="font-medium text-foreground">{reports.length}</span> laporan
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={reportsPage <= 1}
                      onClick={() => setReportsPage((p) => Math.max(1, p - 1))}
                      className="h-8 gap-1 rounded-md text-xs font-medium"
                    >
                      <ChevronLeft className="size-3.5" />
                      Sebelumnya
                    </Button>

                    <span className="font-mono text-xs px-2">
                      Halaman <strong className="text-foreground">{reportsPage}</strong> dari <strong className="text-foreground">{reportsTotalPages}</strong>
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={reportsPage >= reportsTotalPages}
                      onClick={() => setReportsPage((p) => Math.min(reportsTotalPages, p + 1))}
                      className="h-8 gap-1 rounded-md text-xs font-medium"
                    >
                      Selanjutnya
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 dark:border-blue-400/12 p-8 text-center space-y-2">
                <FileText className="size-8 text-muted-foreground mx-auto" />
                <div className="font-semibold text-sm text-foreground">Belum Ada Laporan</div>
                <p className="text-xs text-muted-foreground">Jaring ini belum membuat laporan di sistem.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "coaching" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-primary" />
                  Histori Laporan Pembinaan ({coachingReports.length})
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Daftar laporan pengarahan dan bimbingan yang telah dicatat untuk Jaring ini.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void loadCoachingReports()}
                  disabled={coachingLoading}
                  className="h-8 text-xs gap-1"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", coachingLoading && "animate-spin")} />
                  Refresh
                </Button>
                {jaring.registrationStatus === "APPROVED" && (
                  <Link href={`/dashboard/field-officer/laporan-pembinaan/baru?jaringId=${jaringId}`}>
                    <Button size="sm" className="h-8 text-xs gap-1">
                      <Plus className="h-3.5 w-3.5" />
                      Buat Laporan Pembinaan
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {coachingLoading ? (
              <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-card/50">
                <RefreshCw className="h-6 w-6 text-primary animate-spin mb-2" />
                <p className="text-xs text-muted-foreground">Memuat data laporan pembinaan...</p>
              </div>
            ) : coachingReports.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {coachingReports.map((report: any) => (
                  <Card key={report.id} className="border border-border/70 shadow-xs flex flex-col justify-between">
                    <CardHeader className="p-3.5 pb-2 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDateTime(report.reportedAt)}
                        </span>
                        <span className="truncate max-w-[140px]">
                          FO: {report.fieldOfficer?.userProfile?.fullName || "Field Officer"}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">{report.title}</h4>
                    </CardHeader>
                    <CardContent className="p-3.5 pt-0 space-y-2.5">
                      <p className="text-xs text-muted-foreground line-clamp-3 bg-muted/30 p-2.5 rounded border border-border/40 leading-relaxed">
                        {report.content}
                      </p>
                      <div className="flex justify-end pt-1">
                        <Link href={`/dashboard/field-officer/laporan-pembinaan/${jaringId}/${report.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary gap-1">
                            Lihat Detail &rarr;
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 dark:border-blue-400/12 p-8 text-center space-y-3">
                <ScrollText className="size-8 text-muted-foreground/50 mx-auto" />
                <div>
                  <div className="font-semibold text-sm text-foreground">Belum Ada Laporan Pembinaan</div>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                    Jaring ini belum memiliki catatan laporan pembinaan. Tekan tombol di bawah untuk membuat laporan baru.
                  </p>
                </div>
                {jaring.registrationStatus === "APPROVED" ? (
                  <Link href={`/dashboard/field-officer/laporan-pembinaan/baru?jaringId=${jaringId}`}>
                    <Button size="sm" className="h-8 text-xs gap-1">
                      <Plus className="h-3.5 w-3.5" />
                      Buat Laporan Pembinaan Sekarang
                    </Button>
                  </Link>
                ) : (
                  <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 p-2 rounded border border-amber-200 dark:border-amber-800/40 inline-block">
                    Jaring harus berstatus terverifikasi (disetujui) untuk dapat menerima laporan pembinaan.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>



      {jaring.profilePhotoUrl ? (
        <Dialog open={photoPreviewOpen} onOpenChange={setPhotoPreviewOpen}>
          <DialogContent className="grid h-[88vh] w-[94vw] max-w-[94vw] grid-rows-[auto_1fr] overflow-hidden bg-[#080b11] p-3 text-white sm:max-w-[920px]">
            <DialogHeader className="pr-10">
              <DialogTitle>Foto Profil Jaring</DialogTitle>
              <DialogDescription className="text-white/60">
                {jaring.aliasName} {jaring.fullName ? `- ${jaring.fullName}` : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="grid min-h-0 place-items-center overflow-auto rounded-md border border-white/10 bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={jaring.profilePhotoUrl}
                alt={`Foto profil Jaring ${jaring.aliasName}`}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
