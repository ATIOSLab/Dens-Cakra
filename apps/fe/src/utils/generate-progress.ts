export type GenerateLoadingStatus = "idle" | "processing" | "completed" | "error" | "cancelled";

export type GenerateProgressStepState = "completed" | "active" | "pending" | "error";

export type GenerateProgressStep = {
  id: string;
  label: string;
  threshold: number;
};

export const GENERATE_PROGRESS_COMPLETE = 100;
export const GENERATE_PROGRESS_API_CAP = 95;
export const GENERATE_PROGRESS_MIN = 0;
export const GENERATE_PROGRESS_TICK_MS = 180;
export const GENERATE_PROGRESS_SETTLE_MS = 1500;
export const GENERATE_PROGRESS_COMPLETE_DELAY_MS = 420;
export const GENERATE_PROGRESS_LONG_RUNNING_MS = 10000;
export const GENERATE_FACT_ROTATION_MS = 2000;
export const GENERATE_PROGRESS_ESTIMATED_SECONDS = 16;
export const GENERATE_PROGRESS_MIN_INCREMENT = 0.35;
export const GENERATE_PROGRESS_EASING_FACTOR = 0.045;

export const GENERATE_PROGRESS_STEPS: GenerateProgressStep[] = [
  { id: "read-command", label: "Membaca Perintah", threshold: 6 },
  { id: "strategic-analysis", label: "Analisis Isu Strategis", threshold: 18 },
  { id: "eei", label: "Menyusun EEI", threshold: 32 },
  { id: "pir", label: "Menyusun PIR", threshold: 45 },
  { id: "collection-plan", label: "Rencana Pengumpulan", threshold: 58 },
  { id: "recommendation", label: "Saran Tindak", threshold: 72 },
  { id: "validation", label: "Validasi Dokumen", threshold: 86 },
  { id: "finalization", label: "Finalisasi STR", threshold: 96 },
];

export const GENERATE_INTELLIGENCE_FACTS = [
  "Menganalisa hubungan antar entitas...",
  "Memvalidasi sumber intelijen...",
  "Menyusun EEI...",
  "Membangun PIR...",
  "Menentukan prioritas ancaman...",
  "Melakukan korelasi data...",
] as const;

export function clampProgress(value: number) {
  return Math.min(GENERATE_PROGRESS_COMPLETE, Math.max(GENERATE_PROGRESS_MIN, value));
}

export function getGenerateCurrentStep(progress: number) {
  const normalizedProgress = clampProgress(progress);
  const activeIndex = GENERATE_PROGRESS_STEPS.findLastIndex((step) => normalizedProgress >= step.threshold);

  return Math.max(activeIndex, 0);
}

export function getGenerateStepState(
  stepIndex: number,
  currentStep: number,
  status: GenerateLoadingStatus,
): GenerateProgressStepState {
  if (status === "error" && stepIndex === currentStep) {
    return "error";
  }

  if (status === "completed" || stepIndex < currentStep) {
    return "completed";
  }

  if (stepIndex === currentStep) {
    return status === "cancelled" ? "pending" : "active";
  }

  return "pending";
}

export function getNextGenerateProgress(currentProgress: number) {
  const remainingProgress = GENERATE_PROGRESS_API_CAP - currentProgress;

  if (remainingProgress <= GENERATE_PROGRESS_MIN_INCREMENT) {
    return GENERATE_PROGRESS_API_CAP;
  }

  const easedIncrement = Math.max(GENERATE_PROGRESS_MIN_INCREMENT, remainingProgress * GENERATE_PROGRESS_EASING_FACTOR);

  return Math.min(GENERATE_PROGRESS_API_CAP, currentProgress + easedIncrement);
}

export function getEstimatedGenerateSeconds(elapsedMs: number) {
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  return Math.max(1, GENERATE_PROGRESS_ESTIMATED_SECONDS - elapsedSeconds);
}
