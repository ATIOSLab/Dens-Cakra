"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  Check,
  Download,
  Info,
  MapPin,
  Printer,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  computeReportPresetDates,
  REPORT_DKI_REGENCY_OPTIONS,
  REPORT_PERIOD_PRESETS,
} from "../_components/report-filter-constants";

export function ReportActionBar({
  periodLabel,
  start,
  end,
  period,
  provinceCode,
  isValid,
}: {
  periodLabel: string;
  start: string;
  end: string;
  period?: string;
  provinceCode?: string;
  isValid: boolean;
}) {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Filter state
  const [selectedPreset, setSelectedPreset] = useState<string>(period ?? "CURRENT_MONTH");
  const [currentStart, setCurrentStart] = useState<string>(start);
  const [currentEnd, setCurrentEnd] = useState<string>(end);
  const [selectedRegency, setSelectedRegency] = useState<string>(
    provinceCode && provinceCode !== "31" ? provinceCode : "ALL",
  );
  const [isApplying, setIsApplying] = useState(false);
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(true);

  const handlePrint = () => {
    window.print();
  };

  const handlePresetChange = (presetValue: string) => {
    setSelectedPreset(presetValue);
    if (presetValue !== "CUSTOM") {
      const dates = computeReportPresetDates(presetValue);
      setCurrentStart(dates.start);
      setCurrentEnd(dates.end);
    }
  };

  const handleStartDateChange = (val: string) => {
    setCurrentStart(val);
    setSelectedPreset("CUSTOM");
  };

  const handleEndDateChange = (val: string) => {
    setCurrentEnd(val);
    setSelectedPreset("CUSTOM");
  };

  const handleApplyFilter = () => {
    setIsApplying(true);
    const effectiveProvinceCode = selectedRegency === "ALL" ? "31" : selectedRegency;
    const query = new URLSearchParams({
      start: currentStart,
      end: currentEnd,
      period: selectedPreset,
      provinceCode: effectiveProvinceCode,
    });
    router.push(`/reports/jaring/print?${query.toString()}`);
    setTimeout(() => {
      setIsApplying(false);
    }, 600);
  };

  const handleResetFilter = () => {
    const dates = computeReportPresetDates("CURRENT_MONTH");
    setSelectedPreset("CURRENT_MONTH");
    setCurrentStart(dates.start);
    setCurrentEnd(dates.end);
    setSelectedRegency("ALL");
    const query = new URLSearchParams({
      start: dates.start,
      end: dates.end,
      period: "CURRENT_MONTH",
      provinceCode: "31",
    });
    router.push(`/reports/jaring/print?${query.toString()}`);
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    setNotice(null);
    try {
      const effectiveProvinceCode = selectedRegency === "ALL" ? "31" : selectedRegency;
      const pdfUrl = `/api/reports/jaring/pdf?start=${encodeURIComponent(currentStart)}&end=${encodeURIComponent(currentEnd)}&period=${encodeURIComponent(selectedPreset)}&provinceCode=${encodeURIComponent(effectiveProvinceCode)}&_t=${Date.now()}`;
      const response = await fetch(pdfUrl);

      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/pdf")) {
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = `Laporan Rekap Aktivitas Produktivitas Jaring (${currentStart} s.d ${currentEnd}).pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
          return;
        }
      }

      setNotice(
        "Tidak dapat mengunduh PDF dari server saat ini. Dialog cetak browser dibuka otomatis: Silakan pilih tujuan 'Simpan sebagai PDF' (Save as PDF) untuk mengunduh laporan 13 halaman.",
      );
      setTimeout(() => {
        window.print();
      }, 400);
    } catch (error) {
      console.warn("Server PDF rendering unavailable, using native browser print:", error);
      setNotice(
        "Mengalihkan ke dialog cetak browser langsung: Silakan pilih tujuan 'Simpan sebagai PDF' (Save as PDF).",
      );
      setTimeout(() => {
        window.print();
      }, 400);
    } finally {
      setDownloading(false);
    }
  };

  const isFilterDirty = currentStart !== start || currentEnd !== end || selectedPreset !== (period ?? "CURRENT_MONTH");

  return (
    <header className="no-print sticky top-0 z-50 flex w-full flex-col shadow-md">
      {/* Baris Utama Navigasi & Aksi Cetak */}
      <nav className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-[#2AA8C3]/30 bg-[#174D6B] px-5 py-2.5 text-white">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/admin-system">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1.5 text-white hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="size-4" />
              <span>Admin Sistem</span>
            </Button>
          </Link>
          <div className="h-5 w-px bg-white/20" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-wide">Laporan Rekap Jaring (13 Halaman A4)</h1>
              {isValid ? (
                <span className="inline-flex items-center gap-1 rounded border border-[#3A9D69]/40 bg-[#3A9D69]/20 px-2 py-0.5 text-[11px] font-semibold text-[#6ee7b7]">
                  <ShieldCheck className="size-3" />
                  Valid
                </span>
              ) : null}
            </div>
            <p className="text-xs text-white/70">
              Periode Aktif: <span className="font-semibold text-white">{periodLabel}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Toggle Bilah Filter */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFilterBarOpen((prev) => !prev)}
            className="flex cursor-pointer items-center gap-1.5 border-white/30 bg-white/10 text-xs font-semibold text-white hover:bg-white/20"
          >
            <SlidersHorizontal className="size-3.5" />
            <span>Filter</span>
            {isFilterDirty ? <Badge className="size-2 rounded-full bg-amber-400 p-0" /> : null}
          </Button>

          {/* Tombol Cetak Browser */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            className="flex cursor-pointer items-center gap-1.5 bg-white text-xs font-semibold text-[#174D6B] shadow-sm hover:bg-white/90"
            title="Buka dialog cetak browser dan pilih 'Simpan sebagai PDF'"
          >
            <Printer className="size-3.5" />
            <span>Cetak / Simpan PDF</span>
          </Button>

          {/* Tombol Unduh PDF Langsung */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex cursor-pointer items-center gap-1.5 border-emerald-400/40 bg-emerald-600 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
            title="Unduh langsung dari server atau dialihkan ke cetak PDF"
          >
            {downloading ? <RefreshCw className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            <span>{downloading ? "Menyiapkan PDF..." : "Unduh PDF"}</span>
          </Button>
        </div>
      </nav>

      {/* Baris Toolbar Filter Lengkap */}
      {isFilterBarOpen ? (
        <div className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-[#2AA8C3]/20 bg-[#12384e] px-5 py-2.5 text-xs text-white">
          <div className="flex flex-wrap items-center gap-3">
            {/* Pilihan Preset Periode */}
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 font-medium text-white/80">
                <CalendarDays className="size-3.5 text-[#2AA8C3]" />
                <span>Periode:</span>
              </span>
              <select
                value={selectedPreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="h-8 rounded border border-white/25 bg-[#0e2c3d] px-2.5 text-xs font-medium text-white shadow-inner focus:border-[#2AA8C3] focus:outline-none"
              >
                {REPORT_PERIOD_PRESETS.map((p) => (
                  <option key={p.value} value={p.value} className="bg-slate-800 text-white">
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tanggal Mulai */}
            <div className="flex items-center gap-1.5">
              <span className="text-white/80">Mulai:</span>
              <Input
                type="date"
                value={currentStart}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="h-8 w-36 rounded border-white/25 bg-[#0e2c3d] font-mono text-xs text-white focus:border-[#2AA8C3]"
              />
            </div>

            {/* Tanggal Selesai */}
            <div className="flex items-center gap-1.5">
              <span className="text-white/80">Selesai:</span>
              <Input
                type="date"
                value={currentEnd}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="h-8 w-36 rounded border-white/25 bg-[#0e2c3d] font-mono text-xs text-white focus:border-[#2AA8C3]"
              />
            </div>

            {/* Cakupan Wilayah */}
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 font-medium text-white/80">
                <MapPin className="size-3.5 text-rose-400" />
                <span>Wilayah:</span>
              </span>
              <select
                value={selectedRegency}
                onChange={(e) => setSelectedRegency(e.target.value)}
                className="h-8 max-w-xs rounded border border-white/25 bg-[#0e2c3d] px-2.5 text-xs font-medium text-white shadow-inner focus:border-[#2AA8C3] focus:outline-none"
              >
                {REPORT_DKI_REGENCY_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value} className="bg-slate-800 text-white">
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tombol Terapkan & Reset */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleApplyFilter}
              disabled={isApplying}
              className="h-8 gap-1.5 bg-[#2AA8C3] text-xs font-semibold text-slate-950 hover:bg-[#2AA8C3]/90"
            >
              {isApplying ? <RefreshCw className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              <span>Terapkan Filter</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetFilter}
              className="h-8 gap-1 text-xs text-white/70 hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="size-3" />
              <span>Reset</span>
            </Button>
          </div>
        </div>
      ) : null}

      {/* Pemberitahuan Fallback Cetak */}
      {notice ? (
        <div className="flex items-center justify-between gap-3 border-b border-amber-400/40 bg-amber-500/25 px-5 py-2.5 text-xs text-amber-100 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Info className="size-4 shrink-0 text-amber-300" />
            <span>{notice}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-7 cursor-pointer border-amber-300/50 bg-amber-400/20 px-2.5 text-xs text-amber-100 hover:bg-amber-400/30 hover:text-white"
            >
              <Printer className="mr-1 size-3.5" />
              Buka Dialog Cetak
            </Button>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="rounded p-1 text-amber-200 transition-colors hover:bg-white/10 hover:text-white"
              title="Tutup pemberitahuan"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
