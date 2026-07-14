import { ExecutiveProductDetailPage } from "@/app/(main)/dashboard/_components/intelligence-products/intelligence-product-pages";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ productId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { productId } = await params;
  return <ExecutiveProductDetailPage productId={productId} />;
}
