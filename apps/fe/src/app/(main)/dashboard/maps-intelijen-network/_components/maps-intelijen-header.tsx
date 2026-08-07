"use client";

import { Clock3, MapPinned, RefreshCw, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MapsIntelijenHeaderProps {
  loading: boolean;
  onRefresh: () => void;
  periodLabel: string;
  scopeLabel: string;
  generatedAt?: string;
}

function formatGeneratedAt(value?: string) {
  if (!value) return "Belum dimuat";
  return `${new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(new Date(value))} WIB`;
}

export function MapsIntelijenHeader({
  loading,
  onRefresh,
  periodLabel,
  scopeLabel,
  generatedAt,
}: MapsIntelijenHeaderProps) {
  return (
    <header className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-xs lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 font-extrabold font-heading text-2xl tracking-tight md:text-3xl">
          <MapPinned className="size-7 text-sky-500" aria-hidden="true" />
          Peta Jejaring Intelijen
        </h1>
        <p className="mt-1 max-w-3xl text-muted-foreground text-sm">
          Pusat kendali geografis Laporan Jaring dan Bahan Keterangan (Baket) berdasarkan lokasi aktual serta
          cakupan kewenangan.
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-muted-foreground text-xs">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="size-3.5" /> Periode: {periodLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" /> Cakupan: {scopeLabel}
          </span>
          <span>Diperbarui: {formatGeneratedAt(generatedAt)} · otomatis setiap 60 detik</span>
        </div>
      </div>
      <Button variant="outline" onClick={onRefresh} disabled={loading} className="min-h-11 shrink-0 gap-2">
        <RefreshCw className={cn("size-4", loading && "animate-spin")} />
        {loading ? "Memuat data" : "Muat ulang"}
      </Button>
    </header>
  );
}
