"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Monitor,
  Filter,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Activity,
  Database,
  Radio,
  ShieldAlert,
  Wifi,
  Sparkles,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Dynamically import MapIndonesia with SSR disabled
const MapIndonesia = dynamic(() => import("@/components/MapIndonesia"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center gap-3 h-full min-h-[300px]">
      <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      <span className="text-[9px] text-cyan-400 tracking-[0.2em] uppercase font-mono animate-pulse">
        Menghubungkan Saluran Satelit...
      </span>
    </div>
  ),
});

interface AlertItem {
  id: string;
  level: "KRITIS" | "WASPADA" | "INFO";
  waktu: string;
  deskripsi: string;
  sumber: string;
  lokasi: string;
}

const INITIAL_ALERTS: AlertItem[] = [];

export default function OperatorCCPage() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [defconLevel, setDefconLevel] = useState("DEFCON 3");
  const [isErrorSimulated, setIsErrorSimulated] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotify = (text: string) => {
    setNotification(text);
    setTimeout(() => setNotification(null), 4000);
  };

  // Live Clock effect
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      
      const days = ["MIN", "SEN", "SEL", "RAB", "KAM", "JUM", "SAB"];
      const months = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];
      setDate(
        `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const triggerErrorSimulation = () => {
    if (isErrorSimulated) {
      setIsErrorSimulated(false);
      setDefconLevel("DEFCON 3");
      showNotify("Sistem kembali normal. Simulasi galat dinonaktifkan.");
    } else {
      setIsErrorSimulated(true);
      setDefconLevel("DEFCON 1");
      showNotify("🚨 ALARM! Simulasi galat aktif. Anomali jaringan terdeteksi di Sektor Timur!");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#050A10] text-slate-350 font-sans p-4 lg:p-6 overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-lg border shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
          isErrorSimulated 
            ? "bg-red-950/95 border-red-500/60 text-red-300 shadow-[0_0_25px_rgba(239,68,68,0.35)]" 
            : "bg-cyan-950/95 border-cyan-500/60 text-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.35)]"
        }`}>
          <CheckCircle2 className={`w-5 h-5 shrink-0 ${isErrorSimulated ? "text-red-400" : "text-cyan-400"}`} />
          <span className="text-xs font-mono font-bold tracking-wider uppercase">
            {notification}
          </span>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-900">
        
        {/* Left Side: Title */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Monitor className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-[0.15em] text-slate-100 uppercase">
              DENS CAKRA COMMAND CENTER
            </h1>
            <p className="text-[10px] text-slate-500 tracking-[0.2em] font-mono mt-1 uppercase">
              National Monitoring &amp; Situational Awareness Center
            </p>
          </div>
        </div>

        {/* Center Side: Live Clock Widget */}
        <div className="flex flex-col items-center justify-center bg-[#070E1A]/80 border border-slate-850 px-6 py-2 rounded-xl text-center shrink-0">
          <span className="text-xl md:text-2xl font-bold font-mono text-emerald-400 tracking-widest drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">
            {time || "18.09.58"}
          </span>
          <span className="text-[9px] font-mono text-slate-500 tracking-wider uppercase mt-0.5">
            {date || "SEL, 7 JUL 2026"}
          </span>
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <Button
            onClick={() => showNotify("Fitur Filter diaktifkan.")}
            variant="outline"
            className="border-slate-800 bg-[#060A11] text-slate-300 text-xs font-mono uppercase h-10 px-4 gap-2"
          >
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Filter</span>
          </Button>

          <Button
            onClick={triggerErrorSimulation}
            className={`font-mono text-xs tracking-wider uppercase h-10 px-4 transition-all border ${
              isErrorSimulated
                ? "bg-red-500 hover:bg-red-400 text-slate-950 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                : "bg-red-950/20 hover:bg-red-950/40 text-red-400 border-red-500/30"
            }`}
          >
            {isErrorSimulated ? "Matikan Galat" : "Simulasi Galat"}
          </Button>

          <div className="flex items-center gap-2 border border-blue-500/30 bg-blue-500/10 rounded-lg px-3.5 py-2.5 text-blue-400 font-mono text-[9px] font-bold uppercase tracking-wider">
            <span>Keluar Videowall</span>
          </div>
        </div>
      </div>

      {/* ROW 1: SATELLITE MONITOR & STATISTIK NASIONAL (8/12 vs 4/12 Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mb-6">
        
        {/* Left Section: Map (Width 8/12 - Very Wide & Roomy) */}
        <div className="lg:col-span-8 border border-slate-800/85 bg-[#0B111D]/90 rounded-2xl p-5 flex flex-col shadow-xl relative overflow-hidden">
          {isErrorSimulated && (
            <div className="absolute inset-0 border-2 border-red-500 pointer-events-none animate-pulse z-20" />
          )}

          <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-4 z-10">
            <div className="flex items-center gap-2 text-cyan-400">
              <Wifi className="w-4 h-4 animate-ping" />
              <span className="text-[10px] font-mono font-bold tracking-[0.15em] text-slate-100 uppercase">
                Sat-Com Terhubung
              </span>
            </div>
            <span className="text-[9px] font-mono text-cyan-400 uppercase bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded font-bold">
              Online
            </span>
          </div>

          {/* Map Container */}
          <div className="bg-[#050A10] border border-slate-850 rounded-xl h-[335px] p-2 relative overflow-hidden">
            <MapIndonesia />
            
            {/* Coordinate Overlay */}
            <div className="absolute bottom-3 right-3 bg-slate-900/90 border border-slate-800 p-2 rounded font-mono text-[8px] text-slate-400 text-right">
              <div>COORD: 118.0149° E, 2.5489° S</div>
              <div className="mt-0.5 text-cyan-400 font-semibold">ELEV: 38,880 FT (SAT)</div>
            </div>
          </div>
        </div>

        {/* Right Section: Statistik Nasional (Width 4/12 - Perfectly Balanced) */}
        <div className="lg:col-span-4 border border-slate-800/85 bg-[#0B111D]/90 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-[0.15em] text-slate-400 uppercase border-b border-slate-850 pb-3 mb-4 flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <span>Statistik Nasional</span>
            </span>

            {/* Grid 2x2 */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-[#060A11] p-3 rounded-xl border border-slate-850">
                <span className="text-[8px] font-mono text-slate-500 uppercase">Personel Aktif</span>
                <div className="text-xl font-bold font-mono text-cyan-400 mt-1">0</div>
              </div>
              <div className="bg-[#060A11] p-3 rounded-xl border border-slate-850">
                <span className="text-[8px] font-mono text-slate-500 uppercase">Laporan Hari Ini</span>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-1">0</div>
              </div>
              <div className="bg-[#060A11] p-3 rounded-xl border border-slate-850">
                <span className="text-[8px] font-mono text-slate-500 uppercase">Prioritas</span>
                <div className="text-xl font-bold font-mono text-amber-400 mt-1">0</div>
              </div>
              <div className="bg-[#060A11] p-3 rounded-xl border border-slate-850">
                <span className="text-[8px] font-mono text-slate-500 uppercase">Darurat</span>
                <div className="text-xl font-bold font-mono text-red-500 mt-1">0</div>
              </div>
            </div>
          </div>

          {/* Sub-grid Level Cases */}
          <div className="grid grid-cols-4 gap-2 text-center text-[9px] font-mono pt-1">
            <div className="bg-red-500/10 border border-red-500/20 py-2.5 rounded-lg">
              <span className="text-red-400 font-bold block text-xs">0</span>
              <span className="text-slate-500 text-[8px] mt-0.5 block uppercase font-semibold">Kritis</span>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 py-2.5 rounded-lg">
              <span className="text-amber-400 font-bold block text-xs">0</span>
              <span className="text-slate-500 text-[8px] mt-0.5 block uppercase font-semibold">Waspada</span>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 py-2.5 rounded-lg">
              <span className="text-blue-400 font-bold block text-xs">0</span>
              <span className="text-slate-500 text-[8px] mt-0.5 block uppercase font-semibold">Perhatian</span>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 py-2.5 rounded-lg">
              <span className="text-emerald-400 font-bold block text-xs">0</span>
              <span className="text-slate-500 text-[8px] mt-0.5 block uppercase font-semibold">Normal</span>
            </div>
          </div>
        </div>

      </div>

      {/* ROW 2: HEATMAP, KPI, & FEEDS (Three equal columns: 4/12 + 4/12 + 4/12) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Heatmap Aktivitas Regional */}
        <div className="border border-slate-800/80 bg-[#0B111D]/90 rounded-2xl p-5 flex flex-col shadow-xl">
          <span className="text-[10px] font-mono font-bold tracking-[0.15em] text-slate-400 uppercase border-b border-slate-850 pb-2.5 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Heatmap Aktivitas Regional</span>
          </span>

          <div className="grid grid-cols-5 gap-2.5 font-mono text-[10px] font-bold text-center">
            {[
              { name: "AC", color: "bg-amber-500/15 border-amber-500/30 text-amber-400" },
              { name: "SU", color: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" },
              { name: "SB", color: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" },
              { name: "RI", color: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" },
              { name: "KR", color: "bg-cyan-500/15 border-cyan-500/30 text-cyan-400" },
              { name: "JA", color: "bg-cyan-500/15 border-cyan-500/30 text-cyan-400" },
              { name: "SS", color: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" },
              { name: "BE", color: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" },
              { name: "LA", color: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" },
              { name: "BB", color: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" },
            ].map((reg, i) => (
              <div
                key={i}
                className={`py-3.5 rounded-lg border cursor-pointer hover:scale-105 transition-all ${reg.color}`}
                onClick={() => showNotify(`Memindai regional: ${reg.name}`)}
              >
                {reg.name}
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Indeks Kinerja (KPI) */}
        <div className="border border-slate-800/80 bg-[#0B111D]/90 rounded-2xl p-5 flex flex-col shadow-xl gap-4">
          <div className="flex items-center justify-between border-b border-slate-850 pb-2.5">
            <span className="text-[10px] font-mono font-bold tracking-[0.15em] text-slate-400 uppercase flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>Indeks Kinerja (KPI)</span>
            </span>
            <span className="text-xs font-mono font-bold text-slate-500">
              --
            </span>
          </div>

          <div className="flex flex-col items-center justify-center py-6 text-center">
            <TrendingUp className="w-6 h-6 text-slate-700 mb-2" />
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Belum ada data KPI</span>
          </div>
        </div>

        {/* Card 3: Peringatan & Feed Insiden Langsung (Merged & Spacious) */}
        <div className="border border-slate-800/80 bg-[#0B111D]/90 rounded-2xl p-5 flex flex-col shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-850 pb-2.5 mb-4">
            <span className="text-[10px] font-mono font-bold tracking-[0.15em] text-slate-400 uppercase flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              <span>Feed &amp; Peringatan Aktif</span>
            </span>
            <button
              onClick={() => showNotify("Semua feed dibersihkan.")}
              className="text-[8px] font-mono text-slate-500 hover:text-slate-350 uppercase"
            >
              Kosongkan
            </button>
          </div>

          {/* Combined Scrollable Feed List */}
          <div className="flex flex-col gap-3.5 max-h-[175px] overflow-y-auto pr-1">
            {isErrorSimulated && (
              <div className="border-l-2 border-red-500 pl-3 py-0.5 text-xs font-mono text-slate-250 animate-pulse">
                <div className="flex items-center justify-between text-[9px] font-bold text-red-500 mb-1">
                  <span>MALWARE DETECTED • NATUNA</span>
                  <span>BARU SAJA</span>
                </div>
                <p className="leading-relaxed">
                  Kebocoran data terdeteksi pada terminal relay satelit Sektor Timur.
                </p>
              </div>
            )}

            {!isErrorSimulated && (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <Radio className="w-5 h-5 text-slate-700 mb-2" />
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Belum ada feed insiden</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Intelligence Scrolling Ticker along the bottom */}
      <div className="w-full bg-[#070D18] border border-slate-900 rounded-xl p-3.5 mt-6 relative overflow-hidden flex items-center gap-4">
        {/* Ticker Tag */}
        <span className="text-[9px] font-mono text-cyan-400 uppercase bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded shrink-0 font-bold select-none flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Ticker Intelijen</span>
        </span>

        {/* Scrolling text */}
        <div className="flex-1 overflow-hidden relative w-full font-mono text-xs text-slate-400 flex items-center select-none">
          <div className="animate-marquee whitespace-nowrap flex items-center gap-12">
            <span>DENS CAKRA COMMAND CENTER — MENUNGGU UMPAN DATA INTELIJEN...</span>
            <span>SISTEM PEMANTAUAN NASIONAL AKTIF — SIAP MENERIMA DATA...</span>
          </div>
        </div>

        {/* System Code Tag */}
        <span className="text-[9px] font-mono text-slate-600 shrink-0 select-none">
          /// [14:32:05]
        </span>
      </div>

    </div>
  );
}
