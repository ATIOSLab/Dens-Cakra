"use client";

import { Activity, Clock, Database, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MapsIntelijenStatsProps {
  total: number;
  totalLaporan: number;
  totalBaket: number;
  unverifiedCount: number;
}

export function MapsIntelijenStats({
  total,
  totalLaporan,
  totalBaket,
  unverifiedCount,
}: MapsIntelijenStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Total Seluruh Laporan */}
      <Card className="border-border bg-card shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-900/60">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="grid size-10 place-items-center rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <Database className="size-5" />
          </div>
          <div>
            <div className="font-extrabold text-2xl text-foreground tracking-tight">{total}</div>
            <div className="font-medium text-xs text-muted-foreground">Total Seluruh Laporan</div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Laporan Jaring */}
      <Card className="border-border bg-card shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-900/60">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="grid size-10 place-items-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Activity className="size-5" />
          </div>
          <div>
            <div className="font-extrabold text-2xl text-foreground tracking-tight">{totalLaporan}</div>
            <div className="font-medium text-xs text-muted-foreground">Laporan Jaring</div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Sudah Menjadi Baket */}
      <Card className="border-border bg-card shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-900/60">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="grid size-10 place-items-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Inbox className="size-5" />
          </div>
          <div>
            <div className="font-extrabold text-2xl text-foreground tracking-tight">{totalBaket}</div>
            <div className="font-medium text-xs text-muted-foreground">Sudah Menjadi Baket</div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Belum Diverifikasi */}
      <Card className="border-border bg-card shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-900/60">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="grid size-10 place-items-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock className="size-5" />
          </div>
          <div>
            <div className="font-extrabold text-2xl text-foreground tracking-tight">{unverifiedCount}</div>
            <div className="font-medium text-xs text-muted-foreground">Belum Diverifikasi</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
