"use client";

import { useEffect, useState } from "react";

import { apiBrowserFetch } from "@/lib/api/browser-client";

import { useRoleWorkspace } from "./role-workspace-provider";

type AreaScopeItem = {
  areaId?: string;
  id?: string;
  name?: string;
  level?: string;
  code?: string;
  area?: {
    name?: string;
  };
};

export function UserAreaBadge() {
  const { activeUser } = useRoleWorkspace();
  const [areaLabel, setAreaLabel] = useState<string>("Memuat Wilayah...");

  useEffect(() => {
    let isMounted = true;

    async function loadUserArea() {
      try {
        const res = await apiBrowserFetch<AreaScopeItem[] | { items?: AreaScopeItem[] }>("/me/area-scopes");
        const scopeList = Array.isArray(res) ? res : res?.items || [];

        if (isMounted) {
          if (scopeList.length > 0) {
            const names = scopeList.map((item) => item.name || item.area?.name || "").filter(Boolean);

            if (names.length > 0) {
              setAreaLabel(names.slice(0, 2).join(", "));
            } else {
              setAreaLabel("Semua Wilayah");
            }
          } else {
            setAreaLabel("Semua Wilayah");
          }
        }
      } catch {
        if (isMounted) {
          setAreaLabel("Wilayah Operasional");
        }
      }
    }

    void loadUserArea();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div
      className="hidden min-w-0 items-center gap-2 rounded-md border border-[var(--dc-divider)] bg-background/80 px-2.5 py-1 text-xs shadow-[var(--dc-shadow-card)] backdrop-blur lg:flex"
      aria-live="polite"
      title={`Pengguna: ${activeUser.name} - Wilayah: ${areaLabel}`}
    >
      <div className="grid max-w-44 leading-tight xl:max-w-52">
        <span className="truncate font-bold text-foreground text-xs">{activeUser.name}</span>
        <span className="truncate font-medium text-[10px] text-muted-foreground">{areaLabel}</span>
      </div>
    </div>
  );
}
