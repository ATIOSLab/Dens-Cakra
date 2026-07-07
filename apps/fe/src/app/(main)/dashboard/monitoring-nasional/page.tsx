"use client";

import React from "react";
import { 
  Users, 
  MapPin, 
  Database, 
  Activity, 
  Filter,
  FolderOpen,
  Map,
} from "lucide-react";

export default function MonitoringNasionalPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#050A10] text-slate-350 font-sans p-3 lg:p-6 overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-900">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-[0.15em] text-slate-100 uppercase">
            Konsol Administrator Nasional
          </h1>
          <p className="text-[10px] text-slate-500 tracking-[0.2em] font-mono mt-1.5 uppercase">
            Manajemen Sistem &amp; Pengguna Terpusat
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 border border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-400 px-3 py-2 rounded text-[10px] tracking-widest font-mono uppercase transition-colors"
            disabled
          >
            <Filter className="w-3.5 h-3.5 text-cyan-400" /> Filter
          </button>
          <div className="flex items-center gap-2 border border-emerald-500/30 bg-emerald-500/10 rounded px-3 py-2 text-emerald-400">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] tracking-widest font-mono uppercase font-bold">
              Sinkronisasi Aktif
            </span>
          </div>
        </div>
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Total Pengguna */}
        <div className="border border-slate-800 bg-[#0B111D]/80 rounded-xl p-5 transition-colors hover:border-cyan-900 relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500">
              Total Pengguna
            </span>
            <div className="p-1.5 rounded bg-cyan-500/10 text-cyan-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-bold tracking-widest text-cyan-400 font-mono">
            —
          </h2>
        </div>

        {/* Card 2: Wilayah Aktif */}
        <div className="border border-slate-800 bg-[#0B111D]/80 rounded-xl p-5 transition-colors hover:border-cyan-900 relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500">
              Wilayah Aktif
            </span>
            <div className="p-1.5 rounded bg-cyan-500/10 text-cyan-400">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-bold tracking-widest text-cyan-400 font-mono">
            —
          </h2>
        </div>

        {/* Card 3: Status Sinkronisasi */}
        <div className="border border-slate-800 bg-[#0B111D]/80 rounded-xl p-5 transition-colors hover:border-emerald-900 relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500">
              Status Sinkronisasi
            </span>
            <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-widest text-emerald-400 font-mono mb-2">
            —
          </h2>
          <div className="flex items-center justify-between text-[8px] font-mono text-slate-500 mb-1.5">
            <span>Data Master</span>
            <span>Sinkron</span>
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500/30 h-full w-0" />
          </div>
        </div>

        {/* Card 4: Log Audit */}
        <div className="border border-slate-800 bg-[#0B111D]/80 rounded-xl p-5 transition-colors hover:border-slate-700 relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500">
              Log Audit (24J)
            </span>
            <div className="p-1.5 rounded bg-slate-800 text-slate-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-bold tracking-widest text-slate-300 font-mono">
            —
          </h2>
        </div>
      </div>

      {/* Bottom Grid: Activity Log + Regional Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Aktivitas Sistem Terbaru */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-850">
            <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200">
              Aktivitas Sistem Terbaru
            </h3>
            <button 
              className="text-[9px] font-mono tracking-widest text-slate-500 hover:text-cyan-400 uppercase transition-colors"
              disabled
            >
              Lihat Semua
            </button>
          </div>

          {/* Activity Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-900">
                  <th className="py-2 pr-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold text-left w-24">
                    Waktu
                  </th>
                  <th className="py-2 pr-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold text-left">
                    Pengguna
                  </th>
                  <th className="py-2 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold text-left">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={3} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <FolderOpen className="w-7 h-7 text-slate-700" />
                      <span className="text-[9px] text-slate-500 font-mono tracking-widest uppercase">
                        Tidak Ada Log Aktivitas
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Wilayah Perhatian Khusus */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-850">
            <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200">
              Wilayah Perhatian Khusus
            </h3>
            <button 
              className="text-[9px] font-mono tracking-widest text-slate-500 hover:text-cyan-400 uppercase transition-colors flex items-center gap-1.5"
              disabled
            >
              <Map className="w-3 h-3" /> Peta Nasional
            </button>
          </div>

          {/* Regions Empty State */}
          <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-850 rounded bg-slate-950/20 p-8 min-h-[200px]">
            <MapPin className="w-7 h-7 text-slate-700 mb-3" />
            <p className="text-[9px] text-slate-500 font-mono tracking-widest uppercase text-center">
              Tidak Ada Wilayah Dalam Perhatian
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
