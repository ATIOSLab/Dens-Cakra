"use client";

import { createContext, useContext, useEffect, useState } from "react";

import { MapPinned } from "lucide-react";
import { publicIp } from "public-ip";

type ClientNetwork = {
  ipAddress: string;
  locationLabel: string;
};

type CachedClientNetwork = ClientNetwork & {
  expiresAt: number;
};

type IpLocationPayload = {
  success?: boolean;
  city?: string | null;
  region?: string | null;
  country?: string | null;
};

const CLIENT_NETWORK_CACHE_KEY = "denscakra.client-network";
const CLIENT_NETWORK_CACHE_TTL_MS = 30 * 60 * 1000;
const ClientNetworkContext = createContext<ClientNetwork | null>(null);

function readCachedClientNetwork() {
  try {
    const value = sessionStorage.getItem(CLIENT_NETWORK_CACHE_KEY);
    const cached = value ? (JSON.parse(value) as Partial<CachedClientNetwork>) : null;

    if (
      cached &&
      typeof cached.ipAddress === "string" &&
      typeof cached.locationLabel === "string" &&
      typeof cached.expiresAt === "number" &&
      cached.expiresAt > Date.now()
    ) {
      return { ipAddress: cached.ipAddress, locationLabel: cached.locationLabel };
    }
  } catch {
    return null;
  }

  return null;
}

function cacheClientNetwork(network: ClientNetwork) {
  const cached: CachedClientNetwork = {
    ...network,
    expiresAt: Date.now() + CLIENT_NETWORK_CACHE_TTL_MS,
  };

  try {
    sessionStorage.setItem(CLIENT_NETWORK_CACHE_KEY, JSON.stringify(cached));
  } catch {
    return;
  }
}

async function getClientNetwork(signal: AbortSignal): Promise<ClientNetwork> {
  const ipAddress = await publicIp({ signal, timeout: 5000 });
  let locationLabel = "Lokasi tidak tersedia";

  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ipAddress)}`, {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal,
    });
    const payload = response.ok ? ((await response.json()) as IpLocationPayload) : null;
    const parts = payload?.success ? [payload.city, payload.region, payload.country].filter(Boolean) : [];

    if (parts.length > 0) {
      locationLabel = parts.join(", ");
    }
  } catch {
    // The public IP remains useful when geolocation is unavailable.
  }

  return { ipAddress, locationLabel };
}

export function ClientNetworkProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [network, setNetwork] = useState<ClientNetwork>({
    ipAddress: "Mendeteksi IP...",
    locationLabel: "Jaringan perangkat pengguna",
  });

  useEffect(() => {
    const cached = readCachedClientNetwork();
    if (cached) {
      setNetwork(cached);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);

    void getClientNetwork(controller.signal)
      .then((result) => {
        setNetwork(result);
        cacheClientNetwork(result);
      })
      .catch(() => {
        setNetwork({ ipAddress: "IP tidak tersedia", locationLabel: "Periksa koneksi jaringan" });
      })
      .finally(() => window.clearTimeout(timeout));

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  return <ClientNetworkContext.Provider value={network}>{children}</ClientNetworkContext.Provider>;
}

export function useClientNetwork() {
  const network = useContext(ClientNetworkContext);

  if (!network) {
    throw new Error("useClientNetwork must be used within ClientNetworkProvider.");
  }

  return network;
}

export function ClientNetworkBadge() {
  const network = useClientNetwork();

  return (
    <div
      className="hidden min-w-0 items-center gap-2 rounded-full border border-[var(--dc-divider)] bg-background/80 px-3 py-1.5 text-xs shadow-sm backdrop-blur md:flex"
      aria-live="polite"
    >
      <MapPinned className="size-3.5 text-cyan-600 dark:text-[#14B8FF]" />
      <div className="grid max-w-56 leading-tight">
        <span className="truncate font-medium text-foreground">{network.ipAddress}</span>
        <span className="truncate text-[10px] text-muted-foreground">{network.locationLabel}</span>
      </div>
    </div>
  );
}
