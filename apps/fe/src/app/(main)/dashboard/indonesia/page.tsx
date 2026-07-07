"use client";

import { useEffect, useState } from "react";

import dynamic from "next/dynamic";
import Image from "next/image";

import { Activity, AlertTriangle, Filter, Globe, Layers, Radio, Terminal } from "lucide-react";

// Dynamically import MapIndonesia with SSR disabled
const MapIndonesia = dynamic(() => import("@/components/MapIndonesia"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center gap-3 h-full min-h-[400px] bg-[#090E17]">
      <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      <span className="text-[10px] text-cyan-400 tracking-[0.2em] uppercase font-mono animate-pulse">
        Menghubungkan Satelit...
      </span>
    </div>
  ),
});

const INTEL_TICKER_MESSAGES = [
  "/// [STATUS] DENS CAKRA ENGINE ONLINE // MENUNGGU TRANSMISI DATA LAPORAN DARI WILAYAH",
  "/// [SINKRONISASI] DATABASE PUSAT MARKAS BESAR TERHUBUNG PENUH",
  "/// [JARINGAN] SALURAN ENKRIPSI AMAN AKTIF // SIGINT: STANDBY",
  "/// [PETA] MODUL VEKTOR DAN LAYER GEOMETRIS OPERASIONAL",
  "/// [SISTEM] MENUNGGU ALIRAN LAPORAN MASUK DARI PERSONEL LAPANGAN ///",
] as const;

