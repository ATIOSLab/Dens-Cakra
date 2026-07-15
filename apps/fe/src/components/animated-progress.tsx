"use client";

import { motion } from "framer-motion";

import type { GenerateLoadingStatus } from "@/utils/generate-progress";

type AnimatedProgressProps = {
  progress: number;
  status: GenerateLoadingStatus;
};

export function AnimatedProgress({ progress, status }: AnimatedProgressProps) {
  const isError = status === "error";

  return (
    <fieldset className="min-w-0 space-y-3 border-0 p-0">
      <legend className="sr-only">Progress penyusunan STR</legend>
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="font-medium text-[11px] text-cyan-700 uppercase tracking-[0.28em] dark:text-cyan-300">
            Intelligence Engine
          </div>
          <div className="text-muted-foreground text-xs">Pipeline analisis strategis aktif</div>
        </div>
        <motion.div
          className="font-mono font-semibold text-3xl text-foreground tabular-nums sm:text-4xl"
          key={Math.round(progress)}
          initial={{ opacity: 0.35, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {Math.round(progress)}%
        </motion.div>
      </div>

      <div className="relative h-5 overflow-hidden rounded-full border border-cyan-500/25 bg-slate-950/10 p-1 shadow-[inset_0_0_18px_rgba(15,23,42,0.18)] dark:bg-slate-950/80">
        <motion.div
          className="absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(34,211,238,0.18),transparent)]"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        />
        <motion.div
          className={
            isError
              ? "h-full origin-left rounded-full bg-gradient-to-r from-rose-500 via-orange-400 to-rose-500 shadow-[0_0_22px_rgba(244,63,94,0.5)]"
              : "h-full origin-left rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-300 shadow-[0_0_24px_rgba(16,185,129,0.55)]"
          }
          initial={{ scaleX: 0 }}
          animate={{ scaleX: progress / 100 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </fieldset>
  );
}
