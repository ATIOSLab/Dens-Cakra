"use client";

import React, { useState } from "react";
import {
  ClipboardCheck,
  User,
  CheckCircle2,
  FileText,
  ArrowLeft,
  Save,
  Send,
  Cpu,
  Sparkles,
  MapPin,
  Clock,
  ShieldAlert,
  Paperclip,
  Check,
  AlertTriangle,
  Eye,
  FileCheck,
  RefreshCw,
  MessageSquare,
  History,
  TrendingUp,
  Target,
  ListChecks,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnswerItem {
  id: string;
  agen: string;
  kodeAgen: string;
  wilayah: string;
  waktu: string;
  tugasId: string;
  status: "DIKIRIM" | "DIVERIFIKASI" | "DITERBITKAN";
  ringkasan: string;
  lokasi: string;
  uraian: string;
  kronologi: string;
  pihakTerkait: string;
  lampiran: string;
  // Report Studio generated fields
  repJudul?: string;
  repSec1?: string;
  repSec2?: string;
  repSec3?: string;
  repSec4?: string;
  repSec5?: string;
  repSec6?: string;
}

const INITIAL_ANSWERS: AnswerItem[] = [];

export default function AnswersPage() {
  const [answers, setAnswers] = useState<AnswerItem[]>(INITIAL_ANSWERS);
  const [viewMode, setViewMode] = useState<"LIST" | "STUDIO">("LIST");
  const [activeAnswer, setActiveAnswer] = useState<AnswerItem | null>(null);
  const [recentlyModifiedId, setRecentlyModifiedId] = useState<string | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<"DRAFT" | "CATATAN" | "REVISI">(
    "DRAFT"
  );
  const [isGenerated, setIsGenerated] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "info";
    text: string;
  } | null>(null);

  const showNotify = (text: string, type: "success" | "info" = "success") => {
    setNotification({ type, text });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const handleVerify = (item: AnswerItem) => {
    const updated: AnswerItem = { ...item, status: "DIVERIFIKASI" };
    setAnswers((prev) => prev.map((x) => (x.id === item.id ? updated : x)));
    showNotify(
      "Jawaban berhasil diverifikasi! Klik Generate Laporan Intelijen untuk menyusun laporan resmi."
    );
  };

  const handleOpenStudio = (item: AnswerItem) => {
    setActiveAnswer({ ...item });
    setIsGenerated(!!item.repJudul);
    setViewMode("STUDIO");
  };

  const handleGenerateAI = () => {
    if (!activeAnswer) return;
    const aiReport: AnswerItem = {
      ...activeAnswer,
      repJudul:
        activeAnswer.repJudul ||
        `Laporan Intelijen Khusus: Deteksi & Analisis ${activeAnswer.ringkasan}`,
      repSec1:
        activeAnswer.repSec1 ||
        `Berdasarkan laporan operatif lapangan (${activeAnswer.agen} / ${activeAnswer.kodeAgen}) pada ${activeAnswer.waktu} bertempat di ${activeAnswer.lokasi}, telah terverifikasi fakta sebagai berikut:\n\n1. ${activeAnswer.uraian}\n2. Kronologi Kejadian:\n${activeAnswer.kronologi}\n3. Pihak Teridentifikasi: ${activeAnswer.pihakTerkait}.`,
      repSec2:
        activeAnswer.repSec2 ||
        `Aktivitas yang terpantau di ${activeAnswer.lokasi} mengindikasikan adanya pergerakan terkoordinasi yang berpotensi mengganggu stabilitas keamanan wilayah ${activeAnswer.wilayah}. Pola komunikasi dan rekrutmen menunjukkan ciri khas sel tertutup dengan dukungan logistik dari pihak ketiga.`,
      repSec3:
        activeAnswer.repSec3 ||
        `1. Dampak Jangka Pendek: Eskalasi ketegangan sosial dan potensi provokasi di ruang publik.\n2. Dampak Jangka Panjang: Ancaman terhadap stabilitas obvitnas dan keamanan tahapan pemilu/agenda strategis pemerintah.\n3. Tingkat Kerawanan: TINGGI (Red Alert).`,
      repSec4:
        activeAnswer.repSec4 ||
        `Dalam 7 hingga 14 hari ke depan, diperkirakan kelompok terkait akan melakukan konsolidasi lanjutan dan memperluas jangkauan aksi ke sektor-sektor publik sensitif.`,
      repSec5:
        activeAnswer.repSec5 ||
        `1. Lakukan pengawasan melekat (Waskat) 24 jam terhadap pihak terkait (${activeAnswer.pihakTerkait}).\n2. Tingkatkan patroli pengamanan dan penggalangan sumber tertutup di sekitar ${activeAnswer.lokasi}.\n3. Segera koordinasikan langkah preventif bersama aparat keamanan wilayah dan Deputi Bidang Intelijen.`,
      repSec6:
        activeAnswer.repSec6 ||
        `Rangkuman Eksekutif untuk Pimpinan: Ancaman nyata terdeteksi di wilayah ${activeAnswer.wilayah}. Verifikasi lapangan konklusif. Disarankan operasi kontra-intelijen segera digelar.`,
    };
    setActiveAnswer(aiReport);
    setIsGenerated(true);
    showNotify(
      "AI DENS CAKRA berhasil menyusun draft Laporan Intelijen format Standar Nasional!"
    );
  };

  const handleSaveReportDraft = () => {
    if (!activeAnswer) return;
    const updated: AnswerItem = { ...activeAnswer, status: "DIVERIFIKASI" };
    setActiveAnswer(updated);
    setAnswers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));

    setRecentlyModifiedId(updated.id);
    setViewMode("LIST");
    showNotify("Draft Laporan Intelijen Resmi berhasil disimpan ke basis data!");
    setTimeout(() => setRecentlyModifiedId(null), 4000);
  };

  const handlePublishReport = () => {
    if (!activeAnswer) return;
    const updated: AnswerItem = { ...activeAnswer, status: "DITERBITKAN" };
    setActiveAnswer(updated);
    setAnswers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));

    setRecentlyModifiedId(updated.id);
    setViewMode("LIST");
    showNotify(
      "Laporan Intelijen Resmi berhasil DITERBITKAN ke Pusat Komando Nasional!"
    );
    setTimeout(() => setRecentlyModifiedId(null), 4000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#050A10] text-slate-300 font-sans p-3 lg:p-6 overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-lg border shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
            notification.type === "success"
              ? "bg-emerald-950/95 border-emerald-500/60 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.35)]"
              : "bg-cyan-950/95 border-cyan-500/60 text-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.35)]"
          }`}
        >
          <CheckCircle2 className="w-5 h-5 shrink-0 text-cyan-400" />
          <span className="text-xs font-mono font-bold tracking-wider uppercase">
            {notification.text}
          </span>
        </div>
      )}

      {/* VIEW MODE: LIST */}
      {viewMode === "LIST" && (
        <>
          {/* Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-900">
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-[0.15em] text-slate-100 uppercase">
                Jawaban Lapangan
              </h1>
              <p className="text-[10px] text-slate-500 tracking-[0.2em] font-mono mt-1.5 uppercase">
                Verifikasi &amp; Seleksi Bahan Keterangan UK/STR
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded uppercase font-bold">
                {answers.length} Laporan Masuk
              </span>
            </div>
          </div>

          {/* Cards List */}
          <div className="flex flex-col gap-5">
            {answers.map((item) => (
              <div
                key={item.id}
                className={`border rounded-xl p-5 md:p-6 transition-all duration-700 relative overflow-hidden group ${
                  recentlyModifiedId === item.id
                    ? "bg-cyan-500/15 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.3)] animate-pulse"
                    : "border-slate-800/90 bg-[#0B111D]/90 hover:border-slate-700"
                }`}
              >
                {/* Top Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-850">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100 font-mono">
                        {item.agen}{" "}
                        <span className="text-xs text-slate-500 font-normal">
                          ({item.kodeAgen})
                        </span>
                      </h3>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>{item.wilayah}</span>
                        <span>•</span>
                        <span>{item.waktu}</span>
                        <span>•</span>
                        <span className="text-cyan-400">
                          Tugas: {item.tugasId}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    <span
                      className={`px-3 py-1 rounded text-[10px] tracking-widest font-mono font-bold uppercase border ${
                        item.status === "DITERBITKAN"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                          : item.status === "DIVERIFIKASI"
                          ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      {item.status === "DIKIRIM"
                        ? "DIKIRIM (MENUNGGU VERIFIKASI)"
                        : item.status}
                    </span>
                  </div>
                </div>

                {/* Grid 2 Cols: Ringkasan & Lokasi */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
                  <div className="md:col-span-8 bg-[#060A11] border border-slate-800/80 rounded-lg p-3.5">
                    <div className="text-[9px] font-mono text-slate-500 tracking-widest uppercase mb-1 font-semibold">
                      Ringkasan
                    </div>
                    <div className="text-xs text-slate-200 font-mono font-semibold">
                      {item.ringkasan}
                    </div>
                  </div>

                  <div className="md:col-span-4 bg-[#060A11] border border-slate-800/80 rounded-lg p-3.5">
                    <div className="text-[9px] font-mono text-slate-500 tracking-widest uppercase mb-1 font-semibold">
                      Lokasi
                    </div>
                    <div className="text-xs text-slate-200 font-mono">
                      {item.lokasi}
                    </div>
                  </div>
                </div>

                {/* Uraian Lengkap */}
                <div className="bg-[#060A11] border border-slate-800/80 rounded-lg p-3.5 mb-5">
                  <div className="text-[9px] font-mono text-slate-500 tracking-widest uppercase mb-1 font-semibold">
                    Uraian Lengkap
                  </div>
                  <div className="text-xs text-slate-300 font-mono leading-relaxed">
                    {item.uraian}
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-850/60 flex-wrap gap-3">
                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                    <Paperclip className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Lampiran: </span>
                    <span className="text-cyan-400 hover:underline cursor-pointer">
                      {item.lampiran}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {item.status === "DIKIRIM" ? (
                      <Button
                        onClick={() => handleVerify(item)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs tracking-wider uppercase px-5 py-2 h-9 gap-2 shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Verifikasi</span>
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleOpenStudio(item)}
                        className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs tracking-wider uppercase px-5 py-2 h-9 gap-2 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all animate-in fade-in zoom-in duration-300"
                      >
                        <FileCheck className="w-4 h-4 stroke-[2.5]" />
                        <span>Generate Laporan Intelijen</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* VIEW MODE: STUDIO (ENHANCED SPACIOUS LAYOUT - NO BROKEN ICONS, NO OVERFLOW) */}
      {viewMode === "STUDIO" && activeAnswer && (
        <div className="flex flex-col gap-8 animate-in fade-in duration-300">
          {/* Top Studio Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-900">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setViewMode("LIST")}
                className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 transition-colors flex items-center justify-center shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg md:text-2xl font-bold tracking-[0.15em] text-slate-100 uppercase flex items-center gap-3 flex-wrap">
                  <span>Intelligence Report Studio</span>
                  <span className="text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2.5 py-0.5 rounded font-normal uppercase">
                    Enhanced UX
                  </span>
                </h1>
                <p className="text-[10px] text-slate-500 tracking-[0.2em] font-mono mt-1 uppercase">
                  DENS CAKRA // FORMAT STANDAR NASIONAL — SUMBER:{" "}
                  <span className="text-cyan-400">{activeAnswer.agen}</span>
                </p>
              </div>
            </div>

            {/* Status & Urgency Pills */}
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <span className="px-3 py-1.5 rounded text-[10px] font-mono tracking-widest font-bold uppercase border bg-amber-500/10 text-amber-400 border-amber-500/30">
                {activeAnswer.status === "DITERBITKAN"
                  ? "DITERBITKAN RESMI"
                  : "BELUM DITERBITKAN"}
              </span>
              <span className="px-3 py-1.5 rounded text-[10px] font-mono tracking-widest font-bold uppercase border bg-red-500/10 text-red-400 border-red-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>URGENSI: TINGGI</span>
              </span>
            </div>
          </div>

          {/* TOP SECTION: AI ANALYSIS TOOLBAR (HORIZONTAL BANNER TO PREVENT CRAMPING!) */}
          <div className="border border-cyan-500/40 bg-[#0B1220]/95 rounded-2xl p-6 shadow-[0_0_35px_rgba(6,182,212,0.15)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6 pb-6 border-b border-cyan-500/20">
              <div className="flex items-start gap-4 max-w-2xl">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                  <Cpu className="w-6 h-6 animate-pulse stroke-[2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <h3 className="text-sm font-mono font-bold tracking-[0.15em] uppercase text-slate-100">
                      AI Analysis Engine (DENS CAKRA 24/7)
                    </h3>
                    <span className="text-[9px] font-mono text-cyan-400 uppercase bg-cyan-500/10 px-2 py-0.5 rounded font-bold">
                      Ready
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono leading-relaxed">
                    Sistem AI siap mentransformasi laporan mentah operatif
                    lapangan menjadi Laporan Intelijen Strategis berstandar
                    nasional secara otomatis.
                  </p>
                </div>
              </div>

              {/* Primary Generate Button (Full Width visible, no truncation!) */}
              <div className="shrink-0">
                <Button
                  onClick={handleGenerateAI}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs tracking-widest uppercase px-6 py-4 h-12 gap-2.5 shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all w-full sm:w-auto"
                >
                  <Sparkles className="w-4 h-4 stroke-[2.5]" />
                  <span>Generate Laporan Intelijen Otomatis</span>
                </Button>
              </div>
            </div>

            {/* Quick Action Chips Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <button
                onClick={handleGenerateAI}
                className="border border-slate-700 bg-slate-900/90 hover:bg-cyan-500/10 hover:border-cyan-500/40 text-slate-300 text-[11px] font-mono uppercase tracking-wider py-2.5 px-3 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Fakta-Fakta</span>
              </button>
              <button
                onClick={handleGenerateAI}
                className="border border-slate-700 bg-slate-900/90 hover:bg-cyan-500/10 hover:border-cyan-500/40 text-slate-300 text-[11px] font-mono uppercase tracking-wider py-2.5 px-3 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span className="truncate">Analisis Ancaman</span>
              </button>
              <button
                onClick={handleGenerateAI}
                className="border border-slate-700 bg-slate-900/90 hover:bg-cyan-500/10 hover:border-cyan-500/40 text-slate-300 text-[11px] font-mono uppercase tracking-wider py-2.5 px-3 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">Potensi Dampak</span>
              </button>
              <button
                onClick={handleGenerateAI}
                className="border border-slate-700 bg-slate-900/90 hover:bg-cyan-500/10 hover:border-cyan-500/40 text-slate-300 text-[11px] font-mono uppercase tracking-wider py-2.5 px-3 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Target className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="truncate">Perkiraan</span>
              </button>
              <button
                onClick={handleGenerateAI}
                className="border border-slate-700 bg-slate-900/90 hover:bg-cyan-500/10 hover:border-cyan-500/40 text-slate-300 text-[11px] font-mono uppercase tracking-wider py-2.5 px-3 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Rekomendasi</span>
              </button>
              <button
                onClick={handleGenerateAI}
                className="border border-slate-700 bg-slate-900/90 hover:bg-cyan-500/10 hover:border-cyan-500/40 text-slate-300 text-[11px] font-mono uppercase tracking-wider py-2.5 px-3 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <ListChecks className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">Exec Summary</span>
              </button>
            </div>
          </div>

          {/* MAIN WORKSPACE SECTION: 2 BALANCED COLUMNS (LEFT 5/12 vs RIGHT 7/12) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN (Width 5/12): BAHAN KETERANGAN (DATA LAPANGAN) */}
            <div className="lg:col-span-5 border border-slate-800/80 bg-[#0B111D]/90 rounded-2xl p-6 flex flex-col shadow-xl gap-5">
              <div className="flex items-center justify-between border-b border-slate-850 pb-4">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  <span className="text-sm font-mono font-bold tracking-[0.15em] uppercase text-slate-100">
                    Bahan Keterangan
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 uppercase bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                  ID: {activeAnswer.id}
                </span>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 bg-[#060A11] p-4 rounded-xl border border-slate-850">
                <div>
                  <div className="text-[9px] font-mono text-slate-500 uppercase font-semibold">
                    Pengirim
                  </div>
                  <div className="text-xs font-mono font-bold text-cyan-400 mt-1">
                    {activeAnswer.agen} ({activeAnswer.kodeAgen})
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-mono text-slate-500 uppercase font-semibold">
                    Wilayah
                  </div>
                  <div className="text-xs font-mono font-semibold text-slate-200 mt-1">
                    {activeAnswer.wilayah}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-mono text-slate-500 uppercase font-semibold">
                    Waktu Laporan
                  </div>
                  <div className="text-xs font-mono text-slate-300 mt-1">
                    {activeAnswer.waktu}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-mono text-slate-500 uppercase font-semibold">
                    Referensi Tugas
                  </div>
                  <div className="text-xs font-mono text-amber-400 mt-1 font-semibold">
                    {activeAnswer.tugasId}
                  </div>
                </div>
              </div>

              {/* Text Boxes */}
              <div className="flex flex-col gap-3.5">
                <div className="bg-[#060A11] p-4 rounded-xl border border-slate-850">
                  <div className="text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1.5 tracking-wider">
                    Ringkasan Observasi
                  </div>
                  <div className="text-xs font-mono text-slate-100 font-bold leading-relaxed">
                    {activeAnswer.ringkasan}
                  </div>
                </div>

                <div className="bg-[#060A11] p-4 rounded-xl border border-slate-850">
                  <div className="text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1.5 tracking-wider">
                    Uraian Lengkap
                  </div>
                  <div className="text-xs font-mono text-slate-300 leading-relaxed">
                    {activeAnswer.uraian}
                  </div>
                </div>

                <div className="bg-[#060A11] p-4 rounded-xl border border-slate-850">
                  <div className="text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1.5 tracking-wider">
                    Kronologi Lapangan
                  </div>
                  <div className="text-xs font-mono text-slate-300 whitespace-pre-line leading-relaxed">
                    {activeAnswer.kronologi}
                  </div>
                </div>

                <div className="bg-[#060A11] p-4 rounded-xl border border-slate-850">
                  <div className="text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1.5 tracking-wider">
                    Pihak Terkait / Teridentifikasi
                  </div>
                  <div className="text-xs font-mono text-slate-300">
                    {activeAnswer.pihakTerkait}
                  </div>
                </div>

                {/* Lampiran Card */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono">
                  <div className="flex items-center gap-2.5 text-slate-400">
                    <Paperclip className="w-4 h-4 text-cyan-400" />
                    <span>Lampiran Bukti:</span>
                  </div>
                  <span className="text-cyan-400 hover:underline cursor-pointer font-bold">
                    {activeAnswer.lampiran}
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (Width 7/12): DRAFT LAPORAN INTELIJEN RESMI */}
            <div className="lg:col-span-7 border border-slate-800/80 bg-[#0B111D]/90 rounded-2xl p-6 md:p-8 flex flex-col shadow-xl">
              
              {/* ROW 1: Title & Action Buttons stacked vertically to prevent text wrapping/overlap */}
              <div className="flex flex-col gap-4 pb-5 mb-5 border-b border-slate-850">
                <div className="flex flex-col gap-1">
                  <h2 className="text-base md:text-lg font-bold font-mono tracking-[0.1em] text-slate-100 uppercase flex items-center gap-2">
                    <FileText className="w-5 h-5 text-cyan-400 shrink-0" />
                    <span>Draft Laporan Intelijen Resmi</span>
                  </h2>
                  <span className="text-[10px] font-mono text-red-400 font-bold uppercase tracking-wider">
                    KLASIFIKASI: SANGAT RAHASIA
                  </span>
                </div>

                {/* Save Draft & Publish Buttons on their own row below, cleanly spaced */}
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleSaveReportDraft}
                    variant="outline"
                    className="border-slate-700 bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-mono tracking-wider uppercase px-4 h-10 gap-2 shrink-0"
                  >
                    <Save className="w-4 h-4 text-amber-400" />
                    <span>Simpan Draft</span>
                  </Button>

                  <Button
                    onClick={handlePublishReport}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs tracking-wider uppercase px-5 h-10 gap-2 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all shrink-0"
                  >
                    <Send className="w-4 h-4 stroke-[2.5]" />
                    <span>Terbitkan Laporan Resmi</span>
                  </Button>
                </div>
              </div>

              {/* ROW 2: Navigation Tabs (No emojis, clean Lucide icons!) */}
              <div className="flex items-center gap-2 mb-6 border-b border-slate-850 pb-4 overflow-x-auto">
                <button
                  onClick={() => setActiveTab("DRAFT")}
                  className={`px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-2 shrink-0 ${
                    activeTab === "DRAFT"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                      : "text-slate-400 hover:text-slate-200 bg-[#060A11] border border-slate-850"
                  }`}
                >
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>Draft Laporan Resmi</span>
                </button>
                <button
                  onClick={() => setActiveTab("CATATAN")}
                  className={`px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-2 shrink-0 ${
                    activeTab === "CATATAN"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                      : "text-slate-400 hover:text-slate-200 bg-[#060A11] border border-slate-850"
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  <span>Catatan Analis</span>
                </button>
                <button
                  onClick={() => setActiveTab("REVISI")}
                  className={`px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-2 shrink-0 ${
                    activeTab === "REVISI"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                      : "text-slate-400 hover:text-slate-200 bg-[#060A11] border border-slate-850"
                  }`}
                >
                  <History className="w-4 h-4 text-purple-400" />
                  <span>Riwayat Revisi (0)</span>
                </button>
              </div>

              {/* EDITOR CONTENT AREA */}
              {activeTab === "DRAFT" && (
                <div className="flex flex-col gap-6">
                  {!isGenerated ? (
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl bg-[#060A11]/60 p-12 text-center min-h-[480px]">
                      <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-5 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                        <Sparkles className="w-8 h-8 animate-pulse" />
                      </div>
                      <h3 className="text-base md:text-lg font-bold text-slate-100 uppercase font-mono tracking-wider mb-2">
                        Draft Laporan Belum Disusun
                      </h3>
                      <p className="text-xs text-slate-400 font-mono max-w-md leading-relaxed mb-6">
                        Sistem AI DENS CAKRA siap mentranskrip dan menganalisis
                        bahan keterangan lapangan dari{" "}
                        <span className="text-cyan-400 font-bold">
                          {activeAnswer.agen}
                        </span>{" "}
                        menjadi dokumen formal standar nasional.
                      </p>
                      <Button
                        onClick={handleGenerateAI}
                        className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs tracking-widest uppercase px-6 py-4 h-12 gap-2.5 shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all"
                      >
                        <Sparkles className="w-4 h-4 stroke-[2.5]" />
                        <span>Generate Laporan Intelijen Sekarang</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
                      {/* Judul Laporan */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-mono tracking-widest text-cyan-400 uppercase font-bold flex items-center justify-between">
                          <span>Judul Laporan Intelijen</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            KLASIFIKASI: SANGAT RAHASIA
                          </span>
                        </label>
                        <input
                          type="text"
                          value={activeAnswer.repJudul || ""}
                          onChange={(e) =>
                            setActiveAnswer({
                              ...activeAnswer,
                              repJudul: e.target.value,
                            })
                          }
                          className="bg-[#060A11] border border-slate-800 rounded-xl px-4 py-3.5 text-sm font-mono text-slate-100 font-bold focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"
                        />
                      </div>

                      {/* Section I */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-mono tracking-widest text-cyan-400 uppercase font-bold">
                          I. Fakta-Fakta &amp; Observasi Lapangan
                        </label>
                        <textarea
                          rows={4}
                          value={activeAnswer.repSec1 || ""}
                          onChange={(e) =>
                            setActiveAnswer({
                              ...activeAnswer,
                              repSec1: e.target.value,
                            })
                          }
                          className="bg-[#060A11] border border-slate-800 rounded-xl px-4 py-3.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 transition-colors resize-none leading-relaxed shadow-inner"
                        />
                      </div>

                      {/* Section II */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-mono tracking-widest text-cyan-400 uppercase font-bold">
                          II. Analisis &amp; Evaluasi Informasi
                        </label>
                        <textarea
                          rows={4}
                          value={activeAnswer.repSec2 || ""}
                          onChange={(e) =>
                            setActiveAnswer({
                              ...activeAnswer,
                              repSec2: e.target.value,
                            })
                          }
                          className="bg-[#060A11] border border-slate-800 rounded-xl px-4 py-3.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 transition-colors resize-none leading-relaxed shadow-inner"
                        />
                      </div>

                      {/* Section III */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-mono tracking-widest text-cyan-400 uppercase font-bold">
                          III. Potensi Dampak &amp; Kerawanan
                        </label>
                        <textarea
                          rows={3}
                          value={activeAnswer.repSec3 || ""}
                          onChange={(e) =>
                            setActiveAnswer({
                              ...activeAnswer,
                              repSec3: e.target.value,
                            })
                          }
                          className="bg-[#060A11] border border-slate-800 rounded-xl px-4 py-3.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 transition-colors resize-none leading-relaxed shadow-inner"
                        />
                      </div>

                      {/* Section IV */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-mono tracking-widest text-cyan-400 uppercase font-bold">
                          IV. Perkiraan Perkembangan (Forecasting)
                        </label>
                        <textarea
                          rows={3}
                          value={activeAnswer.repSec4 || ""}
                          onChange={(e) =>
                            setActiveAnswer({
                              ...activeAnswer,
                              repSec4: e.target.value,
                            })
                          }
                          className="bg-[#060A11] border border-slate-800 rounded-xl px-4 py-3.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 transition-colors resize-none leading-relaxed shadow-inner"
                        />
                      </div>

                      {/* Section V */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-mono tracking-widest text-cyan-400 uppercase font-bold">
                          V. Rekomendasi &amp; Saran Tindak
                        </label>
                        <textarea
                          rows={3}
                          value={activeAnswer.repSec5 || ""}
                          onChange={(e) =>
                            setActiveAnswer({
                              ...activeAnswer,
                              repSec5: e.target.value,
                            })
                          }
                          className="bg-[#060A11] border border-slate-800 rounded-xl px-4 py-3.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 transition-colors resize-none leading-relaxed shadow-inner"
                        />
                      </div>

                      {/* Section VI */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-mono tracking-widest text-cyan-400 uppercase font-bold">
                          VI. Executive Summary (Rangkuman Pimpinan)
                        </label>
                        <textarea
                          rows={3}
                          value={activeAnswer.repSec6 || ""}
                          onChange={(e) =>
                            setActiveAnswer({
                              ...activeAnswer,
                              repSec6: e.target.value,
                            })
                          }
                          className="bg-[#060A11] border border-slate-800 rounded-xl px-4 py-3.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 transition-colors resize-none leading-relaxed shadow-inner"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "CATATAN" && (
                <div className="flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-2xl p-12 text-center min-h-[350px]">
                  <MessageSquare className="w-10 h-10 text-slate-600 mb-3" />
                  <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">
                    Belum ada catatan analis untuk laporan ini.
                  </p>
                </div>
              )}

              {activeTab === "REVISI" && (
                <div className="flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-2xl p-12 text-center min-h-[350px]">
                  <History className="w-10 h-10 text-slate-600 mb-3" />
                  <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">
                    Belum ada riwayat revisi (Versi 1.0 - Draft Awal).
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
