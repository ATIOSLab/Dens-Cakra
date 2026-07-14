import { apiServerGet } from "@/lib/api/server-client";
import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import type { OimPageData, OimView } from "./oim-types";
import { OimWorkspaceClient } from "./oim-workspace-client";

type Props = {
  view: OimView;
  params?: Record<string, string>;
  searchParams?: Record<string, string | string[] | undefined>;
};

async function safe<T>(label: string, promise: Promise<T>, errors: string[]): Promise<T | undefined> {
  try {
    return await promise;
  } catch {
    errors.push(`${label} belum dapat dimuat.`);
    return undefined;
  }
}

export async function OimWorkspacePage({ view, params = {}, searchParams = {} }: Props) {
  await requireRole(SYSTEM_ROLES.OPERATIONAL_INTELLIGENCE_MANAGER);
  const errors: string[] = [];
  const page = typeof searchParams.page === "string" ? searchParams.page : "1";
  const areaId = typeof searchParams.areaId === "string" ? searchParams.areaId : undefined;
  const requestedStatus = typeof searchParams.status === "string" ? searchParams.status : undefined;
  const requestedStatuses = typeof searchParams.statuses === "string" ? searchParams.statuses : undefined;
  const commonQuery = {
    page,
    limit: 25,
    areaId,
    search: typeof searchParams.search === "string" ? searchParams.search : undefined,
    status: view === "reports" && !requestedStatus && !requestedStatuses ? "SENT_TO_OIM" : requestedStatus,
    statuses: requestedStatuses,
    urgency: typeof searchParams.urgency === "string" ? searchParams.urgency : undefined,
    categoryId: typeof searchParams.categoryId === "string" ? searchParams.categoryId : undefined,
    jaringClusterId: typeof searchParams.jaringClusterId === "string" ? searchParams.jaringClusterId : undefined,
    from: typeof searchParams.periodStart === "string" ? searchParams.periodStart : undefined,
    to: typeof searchParams.periodEnd === "string" ? searchParams.periodEnd : undefined,
  };
  const data: OimPageData = {
    errors,
    activeTab: typeof searchParams.tab === "string" ? searchParams.tab : undefined,
    activeStatus: requestedStatuses ?? commonQuery.status,
  };

  const listRequests = [
    safe("baket", apiServerGet("/bakets", commonQuery), errors).then((value) => {
      data.bakets = value;
    }),
    safe("kategori laporan", apiServerGet("/jaring/report-categories", { limit: 200 }), errors).then((value) => {
      data.reportCategories = value;
    }),
    safe("klaster jaring", apiServerGet("/jaring/clusters", { limit: 200 }), errors).then((value) => {
      data.jaringClusters = value;
    }),
    safe("wilayah", apiServerGet("/administrative-areas/scoped-tree"), errors).then((value) => {
      data.areas = value;
    }),
  ];

  if (["dashboard", "reports", "verification", "analysis-new", "map", "monitoring"].includes(view))
    listRequests.push(
      safe(
        "verifikasi",
        apiServerGet("/verifications", {
          limit: 25,
          areaId,
          status: view === "verification" ? requestedStatus : undefined,
          from: commonQuery.from,
          to: commonQuery.to,
        }),
        errors,
      ).then((value) => {
        data.verifications = value;
      }),
    );
  if (["dashboard", "analysis", "analysis-new", "products", "product-new"].includes(view))
    listRequests.push(
      safe(
        "analisis",
        apiServerGet("/analysis-cases", {
          page,
          limit: 25,
          search: commonQuery.search,
          status: commonQuery.status,
        }),
        errors,
      ).then((value) => {
        data.analyses = value;
      }),
    );
  if (["dashboard", "products", "product-list", "product-new", "approval", "monitoring"].includes(view))
    listRequests.push(
      safe(
        "produk",
        apiServerGet("/products", {
          page,
          limit: 25,
          areaId,
          search: commonQuery.search,
          status: commonQuery.status,
          periodFrom: commonQuery.from,
          periodTo: commonQuery.to,
        }),
        errors,
      ).then((value) => {
        data.products = value;
      }),
    );
  if (["products", "product-new", "product-edit"].includes(view))
    listRequests.push(
      safe("jenis produk", apiServerGet("/product-types", { isActive: true }), errors).then((value) => {
        data.productTypes = value;
      }),
    );
  if (["dashboard", "monitoring"].includes(view))
    listRequests.push(
      safe("dashboard", apiServerGet("/dashboard/briefing", { areaId }), errors).then((value) => {
        data.dashboard = value;
      }),
    );
  if (view === "map")
    listRequests.push(
      safe("peta", apiServerGet("/map/reports", { bbox: "94,-12,142,7", zoom: 5, limit: 1000, areaId }), errors).then(
        (value) => {
          data.map = value;
        },
      ),
      safe(
        "batas wilayah",
        apiServerGet("/map/boundaries", { bbox: "94,-12,142,7", zoom: 5, limit: 1000, areaId }),
        errors,
      ).then((value) => {
        data.boundaries = value;
      }),
    );

  if (params.baketId) data.baket = await safe("detail baket", apiServerGet(`/bakets/${params.baketId}`), errors);
  if (params.versionId && view === "report-version")
    data.version = await safe("versi baket", apiServerGet(`/baket-versions/${params.versionId}`), errors);
  if (params.verificationId)
    data.verification = await safe(
      "detail verifikasi",
      apiServerGet(`/verifications/${params.verificationId}`),
      errors,
    );
  if (params.caseId)
    data.analysis = await safe("detail analisis", apiServerGet(`/analysis-cases/${params.caseId}`), errors);
  if (params.versionId && view === "analysis-version")
    data.version = await safe("versi analisis", apiServerGet(`/analysis-versions/${params.versionId}`), errors);
  if (params.productId)
    data.product = await safe(
      "detail produk",
      apiServerGet(`/products/${params.productId}`, { include: "versions,workflow" }),
      errors,
    );
  if (params.versionId && view === "product-version")
    data.version = await safe("versi produk", apiServerGet(`/product-versions/${params.versionId}`), errors);
  if (params.workflowId)
    data.workflow = await safe(
      "workflow",
      apiServerGet(`/approval-workflows/${params.workflowId}`, { include: "steps,events" }),
      errors,
    );

  await Promise.all(listRequests);
  return <OimWorkspaceClient view={view} data={data} params={params} />;
}
