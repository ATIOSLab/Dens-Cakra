import "server-only";

import { cache } from "react";

import { headers } from "next/headers";

import { getBackendInternalUrl } from "@/lib/auth/backend-url";

import { ApiClientError } from "./errors";
import { createIdempotencyKey } from "./idempotency";
import { withQuery } from "./query";
import type { ApiEnvelope, ApiResolvedEnvelope, QueryParams } from "./types";

type ServerRequestOptions = {
  query?: QueryParams;
  init?: RequestInit;
  idempotent?: boolean;
};

async function buildForwardedHeaders(extra?: HeadersInit, idempotent?: boolean) {
  const requestHeaders = await headers();
  const forwardedHeaders = new Headers({
    accept: "application/json",
    ...(extra ?? {}),
  });

  for (const headerName of ["cookie", "user-agent", "accept-language", "x-forwarded-for"]) {
    const value = requestHeaders.get(headerName);

    if (value && !forwardedHeaders.has(headerName)) {
      forwardedHeaders.set(headerName, value);
    }
  }

  if (idempotent && !forwardedHeaders.has("idempotency-key")) {
    forwardedHeaders.set("idempotency-key", createIdempotencyKey("dc_srv"));
  }

  return forwardedHeaders;
}

async function parseEnvelope<T>(response: Response): Promise<ApiResolvedEnvelope<T>> {
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? ((await response.json()) as ApiEnvelope<T>) : null;

  if (!response.ok || !payload || payload.success === false) {
    throw new ApiClientError(
      response.status,
      payload && payload.success === false ? payload : null,
      `Backend request failed with status ${response.status}.`,
    );
  }

  return payload;
}

function buildServerApiUrls(path: string, query?: QueryParams) {
  const primaryUrl = `${getBackendInternalUrl()}/api/v1${withQuery(path, query)}`;
  const urls = [primaryUrl];

  try {
    const fallbackUrl = new URL(primaryUrl);

    if (fallbackUrl.hostname === "localhost") {
      fallbackUrl.hostname = "127.0.0.1";
      urls.push(fallbackUrl.toString());
    }
  } catch {
    // Keep the primary URL only when URL parsing fails.
  }

  return urls;
}

export async function apiServerFetchEnvelope<T>(path: string, options: ServerRequestOptions = {}) {
  const urls = buildServerApiUrls(path, options.query);
  const forwardedHeaders = await buildForwardedHeaders(options.init?.headers, options.idempotent);
  let lastNetworkError: unknown = null;

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        ...options.init,
        headers: forwardedHeaders,
        cache: "no-store",
      });

      return parseEnvelope<T>(response);
    } catch (error) {
      lastNetworkError = error;

      if (!(error instanceof TypeError)) {
        throw error;
      }
    }
  }

  throw lastNetworkError;
}

export async function apiServerFetch<T>(path: string, options: ServerRequestOptions = {}) {
  const payload = await apiServerFetchEnvelope<T>(path, options);

  return payload.data;
}

const cachedApiServerGet = cache(async (path: string, queryKey: string) => {
  const query = Object.fromEntries(JSON.parse(queryKey) as [string, unknown][]);
  return apiServerFetch<unknown>(path, { query: query as QueryParams });
});

export async function apiServerGet<T>(path: string, query?: QueryParams) {
  const queryKey = JSON.stringify(Object.entries(query ?? {}).sort(([left], [right]) => left.localeCompare(right)));
  return cachedApiServerGet(path, queryKey) as Promise<T>;
}

export async function apiServerMutation<T>(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  options: Omit<ServerRequestOptions, "init"> = {},
) {
  return apiServerFetch<T>(path, {
    ...options,
    idempotent: options.idempotent ?? ["POST", "PUT", "DELETE"].includes(method),
    init: {
      method,
      headers: {
        "content-type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
  });
}
