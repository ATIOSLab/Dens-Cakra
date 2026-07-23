import { RegionalCommanderPersonelLapanganPage } from "./_components/personel-lapangan-page";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: PageProps) {
  return <RegionalCommanderPersonelLapanganPage searchParams={searchParams} />;
}
