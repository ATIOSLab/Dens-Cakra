import { UniversalDensRoutePage } from "@/features/dens-page/universal-dens-route-page";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    productId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ params, searchParams }: PageProps) {
  return (
    <UniversalDensRoutePage
      routePattern="/dashboard/anev/produk-intelijen/daftar-produk/[productId]"
      params={await params}
      searchParams={(await searchParams) ?? {}}
    />
  );
}
