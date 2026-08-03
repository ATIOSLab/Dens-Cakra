"use client";

import { Activity, Database, Eye, Inbox, TriangleAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MapsIntelijenStatsProps {
  total: number;
  totalLaporan: number;
  totalBaket: number;
  urgentCount: number;
  unreadCount: number;
}

export function MapsIntelijenStats({
  total,
  totalLaporan,
  totalBaket,
  urgentCount,
  unreadCount,
}: MapsIntelijenStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Card className="border-border bg-card shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-900/60">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="grid size-10 place-items-center rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <Database className="size-5" />
          </div>
          <div>
            <div className="font-extrabold text-2xl text-foreground tracking-tight">{total}</div>
            <div className="font-medium text-xs text-muted-foreground">Total Intel Entitas</div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-900/60">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="grid size-10 place-items-center rounded-lg border border-slate-400/30 bg-slate-500/10 text-slate-600 dark:text-slate-300">
            <Activity className="size-5" />
          </div>
          <div>
            <div className="font-extrabold text-2xl text-foreground tracking-tight">{totalLaporan}</div>
            <div className="font-medium text-xs text-muted-foreground">Laporan Jaring</div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-900/60">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="grid size-10 place-items-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Inbox className="size-5" />
          </div>
          <div>
            <div className="font-extrabold text-2xl text-foreground tracking-tight">{totalBaket}</div>
            <div className="font-medium text-xs text-muted-foreground">Baket Terdata</div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-900/60">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="grid size-10 place-items-center rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <TriangleAlert className="size-5" />
          </div>
          <div>
            <div className="font-extrabold text-2xl text-foreground tracking-tight">{urgentCount}</div>
            <div className="font-medium text-xs text-muted-foreground">Urgensi URGENT</div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-900/60">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="grid size-10 place-items-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Eye className="size-5" />
          </div>
          <div>
            <div className="font-extrabold text-2xl text-foreground tracking-tight">{unreadCount}</div>
            <div className="font-medium text-xs text-muted-foreground">Belum Dibaca</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
