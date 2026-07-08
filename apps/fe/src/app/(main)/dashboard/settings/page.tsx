"use client";

import React, { useState } from "react";
import { ShieldAlert, BellRing, Save } from "lucide-react";

export default function SettingsPage() {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("15 mnt");
  const [criticalAlerts, setCriticalAlerts] = useState(false);
  const [dailyDigest, setDailyDigest] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-[#050A10] text-slate-300 font-sans p-3 lg:p-6 overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-slate-800/60 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-[0.15em] text-slate-100 uppercase">
            Pengaturan Sistem
          </h1>
          <p className="text-[10px] text-slate-500 tracking-[0.2em] font-mono mt-1.5 uppercase">
            Konfigurasi &amp; Preferensi // Parameter Global
          </p>
        </div>

        <div className="flex items-center gap-2 border border-blue-500/30 bg-blue-500/10 rounded px-3 py-1.5 text-blue-400">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[10px] tracking-widest font-mono uppercase font-bold">
            Sinkronisasi Aktif
          </span>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Keamanan */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col relative overflow-hidden group">
          <div className="flex items-center gap-2.5 mb-6">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200">
              Keamanan
            </h3>
          </div>

          <div className="space-y-6">
            {/* MFA Option */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-slate-200 font-semibold tracking-wider">
                  Wajibkan MFA
                </span>
                <span className="text-[10px] text-slate-500 font-mono tracking-wide mt-1">
                  Terapkan otentikasi multi-faktor untuk semua pengguna.
                </span>
              </div>
              <input
                type="checkbox"
                checked={mfaEnabled}
                onChange={(e) => setMfaEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 accent-cyan-500 focus:ring-0 cursor-pointer mt-1"
              />
            </div>

            {/* Session Timeout Option */}
            <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-850">
              <div className="flex flex-col">
                <span className="text-xs text-slate-200 font-semibold tracking-wider">
                  Batas Waktu Sesi
                </span>
                <span className="text-[10px] text-slate-500 font-mono tracking-wide mt-1">
                  Keluar otomatis untuk pengguna yang tidak aktif.
                </span>
              </div>
              <select
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className="border border-slate-700 bg-slate-900/60 rounded px-2.5 py-1 text-xs text-slate-350 font-mono outline-none cursor-pointer hover:border-slate-600 transition-colors"
              >
                <option value="5 mnt">5 mnt</option>
                <option value="15 mnt">15 mnt</option>
                <option value="30 mnt">30 mnt</option>
                <option value="1 jam">1 jam</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifikasi */}
        <div className="border border-slate-800/80 bg-[#0B111D]/80 rounded-xl p-5 flex flex-col relative overflow-hidden group">
          <div className="flex items-center gap-2.5 mb-6">
            <BellRing className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs tracking-[0.15em] uppercase font-bold text-slate-200">
              Notifikasi
            </h3>
          </div>

          <div className="space-y-6">
            {/* Critical Alerts Option */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-slate-200 font-semibold tracking-wider">
                  Peringatan Kritis
                </span>
                <span className="text-[10px] text-slate-500 font-mono tracking-wide mt-1">
                  Notifikasi push untuk peringatan sistem kritis.
                </span>
              </div>
              <input
                type="checkbox"
                checked={criticalAlerts}
                onChange={(e) => setCriticalAlerts(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 accent-cyan-500 focus:ring-0 cursor-pointer mt-1"
              />
            </div>

            {/* Daily Digest Option */}
            <div className="flex items-start justify-between gap-4 pt-4 border-t border-slate-850">
              <div className="flex flex-col">
                <span className="text-xs text-slate-200 font-semibold tracking-wider">
                  Ringkasan Harian
                </span>
                <span className="text-[10px] text-slate-500 font-mono tracking-wide mt-1">
                  Terima ringkasan aktivitas sistem setiap hari.
                </span>
              </div>
              <input
                type="checkbox"
                checked={dailyDigest}
                onChange={(e) => setDailyDigest(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 accent-cyan-500 focus:ring-0 cursor-pointer mt-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Action */}
      <div className="flex justify-end">
        <button className="flex items-center gap-2 border border-blue-500 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white px-5 py-2.5 rounded font-mono text-xs tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(59,130,246,0.25)] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]">
          <Save className="w-3.5 h-3.5" /> Simpan Perubahan
        </button>
      </div>
    </div>
  );
}
