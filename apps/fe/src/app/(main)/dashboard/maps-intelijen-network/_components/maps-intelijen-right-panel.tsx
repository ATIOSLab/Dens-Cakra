"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, AlertTriangle, CheckCircle2, Info, MapPin, Users, X } from "lucide-react";
import { format, subDays } from "date-fns";
import { id } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { formatRelativeTime, isRegencyLevel, type MapIntelItem } from "./maps-intelijen-types";

interface MapsIntelijenRightPanelProps {
  filteredItems: MapIntelItem[];
  rightPanelOpen: boolean;
  setRightPanelOpen: (open: boolean) => void;
  onFocusOnMap: (item: MapIntelItem) => void;
}

export function MapsIntelijenRightPanel({
  filteredItems,
  rightPanelOpen,
  setRightPanelOpen,
  onFocusOnMap,
}: MapsIntelijenRightPanelProps) {
  // State Filter Rentang Waktu Trend Laporan (7, 14, atau 30 hari)
  const [trendDays, setTrendDays] = useState<7 | 14 | 30>(7);

  // --- Metrik Ringkasan Situasi ---

  // 1. Personel Jaring (Unique Jaring Personnel)
  const activeEntities = useMemo(() => {
    const uniqueJarings = new Set(
      filteredItems.map((i) => i.report.jaringId || i.jaringCode).filter(Boolean),
    );
    return uniqueJarings.size;
  }, [filteredItems]);

  const todayEntitiesCount = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const todaySet = new Set(
      filteredItems
        .filter((i) => {
          try {
            return format(new Date(i.submittedAt), "yyyy-MM-dd") === todayStr;
          } catch {
            return false;
          }
        })
        .map((i) => i.report.jaringId || i.jaringCode)
        .filter(Boolean),
    );
    return todaySet.size;
  }, [filteredItems]);

  // 2. Laporan Masuk
  const incomingReports = filteredItems.length;

  const todayReportsCount = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    return filteredItems.filter((i) => {
      try {
        return format(new Date(i.submittedAt), "yyyy-MM-dd") === todayStr;
      } catch {
        return false;
      }
    }).length;
  }, [filteredItems]);

  // 3. Urgent Alert (Urgent & High priority counts)
  const urgentCount = useMemo(() => {
    return filteredItems.filter((i) => i.urgency === "URGENT").length;
  }, [filteredItems]);

  const highCount = useMemo(() => {
    return filteredItems.filter((i) => i.urgency === "HIGH").length;
  }, [filteredItems]);

  const totalUrgentAlerts = urgentCount + highCount;

  // 4. Wilayah Terpantau (Perhitungan Presisi Kabupaten/Kota & Provinsi)
  const monitoredRegenciesCount = useMemo(() => {
    const set = new Set<string>();
    for (const item of filteredItems) {
      const area = item.report.resolvedArea;
      if (area) {
        let curr: any = area;
        while (curr) {
          if (isRegencyLevel(curr.level)) {
            set.add(curr.name || curr.id);
            break;
          }
          curr = curr.parent;
        }
        if (!curr && area.name) {
          set.add(area.name);
        }
      } else if (item.locationName) {
        set.add(item.locationName);
      }
    }
    return set.size;
  }, [filteredItems]);

  const monitoredProvincesCount = useMemo(() => {
    const set = new Set<string>();
    for (const item of filteredItems) {
      const area = item.report.resolvedArea;
      if (area) {
        let curr: any = area;
        while (curr) {
          if (curr.level === "PROVINCE" || curr.level === "PROVINSI") {
            set.add(curr.name || curr.id);
            break;
          }
          curr = curr.parent;
        }
      }
    }
    return set.size;
  }, [filteredItems]);

  const areaTypeLabel = useMemo(() => {
    if (filteredItems.length === 0 || monitoredRegenciesCount === 0) return "0 Kab / Kota";
    if (monitoredProvincesCount > 0) {
      return `Kab / Kota (${monitoredProvincesCount} Prov)`;
    }
    return "Kab / Kota";
  }, [filteredItems.length, monitoredRegenciesCount, monitoredProvincesCount]);

  // --- Aktivitas Terbaru (10 terbaru) ---
  const recentActivities = useMemo(() => {
    return [...filteredItems]
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .slice(0, 10);
  }, [filteredItems]);

  // --- Trend Laporan Dinamis (Berdasarkan Filter trendDays: 7, 14, atau 30 hari) ---
  const trendData = useMemo(() => {
    const data: { date: string; rawDate: string; count: number }[] = [];
    const today = new Date();

    for (let i = trendDays - 1; i >= 0; i--) {
      const d = subDays(today, i);
      data.push({
        date: format(d, trendDays > 14 ? "dd/MM" : "dd MMM", { locale: id }),
        rawDate: format(d, "yyyy-MM-dd"),
        count: 0,
      });
    }

    for (const item of filteredItems) {
      if (!item.submittedAt) continue;
      try {
        const itemDateStr = format(new Date(item.submittedAt), "yyyy-MM-dd");
        const existing = data.find((d) => d.rawDate === itemDateStr);
        if (existing) {
          existing.count += 1;
        }
      } catch {
        // ignore invalid dates
      }
    }

    return data;
  }, [filteredItems, trendDays]);

  if (!rightPanelOpen) return null;

  const getActivityIconAndColor = (urgency: string, index: number) => {
    if (urgency === "URGENT") {
      return {
        bg: "bg-rose-500/10 border-rose-500/30 text-rose-500",
        icon: <AlertTriangle className="size-3.5" />,
      };
    }
    if (urgency === "HIGH") {
      return {
        bg: "bg-amber-500/10 border-amber-500/30 text-amber-500",
        icon: <Activity className="size-3.5" />,
      };
    }
    if (urgency === "NORMAL") {
      return {
        bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-500",
        icon: <CheckCircle2 className="size-3.5" />,
      };
    }
    return {
      bg: "bg-sky-500/10 border-sky-500/30 text-sky-500",
      icon: <Info className="size-3.5" />,
    };
  };

  return (
    <div className="absolute top-16 right-3 bottom-14 z-30 flex w-80 flex-col gap-3">
      {/* Tombol Tutup (Mobile) */}
      <div className="flex justify-end lg:hidden">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 rounded-full bg-background/80 p-0 text-muted-foreground backdrop-blur-md hover:bg-background/90"
          onClick={() => setRightPanelOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Card className="flex-1 overflow-hidden border-border bg-background/95 text-foreground shadow-2xl backdrop-blur-xl dark:border-amber-500/20 dark:bg-slate-950/95 flex flex-col font-sans">
        <CardContent className="flex h-full flex-col p-0">
          
          {/* SECTION 1: RINGKASAN SITUASI */}
          <div className="flex-none p-4 pb-3">
            <div className="flex items-center justify-between pb-3 border-b border-border/60 dark:border-slate-800/80">
              <h3 className="font-bold font-mono text-[11px] text-amber-600 dark:text-amber-500 uppercase tracking-wider">
                RINGKASAN SITUASI
              </h3>
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                  <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Update
                </div>
                <button
                  type="button"
                  onClick={() => setRightPanelOpen(false)}
                  title="Tutup Panel Ringkasan"
                  className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3.5">
              {/* Personel Jaring */}
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground dark:text-slate-400 font-mono uppercase font-bold tracking-wider flex items-center gap-1">
                  <Users className="size-3 text-sky-500" />
                  PERSONEL JARING
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-light text-foreground dark:text-slate-100">{activeEntities}</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                    {todayEntitiesCount > 0 ? `+${todayEntitiesCount} aktif hari ini` : "Personel"}
                  </span>
                </div>
              </div>

              {/* Laporan Masuk */}
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground dark:text-slate-400 font-mono uppercase font-bold tracking-wider">LAPORAN MASUK</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-light text-foreground dark:text-slate-100">{incomingReports}</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                    {todayReportsCount > 0 ? `+${todayReportsCount} hari ini` : "Terfilter"}
                  </span>
                </div>
              </div>

              {/* Urgent Alert */}
              <div className="space-y-1 pt-2 border-t border-border/50 dark:border-slate-800/50">
                <div className="text-[10px] text-rose-500 font-mono uppercase font-bold tracking-wider flex items-center gap-1">
                  <AlertTriangle className="size-3" />
                  URGENT & HIGH ALERT
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-light text-foreground dark:text-slate-100">{totalUrgentAlerts}</span>
                  <span className="text-[10px] text-muted-foreground dark:text-slate-400 font-mono">
                    {totalUrgentAlerts === 0
                      ? "0 URGENT / HIGH"
                      : urgentCount > 0 && highCount > 0
                        ? `${urgentCount} URGENT, ${highCount} HIGH`
                        : urgentCount > 0
                          ? `${urgentCount} URGENT`
                          : `${highCount} HIGH`}
                  </span>
                </div>
              </div>

              {/* Wilayah Terpantau */}
              <div className="space-y-1 pt-2 border-t border-border/50 dark:border-slate-800/50">
                <div className="text-[10px] text-muted-foreground dark:text-slate-400 font-mono uppercase font-bold tracking-wider flex items-center gap-1">
                  <MapPin className="size-3 text-amber-500" />
                  WILAYAH TERPANTAU
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-light text-foreground dark:text-slate-100">{monitoredRegenciesCount}</span>
                  <span className="text-[10px] text-muted-foreground dark:text-slate-400 font-mono">
                    {areaTypeLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: AKTIVITAS TERBARU (Scrollable) */}
          <div className="flex-1 overflow-hidden flex flex-col border-y border-border/60 dark:border-slate-800/80 bg-muted/20 dark:bg-slate-900/30">
            <div className="flex-none px-4 py-3 flex items-center justify-between">
              <h3 className="font-bold font-mono text-[11px] text-amber-600 dark:text-amber-500 uppercase tracking-wider">
                AKTIVITAS TERBARU
              </h3>
              <button type="button" className="text-[10px] font-mono text-sky-500 dark:text-sky-400 hover:underline">
                Lihat Semua ({recentActivities.length})
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-2.5 custom-scrollbar">
              {recentActivities.length === 0 ? (
                <div className="text-xs text-center text-muted-foreground dark:text-slate-500 py-6 font-mono">
                  Belum ada aktivitas terdeteksi pada filter ini.
                </div>
              ) : (
                recentActivities.map((item, idx) => {
                  const style = getActivityIconAndColor(item.urgency, idx);
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => onFocusOnMap(item)}
                      className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-muted/60 dark:hover:bg-slate-800/60 transition-colors text-left group border border-transparent hover:border-border dark:hover:border-slate-700"
                    >
                      <div className={cn("mt-0.5 shrink-0 grid size-7 place-items-center rounded-md border", style.bg)}>
                        {style.icon}
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="text-[11px] font-semibold text-foreground dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 line-clamp-1 leading-snug">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground dark:text-slate-400 line-clamp-1">
                          {item.locationName}
                        </div>
                      </div>
                      <div className="shrink-0 text-[9px] text-muted-foreground dark:text-slate-400 font-mono pt-0.5">
                        {formatRelativeTime(item.submittedAt)}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* SECTION 3: TREND LAPORAN (dengan Filter Rentang Waktu) */}
          <div className="flex-none p-4 pt-3">
            <div className="flex items-center justify-between pb-2">
              <h3 className="font-bold font-mono text-[11px] text-amber-600 dark:text-amber-500 uppercase tracking-wider">
                TREND LAPORAN
              </h3>
              
              {/* Filter Preset Rentang Waktu (7, 14, 30 Hari) */}
              <div className="flex items-center gap-1 rounded-md border border-border bg-muted/40 p-0.5 dark:border-slate-800 dark:bg-slate-900/60 font-mono text-[9px]">
                {([7, 14, 30] as const).map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setTrendDays(days)}
                    className={cn(
                      "px-1.5 py-0.5 rounded transition-all font-semibold",
                      trendDays === days
                        ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                        : "text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-slate-200",
                    )}
                  >
                    {days}H
                  </button>
                ))}
              </div>
            </div>
            
            <div className="h-28 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 9, fill: "#64748b", fontFamily: "monospace" }} 
                    axisLine={false} 
                    tickLine={false}
                    interval={trendDays === 30 ? 4 : trendDays === 14 ? 1 : 0}
                  />
                  <YAxis 
                    tick={{ fontSize: 9, fill: "#64748b", fontFamily: "monospace" }} 
                    axisLine={false} 
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "rgba(15, 23, 42, 0.95)", 
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                      borderRadius: "6px",
                      fontSize: "10px",
                      color: "#f8fafc",
                      fontFamily: "monospace"
                    }}
                    itemStyle={{ color: "#f59e0b" }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#f59e0b" 
                    strokeWidth={2.5}
                    dot={{ r: trendDays > 14 ? 2 : 3, fill: "#f59e0b", stroke: "#020617", strokeWidth: 1.5 }}
                    activeDot={{ r: 5, fill: "#fbbf24" }}
                    fillOpacity={1} 
                    fill="url(#colorTrend)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
