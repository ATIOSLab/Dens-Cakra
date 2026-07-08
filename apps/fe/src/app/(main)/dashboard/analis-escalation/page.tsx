"use client";

import React, { useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Clock,
  User,
  Users,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  FileText,
  ChevronRight,
  Info,
  Layers,
  Search,
  Check,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimelineEvent {
  waktu: string;
  kegiatan: string;
  pic: string;
}

interface EscalationReport {
  id: string;
  judul: string;
  wilayah: string;
  kategori: string;
  prioritas: "KRITIS" | "WASPADA" | "PERHATIAN";
  status: "MENUNGGU KEPUTUSAN" | "DALAM PROSES" | "DISETUJUI" | "DIKEMBALIKAN";
  slaRemainingHours: number; // negative means overdue
  lastUpdate: string;
  riskScore: number; // 1-100
  impact: "TINGGI" | "SEDANG" | "RENDAH";
  urgency: "TINGGI" | "SEDANG" | "RENDAH";
  tujuan: string;
  rekomendasi: string[];
  pic: string;
  timeline: TimelineEvent[];
}

const MOCK_ESCALATIONS: EscalationReport[] = [];

export default function EscalationPage() {
  const [escalations, setEscalations] = useState<EscalationReport[]>(MOCK_ESCALATIONS);
  const [selectedId, setSelectedId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const selectedReport = escalations.find((x) => x.id === selectedId) || escalations[0] || null;

  const showToast = (text: string) => {
    setToastMsg(text);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Helper colors for priorities
  const getPriorityBadgeStyles = (priority: string) => {
    switch (priority) {
      case "KRITIS":
        return "bg-red-500/10 text-red-400 border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.25)]";
      case "WASPADA":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "PERHATIAN":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  // Helper colors for status
  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case "MENUNGGU KEPUTUSAN":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "DALAM PROSES":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.15)]";
      case "DISETUJUI":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]";
      case "DIKEMBALIKAN":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  // Actions
  const handleAssignPIC = () => {
    const newPIC = prompt("Masukkan nama PIC baru:", selectedReport.pic);
    if (newPIC && newPIC.trim()) {
      setEscalations((prev) =>
        prev.map((x) =>
          x.id === selectedReport.id ? { ...x, pic: newPIC, lastUpdate: "Baru saja" } : x
        )
      );
      showToast(`PIC berhasil dialihkan ke: ${newPIC}`);
    }
  };

  const handleEscalateNational = () => {
    setEscalations((prev) =>
      prev.map((x) =>
        x.id === selectedReport.id
          ? {
              ...x,
              status: "DISETUJUI",
              prioritas: "KRITIS",
              lastUpdate: "Baru saja",
            }
          : x
      )
    );
    showToast(`Tugas ${selectedReport.id} resmi dinaikkan ke tingkat Keputusan Nasional!`);
  };

  const handleReturnRevision = () => {
    setEscalations((prev) =>
      prev.map((x) =>
        x.id === selectedReport.id
          ? { ...x, status: "DIKEMBALIKAN", lastUpdate: "Baru saja" }
          : x
      )
    );
    showToast(`Tugas ${selectedReport.id} dikembalikan ke daerah/analis pembuat untuk revisi.`);
  };

  const filteredEscalations = escalations.filter((item) => {
    const matchesSearch =
      item.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.wilayah.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority =
      filterPriority === "ALL" || item.prioritas === filterPriority;
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="flex flex-col min-h-screen bg-[#050A10] text-slate-300 font-sans p-4 lg:p-6 overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3.5 rounded-lg border bg-cyan-950/95 border-cyan-500/60 text-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.35)] flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-cyan-400" />
          <span className="text-xs font-mono font-bold tracking-wider uppercase">
            {toastMsg}
          </span>
        </div>
      )}

      {/* Top Title Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-900">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-[0.15em] text-slate-100 uppercase">
            Eskalasi Nasional
          </h1>
          <p className="text-[10px] text-slate-500 tracking-[0.2em] font-mono mt-1.5 uppercase leading-relaxed max-w-3xl">
            Monitoring laporan prioritas tinggi yang membutuhkan keputusan dan tindak lanjut tingkat nasional.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono shrink-0 text-[10px] bg-red-500/10 border border-red-500/20 px-3.5 py-2 rounded text-red-400 uppercase font-bold">
          <AlertOctagon className="w-4 h-4 animate-pulse" />
          <span>Sistem Eskalasi Siaga I</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Eskalasi */}
        <div className="border border-slate-800 bg-[#0B111D]/80 rounded-xl p-4 flex flex-col relative overflow-hidden group hover:border-slate-700 transition-colors">
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider font-semibold">Total Eskalasi</span>
          <span className="text-2xl lg:text-3xl font-bold text-slate-100 font-mono mt-1">24</span>
          <span className="text-[9px] font-mono text-cyan-400 mt-2 flex items-center gap-1">
            <Layers className="w-3 h-3" />
            <span>5 Kasus Aktif Terpantau</span>
          </span>
        </div>

        {/* Kritis */}
        <div className="border border-slate-800 bg-[#0B111D]/80 rounded-xl p-4 flex flex-col relative overflow-hidden group hover:border-slate-700 transition-colors">
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider font-semibold">Kritis</span>
          <span className="text-2xl lg:text-3xl font-bold text-red-500 font-mono mt-1">6</span>
          <span className="text-[9px] font-mono text-red-400 mt-2 flex items-center gap-1">
            <AlertOctagon className="w-3 h-3 text-red-500 animate-pulse" />
            <span>Butuh Tindakan Cepat</span>
          </span>
        </div>

        {/* Menunggu Keputusan */}
        <div className="border border-slate-800 bg-[#0B111D]/80 rounded-xl p-4 flex flex-col relative overflow-hidden group hover:border-slate-700 transition-colors">
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider font-semibold">Menunggu Keputusan</span>
          <span className="text-2xl lg:text-3xl font-bold text-amber-500 font-mono mt-1">9</span>
          <span className="text-[9px] font-mono text-amber-400 mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Menunggu Tanda Tangan</span>
          </span>
        </div>

        {/* Lewat SLA */}
        <div className="border border-slate-800 bg-[#0B111D]/80 rounded-xl p-4 flex flex-col relative overflow-hidden group hover:border-slate-700 transition-colors">
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider font-semibold">Lewat SLA</span>
          <span className="text-2xl lg:text-3xl font-bold text-rose-600 font-mono mt-1">3</span>
          <span className="text-[9px] font-mono text-rose-400 mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-500" />
            <span>Lewat Batas Waktu</span>
          </span>
        </div>
      </div>

      {/* Main Workspace (Stacked Top/Bottom for more space) */}
      <div className="flex flex-col gap-6 w-full">
        
        {/* TOP SECTION: List of Reports (Full Width) */}
        <div className="w-full flex flex-col gap-4">
          
          {/* Filters card */}
          <div className="border border-slate-800 bg-[#0B111D]/90 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-850 pb-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                Filter &amp; Pencarian
              </span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Cari kasus, ID, wilayah..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#060A11] border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="bg-[#060A11] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="ALL">Semua Prioritas</option>
                <option value="KRITIS">🚨 KRITIS</option>
                <option value="WASPADA">⚠️ WASPADA</option>
                <option value="PERHATIAN">ℹ️ PERHATIAN</option>
              </select>
            </div>
          </div>

          {/* List Section - Styled as a clean card grid for vertical stacking */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[480px] overflow-y-auto pr-1">
            {filteredEscalations.length === 0 ? (
              <div className="col-span-full border border-dashed border-slate-800 bg-[#0B111D]/40 rounded-xl p-10 text-center text-xs font-mono text-slate-500">
                Tidak ada laporan eskalasi yang sesuai filter.
              </div>
            ) : (
              filteredEscalations.map((item) => {
                const isSelected = item.id === selectedId;
                const isOverdue = item.slaRemainingHours < 0;
                
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`border rounded-xl p-4.5 cursor-pointer transition-all duration-300 flex flex-col justify-between gap-4 relative ${
                      isSelected
                        ? "bg-slate-900/60 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                        : "border-slate-800/80 bg-[#0B111D]/80 hover:border-slate-700"
                    }`}
                  >
                    {/* Top part of item */}
                    <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-cyan-400">
                          {item.id}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">
                          • {item.wilayah}
                        </span>
                      </div>

                      {/* Priority Badge */}
                      <span
                        className={`px-2 py-0.5 rounded text-[8px] tracking-widest font-mono font-bold uppercase border ${getPriorityBadgeStyles(
                          item.prioritas
                        )}`}
                      >
                        {item.prioritas}
                      </span>
                    </div>

                    {/* Judul & Kategori */}
                    <div className="flex-1">
                      <h3 className="text-xs font-bold text-slate-100 font-mono leading-relaxed line-clamp-2">
                        {item.judul}
                      </h3>
                      <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-wider font-mono">
                        {item.kategori}
                      </p>
                    </div>

                    {/* SLA Progress Bar Indicator */}
                    <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-850/40">
                      <div className="flex items-center justify-between text-[8px] font-mono">
                        <span className="text-slate-500">SLA MONITORING</span>
                        <span
                          className={
                            isOverdue
                              ? "text-red-500 font-bold"
                              : item.slaRemainingHours <= 6
                              ? "text-amber-500 font-bold"
                              : "text-emerald-400"
                          }
                        >
                          {isOverdue
                            ? `TERLAMBAT ${Math.abs(item.slaRemainingHours)} JAM`
                            : `${item.slaRemainingHours} JAM TERSISA`}
                        </span>
                      </div>
                      
                      {/* SLA Progress bar */}
                      <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isOverdue
                              ? "bg-red-500 w-full animate-pulse"
                              : item.slaRemainingHours <= 6
                              ? "bg-amber-500 w-1/3"
                              : "bg-emerald-500 w-3/4"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Footer Info */}
                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 pt-1">
                      <span>Status: <span className="font-bold text-slate-300">{item.status}</span></span>
                      <span>Update: {item.lastUpdate}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* BOTTOM SECTION: Selected Detail Workspace (Full Width) */}
        <div className="w-full border border-slate-800 bg-[#0B111D]/90 rounded-2xl p-6 md:p-8 flex flex-col shadow-xl gap-6">
          
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-850">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded">
                  {selectedReport.id}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {selectedReport.wilayah}
                </span>
              </div>
              <h2 className="text-sm md:text-base font-bold font-mono text-slate-100 uppercase tracking-wide mt-2">
                {selectedReport.judul}
              </h2>
            </div>
            
            {/* Status Badge */}
            <span
              className={`px-3 py-1.5 rounded text-[10px] tracking-widest font-mono font-bold uppercase border shrink-0 text-center ${getStatusBadgeStyles(
                selectedReport.status
              )}`}
            >
              {selectedReport.status}
            </span>
          </div>

          {/* Quick Metrics (Risk Score, Impact, Urgency) */}
          <div className="grid grid-cols-3 gap-3">
            {/* Risk Score */}
            <div className="bg-[#060A11] border border-slate-850 p-3.5 rounded-xl flex flex-col items-center justify-center text-center">
              <span className="text-[9px] font-mono text-slate-500 uppercase font-semibold">SKOR RISIKO</span>
              <div className="flex items-baseline gap-1 mt-1.5">
                <span className={`text-2xl font-bold font-mono ${
                  selectedReport.riskScore >= 80 ? "text-red-500" : "text-amber-500"
                }`}>
                  {selectedReport.riskScore}
                </span>
                <span className="text-[10px] font-mono text-slate-500">/100</span>
              </div>
            </div>

            {/* Impact */}
            <div className="bg-[#060A11] border border-slate-850 p-3.5 rounded-xl flex flex-col items-center justify-center text-center">
              <span className="text-[9px] font-mono text-slate-500 uppercase font-semibold">DAMPAK</span>
              <span className="text-xs font-bold font-mono text-red-400 mt-2.5 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                {selectedReport.impact}
              </span>
            </div>

            {/* Urgency */}
            <div className="bg-[#060A11] border border-slate-850 p-3.5 rounded-xl flex flex-col items-center justify-center text-center">
              <span className="text-[9px] font-mono text-slate-500 uppercase font-semibold">URGENSI</span>
              <span className="text-xs font-bold font-mono text-amber-400 mt-2.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {selectedReport.urgency}
              </span>
            </div>
          </div>

          {/* Destination & PIC Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#060A11] p-4 rounded-xl border border-slate-850">
            <div>
              <div className="text-[9px] font-mono text-slate-500 uppercase font-semibold">Target / Tujuan Eskalasi</div>
              <div className="text-xs font-mono font-bold text-cyan-400 mt-1 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-500 animate-pulse" />
                {selectedReport.tujuan}
              </div>
            </div>
            <div>
              <div className="text-[9px] font-mono text-slate-500 uppercase font-semibold">PIC Penanggung Jawab</div>
              <div className="text-xs font-mono font-bold text-slate-200 mt-1 flex items-center gap-1.5">
                <User className="w-4 h-4 shrink-0 text-slate-500" />
                {selectedReport.pic}
              </div>
            </div>
          </div>

          {/* Rekomendasi Tindak Lanjut */}
          <div className="bg-[#060A11] p-4 rounded-xl border border-slate-850">
            <div className="text-[10px] font-mono text-slate-500 uppercase font-semibold mb-2.5 tracking-wider">
              Rekomendasi Tindakan Strategis
            </div>
            <ul className="flex flex-col gap-2.5">
              {selectedReport.rekomendasi.map((rec, i) => (
                <li key={i} className="text-xs font-mono text-slate-300 flex items-start gap-2.5 leading-relaxed">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 stroke-[3]" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Timeline Kegiatan */}
          <div>
            <div className="text-[10px] font-mono text-slate-500 uppercase font-semibold mb-3 tracking-wider">
              Timeline Kronologi Eskalasi
            </div>
            <div className="flex flex-col gap-3 relative pl-3.5 border-l border-slate-800/80 ml-2">
              {selectedReport.timeline.map((event, i) => (
                <div key={i} className="relative flex flex-col gap-1">
                  {/* Point Indicator */}
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500/80 border border-[#050A10] absolute -left-[19.5px] top-1" />
                  
                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                    <Clock className="w-3 h-3 text-cyan-500" />
                    <span>{event.waktu}</span>
                    <span>•</span>
                    <span className="text-slate-400 font-bold">{event.pic}</span>
                  </div>
                  <p className="text-xs font-mono text-slate-300 leading-relaxed">
                    {event.kegiatan}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Priority Matrix Small Display */}
          <div className="border border-slate-800 bg-slate-950/60 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase mb-3">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Priority Matrix Ref</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
              <div className="border border-red-500/30 bg-red-950/20 p-2.5 rounded-lg">
                <div className="text-red-400 font-bold mb-1">🚨 KRITIS</div>
                <div className="text-slate-500 text-[9px] leading-relaxed">Impact Tinggi + Urgency Tinggi. Perlu disposisi nasional segera.</div>
              </div>
              <div className="border border-amber-500/30 bg-amber-950/20 p-2.5 rounded-lg">
                <div className="text-amber-400 font-bold mb-1">⚠️ WASPADA</div>
                <div className="text-slate-500 text-[9px] leading-relaxed">Impact Tinggi + Urgency Sedang. Monitor ketat oleh Deputi.</div>
              </div>
              <div className="border border-blue-500/30 bg-blue-950/20 p-2.5 rounded-lg">
                <div className="text-blue-400 font-bold mb-1">ℹ️ PERHATIAN</div>
                <div className="text-slate-500 text-[9px] leading-relaxed">Butuh validasi intelijen lapangan tambahan.</div>
              </div>
            </div>
          </div>

          {/* Action Buttons Column stacked in clean 2x2 grid */}
          <div className="flex flex-col gap-3 border-t border-slate-850 pt-5 mt-2">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">
              Aksi &amp; Tindakan Eskalasi
            </div>

            {/* Row 1: Primary Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                onClick={handleEscalateNational}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs tracking-wider uppercase h-11 gap-2 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all w-full justify-center shrink-0"
              >
                <Sparkles className="w-4 h-4 stroke-[2.5]" />
                <span>Naikkan ke Nasional</span>
              </Button>

              <Button
                onClick={handleReturnRevision}
                className="bg-amber-600 hover:bg-amber-500 text-white font-mono font-bold text-xs tracking-wider uppercase h-11 gap-2 shadow-[0_0_12px_rgba(245,158,11,0.3)] transition-all w-full justify-center shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Kembalikan Revisi</span>
              </Button>
            </div>

            {/* Row 2: Secondary / Utility Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                onClick={handleAssignPIC}
                variant="outline"
                className="border-slate-800 bg-[#060A11] hover:bg-slate-900 text-slate-300 text-xs font-mono tracking-wider uppercase h-11 gap-2 w-full justify-center shrink-0"
              >
                <Users className="w-4 h-4 text-slate-500" />
                <span>Assign PIC</span>
              </Button>

              <Button
                onClick={() => showNotifyDetail()}
                variant="outline"
                className="border-slate-850 bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 text-xs font-mono tracking-wider uppercase h-11 gap-2 w-full justify-center shrink-0"
              >
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Lihat Detail Lengkap</span>
              </Button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );

  function showNotifyDetail() {
    showToast(`Membuka berkas arsip lengkap untuk ${selectedReport.id}`);
  }
}
