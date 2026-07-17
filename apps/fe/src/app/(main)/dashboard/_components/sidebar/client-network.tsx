"use client";

import { createContext, useContext, useEffect, useState } from "react";

import { MapPinned } from "lucide-react";

import { apiBrowserMutation } from "@/lib/api/browser-client";
import { detectPublicIp } from "@/lib/network/public-ip";

type ClientNetwork = {
  ipAddress: string;
  locationLabel: string;
};

const ClientNetworkContext = createContext<ClientNetwork | null>(null);

export function ClientNetworkProvider({
  children,
  network,
}: Readonly<{ children: React.ReactNode; network: ClientNetwork }>) {
  const [currentNetwork, setCurrentNetwork] = useState(network);

  useEffect(() => {
    const controller = new AbortController();

    void detectPublicIp({ signal: controller.signal, timeout: 5000 })
      .then((ipAddress) => apiBrowserMutation<ClientNetwork>("POST", "/me/session-network", { ipAddress }))
      .then(setCurrentNetwork)
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  return <ClientNetworkContext.Provider value={currentNetwork}>{children}</ClientNetworkContext.Provider>;
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
