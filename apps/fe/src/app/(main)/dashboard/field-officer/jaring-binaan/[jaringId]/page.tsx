"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Eye,
  EyeOff,
  Network,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { FieldOfficerJaring, FieldOfficerWorkspace } from "@/server/field-ops/types";

function formatDateOnly(value?: string | null) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  }).format(new Date(value));
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
  if (status === "PENDING") return "MENUNGGU VERIFIKASI";
  if (status === "REJECTED") return "DITOLAK / REVISI";
  return "DISETUJUI";
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
  const [activeTab, setActiveTab] = React.useState<"operational" | "personal" | "career" | "affiliation">("operational");

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
          onClick={() => setActiveTab("operational")}
          className={`px-4 py-2 border-b-2 transition-all duration-150 font-semibold cursor-pointer text-xs ${
            activeTab === "operational"
              ? "dark:border-[#38BDF8] border-sky-600 dark:text-[#38BDF8] text-sky-600 dark:bg-blue-400/5 bg-sky-50"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          PROFIL OPERASIONAL
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("personal")}
          className={`px-4 py-2 border-b-2 transition-all duration-150 font-semibold cursor-pointer text-xs ${
            activeTab === "personal"
              ? "dark:border-[#38BDF8] border-sky-600 dark:text-[#38BDF8] text-sky-600 dark:bg-blue-400/5 bg-sky-50"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          DATA PRIBADI
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("career")}
          className={`px-4 py-2 border-b-2 transition-all duration-150 font-semibold cursor-pointer text-xs ${
            activeTab === "career"
              ? "dark:border-[#38BDF8] border-sky-600 dark:text-[#38BDF8] text-sky-600 dark:bg-blue-400/5 bg-sky-50"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          PEKERJAAN & KARIR
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("affiliation")}
          className={`px-4 py-2 border-b-2 transition-all duration-150 font-semibold cursor-pointer text-xs ${
            activeTab === "affiliation"
              ? "dark:border-[#38BDF8] border-sky-600 dark:text-[#38BDF8] text-sky-600 dark:bg-blue-400/5 bg-sky-50"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          AFILIASI & CATATAN
        </button>
      </div>

      {/* Tab Contents */}
      <div className="max-w-3xl mx-auto pt-2">
        {activeTab === "operational" && (
          <Card className="border dark:border-blue-400/12 border-slate-200 dark:bg-[#111827] bg-white rounded-[10px] shadow-sm border-t-2 dark:border-t-[#38BDF8]/40 border-t-sky-500/40 hover:-translate-y-[2px] dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:shadow-md transition-all duration-150 ease-out overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-5">
              <div className="flex items-center gap-3 w-full pb-2.5 border-b dark:border-blue-400/12 border-slate-200">
                <Network className="size-4.5 stroke-[1.5] dark:text-[#38BDF8] text-sky-600 shrink-0" />
                <h3 className="text-[14px] font-bold dark:text-[#F8FAFC] text-slate-800 uppercase tracking-[0.08em] shrink-0">
                  Profil Operasional
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
                <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">Nama Sandi / Alias</span>
                <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px] break-words">{jaring.aliasName}</span>
              </div>
              <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">PIN Registrasi</span>
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
                <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">WhatsApp</span>
                <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px] font-mono">{jaring.whatsappNumber}</span>
              </div>
              <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">Kluster</span>
                <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px]">{jaring.clusterName || "-"}</span>
              </div>
              <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">Kelurahan/Desa Cakupan</span>
                <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px]">{jaring.areaNames?.join(", ") || "-"}</span>
              </div>
              <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">Status</span>
                <span className={`w-fit border rounded-[4px] px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${statusTone(operationalStatusLabel(jaring))}`}>
                  {operationalStatusLabel(jaring)}
                </span>
              </div>
              <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">Status Verifikasi</span>
                <span className={`w-fit border rounded-[4px] px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${registrationStatusTone(jaring.registrationStatus)}`}>
                  {registrationStatusLabel(jaring.registrationStatus)}
                </span>
              </div>
              {jaring.registrationStatus === "REJECTED" && jaring.rejectionReason ? (
                <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-start">
                  <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">Alasan Penolakan</span>
                  <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-sm dark:border-red-500/20 dark:bg-red-950/30 dark:text-red-300">
                    {jaring.rejectionReason}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}

        {activeTab === "personal" && (
          <Card className="border dark:border-blue-400/12 border-slate-200 dark:bg-[#111827] bg-white rounded-[10px] shadow-sm border-t-2 dark:border-t-[#38BDF8]/40 border-t-sky-500/40 hover:-translate-y-[2px] dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:shadow-md transition-all duration-150 ease-out overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-5">
              <div className="flex items-center gap-3 w-full pb-2.5 border-b dark:border-blue-400/12 border-slate-200">
                <UserRound className="size-4.5 stroke-[1.5] dark:text-[#38BDF8] text-sky-600 shrink-0" />
                <h3 className="text-[14px] font-bold dark:text-[#F8FAFC] text-slate-800 uppercase tracking-[0.08em] shrink-0">
                  Data Pribadi
                </h3>
                <div className="h-[1px] flex-1 bg-gradient-to-r dark:from-blue-400/12 dark:to-transparent from-slate-200 to-transparent" />
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4 pt-1 divide-y dark:divide-blue-400/8 divide-slate-100">
              <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">Nama Lengkap</span>
                <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px]">{jaring.fullName || "-"}</span>
              </div>
              <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">NIK / KTP</span>
                <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px] font-mono">{jaring.nationalIdNumber || "-"}</span>
              </div>
              <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">Tempat Lahir</span>
                <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px]">{jaring.birthPlace || "-"}</span>
              </div>
              <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">Tanggal Lahir</span>
                <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px]">{formatDateOnly(jaring.birthDate)}</span>
              </div>
              <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">Jenis Kelamin</span>
                <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px]">{jaring.gender === "MALE" ? "Laki-laki" : jaring.gender === "FEMALE" ? "Perempuan" : "-"}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "career" && (
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
                <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">Pekerjaan</span>
                <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px]">{jaring.occupationName || "-"}</span>
              </div>
              <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">Tempat Kerja</span>
                <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px]">{jaring.workplace || "-"}</span>
              </div>
              <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">Jabatan</span>
                <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px]">{jaring.jobTitle || "-"}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "affiliation" && (
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
                <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">Organisasi</span>
                <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px]">{jaring.organizationName || "-"}</span>
              </div>
              <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">Afiliasi Politik</span>
                <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px]">{jaring.politicalAffiliation || "-"}</span>
              </div>
              <div className="grid grid-cols-[160px_1fr] gap-4 py-3.5 items-center">
                <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide">Tanggal Bergabung</span>
                <span className="dark:text-[#F8FAFC] text-slate-900 font-semibold text-[15px]">{formatDateOnly(jaring.joinedAt)}</span>
              </div>
              <div className="flex flex-col pt-3.5 pb-2">
                <span className="dark:text-[#94A3B8] text-slate-500 text-[13px] font-medium tracking-wide mb-2">Kebermanfaatan</span>
                <p className="p-3 border border-border rounded bg-slate-50 dark:bg-slate-950/40 text-xs leading-relaxed max-h-[120px] overflow-y-auto whitespace-pre-wrap dark:text-slate-300 text-slate-700 dark:border-blue-400/8">
                  {jaring.notes || (
                    <span className="italic dark:text-slate-500 text-slate-400">Belum ada kebermanfaatan</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
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
