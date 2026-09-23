"use client";

import { useState } from "react";

import {
  CalendarDays,
  CheckCircle2,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Info,
  MapPin,
  Printer,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

import {
  computeReportPresetDates,
  formatReportDateIndo,
  REPORT_DKI_REGENCY_OPTIONS,
  REPORT_PERIOD_PRESETS,
} from "@/app/(print)/reports/jaring/_components/report-filter-constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";
import { DC_TYPOGRAPHY, DOMAIN_VISUALS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

export const PERIOD_PRESETS = REPORT_PERIOD_PRESETS;
export const DKI_REGENCY_OPTIONS = REPORT_DKI_REGENCY_OPTIONS;
export const computePresetDates = computeReportPresetDates;
const formatDateIndo = formatReportDateIndo;

function calculateDaysDifference(startStr: string, endStr: string): number {
  try {
    const s = new Date(startStr);
    const e = new Date(endStr);
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  } catch {
    return 1;
  }
}

/**
 * Filter Form Controls shared between the Card and the Dialog
 */
function RekapFilterFormContent({
  preset,
  setPreset,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  provinceCode,
  setProvinceCode,
  regencyCode,
  setRegencyCode,
  onReset,
}: {
  preset: string;
  setPreset: (val: string) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  provinceCode: string;
  setProvinceCode: (val: string) => void;
  regencyCode: string;
  setRegencyCode: (val: string) => void;
  onReset: () => void;
}) {
  const handlePresetSelect = (val: string) => {
    setPreset(val);
    if (val !== "CUSTOM") {
      const dates = computePresetDates(val);
      setStartDate(dates.start);
      setEndDate(dates.end);
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setPreset("CUSTOM");
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setPreset("CUSTOM");
  };

  const daysCount = calculateDaysDifference(startDate, endDate);
  const selectedRegency =
    DKI_REGENCY_OPTIONS.find((r) => r.value === regencyCode)?.label ?? "Seluruh Wilayah DKI Jakarta";

  return (
    <div className="space-y-4">
      {/* Grid Filter Kontrol */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Kontrol 1: Preset Periode */}
        <div className="grid gap-1.5 text-xs text-muted-foreground">
          <Label
            htmlFor="admin-filter-preset"
            className="flex items-center gap-1.5 font-medium text-foreground text-xs"
          >
            <CalendarDays className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Pilihan Periode</span>
          </Label>
          <NativeSelect
            id="admin-filter-preset"
            value={preset}
            onChange={(e) => handlePresetSelect(e.target.value)}
            className="h-9 w-full rounded-md border-border bg-background text-xs font-medium"
          >
            {PERIOD_PRESETS.map((p) => (
              <NativeSelectOption key={p.value} value={p.value}>
                {p.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        {/* Kontrol 2: Tanggal Mulai */}
        <div className="grid gap-1.5 text-xs text-muted-foreground">
          <Label htmlFor="admin-filter-start" className="flex items-center gap-1.5 font-medium text-foreground text-xs">
            <span>Tanggal Mulai</span>
          </Label>
          <Input
            id="admin-filter-start"
            type="date"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            className="h-9 font-mono text-xs"
          />
        </div>

        {/* Kontrol 3: Tanggal Selesai */}
        <div className="grid gap-1.5 text-xs text-muted-foreground">
          <Label htmlFor="admin-filter-end" className="flex items-center gap-1.5 font-medium text-foreground text-xs">
            <span>Tanggal Selesai</span>
          </Label>
          <Input
            id="admin-filter-end"
            type="date"
            value={endDate}
            onChange={(e) => handleEndDateChange(e.target.value)}
            className="h-9 font-mono text-xs"
          />
        </div>

        {/* Kontrol 4: Cakupan Wilayah (Kota/Kabupaten) */}
        <div className="grid gap-1.5 text-xs text-muted-foreground">
          <Label
            htmlFor="admin-filter-regency"
            className="flex items-center gap-1.5 font-medium text-foreground text-xs"
          >
            <MapPin className="size-3.5 text-rose-600 dark:text-rose-400" />
            <span>Cakupan Wilayah</span>
          </Label>
          <NativeSelect
            id="admin-filter-regency"
            value={regencyCode}
            onChange={(e) => setRegencyCode(e.target.value)}
            className="h-9 w-full rounded-md border-border bg-background text-xs font-medium"
          >
            {DKI_REGENCY_OPTIONS.map((r) => (
              <NativeSelectOption key={r.value} value={r.value}>
                {r.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      {/* Ringkasan Filter & Informasi Dokumen */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-border/70 bg-muted/30 px-3.5 py-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono text-[11px] gap-1"
          >
            <ShieldCheck className="size-3" />
            Periode: {formatDateIndo(startDate)} s.d. {formatDateIndo(endDate)} ({daysCount} Hari)
          </Badge>

          <Badge
            variant="outline"
            className="border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300 text-[11px] gap-1"
          >
            <MapPin className="size-3" />
            {regencyCode === "ALL" ? "Provinsi DKI Jakarta (6 Wilayah)" : selectedRegency}
          </Badge>

          <span className="text-[11px] text-muted-foreground">Format: Dokumen Resmi A4 • 13 Halaman Lengkap</span>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-7 gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="size-3" />
          Reset Filter
        </Button>
      </div>
    </div>
  );
}

/**
 * Superadmin Dashboard Filter Card: Placed directly in the Superadmin Dashboard
 */
export function AdminRekapJaringFilterCard() {
  const defaultDates = computePresetDates("CURRENT_MONTH");
  const [preset, setPreset] = useState("CURRENT_MONTH");
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  const [provinceCode, setProvinceCode] = useState("31");
  const [regencyCode, setRegencyCode] = useState("ALL");
  const [isDownloading, setIsDownloading] = useState(false);

  const handleReset = () => {
    const dates = computePresetDates("CURRENT_MONTH");
    setPreset("CURRENT_MONTH");
    setStartDate(dates.start);
    setEndDate(dates.end);
    setProvinceCode("31");
    setRegencyCode("ALL");
    toast.info("Filter rekap Jaring dikembalikan ke default Bulan Berjalan.");
  };

  const reportUrl = `/reports/jaring/print?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}&period=${encodeURIComponent(preset)}&provinceCode=${encodeURIComponent(provinceCode)}`;

  const handleOpenReport = () => {
    window.open(reportUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const pdfUrl = `/api/reports/jaring/pdf?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}&period=${encodeURIComponent(preset)}&_t=${Date.now()}`;
      const response = await fetch(pdfUrl);

      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/pdf")) {
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = `Laporan Rekap Aktivitas Produktivitas Jaring (${startDate} s.d ${endDate}).pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
          toast.success("Dokumen PDF Rekap Jaring berhasil diunduh.");
          return;
        }
      }

      toast.info("Mengalihkan ke dialog cetak browser (Simpan sebagai PDF)...");
      window.open(reportUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error("Gagal mengunduh PDF secara langsung. Membuka pratinjau cetak.");
      window.open(reportUrl, "_blank", "noopener,noreferrer");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className="border-[var(--dc-border-subtle)] bg-card shadow-[var(--dc-shadow-card)] overflow-hidden">
      <CardHeader className="border-b border-border/70 bg-muted/20 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Printer className="size-4" />
              </span>
              <CardTitle className="font-heading text-base font-semibold text-foreground">
                Filter & Ekspor Laporan Rekapitulasi Jaring
              </CardTitle>
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px]"
              >
                13 Halaman A4
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Konfigurasi rentang periode tanggal dan cakupan wilayah sebelum mencetak atau mengunduh dokumen resmi
              rekapitulasi data dan pembinaan Jaring.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="h-9 gap-1.5 border-border text-xs font-semibold"
            >
              {isDownloading ? <RefreshCw className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
              <span>{isDownloading ? "Menyiapkan PDF..." : "Unduh PDF"}</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleOpenReport}
              className="h-9 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-xs font-semibold"
            >
              <Printer className="size-3.5" />
              <span>Buka Laporan Rekap Jaring (Tab Baru)</span>
              <ExternalLink className="size-3.5 ml-0.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-4">
        <RekapFilterFormContent
          preset={preset}
          setPreset={setPreset}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          provinceCode={provinceCode}
          setProvinceCode={setProvinceCode}
          regencyCode={regencyCode}
          setRegencyCode={setRegencyCode}
          onReset={handleReset}
        />
      </CardContent>
    </Card>
  );
}

/**
 * Superadmin Header Modal Trigger: Opens the exact same filter as a Pop-up Dialog
 */
export function AdminRekapJaringModalTrigger() {
  const [open, setOpen] = useState(false);
  const defaultDates = computePresetDates("CURRENT_MONTH");
  const [preset, setPreset] = useState("CURRENT_MONTH");
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  const [provinceCode, setProvinceCode] = useState("31");
  const [regencyCode, setRegencyCode] = useState("ALL");
  const [isDownloading, setIsDownloading] = useState(false);

  const handleReset = () => {
    const dates = computePresetDates("CURRENT_MONTH");
    setPreset("CURRENT_MONTH");
    setStartDate(dates.start);
    setEndDate(dates.end);
    setProvinceCode("31");
    setRegencyCode("ALL");
  };

  const reportUrl = `/reports/jaring/print?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}&period=${encodeURIComponent(preset)}&provinceCode=${encodeURIComponent(provinceCode)}`;

  const handleOpenReport = () => {
    window.open(reportUrl, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const pdfUrl = `/api/reports/jaring/pdf?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}&period=${encodeURIComponent(preset)}&_t=${Date.now()}`;
      const response = await fetch(pdfUrl);

      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/pdf")) {
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = `Laporan Rekap Aktivitas Produktivitas Jaring (${startDate} s.d ${endDate}).pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
          toast.success("Dokumen PDF Rekap Jaring berhasil diunduh.");
          setOpen(false);
          return;
        }
      }

      toast.info("Mengalihkan ke dialog cetak browser (Simpan sebagai PDF)...");
      window.open(reportUrl, "_blank", "noopener,noreferrer");
      setOpen(false);
    } catch {
      toast.error("Gagal mengunduh PDF secara langsung. Membuka pratinjau cetak.");
      window.open(reportUrl, "_blank", "noopener,noreferrer");
      setOpen(false);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-600 hover:text-white dark:text-emerald-300 gap-1.5 font-semibold text-xs h-9"
        >
          <Printer className="size-4" />
          <span>Laporan Rekap Jaring</span>
          <SlidersHorizontal className="size-3.5 opacity-70" />
        </Button>
      </DialogTrigger>

      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border/70 bg-muted/20 p-5 pb-4">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Printer className="size-4" />
            </span>
            <DialogTitle className="font-heading text-lg font-bold text-foreground">
              Filter & Cetak Laporan Rekap Jaring
            </DialogTitle>
            <Badge
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px]"
            >
              13 Halaman A4
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Pilih periode tanggal dan cakupan wilayah yang akan dimuat ke dalam dokumen cetak resmi rekapitulasi data
            dan pembinaan Jaring.
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 space-y-4 overflow-y-auto">
          <RekapFilterFormContent
            preset={preset}
            setPreset={setPreset}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            provinceCode={provinceCode}
            setProvinceCode={setProvinceCode}
            regencyCode={regencyCode}
            setRegencyCode={setRegencyCode}
            onReset={handleReset}
          />
        </div>

        <DialogFooter className="flex flex-col-reverse items-center justify-between gap-2 border-t border-border/70 bg-muted/30 p-4 sm:flex-row sm:justify-between">
          <DialogClose asChild>
            <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs">
              Batal
            </Button>
          </DialogClose>

          <div className="flex w-full sm:w-auto items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="flex-1 sm:flex-initial h-8 gap-1.5 text-xs font-semibold"
            >
              {isDownloading ? <RefreshCw className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
              <span>{isDownloading ? "Menyiapkan..." : "Unduh PDF"}</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleOpenReport}
              className="flex-1 sm:flex-initial h-8 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-xs font-semibold"
            >
              <Printer className="size-3.5" />
              <span>Buka Laporan (Tab Baru)</span>
              <ExternalLink className="size-3.5" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
