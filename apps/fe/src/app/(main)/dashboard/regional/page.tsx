"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import {
  Users,
  FileText,
  CheckCircle,
  Clock,
  MapPin,
  AlertTriangle,
  Bell,
  Star,
  Filter,
  ChevronDown,
  Shield,
} from "lucide-react";

// Dynamically import MapIndonesia with SSR disabled
const MapIndonesia = dynamic(() => import("@/components/MapIndonesia"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center gap-3 h-full min-h-[400px]">
      <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      <span className="text-[10px] text-cyan-400 tracking-[0.2em] uppercase font-mono animate-pulse">
        Memuat Peta...
      </span>
    </div>
  ),
});

// Daftar 38 BINDA (34 provinsi + 4 wilayah khusus)
const BINDA_LIST = [
  "Aceh",
  "Sumatera Utara",
  "Sumatera Barat",
  "Riau",
  "Jambi",
  "Sumatera Selatan",
  "Bengkulu",
  "Lampung",
  "Kepulauan Bangka Belitung",
  "Kepulauan Riau",
  "DKI Jakarta",
  "Jawa Barat",
  "Jawa Tengah",
  "DI Yogyakarta",
  "Jawa Timur",
  "Banten",
  "Bali",
  "Nusa Tenggara Barat",
  "Nusa Tenggara Timur",
  "Kalimantan Barat",
  "Kalimantan Tengah",
  "Kalimantan Selatan",
  "Kalimantan Timur",
  "Kalimantan Utara",
  "Sulawesi Utara",
  "Sulawesi Tengah",
  "Sulawesi Selatan",
  "Sulawesi Tenggara",
  "Gorontalo",
  "Sulawesi Barat",
  "Maluku",
  "Maluku Utara",
  "Papua",
  "Papua Barat",
  "Papua Selatan",
  "Papua Tengah",
  "Papua Pegunungan",
  "Papua Barat Daya",
];

