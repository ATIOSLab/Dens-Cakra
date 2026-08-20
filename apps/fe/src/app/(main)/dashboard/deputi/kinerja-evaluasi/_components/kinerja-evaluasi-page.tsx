import { KpiPage } from "@/app/(main)/dashboard/_components/kpi/kpi-page";

export function KinerjaEvaluasiPage({ from, to }: { from?: string; to?: string }) {
  return <KpiPage mode="national" from={from} to={to} />;
}