export default function CommandCenterPage() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  // Live clock matching format: 11.07.10 SEL, 7 JUL 2026
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      // Formatting time: hh.mm.ss
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      setTime(`${hh}.${mm}.${ss}`);

      // Formatting date: HARI, D MMM YYYY
      const days = ["MIN", "SEN", "SEL", "RAB", "KAM", "JUM", "SAB"];
      const months = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];

      const dayName = days[now.getDay()];
      const dayNum = now.getDate();
      const monthName = months[now.getMonth()];
      const year = now.getFullYear();

      setDate(`${dayName}, ${dayNum} ${monthName} ${year}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      data-content-padding="false"
      className="flex flex-col h-[calc(100vh-48px)] bg-[#03070C] text-slate-350 font-mono overflow-hidden select-none"
    >
      {/* Top Header videowall panel */}
      <div className="flex items-center justify-between border-b border-slate-900 bg-[#070D16] px-4 py-2.5 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden p-0.5 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
            <Image
              src="/logo-badan-intelijen-negara.png"
              alt="Logo BIN"
              width={36}
              height={36}
              className="object-contain scale-110"
            />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-[0.25em] text-cyan-400 uppercase leading-none">
              DENS CAKRA COMMAND CENTER
            </h1>
            <p className="text-[8px] text-slate-500 tracking-[0.18em] uppercase mt-1 leading-none">
              National Monitoring &amp; Situational Awareness Center {"// "}
              <span className="italic font-serif text-[9px] text-slate-650">Velox Et Exactus</span>
            </p>
          </div>
        </div>

        {/* Live Clock HUD */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-lg font-bold tracking-widest text-emerald-400 font-mono leading-none drop-shadow-[0_0_6px_rgba(52,211,153,0.3)]">
              {time || "00.00.00"}
            </div>
            <div className="text-[8px] tracking-wider text-slate-500 uppercase mt-1 leading-none">
              {date || "SEL, 7 JUL 2026"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 border border-slate-800 bg-[#0B121E] hover:bg-slate-800 text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded text-[9px] tracking-widest uppercase transition-colors"
              disabled
            >
              <Filter className="w-3 h-3 text-cyan-500" /> Filter
            </button>
            <button
              className="flex items-center gap-1.5 border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded text-[9px] tracking-widest uppercase transition-colors"
              disabled
            >
              Simulasi Galat
            </button>
            <button
              className="flex items-center gap-1.5 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 px-3 py-1.5 rounded text-[9px] tracking-widest uppercase transition-colors"
              disabled
            >
              Keluar Videowall
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div className="flex-1 grid grid-cols-12 gap-2 p-2 min-h-0">
        {/* Left Column (Width 3/12) */}
        <div className="col-span-3 flex flex-col gap-2 min-h-0">
          {/* Statistik Nasional Card */}
          <div className="border border-slate-900 bg-[#060B12]/80 backdrop-blur rounded-lg p-3.5 flex flex-col shrink-0">
            <div className="flex items-center gap-2 text-cyan-400 border-b border-slate-900 pb-2 mb-3">
              <Activity className="w-3.5 h-3.5" />
              <span className="text-[10px] tracking-widest uppercase font-bold">Statistik Nasional</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-[#0A1019] border border-slate-900/60 rounded p-2.5 flex flex-col justify-between">
                <span className="text-[7.5px] uppercase tracking-wider text-slate-500">Personel Aktif</span>
                <span className="text-xl font-bold text-cyan-400 tracking-wider">-</span>
              </div>
              <div className="bg-[#0A1019] border border-slate-900/60 rounded p-2.5 flex flex-col justify-between">
                <span className="text-[7.5px] uppercase tracking-wider text-slate-500">Laporan Hari Ini</span>
                <span className="text-xl font-bold text-emerald-400 tracking-wider">-</span>
              </div>
              <div className="bg-[#0A1019] border border-slate-900/60 rounded p-2.5 flex flex-col justify-between">
                <span className="text-[7.5px] uppercase tracking-wider text-slate-500">Prioritas</span>
                <span className="text-xl font-bold text-amber-500 tracking-wider">-</span>
              </div>
              <div className="bg-[#0A1019] border border-slate-900/60 rounded p-2.5 flex flex-col justify-between">
                <span className="text-[7.5px] uppercase tracking-wider text-slate-500">Darurat</span>
                <span className="text-xl font-bold text-red-500 tracking-wider">-</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1 text-center">
              <div className="bg-[#0C0F16] border border-slate-900 p-1.5 rounded">
                <div className="text-xs font-bold text-red-500">-</div>
                <div className="text-[6.5px] text-slate-500 tracking-wider uppercase font-semibold">Kritis</div>
              </div>
              <div className="bg-[#0C0F16] border border-slate-900 p-1.5 rounded">
                <div className="text-xs font-bold text-amber-500">-</div>
                <div className="text-[6.5px] text-slate-500 tracking-wider uppercase font-semibold">Waspada</div>
              </div>
              <div className="bg-[#0C0F16] border border-slate-900 p-1.5 rounded">
                <div className="text-xs font-bold text-cyan-500">-</div>
                <div className="text-[6.5px] text-slate-500 tracking-wider uppercase font-semibold">Perhatian</div>
              </div>
              <div className="bg-[#0C0F16] border border-slate-900 p-1.5 rounded">
                <div className="text-xs font-bold text-emerald-500">-</div>
                <div className="text-[6.5px] text-slate-500 tracking-wider uppercase font-semibold">Normal</div>
              </div>
            </div>
          </div>

          {/* Peringatan Aktif Card (Empty state) */}
          <div className="border border-slate-900 bg-[#060B12]/80 backdrop-blur rounded-lg p-3.5 flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-3">
              <div className="flex items-center gap-2 text-red-500">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="text-[10px] tracking-widest uppercase font-bold">Peringatan Aktif</span>
              </div>
              <span className="text-[7.5px] font-mono text-slate-600 uppercase font-semibold">KOSONGKAN</span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-900/60 rounded bg-slate-950/20 p-4">
              <Terminal className="w-6 h-6 text-slate-700 mb-2" />
              <p className="text-[9px] tracking-widest uppercase text-slate-500 text-center">
                Tidak ada peringatan aktif.
              </p>
            </div>
          </div>
        </div>

        {/* Center Column (Width 6/12) */}
        <div className="col-span-6 flex flex-col gap-2 min-h-0">
          {/* Main Map Box */}
          <div className="flex-1 border border-slate-900 bg-[#060B12]/80 rounded-lg overflow-hidden flex flex-col min-h-0 relative">
            <div className="absolute top-3 left-3 bg-slate-950/80 border border-slate-900 px-2 py-1 rounded text-[8px] font-mono text-slate-400 tracking-widest uppercase backdrop-blur-sm z-20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
              Sat-Com Terhubung
            </div>

            <div className="flex-1 bg-[#090E17] relative min-h-0">
              {/* Map grid pattern overlay */}
              <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(circle at center, #334155 1.5px, transparent 1.5px)",
                  backgroundSize: "20px 20px",
                }}
              />

              <div className="w-full h-full relative z-10">
                <MapIndonesia />
              </div>

              {/* Coordinates HUD overlay */}
              <div className="absolute bottom-3 right-3 bg-slate-950/80 border border-slate-900 rounded p-2 text-[8px] font-mono text-slate-500 backdrop-blur-sm z-20 text-right">
                <div>COORD: 115.0149 E, 2.5489 S</div>
                <div className="mt-0.5">ELEV: 35,680 FT (SIM)</div>
              </div>
            </div>
          </div>

          {/* Heatmap Aktivitas Regional Box */}
          <div className="border border-slate-900 bg-[#060B12]/80 rounded-lg p-3.5 shrink-0">
            <div className="flex items-center gap-2 text-cyan-400 border-b border-slate-900 pb-2 mb-3">
              <Layers className="w-3.5 h-3.5" />
              <span className="text-[10px] tracking-widest uppercase font-bold">Heatmap Aktivitas Regional</span>
            </div>

            {/* Grid items representing regions/bindas, neutrally styled for empty state */}
            <div className="grid grid-cols-10 gap-1.5 text-[9px] font-mono font-bold text-center">
              {[
                { name: "AC", label: "Aceh" },
                { name: "SU", label: "Sumut" },
                { name: "SB", label: "Sumbar" },
                { name: "RI", label: "Riau" },
                { name: "KR", label: "Kepri" },
                { name: "JA", label: "Jambi" },
                { name: "SS", label: "Sumsel" },
                { name: "BE", label: "Bengkulu" },
                { name: "LA", label: "Lampung" },
                { name: "BB", label: "Babel" },
              ].map((item) => (
                <div
                  key={item.name}
                  title={item.label}
                  className="bg-[#0A1019] border border-slate-900 text-slate-500 py-2 rounded select-none cursor-not-allowed transition-all"
                >
                  {item.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (Width 3/12) */}
        <div className="col-span-3 flex flex-col gap-2 min-h-0">
          {/* Indeks Kinerja (KPI) Card */}
          <div className="border border-slate-900 bg-[#060B12]/80 backdrop-blur rounded-lg p-3.5 flex flex-col shrink-0">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-3">
              <div className="flex items-center gap-2 text-cyan-400">
                <Globe className="w-3.5 h-3.5" />
                <span className="text-[10px] tracking-widest uppercase font-bold">Indeks Kinerja (KPI)</span>
              </div>
            </div>

            <div className="flex items-center justify-between bg-[#0A1019] border border-slate-900 rounded p-2.5 mb-3">
              <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">KPT Nasional</span>
              <span className="text-base font-bold text-emerald-400 font-mono drop-shadow-[0_0_4px_rgba(52,211,153,0.3)]">
                -%
              </span>
            </div>

            <div className="space-y-1.5">
              {[
                { rank: 1, name: "DKI Jakarta" },
                { rank: 2, name: "Jawa Barat" },
                { rank: 3, name: "Jawa Timur" },
                { rank: 4, name: "Bali" },
              ].map((item) => (
                <div
                  key={item.rank}
                  className="flex items-center justify-between bg-[#0C0F16] border border-slate-900 rounded px-2.5 py-1.5 text-[8.5px] text-slate-500"
                >
                  <div className="flex items-center gap-2">
                    <span>{item.rank}.</span>
                    <span className="text-slate-400">{item.name}</span>
                  </div>
                  <span>-</span>
                </div>
              ))}
            </div>
          </div>

          {/* Feed Insiden Langsung Card (Empty state) */}
          <div className="border border-slate-900 bg-[#060B12]/80 backdrop-blur rounded-lg p-3.5 flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-3">
              <div className="flex items-center gap-2 text-cyan-400">
                <Radio className="w-3.5 h-3.5" />
                <span className="text-[10px] tracking-widest uppercase font-bold">Feed Insiden Langsung</span>
              </div>
              <span className="text-[7.5px] font-mono text-slate-600 uppercase font-semibold">KOSONGKAN</span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-900/60 rounded bg-slate-950/20 p-4">
              <Terminal className="w-6 h-6 text-slate-700 mb-2" />
              <p className="text-[9px] tracking-widest uppercase text-slate-500 text-center">
                Tidak ada insiden dilaporkan.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Ticker Bar */}
      <div className="h-9 border-t border-slate-900 bg-[#040810] flex items-center justify-between px-4 shrink-0 text-[10px] tracking-wider z-20">
        <div className="flex items-center gap-2 text-cyan-400 border-r border-slate-900 pr-4 h-full shrink-0 font-bold">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span className="text-[8px] uppercase tracking-widest">Ticker Intelijen</span>
        </div>

        {/* Marquee effect for scrolling news feed */}
        <div className="flex-1 overflow-hidden relative mx-4 h-full flex items-center">
          <div className="animate-intel-marquee absolute flex items-center gap-12 whitespace-nowrap font-mono text-slate-400">
            {INTEL_TICKER_MESSAGES.map((message) => (
              <span key={message}>{message}</span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 border-l border-slate-900 pl-4 h-full shrink-0 font-mono text-emerald-500 font-bold">
          <span>///</span>
          <span className="text-[9px] tracking-widest uppercase">STATUS NORMAL</span>
        </div>
      </div>
    </div>
  );
}
