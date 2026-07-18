import { OrganisasiWilayahCreatePage } from "../../_components/organisasi-wilayah-pages";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    provinceAreaId?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <OrganisasiWilayahCreatePage masterType="binda" selectedProvinceAreaId={resolvedSearchParams?.provinceAreaId} />
  );
}
