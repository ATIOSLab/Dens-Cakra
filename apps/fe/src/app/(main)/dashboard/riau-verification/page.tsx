"use client";

import React, { useState } from "react";
import { 
  FileText, 
  Filter, 
  Search, 
  Eye, 
  Check, 
  X, 
  ArrowLeft,
  Calendar,
  User,
  Tag,
  MapPin,
  TrendingUp,
  FolderOpen,
  Plus,
  Play,
  FileSignature,
  Activity
} from "lucide-react";

interface Report {
  id: string;
  judul: string;
  kategori: string;
  urgensi: "RENDAH" | "SEDANG" | "TINGGI" | "KRITIS";
  wilayah: string;
  status: "BELUM DIVERIFIKASI" | "DIVERIFIKASI" | "DITOLAK";
  pengirim: string;
  waktu: string;
  tipe: string;
  ringkasan: string;
  kronologi: string[];
  pihakTerkait: string;
  dampak: string;
  rekomendasi: string;
}

interface TimelineStep {
  title: string;
  status: "completed" | "active" | "pending";
  time: string;
  description: string;
  pj?: string;
}

interface TimelineMarkerProps {
  status: "completed" | "active" | "pending";
}

function TimelineMarker({ status }: TimelineMarkerProps) {
  if (status === "completed") {
    return (
      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-[#0B111D] z-10 shadow-[0_0_10px_rgba(16,185,129,0.25)]">
        <Check className="w-3.5 h-3.5 text-[#0B111D] stroke-[3.5]" />
      </div>
    );
  }
  if (status === "active") {
    return (
      <div className="w-5 h-5 rounded-full bg-[#050A10] border-2 border-cyan-400 flex items-center justify-center z-10 shadow-[0_0_12px_rgba(34,211,238,0.7)] animate-pulse">
        <div className="w-2 h-2 rounded-full bg-cyan-400" />
      </div>
    );
  }
  // pending
  return (
    <div className="w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-slate-700/60 z-10" />
  );
}

function getTimelineData(report: Report): TimelineStep[] {
  return [
    {
      title: "DRAFT",
      status: "completed",
      time: "27 Okt 14:30",
      description: "Laporan dibuat oleh personel lapangan dan disimpan sebagai draf awal.",
      pj: "P-001"
    },
    {
      title: "DIKIRIM",
      status: "completed",
      time: "27 Okt 14:42",
      description: `Laporan dikirim dari ${report.wilayah} ke pusat untuk diproses.`,
      pj: "P-001"
    },
    {
      title: "REVIEW KOORDINATOR",
      status: "completed",
      time: "24 Okt 14:30",
      description: "Tahap Review Koordinator telah diselesaikan sesuai protokol operasional standar."
    },
    {
      title: "DIVERIFIKASI",
      status: "completed",
      time: "24 Okt 14:30",
      description: "Tahap Diverifikasi telah diselesaikan sesuai protokol operasional standar."
    },
    {
      title: "ANALISIS",
      status: "active",
      time: "15:56",
      description: "Konteks ancaman dianalisis dan dikaitkan dengan laporan terkait.",
      pj: "SUPER ADMIN NASIONAL"
    },
    {
      title: "DISETUJUI BINDA",
      status: "pending",
      time: "--:--",
      description: "Tahap Disetujui BINDA akan dimulai setelah tahap sebelumnya selesai diverifikasi."
    },
    {
      title: "PERLU REVISI",
      status: "pending",
      time: "--:--",
      description: "Tahap Perlu Revisi akan dimulai setelah tahap sebelumnya selesai diverifikasi."
    },
    {
      title: "DITERIMA NASIONAL",
      status: "pending",
      time: "--:--",
      description: "Tahap Diterima Nasional akan dimulai setelah tahap sebelumnya selesai diverifikasi."
    },
    {
      title: "TINDAK LANJUT",
      status: "pending",
      time: "--:--",
      description: "Tahap Tindak Lanjut akan dimulai setelah tahap sebelumnya selesai diverifikasi."
    },
    {
      title: "SELESAI",
      status: "pending",
      time: "--:--",
      description: "Tahap Selesai akan dimulai setelah tahap sebelumnya selesai diverifikasi."
    }
  ];
}

export default function RiauVerificationPage() {
  const initialReports: Report[] = [];

  const [reports, setReports] = useState<Report[]>(initialReports);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"SEMUA" | "PENDING" | "SELESAI">("SEMUA");

  // Function to simulate adding a new incoming report for Riau Binda
  const handleSimulateReport = () => {
    const newReport: Report = {
      id: "REP-RIAU-001",
      judul: "Aktivitas Penyelundupan Jalur Laut Liar Bengkalis",
      kategori: "Keamanan",
      urgensi: "TINGGI",
      wilayah: "Riau",
      status: "BELUM DIVERIFIKASI",
      pengirim: "Agen R-102",
      waktu: "2026-07-07 15:45:00",
      tipe: "Kejadian Teknis",
      ringkasan: "Terpantau aktivitas bongkar-muat mencurigakan berupa speedboat tanpa dokumen resmi pada dermaga tradisional pesisir Bengkalis di luar jam operasional. Terdapat 3 individu yang memindahkan peti kemas mini ke truk tertutup.",
      kronologi: [
        "15:10 — Patroli pesisir mendeteksi speedboat mendekati dermaga kayu Bengkalis.",
        "15:25 — Tiga orang tak dikenal mulai membongkar peti kemas mini.",
        "15:38 — Truk boks mini hitam memasuki area dermaga untuk memuat barang.",
        "15:45 — Laporan dikirimkan ke Command Center BINDA Riau."
      ],
      pihakTerkait: "3 Individu tak teridentifikasi, Pemilik Speedboat 'Riau Ocean', Jaringan Distribusi Pesisir.",
      dampak: "Potensi masuknya barang ilegal penyelundupan tanpa bea cukai, ancaman logistik lintas batas jalur hitam.",
      rekomendasi: "Lakukan koordinasi dengan Polairud dan Bea Cukai setempat untuk melakukan penyergapan truk boks di jalur darat utama Bengkalis.",
    };

    setReports(prev => {
      if (prev.some(r => r.id === newReport.id)) return prev;
      return [...prev, newReport];
    });
    setSelectedReport(null);
  };

  const handleVerify = (id: string) => {
    setReports(prev => prev.map(rep => rep.id === id ? { ...rep, status: "DIVERIFIKASI" } : rep));
    if (selectedReport && selectedReport.id === id) {
      setSelectedReport(prev => prev ? { ...prev, status: "DIVERIFIKASI" } : null);
    }
  };

  const handleReject = (id: string) => {
    setReports(prev => prev.map(rep => rep.id === id ? { ...rep, status: "DITOLAK" } : rep));
    if (selectedReport && selectedReport.id === id) {
      setSelectedReport(prev => prev ? { ...prev, status: "DITOLAK" } : null);
    }
  };

  const filteredReports = reports.filter(rep => {
    if (filterStatus === "PENDING" && rep.status !== "BELUM DIVERIFIKASI") return false;
    if (filterStatus === "SELESAI" && rep.status === "BELUM DIVERIFIKASI") return false;
    return rep.judul.toLowerCase().includes(searchQuery.toLowerCase()) || rep.id.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col min-h-screen bg-[#050A10] text-slate-350 font-sans p-3 lg:p-6 overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {!selectedReport ? (
        // --- MASTER LIST VIEW ---
        <div className="flex flex-col flex-1">
          {/* Header Panel */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-900">
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-[0.15em] text-slate-100 uppercase">
                Verifikasi Laporan
              </h1>
              <p className="text-[10px] text-slate-500 tracking-[0.2em] font-mono mt-1.5 uppercase">
                BINDA Riau // Pusat Verifikasi Data Lapangan
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSimulateReport}
                className="flex items-center gap-2 border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 px-3.5 py-2 rounded text-xs font-mono tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(6,182,212,0.1)]"
              >
                <Play className="w-3.5 h-3.5" /> Simulasikan Laporan Masuk
              </button>
            </div>
          </div>

          {/* Database Panel */}
          <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-850 mb-6">
              <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200">
                Kueri Verifikasi
              </h3>
              
              <button
                className="flex items-center gap-2 border border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-400 px-3 py-1.5 rounded text-[10px] tracking-widest font-mono uppercase transition-colors"
                disabled
              >
                <Filter className="w-3.5 h-3.5 text-cyan-400" /> Filter
              </button>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex flex-wrap gap-2 text-[10px] font-mono tracking-widest uppercase">
                {[
                  { id: "SEMUA", label: "Semua Rekaman" },
                  { id: "PENDING", label: "Tertunda" },
                  { id: "SELESAI", label: "Kritis / Selesai" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterStatus(tab.id as any)}
                    className={`px-3 py-1.5 rounded border transition-colors ${
                      filterStatus === tab.id 
                        ? "border-cyan-500/30 text-cyan-400 bg-cyan-500/5" 
                        : "border-slate-800 text-slate-500 hover:text-slate-400 hover:border-slate-700 bg-slate-900/10"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:max-w-xs">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Cari id / judul laporan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-800 bg-slate-900/20 rounded text-xs text-slate-350 font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-850">
                    <th className="py-3.5 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold w-32">
                      ID
                    </th>
                    <th className="py-3.5 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold">
                      Judul
                    </th>
                    <th className="py-3.5 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold w-36">
                      Kategori
                    </th>
                    <th className="py-3.5 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold w-28">
                      Urgensi
                    </th>
                    <th className="py-3.5 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold w-40">
                      Wilayah
                    </th>
                    <th className="py-3.5 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold w-36">
                      Status
                    </th>
                    <th className="py-3.5 px-4 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold w-20 text-center">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-20 text-slate-500 text-xs font-mono tracking-widest uppercase bg-slate-950/5">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <FolderOpen className="w-8 h-8 text-slate-700" />
                          <span>Tidak Ada Data Laporan Butuh Verifikasi</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredReports.map((report) => (
                      <tr key={report.id} className="border-b border-slate-900 bg-slate-950/10 hover:bg-slate-900/30 transition-colors">
                        <td className="py-4 px-4 text-xs font-mono font-semibold text-slate-400">
                          {report.id}
                        </td>
                        <td className="py-4 px-4 text-xs font-semibold text-slate-200">
                          {report.judul}
                        </td>
                        <td className="py-4 px-4 text-xs text-slate-400 font-mono">
                          {report.kategori}
                        </td>
                        <td className="py-4 px-4 text-xs">
                          <span className={`text-[8px] font-mono px-2 py-0.5 rounded border ${
                            report.urgensi === "TINGGI" ? "border-amber-500/30 text-amber-500 bg-amber-500/5" : "border-slate-800 text-slate-400"
                          }`}>
                            {report.urgensi}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-xs text-slate-400 font-mono">
                          {report.wilayah}
                        </td>
                        <td className="py-4 px-4 text-xs">
                          <span className={`text-[8px] font-mono px-2 py-0.5 rounded border ${
                            report.status === "DIVERIFIKASI" 
                              ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5"
                              : report.status === "DITOLAK"
                              ? "border-red-500/30 text-red-500 bg-red-500/5"
                              : "border-slate-750 text-slate-500"
                          }`}>
                            {report.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button 
                            onClick={() => setSelectedReport(report)}
                            className="p-1 border border-slate-800 bg-[#0B121E] hover:border-slate-650 rounded text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        // --- DETAIL VERIFICATION SHEET VIEW ---
        <div className="flex flex-col flex-1">
          {/* Detail Header */}
          <div className="flex items-center gap-4 mb-6 pb-5 border-b border-slate-900">
            <button
              onClick={() => setSelectedReport(null)}
              className="p-2 border border-slate-800 bg-[#0B121E] hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl md:text-2xl font-bold tracking-wider text-slate-100 uppercase">
                  Detail Laporan
                </h1>
                <span className="text-[10px] font-mono bg-cyan-900/30 border border-cyan-800 text-cyan-400 px-2 py-0.5 rounded">
                  {selectedReport.id}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 tracking-[0.2em] font-mono mt-1 uppercase">
                BINDA Riau // Rekaman Informasi Lapangan
              </p>
            </div>
          </div>

          {/* Details Content Grid */}
          <div className="grid grid-cols-12 gap-5">
            {/* Left Content Area (Width 8/12) */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
              
              <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[9px] font-mono border border-amber-500/30 text-amber-500 bg-amber-500/5 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                    {selectedReport.urgensi}
                  </span>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase font-bold tracking-wider ${
                    selectedReport.status === "DIVERIFIKASI" 
                      ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5"
                      : selectedReport.status === "DITOLAK"
                      ? "border-red-500/30 text-red-500 bg-red-500/5"
                      : "border-slate-800 text-slate-500"
                  }`}>
                    {selectedReport.status}
                  </span>
                </div>

                <h2 className="text-lg md:text-xl font-bold text-slate-200 tracking-wide mb-6">
                  {selectedReport.judul}
                </h2>

                {/* Metadata Row Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-y border-slate-850 py-4 mb-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] text-slate-500 font-mono tracking-widest uppercase flex items-center gap-1">
                      <User className="w-3 h-3 text-cyan-400" /> Pengirim
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-350">{selectedReport.pengirim}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] text-slate-500 font-mono tracking-widest uppercase flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-cyan-400" /> Waktu
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-350">{selectedReport.waktu}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] text-slate-500 font-mono tracking-widest uppercase flex items-center gap-1">
                      <Tag className="w-3 h-3 text-cyan-400" /> Tipe
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-350">{selectedReport.tipe}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] text-slate-500 font-mono tracking-widest uppercase flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-cyan-400" /> Wilayah
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-350">{selectedReport.wilayah}</span>
                  </div>
                </div>

                {/* Executive Summary */}
                <div className="mb-6">
                  <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-semibold mb-2">
                    Ringkasan Eksekutif
                  </h4>
                  <div className="p-4 rounded border border-slate-850 bg-slate-950/20 text-xs text-slate-300 font-sans leading-relaxed">
                    {selectedReport.ringkasan}
                  </div>
                </div>

                {/* Chronology */}
                <div className="mb-6">
                  <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-semibold mb-3">
                    Kronologi Kejadian
                  </h4>
                  <div className="space-y-2">
                    {selectedReport.kronologi.map((krono, idx) => (
                      <div key={idx} className="p-3 rounded border border-slate-900 bg-slate-950/10 text-xs font-mono text-slate-400 flex items-start gap-3">
                        <span className="text-cyan-500 font-bold shrink-0">///</span>
                        <span>{krono}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grid Pihak Terkait + Potensi Dampak */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="flex flex-col gap-2">
                    <span className="text-[9px] text-slate-400 font-mono tracking-widest uppercase font-semibold">
                      Pihak Terkait
                    </span>
                    <div className="p-3 rounded border border-slate-850 bg-slate-950/10 text-xs text-slate-400 leading-relaxed min-h-[80px]">
                      {selectedReport.pihakTerkait}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-[9px] text-slate-400 font-mono tracking-widest uppercase font-semibold">
                      Potensi Dampak
                    </span>
                    <div className="p-3 rounded border border-slate-850 bg-slate-950/10 text-xs text-slate-400 leading-relaxed min-h-[80px]">
                      {selectedReport.dampak}
                    </div>
                  </div>
                </div>

                {/* Rekomendasi */}
                <div className="mb-6">
                  <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-semibold mb-2">
                    Rekomendasi Awal
                  </h4>
                  <div className="p-4 rounded border border-slate-850 bg-slate-950/20 text-xs text-slate-300 font-sans leading-relaxed">
                    {selectedReport.rekomendasi}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Action/KPI Sidebar (Width 4/12) */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
              {/* Operations Panel */}
              <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-850 pb-3">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200">
                    Aksi Operasional
                  </h3>
                </div>

                {selectedReport.status === "BELUM DIVERIFIKASI" ? (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleVerify(selectedReport.id)}
                      className="w-full flex items-center justify-center gap-2 border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 py-2.5 rounded text-xs font-mono font-bold tracking-widest uppercase transition-all shadow-[0_0_10px_rgba(16,185,129,0.05)] cursor-pointer"
                    >
                      <Check className="w-4 h-4" /> Verifikasi Laporan
                    </button>
                    <button
                      onClick={() => handleReject(selectedReport.id)}
                      className="w-full flex items-center justify-center gap-2 border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2.5 rounded text-xs font-mono font-bold tracking-widest uppercase transition-all cursor-pointer"
                    >
                      <X className="w-4 h-4" /> Tolak Laporan
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded border border-slate-850 bg-slate-950/20 text-center text-xs font-mono text-slate-500 uppercase tracking-wider">
                    Keputusan Telah Diambil ({selectedReport.status})
                  </div>
                )}
              </div>

              {/* KPI Impact Panel */}
              <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3 border-b border-slate-850 pb-3">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200">
                    Dampak KPI
                  </h3>
                </div>
                <p className="text-[10px] font-mono text-slate-500 leading-relaxed uppercase tracking-wider">
                  Menunggu status Diterima Nasional untuk perhitungan KPI.
                </p>
              </div>

              {/* Related Reports */}
              <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col">
                <div className="flex items-center gap-2 mb-3 border-b border-slate-850 pb-3">
                  <FileSignature className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200">
                    Laporan Terkait
                  </h3>
                </div>
                <p className="text-[10px] font-mono text-slate-650 leading-relaxed uppercase tracking-wider py-4 text-center border border-dashed border-slate-850 rounded">
                  Tidak ada kecocokan pola laporan lain
                </p>
              </div>
            </div>
          </div>

          {/* Alur Laporan - Full Width Below Grid */}
          <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-6 mt-5">
            <div className="flex items-center gap-2 mb-8">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-semibold">
                Alur Laporan
              </h4>
            </div>

            <div className="relative">
              {/* Center vertical line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-slate-800/80 -translate-x-1/2" />

              <div className="space-y-10">
                {getTimelineData(selectedReport).map((step, idx) => {
                  const isRight = idx % 2 === 0;
                  return (
                    <div key={idx} className={`relative flex items-start ${step.status === "pending" ? "opacity-40" : ""}`}>
                      {/* Centered Marker */}
                      <div className="absolute left-1/2 -translate-x-1/2 z-10 flex items-center justify-center" style={{ top: '6px' }}>
                        <TimelineMarker status={step.status} />
                      </div>

                      {isRight ? (
                        <>
                          {/* Left empty */}
                          <div className="w-1/2 pr-10" />
                          {/* Right card */}
                          <div className="w-1/2 pl-10">
                            <div className="bg-[#050A10]/60 border border-slate-800/60 rounded-lg p-4 relative">
                              <div className="absolute top-[10px] -left-[7px] w-3 h-3 bg-[#050A10]/60 border-l border-b border-slate-800/60 rotate-45" />
                              <div className="flex justify-between items-start gap-3 mb-1.5">
                                <span className={`text-[11px] font-mono font-bold tracking-wider ${
                                  step.status === "completed" ? "text-emerald-400" 
                                  : step.status === "active" ? "text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.4)]" 
                                  : "text-slate-500"
                                }`}>
                                  {step.title}
                                </span>
                                <span className="text-[9px] font-mono text-slate-500 whitespace-nowrap shrink-0">{step.time}</span>
                              </div>
                              <p className={`text-[11px] leading-relaxed ${step.status === "pending" ? "text-slate-600" : "text-slate-400"}`}>
                                {step.description}
                              </p>
                              {step.pj && (
                                <span className="text-[8px] font-mono text-slate-500 mt-2 block uppercase tracking-wider">PJ: {step.pj}</span>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Left card */}
                          <div className="w-1/2 pr-10">
                            <div className="bg-[#050A10]/60 border border-slate-800/60 rounded-lg p-4 relative">
                              <div className="absolute top-[10px] -right-[7px] w-3 h-3 bg-[#050A10]/60 border-r border-t border-slate-800/60 rotate-45" />
                              <div className="flex justify-between items-start gap-3 mb-1.5">
                                <span className={`text-[11px] font-mono font-bold tracking-wider ${
                                  step.status === "completed" ? "text-emerald-400" 
                                  : step.status === "active" ? "text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.4)]" 
                                  : "text-slate-500"
                                }`}>
                                  {step.title}
                                </span>
                                <span className="text-[9px] font-mono text-slate-500 whitespace-nowrap shrink-0">{step.time}</span>
                              </div>
                              <p className={`text-[11px] leading-relaxed ${step.status === "pending" ? "text-slate-600" : "text-slate-400"}`}>
                                {step.description}
                              </p>
                              {step.pj && (
                                <span className="text-[8px] font-mono text-slate-500 mt-2 block uppercase tracking-wider">PJ: {step.pj}</span>
                              )}
                            </div>
                          </div>
                          {/* Right empty */}
                          <div className="w-1/2 pl-10" />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
