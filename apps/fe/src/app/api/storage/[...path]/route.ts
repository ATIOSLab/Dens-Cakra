import { type NextRequest, NextResponse } from "next/server";

import { getBackendInternalUrl } from "@/lib/auth/backend-url";

export const dynamic = "force-dynamic";

const hopByHopHeaders = [
  "host",
  "content-length",
  "connection",
  "expect",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];

async function forwardStorageRequest(request: NextRequest) {
  const targetUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, getBackendInternalUrl());
  const forwardedHeaders = new Headers(request.headers);

  for (const header of hopByHopHeaders) {
    forwardedHeaders.delete(header);
  }

  const response = await fetch(targetUrl, {
    method: request.method,
    headers: forwardedHeaders,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
    redirect: "manual",
    cache: "no-store",
  });

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

export async function GET(request: NextRequest) {
  return forwardStorageRequest(request);
}

export async function PUT(request: NextRequest) {
  return forwardStorageRequest(request);
}
