"use client";

import { CartesianGrid, Tooltip as ChartTooltip, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type DataRecord = Record<string, unknown>;

type KpiIndicator = {
  code: string;
  score?: number | null;
  sample?: number | null;
};

type AuditLog = {
  id?: string;
  title?: string;
  message?: string;
  timestamp?: string;
};

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

  const evidence = (data.evidence as DataRecord) || {};
  const reports = Number(evidence.reports ?? 0);
  const jaringReports = Number(evidence.jaringReports ?? 0);
  const jaringCount = Number(evidence.jaring ?? data.jaringCount ?? 0);
  const activeJaring90Days = Number(evidence.activeJaring90Days ?? 0);
  const tasks = Number(evidence.tasks ?? 0);
  const baketAssessments = Number(evidence.baketAssessments ?? evidence.verifications ?? 0);
  const measuredIndicators = Number(evidence.measuredIndicators ?? 0);

  const indicators = Array.isArray(data.indicators) ? data.indicators : [];

  let subtitle = "";
  if (type === "unit") {
    const levelLabel = typeof data.levelLabel === "string" ? data.levelLabel : detailType;
    const scopeArea = (data.scopeArea as DataRecord) || {};
    const scopeName = typeof scopeArea.name === "string" ? scopeArea.name : "Cakupan belum ditentukan";
    subtitle = `${levelLabel} / Kode: ${code} / ${scopeName} / ${jaringCount} Jaring`;
  } else if (type === "personnel") {
    const position = typeof data.position === "string" ? data.position : "Staff";
    const unitObj = (data.unit as DataRecord) || {};
    const unitName = typeof unitObj.name === "string" ? unitObj.name : "";
    subtitle = `${position} / ${unitName}`;
  }

  const scoreLabel = score === null ? "Belum cukup bukti" : score.toLocaleString("id-ID", { maximumFractionDigits: 1 });
  const lastUpdateLabel =
    typeof data.updatedAt === "string"
      ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(data.updatedAt))
      : "14 Jul 2026";

  const getKpiName = (kpiCode: string) => {
    const names: Record<string, string> = {
      "IDX.1": "Aktivitas dan ketepatan pelaporan",
      "IDX.2": "Kualitas dan kedalaman laporan",
      "IDX.3": "Validitas informasi",
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

  const hasHistory = Array.isArray(data.history) && data.history.length > 0;
  const hasEvidence =
    Boolean(data.evidence) &&
    (reports > 0 ||
      jaringReports > 0 ||
      tasks > 0 ||
      jaringCount > 0 ||
      baketAssessments > 0 ||
      measuredIndicators > 0);
  const hasTimeline = Array.isArray(data.auditLogs) && data.auditLogs.length > 0;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        className="flex h-full w-full max-w-[480px] flex-col border-[var(--dc-border-subtle)] bg-[var(--dc-sidebar)] p-0 text-[var(--dc-text-primary)] shadow-2xl"
        side="right"
      >
        <div className="border-[var(--dc-divider)] border-b p-6">
          <SheetHeader className="text-left">
            <div className="flex items-center gap-2">
              <Badge variant={getGradeVariant(grade)} className="px-2 py-0.5 font-mono font-semibold text-xs">
                Grade {grade}
              </Badge>
              <span className="font-semibold text-[10px] text-[var(--dc-text-muted)] uppercase tracking-wider">
                {type === "unit" ? "Detail Hierarki" : "Detail Personel"}
              </span>
            </div>
            <SheetTitle className="mt-2 font-bold text-[var(--dc-text-primary)] text-lg leading-snug">
              {name}
            </SheetTitle>
            <SheetDescription className="mt-1 font-medium text-[var(--dc-text-secondary)] text-xs">
              {subtitle}
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="no-scrollbar flex-1 space-y-6 overflow-y-auto p-6">
          <div className="space-y-4 rounded-lg border border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-[10px] text-[var(--dc-text-muted)] uppercase tracking-wider">
                  Skor Evaluasi
                </p>
                <h4 className="mt-1 font-bold font-mono text-3xl text-[var(--dc-text-primary)]">{scoreLabel}</h4>
              </div>
              <div className="text-right">
                <Badge variant={getGradeVariant(grade)} className="px-2 py-0.5 font-mono font-semibold text-xs">
                  Grade {grade}
                </Badge>
                <p className="mt-1.5 font-mono text-[10px] text-[var(--dc-text-muted)]">Update: {lastUpdateLabel}</p>
              </div>
            </div>

            {hasHistory && (
              <div className="mt-2 h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.history as Array<Record<string, unknown>>}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-[var(--dc-divider)]" strokeWidth={0.5} />
                    <XAxis dataKey="date" className="font-mono text-[9px]" stroke="var(--dc-text-muted)" />
                    <YAxis domain={[0, 100]} className="font-mono text-[9px]" stroke="var(--dc-text-muted)" />
                    <ChartTooltip
                      contentStyle={{
                        backgroundColor: "var(--dc-surface)",
                        borderColor: "var(--dc-border)",
                        color: "var(--dc-text-primary)",
                        fontSize: "10px",
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

          <div className="space-y-3">
            <h5 className="font-bold text-[var(--dc-text-secondary)] text-xs uppercase tracking-wider">
              Kinerja per Indikator
            </h5>
            <div className="space-y-2">
              {indicators.map((ind: KpiIndicator) => {
                const kpiScore = ind.score !== null && ind.score !== undefined ? Number(ind.score) : null;
                const formattedKpiScore =
                  kpiScore === null ? "-" : kpiScore.toLocaleString("id-ID", { maximumFractionDigits: 1 });
                const sample = ind.sample !== undefined && ind.sample !== null ? Number(ind.sample) : null;

                return (
                  <div
                    key={ind.code}
                    className="space-y-2 rounded-lg border border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] p-2.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold font-mono text-[var(--dc-text-primary)]">
                        {ind.code} / {getKpiName(ind.code)}
                      </span>
                      <span className="font-bold font-mono text-[var(--dc-text-primary)]">{formattedKpiScore}</span>
                    </div>
                    <Progress value={kpiScore ?? 0} className="h-1.5 [&>div]:bg-[var(--dc-primary)]" />
                    <div className="flex items-center justify-between text-[10px] text-[var(--dc-text-muted)]">
                      <span>{sample !== null && sample > 0 ? `Jumlah bukti: ${sample}` : ""}</span>
                      <span>Target: 100</span>
                    </div>
                  </div>
                );
              })}
              {indicators.length === 0 && (
                <div className="text-[var(--dc-text-muted)] text-xs italic">Tidak ada data indikator.</div>
              )}
            </div>
          </div>

          {hasEvidence && (
            <div className="space-y-3">
              <h5 className="font-bold text-[var(--dc-text-secondary)] text-xs uppercase tracking-wider">
                Bukti Kinerja
              </h5>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-[var(--dc-surface)] p-3 text-center">
                  <span className="block text-[10px] text-[var(--dc-text-muted)]">Bahan Keterangan (Baket)</span>
                  <span className="mt-1 block font-bold font-mono text-[var(--dc-text-primary)] text-lg">
                    {reports}
                  </span>
                </div>
                <div className="rounded-lg border bg-[var(--dc-surface)] p-3 text-center">
                  <span className="block text-[10px] text-[var(--dc-text-muted)]">Laporan Jaring</span>
                  <span className="mt-1 block font-bold font-mono text-[var(--dc-text-primary)] text-lg">
                    {jaringReports}
                  </span>
                </div>
                <div className="rounded-lg border bg-[var(--dc-surface)] p-3 text-center">
                  <span className="block text-[10px] text-[var(--dc-text-muted)]">Penilaian Baket</span>
                  <span className="mt-1 block font-bold font-mono text-[var(--dc-text-primary)] text-lg">
                    {baketAssessments}
                  </span>
                </div>
                <div className="rounded-lg border bg-[var(--dc-surface)] p-3 text-center">
                  <span className="block text-[10px] text-[var(--dc-text-muted)]">Jaring Aktif 90 Hari</span>
                  <span className="mt-1 block font-bold font-mono text-[var(--dc-text-primary)] text-lg">
                    {activeJaring90Days} / {jaringCount}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-[var(--dc-text-muted)]">
                Indikator terukur: {measuredIndicators} / 5. Tugas tercatat: {tasks}.
              </p>
            </div>
          )}

          {hasTimeline && (
            <div className="space-y-3">
              <h5 className="font-bold text-[var(--dc-text-secondary)] text-xs uppercase tracking-wider">
                Riwayat Evaluasi
              </h5>
              <div className="relative space-y-4 border-[var(--dc-divider)] border-l pl-4 text-xs">
                {(data.auditLogs as AuditLog[]).map((log: AuditLog, idx: number) => (
                  <div key={log.id ?? idx} className="relative">
                    <span className="absolute top-0.5 -left-[21px] size-2.5 rounded-full bg-[var(--dc-primary)] ring-4 ring-[var(--dc-sidebar)]" />
                    <p className="font-semibold text-[var(--dc-text-primary)]">{log.title ?? log.message}</p>
                    <p className="mt-0.5 text-[10px] text-[var(--dc-text-muted)]">{log.timestamp}</p>
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
