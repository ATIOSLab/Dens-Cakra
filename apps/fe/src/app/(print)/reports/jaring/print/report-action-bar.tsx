"use client";

import { useState } from "react";

import Link from "next/link";

import { ArrowLeft, Download, Info, Printer, RefreshCw, ShieldCheck, X } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ReportActionBar({
  periodLabel,
  start,
  end,
  isValid,
}: {
  periodLabel: string;
  start: string;
  end: string;
  isValid: boolean;
}) {
  const [downloading, setDownloading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    setNotice(null);
    try {
      const pdfUrl = `/api/reports/jaring/pdf?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&_t=${Date.now()}`;
      const response = await fetch(pdfUrl);

      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/pdf")) {
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = `Laporan Rekap Aktivitas Produktivitas Jaring ${periodLabel}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
          return;
        }
      }

      // If response is not ok:
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

  return (
    <header className="no-print sticky top-0 z-50 flex w-full flex-col shadow-md">
      <nav className="flex w-full flex-wrap items-center justify-between gap-4 border-[#2AA8C3]/30 border-b bg-[#174D6B] px-6 py-3 text-white">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/admin-system">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1.5 text-white hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="size-4" />
              <span>Dashboard Admin Sistem</span>
            </Button>
          </Link>
          <div className="h-5 w-px bg-white/20" />
          <div>
            <h1 className="font-bold text-sm tracking-wide">Pratinjau Laporan Rekap Jaring (13 Halaman A4)</h1>
            <p className="text-white/70 text-xs">
              Periode: <span className="font-semibold text-white">{periodLabel}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isValid ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[#3A9D69]/40 bg-[#3A9D69]/20 px-2.5 py-1 font-semibold text-[#3A9D69] text-xs">
              <ShieldCheck className="size-3.5" />
              Data Tervalidasi
            </span>
          ) : null}

          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            className="flex cursor-pointer items-center gap-1.5 bg-white font-semibold text-[#174D6B] shadow-sm hover:bg-white/90"
            title="Buka dialog cetak browser dan pilih 'Simpan sebagai PDF'"
          >
            <Printer className="size-4" />
            <span>Cetak / Simpan PDF</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex cursor-pointer items-center gap-1.5 border-white/30 bg-white/10 font-semibold text-white hover:bg-white/20"
            title="Unduh langsung dari server atau dialihkan ke cetak PDF"
          >
            {downloading ? <RefreshCw className="size-4 animate-spin" /> : <Download className="size-4" />}
            <span>{downloading ? "Menyiapkan PDF..." : "Unduh PDF"}</span>
          </Button>
        </div>
      </nav>

      {notice ? (
        <div className="flex items-center justify-between gap-3 border-amber-400/40 border-b bg-amber-500/25 px-6 py-2.5 text-amber-100 text-xs backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Info className="size-4 shrink-0 text-amber-300" />
            <span>{notice}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-7 cursor-pointer border-amber-300/50 bg-amber-400/20 px-2.5 text-amber-100 text-xs hover:bg-amber-400/30 hover:text-white"
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
