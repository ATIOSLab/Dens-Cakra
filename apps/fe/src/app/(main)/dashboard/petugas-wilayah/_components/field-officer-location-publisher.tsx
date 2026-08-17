"use client";

import { useEffect } from "react";

const LOCATION_INTERVAL_MS = 5 * 60 * 1000;

export function FieldOfficerLocationPublisher() {
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      return;
    }

    let cancelled = false;
    let inFlight = false;
    let interval: number | null = null;
    let permissionStatus: PermissionStatus | null = null;

    const publish = async () => {
      if (cancelled || inFlight) {
        return;
      }

      inFlight = true;
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            maximumAge: 60_000,
            timeout: 20_000,
          });
        });

        if (cancelled) {
          return;
        }

        await fetch("/api/field-officer/live-location", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            gpsAccuracyMeters: position.coords.accuracy,
            capturedAt: new Date(position.timestamp).toISOString(),
          }),
        });
      } catch {
        // Browser permission denial or GPS timeout should not interrupt the dashboard.
      } finally {
        inFlight = false;
      }
    };

    const startPublishing = () => {
      if (interval !== null || permissionStatus?.state !== "granted") {
        return;
      }

      void publish();
      interval = window.setInterval(() => void publish(), LOCATION_INTERVAL_MS);
    };

    const handlePermissionChange = () => {
      if (permissionStatus?.state === "granted") {
        startPublishing();
        return;
      }

      if (interval !== null) {
        window.clearInterval(interval);
        interval = null;
      }
    };

    if ("permissions" in navigator) {
      void navigator.permissions
        .query({ name: "geolocation" })
        .then((status) => {
          if (cancelled) {
            return;
          }

          permissionStatus = status;
          permissionStatus.addEventListener("change", handlePermissionChange);
          startPublishing();
        })
        .catch(() => undefined);
    }

    return () => {
      cancelled = true;
      permissionStatus?.removeEventListener("change", handlePermissionChange);
      if (interval !== null) {
        window.clearInterval(interval);
      }
    };
  }, []);

  return null;
}
