"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Filter,
  CheckCircle2,
  TrendingUp,
  Search,
  Calendar,
  Layers,
  Database,
  Radio,
  FileDown,
  RefreshCw,
  EyeOff,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AlertItem {
  id: string;
  level: "KRITIS" | "WASPADA" | "INFO";
  waktu: string;
  deskripsi: string;
  sumber: string;
  lokasi: string;
}

const INITIAL_ALERTS: AlertItem[] = [];

export default function AlertsPage() {
  const [alerts] = useState<AlertItem[]>(INITIAL_ALERTS);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("ALL");
  const [selectedSumber, setSelectedSumber] = useState<string>("ALL");
  const [selectedWilayah, setSelectedWilayah] = useState<string>("ALL");
  const [timeFilter, setTimeFilter] = useState("ALL");
  const [notification, setNotification] = useState<string | null>(null);

  const showNotify = (text: string) => {
    setNotification(text);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleReset = () => {
    setSearchQuery("");
    setSelectedLevel("ALL");
    setSelectedSumber("ALL");
    setSelectedWilayah("ALL");
    setTimeFilter("ALL");
    showNotify("Filter berhasil di-reset!");
  };

  const handleApplyFilter = () => {
    setShowFilterPanel(false);
    showNotify("Filter berhasil diterapkan!");
  };

  const filteredAlerts = alerts.filter((item) => {
    const matchesSearch =
      item.deskripsi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = selectedLevel === "ALL" || item.level === selectedLevel;
    const matchesSumber = selectedSumber === "ALL" || item.sumber === selectedSumber;
    const matchesWilayah =
      selectedWilayah === "ALL" || item.lokasi.toLowerCase().includes(selectedWilayah.toLowerCase());
    return matchesSearch && matchesLevel && matchesSumber && matchesWilayah;
  });

  return (
    <div className="flex flex-col min-h-screen bg-[#050A10] text-slate-300 font-sans p-4 lg:p-6 overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3.5 rounded-lg border bg-cyan-950/95 border-cyan-500/60 text-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.35)] flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-cyan-400" />
          <span className="text-xs font-mono font-bold tracking-wider uppercase">
            {notification}
          </span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-900">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mt-1 shrink-0">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-[0.15em] text-slate-100 uppercase flex items-center gap-2">
              <span>DENS CAKRA EARLY WARNING CENTER</span>
            </h1>
            <p className="text-[10px] text-slate-500 tracking-[0.2em] font-mono mt-1 uppercase">
              National Alert &amp; Incident Monitoring System
            </p>
          </div>
        </div>

        {/* Action Controls (Filter & DEFCON Status) */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <Button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            variant="outline"
            className={`border-slate-800 text-xs font-mono tracking-wider uppercase h-10 px-4.5 gap-2 transition-all ${
              showFilterPanel
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                : "bg-slate-900/60 hover:bg-slate-800 text-slate-200"
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </Button>

          <div className="flex items-center gap-2.5 font-mono text-[10px] bg-red-950/60 border border-red-500/30 px-4 py-2.5 rounded-lg text-red-400 uppercase font-bold shadow-[0_0_15px_rgba(239,68,68,0.15)]">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>DEFCON 3</span>
          </div>
        </div>
      </div>

      {/* FILTER DATA LANJUTAN PANEL */}
      {showFilterPanel && (
        <div className="border border-cyan-500/30 bg-[#0B1220]/95 rounded-2xl p-5 md:p-6 shadow-[0_0_35px_rgba(6,182,212,0.15)] mb-6 flex flex-col gap-5 animate-in fade-in slide-in-from-top-4 duration-300 relative">
          
          {/* Header Row */}
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
            <div className="flex items-center gap-2 text-cyan-400">
              <SlidersHorizontal className="w-4 h-4" />
              <span className="text-xs font-mono font-bold tracking-[0.15em] uppercase">
                Filter Data Lanjutan
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
              <button onClick={() => showNotify("Data dimuat.")} className="hover:text-cyan-400 transition-colors">Muat</button>
              <span>•</span>
              <button onClick={() => showNotify("Konfigurasi disimpan.")} className="hover:text-cyan-400 transition-colors">Simpan</button>
              <span>•</span>
              <button
                onClick={() => setShowFilterPanel(false)}
                className="hover:text-red-400 transition-colors flex items-center gap-1.5"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Sembunyikan</span>
              </button>
            </div>
          </div>

          {/* Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            
            {/* Pencarian */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-mono text-slate-500 uppercase font-semibold">Pencarian</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Cari ID, deskripsi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#060A11] border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"
                />
              </div>
            </div>

            {/* Tanggal */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-mono text-slate-500 uppercase font-semibold">Tanggal</label>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="w-full bg-[#060A11] border border-slate-800 rounded-lg px-3 py-2.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer shadow-inner"
              >
                <option value="ALL">Pilih Waktu</option>
                <option value="TODAY">Hari Ini</option>
                <option value="WEEK">7 Hari Terakhir</option>
                <option value="MONTH">30 Hari Terakhir</option>
              </select>
            </div>

            {/* Level Alert */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-mono text-slate-500 uppercase font-semibold">Level Alert</label>
              <div className="flex items-center gap-1.5 h-10">
                {["KRITIS", "WASPADA", "INFO"].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setSelectedLevel(selectedLevel === lvl ? "ALL" : lvl)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase transition-all border ${
                      selectedLevel === lvl
                        ? lvl === "KRITIS"
                          ? "bg-red-500/20 text-red-400 border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                          : lvl === "WASPADA"
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/60"
                          : "bg-blue-500/20 text-blue-400 border-blue-500/60"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Sumber */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-mono text-slate-500 uppercase font-semibold">Sumber</label>
              <select
                value={selectedSumber}
                onChange={(e) => setSelectedSumber(e.target.value)}
                className="w-full bg-[#060A11] border border-slate-800 rounded-lg px-3 py-2.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer shadow-inner"
              >
                <option value="ALL">Semua</option>
                <option value="SIGINT">SIGINT</option>
                <option value="HUMINT">HUMINT</option>
                <option value="OSINT">OSINT</option>
                <option value="SIBER">SIBER</option>
              </select>
            </div>

            {/* Wilayah */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-mono text-slate-500 uppercase font-semibold">Wilayah</label>
              <select
                value={selectedWilayah}
                onChange={(e) => setSelectedWilayah(e.target.value)}
                className="w-full bg-[#060A11] border border-slate-800 rounded-lg px-3 py-2.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer shadow-inner"
              >
                <option value="ALL">Semua</option>
                <option value="DKI Jakarta">DKI Jakarta</option>
                <option value="Papua">Papua</option>
                <option value="Riau">Riau</option>
                <option value="Nasional">Nasional</option>
              </select>
            </div>

          </div>

          {/* Bottom Action Footer */}
          <div className="flex items-center justify-between border-t border-cyan-500/20 pt-4 mt-1">
            <span className="text-[10px] font-mono text-slate-500">
              {searchQuery || selectedLevel !== "ALL" || selectedSumber !== "ALL" || selectedWilayah !== "ALL"
                ? "Filter aktif diterapkan."
                : "Tidak ada filter aktif. Menampilkan semua data."}{" "}
              <span className="text-cyan-400 font-bold ml-1">{filteredAlerts.length} HASIL</span>
            </span>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => showNotify("Ekspor data diinisiasi...")}
                className="border-slate-800 bg-[#060A11] text-slate-300 text-xs font-mono h-9 px-3.5"
              >
                <FileDown className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                <span>Ekspor</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={handleReset}
                className="border-slate-800 bg-[#060A11] text-slate-300 text-xs font-mono h-9 px-3.5"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                <span>Reset</span>
              </Button>

              <Button
                onClick={handleApplyFilter}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs tracking-wider uppercase h-9 px-5 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
              >
                <span>Terapkan Filter</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN LAYOUT (2 Columns: List on Left, Status Dashboard on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: List of Alert Cards (8/12 Width) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {filteredAlerts.length === 0 ? (
            <div className="border border-dashed border-slate-800 bg-[#0B111D]/40 rounded-2xl p-12 text-center text-xs font-mono text-slate-500">
              Tidak ada peringatan dini aktif yang sesuai kriteria pencarian.
            </div>
          ) : (
            filteredAlerts.map((item) => (
              <div
                key={item.id}
                className={`border rounded-xl p-5 md:p-6 transition-all duration-300 relative overflow-hidden bg-[#0B111D]/90 group ${
                  item.level === "KRITIS"
                    ? "border-red-500/35 hover:border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.05)]"
                    : item.level === "WASPADA"
                    ? "border-amber-500/30 hover:border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.05)]"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* Top Row: ID, Time, Level */}
                <div className="flex items-center justify-between border-b border-slate-850/60 pb-3 mb-4.5">
                  <div className="flex items-center gap-3">
                    {/* Small Status Indicator Icon */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        item.level === "KRITIS"
                          ? "bg-red-500/10 border-red-500/20 text-red-500"
                          : item.level === "WASPADA"
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                          : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                      }`}
                    >
                      <AlertTriangle className={`w-4 h-4 ${item.level === "KRITIS" ? "animate-pulse" : ""}`} />
                    </div>

                    <div>
                      <span className="text-xs font-mono font-bold text-slate-200">
                        {item.id}
                      </span>
                      <span
                        className={`ml-2.5 px-2 py-0.5 rounded text-[8px] tracking-widest font-mono font-bold uppercase border ${
                          item.level === "KRITIS"
                            ? "bg-red-500/10 text-red-400 border-red-500/30"
                            : item.level === "WASPADA"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                        }`}
                      >
                        {item.level}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-slate-500">
                    {item.waktu}
                  </span>
                </div>

                {/* Description Body */}
                <p className="text-xs md:text-sm font-mono text-slate-100 font-semibold leading-relaxed mb-4.5 max-w-4xl">
                  {item.deskripsi}
                </p>

                {/* Footer Metadata */}
                <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500 pt-3 border-t border-slate-850/60">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600">SUMBER:</span>
                    <span className="text-cyan-400 font-bold">{item.sumber}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600">LOKASI:</span>
                    <span className="text-slate-300 font-semibold">{item.lokasi}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* RIGHT COLUMN: Status Dashboard (4/12 Width) */}
        <div className="lg:col-span-4 border border-slate-800 bg-[#0B111D]/90 rounded-2xl p-5 md:p-6 flex flex-col shadow-xl gap-6">
          <div className="flex items-center gap-2.5 border-b border-slate-850 pb-4">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            <span className="text-xs font-mono font-bold tracking-[0.2em] uppercase text-slate-100">
              Status Sistem
            </span>
          </div>

          <div className="flex flex-col gap-6.5">
            {/* Tingkat Ancaman */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-400 font-semibold uppercase tracking-wider">Tingkat Ancaman</span>
                <span className="text-amber-500 font-bold uppercase">Meningkat</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                <div className="h-full bg-amber-500 w-[65%] rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
              </div>
            </div>

            {/* Keamanan Jaringan */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-400 font-semibold uppercase tracking-wider">Keamanan Jaringan</span>
                <span className="text-emerald-400 font-bold uppercase">Aman</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                <div className="h-full bg-emerald-500 w-[92%] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              </div>
            </div>

            {/* Relai Komunikasi */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-400 font-semibold uppercase tracking-wider">Relai Komunikasi</span>
                <span className="text-cyan-400 font-bold uppercase">Optimal</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                <div className="h-full bg-cyan-500 w-[88%] rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
