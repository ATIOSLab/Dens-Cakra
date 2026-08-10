import "server-only";

import { getBackendInternalUrl } from "@/lib/auth/backend-url";

import { randomUUID } from "node:crypto";

type BackendEnvelope<T> = {
  success: boolean;
  data: T;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

type BackendRequestOptions = {
  body?: unknown;
  cookie?: string | null;
  headers?: Record<string, string>;
  idempotent?: boolean;
  method?: string;
  query?: Record<string, string | number | boolean | null | undefined>;
};

export class BackendApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "BackendApiError";
  }
}

function buildUrl(path: string, query?: BackendRequestOptions["query"]) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const apiPath = normalizedPath.startsWith("/api/v1") ? normalizedPath : `/api/v1${normalizedPath}`;
  const url = new URL(`${getBackendInternalUrl()}${apiPath}`);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === null || value === undefined || value === "") {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url;
}

export async function backendApi<T>(
  path: string,
  { body, cookie, headers, idempotent, method = "GET", query }: BackendRequestOptions = {},
): Promise<T> {
  const requestHeaders = new Headers({
    accept: "application/json",
    ...(headers ?? {}),
  });

  if (cookie) {
    requestHeaders.set("cookie", cookie);
  }

  if (body !== undefined) {
    requestHeaders.set("content-type", "application/json");
  }

  if (idempotent && !requestHeaders.has("idempotency-key")) {
    requestHeaders.set("idempotency-key", randomUUID());
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers: requestHeaders,
    cache: "no-store",
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const payload = (await response.json().catch(() => null)) as BackendEnvelope<T> | T | null;

  if (!response.ok) {
    const envelopeError = payload && typeof payload === "object" && "error" in payload ? payload.error : undefined;
    const envelopeMessage = envelopeError?.message;
    const fallbackMessage =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: unknown }).message)
        : undefined;
    const backendMessage = envelopeMessage ?? fallbackMessage ?? `Backend request failed with ${response.status}.`;
    const publicMessage =
      response.status >= 500 ? "Layanan backend belum dapat memproses permintaan saat ini." : backendMessage;

    throw new BackendApiError(publicMessage, response.status, envelopeError?.code);
  }

  if (payload && typeof payload === "object" && "success" in payload) {
    return payload.data;
  }

  return payload as T;
}
