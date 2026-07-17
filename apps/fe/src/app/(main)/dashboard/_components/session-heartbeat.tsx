"use client";

import { useEffect } from "react";

const HEARTBEAT_INTERVAL_MS = 30_000;

export function SessionHeartbeat() {
  useEffect(() => {
    const sendHeartbeat = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void fetch("/api/v1/me/session-heartbeat", {
        method: "POST",
        cache: "no-store",
        keepalive: true,
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
      }
    };

    const markInactive = (event: PageTransitionEvent) => {
      if (event.persisted) {
        return;
      }

      void fetch("/api/v1/me/session-inactive", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        keepalive: true,
      });
    };

    sendHeartbeat();
    const intervalId = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", sendHeartbeat);
    window.addEventListener("pagehide", markInactive);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", sendHeartbeat);
      window.removeEventListener("pagehide", markInactive);
    };
  }, []);

  return null;
}
