"use client";

import { ApiClientError } from "./errors";
import { createIdempotencyKey } from "./idempotency";
import { withQuery } from "./query";
import type { ApiEnvelope, ApiResolvedEnvelope, QueryParams } from "./types";

type BrowserRequestOptions = {
  query?: QueryParams;
  init?: RequestInit;
  idempotent?: boolean;
};

function getBrowserBackendUrl() {
  return (process.env.NEXT_PUBLIC_BROWSER_API_BASE_URL ?? "").replace(/\/$/, "");
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

export async function apiBrowserFetchEnvelope<T>(path: string, options: BrowserRequestOptions = {}) {
  const headers = new Headers(options.init?.headers);
  headers.set("accept", "application/json");

  if (options.idempotent && !headers.has("idempotency-key")) {
    headers.set("idempotency-key", createIdempotencyKey("dc_web"));
  }

  const backendUrl = getBrowserBackendUrl();
  const response = await fetch(`${backendUrl}/api/v1${withQuery(path, options.query)}`, {
    ...options.init,
    headers,
    credentials: "include",
  });

  return parseEnvelope<T>(response);
}

export async function apiBrowserFetch<T>(path: string, options: BrowserRequestOptions = {}) {
  const payload = await apiBrowserFetchEnvelope<T>(path, options);

  return payload.data;
}

export async function apiBrowserMutation<T>(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  options: Omit<BrowserRequestOptions, "init"> = {},
) {
  return apiBrowserFetch<T>(path, {
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
