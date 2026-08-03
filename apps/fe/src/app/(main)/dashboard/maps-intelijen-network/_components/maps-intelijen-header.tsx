"use client";

import { Radar, RefreshCw } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MapsIntelijenHeaderProps {
  loading: boolean;
  onRefresh: () => void;
}

export function MapsIntelijenHeader({ loading, onRefresh }: MapsIntelijenHeaderProps) {
  return (
    <div className="space-y-2">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Beranda</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Maps Intelijen Network</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-extrabold font-heading text-2xl text-foreground tracking-tight md:text-3xl">
            <Radar className="size-7 animate-spin text-amber-500" style={{ animationDuration: "12s" }} />
            Maps Intelijen Network
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Sistem Pemetaan Spasial Intelijen Terpadu & Operational Intelligence Command Display.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="gap-2 font-semibold shadow-xs"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            {loading ? "Memuat..." : "Refresh Data"}
          </Button>
        </div>
      </div>
    </div>
  );
}
