"use client";

import React from "react";
import {
  FileText,
  Activity,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Filter,
  FolderOpen,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AnalisBerandaPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#050A10] text-slate-300 font-sans p-3 lg:p-6 overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-900">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-[0.15em] text-slate-100 uppercase">
            Meja Kerja Analis
          </h1>
          <p className="text-[10px] text-slate-500 tracking-[0.2em] font-mono mt-1.5 uppercase">
            Verifikasi Data &amp; Analisis Ancaman
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-800 bg-[#0B111D]/80 hover:bg-slate-800 text-slate-300 text-xs gap-1.5 h-9 font-mono tracking-wider uppercase"
            disabled
          >
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Filter</span>
          </Button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-blue-500/30 bg-blue-500/10 h-9">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            <span className="text-[10px] font-mono font-bold tracking-widest text-blue-400 uppercase">
              SINKRONISASI AKTIF
            </span>
          </div>
        </div>
      </div>

      {/* 4 Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Menunggu Verifikasi */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/30 transition-all shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-slate-400 font-semibold">
              Menunggu Verifikasi
            </span>
            <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-amber-500 tracking-wider">0</h2>
          <div className="text-[10px] font-mono text-red-500 font-bold uppercase tracking-wider mt-4">
            Prioritas Tinggi
          </div>
        </div>

        {/* Card 2: Sedang Dianalisis */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-cyan-500/30 transition-all shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-slate-400 font-semibold">
              Sedang Dianalisis
            </span>
            <div className="p-2 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-cyan-400 tracking-wider">0</h2>
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mt-4">
            Aktif Diproses
          </div>
        </div>

        {/* Card 3: Laporan Selesai */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/30 transition-all shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-slate-400 font-semibold">
              Laporan Selesai (Hari Ini)
            </span>
            <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-emerald-400 tracking-wider">0</h2>
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mt-4">
            <span className="text-emerald-400">-%</span> vs Kemarin
          </div>
        </div>

        {/* Card 4: Rata-rata Waktu */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/30 transition-all shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-slate-400 font-semibold">
              Rata-rata Waktu Analisis
            </span>
            <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-blue-400 tracking-wider">0m</h2>
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mt-4">
            Durasi Efektif
          </div>
        </div>
      </div>

      {/* Two Column Section: Antrean Verifikasi & Sedang Dianalisis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left Column (Width 7/12): Antrean Verifikasi */}
        <div className="lg:col-span-7 border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col shadow-lg">
          <div className="flex items-center gap-2 mb-5 border-b border-slate-850 pb-3">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200">
              Antrean Verifikasi
            </h3>
          </div>

          <div className="overflow-x-auto flex-1 flex flex-col">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-850">
                  <th className="py-3 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold">
                    ID Laporan
                  </th>
                  <th className="py-3 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold">
                    Judul
                  </th>
                  <th className="py-3 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold">
                    Urgensi
                  </th>
                  <th className="py-3 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold">
                    Waktu
                  </th>
                  <th className="py-3 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold text-right">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td 
                    colSpan={5} 
                    className="text-center py-24 text-slate-500 text-xs font-mono tracking-widest uppercase bg-slate-950/20"
                  >
                    Tidak ada laporan menunggu verifikasi.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (Width 5/12): Sedang Dianalisis */}
        <div className="lg:col-span-5 border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col shadow-lg">
          <div className="flex items-center gap-2 mb-5 border-b border-slate-850 pb-3">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200">
              Sedang Dianalisis
            </h3>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-850 rounded bg-slate-950/20 p-8 min-h-[250px]">
            <p className="text-slate-500 font-mono text-xs tracking-widest uppercase text-center">
              Tidak ada laporan sedang dianalisis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
