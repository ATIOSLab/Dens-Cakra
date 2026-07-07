"use client";

import React from "react";
import { Bell, Check, Trash2, Filter } from "lucide-react";

export default function NotificationsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#050A10] text-slate-300 font-sans p-3 lg:p-6 overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-slate-800/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-cyan-400" />
            <h1 className="text-xl md:text-2xl font-bold tracking-[0.15em] text-slate-100 uppercase">
              Pusat Notifikasi
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-500 border border-red-500/30 uppercase tracking-widest">
              0 Baru
            </span>
          </div>
          <p className="text-[10px] text-slate-500 tracking-[0.2em] font-mono mt-1.5 uppercase">
            Pembaruan Sistem &amp; Peringatan Taktis
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 border border-slate-700 bg-slate-900/50 hover:bg-slate-850 text-slate-400 px-4 py-2 rounded text-xs font-mono tracking-widest uppercase transition-colors opacity-50 cursor-not-allowed"
            disabled
          >
            <Check className="w-3.5 h-3.5" /> Tandai Semua Dibaca
          </button>
          <button
            className="flex items-center gap-2 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 px-4 py-2 rounded text-xs font-mono tracking-widest uppercase transition-colors opacity-50 cursor-not-allowed"
            disabled
          >
            <Trash2 className="w-3.5 h-3.5" /> Bersihkan
          </button>
        </div>
      </div>

      {/* Main Notifications Box */}
      <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col flex-1">
        <div className="flex items-center justify-between pb-4 border-b border-slate-850 mb-6">
          <button
            className="flex items-center gap-2 border border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-400 px-3 py-1.5 rounded text-[10px] tracking-widest font-mono uppercase transition-colors"
            disabled
          >
            <Filter className="w-3.5 h-3.5" /> Filter
          </button>
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">
            Menampilkan 0 Notifikasi
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center min-h-[350px] border border-dashed border-slate-800/60 rounded-lg bg-slate-950/10 p-6">
          <div className="w-12 h-12 rounded-full border border-slate-850 flex items-center justify-center text-slate-600 mb-3 shadow-[0_0_15px_rgba(255,255,255,0.02)]">
            <Bell className="w-5 h-5" />
          </div>
          <p className="text-slate-400 font-mono text-sm tracking-widest uppercase text-center font-bold">
            Tidak Ada Notifikasi Baru
          </p>
          <p className="text-slate-650 font-sans text-xs tracking-wider text-center mt-1">
            Semua log taktis dan pembaruan sistem operasional telah terbaca.
          </p>
        </div>
      </div>
    </div>
  );
}
