import type { QueryParams, QueryValue } from "./types";

function appendValue(params: URLSearchParams, key: string, value: QueryValue) {
  if (value === null || value === undefined || value === "") {
    return;
  }
  params.append(key, String(value));
}

export function toSearchParams(query?: QueryParams) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query ?? {})) {
    if (Array.isArray(value)) {
      for (const item of value) {
        appendValue(params, key, item);
      }
      continue;
    }
    appendValue(params, key, value);
  }

  return params;
}

export function withQuery(path: string, query?: QueryParams) {
  const params = toSearchParams(query);
  const queryString = params.toString();

  return queryString ? `${path}?${queryString}` : path;
}

export function normalizeSearchParams(searchParams: Record<string, string | string[] | undefined>) {
  const normalized: QueryParams = {};

  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined) {
      normalized[key] = value;
    }
  }

  return normalized;
}
