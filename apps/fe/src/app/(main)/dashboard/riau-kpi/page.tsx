"use client";

import React, { useState } from "react";
import {
  Target,
  Trophy,
  Users,
  Map,
  Filter,
  Trophy as LeaderboardIcon,
  AlertTriangle,
  Building2,
  MapPin,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

export default function KpiRiauPage() {
  const [timeRange, setTimeRange] = useState("BULANAN");

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen bg-[#050A10] text-slate-100">
      {/* Top Header */}
      <div className="flex justify-between items-center border-b border-slate-800/60 pb-5 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono border border-cyan-500/30 text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
              BINDA RIAU
            </span>
            <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
              /// Wilayah Operasional
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-wider text-slate-100 mt-2 uppercase">
            DENS CAKRA KPI ENGINE - WILAYAH
          </h1>
          <p className="text-[10px] text-slate-500 tracking-[0.2em] font-semibold mt-1 uppercase">
            Regional Intelligence Performance Management System • Provinsi Riau
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-800 bg-[#0B111D]/80 hover:bg-slate-800 text-slate-300 text-xs gap-1.5 h-9"
            disabled
          >
            <LeaderboardIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span>Leaderboard Wilayah</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="border-slate-800 bg-[#0B111D]/80 hover:bg-slate-800 text-slate-300 text-xs gap-1.5 h-9"
            disabled
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Kab/Kota</span>
          </Button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 h-9">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="text-[10px] font-mono font-bold tracking-widest text-blue-400">
              SINKRONISASI AKTIF
            </span>
          </div>
        </div>
      </div>

      {/* Row of Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {/* Metric 1 */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-cyan-500/30 transition-all">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-slate-400">
              Skor KPI Wilayah
            </span>
            <div className="w-8 h-8 rounded bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-cyan-400 tracking-wider">-</h2>
          <div className="flex items-center text-[10px] font-mono mt-4 text-slate-500">
            <span className="mr-1.5 text-slate-400">-%</span> vs Bulan Lalu (Riau)
          </div>
        </div>

        {/* Metric 2 */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-slate-400">
              Grade Wilayah
            </span>
            <div className="w-8 h-8 rounded bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-emerald-400 tracking-wider">-</h2>
          <div className="mt-4">
            <div className="flex justify-between items-center text-[8px] text-slate-500 tracking-wider font-mono mb-1">
              <span>Pencapaian Riau</span>
              <span className="text-emerald-400">-%</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
              <div className="bg-emerald-400 h-full w-[0%] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-blue-500/30 transition-all">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-slate-400">
              Total Personel Aktif
            </span>
            <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-blue-400 tracking-wider">-</h2>
          <div className="text-[9px] text-slate-500 tracking-widest font-mono uppercase mt-4">
            Terverifikasi Aktif di Riau
          </div>
        </div>

        {/* Metric 4 */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-slate-400">
              Total Wilayah
            </span>
            <div className="w-8 h-8 rounded bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-500 group-hover:scale-110 transition-transform">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-amber-500 tracking-wider">-</h2>
          <div className="text-[9px] text-slate-500 tracking-widest font-mono uppercase mt-4">
            Kabupaten/Kota Terdata
          </div>
        </div>
      </div>

      {/* Two Column Section: Analisis Otomatis & KPI Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Analisis Otomatis */}
        <div className="lg:col-span-2 border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-850 pb-3">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200">
              Analisis Otomatis Wilayah
            </h3>
          </div>
          <div className="flex flex-col gap-3 flex-1 items-center justify-center min-h-[180px] border border-dashed border-slate-850 rounded bg-slate-950/20">
            <p className="text-slate-500 font-mono text-xs tracking-widest uppercase">
              Tidak Ada Data Analisis Wilayah
            </p>
          </div>
        </div>

        {/* Right: KPI Alerts */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-850 pb-3">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200">
              KPI Alerts Wilayah
            </h3>
          </div>
          <div className="flex flex-col gap-3 flex-1 items-center justify-center min-h-[180px] border border-dashed border-slate-850 rounded bg-slate-950/20">
            <p className="text-slate-500 font-mono text-[11px] tracking-widest uppercase">
              Tidak Ada Alerts Wilayah
            </p>
          </div>
        </div>
      </div>

      {/* Row: Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tren Kinerja Wilayah */}
        <div className="lg:col-span-2 border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col relative">
          <div className="flex justify-between items-center mb-6 border-b border-slate-850 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200">
                Tren Kinerja Wilayah (BINDA Riau)
              </h3>
            </div>
            <div className="flex bg-slate-950 rounded border border-slate-800 p-0.5 text-[9px] font-mono font-bold z-10">
              {["HARIAN", "MINGGUAN", "BULANAN", "TAHUNAN"].map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                    timeRange === r
                      ? "bg-cyan-500 text-slate-950 font-extrabold shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full h-64 flex items-center justify-center relative border border-dashed border-slate-850 rounded bg-slate-950/20">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Area type="monotone" dataKey="value" stroke="#334155" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-slate-500 font-mono text-xs tracking-widest uppercase">
                Data Chart Kosong
              </span>
            </div>
          </div>
        </div>

        {/* Distribusi Grade Kab/Kota */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-850 pb-3">
            <Map className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200">
              Distribusi Grade Kab/Kota
            </h3>
          </div>
          <div className="w-full h-64 flex justify-center items-center relative border border-dashed border-slate-850 rounded bg-slate-950/20">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[]} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Bar dataKey="count" fill="#06b6d4" />
              </BarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-slate-500 font-mono text-xs tracking-widest uppercase">
                Data Chart Kosong
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row: Top & Bottom lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Kab/Kota */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-850 pb-3">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200">
              Top Wilayah (Kab/Kota)
            </h3>
          </div>
          <div className="flex flex-col gap-2 flex-1 items-center justify-center min-h-[180px] border border-dashed border-slate-850 rounded bg-slate-950/20">
            <p className="text-slate-500 font-mono text-xs tracking-widest uppercase">
              Tidak Ada Data Top Wilayah
            </p>
          </div>
        </div>

        {/* Bottom Kab/Kota (Perlu Perhatian) */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-850 pb-3">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-red-400">
              Bottom Wilayah (Perlu Perhatian)
            </h3>
          </div>
          <div className="flex flex-col gap-2 flex-1 items-center justify-center min-h-[180px] border border-dashed border-slate-850 rounded bg-slate-950/20">
            <p className="text-slate-500 font-mono text-xs tracking-widest uppercase">
              Tidak Ada Data Bottom Wilayah
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
