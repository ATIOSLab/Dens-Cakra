import { ExecutiveProductListPage } from "@/app/(main)/dashboard/_components/intelligence-products/intelligence-product-pages";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: PageProps) {
  const query = (await searchParams) ?? {};
  return (
    <ExecutiveProductListPage
      sortBy={typeof query.sortBy === "string" ? query.sortBy : undefined}
      sortOrder={typeof query.sortOrder === "string" ? query.sortOrder : undefined}
    />
  );
}
