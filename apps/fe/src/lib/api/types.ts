export type ApiSuccessEnvelope<T> = {
  success: true;
  data: T;
  message?: string;
  meta?: ApiMeta;
  requestId: string;
  timestamp: string;
};

export type ApiErrorEnvelope = {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
    details?: unknown;
  };
  requestId: string;
  timestamp: string;
};

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export type PaginationMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  nextCursor?: string | null;
};

export type AvailableAction = {
  code: string;
  label: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  endpoint?: string;
  destructive?: boolean;
  disabledReason?: string | null;
};

export type FacetMap = Record<string, Record<string, number>>;

export type AppliedScope = {
  role?: string;
  unitId?: string | null;
  areaId?: string | null;
  includeDescendants?: boolean;
  clearanceRank?: number | null;
  generatedAt?: string;
};

export type ApiMeta = {
  pagination?: PaginationMeta;
  facets?: FacetMap;
  availableActions?: AvailableAction[];
  appliedScope?: AppliedScope;
  [key: string]: unknown;
};

export type PagedResponse<T> = {
  items: T[];
  pagination?: PaginationMeta;
  facets?: FacetMap;
  availableActions?: AvailableAction[];
  appliedScope?: AppliedScope;
};

export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
  facets?: FacetMap;
  availableActions?: AvailableAction[];
  appliedScope?: AppliedScope;
};

export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue | QueryValue[]>;
