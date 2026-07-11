export type ApiPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
  message?: string;
  meta?: Record<string, unknown> & { pagination?: ApiPagination };
  requestId: string;
  timestamp: string;
};

export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Array<{ field: string; code: string; message: string }>;
    details?: Record<string, unknown>;
  };
  requestId: string;
  timestamp: string;
};

export type ApiResult<T> = {
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
};

export function apiResult<T>(
  data: T,
  message?: string,
  meta?: Record<string, unknown>,
): ApiResult<T> {
  return { data, ...(message ? { message } : {}), ...(meta ? { meta } : {}) };
}