export default function RegionalPage() {
  const [selectedBinda, setSelectedBinda] = useState("DKI Jakarta");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-[#050A10] text-slate-300 font-sans p-3 lg:p-6 overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Breadcrumb + Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-slate-500 uppercase mb-3">
          <span>Nasional</span>
          <span className="text-slate-600">&gt;</span>
          <span className="text-cyan-400">{selectedBinda}</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-bold tracking-[0.12em] text-slate-100 uppercase">
              Komando Regional: {selectedBinda}
            </h1>
            <p className="text-[10px] text-slate-500 tracking-[0.15em] font-mono mt-1.5 uppercase max-w-2xl leading-relaxed">
              BINDA {selectedBinda} // Ringkasan Operasional // Ringkasan
              Operasional // Ringkasan Operasional
            </p>
          </div>

          {/* BINDA Selector */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 border border-slate-700 bg-[#0B111D] hover:bg-slate-800 text-slate-300 px-4 py-2 rounded text-xs font-mono tracking-wider transition-colors min-w-[200px] justify-between"
              >
                <span>BINDA-{selectedBinda.substring(0, 2).toUpperCase()}</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full max-h-64 overflow-y-auto bg-[#0B111D] border border-slate-700 rounded shadow-xl z-50 scrollbar-thin scrollbar-thumb-slate-700">
                  {BINDA_LIST.map((binda) => (
                    <button
                      key={binda}
                      onClick={() => {
                        setSelectedBinda(binda);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-mono tracking-wider hover:bg-slate-800 transition-colors ${selectedBinda === binda ? "text-cyan-400 bg-cyan-500/5" : "text-slate-400"}`}
                    >
                      {binda}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded border border-amber-500/30 bg-amber-500/10">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase">
                Waspada
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards (Empty) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Total Operatif */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 backdrop-blur rounded-xl p-5 group hover:border-cyan-900 transition-colors">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-slate-400">
              Total Operatif
            </span>
            <div className="p-1.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-cyan-400 tracking-widest mb-4">
            -
          </h2>
          <div className="flex justify-between items-center text-[10px] text-slate-500 tracking-wider font-mono">
            <span>Tingkat Penugasan</span>
            <span className="text-slate-400">-%</span>
          </div>
        </div>

        {/* Card 2: Laporan Sektor */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 backdrop-blur rounded-xl p-5 group hover:border-blue-900 transition-colors">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-slate-400">
              Laporan Sektor
            </span>
            <div className="p-1.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-blue-400 tracking-widest mb-4">
            -
          </h2>
          <div className="text-[10px] text-slate-500 tracking-wider font-mono">
            - Laporan Valid
          </div>
        </div>

        {/* Card 3: Tingkat Validasi */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 backdrop-blur rounded-xl p-5 group hover:border-emerald-900 transition-colors">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-slate-400">
              Tingkat Validasi
            </span>
            <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-emerald-400 tracking-widest mb-4">
            -
          </h2>
          <div className="flex justify-between items-center text-[10px] text-slate-500 tracking-wider font-mono">
            <span>Target: - (Nominal)</span>
            <span className="text-emerald-400">-%</span>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-2">
            <div className="bg-emerald-500 h-full w-[0%]" />
          </div>
        </div>

        {/* Card 4: Data Rata Respon */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 backdrop-blur rounded-xl p-5 group hover:border-violet-900 transition-colors">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-slate-400">
              Data Rata Respon
            </span>
            <div className="p-1.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-violet-400 tracking-widest mb-4">
            -
          </h2>
          <div className="text-[10px] text-slate-500 tracking-wider font-mono">
            T-Minus Verifikasi
          </div>
        </div>
      </div>

      {/* Map + Executive Summary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Peta Sektor Operasi */}
        <div className="lg:col-span-2 border border-slate-800/80 bg-[#0B111D]/80 rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 p-5 border-b border-slate-800/60">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200">
              Peta Sektor Operasi
            </h3>
          </div>
          <div className="flex-1 min-h-[400px] relative">
            <MapIndonesia />
            {/* Coordinate HUD */}
            <div className="absolute bottom-4 left-4 bg-slate-950/80 border border-slate-800 rounded px-3 py-1.5 text-[9px] font-mono text-slate-400 backdrop-blur-sm z-20">
              Pusat Koordinat: Data Belum Tersedia
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <Shield className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200">
              Executive Summary
            </h3>
          </div>
          <div className="flex-1 flex items-center justify-center border border-dashed border-slate-800 rounded bg-slate-950/20 min-h-[200px]">
            <p className="text-slate-500 text-xs font-mono tracking-widest text-center px-4">
              Belum ada ringkasan eksekutif
              <br />
              untuk wilayah ini.
            </p>
          </div>

          {/* Regional Intelligence */}
          <div className="mt-5 pt-5 border-t border-slate-800/60">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200">
                Regional Intelligence
              </h3>
            </div>
            <div className="flex items-center justify-center border border-dashed border-slate-800 rounded bg-slate-950/20 min-h-[100px]">
              <p className="text-slate-500 text-xs font-mono tracking-widest text-center px-4">
                Belum ada produk intelijen
                <br />
                resmi di wilayah ini.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI + Laporan Prioritas + Peringatan Dini Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* KPI Kabupaten/Kota */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <Star className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200">
              KPI Kabupaten/Kota
            </h3>
          </div>
          <div className="flex-1 flex items-center justify-center border border-dashed border-slate-800 rounded bg-slate-950/20 min-h-[200px]">
            <p className="text-slate-500 text-xs font-mono tracking-widest text-center">
              Tidak Ada Data KPI Wilayah
            </p>
          </div>
        </div>

        {/* Laporan Prioritas */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-red-400">
              Laporan Prioritas
            </h3>
          </div>
          <div className="flex-1 flex items-center justify-center border border-dashed border-slate-800 rounded bg-slate-950/20 min-h-[200px]">
            <p className="text-slate-500 text-xs font-mono tracking-widest text-center">
              Tidak Ada Laporan Prioritas
            </p>
          </div>
        </div>

        {/* Peringatan Dini */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <Bell className="w-4 h-4 text-orange-400" />
            <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-orange-400">
              Peringatan Dini
            </h3>
          </div>
          <div className="flex-1 flex items-center justify-center border border-dashed border-slate-800 rounded bg-slate-950/20 min-h-[200px]">
            <p className="text-slate-500 text-xs font-mono tracking-widest text-center">
              Tidak Ada Peringatan Dini
            </p>
          </div>
        </div>
      </div>

      {/* Status Operatif Personel */}
      <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200">
              Status Operatif Personel
            </h3>
          </div>
          <button
            className="flex items-center gap-2 border border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-400 px-3 py-1.5 rounded text-[10px] tracking-widest font-mono uppercase transition-colors"
            disabled
          >
            <Filter className="w-3 h-3" /> Filter
          </button>
        </div>

        {/* Table Header */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-3 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold">
                  ID
                </th>
                <th className="text-left py-3 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold">
                  Nama
                </th>
                <th className="text-left py-3 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold">
                  Pangkat
                </th>
                <th className="text-left py-3 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold">
                  Unit
                </th>
                <th className="text-left py-3 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold">
                  Skor KPI
                </th>
                <th className="text-left py-3 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold">
                  Laporan Valid
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-16 text-slate-500 text-xs font-mono tracking-widest"
                >
                  Tidak Ada Data Personel
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
