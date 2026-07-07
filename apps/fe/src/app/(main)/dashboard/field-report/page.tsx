"use client";

import React from "react";
import { FileText, Filter, FolderOpen } from "lucide-react";

export default function FieldReportPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#050A10] text-slate-350 font-sans p-3 lg:p-6 overflow-x-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-900">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-[0.15em] text-slate-100 uppercase">
            Aplikasi Mobile Personel
          </h1>
          <p className="text-[10px] text-slate-500 tracking-[0.2em] font-mono mt-1.5 uppercase">
            Pelaporan Personel Lapangan (Mobile Mode)
          </p>
        </div>

        <button
          className="flex items-center gap-2 border border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-400 px-3 py-1.5 rounded text-[10px] tracking-widest font-mono uppercase transition-colors"
          disabled
        >
          <Filter className="w-3.5 h-3.5 text-cyan-400" /> Filter
        </button>
      </div>

      <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-8 flex flex-col items-center justify-center min-h-[300px]">
        <FileText className="w-10 h-10 text-slate-700 mb-3" />
        <h3 className="text-sm font-bold text-slate-300 tracking-wider uppercase mb-1">
          Tidak Ada Laporan Pribadi
        </h3>
        <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase text-center max-w-sm leading-relaxed">
          Belum ada draf atau riwayat laporan yang dikirimkan oleh akun ini.
        </p>
      </div>
    </div>
  );
}
