"use client";

import { motion } from "framer-motion";
import { Check, Circle, LoaderCircle, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { GenerateProgressStepState } from "@/utils/generate-progress";

type ProgressStepProps = {
  label: string;
  state: GenerateProgressStepState;
};

export function ProgressStep({ label, state }: ProgressStepProps) {
  const isCompleted = state === "completed";
  const isActive = state === "active";
  const isError = state === "error";

  return (
    <motion.li
      className={cn(
        "flex min-h-8 items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors",
        isCompleted && "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
        isActive &&
          "border-cyan-400/35 bg-cyan-400/10 text-cyan-800 shadow-[0_0_24px_rgba(34,211,238,0.12)] dark:text-cyan-100",
        isError && "border-rose-400/35 bg-rose-500/10 text-rose-700 dark:text-rose-200",
        state === "pending" && "border-border/60 bg-muted/25 text-muted-foreground",
      )}
      animate={isActive ? { scale: [1, 1.015, 1] } : { scale: 1 }}
      transition={{ duration: 1.4, repeat: isActive ? Number.POSITIVE_INFINITY : 0, ease: "easeInOut" }}
    >
      <span className="grid size-6 shrink-0 place-items-center rounded-full border border-current/25 bg-background/60">
        {isCompleted ? <Check className="size-3.5" /> : null}
        {isActive ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
        {isError ? <XCircle className="size-3.5" /> : null}
        {state === "pending" ? <Circle className="size-3" /> : null}
      </span>
      <span className="font-medium">{label}</span>
    </motion.li>
  );
}
