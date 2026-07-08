"use client";

import React, { useState } from "react";
import { 
  FileText, 
  Filter, 
  Search, 
  SlidersHorizontal,
  Plus, 
  ChevronDown, 
  ShieldCheck,
  TrendingUp,
  FolderOpen
} from "lucide-react";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("SEMUA REKAMAN");

  return (
    <div className="flex flex-col min-h-screen bg-[#050A10] text-slate-350 font-sans p-3 lg:p-6 overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Breadcrumbs + Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-900">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-[0.15em] text-slate-100 uppercase">
            Laporan Intelijen
          </h1>
          <p className="text-[10px] text-slate-500 tracking-[0.2em] font-mono mt-1.5 uppercase">
            Dens Cakra // Basis Data Operasional
          </p>
        </div>

        <button 
          className="flex items-center justify-center gap-2 border border-slate-800 bg-[#0B121E] hover:bg-slate-800 text-slate-400 hover:text-slate-200 px-4 py-2 rounded text-xs font-mono tracking-widest uppercase transition-colors"
          disabled
        >
          <TrendingUp className="w-3.5 h-3.5 text-cyan-400" /> Executive Summary
        </button>
      </div>

      {/* Main Database Query panel */}
      <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-850 mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200">
              Kueri Basis Data
            </h3>
          </div>
          
          <button
            className="flex items-center gap-2 border border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-400 px-3 py-1.5 rounded text-[10px] tracking-widest font-mono uppercase transition-colors"
            disabled
          >
            <Filter className="w-3.5 h-3.5 text-cyan-400" /> Filter
          </button>
        </div>

        {/* Search & Tabs Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          {/* Custom Navigation Tabs */}
          <div className="flex flex-wrap gap-2 text-[10px] font-mono tracking-widest uppercase">
            {["SEMUA REKAMAN", "TERTUNDA", "KRITIS"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded border transition-colors ${
                  activeTab === tab 
                    ? "border-cyan-500/30 text-cyan-400 bg-cyan-500/5" 
                    : "border-slate-800 text-slate-500 hover:text-slate-450 hover:border-slate-700 bg-slate-900/10"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:max-w-xs">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Cari nomor laporan / judul..."
              className="w-full pl-9 pr-4 py-2 border border-slate-800 bg-slate-900/20 rounded text-xs text-slate-300 font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
              disabled
            />
          </div>
        </div>

        {/* Reports Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-850">
                <th className="py-3.5 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold w-24">
                  ID
                </th>
                <th className="py-3.5 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold">
                  Judul
                </th>
                <th className="py-3.5 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold w-36">
                  Kategori
                </th>
                <th className="py-3.5 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold w-28">
                  Urgensi
                </th>
                <th className="py-3.5 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold w-40">
                  Wilayah
                </th>
                <th className="py-3.5 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold w-36">
                  Status
                </th>
                <th className="py-3.5 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold w-20 text-center">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td 
                  colSpan={7} 
                  className="text-center py-20 text-slate-500 text-xs font-mono tracking-widest uppercase bg-slate-950/5 border-b border-slate-900/50 rounded-b-xl"
                >
                  <div className="flex flex-col items-center justify-center gap-3">
                    <FolderOpen className="w-8 h-8 text-slate-700" />
                    <span>Tidak Ada Data Laporan Intelijen</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
