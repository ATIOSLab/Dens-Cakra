"use client";

import React from "react";
import dynamic from "next/dynamic";
import { 
  Filter, 
  Users, 
  FileText, 
  AlertOctagon, 
  Target, 
  MapPin, 
  AlertTriangle,
  Layers,
  Activity
} from "lucide-react";
// Import komponen peta secara dinamis dengan SSR dinonaktifkan
const MapIndonesia = dynamic(() => import("@/components/MapIndonesia"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center gap-2 text-slate-500 font-mono">
      <MapPin className="w-8 h-8 opacity-30 animate-bounce text-cyan-500" />
      <span className="text-xs tracking-widest uppercase">Loading Map...</span>
    </div>
  )
});

export default function DashboardNasional() {
  return (
    <div className="flex flex-col min-h-screen bg-[#050A10] text-slate-300 font-sans p-2 lg:p-4 overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Header Title Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-[0.15em] text-slate-100 uppercase">Dashboard Markas Besar Nasional</h1>
          <p className="text-[10px] md:text-xs text-slate-500 tracking-[0.2em] font-mono mt-1.5 uppercase">Pusat Operasi Strategis // Tinjauan Nasional</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 border border-slate-700/60 bg-slate-900/60 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded text-[10px] tracking-widest font-mono uppercase transition-colors" disabled>
            <Filter className="w-3.5 h-3.5" /> Filter
          </button>
          <button className="flex items-center gap-2 border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-4 py-2 rounded text-[10px] tracking-widest font-mono uppercase transition-colors" disabled>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Sinkronisasi Aktif
          </button>
        </div>
      </div>

      {/* 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1 */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 backdrop-blur rounded-xl p-5 relative overflow-hidden group hover:border-cyan-900 transition-colors">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] text-slate-400 tracking-[0.15em] uppercase font-mono">Personel Aktif</p>
            <div className="p-1.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-cyan-400 mb-6 tracking-widest">-</h2>
          <div className="flex justify-between items-center text-[10px] text-slate-500 tracking-wider font-mono mb-2">
            <span>Tingkat Penugasan</span>
            <span className="text-cyan-400">-%</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-cyan-400 h-full w-[0%] shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
          </div>
        </div>

        {/* Card 2 */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 backdrop-blur rounded-xl p-5 relative overflow-hidden group hover:border-blue-900 transition-colors">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] text-slate-400 tracking-[0.15em] uppercase font-mono">Laporan Hari Ini</p>
            <div className="p-1.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-blue-400 mb-6 tracking-widest">-</h2>
          <div className="flex items-center text-[10px] text-slate-500 tracking-wider font-mono mb-2 mt-auto">
            <span className="text-slate-400 mr-2">-%</span> vs kemarin
          </div>
        </div>

        {/* Card 3 */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 backdrop-blur rounded-xl p-5 relative overflow-hidden group hover:border-red-900 transition-colors">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] text-slate-400 tracking-[0.15em] uppercase font-mono">Laporan Prioritas</p>
            <div className="p-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-500 group-hover:scale-110 transition-transform">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-red-500 mb-6 tracking-widest drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">-</h2>
          <div className="text-[10px] text-red-500/80 tracking-widest uppercase font-mono font-semibold">
            Tindakan Diperlukan
          </div>
        </div>

        {/* Card 4 */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 backdrop-blur rounded-xl p-5 relative overflow-hidden group hover:border-emerald-900 transition-colors">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] text-slate-400 tracking-[0.15em] uppercase font-mono">KPI Nasional</p>
            <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 group-hover:scale-110 transition-transform">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-emerald-500 mb-6 tracking-widest">-</h2>
          <div className="flex justify-between items-center text-[10px] text-slate-500 tracking-wider font-mono mb-2">
            <span>Kategori -</span>
            <span className="text-emerald-500">Target: -</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full w-[0%] shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          </div>
        </div>
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Map Widget */}
        <div className="lg:col-span-2 border border-slate-800/80 bg-[#0B111D]/80 rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-slate-800/60">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200">Peta Operasi Nasional</h3>
            </div>
            <div className="flex items-center gap-4 text-[9px] tracking-widest font-mono uppercase text-slate-400">
              <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span> SAT: ONLINE</div>
              <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span> SIGINT: AKTIF</div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row flex-1">
            {/* Filter Panel */}
            <div className="w-full md:w-64 p-5 border-r border-slate-800/60 bg-slate-900/30 flex flex-col gap-5">
              <div className="flex items-center gap-2 text-cyan-400 mb-2">
                <Filter className="w-3.5 h-3.5" />
                <span className="text-[10px] tracking-widest uppercase font-mono font-bold">Filter Operasi</span>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-widest text-slate-500 font-mono">Filter Tanggal</label>
                <div className="border border-slate-700 bg-slate-900/50 rounded p-2 text-xs text-slate-300 font-mono flex justify-between items-center opacity-50 cursor-not-allowed">
                  <span>Pilih Tanggal</span>
                  <span className="text-slate-500">📅</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-widest text-slate-500 font-mono">Filter Kategori</label>
                <select className="border border-slate-700 bg-slate-900/50 rounded p-2 text-xs text-slate-300 font-mono appearance-none outline-none cursor-pointer" disabled>
                  <option>Semua Kategori</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-widest text-slate-500 font-mono">Filter Provinsi</label>
                <select className="border border-slate-700 bg-slate-900/50 rounded p-2 text-xs text-slate-300 font-mono appearance-none outline-none cursor-pointer" disabled>
                  <option>Semua Provinsi</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-widest text-slate-500 font-mono">Filter BINDA</label>
                <select className="border border-slate-700 bg-slate-900/50 rounded p-2 text-xs text-slate-300 font-mono appearance-none outline-none cursor-pointer" disabled>
                  <option>Semua BINDA</option>
                </select>
              </div>

              <div className="mt-4 flex flex-col gap-3">
                <label className="text-[9px] uppercase tracking-widest text-cyan-400 font-mono font-bold flex items-center gap-2">
                  <Layers className="w-3 h-3" /> Layer Peta
                </label>
                <div className="flex items-center justify-between border border-slate-700 bg-slate-900/50 rounded p-2 text-xs text-slate-400 cursor-not-allowed opacity-50">
                  <span className="flex items-center gap-2"><Activity className="w-3.5 h-3.5"/> Status Wilayah</span>
                </div>
                <div className="flex items-center justify-between border border-slate-700 bg-slate-900/50 rounded p-2 text-xs text-slate-400 cursor-not-allowed opacity-50">
                  <span className="flex items-center gap-2"><Target className="w-3.5 h-3.5"/> Heatmap Nasional</span>
                </div>
              </div>
            </div>
            
            {/* Map Area */}
            <div className="flex-1 bg-[#090E17] relative min-h-[450px] flex items-center justify-center p-4 overflow-hidden">
               {/* Map Grid Pattern */}
               <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at center, #334155 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }} />
               
               <div className="w-full h-full flex items-center justify-center relative z-10">
                 <MapIndonesia />
               </div>

               {/* Status Legend HUD overlay */}
               <div className="absolute top-4 left-4 bg-slate-950/80 border border-slate-800 rounded p-2.5 text-[9px] font-mono flex flex-col gap-1.5 backdrop-blur-xs z-20">
                 <div className="text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-1 mb-1">Status Wilayah</div>
                 <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Normal</div>
                 <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span> Perhatian</div>
                 <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span> Waspada</div>
                 <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Kritis</div>
               </div>

               {/* Map scale hud overlay */}
               <div className="absolute bottom-4 right-4 bg-slate-950/80 border border-slate-800 rounded px-2 py-1 text-[8px] font-mono text-slate-500 backdrop-blur-xs z-20">
                 0 dari 38 BINDA ditampilkan
               </div>
            </div>
          </div>
        </div>
 
        {/* Top 10 Widget */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col">
          <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200 mb-6">Top 10 Wilayah Prioritas</h3>
          <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto items-center justify-center opacity-50">
             <p className="text-slate-500 text-xs font-mono tracking-widest">Tidak ada data wilayah.</p>
          </div>
        </div>
      </div>
 
      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart Widget */}
        <div className="lg:col-span-2 border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col h-[350px]">
          <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200 mb-6">Volume Intelijen (7 Hari)</h3>
          <div className="flex-1 w-full relative border border-dashed border-slate-800/80 rounded bg-slate-950/10">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-slate-600 font-mono text-xs tracking-widest uppercase">Data Chart Kosong</span>
            </div>
          </div>
        </div>
 
        {/* Escalation Widget */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col h-[350px]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-red-500">Laporan Eskalasi Nasional</h3>
            </div>
            <button className="text-[10px] text-slate-400 hover:text-slate-200 transition-colors font-mono" disabled>Lihat Semua</button>
          </div>
          <div className="flex-1 flex items-center justify-center border border-dashed border-slate-800/80 rounded bg-slate-950/20">
            <p className="text-slate-500 text-xs font-mono tracking-widest">Tidak ada laporan eskalasi nasional.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
