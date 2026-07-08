"use client";

import React, { useState } from "react";
import { 
  Database, 
  Filter, 
  Plus 
} from "lucide-react";
import { Button } from "@/components/ui/button";

const tabs = [
  "PROVINSI",
  "WILAYAH / BINDA",
  "KATEGORI LAPORAN",
  "JENIS LAPORAN",
  "JENIS PERINGATAN",
  "PENGATURAN KPI",
  "PERAN PENGGUNA",
  "PARAMETER",
];

// Table headers structure for each tab matching the screenshots exactly
const tableHeaders: Record<string, string[]> = {
  "PROVINSI": ["KODE", "PROVINSI", "IBU KOTA", "ZONA WAKTU", "JUMLAH BINDA", "AKSI"],
  "WILAYAH / BINDA": ["KODE", "BINDA", "PROVINSI", "KEPALA", "PERSONEL", "KPI", "STATUS", "AKSI"],
  "KATEGORI LAPORAN": ["KODE", "KATEGORI", "KETERANGAN", "STATUS", "AKSI"],
  "JENIS LAPORAN": ["KODE", "JENIS", "DESKRIPSI", "SLA VERIFIKASI", "STATUS", "AKSI"],
  "JENIS PERINGATAN": ["KODE", "JENIS", "DESKRIPSI", "ESKALASI OTOMATIS", "WARNA TOKEN", "AKSI"],
  "PENGATURAN KPI": ["KODE", "METRIK", "BOBOT (%)", "TARGET", "AMBANG BATAS", "AKSI"],
  "PERAN PENGGUNA": ["KODE", "PERAN", "TINGKAT IZIN", "JUMLAH PENGGUNA", "HAK AKSES", "AKSI"],
  "PARAMETER": ["PARAMETER", "NILAI", "SATUAN", "KETERANGAN", "AKSI"],
};

// Text descriptor above the table matching the screenshots
const tabLabels: Record<string, string> = {
  "PROVINSI": "provinsi",
  "WILAYAH / BINDA": "wilayah / binda",
  "KATEGORI LAPORAN": "kategori laporan",
  "JENIS LAPORAN": "jenis laporan",
  "JENIS PERINGATAN": "jenis peringatan",
  "PENGATURAN KPI": "pengaturan kpi",
  "PERAN PENGGUNA": "peran pengguna",
  "PARAMETER": "parameter sistem",
};

export default function DataMaster() {
  const [activeTab, setActiveTab] = useState("PROVINSI");

  const currentHeaders = tableHeaders[activeTab] || ["KODE", "NAMA", "AKSI"];
  const displayLabel = tabLabels[activeTab] || activeTab.toLowerCase();

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen bg-[#050A10] text-slate-100">
      {/* Top Header */}
      <div className="flex justify-between items-center border-b border-slate-800/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-wider text-slate-100">DATA MASTER</h1>
          <p className="text-[10px] text-slate-500 tracking-[0.2em] font-semibold mt-1 uppercase">
            Tabel Referensi Sistem // Registrasi Inti
          </p>
        </div>

        {/* Sync Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <span className="text-[10px] font-mono font-bold tracking-widest text-blue-400">
            SINKRONISASI AKTIF
          </span>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-6 shadow-2xl flex flex-col gap-6">
        {/* Title */}
        <div className="flex items-center gap-2 border-b border-slate-800/60 pb-4">
          <Database className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm tracking-[0.15em] uppercase font-bold text-slate-200">
            Manajemen Data Referensi
          </h2>
        </div>

        {/* Horizontal Navigation Scroll Tabs */}
        <div className="w-full">
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-[10px] font-semibold tracking-widest rounded transition-all shrink-0 font-mono ${
                  activeTab === tab
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                    : "bg-slate-900/40 text-slate-400 border border-slate-800/80 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Action Controls & Info */}
        <div className="flex justify-between items-center mt-2">
          <div className="text-[11px] text-slate-400 font-mono tracking-wider">
            Menampilkan <span className="text-slate-500 font-bold">0</span> {displayLabel}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-slate-300 text-xs gap-1.5 px-3 h-8"
              disabled
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
            </Button>
            <Button
              size="sm"
              className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold text-xs gap-1.5 px-3 h-8 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
              disabled
            >
              <Plus className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
              <span>Tambah</span>
            </Button>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="w-full overflow-x-auto border border-slate-800/60 rounded-lg bg-slate-950/20">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/30 text-[10px] text-slate-500 tracking-wider font-mono uppercase">
                {currentHeaders.map((header, idx) => (
                  <th 
                    key={header} 
                    className={`py-3 px-4 font-semibold ${
                      idx === currentHeaders.length - 1 ? "text-right" : ""
                    } ${
                      header === "ZONA WAKTU" || 
                      header === "STATUS" || 
                      header === "JUMLAH BINDA" || 
                      header === "KPI" ||
                      header === "BOBOT (%)" ||
                      header === "TINGKAT IZIN" ||
                      header === "JUMLAH PENGGUNA" ||
                      header === "NILAI" ||
                      header === "SATUAN"
                        ? "text-center" 
                        : ""
                    }`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={currentHeaders.length} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                    <Database className="w-8 h-8 opacity-30 animate-pulse text-cyan-500" />
                    <p className="text-xs font-mono tracking-widest uppercase">Tidak Ada Data</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
