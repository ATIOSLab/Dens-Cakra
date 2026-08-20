import { KpiPage } from "@/app/(main)/dashboard/_components/kpi/kpi-page";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ from?: string | string[]; to?: string | string[] }> };

export default async function Page({ searchParams }: PageProps) {
  const query = await searchParams;
  const from = Array.isArray(query.from) ? query.from[0] : query.from;
  const to = Array.isArray(query.to) ? query.to[0] : query.to;
  return <KpiPage mode="regional" from={from} to={to} />;
}
