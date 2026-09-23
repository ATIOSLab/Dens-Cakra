"use client";

import { useState } from "react";

import Link from "next/link";

import { ArrowLeft, Download, Printer, RefreshCw, ShieldCheck } from "lucide-react";

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

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const pdfUrl = `/api/reports/jaring/pdf?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&_t=${Date.now()}`;
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = `laporan-rekap-jaring-${periodLabel.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setDownloading(false), 2000);
    }
  };

  return (
    <nav className="no-print sticky top-0 z-50 flex w-full flex-wrap items-center justify-between gap-4 border-[#2AA8C3]/30 border-b bg-[#174D6B] px-6 py-3 text-white shadow-md">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/deputi">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1.5 text-white hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="size-4" />
            <span>Dashboard Deputi</span>
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
          className="flex cursor-pointer items-center gap-1.5 bg-white font-semibold text-[#174D6B] hover:bg-white/90"
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
        >
          {downloading ? <RefreshCw className="size-4 animate-spin" /> : <Download className="size-4" />}
          <span>{downloading ? "Menyiapkan PDF..." : "Unduh PDF"}</span>
        </Button>
      </div>
    </nav>
  );
}
