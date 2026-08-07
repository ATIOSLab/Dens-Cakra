"use client";

import { Pause, Play, RefreshCw, TimerReset } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatUpdatedAt(value?: string | null) {
  if (!value) return "Belum tersinkron";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Waktu sinkron tidak tersedia";
  return `${new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date)} WIB`;
}

export function DashboardLiveStatus({
  updatedAt,
  autoRefresh,
  intervalSeconds = 60,
  loading = false,
  onToggleAutoRefresh,
  onRefresh,
}: {
  updatedAt?: string | null;
  autoRefresh: boolean;
  intervalSeconds?: number;
  loading?: boolean;
  onToggleAutoRefresh: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--dc-border-subtle)] bg-muted/20 p-1.5">
      <div className="flex min-h-8 min-w-0 items-center gap-2 px-2">
        <span className="relative flex size-2 shrink-0" aria-hidden="true">
          {autoRefresh ? (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--dc-success)] opacity-30 motion-reduce:hidden" />
          ) : null}
          <span
            className={cn(
              "relative inline-flex size-2 rounded-full",
              autoRefresh ? "bg-[var(--dc-success)]" : "bg-[var(--dc-neutral)]",
            )}
          />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="font-mono font-semibold text-[10px] text-foreground uppercase tracking-[0.08em]">
            {autoRefresh ? "Pemantauan Aktif" : "Pemantauan Dijeda"}
          </p>
          <p className="truncate font-mono text-[10px] text-muted-foreground">
            Sinkron terakhir {formatUpdatedAt(updatedAt)}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="min-h-8 gap-1.5 px-2 text-[10px]"
        onClick={onToggleAutoRefresh}
        aria-pressed={autoRefresh}
      >
        {autoRefresh ? <Pause className="size-3" /> : <Play className="size-3" />}
        {autoRefresh ? `Otomatis ${intervalSeconds} dtk` : "Aktifkan otomatis"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-8 gap-1.5 px-2 text-[10px]"
        onClick={onRefresh}
        disabled={loading}
      >
        {loading ? <RefreshCw className="size-3 animate-spin" /> : <TimerReset className="size-3" />}
        Sinkronkan
      </Button>
    </div>
  );
}
