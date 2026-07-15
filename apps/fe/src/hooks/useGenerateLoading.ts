"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  GENERATE_FACT_ROTATION_MS,
  GENERATE_INTELLIGENCE_FACTS,
  GENERATE_PROGRESS_API_CAP,
  GENERATE_PROGRESS_COMPLETE,
  GENERATE_PROGRESS_COMPLETE_DELAY_MS,
  GENERATE_PROGRESS_ESTIMATED_SECONDS,
  GENERATE_PROGRESS_LONG_RUNNING_MS,
  GENERATE_PROGRESS_SETTLE_MS,
  GENERATE_PROGRESS_STEPS,
  GENERATE_PROGRESS_TICK_MS,
  type GenerateLoadingStatus,
  getEstimatedGenerateSeconds,
  getGenerateCurrentStep,
  getNextGenerateProgress,
} from "@/utils/generate-progress";

type GenerateLoadingState = {
  loading: boolean;
  isOpen: boolean;
  progress: number;
  currentStep: number;
  status: GenerateLoadingStatus;
  estimatedTime: number;
  elapsedMs: number;
  longRunning: boolean;
  activeFact: string;
  errorMessage: string | null;
};

type UseGenerateLoadingOptions = {
  settleMs?: number;
};

const initialState: GenerateLoadingState = {
  loading: false,
  isOpen: false,
  progress: 0,
  currentStep: 0,
  status: "idle",
  estimatedTime: GENERATE_PROGRESS_ESTIMATED_SECONDS,
  elapsedMs: 0,
  longRunning: false,
  activeFact: GENERATE_INTELLIGENCE_FACTS[0],
  errorMessage: null,
};

export function useGenerateLoading(options: UseGenerateLoadingOptions = {}) {
  const settleMs = options.settleMs ?? GENERATE_PROGRESS_SETTLE_MS;
  const startedAtRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [factIndex, setFactIndex] = useState(0);
  const [state, setState] = useState<GenerateLoadingState>(initialState);

  const clearCloseTimer = useCallback(() => {
    if (!closeTimerRef.current) {
      return;
    }

    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const start = useCallback(() => {
    clearCloseTimer();
    startedAtRef.current = Date.now();
    setFactIndex(0);
    setState({
      ...initialState,
      loading: true,
      isOpen: true,
      status: "processing",
    });
  }, [clearCloseTimer]);

  const complete = useCallback(() => {
    clearCloseTimer();
    startedAtRef.current = null;
    setState((current) => ({
      ...current,
      loading: false,
      isOpen: true,
      progress: Math.max(current.progress, GENERATE_PROGRESS_API_CAP),
      currentStep: GENERATE_PROGRESS_STEPS.length - 1,
      status: "processing",
      estimatedTime: 1,
      errorMessage: null,
    }));

    closeTimerRef.current = window.setTimeout(() => {
      setState((current) => ({
        ...current,
        loading: false,
        isOpen: true,
        progress: GENERATE_PROGRESS_COMPLETE,
        currentStep: GENERATE_PROGRESS_STEPS.length - 1,
        status: "completed",
        estimatedTime: 1,
        errorMessage: null,
      }));

      closeTimerRef.current = window.setTimeout(() => {
        setState(initialState);
        closeTimerRef.current = null;
      }, settleMs);
    }, GENERATE_PROGRESS_COMPLETE_DELAY_MS);
  }, [clearCloseTimer, settleMs]);

  const fail = useCallback(
    (message?: string) => {
      clearCloseTimer();
      startedAtRef.current = null;
      setState((current) => ({
        ...current,
        loading: false,
        isOpen: true,
        status: "error",
        errorMessage: message ?? "Generate gagal",
      }));
    },
    [clearCloseTimer],
  );

  const cancel = useCallback(() => {
    clearCloseTimer();
    startedAtRef.current = null;
    setState((current) => ({
      ...current,
      loading: false,
      status: "cancelled",
    }));
  }, [clearCloseTimer]);

  const reset = useCallback(() => {
    clearCloseTimer();
    startedAtRef.current = null;
    setState(initialState);
  }, [clearCloseTimer]);

  useEffect(() => {
    if (state.status !== "processing") {
      return undefined;
    }

    const progressTimer = window.setInterval(() => {
      const startedAt = startedAtRef.current ?? Date.now();
      const elapsedMs = Date.now() - startedAt;

      setState((current) => {
        const nextProgress = getNextGenerateProgress(current.progress);

        return {
          ...current,
          progress: nextProgress,
          currentStep: getGenerateCurrentStep(nextProgress),
          estimatedTime: getEstimatedGenerateSeconds(elapsedMs),
          elapsedMs,
          longRunning: elapsedMs >= GENERATE_PROGRESS_LONG_RUNNING_MS,
        };
      });
    }, GENERATE_PROGRESS_TICK_MS);

    return () => window.clearInterval(progressTimer);
  }, [state.status]);

  useEffect(() => {
    if (!state.longRunning || state.status !== "processing") {
      return undefined;
    }

    const factTimer = window.setInterval(() => {
      setFactIndex((current) => (current + 1) % GENERATE_INTELLIGENCE_FACTS.length);
    }, GENERATE_FACT_ROTATION_MS);

    return () => window.clearInterval(factTimer);
  }, [state.longRunning, state.status]);

  useEffect(() => {
    setState((current) => ({
      ...current,
      activeFact: GENERATE_INTELLIGENCE_FACTS[factIndex],
    }));
  }, [factIndex]);

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  return useMemo(
    () => ({
      ...state,
      start,
      complete,
      fail,
      cancel,
      reset,
    }),
    [cancel, complete, fail, reset, start, state],
  );
}

export type UseGenerateLoadingReturn = ReturnType<typeof useGenerateLoading>;
