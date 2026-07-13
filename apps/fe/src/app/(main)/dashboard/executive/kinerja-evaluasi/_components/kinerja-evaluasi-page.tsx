import { KpiEnginePage } from "@/app/(main)/dashboard/_components/kpi-engine/kpi-engine-page";

export function KinerjaEvaluasiPage({ from, to }: { from?: string; to?: string }) {
  return <KpiEnginePage mode="national" from={from} to={to} />;
}
