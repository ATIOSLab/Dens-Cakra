import { KinerjaEvaluasiPage } from "./_components/kinerja-evaluasi-page";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ from?: string | string[]; to?: string | string[] }> };

export default async function Page({ searchParams }: PageProps) {
  const query = await searchParams;
  const from = Array.isArray(query.from) ? query.from[0] : query.from;
  const to = Array.isArray(query.to) ? query.to[0] : query.to;
  return <KinerjaEvaluasiPage from={from} to={to} />;
}
