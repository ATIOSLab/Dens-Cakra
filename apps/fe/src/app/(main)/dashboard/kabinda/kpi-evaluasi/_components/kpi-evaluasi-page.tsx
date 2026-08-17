import { KpiEnginePage } from "@/app/(main)/dashboard/_components/kpi-engine/kpi-engine-page";

export function KpiEvaluasiPage({ from, to }: { from?: string; to?: string }) {
  return <KpiEnginePage mode="regional" from={from} to={to} />;
}
