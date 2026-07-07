"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { 
  Users, 
  MapPin, 
  ShieldAlert, 
  Filter, 
  List, 
  Map, 
  PieChart, 
  FolderOpen 
} from "lucide-react";

// Dynamically import MapIndonesia with SSR disabled
const MapIndonesia = dynamic(() => import("@/components/MapIndonesia"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center gap-3 h-full min-h-[400px]">
      <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      <span className="text-[10px] text-cyan-400 tracking-[0.2em] uppercase font-mono animate-pulse">
        Memuat Peta Personel Wilayah...
      </span>
    </div>
  ),
});

export default function KabinMonitoringPage() {
  const [activeTab, setActiveTab] = useState("DAFTAR");

  return (
    <div className="flex flex-col min-h-screen bg-[#050A10] text-slate-350 font-sans p-3 lg:p-6 overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-900">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-mono border border-cyan-500/30 text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
              BINDA SUMATERA UTARA
            </span>
            <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
              /// Wilayah Operasional
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-[0.15em] text-slate-100 uppercase">
            Pemantauan Personel
          </h1>
          <p className="text-[10px] text-slate-500 tracking-[0.2em] font-mono mt-1 uppercase">
            Operasi Wilayah Sumatera Utara &amp; Pelacakan Pergerakan
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 border border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-400 px-3 py-1.5 rounded text-[10px] tracking-widest font-mono uppercase transition-colors"
            disabled
          >
            <Filter className="w-3.5 h-3.5 text-cyan-400" /> Filter Wilayah
          </button>
          
          <div className="flex items-center gap-2 border border-emerald-500/30 bg-emerald-500/10 rounded px-3 py-1.5 text-emerald-400">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] tracking-widest font-mono uppercase font-bold">
              Sinkronisasi Aktif
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Row (Empty State) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Personel Sumut", value: "-", border: "hover:border-cyan-900", icon: Users, color: "text-cyan-400", bg: "bg-cyan-500/10" },
          { label: "Aktif / Online", value: "-", border: "hover:border-emerald-900", icon: ShieldAlert, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Sedang Bertugas", value: "-", border: "hover:border-blue-900", icon: MapPin, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Panic Alert", value: "-", border: "hover:border-red-900", icon: ShieldAlert, color: "text-red-400", bg: "bg-red-500/10" },
        ].map((card, i) => (
          <div 
            key={i} 
            className={`border border-slate-800 bg-[#0B111D]/80 rounded-xl p-5 transition-colors ${card.border}`}
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500">
                {card.label}
              </span>
              <div className={`p-1.5 rounded border border-transparent ${card.bg} ${card.color}`}>
                <card.icon className="w-4 h-4" />
              </div>
            </div>
            <h2 className={`text-3xl font-bold tracking-widest ${card.color}`}>
              {card.value}
            </h2>
          </div>
        ))}
      </div>

      {/* Tabs Control Row */}
      <div className="flex border-b border-slate-850 mb-6 text-[10px] font-mono tracking-widest uppercase gap-2">
        {[
          { id: "DAFTAR", label: "Daftar", icon: List },
          { id: "PETA WILAYAH SUMUT", label: "Peta Wilayah Sumut", icon: Map },
          { id: "EKSEKUTIF", label: "Eksekutif", icon: PieChart },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-all ${
              activeTab === tab.id 
                ? "border-cyan-500 text-cyan-400 bg-cyan-500/5 font-bold shadow-[0_0_8px_rgba(6,182,212,0.3)]" 
                : "border-transparent text-slate-500 hover:text-slate-400"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Dynamic Tabs Content */}
      <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col flex-1">
        
        {/* Tab 1: DAFTAR */}
        {activeTab === "DAFTAR" && (
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-5 border-b border-slate-850 pb-3">
              <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200">
                Daftar Personel (BINDA Sumatera Utara)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-850">
                    <th className="py-3 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold">
                      ID
                    </th>
                    <th className="py-3 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold">
                      Personel
                    </th>
                    <th className="py-3 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold">
                      Peran &amp; Unit
                    </th>
                    <th className="py-3 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold">
                      Wilayah (Kab/Kota)
                    </th>
                    <th className="py-3 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold">
                      Status
                    </th>
                    <th className="py-3 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold w-24">
                      KPI
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td 
                      colSpan={6} 
                      className="text-center py-20 text-slate-500 text-xs font-mono tracking-widest uppercase bg-slate-950/5"
                    >
                      <div className="flex flex-col items-center justify-center gap-3">
                        <FolderOpen className="w-8 h-8 text-slate-700" />
                        <span>Tidak Ada Data Personel Terdaftar di Sumatera Utara</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: PETA WILAYAH SUMUT */}
        {activeTab === "PETA WILAYAH SUMUT" && (
          <div className="flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-slate-850 pb-3">
              <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200">
                Peta Sebaran Personel - Wilayah Sumatera Utara
              </h3>

              {/* Map Legend */}
              <div className="flex flex-wrap gap-4 text-[8px] font-mono font-semibold tracking-wider uppercase text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Aktif</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Siaga</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Bertugas / Patroli</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span>Panic Alert</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-700" />
                  <span>Offline</span>
                </div>
              </div>
            </div>

            <div className="w-full h-[450px] bg-[#090E17] border border-slate-900 rounded-lg overflow-hidden relative">
              <MapIndonesia />
            </div>
          </div>
        )}

        {/* Tab 3: EKSEKUTIF */}
        {activeTab === "EKSEKUTIF" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Summary Panel */}
            <div className="flex flex-col border-r border-slate-850/60 pr-6">
              <div className="flex items-center gap-2 mb-5 border-b border-slate-850 pb-3">
                <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200">
                  Ringkasan Status (Sumut)
                </h3>
              </div>
              <div className="space-y-4">
                {[
                  { label: "Aktif / Online", count: "-", color: "text-emerald-400", border: "border-emerald-500/20" },
                  { label: "Sedang Bertugas", count: "-", color: "text-blue-400", border: "border-blue-500/20" },
                  { label: "Sedang Patroli", count: "-", color: "text-amber-500", border: "border-amber-500/20" },
                  { label: "Offline", count: "-", color: "text-slate-500", border: "border-slate-800" },
                ].map((item, i) => (
                  <div 
                    key={i} 
                    className={`flex items-center justify-between border bg-slate-950/20 rounded p-3 text-xs font-mono tracking-widest uppercase ${item.border}`}
                  >
                    <span className="text-slate-400 font-bold">{item.label}</span>
                    <span className={`text-sm font-bold ${item.color}`}>{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Regional Distribution Panel */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-5 border-b border-slate-850 pb-3">
                <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200">
                  Distribusi Per Wilayah (Sumatera Utara)
                </h3>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-850 rounded bg-slate-950/20 p-6 min-h-[220px]">
                <p className="text-slate-500 text-xs font-mono tracking-widest text-center uppercase">
                  Tidak Ada Data Distribusi Personel di Sumatera Utara
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
