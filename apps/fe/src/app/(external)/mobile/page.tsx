"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  CheckCircle2,
  Lock,
  Smartphone,
  AlertTriangle,
  FileText,
  History,
  Target,
  User,
  Bell,
  Radio,
  Plus,
  Home,
  Check,
  X,
  ShieldAlert,
} from "lucide-react";

type MobileStep = "LANDING" | "MFA" | "DASHBOARD" | "PANIC_TRIGGER" | "PANIC_SENT" | "CREATE_REPORT";
type MobileTab = "BERANDA" | "TUGAS" | "RIWAYAT" | "KPI" | "PROFIL";

interface TaskItem {
  id: string;
  nomor: string;
  deadline: string;
  judul: string;
  deskripsi: string;
  status: "BELUM_DIJAWAB" | "DIKIRIM";
}

export default function MobileAppPage() {
  const [step, setStep] = useState<MobileStep>("LANDING");
  const [activeTab, setActiveTab] = useState<MobileTab>("BERANDA");
  
  // Interactive stats
  const [reportsCount, setReportsCount] = useState({
    bulanIni: 0,
    draftOffline: 0,
    dikirim: 0,
    diterimaNasional: 0,
  });

  const [showToast, setShowToast] = useState(true);
  const [toastMsg, setToastMsg] = useState("Masuk sebagai Personel Lapangan");
  const [toastType, setToastType] = useState<"SUCCESS" | "DANGER">("SUCCESS");

  const [tasks, setTasks] = useState<TaskItem[]>([
    {
      id: "TSK-001",
      nomor: "STR/001/X/2023",
      deadline: "2023-11-05",
      judul: "Deteksi Dini Kelompok Radikal Jelang Pemilu 2024",
      deskripsi: "Lakukan deteksi dini terhadap kelompok radikal yang berpotensi mengganggu tahapan pemilu.",
      status: "BELUM_DIJAWAB",
    }
  ]);
  const [isAnswering, setIsAnswering] = useState(false);
  const [answerText, setAnswerText] = useState("");

  // Report creation selection
  const reportOptions = [
    "Laporan Kejadian",
    "Laporan Cepat",
    "Laporan Harian",
    "Laporan Khusus",
    "Laporan Darurat",
  ];
  const [selectedReportType, setSelectedReportType] = useState<string>("Laporan Kejadian");

  // Press and hold logic for Panic Button
  const [holdProgress, setHoldProgress] = useState(0);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isHoldingRef = useRef(false);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const triggerToast = (msg: string, type: "SUCCESS" | "DANGER" = "SUCCESS") => {
    setToastMsg(msg);
    setToastType(type);
    setShowToast(true);
  };

  // Start holding panic button
  const startHold = () => {
    isHoldingRef.current = true;
    setHoldProgress(0);
    
    holdIntervalRef.current = setInterval(() => {
      setHoldProgress((prev) => {
        if (prev >= 100) {
          if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
          isHoldingRef.current = false;
          // Trigger panic sent screen
          setStep("PANIC_SENT");
          triggerToast("Sinyal Darurat Terkirim ke Command Center!", "DANGER");
          return 100;
        }
        return prev + 4; // Increases progress
      });
    }, 100);
  };

  // Stop holding panic button
  const endHold = () => {
    isHoldingRef.current = false;
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
    }
    setHoldProgress(0);
  };

  const handleLanjutkanReport = () => {
    setReportsCount(prev => ({
      ...prev,
      dikirim: prev.dikirim + 1,
      bulanIni: prev.bulanIni + 1,
    }));
    setStep("DASHBOARD");
    triggerToast(`✔️ ${selectedReportType} Berhasil Dikirim ke Pusat!`);
  };

  const handleSimpanDraftReport = () => {
    setReportsCount(prev => ({
      ...prev,
      draftOffline: prev.draftOffline + 1,
    }));
    setStep("DASHBOARD");
    triggerToast(`✔️ ${selectedReportType} Disimpan sebagai Draft Offline.`);
  };

  const handleAnswerTaskSubmit = (taskId: string) => {
    if (!answerText.trim()) return;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "DIKIRIM" } : t));
    setReportsCount(prev => ({
      ...prev,
      dikirim: prev.dikirim + 1,
      bulanIni: prev.bulanIni + 1,
      diterimaNasional: prev.diterimaNasional + 1,
    }));
    setIsAnswering(false);
    setAnswerText("");
    triggerToast("✔️ Jawaban Tugas Berhasil Dikirim!");
  };

  // STEP 1: LANDING VIEW
  if (step === "LANDING") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#03060a] text-slate-350 font-sans p-6 relative overflow-hidden">
        {/* Toast Alert Banner */}
        {showToast && (
          <div className="absolute top-6 left-6 z-50 flex items-center gap-2 border border-emerald-500/20 bg-emerald-950/80 px-4 py-2.5 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.15)] text-emerald-400 font-mono text-[10px] uppercase font-bold tracking-widest animate-in fade-in slide-in-from-top-4 duration-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Center Contents */}
        <div className="flex flex-col items-center max-w-sm w-full text-center">
          <div className="w-24 h-24 rounded-full bg-slate-950/30 border border-slate-900 flex items-center justify-center p-1.5 shadow-[0_0_20px_rgba(6,182,212,0.05)] mb-6">
            <Image
              src="/logo-badan-intelijen-negara.png"
              alt="Logo BIN"
              width={80}
              height={80}
              className="object-contain scale-110"
              priority
            />
          </div>

          <h1 className="text-xl md:text-2xl font-bold tracking-[0.25em] text-cyan-400 uppercase leading-none mb-2">
            DENS CAKRA
          </h1>
          <p className="text-[9px] text-slate-500 tracking-[0.2em] uppercase font-mono mb-10 max-w-[280px] leading-relaxed mx-auto">
            DASHBOARD EVALUASI NASIONAL<br />DAN SITUATIONAL AWARENESS
          </p>

          {/* Login Card */}
          <div className="w-full border border-slate-900 bg-[#070B13]/90 rounded-2xl p-6 shadow-xl backdrop-blur-md">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.25em] block mb-3">
              ROLE DEMO
            </span>
            <h2 className="text-base font-bold text-slate-100 tracking-wide mb-6">
              Personel Lapangan
            </h2>

            <button
              onClick={() => {
                setStep("DASHBOARD");
                triggerToast("Masuk Sebagai Demo Operator Lapangan");
              }}
              className="w-full bg-[#0091FF] hover:bg-[#0080E0] text-slate-950 font-mono text-xs font-bold uppercase py-3.5 px-4 rounded-lg tracking-widest transition-all shadow-[0_0_15px_rgba(0,145,255,0.25)] hover:shadow-[0_0_20px_rgba(0,145,255,0.4)] mb-4"
            >
              MASUK DEMO
            </button>

            <button
              onClick={() => {
                setStep("MFA");
                triggerToast("Buka Otentikasi Enterprise");
              }}
              className="text-[10px] font-mono text-slate-500 hover:text-cyan-400 tracking-wider transition-colors uppercase block mx-auto py-2"
            >
              Login Enterprise
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: MFA LOGIN VIEW
  if (step === "MFA") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#03060a] text-slate-350 font-sans p-6 relative overflow-hidden">
        {/* Center Contents */}
        <div className="flex flex-col items-center max-w-sm w-full">
          <p className="text-[9px] text-slate-500 tracking-[0.2em] uppercase font-mono mb-8 text-center leading-relaxed">
            DASHBOARD EVALUASI NASIONAL<br />DAN SITUATIONAL AWARENESS
          </p>

          {/* Form Card */}
          <div className="w-full border border-slate-900 bg-[#070B13]/90 rounded-2xl p-6 shadow-xl backdrop-blur-md">
            
            <div className="flex flex-col gap-1.5 mb-4">
              <label className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">
                ID PENGGUNA
              </label>
              <div className="w-full bg-[#04070D] border border-slate-900 rounded-lg py-3 px-4 text-xs font-mono text-slate-200 tracking-widest">
                OP-772
              </div>
            </div>

            <div className="flex flex-col gap-1.5 mb-4">
              <label className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">
                KATA SANDI
              </label>
              <div className="w-full bg-[#04070D] border border-slate-900 rounded-lg py-3 px-4 text-xs font-mono text-slate-200 tracking-widest">
                ••••••••
              </div>
            </div>

            <div className="flex flex-col gap-1.5 mb-5">
              <label className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">
                MFA TOKEN
              </label>
              <div className="w-full bg-[#04070D] border border-slate-900 rounded-lg py-3 px-4 text-xs font-mono text-slate-200 tracking-widest">
                849201
              </div>
            </div>

            {/* Device Binding Pill */}
            <div className="flex items-center gap-2 border border-cyan-500/20 bg-cyan-500/5 rounded-lg py-3 px-4 text-cyan-400 font-mono text-[9px] uppercase tracking-wider mb-6">
              <Smartphone className="w-4 h-4 shrink-0" />
              <span>Device Binding: Terverifikasi</span>
            </div>

            <button
              onClick={() => {
                setStep("DASHBOARD");
                triggerToast("Otentikasi Berhasil, Selamat Bertugas!");
              }}
              className="w-full bg-[#0091FF] hover:bg-[#0080E0] text-slate-950 font-mono text-xs font-bold uppercase py-3.5 px-4 rounded-lg tracking-widest transition-all shadow-[0_0_15px_rgba(0,145,255,0.25)] mb-4"
            >
              OTENTIKASI
            </button>

            <button
              onClick={() => setStep("LANDING")}
              className="text-[10px] font-mono text-slate-500 hover:text-slate-400 tracking-wider transition-colors uppercase block mx-auto py-2"
            >
              Kembali ke Demo
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 4: PANIC TRIGGER COUNTDOWN SCREEN (Screenshot 6)
  if (step === "PANIC_TRIGGER") {
    return (
      <div className="flex flex-col items-center justify-between min-h-screen bg-[#03060a] text-slate-100 font-sans p-6 overflow-hidden">
        {/* Header */}
        <div className="w-full flex justify-between items-center pt-6">
          <button 
            onClick={() => {
              endHold();
              setStep("DASHBOARD");
            }}
            className="p-2 text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="w-6" /> {/* Spacer */}
        </div>

        {/* Content */}
        <div className="flex flex-col items-center text-center w-full max-w-sm">
          <h2 className="text-xl md:text-2xl font-bold tracking-[0.1em] text-red-500 uppercase mb-3">
            PANIC BUTTON
          </h2>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-12">
            Gunakan hanya dalam kondisi darurat yang mengancam jiwa atau operasi.
          </p>

          {/* Interactive hold area */}
          <div className="relative w-56 h-56 flex items-center justify-center select-none">
            {/* Outer animated scanning circle */}
            <div className="absolute inset-0 rounded-full border border-slate-900/60 animate-ping opacity-25" />
            
            {/* SVG Progress Border */}
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle
                cx="112"
                cy="112"
                r="92"
                className="stroke-slate-900 fill-transparent"
                strokeWidth="4"
              />
              <circle
                cx="112"
                cy="112"
                r="92"
                className="stroke-red-500 fill-transparent transition-all duration-75"
                strokeWidth="6"
                strokeDasharray={2 * Math.PI * 92}
                strokeDashoffset={2 * Math.PI * 92 * (1 - holdProgress / 100)}
              />
            </svg>

            {/* Giant Circular Red Button */}
            <button
              onMouseDown={startHold}
              onMouseUp={endHold}
              onMouseLeave={endHold}
              onTouchStart={startHold}
              onTouchEnd={endHold}
              className="w-40 h-40 rounded-full bg-red-600 active:bg-red-700 border-4 border-slate-950 flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.3)] transition-all transform active:scale-95 cursor-pointer z-10"
            >
              <AlertTriangle className="w-16 h-16 text-white stroke-[1.8]" />
            </button>
          </div>

          <p className="text-xs font-mono font-bold tracking-[0.2em] text-slate-200 mt-12 uppercase">
            TEKAN DAN TAHAN 3 DETIK
          </p>
        </div>

        {/* Footer spacing */}
        <div className="pb-6" />
      </div>
    );
  }

  // STEP 5: PANIC ALERT TERKIRIM SCREEN (Screenshot 7)
  if (step === "PANIC_SENT") {
    return (
      <div className="flex flex-col items-center justify-between min-h-screen bg-[#b91c1c] text-white font-sans p-6 overflow-hidden relative">
        {/* Custom Red Toast */}
        <div className="absolute top-6 left-6 right-6 z-50 flex items-center gap-2.5 border border-white/20 bg-slate-950/95 px-4 py-3 rounded-lg shadow-2xl text-slate-200 font-mono text-[9px] uppercase font-bold tracking-wider animate-in fade-in slide-in-from-top-4 duration-300">
          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
          <span>Sinyal Darurat Terkirim ke Command Center!</span>
        </div>

        <div className="pt-20" /> {/* Spacer */}

        {/* Content */}
        <div className="flex flex-col items-center text-center w-full max-w-sm flex-1 justify-center">
          {/* Warning Icon Ring */}
          <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mb-8">
            <AlertTriangle className="w-12 h-12 text-white stroke-[2]" />
          </div>

          <h2 className="text-xl md:text-2xl font-bold tracking-[0.1em] uppercase mb-4">
            PANIC ALERT TERKIRIM
          </h2>
          <p className="text-xs text-white/80 max-w-[280px] leading-relaxed mb-10">
            Lokasi dan audio sedang ditransmisikan ke Pusat Komando. Bantuan sedang dikoordinasikan.
          </p>

          {/* Status Box */}
          <div className="w-full bg-slate-950/20 border border-white/15 rounded-xl p-4.5 mb-8">
            <span className="text-[8px] font-mono text-white/50 uppercase tracking-[0.2em] block mb-1">
              STATUS
            </span>
            <span className="text-base font-bold tracking-wide block text-white">
              Menunggu Tindak Lanjut
            </span>
          </div>

          {/* Action Button */}
          <button
            onClick={() => {
              setStep("DASHBOARD");
              setReportsCount(prev => ({
                ...prev,
                draftOffline: prev.draftOffline, // holds offline draft
              }));
            }}
            className="w-full bg-slate-950 hover:bg-slate-900 text-slate-100 font-mono text-xs font-bold uppercase py-3.5 px-4 rounded-lg tracking-widest transition-all border border-white/10"
          >
            Kembali ke Beranda
          </button>
        </div>

        <div className="pb-6" />
      </div>
    );
  }

  // STEP 6: CREATE REPORT FORM SELECTION PAGE (Screenshots 8 & 9)
  if (step === "CREATE_REPORT") {
    return (
      <div className="min-h-screen bg-[#03060a] text-slate-300 font-sans pb-24 relative flex flex-col justify-between">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-900/60 bg-[#060b13] px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-slate-950 border border-slate-850 flex items-center justify-center p-0.5">
              <Image
                src="/logo-badan-intelijen-negara.png"
                alt="BIN Logo"
                width={20}
                height={20}
                className="object-contain"
              />
            </div>
            <span className="text-xs font-bold font-mono tracking-widest text-cyan-400 uppercase">
              DENS CAKRA
            </span>
          </div>
          <div className="relative">
            <Bell className="w-4 h-4 text-slate-500" />
          </div>
        </div>

        {/* Options List */}
        <div className="flex-1 p-4 flex flex-col gap-3">
          {reportOptions.map((opt, i) => (
            <button
              key={i}
              onClick={() => setSelectedReportType(opt)}
              className={`w-full bg-[#060b13] hover:bg-[#070e1a] border rounded-xl py-4.5 px-5 text-left font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-between ${
                selectedReportType === opt 
                  ? "border-[#0091FF] text-[#0091FF] shadow-[0_0_12px_rgba(0,145,255,0.15)]" 
                  : "border-slate-900 text-slate-200"
              }`}
            >
              <span>{opt}</span>
              {selectedReportType === opt && (
                <CheckCircle2 className="w-4 h-4 text-[#0091FF] shrink-0" />
              )}
            </button>
          ))}
        </div>

        {/* Bottom Actions Row */}
        <div className="bg-[#060b13]/90 border-t border-slate-900/60 p-4 sticky bottom-0 z-40">
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <button
              onClick={handleSimpanDraftReport}
              className="w-full border border-slate-800 hover:bg-slate-900 bg-slate-950 text-slate-300 font-mono text-xs font-bold uppercase py-3.5 px-4 rounded-xl tracking-widest transition-all text-center"
            >
              Simpan Draft
            </button>
            <button
              onClick={handleLanjutkanReport}
              className="w-full bg-[#0091FF] hover:bg-[#0080E0] text-slate-950 font-mono text-xs font-bold uppercase py-3.5 px-4 rounded-xl tracking-widest transition-all text-center"
            >
              Lanjutkan
            </button>
          </div>
        </div>

      </div>
    );
  }

  // DEFAULT DASHBOARD VIEW
  return (
    <div className="min-h-screen bg-[#03060a] text-slate-350 font-sans pb-24 relative flex flex-col">
      {/* Toast Alert Banner */}
      {showToast && (
        <div className={`fixed top-4 left-4 right-4 z-50 flex items-center gap-2 border p-3 rounded-lg shadow-xl font-mono text-[9px] uppercase font-bold tracking-wider animate-in fade-in slide-in-from-top-3 ${
          toastType === "DANGER" 
            ? "border-red-500/30 bg-red-950/95 text-red-400" 
            : "border-cyan-500/30 bg-[#070e1b]/95 text-cyan-400"
        }`}>
          <CheckCircle2 className={`w-4 h-4 shrink-0 ${toastType === "DANGER" ? "text-red-400" : "text-cyan-400"}`} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-900/60 bg-[#060b13] px-4 py-3.5 sticky top-0 z-45">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-slate-950 border border-slate-850 flex items-center justify-center p-0.5">
            <Image
              src="/logo-badan-intelijen-negara.png"
              alt="BIN Logo"
              width={20}
              height={20}
              className="object-contain"
            />
          </div>
          <span className="text-xs font-bold font-mono tracking-widest text-cyan-400 uppercase">
            DENS CAKRA
          </span>
        </div>
        <div className="relative cursor-pointer" onClick={() => triggerToast("Pusat Notifikasi: Sistem Normal")}>
          <Bell className="w-4 h-4 text-slate-400" />
          <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-red-500" />
        </div>
      </div>

      {/* Scrollable Dashboard Body */}
      <div className="flex-1 p-4 overflow-y-auto">

        {/* TAB 1: BERANDA */}
        {activeTab === "BERANDA" && (
          <div className="flex flex-col gap-5">
            
            {/* Welcome Banner */}
            <div className="flex justify-between items-center bg-[#070c14]/40 border border-slate-900 rounded-2xl p-4.5">
              <div>
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                  Selamat bertugas,
                </p>
                <h3 className="text-sm font-bold text-cyan-400 font-mono uppercase mt-0.5">
                  Operator Lapangan
                </h3>
              </div>
              <div className="flex items-center gap-1.5 border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 rounded-full text-emerald-400 text-[8px] font-mono font-bold uppercase tracking-wider">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                <span>Aktif</span>
              </div>
            </div>

            {/* 2x2 Metric Grid */}
            <div className="grid grid-cols-2 gap-3.5">
              
              {/* Card 1 */}
              <div className="border border-slate-900 bg-[#070C13]/60 rounded-2xl p-4.5 flex flex-col justify-between aspect-[1.3] text-center">
                <span className="text-[28px] font-bold text-slate-100 font-mono leading-none">
                  {reportsCount.bulanIni}
                </span>
                <span className="text-[7.5px] font-mono text-slate-500 uppercase tracking-widest mt-3.5 block leading-normal">
                  Laporan Bulan Ini
                </span>
              </div>

              {/* Card 2 */}
              <div className="border border-slate-900 bg-[#070C13]/60 rounded-2xl p-4.5 flex flex-col justify-between aspect-[1.3] text-center">
                <span className="text-[28px] font-bold text-amber-500 font-mono leading-none">
                  {reportsCount.draftOffline}
                </span>
                <span className="text-[7.5px] font-mono text-slate-500 uppercase tracking-widest mt-3.5 block leading-normal">
                  Draft Offline
                </span>
              </div>

              {/* Card 3 */}
              <div className="border border-slate-900 bg-[#070C13]/60 rounded-2xl p-4.5 flex flex-col justify-between aspect-[1.3] text-center">
                <span className="text-[28px] font-bold text-cyan-400 font-mono leading-none">
                  {reportsCount.dikirim}
                </span>
                <span className="text-[7.5px] font-mono text-slate-500 uppercase tracking-widest mt-3.5 block leading-normal">
                  Laporan Dikirim
                </span>
              </div>

              {/* Card 4 */}
              <div className="border border-slate-900 bg-[#070C13]/60 rounded-2xl p-4.5 flex flex-col justify-between aspect-[1.3] text-center">
                <span className="text-[28px] font-bold text-emerald-400 font-mono leading-none">
                  {reportsCount.diterimaNasional}
                </span>
                <span className="text-[7.5px] font-mono text-slate-500 uppercase tracking-widest mt-3.5 block leading-normal">
                  Diterima Nasional
                </span>
              </div>

            </div>

            {/* KPI Pribadi Card */}
            <div className="border border-slate-900 bg-[#070C13]/60 rounded-2xl p-4.5 flex items-center justify-between relative overflow-hidden group">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 w-32 h-32 rounded-full border border-slate-800/20 flex items-center justify-center pointer-events-none">
                <div className="w-24 h-24 rounded-full border border-slate-800/10 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border border-slate-800/5" />
                </div>
              </div>

              <div>
                <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-slate-500">
                  KPI Pribadi
                </span>
                <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
                  82 <span className="text-slate-500 text-xs font-normal">/ 100</span>
                </div>
              </div>

              <div className="text-right z-10">
                <span className="text-[8px] uppercase tracking-wider text-slate-500 font-mono block">
                  Status Sinkronisasi
                </span>
                <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[9px] uppercase font-bold mt-1">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Tersinkron</span>
                </div>
              </div>
            </div>

            {/* Action Buttons (Restored to switch to screens) */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setStep("CREATE_REPORT")}
                className="w-full bg-[#0091FF] hover:bg-[#0080E0] text-slate-950 font-mono text-xs font-bold uppercase py-3.5 px-4 rounded-xl tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
                <span>Buat Laporan</span>
              </button>

              <button
                onClick={() => setStep("PANIC_TRIGGER")}
                className="w-full bg-[#B91C1C] hover:bg-[#991B1B] text-slate-100 font-mono text-xs font-bold uppercase py-3.5 px-4 rounded-xl tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(185,28,28,0.2)] cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 text-slate-100" />
                <span>Panic Button</span>
              </button>
            </div>

          </div>
        )}

        {/* TAB 2: TUGAS */}
        {activeTab === "TUGAS" && (
          <div className="flex flex-col gap-4">
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-slate-400 uppercase border-b border-slate-900 pb-2.5 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Tugas UK/STR</span>
            </span>

            {tasks.map((task) => (
              <div
                key={task.id}
                className="border border-slate-900 bg-[#070C13]/80 rounded-2xl p-4.5 flex flex-col gap-3 shadow-md relative overflow-hidden"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                    {task.nomor}
                  </span>
                  
                  {task.status === "DIKIRIM" ? (
                    <span className="bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded text-[8px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                      Diterbitkan
                    </span>
                  ) : (
                    <span className="bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded text-[8px] font-mono font-bold text-amber-500 uppercase tracking-wider">
                      Deadline: {task.deadline}
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-100 leading-snug">
                    {task.judul}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                    {task.deskripsi}
                  </p>
                </div>

                <div className="border-t border-slate-900/50 pt-2.5 mt-1 flex justify-start">
                  {task.status === "DIKIRIM" ? (
                    <span className="text-[9px] font-mono text-slate-500 uppercase font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Laporan Telah Dikirim</span>
                    </span>
                  ) : isAnswering ? (
                    <div className="w-full flex flex-col gap-3">
                      <textarea
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        placeholder="Ketik ulasan/laporan jawaban lapangan di sini..."
                        className="w-full bg-[#04070D] border border-slate-850 rounded-lg p-3 text-[11px] font-mono text-slate-200 placeholder:text-slate-650 focus:outline-none focus:border-cyan-500/40 min-h-[80px]"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAnswerTaskSubmit(task.id)}
                          className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-mono text-[9px] font-bold uppercase py-2 px-4 rounded-lg tracking-widest transition-all"
                        >
                          Kirim Jawaban
                        </button>
                        <button
                          onClick={() => {
                            setIsAnswering(false);
                            setAnswerText("");
                          }}
                          className="border border-slate-800 hover:bg-slate-900 text-slate-400 font-mono text-[9px] font-bold uppercase py-2 px-4 rounded-lg tracking-widest transition-all"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsAnswering(true)}
                      className="text-[9px] font-mono text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wider"
                    >
                      Jawab Tugas
                    </button>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}

        {/* TAB 3: RIWAYAT (Mocked) */}
        {activeTab === "RIWAYAT" && (
          <div className="flex flex-col gap-4">
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-slate-400 uppercase border-b border-slate-900 pb-2.5 flex items-center gap-1.5">
              <History className="w-4 h-4 text-cyan-400" />
              <span>Riwayat Aktivitas</span>
            </span>
            <div className="border border-slate-900 bg-[#070C13]/60 rounded-2xl p-6 text-center">
              <History className="w-8 h-8 text-slate-700 mx-auto mb-2.5 animate-spin" style={{ animationDuration: "12s" }} />
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Riwayat Sinkronisasi
              </h5>
              <p className="text-[9px] font-mono text-slate-500 tracking-wider uppercase mt-1 leading-relaxed max-w-[240px] mx-auto">
                Pemantauan log audit operasional tersinkronisasi penuh dengan server pusat.
              </p>
            </div>
          </div>
        )}

        {/* TAB 4: KPI (Mocked) */}
        {activeTab === "KPI" && (
          <div className="flex flex-col gap-4">
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-slate-400 uppercase border-b border-slate-900 pb-2.5 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-cyan-400" />
              <span>Indikator Kinerja Utama (KPI)</span>
            </span>
            <div className="border border-slate-900 bg-[#070C13]/60 rounded-2xl p-6 text-center">
              <Target className="w-8 h-8 text-slate-700 mx-auto mb-2.5" />
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Nilai Kinerja: 82%
              </h5>
              <p className="text-[9px] font-mono text-slate-500 tracking-wider uppercase mt-1 leading-relaxed max-w-[240px] mx-auto">
                Evaluasi taktis mingguan menunjukkan efektivitas pelaporan di tingkat optimal.
              </p>
            </div>
          </div>
        )}

        {/* TAB 5: PROFIL (Mocked) */}
        {activeTab === "PROFIL" && (
          <div className="flex flex-col gap-4">
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-slate-400 uppercase border-b border-slate-900 pb-2.5 flex items-center gap-1.5">
              <User className="w-4 h-4 text-cyan-400" />
              <span>Profil Pengguna</span>
            </span>
            <div className="border border-slate-900 bg-[#070C13]/60 rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-center gap-3 border-b border-slate-900/60 pb-3">
                <div className="w-10 h-10 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center font-mono text-cyan-400 font-bold">
                  OP
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider leading-none">
                    Operator Lapangan
                  </h4>
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest mt-1.5 block leading-none">
                    SEKTOR JABAR • OP-772
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setStep("LANDING");
                  triggerToast("Keluar dari Sesi Taktis Mobile");
                }}
                className="w-full border border-red-500/30 hover:border-red-500 bg-red-500/5 text-red-500 font-mono text-[9px] font-bold uppercase py-2 px-4 rounded-lg tracking-widest transition-all"
              >
                Keluar Sesi
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Floating Action Button (FAB) and Navigation bar at the bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#060b13]/90 backdrop-blur-md border-t border-slate-900/60 px-2 py-2">
        <div className="flex items-center justify-between relative max-w-md mx-auto">
          
          {/* Tab 1: Beranda */}
          <button
            onClick={() => setActiveTab("BERANDA")}
            className={`flex flex-col items-center justify-center w-12 py-1 transition-all ${
              activeTab === "BERANDA" ? "text-cyan-400" : "text-slate-500 hover:text-slate-400"
            }`}
          >
            <Home className="w-4 h-4 stroke-[2]" />
            <span className="text-[7.5px] font-mono mt-1 font-bold uppercase tracking-wider">
              Beranda
            </span>
          </button>

          {/* Tab 2: Tugas */}
          <button
            onClick={() => setActiveTab("TUGAS")}
            className={`flex flex-col items-center justify-center w-12 py-1 transition-all relative ${
              activeTab === "TUGAS" ? "text-cyan-400" : "text-slate-500 hover:text-slate-400"
            }`}
          >
            <FileText className="w-4 h-4 stroke-[2]" />
            <span className="text-[7.5px] font-mono mt-1 font-bold uppercase tracking-wider">
              Tugas
            </span>
            {tasks.some(t => t.status === "BELUM_DIJAWAB") && (
              <span className="absolute top-0 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
            )}
          </button>

          {/* Tab 3: Riwayat */}
          <button
            onClick={() => setActiveTab("RIWAYAT")}
            className={`flex flex-col items-center justify-center w-12 py-1 transition-all ${
              activeTab === "RIWAYAT" ? "text-cyan-400" : "text-slate-500 hover:text-slate-400"
            }`}
          >
            <History className="w-4 h-4 stroke-[2]" />
            <span className="text-[7.5px] font-mono mt-1 font-bold uppercase tracking-wider">
              Riwayat
            </span>
          </button>

          {/* Center Floating Action Button (FAB) Spacer */}
          <div className="w-14 h-10 flex items-center justify-center">
            <div className="absolute -top-6">
              <button
                onClick={() => setStep("CREATE_REPORT")}
                className="w-11 h-11 rounded-full bg-[#0091FF] hover:bg-[#0080E0] text-slate-950 shadow-[0_0_15px_rgba(0,145,255,0.4)] flex items-center justify-center transition-all hover:scale-105 active:scale-95 border-4 border-[#03060a] cursor-pointer"
              >
                <Plus className="w-5 h-5 text-slate-950 stroke-[3.5]" />
              </button>
            </div>
          </div>

          {/* Tab 4: KPI */}
          <button
            onClick={() => setActiveTab("KPI")}
            className={`flex flex-col items-center justify-center w-12 py-1 transition-all ${
              activeTab === "KPI" ? "text-cyan-400" : "text-slate-500 hover:text-slate-400"
            }`}
          >
            <Target className="w-4 h-4 stroke-[2]" />
            <span className="text-[7.5px] font-mono mt-1 font-bold uppercase tracking-wider">
              KPI
            </span>
          </button>

          {/* Tab 5: Profil */}
          <button
            onClick={() => setActiveTab("PROFIL")}
            className={`flex flex-col items-center justify-center w-12 py-1 transition-all ${
              activeTab === "PROFIL" ? "text-cyan-400" : "text-slate-500 hover:text-slate-400"
            }`}
          >
            <User className="w-4 h-4 stroke-[2]" />
            <span className="text-[7.5px] font-mono mt-1 font-bold uppercase tracking-wider">
              Profil
            </span>
          </button>

        </div>
      </div>

    </div>
  );
}
