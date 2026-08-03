"use client";

import { useEffect, useState } from "react";
import { MapPin, UserCheck } from "lucide-react";

import { useRoleWorkspace } from "./role-workspace-provider";
import { apiBrowserFetch } from "@/lib/api/browser-client";

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
            const names = scopeList
              .map((item) => item.name || item.area?.name || "")
              .filter(Boolean);

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
      className="hidden min-w-0 items-center gap-2 rounded-full border border-[var(--dc-divider)] bg-background/80 px-3 py-1.5 text-xs shadow-sm backdrop-blur md:flex"
      aria-live="polite"
      title={`Pengguna: ${activeUser.name} - Wilayah: ${areaLabel}`}
    >
      <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 shrink-0">
        <UserCheck className="size-3.5" />
      </div>
      <div className="grid max-w-52 leading-tight">
        <span className="truncate font-bold text-foreground text-xs">{activeUser.name}</span>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate mt-0.5">
          <MapPin className="size-3 text-emerald-500 shrink-0" />
          <span className="truncate font-medium">{areaLabel}</span>
        </div>
      </div>
    </div>
  );
}
