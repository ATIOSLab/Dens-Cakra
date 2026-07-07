"use client";

import React, { useState } from "react";
import {
  FileText,
  Plus,
  Eye,
  ArrowLeft,
  Save,
  Send,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  ShieldAlert,
  Search,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface UkstrItem {
  id: string;
  nomor: string;
  judul: string;
  klasifikasi: string;
  batasWaktu: string;
  wilayah: string;
  status: "DRAFT" | "DITERBITKAN";
  sumber: string;
  pemberi: string;
  tanggal: string;
  isu: string;
  uraian: string;
  sec1: string;
  sec2: string;
  sec3: string;
  sec4: string;
  sec5: string;
  sec6: string;
  sec7: string;
  sec8: string;
  sec9: string;
}

const INITIAL_DUMMY_DATA: UkstrItem[] = [];

export default function UkstrPage() {
  const [items, setItems] = useState<UkstrItem[]>(INITIAL_DUMMY_DATA);
  const [viewMode, setViewMode] = useState<"LIST" | "FORM">("LIST");
  const [activeItem, setActiveItem] = useState<UkstrItem | null>(null);
  const [recentlyModifiedId, setRecentlyModifiedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "info";
    text: string;
  } | null>(null);

  const showNotify = (text: string, type: "success" | "info" = "success") => {
    setNotification({ type, text });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleCreateNew = () => {
    const newItem: UkstrItem = {
      id: `STR-${Date.now()}`,
      nomor: `STR/00${items.length + 1}/VII/2026`,
      judul: "",
      klasifikasi: "RAHASIA",
      batasWaktu: "2026-07-20",
      wilayah: "Nasional",
      status: "DRAFT",
      sumber: "Arahan Operasional",
      pemberi: "Deputi Intelijen",
      tanggal: "07/07/2026",
      isu: "",
      uraian: "",
      sec1: "",
      sec2: "",
      sec3: "",
      sec4: "",
      sec5: "",
      sec6: "",
      sec7: "",
      sec8: "",
      sec9: "",
    };
    setActiveItem(newItem);
    setViewMode("FORM");
  };

  const handleEditItem = (item: UkstrItem) => {
    setActiveItem({ ...item });
    setViewMode("FORM");
  };

  const handleSaveDraft = () => {
    if (!activeItem) return;
    const updated = {
      ...activeItem,
      status: "DRAFT" as const,
      judul: activeItem.judul || "Analisis Potensi Kerawanan & Deteksi Dini Ancaman Operasional",
    };
    setActiveItem(updated);

    setItems((prev) => {
      const exists = prev.some((x) => x.id === updated.id);
      if (exists) {
        return prev.map((x) => (x.id === updated.id ? updated : x));
      }
      return [updated, ...prev];
    });

    setRecentlyModifiedId(updated.id);
    setViewMode("LIST");
    showNotify("✅ Draft Penjabaran UK/STR berhasil disimpan ke basis data!", "info");

    setTimeout(() => {
      setRecentlyModifiedId(null);
    }, 4000);
  };

  const handlePublish = () => {
    if (!activeItem) return;
    const updated = {
      ...activeItem,
      status: "DITERBITKAN" as const,
      judul: activeItem.judul || "Analisis Potensi Kerawanan & Deteksi Dini Ancaman Operasional",
    };
    setActiveItem(updated);

    setItems((prev) => {
      const exists = prev.some((x) => x.id === updated.id);
      if (exists) {
        return prev.map((x) => (x.id === updated.id ? updated : x));
      }
      return [updated, ...prev];
    });

    setRecentlyModifiedId(updated.id);
    setViewMode("LIST");
    showNotify("🚀 Tugas UK/STR resmi DITERBITKAN ke seluruh operatif lapangan!");

    setTimeout(() => {
      setRecentlyModifiedId(null);
    }, 4000);
  };

  const handleGenerateAI = () => {
    if (!activeItem) return;
    const aiFilled: UkstrItem = {
      ...activeItem,
      judul:
        activeItem.judul ||
        "Pengamanan Objek Vital Nasional & Antisipasi Ancaman Siber",
      isu:
        activeItem.isu ||
        "Ancaman spionase digital dan kerentanan infrastruktur kritis",
      uraian:
        activeItem.uraian ||
        "Lakukan pemantauan intensif pada lalu lintas data strategis dan koordinasi pengamanan obvitnas.",
      sec1: "A. UU No 17 Tahun 2011 tentang Intelijen Negara\nB. Instruksi Presiden RI terkait Ketahanan Siber\nC. STR Deputi Bidang Intelijen Siber",
      sec2: "A. Jaringan spionase asing dan aktor ancaman siber\nB. Pusat data nasional dan infrastruktur telekomunikasi\nC. Kelompok hacktivist radikal",
      sec3: "1. Siapa aktor utama di balik anomali trafik jaringan obvitnas?\n2. Apakah terdapat eksfiltrasi data rahasia negara?\n3. Bagaimana pola komunikasi antar sel infiltrasi?",
      sec4: "A. SIGINT/CYBER: Deep packet inspection dan pemantauan dark web\nB. HUMINT: Penggalangan sumber tertutup di sektor IT obvitnas\nC. OSINT: Analisis sentimen dan jejak digital ancaman",
      sec5: "Tingkat risiko: TINGGI. Kemungkinan serangan DDOS dan Ransomware terkoordinasi dalam 14 hari ke depan.",
      sec6: "1. Pembentukan Satgas Khusus Pengamanan Obvitnas\n2. Pelaporan waktu nyata (Real-time reporting) via DENS CAKRA CC\n3. Jam malam operasional dan siaga 1 personel siber",
      sec7: "1. Koordinasi taktis dengan BSSN dan Cyber Crime Polri\n2. Laporan berkala setiap 6 jam kepada Kabinda dan Deputi",
      sec8: "1. Segera lakukan isolasi jaringan pada server yang terdeteksi rentan\n2. Tingkatkan patroli siber 24/7\n3. Siapkan protokol mitigasi darurat",
      sec9: "1. Kepala BINDA Seluruh Indonesia\n2. Direktur Operasi Siber\n3. Analis Intelijen Wilayah",
    };
    setActiveItem(aiFilled);
    showNotify("⚡ AI DENS CAKRA berhasil meng-generate dokumen UK/STR lengkap!");
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#050A10] text-slate-300 font-sans p-3 lg:p-6 overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-lg border shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
            notification.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              : "bg-cyan-950/90 border-cyan-500/50 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
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
                Penjabaran UK/STR
              </h1>
              <p className="text-[10px] text-slate-500 tracking-[0.2em] font-mono mt-1.5 uppercase">
                Daftar Tugas Intelijen Strategis
              </p>
            </div>

            {/* Action Button */}
            <div className="flex items-center gap-3">
              <Button
                onClick={handleCreateNew}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs tracking-wider uppercase px-4 py-2 h-10 gap-2 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Buat UK/STR Baru</span>
              </Button>
            </div>
          </div>

          {/* Table Container */}
          <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-850 text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500 font-semibold">
                    <th className="py-3 px-4">Nomor / Judul</th>
                    <th className="py-3 px-4">Klasifikasi</th>
                    <th className="py-3 px-4">Batas Waktu</th>
                    <th className="py-3 px-4">Wilayah</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/60 text-xs">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className={`transition-all duration-700 group ${
                        recentlyModifiedId === item.id
                          ? "bg-cyan-500/15 border-l-4 border-cyan-400 shadow-[inset_0_0_20px_rgba(6,182,212,0.2)] animate-pulse"
                          : "hover:bg-slate-900/50"
                      }`}
                    >
                      {/* Nomor / Judul */}
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleEditItem(item)}
                          className="text-cyan-400 font-bold font-mono tracking-wider hover:underline text-left block mb-1"
                        >
                          {item.nomor}
                        </button>
                        <div className="text-slate-400 text-[11px] line-clamp-1">
                          {item.judul || "Belum ada judul tugas"}
                        </div>
                      </td>

                      {/* Klasifikasi */}
                      <td className="py-4 px-4 font-mono font-bold tracking-wider">
                        <span
                          className={
                            item.klasifikasi === "SANGAT RAHASIA"
                              ? "text-red-500"
                              : item.klasifikasi === "RAHASIA"
                              ? "text-amber-500"
                              : "text-blue-400"
                          }
                        >
                          {item.klasifikasi}
                        </span>
                      </td>

                      {/* Batas Waktu */}
                      <td className="py-4 px-4 font-mono text-slate-300">
                        {item.batasWaktu}
                      </td>

                      {/* Wilayah */}
                      <td className="py-4 px-4 text-slate-200 font-semibold">
                        {item.wilayah}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 font-mono font-bold">
                        <span
                          className={`px-2.5 py-1 rounded text-[10px] tracking-widest uppercase border ${
                            item.status === "DITERBITKAN"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* Aksi */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleEditItem(item)}
                          title="Lihat & Edit Aksi"
                          className="p-2 rounded-lg bg-slate-800/80 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 border border-slate-700/60 hover:border-cyan-500/40 transition-all inline-flex items-center justify-center"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* VIEW MODE: FORM */}
      {viewMode === "FORM" && activeItem && (
        <div className="flex flex-col gap-6">
          {/* Top Form Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-900">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setViewMode("LIST")}
                className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 transition-colors flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg md:text-2xl font-bold tracking-[0.15em] text-slate-100 uppercase">
                  Form Penjabaran UK/STR
                </h1>
                <p className="text-[10px] text-slate-500 tracking-[0.2em] font-mono mt-1 uppercase">
                  Edit Tugas: <span className="text-cyan-400">{activeItem.nomor}</span>
                  {" — "}Status:{" "}
                  <span
                    className={
                      activeItem.status === "DITERBITKAN"
                        ? "text-emerald-400 font-bold"
                        : "text-amber-400 font-bold"
                    }
                  >
                    {activeItem.status}
                  </span>
                </p>
              </div>
            </div>

            {/* Save Draft & Publish Buttons */}
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSaveDraft}
                variant="outline"
                className="border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-mono tracking-wider uppercase px-4 h-10 gap-2"
              >
                <Save className="w-4 h-4 text-amber-400" />
                <span>Simpan Draft</span>
              </Button>

              <Button
                onClick={handlePublish}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs tracking-wider uppercase px-5 h-10 gap-2 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
              >
                <Send className="w-4 h-4 stroke-[2.5]" />
                <span>Terbitkan Tugas</span>
              </Button>
            </div>
          </div>

          {/* Two Panels Layout: Left (Input Perintah) & Right (Output UK/STR) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* PANEL KIRI - INPUT PERINTAH (Width 5/12) */}
            <div className="lg:col-span-5 border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-6 flex flex-col shadow-lg gap-5">
              <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                <span className="text-xs font-mono font-bold tracking-[0.2em] uppercase text-slate-300">
                  Panel Kiri — Input Perintah
                </span>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded uppercase">
                  Parameter
                </span>
              </div>

              {/* Grid 2 Cols: Nomor & Klasifikasi */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono tracking-widest text-slate-500 uppercase font-semibold">
                    Nomor Perintah
                  </label>
                  <input
                    type="text"
                    value={activeItem.nomor}
                    onChange={(e) =>
                      setActiveItem({ ...activeItem, nomor: e.target.value })
                    }
                    className="bg-[#060A11] border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono tracking-widest text-slate-500 uppercase font-semibold">
                    Klasifikasi
                  </label>
                  <select
                    value={activeItem.klasifikasi}
                    onChange={(e) =>
                      setActiveItem({
                        ...activeItem,
                        klasifikasi: e.target.value,
                      })
                    }
                    className="bg-[#060A11] border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="SANGAT RAHASIA">SANGAT RAHASIA</option>
                    <option value="RAHASIA">RAHASIA</option>
                    <option value="TERBATAS">TERBATAS</option>
                  </select>
                </div>
              </div>

              {/* Grid 2 Cols: Sumber & Pemberi */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono tracking-widest text-slate-500 uppercase font-semibold">
                    Sumber Perintah
                  </label>
                  <input
                    type="text"
                    value={activeItem.sumber}
                    onChange={(e) =>
                      setActiveItem({ ...activeItem, sumber: e.target.value })
                    }
                    className="bg-[#060A11] border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono tracking-widest text-slate-500 uppercase font-semibold">
                    Pemberi Perintah
                  </label>
                  <input
                    type="text"
                    value={activeItem.pemberi}
                    onChange={(e) =>
                      setActiveItem({ ...activeItem, pemberi: e.target.value })
                    }
                    className="bg-[#060A11] border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Grid 2 Cols: Tanggal & Batas Waktu */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono tracking-widest text-slate-500 uppercase font-semibold">
                    Tanggal Perintah
                  </label>
                  <input
                    type="text"
                    value={activeItem.tanggal}
                    onChange={(e) =>
                      setActiveItem({ ...activeItem, tanggal: e.target.value })
                    }
                    className="bg-[#060A11] border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono tracking-widest text-slate-500 uppercase font-semibold">
                    Batas Waktu
                  </label>
                  <input
                    type="text"
                    value={activeItem.batasWaktu}
                    onChange={(e) =>
                      setActiveItem({
                        ...activeItem,
                        batasWaktu: e.target.value,
                      })
                    }
                    className="bg-[#060A11] border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Wilayah Sasaran */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-mono tracking-widest text-slate-500 uppercase font-semibold">
                  Wilayah Sasaran
                </label>
                <input
                  type="text"
                  value={activeItem.wilayah}
                  onChange={(e) =>
                    setActiveItem({ ...activeItem, wilayah: e.target.value })
                  }
                  className="bg-[#060A11] border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Isu Strategis */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-mono tracking-widest text-slate-500 uppercase font-semibold">
                  Isu Strategis
                </label>
                <textarea
                  rows={2}
                  value={activeItem.isu}
                  onChange={(e) =>
                    setActiveItem({ ...activeItem, isu: e.target.value })
                  }
                  className="bg-[#060A11] border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              {/* Uraian Perintah */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-mono tracking-widest text-slate-500 uppercase font-semibold">
                  Uraian Perintah
                </label>
                <textarea
                  rows={4}
                  value={activeItem.uraian}
                  onChange={(e) =>
                    setActiveItem({ ...activeItem, uraian: e.target.value })
                  }
                  className="bg-[#060A11] border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>
            </div>

            {/* PANEL KANAN - OUTPUT UK/STR (Width 7/12) */}
            <div className="lg:col-span-7 border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-6 flex flex-col shadow-lg gap-5">
              <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <span className="text-xs font-mono font-bold tracking-[0.2em] uppercase text-slate-300">
                    Panel Kanan — Output UK/STR
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase font-bold">
                  AI Engine Ready
                </span>
              </div>

              {/* AI Automation Buttons */}
              <div className="flex flex-col gap-2.5">
                <Button
                  onClick={handleGenerateAI}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs tracking-widest uppercase h-10 gap-2 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
                >
                  <Sparkles className="w-4 h-4 stroke-[2.5]" />
                  <span>Generate UK/STR Lengkap</span>
                </Button>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={handleGenerateAI}
                    className="border border-slate-800 bg-[#060A11] hover:bg-slate-800 text-slate-300 text-[10px] font-mono uppercase tracking-wider py-2 px-2 rounded transition-colors text-center"
                  >
                    Generate EEI/PIR
                  </button>
                  <button
                    onClick={handleGenerateAI}
                    className="border border-slate-800 bg-[#060A11] hover:bg-slate-800 text-slate-300 text-[10px] font-mono uppercase tracking-wider py-2 px-2 rounded transition-colors text-center"
                  >
                    Generate Rencana
                  </button>
                  <button
                    onClick={handleGenerateAI}
                    className="border border-slate-800 bg-[#060A11] hover:bg-slate-800 text-slate-300 text-[10px] font-mono uppercase tracking-wider py-2 px-2 rounded transition-colors text-center"
                  >
                    Generate Saran
                  </button>
                  <button
                    onClick={handleGenerateAI}
                    className="border border-slate-800 bg-[#060A11] hover:bg-slate-800 text-slate-300 text-[10px] font-mono uppercase tracking-wider py-2 px-2 rounded transition-colors text-center"
                  >
                    Perbaiki Bahasa
                  </button>
                </div>
              </div>

              {/* Document Output Fields */}
              <div className="flex flex-col gap-4 mt-2">
                {/* Judul UK/STR */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
                    Judul UK/STR
                  </label>
                  <input
                    type="text"
                    value={activeItem.judul}
                    onChange={(e) =>
                      setActiveItem({ ...activeItem, judul: e.target.value })
                    }
                    className="bg-[#060A11] border border-slate-800 rounded px-3.5 py-2.5 text-xs font-mono text-slate-100 font-semibold focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Section I */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
                    I. Dasar dan Latar Belakang
                  </label>
                  <textarea
                    rows={3}
                    value={activeItem.sec1}
                    onChange={(e) =>
                      setActiveItem({ ...activeItem, sec1: e.target.value })
                    }
                    className="bg-[#060A11] border border-slate-800 rounded px-3.5 py-2.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
                  />
                </div>

                {/* Section II */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
                    II. Sasaran Penyelidikan
                  </label>
                  <textarea
                    rows={3}
                    value={activeItem.sec2}
                    onChange={(e) =>
                      setActiveItem({ ...activeItem, sec2: e.target.value })
                    }
                    className="bg-[#060A11] border border-slate-800 rounded px-3.5 py-2.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
                  />
                </div>

                {/* Section III */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
                    III. EEI dan PIR
                  </label>
                  <textarea
                    rows={3}
                    value={activeItem.sec3}
                    onChange={(e) =>
                      setActiveItem({ ...activeItem, sec3: e.target.value })
                    }
                    className="bg-[#060A11] border border-slate-800 rounded px-3.5 py-2.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
                  />
                </div>

                {/* Section IV */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
                    IV. Rencana Pengumpulan
                  </label>
                  <textarea
                    rows={3}
                    value={activeItem.sec4}
                    onChange={(e) =>
                      setActiveItem({ ...activeItem, sec4: e.target.value })
                    }
                    className="bg-[#060A11] border border-slate-800 rounded px-3.5 py-2.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
                  />
                </div>

                {/* Section V */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
                    V. Analisis Ancaman &amp; Risiko
                  </label>
                  <textarea
                    rows={2}
                    value={activeItem.sec5}
                    onChange={(e) =>
                      setActiveItem({ ...activeItem, sec5: e.target.value })
                    }
                    className="bg-[#060A11] border border-slate-800 rounded px-3.5 py-2.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
                  />
                </div>

                {/* Section VI */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
                    VI. Mekanisme Pelaksanaan
                  </label>
                  <textarea
                    rows={2}
                    value={activeItem.sec6}
                    onChange={(e) =>
                      setActiveItem({ ...activeItem, sec6: e.target.value })
                    }
                    className="bg-[#060A11] border border-slate-800 rounded px-3.5 py-2.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
                  />
                </div>

                {/* Section VII */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
                    VII. Koordinasi dan Pelaporan
                  </label>
                  <textarea
                    rows={2}
                    value={activeItem.sec7}
                    onChange={(e) =>
                      setActiveItem({ ...activeItem, sec7: e.target.value })
                    }
                    className="bg-[#060A11] border border-slate-800 rounded px-3.5 py-2.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
                  />
                </div>

                {/* Section VIII */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
                    VIII. Saran Tindak
                  </label>
                  <textarea
                    rows={2}
                    value={activeItem.sec8}
                    onChange={(e) =>
                      setActiveItem({ ...activeItem, sec8: e.target.value })
                    }
                    className="bg-[#060A11] border border-slate-800 rounded px-3.5 py-2.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
                  />
                </div>

                {/* Section IX */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
                    IX. Distribusi
                  </label>
                  <textarea
                    rows={2}
                    value={activeItem.sec9}
                    onChange={(e) =>
                      setActiveItem({ ...activeItem, sec9: e.target.value })
                    }
                    className="bg-[#060A11] border border-slate-800 rounded px-3.5 py-2.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
