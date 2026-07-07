"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [idOperatif, setIdOperatif] = useState("");
  const [password, setPassword] = useState("");
  const [showDemoMessage, setShowDemoMessage] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowDemoMessage(true);
  };

  return (
    <div className="min-h-screen bg-[#050B14] text-slate-300 font-sans relative flex flex-col justify-between p-6 selection:bg-cyan-500/30 selection:text-cyan-200 overflow-hidden">
      {/* Dotted Background */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle at center, #334155 1px, transparent 1px)",
          backgroundSize: "24px 24px"
        }}
      />
      
      {/* Top Gradient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[350px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Top Navigation */}
      <div className="relative z-10">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors py-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Mode Demo</span>
        </Link>
      </div>

      {/* Center Content / Login Form */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-md mx-auto my-auto py-8">
        {/* Logo BIN */}
        <div className="w-24 h-24 rounded-full bg-slate-900/80 border border-slate-700/50 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(6,182,212,0.15)] overflow-hidden p-0">
          <Image
            src="/logo-badan-intelijen-negara.png"
            alt="Logo Badan Intelijen Negara"
            width={96}
            height={96}
            className="object-contain scale-125 drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]"
            priority
          />
        </div>

        {/* Title & Subtitle */}
        <h1 
          className="text-2xl md:text-3xl font-bold tracking-[0.2em] text-slate-100 text-center uppercase"
          style={{ textShadow: "0 0 30px rgba(6,182,212,0.3)" }}
        >
          DENS CAKRA ENTERPRISE
        </h1>
        
        <p className="text-slate-500 text-[10px] tracking-[0.2em] font-mono uppercase mt-2 mb-8 text-center">
          OTENTIKASI AMAN // HANYA DEMONSTRASI
        </p>

        {/* Form Box */}
        <div className="w-full border border-slate-800/80 bg-[#0B1221]/80 backdrop-blur-md rounded-xl p-6 md:p-8 shadow-2xl relative">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* ID Operatif */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 font-semibold">
                ID Operatif
              </label>
              <input
                type="text"
                value={idOperatif}
                onChange={(e) => setIdOperatif(e.target.value)}
                placeholder="Masukkan ID..."
                className="w-full bg-[#050B14] border border-slate-800/80 rounded-lg px-3.5 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 font-mono outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
              />
            </div>

            {/* Kata Sandi */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 font-semibold">
                Kata Sandi
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#050B14] border border-slate-800/80 rounded-lg px-3.5 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 font-mono outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
              />
              <span className="text-[10px] font-mono text-slate-500 italic mt-0.5">
                Gunakan sandi: password123
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold tracking-[0.2em] uppercase py-3 rounded-lg mt-3 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all cursor-pointer text-xs"
            >
              OTENTIKASI
            </button>
          </form>

          {/* Demo Alert Box */}
          {showDemoMessage && (
            <div className="mt-5 p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-start gap-3 text-amber-300/90 animate-in fade-in zoom-in-95 duration-200">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-[11px] font-mono leading-relaxed">
                <span className="font-bold text-amber-400 uppercase tracking-wider block mb-0.5">
                  Mode Demonstrasi
                </span>
                Otentikasi Enterprise ke server produksi dinonaktifkan untuk demo. Silakan kembali ke <strong>Mode Demo</strong> untuk masuk.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center py-4">
        <p className="text-[10px] font-mono text-slate-600 uppercase tracking-[0.2em]">
          DENS CAKRA SECURITY PROTOCOL // VERSI DEMO
        </p>
      </div>
    </div>
  );
}
