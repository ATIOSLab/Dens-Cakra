import { PetugasWilayahPage } from "./_components/petugas-wilayah-page";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: PageProps) {
  return <PetugasWilayahPage searchParams={searchParams} />;
}
