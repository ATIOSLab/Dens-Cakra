"use client";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

type DataRecord = Record<string, unknown>;

interface RightDrawerProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly type: "unit" | "personnel" | null;
  readonly data: DataRecord | null;
}

export function RightDrawer({ isOpen, onClose, type, data }: RightDrawerProps) {
  if (!data) return null;

  const score = data.score !== null && data.score !== undefined ? Number(data.score) : null;
  const grade = typeof data.grade === "string" ? data.grade : "N/A";
  const name = typeof data.name === "string" ? data.name : "Tanpa Nama";
  const code = typeof data.code === "string" ? data.code : "";
  const detailType = typeof data.type === "string" ? data.type : "";

  // Extract evidence
  const evidence = (data.evidence as DataRecord) || {};
  const reports = Number(evidence.reports ?? 0);
  const tasks = Number(evidence.tasks ?? 0);
  const verifications = Number(evidence.verifications ?? 0);
  const measuredIndicators = Number(evidence.measuredIndicators ?? 0);

  // Extract indicators
  const indicators = Array.isArray(data.indicators) ? data.indicators : [];

  // Metadata labels
  let subtitle = "";
  if (type === "unit") {
    subtitle = `${detailType} • Code: ${code} • ${Number(data.personnelCount ?? 0)} Personel`;
  } else if (type === "personnel") {
    const position = typeof data.position === "string" ? data.position : "Staff";
    const unitObj = (data.unit as DataRecord) || {};
    const unitName = typeof unitObj.name === "string" ? unitObj.name : "";
    subtitle = `${position} • ${unitName}`;
  }

  const scoreLabel = score === null ? "Belum cukup bukti" : score.toLocaleString("id-ID", { maximumFractionDigits: 1 });

  // Format the last update date based on record updatedAt or fallback
  const lastUpdateLabel = typeof data.updatedAt === "string"
    ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(data.updatedAt))
    : "14 Jul 2026"; // Fallback to period's end date

  // Helper for KPI labels
  const getKpiName = (kpiCode: string) => {
    const names: Record<string, string> = {
      "IDX.1": "Ketepatan waktu pelaporan",
      "IDX.2": "Kualitas dan kedalaman laporan",
      "IDX.3": "Tingkat validasi informasi",
      "IDX.4": "Kontribusi terhadap isu strategis",
      "IDX.5": "Kecepatan respons tugas UUK/STR",
    };
    return names[kpiCode] ?? "Indikator Kinerja";
  };

  const getGradeVariant = (val: string) => {
    if (val === "A" || val === "B") return "default";
    if (val === "D") return "destructive";
    return val === "N/A" ? "outline" : "secondary";
  };

  // Check if historical scores exist in the backend record
  const hasHistory = Array.isArray(data.history) && data.history.length > 0;

  // Check if evidence exists in the backend record
  const hasEvidence = Boolean(data.evidence) && (reports > 0 || tasks > 0 || verifications > 0 || measuredIndicators > 0);

  // Check if timeline or audit logs exist in the backend record
  const hasTimeline = Array.isArray(data.auditLogs) && data.auditLogs.length > 0;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        className="w-full max-w-[480px] border-[var(--dc-border-subtle)] bg-[var(--dc-sidebar)] text-[var(--dc-text-primary)] p-0 flex flex-col h-full shadow-2xl"
        side="right"
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-[var(--dc-divider)]">
          <SheetHeader className="text-left">
            <div className="flex items-center gap-2">
              <Badge variant={getGradeVariant(grade)} className="font-mono text-xs font-semibold px-2 py-0.5">
                Grade {grade}
              </Badge>
              <span className="text-[10px] uppercase font-semibold text-[var(--dc-text-muted)] tracking-wider">
                {type === "unit" ? "Detail Unit" : "Detail Personel"}
              </span>
            </div>
            <SheetTitle className="text-lg font-bold mt-2 text-[var(--dc-text-primary)] leading-snug">
              {name}
            </SheetTitle>
            <SheetDescription className="text-xs text-[var(--dc-text-secondary)] font-medium mt-1">
              {subtitle}
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Scrollable Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {/* Section 1: Score & Chart (if available) */}
          <div className="rounded-lg border border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--dc-text-muted)]">Skor Evaluasi</p>
                <h4 className="font-mono text-3xl font-bold mt-1 text-[var(--dc-text-primary)]">{scoreLabel}</h4>
              </div>
              <div className="text-right">
                <Badge variant={getGradeVariant(grade)} className="font-mono text-xs font-semibold px-2 py-0.5">
                  Grade {grade}
                </Badge>
                <p className="text-[10px] text-[var(--dc-text-muted)] mt-1.5 font-mono">
                  Update: {lastUpdateLabel}
                </p>
              </div>
            </div>

            {/* Recharts Interactive Line Chart (Only shown if history data is present in backend) */}
            {hasHistory && (
              <div className="h-40 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.history as any}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-[var(--dc-divider)]" strokeWidth={0.5} />
                    <XAxis dataKey="date" className="text-[9px] font-mono" stroke="var(--dc-text-muted)" />
                    <YAxis domain={[0, 100]} className="text-[9px] font-mono" stroke="var(--dc-text-muted)" />
                    <ChartTooltip
                      contentStyle={{
                        backgroundColor: "var(--dc-surface)",
                        borderColor: "var(--dc-border)",
                        fontSize: "10px",
                        color: "var(--dc-text-primary)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="var(--dc-primary)"
                      strokeWidth={2}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Section 2: Individual 5 KPIs */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--dc-text-secondary)]">Kinerja per Indikator</h5>
            <div className="space-y-2">
              {indicators.map((ind: any) => {
                const kpiScore = ind.score !== null && ind.score !== undefined ? Number(ind.score) : null;
                const formattedKpiScore = kpiScore === null ? "-" : kpiScore.toLocaleString("id-ID", { maximumFractionDigits: 1 });
                const sample = ind.sample !== undefined && ind.sample !== null ? Number(ind.sample) : null;

                return (
                  <div key={ind.code} className="p-2.5 rounded-lg border border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold text-[var(--dc-text-primary)]">{ind.code} • {getKpiName(ind.code)}</span>
                      <span className="font-mono font-bold text-[var(--dc-text-primary)]">{formattedKpiScore}</span>
                    </div>
                    <Progress value={kpiScore ?? 0} className="h-1.5 [&>div]:bg-[var(--dc-primary)]" />
                    <div className="flex justify-between items-center text-[10px] text-[var(--dc-text-muted)]">
                      <span>
                        {sample !== null && sample > 0 ? `Jumlah bukti: ${sample}` : ""}
                      </span>
                      <span>Target: 100</span>
                    </div>
                  </div>
                );
              })}
              {indicators.length === 0 && (
                <div className="text-xs text-[var(--dc-text-muted)] italic">Tidak ada data indikator.</div>
              )}
            </div>
          </div>

          {/* Section 3: Evidence Breakdown (Only shown if evidence data exists in backend) */}
          {hasEvidence && (
            <div className="space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--dc-text-secondary)]">Kualitas Bukti Laporan</h5>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg bg-[var(--dc-surface)] text-center">
                  <span className="text-[10px] text-[var(--dc-text-muted)] block">Total Baket</span>
                  <span className="font-mono text-lg font-bold text-[var(--dc-text-primary)] mt-1 block">{reports}</span>
                </div>
                <div className="p-3 border rounded-lg bg-[var(--dc-surface)] text-center">
                  <span className="text-[10px] text-[var(--dc-text-muted)] block">Tugas Terpenuhi</span>
                  <span className="font-mono text-lg font-bold text-[var(--dc-text-primary)] mt-1 block">{tasks}</span>
                </div>
                <div className="p-3 border rounded-lg bg-[var(--dc-surface)] text-center">
                  <span className="text-[10px] text-[var(--dc-text-muted)] block">Verifikasi Neraca</span>
                  <span className="font-mono text-lg font-bold text-[var(--dc-text-primary)] mt-1 block">{verifications}</span>
                </div>
                <div className="p-3 border rounded-lg bg-[var(--dc-surface)] text-center">
                  <span className="text-[10px] text-[var(--dc-text-muted)] block">Indikator Terukur</span>
                  <span className="font-mono text-lg font-bold text-[var(--dc-text-primary)] mt-1 block">{measuredIndicators} / 5</span>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Riwayat Evaluasi (Only shown if history/logs exist in backend) */}
          {hasTimeline && (
            <div className="space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--dc-text-secondary)]">Riwayat Evaluasi</h5>
              <div className="relative pl-4 border-l border-[var(--dc-divider)] space-y-4 text-xs">
                {(data.auditLogs as Array<any>).map((log: any, idx: number) => (
                  <div key={log.id ?? idx} className="relative">
                    <span className="absolute -left-[21px] top-0.5 size-2.5 rounded-full bg-[var(--dc-primary)] ring-4 ring-[var(--dc-sidebar)]" />
                    <p className="font-semibold text-[var(--dc-text-primary)]">{log.title ?? log.message}</p>
                    <p className="text-[10px] text-[var(--dc-text-muted)] mt-0.5">{log.timestamp}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
