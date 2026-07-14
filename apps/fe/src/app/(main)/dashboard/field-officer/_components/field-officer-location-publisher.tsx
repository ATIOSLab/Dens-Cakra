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

    void publish();
    const interval = window.setInterval(() => void publish(), LOCATION_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
