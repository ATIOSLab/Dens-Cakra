import { RegionalProductDetailPage } from "@/app/(main)/dashboard/_components/intelligence-products/intelligence-product-pages";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ approvalStepId?: string | string[] }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const { productId } = await params;
  const approvalStepIdValue = (await searchParams).approvalStepId;
  const approvalStepId = Array.isArray(approvalStepIdValue) ? approvalStepIdValue[0] : approvalStepIdValue;
  return <RegionalProductDetailPage productId={productId} approvalStepId={approvalStepId} />;
}
