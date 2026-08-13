export type OimView =
  | "dashboard"
  | "reports"
  | "report-detail"
  | "report-version"
  | "verification"
  | "verification-detail"
  | "analysis"
  | "analysis-new"
  | "analysis-detail"
  | "analysis-edit"
  | "analysis-version"
  | "products"
  | "product-list"
  | "product-new"
  | "product-detail"
  | "product-edit"
  | "product-version"
  | "approval"
  | "approval-detail"
  | "workflow-detail"
  | "monitoring"
  | "monitoring-task"
  | "monitoring-report"
  | "monitoring-personnel"
  | "map"
  | "map-report"
  | "map-alert";

export type OimProductContext = {
  productTypeCode?: string;
  productTypeId?: string;
  label: string;
  listTitle: string;
  createTitle: string;
  detailTitle: string;
  listPath: string;
  createPath: string;
  detailBasePath: string;
};

export type OimPageData = {
  bakets?: unknown;
  baket?: unknown;
  reportCategories?: unknown;
  version?: unknown;
  verifications?: unknown;
  verification?: unknown;
  analyses?: unknown;
  analysis?: unknown;
  products?: unknown;
  product?: unknown;
  productTypes?: unknown;
  workflow?: unknown;
  dashboard?: unknown;
  map?: unknown;
  boundaries?: unknown;
  areas?: unknown;
  errors?: string[];
  activeTab?: string;
  activeStatus?: string;
  productContext?: OimProductContext;
};
