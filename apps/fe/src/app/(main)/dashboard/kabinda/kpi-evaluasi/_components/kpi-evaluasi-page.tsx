import { KpiPage } from "@/app/(main)/dashboard/_components/kpi/kpi-page";

export function KpiEvaluasiPage({ from, to }: { from?: string; to?: string }) {
  return <KpiPage mode="regional" from={from} to={to} />;
}
