import { notFound } from "next/navigation";

import { apiServerGet } from "@/lib/api/server-client";
import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import { IntelligenceProductDetail, IntelligenceProductList } from "./intelligence-product-client";

export async function RegionalProductListPage({ sortBy, sortOrder }: { sortBy?: string; sortOrder?: string }) {
  await requireRole(SYSTEM_ROLES.REGIONAL_COMMANDER);
  const [products, approvalInbox] = await Promise.all([
    apiServerGet("/products", { page: 1, limit: 100, sortBy, sortOrder }),
    apiServerGet("/approval-inbox", {
      stage: "REGIONAL",
      status: "ACTIVE",
      page: 1,
      limit: 50,
    }),
  ]);
  return (
    <IntelligenceProductList
      data={products}
      approvalData={approvalInbox}
      title="Laporan & Produk Intelijen"
      description="Baca produk dari rantai komando Anda dan selesaikan keputusan regional dalam satu ruang kerja."
      basePath="/dashboard/regional-commander/laporan-produk-intelijen"
    />
  );
}

export async function RegionalProductDetailPage({
  productId,
  approvalStepId,
}: {
  productId: string;
  approvalStepId?: string;
}) {
  await requireRole(SYSTEM_ROLES.REGIONAL_COMMANDER);
  const [product, approvalStep] = await Promise.all([
    apiServerGet(`/products/${productId}`, { include: "versions,workflow" }),
    approvalStepId
      ? apiServerGet<Record<string, unknown>>(`/approval-steps/${approvalStepId}`)
      : Promise.resolve(undefined),
  ]);
  if (approvalStep) {
    const workflow = approvalStep.workflow as Record<string, unknown> | undefined;
    const version = workflow?.productVersion as Record<string, unknown> | undefined;
    const approvalProduct = version?.product as Record<string, unknown> | undefined;
    if (approvalProduct?.id !== productId) notFound();
  }
  return <IntelligenceProductDetail product={product} approvalStep={approvalStep} />;
}

export async function ExecutiveProductListPage({ sortBy, sortOrder }: { sortBy?: string; sortOrder?: string }) {
  await requireRole(SYSTEM_ROLES.EXECUTIVE);
  const products = await apiServerGet("/products", { page: 1, limit: 100, sortBy, sortOrder });
  return (
    <IntelligenceProductList
      data={products}
      title="Produk Intelijen"
      description="Produk yang telah disetujui Komandan Regional dan tersedia untuk Deputi II."
      basePath="/dashboard/executive/produk-intelijen"
    />
  );
}

export async function ExecutiveProductDetailPage({ productId }: { productId: string }) {
  await requireRole(SYSTEM_ROLES.EXECUTIVE);
  const product = await apiServerGet(`/products/${productId}`, { include: "versions,workflow" });
  return <IntelligenceProductDetail product={product} executive />;
}
