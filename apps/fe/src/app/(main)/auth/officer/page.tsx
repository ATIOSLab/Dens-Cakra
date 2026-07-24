import { Suspense } from "react";

import { LoginForm } from "../_components/login-form";

export default function OfficerLoginPage() {
  return (
    <div className="w-[90%] max-w-[420px] sm:w-full flex flex-col gap-3.5 items-center justify-center animate-fade-in duration-300">
      {/* Brand Section */}
      <div className="flex flex-col items-center text-center gap-1 select-none">
        {/* Top Gold Bordered Label */}
        <div className="border border-amber-600/40 dark:border-amber-400/30 px-3 py-0.5 rounded bg-amber-500/10 text-[9px] sm:text-[10px] font-mono font-bold tracking-widest text-amber-700 dark:text-amber-400 uppercase select-none">
          SISTEM MANAJEMEN KINERJA & EVALUASI NASIONAL
        </div>

        {/* Main Title */}
        <h1 className="font-sans font-black text-3xl sm:text-4xl tracking-wider text-foreground uppercase mt-1">
          DENS CAKRA
        </h1>

        {/* Subtitle / Field Officer Indicator */}
        <p className="max-w-xs text-balance font-mono text-[10px] sm:text-[11px] font-bold uppercase leading-tight tracking-wider text-cyan-600 dark:text-[#14B8FF]">
          FIELD OFFICER - SECURE LOCATION ACCESS
        </p>

        {/* Capability Text */}
        <p className="font-mono text-[9px] font-bold tracking-wider text-amber-700 dark:text-amber-400/90 uppercase mt-0.5">
          COMMAND, ANALYTIC, KNOWLEDGE, RESPONSE & AWARENESS
        </p>

        {/* Motto */}
        <div className="flex items-center justify-center gap-2 w-full max-w-[220px] mt-1">
          <div className="flex-1 h-[1px] bg-slate-300 dark:bg-slate-700/60" />
          <span className="text-[9px] font-mono font-bold tracking-[0.25em] text-slate-600 dark:text-slate-300 uppercase">
            VELOX ET EXACTUS
          </span>
          <div className="flex-1 h-[1px] bg-slate-300 dark:bg-slate-700/60" />
        </div>
      </div>

      {/* 1. SECURE COMMAND LOGIN CARD */}
      <div className="w-full bg-card/95 dark:bg-[#071426]/85 backdrop-blur-md border border-border/80 dark:border-[#14B8FF]/20 shadow-md dark:shadow-[0_0_30px_rgba(20,184,255,0.08)] p-6 rounded-2xl flex flex-col gap-4 transition-all duration-200">
        <Suspense fallback={<div className="h-12 animate-pulse rounded-lg border border-cyan-500/15 bg-cyan-500/5" />}>
          <LoginForm officerOnly />
        </Suspense>
      </div>

      {/* 2. EXTERNAL FOOTER (BELOW CARD) */}
      <div className="flex w-full items-center justify-center text-[10px] font-mono text-muted-foreground/60 select-none text-center">
        <div>© 2026 DENS CAKRA</div>
      </div>
    </div>
  );
}
