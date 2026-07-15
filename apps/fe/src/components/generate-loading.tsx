"use client";

import { AnimatePresence as FramerAnimatePresence, motion as framerMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GenerateLoadingStatus } from "@/utils/generate-progress";

// Exactly the requested activity pool
const ACTIVITIES = [
  "Membaca Perintah...",
  "Menganalisa Informasi...",
  "Menghubungkan Relasi...",
  "Menyusun EEI...",
  "Menyusun PIR...",
  "Menyusun Rencana...",
  "Finalisasi STR...",
];

function getActivityForProgress(progress: number, isCompleted: boolean, isError: boolean) {
  if (isCompleted) {
    return "✓ STR berhasil dibuat";
  }
  if (isError) {
    return "Generate gagal.";
  }

  const index = Math.min(Math.floor((progress / 100) * ACTIVITIES.length), ACTIVITIES.length - 1);
  return ACTIVITIES[index];
}

type GenerateLoadingProps = {
  open: boolean;
  progress: number;
  currentStep: number;
  status: GenerateLoadingStatus;
  estimatedTime: number;
  longRunning: boolean;
  activeFact: string;
  errorMessage?: string | null;
  onRetry?: () => void;
};

export function GenerateLoading({ open, progress, status, onRetry }: GenerateLoadingProps) {
  if (!open) return null;

  const isCompleted = status === "completed";
  const isError = status === "error";

  const currentActivity = getActivityForProgress(progress, isCompleted, isError);

  return (
    <FramerAnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop (35% opacity, 8px blur) */}
        <framerMotion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/35 backdrop-blur-[8px]"
        />

        {/* Dialog Content Card (430px wide, 24px padding, 6px sharp corners) */}
        <framerMotion.div
          initial={{ opacity: 0, scale: 0.97, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 6 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative z-50 flex w-full max-w-[430px] select-none flex-col rounded-[6px] border border-[var(--dc-border-subtle)] bg-gradient-to-b from-[var(--dc-card)] to-[var(--dc-card)]/95 p-6 font-mono text-foreground text-sm shadow-md dark:border-slate-800/80 dark:bg-[#080d14]/95"
        >
          {/* Header Block */}
          <div className="flex flex-col items-center space-y-3 text-center">
            {/* Small Minimal INTEL ENGINE Badge */}
            <div
              className={cn(
                "rounded-none border px-2 py-0.5 font-bold text-[9px] uppercase tracking-widest",
                isError
                  ? "border-red-500/30 bg-red-500/10 text-red-500"
                  : "border-[var(--dc-primary)]/20 bg-[var(--dc-primary-soft)] text-[var(--dc-primary)]",
              )}
            >
              {isError ? "ERROR" : "INTEL ENGINE"}
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-0.5">
              <h2 className="font-bold text-foreground text-sm uppercase tracking-wider">Sedang Menyusun STR</h2>
              <p className="max-w-sm text-[10px] text-[var(--dc-text-secondary)] leading-relaxed">
                AI sedang memproses informasi strategis.
              </p>
            </div>
          </div>

          {/* Thin Progress bar and Loading Indicator */}
          <div className="mt-5 space-y-1.5">
            <div className="flex items-center justify-between font-bold text-[10px]">
              <span className="text-[var(--dc-text-muted)] uppercase tracking-wider">Loading</span>
              <span className="text-foreground">{Math.round(progress)}%</span>
            </div>

            <div className="h-[2px] w-full overflow-hidden bg-[var(--dc-surface-raised)] dark:bg-slate-950/80">
              <framerMotion.div
                className={cn(
                  "h-full origin-left",
                  isError ? "bg-red-500" : "bg-gradient-to-r from-[var(--dc-primary)] to-emerald-500",
                )}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: progress / 100 }}
                transition={{ duration: 0.2, ease: "linear" }}
              />
            </div>
          </div>

          {/* Current Activity Message with smooth 200ms transitions */}
          <div className="mt-3 flex min-h-[1.25rem] items-center justify-center">
            <FramerAnimatePresence mode="wait">
              <framerMotion.div
                key={currentActivity}
                initial={{ opacity: 0, y: 3, filter: "blur(1.5px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -3, filter: "blur(1.5px)" }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className={cn(
                  "block text-center font-bold text-[10px] uppercase tracking-wider",
                  isCompleted ? "text-emerald-500 dark:text-emerald-400" : "text-[var(--dc-text-primary)]",
                )}
              >
                {currentActivity}
              </framerMotion.div>
            </FramerAnimatePresence>
          </div>

          {/* Error Retry Button Block */}
          {isError && onRetry && (
            <div className="mt-4 border-[var(--dc-border-subtle)]/40 border-t pt-4 dark:border-slate-800/40">
              <Button
                type="button"
                onClick={onRetry}
                className="w-full cursor-pointer rounded-none border border-red-500 bg-red-500 py-2 font-bold font-mono text-[10px] text-white uppercase tracking-widest hover:bg-red-600"
              >
                Coba Lagi
              </Button>
            </div>
          )}
        </framerMotion.div>
      </div>
    </FramerAnimatePresence>
  );
}
