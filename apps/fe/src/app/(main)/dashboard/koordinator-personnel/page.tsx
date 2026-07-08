"use client";

import React, { useState } from "react";
import {
  Users,
  ShieldAlert,
  MapPin,
  Signal,
  Send,
  History,
  CheckCircle2,
  AlertTriangle,
  Search,
  Radar,
  Shield,
  Terminal,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PersonnelItem {
  id: string;
  sandi: string;
  pangkat: string;
  lokasi: string;
  sektor: string;
  status: "AKTIF" | "SIAGA" | "OFFLINE";
  sinyal: "OPTIMAL" | "LEMAH" | "HILANG";
  tugasTerakhir: string;
  lastPing: string;
  logAktif: string[];
}

const INITIAL_PERSONNEL: PersonnelItem[] = [];

export default function PersonnelPage() {
  const [personnel, setPersonnel] = useState<PersonnelItem[]>(INITIAL_PERSONNEL);
  const [selectedId, setSelectedId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"DAFTAR" | "RADAR">("DAFTAR");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [notification, setNotification] = useState<string | null>(null);

  const selectedAgent = personnel.find((x) => x.id === selectedId) || personnel[0] || null;

  const showNotify = (text: string) => {
    setNotification(text);
    setTimeout(() => setNotification(null), 3000);
  };

  const handlePing = (agent: PersonnelItem) => {
    showNotify(`Mengirim sinyal ping ke enkripsi transponder ${agent.sandi}...`);
    setTimeout(() => {
      setPersonnel((prev) =>
        prev.map((x) =>
          x.id === agent.id
            ? {
                ...x,
                sinyal: x.status === "OFFLINE" ? "HILANG" : "OPTIMAL",
                lastPing: "Baru saja",
              }
            : x
        )
      );
      showNotify(`Koneksi dengan ${agent.sandi} terverifikasi: ${agent.status === "OFFLINE" ? "LOST" : "ONLINE"}`);
    }, 1500);
  };

  const handleSendInstruction = (agent: PersonnelItem) => {
    const inst = prompt(`Kirim instruksi lapangan baru untuk ${agent.sandi}:`);
    if (inst && inst.trim()) {
      setPersonnel((prev) =>
        prev.map((x) =>
          x.id === agent.id
            ? {
                ...x,
                tugasTerakhir: inst,
                lastPing: "Baru saja",
                logAktif: [`${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} - Instruksi Koordinator: ${inst}`, ...x.logAktif],
              }
            : x
        )
      );
      showNotify(`Instruksi operasional berhasil dienkripsi & dikirim ke ${agent.sandi}!`);
    }
  };

  const filteredPersonnel = personnel.filter((item) => {
    const matchesSearch =
      item.sandi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.lokasi.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col min-h-screen bg-[#050A10] text-slate-350 font-sans p-3 lg:p-6 overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3.5 rounded-lg border bg-cyan-950/95 border-cyan-500/60 text-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.35)] flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-cyan-400" />
          <span className="text-xs font-mono font-bold tracking-wider uppercase">
            {notification}
          </span>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-900">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-[0.15em] text-slate-100 uppercase">
            Monitoring Personel Wilayah
          </h1>
          <p className="text-[10px] text-slate-500 tracking-[0.2em] font-mono mt-1.5 uppercase">
            Sektor Situasional &amp; Pelacakan Operatif Jawa Barat
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-2 border border-emerald-500/30 bg-emerald-500/10 rounded px-3.5 py-2 text-emerald-400 font-mono text-[10px] font-bold uppercase shadow-[0_0_12px_rgba(16,185,129,0.15)]">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Sinkronisasi Satelit Aktif</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Personel", value: personnel.length, color: "text-cyan-400", bg: "bg-cyan-500/10", icon: Users },
          { label: "Aktif / Online", value: personnel.filter(x => x.status === "AKTIF").length, color: "text-emerald-400", bg: "bg-emerald-500/10", icon: Shield },
          { label: "Siaga / Standby", value: personnel.filter(x => x.status === "SIAGA").length, color: "text-amber-400", bg: "bg-amber-500/10", icon: Radar },
          { label: "Kontak Hilang", value: personnel.filter(x => x.status === "OFFLINE").length, color: "text-red-400", bg: "bg-red-500/10", icon: ShieldAlert },
        ].map((card, i) => (
          <div key={i} className="border border-slate-800 bg-[#0B111D]/80 rounded-xl p-4.5 flex flex-col justify-between hover:border-slate-700 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[9px] uppercase tracking-[0.15em] font-mono text-slate-500">{card.label}</span>
              <div className={`p-1.5 rounded border border-slate-800/80 ${card.bg} ${card.color}`}>
                <card.icon className="w-4 h-4" />
              </div>
            </div>
            <h2 className={`text-2xl font-bold font-mono ${card.color}`}>{card.value}</h2>
          </div>
        ))}
      </div>

      {/* Tabs Control Row */}
      <div className="flex border-b border-slate-900 mb-6 text-[10px] font-mono tracking-widest uppercase gap-2">
        <button
          onClick={() => setActiveTab("DAFTAR")}
          className={`flex items-center gap-2 px-5 py-2.5 border-b-2 transition-all ${
            activeTab === "DAFTAR"
              ? "border-cyan-500 text-cyan-400 bg-cyan-500/5 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Daftar Personel</span>
        </button>
        <button
          onClick={() => setActiveTab("RADAR")}
          className={`flex items-center gap-2 px-5 py-2.5 border-b-2 transition-all ${
            activeTab === "RADAR"
              ? "border-cyan-500 text-cyan-400 bg-cyan-500/5 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          <Radar className="w-3.5 h-3.5" />
          <span>Radar Satelit Wilayah</span>
        </button>
      </div>

      {/* TAB CONTENT: DAFTAR PERSONEL */}
      {activeTab === "DAFTAR" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Personnel Grid Deck (5/12 Width) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            
            {/* Search/Filter Box */}
            <div className="border border-slate-800 bg-[#0B111D]/90 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Cari sandi, ID, lokasi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#060A11] border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs font-mono text-slate-350 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#060A11] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-350 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="AKTIF">🟢 AKTIF</option>
                  <option value="SIAGA">🟡 SIAGA</option>
                  <option value="OFFLINE">🔴 OFFLINE</option>
                </select>
              </div>
            </div>

            {/* List Deck */}
            <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
              {filteredPersonnel.map((agent) => {
                const isSelected = agent.id === selectedId;
                
                return (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedId(agent.id)}
                    className={`border rounded-xl p-4 cursor-pointer transition-all duration-300 flex flex-col gap-3 relative ${
                      isSelected
                        ? "bg-slate-900/60 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                        : "border-slate-800/80 bg-[#0B111D]/80 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-cyan-400">{agent.id}</span>
                        <span className="text-[9px] text-slate-500 font-mono">• {agent.sektor}</span>
                      </div>

                      {/* Status badge */}
                      <span
                        className={`px-2 py-0.5 rounded text-[8px] tracking-widest font-mono font-bold uppercase border ${
                          agent.status === "AKTIF"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                            : agent.status === "SIAGA"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : "bg-red-500/10 text-red-400 border-red-500/30"
                        }`}
                      >
                        {agent.status}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold text-slate-100 font-mono">{agent.sandi}</h3>
                      <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-wider font-mono flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-600" />
                        {agent.lokasi}
                      </p>
                    </div>

                    {/* Sinyal gauge */}
                    <div className="flex items-center justify-between text-[9px] font-mono border-t border-slate-850/40 pt-2">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Signal className="w-3.5 h-3.5" />
                        <span>Sinyal: {agent.sinyal}</span>
                      </span>
                      <span className="text-slate-500">Ping: {agent.lastPing}</span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Right Column: Active Agent Detail Workspace (7/12 Width) */}
          <div className="lg:col-span-7 border border-slate-800 bg-[#0B111D]/90 rounded-2xl p-5 md:p-6 flex flex-col shadow-xl gap-5">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-850">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded">
                    {selectedAgent.id}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {selectedAgent.pangkat}
                  </span>
                </div>
                <h2 className="text-sm md:text-base font-bold font-mono text-slate-100 uppercase tracking-wide mt-2">
                  {selectedAgent.sandi}
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 rounded text-[10px] font-mono tracking-widest font-bold uppercase border bg-slate-900 border-slate-800">
                  {selectedAgent.sektor}
                </span>
              </div>
            </div>

            {/* Sinyal & Status Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#060A11] p-4 rounded-xl border border-slate-850">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-mono text-slate-500 uppercase font-semibold">Status Operatif</span>
                <span className={`text-xs font-bold font-mono uppercase mt-1 flex items-center gap-2 ${
                  selectedAgent.status === "AKTIF" ? "text-emerald-400" : selectedAgent.status === "SIAGA" ? "text-amber-400" : "text-red-400"
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    selectedAgent.status === "AKTIF" ? "bg-emerald-500 animate-pulse" : selectedAgent.status === "SIAGA" ? "bg-amber-500" : "bg-red-500"
                  }`} />
                  {selectedAgent.status}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-mono text-slate-500 uppercase font-semibold">Koneksi Satelit</span>
                <span className={`text-xs font-bold font-mono uppercase mt-1 flex items-center gap-1.5 ${
                  selectedAgent.sinyal === "OPTIMAL" ? "text-cyan-400" : selectedAgent.sinyal === "LEMAH" ? "text-amber-400" : "text-red-400"
                }`}>
                  <Signal className="w-4 h-4 shrink-0" />
                  {selectedAgent.sinyal === "OPTIMAL" ? "Optimal (Transponder 24/7)" : selectedAgent.sinyal === "LEMAH" ? "Sinyal Lemah / Berawan" : "Terputus / Lost Contact"}
                </span>
              </div>
            </div>

            {/* Tugas Terakhir */}
            <div className="bg-[#060A11] p-4 rounded-xl border border-slate-850">
              <div className="text-[10px] font-mono text-slate-500 uppercase font-semibold mb-2 tracking-wider">
                Tugas Operasional Saat Ini
              </div>
              <p className="text-xs font-mono text-slate-200 font-bold leading-relaxed">
                {selectedAgent.tugasTerakhir}
              </p>
            </div>

            {/* Log Aktif / Komunikasi */}
            <div className="bg-[#060A11] p-4 rounded-xl border border-slate-850">
              <div className="text-[10px] font-mono text-slate-500 uppercase font-semibold mb-3 tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>Log Aktivitas Lapangan</span>
              </div>
              
              <div className="flex flex-col gap-2.5 font-mono text-xs">
                {selectedAgent.logAktif.map((log, i) => (
                  <div key={i} className="text-slate-350 border-l-2 border-slate-800 pl-3.5 py-0.5">
                    {log}
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-850 gap-3">
              <Button
                onClick={() => handlePing(selectedAgent)}
                variant="outline"
                className="border-slate-800 bg-[#060A11] text-slate-300 text-xs font-mono uppercase h-10 px-4 gap-2"
              >
                <RefreshCw className="w-4 h-4 text-slate-500 animate-spin-slow" />
                <span>Ping Sinyal</span>
              </Button>

              <Button
                onClick={() => handleSendInstruction(selectedAgent)}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs tracking-wider uppercase h-10 px-5 gap-2 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              >
                <Send className="w-4 h-4 stroke-[2.5]" />
                <span>Kirim Instruksi Lapangan</span>
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* TAB CONTENT: RADAR SATELIT */}
      {activeTab === "RADAR" && (
        <div className="border border-slate-800 bg-[#0B111D]/90 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[500px] text-center relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: "radial-gradient(circle at center, #22d3ee 2px, transparent 2px)",
              backgroundSize: "32px 32px"
            }}
          />

          {/* High Tech Radar Screen */}
          <div className="w-72 h-72 rounded-full border-2 border-cyan-500/25 relative flex items-center justify-center shadow-[0_0_60px_rgba(34,211,238,0.08)] bg-slate-950/80 mb-6 group overflow-hidden">
            {/* Pulsing Sweep Lines */}
            <div className="w-full h-full rounded-full absolute border border-cyan-500/10 scale-75 animate-ping duration-3000" />
            <div className="w-full h-full rounded-full absolute border border-cyan-500/10 scale-50" />
            <div className="w-full h-full rounded-full absolute border border-cyan-500/15 scale-25" />
            
            {/* Scanning Radar Bar */}
            <div className="absolute top-1/2 left-1/2 w-[144px] h-[2px] bg-gradient-to-r from-transparent to-cyan-400 origin-left -translate-y-1/2 rotate-0 animate-spin-radar" />

            {/* Radar dots for personnel */}
            {personnel.map((agent, i) => {
              const offsets = [
                { top: "30%", left: "40%" }, // Bandung
                { top: "25%", left: "20%" }, // Bogor
                { top: "60%", left: "70%" }, // Cirebon
                { top: "18%", left: "28%" }, // Depok
                { top: "75%", left: "55%" }, // Garut
              ];
              const pos = offsets[i] || { top: "50%", left: "50%" };
              
              return (
                <div
                  key={agent.id}
                  style={{ top: pos.top, left: pos.left }}
                  title={`${agent.sandi} - ${agent.lokasi}`}
                  className="absolute cursor-pointer group"
                  onClick={() => {
                    setSelectedId(agent.id);
                    setActiveTab("DAFTAR");
                    showNotify(`Membuka berkas operatif ${agent.sandi}`);
                  }}
                >
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border border-[#050A10] relative shadow ${
                    agent.status === "AKTIF" ? "bg-emerald-500" : agent.status === "SIAGA" ? "bg-amber-500" : "bg-red-500"
                  }`}>
                    {agent.status === "AKTIF" && (
                      <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping absolute" />
                    )}
                  </span>
                  
                  {/* Hover Tag */}
                  <span className="absolute left-5 -top-1 bg-slate-900/95 border border-slate-700/80 text-[9px] font-mono px-2 py-0.5 rounded text-slate-100 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
                    {agent.sandi} ({agent.id})
                  </span>
                </div>
              );
            })}
          </div>

          <h3 className="text-sm font-bold font-mono text-slate-100 uppercase tracking-widest mb-1.5">
            Peta Satelit Radar Operatif Jawa Barat
          </h3>
          <p className="text-xs font-mono text-slate-500 max-w-md leading-relaxed">
            Menampilkan data telemetri, geolokasi transponder aktif, dan daya pancar sinyal operatif di lapangan secara real-time.
          </p>
        </div>
      )}

    </div>
  );
}
