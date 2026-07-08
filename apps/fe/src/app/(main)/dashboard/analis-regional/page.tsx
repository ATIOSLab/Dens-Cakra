"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import {
  Users,
  FileText,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldAlert,
  Filter,
  FolderOpen,
  Activity,
  AlertTriangle,
  Building2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Dynamically import MapIndonesia with SSR disabled
const MapIndonesia = dynamic(() => import("@/components/MapIndonesia"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center gap-3 h-full min-h-[400px]">
      <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      <span className="text-[10px] text-cyan-400 tracking-[0.2em] uppercase font-mono animate-pulse">
        Memuat Peta Sektor Operasi...
      </span>
    </div>
  ),
});

const REGIONS = [
  { code: "BINDA-JK", name: "DKI Jakarta" },
  { code: "BINDA-RI", name: "Riau" },
  { code: "BINDA-SU", name: "Sumatera Utara" },
  { code: "BINDA-JB", name: "Jawa Barat" },
];

export default function AnalisRegionalPage() {
  const [selectedRegion, setSelectedRegion] = useState(REGIONS[0]);
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-[#050A10] text-slate-300 font-sans p-3 lg:p-6 overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Breadcrumb */}
      <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase mb-2">
        <span>Nasional &gt; </span>
        <span className="text-slate-300 font-bold">{selectedRegion.name}</span>
      </div>

      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-900">
        <div>
          <h1 className="text-xl md:text-3xl font-bold tracking-[0.15em] text-slate-100 uppercase">
            Komando Regional: {selectedRegion.name}
          </h1>
          <p className="text-[9px] text-slate-500 tracking-[0.2em] font-mono mt-1.5 uppercase leading-relaxed max-w-3xl">
            BINDA {selectedRegion.name.toUpperCase()} // RINGKASAN OPERASIONAL // RINGKASAN OPERASIONAL // RINGKASAN OPERASIONAL // RINGKASAN OPERASIONAL // RINGKASAN OPERASIONAL
          </p>
        </div>

        {/* Region Selector & Status Pill */}
        <div className="flex items-center gap-3 relative">
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center justify-between gap-3 border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 px-3.5 py-2 rounded text-xs tracking-wider font-mono font-bold uppercase transition-all min-w-[140px]"
            >
              <span>{selectedRegion.code}</span>
              <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-1 w-48 bg-[#0B1221] border border-slate-800 rounded-lg shadow-2xl py-1 z-50">
                {REGIONS.map((r) => (
                  <button
                    key={r.code}
                    onClick={() => {
                      setSelectedRegion(r);
                      setShowDropdown(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-mono tracking-wider uppercase hover:bg-slate-800 transition-colors flex items-center justify-between ${
                      selectedRegion.code === r.code ? "text-cyan-400 font-bold bg-cyan-500/10" : "text-slate-400"
                    }`}
                  >
                    <span>{r.name}</span>
                    <span className="text-[10px] text-slate-600">{r.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border border-amber-500/40 bg-amber-500/10 rounded px-3.5 py-2 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
            <span className="text-xs tracking-widest font-mono uppercase font-bold">
              WASPADA
            </span>
          </div>
        </div>
      </div>

      {/* 4 Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Total Operatif */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-cyan-500/30 transition-all shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-slate-400 font-semibold">
              Total Operatif
            </span>
            <div className="p-2 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-cyan-400 tracking-wider">-</h2>
          <div className="text-[10px] font-mono text-red-400 font-semibold uppercase tracking-wider mt-4">
            <span className="text-red-500">-%</span> vs Bulan Lalu
          </div>
        </div>

        {/* Card 2: Laporan Sektor */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/30 transition-all shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-slate-400 font-semibold">
              Laporan Sektor
            </span>
            <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-blue-400 tracking-wider">-</h2>
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mt-4">
            <span className="text-emerald-400 font-bold">0</span> LAPORAN VALID
          </div>
        </div>

        {/* Card 3: Tingkat Validasi */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/30 transition-all shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-slate-400 font-semibold">
              Tingkat Validasi
            </span>
            <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-emerald-400 tracking-wider">0%</h2>
          <div className="mt-4">
            <div className="flex justify-between items-center text-[8px] text-slate-500 tracking-wider font-mono mb-1.5 uppercase">
              <span>TARGET: 85% (NOMINAL)</span>
              <span className="text-emerald-400">85%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-400 h-full w-[0%] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            </div>
          </div>
        </div>

        {/* Card 4: Rata-rata Respon */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/30 transition-all shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-slate-400 font-semibold">
              Rata-rata Respon
            </span>
            <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-amber-500 tracking-wider">-</h2>
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mt-4">
            <span className="text-emerald-400 font-bold">I-MINUS</span> VERIFIKASI
          </div>
        </div>
      </div>

      {/* Two Column Layout: Left (Map & Table 8/12) vs Right (Summaries 4/12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        
        {/* Left Column (Width 8/12) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Box 1: Peta Sektor Operasi */}
          <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col shadow-lg">
            <div className="flex items-center justify-between mb-4 border-b border-slate-850 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200">
                  Peta Sektor Operasi ({selectedRegion.name})
                </h3>
              </div>
              <span className="text-[9px] font-mono text-slate-500 tracking-widest uppercase">
                Koordinat Regional Aktif
              </span>
            </div>

            <div className="w-full h-[400px] bg-[#090E17] border border-slate-900 rounded-lg overflow-hidden relative">
              <MapIndonesia />
            </div>
          </div>

          {/* Box 2: Status Operatif Personel */}
          <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col shadow-lg flex-1">
            <div className="flex items-center justify-between mb-5 border-b border-slate-850 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200">
                  Status Operatif Personel
                </h3>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                className="border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-[10px] font-mono tracking-wider uppercase h-8 gap-1.5"
                disabled
              >
                <Filter className="w-3 h-3 text-cyan-400" />
                <span>Filter</span>
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-850">
                    <th className="py-3 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold">
                      ID
                    </th>
                    <th className="py-3 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold">
                      Nama
                    </th>
                    <th className="py-3 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold">
                      Pangkat
                    </th>
                    <th className="py-3 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold">
                      Unit
                    </th>
                    <th className="py-3 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold">
                      Status
                    </th>
                    <th className="py-3 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold">
                      Skor KPI
                    </th>
                    <th className="py-3 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold text-right">
                      Laporan Valid
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td 
                      colSpan={7} 
                      className="text-center py-20 text-slate-500 text-xs font-mono tracking-widest uppercase bg-slate-950/20"
                    >
                      Tidak ada personel operatif terdata di wilayah ini.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column (Width 4/12) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Box 1: Executive Summary */}
          <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col shadow-lg">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-850 pb-3">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200">
                Executive Summary
              </h3>
            </div>
            
            <div className="bg-slate-950/40 border border-slate-900 rounded-lg p-5">
              <p className="text-slate-500 text-xs font-mono leading-relaxed italic text-center">
                Belum ada rangkuman eksekutif untuk wilayah {selectedRegion.name}.
              </p>
            </div>
          </div>

          {/* Box 2: Regional Intelligence / KPI */}
          <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col shadow-lg flex-1">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-850 pb-3">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200">
                Regional Intelligence
              </h3>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-850 rounded bg-slate-950/20 p-6 min-h-[160px]">
              <p className="text-slate-500 font-mono text-xs tracking-widest uppercase text-center">
                Belum ada produk intelijen resmi di wilayah ini.
              </p>
            </div>
          </div>

          {/* Box 3: Peringatan Dini / Laporan Prioritas */}
          <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col shadow-lg flex-1">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-850 pb-3">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-red-400">
                Laporan Prioritas &amp; Peringatan Dini
              </h3>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-850 rounded bg-slate-950/20 p-6 min-h-[160px]">
              <p className="text-slate-500 font-mono text-[11px] tracking-widest uppercase text-center">
                Tidak ada laporan prioritas di wilayah ini.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
