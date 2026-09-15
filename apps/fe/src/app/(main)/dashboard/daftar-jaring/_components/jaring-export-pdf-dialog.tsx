"use client";

import { useState } from "react";

import { BookOpen, CheckCircle2, FileDown, Layers, Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DC_CONTROLS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

export type JaringExportPdfDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filteredCount: number;
  totalApprovedCount: number;
  currentFilters: {
    search?: string;
    statusFilter?: string;
    activeStatusFilter?: string;
    serverAreaId?: string;
    officerFilter?: string;
    areaSubtitle?: string;
  };
  filteredItemIds?: string[];
};

function getBrowserBackendUrl() {
  return (process.env.NEXT_PUBLIC_BROWSER_API_BASE_URL ?? "").replace(/\/$/, "");
}

export function JaringExportPdfDialog({
  open,
  onOpenChange,
  filteredCount,
  totalApprovedCount,
  currentFilters,
  filteredItemIds,
}: JaringExportPdfDialogProps) {
  const [title, setTitle] = useState("BUKU PROFILING DAN REKAPITULASI DATA JARING");
  const [exportScope, setExportScope] = useState<"filtered" | "approved">("filtered");
  const [includeCover, setIncludeCover] = useState(true);
  const [includeToc, setIncludeToc] = useState(true);
  const [includeRecap, setIncludeRecap] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  const selectedCount = exportScope === "filtered" ? filteredCount : totalApprovedCount;

  const handleDownloadPdf = async () => {
    if (selectedCount === 0) {
      toast.error("Tidak ada data Jaring yang dapat diekspor.");
      return;
    }

    setIsDownloading(true);
    try {
      const params = new URLSearchParams();
      if (title.trim()) {
        params.set("title", title.trim());
      }
      params.set("includeCover", String(includeCover));
      params.set("includeToc", String(includeToc));
      params.set("includeRecap", String(includeRecap));

      if (exportScope === "filtered") {
        if (currentFilters.search?.trim()) {
          params.set("search", currentFilters.search.trim());
        }
        if (currentFilters.activeStatusFilter && currentFilters.activeStatusFilter !== "ALL") {
          params.set("status", currentFilters.activeStatusFilter);
        }
        if (currentFilters.serverAreaId) {
          params.set("areaId", currentFilters.serverAreaId);
        }
        if (filteredItemIds && filteredItemIds.length > 0 && filteredItemIds.length <= 500) {
          params.set("jaringIds", filteredItemIds.join(","));
        }
      }
      // Syarat mutlak: Dokumen ini hanya mengekspor data Jaring yang berstatus Terverifikasi
      params.set("registrationStatus", "APPROVED");

      const backendUrl = getBrowserBackendUrl();
      const response = await fetch(`${backendUrl}/api/v1/jaring/export/pdf?${params.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        let errDetail = "Ekspor gagal diproses oleh server.";
        try {
          const json = await response.json();
          if (json.message) errDetail = json.message;
        } catch {
          // ignore
        }
        throw new Error(errDetail);
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const filenameMatch = disposition.match(/filename="?([^";]+)"?/);
      const filename = filenameMatch?.[1] ?? `buku-profiling-jaring-${new Date().toISOString().slice(0, 10)}.pdf`;

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);

      toast.success("Dokumen PDF profiling Jaring berhasil diunduh.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Terjadi kendala saat mengunduh berkas PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-[600px] gap-0 overflow-hidden border-slate-200/80 p-0 shadow-2xl dark:border-white/10">
        {/* Header with Dark Navy / Cyan Accent */}
        <div className="border-slate-800 border-b bg-slate-900 px-5 py-3 text-white">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30">
                <BookOpen className="size-3.5" />
              </div>
              <div>
                <DialogTitle className="font-semibold text-sm text-white tracking-tight">
                  Ekspor Dokumen PDF Profiling Jaring
                </DialogTitle>
                <DialogDescription className="text-[11px] text-slate-400">
                  Format buku dossier lanskap A4 dengan foto profil, rekapitulasi, dan daftar isi
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="border-sky-500/40 bg-sky-500/10 font-mono text-[10px] text-sky-400">
              Lanskap A4
            </Badge>
          </div>
        </div>

        <div className="space-y-3 px-5 py-3.5">
          {/* Judul Dokumen */}
          <div className="space-y-1">
            <Label htmlFor="pdf-title" className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
              <Settings2 className="size-3 text-primary" />
              Judul Dokumen di Halaman Utama
            </Label>
            <Input
              id="pdf-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masukkan judul berkas laporan..."
              className={cn(DC_CONTROLS.input, "h-8 font-medium text-xs")}
            />
          </div>

          {/* Cakupan Data */}
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
              <Layers className="size-3 text-primary" />
              Cakupan Data Jaring yang Diekspor
            </Label>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Option 1: Data Filter Saat Ini */}
              <button
                type="button"
                onClick={() => setExportScope("filtered")}
                className={cn(
                  "flex flex-col items-start rounded-lg border p-2.5 text-left transition-all",
                  exportScope === "filtered"
                    ? "border-sky-500 bg-sky-500/5 ring-1.5 ring-sky-500/40 dark:bg-sky-500/10"
                    : "border-border hover:bg-muted/50",
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="font-semibold text-foreground text-xs">Filter Aktif Saat Ini</span>
                  {exportScope === "filtered" && <CheckCircle2 className="size-3.5 text-sky-500" />}
                </div>
                <div className="mt-0.5 font-bold text-base text-sky-600 dark:text-sky-400">
                  {filteredCount} <span className="font-normal text-muted-foreground text-xs">Jaring</span>
                </div>
                <span className="line-clamp-1 text-[11px] text-muted-foreground">
                  {currentFilters.areaSubtitle ?? "Sesuai filter pencarian & wilayah"}
                </span>
              </button>

              {/* Option 2: Seluruh Data Terverifikasi */}
              <button
                type="button"
                onClick={() => setExportScope("approved")}
                className={cn(
                  "flex flex-col items-start rounded-lg border p-2.5 text-left transition-all",
                  exportScope === "approved"
                    ? "border-sky-500 bg-sky-500/5 ring-1.5 ring-sky-500/40 dark:bg-sky-500/10"
                    : "border-border hover:bg-muted/50",
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="font-semibold text-foreground text-xs">Seluruh Terverifikasi</span>
                  {exportScope === "approved" && <CheckCircle2 className="size-3.5 text-sky-500" />}
                </div>
                <div className="mt-0.5 font-bold text-base text-emerald-600 dark:text-emerald-400">
                  {totalApprovedCount} <span className="font-normal text-muted-foreground text-xs">Jaring</span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Status Terverifikasi (APPROVED)
                </span>
              </button>
            </div>
          </div>

          {/* Bagian Dokumen (Checkboxes in a clean 3-col grid) */}
          <div className="space-y-1.5 rounded-lg border border-border/80 bg-slate-50/50 p-2.5 dark:bg-slate-900/30">
            <Label className="font-semibold text-foreground text-xs">Bagian Dokumen yang Disertakan</Label>

            <div className="grid grid-cols-3 gap-2">
              <label
                htmlFor="include-cover"
                className="flex items-center gap-2 rounded-md border border-border/60 bg-background/80 px-2.5 py-1.5 cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <Checkbox
                  id="include-cover"
                  checked={includeCover}
                  onCheckedChange={(checked) => setIncludeCover(Boolean(checked))}
                />
                <span className="font-medium text-foreground text-xs">Halaman Cover</span>
              </label>

              <label
                htmlFor="include-toc"
                className="flex items-center gap-2 rounded-md border border-border/60 bg-background/80 px-2.5 py-1.5 cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <Checkbox
                  id="include-toc"
                  checked={includeToc}
                  onCheckedChange={(checked) => setIncludeToc(Boolean(checked))}
                />
                <span className="font-medium text-foreground text-xs">Daftar Isi</span>
              </label>

              <label
                htmlFor="include-recap"
                className="flex items-center gap-2 rounded-md border border-border/60 bg-background/80 px-2.5 py-1.5 cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <Checkbox
                  id="include-recap"
                  checked={includeRecap}
                  onCheckedChange={(checked) => setIncludeRecap(Boolean(checked))}
                />
                <span className="font-medium text-foreground text-xs">Rekapitulasi</span>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between border-border border-t bg-muted/40 px-5 py-2.5 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isDownloading}
            className="h-8 text-xs"
          >
            Batal
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={isDownloading || selectedCount === 0}
            className="h-8 gap-1.5 bg-sky-600 font-medium text-white text-xs hover:bg-sky-700"
          >
            {isDownloading ? (
              <>
                <Loader2 className="size-3 animate-spin" />
                <span>Menyiapkan PDF...</span>
              </>
            ) : (
              <>
                <FileDown className="size-3.5" />
                <span>Unduh Dokumen PDF ({selectedCount})</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
