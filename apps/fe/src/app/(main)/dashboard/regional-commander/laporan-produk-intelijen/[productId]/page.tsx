import { RegionalProductDetailPage } from "@/app/(main)/dashboard/_components/intelligence-products/intelligence-product-pages";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    productId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const { productId } = await params;
  const query = (await searchParams) ?? {};
  return (
    <RegionalProductDetailPage
      productId={productId}
      approvalStepId={typeof query.approvalStepId === "string" ? query.approvalStepId : undefined}
    />
  );
}
