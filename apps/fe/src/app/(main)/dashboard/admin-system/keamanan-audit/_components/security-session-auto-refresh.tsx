"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const REFRESH_INTERVAL_MS = 30_000;

export function SecuritySessionAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };

    const intervalId = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [router]);

  return null;
}
