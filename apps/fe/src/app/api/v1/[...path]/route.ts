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

const idempotentMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

async function forwardApiRequest(request: NextRequest) {
  const targetUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, getBackendInternalUrl());
  const forwardedHeaders = new Headers(request.headers);

  for (const header of hopByHopHeaders) {
    forwardedHeaders.delete(header);
  }

  if (idempotentMethods.has(request.method) && !forwardedHeaders.has("idempotency-key")) {
    forwardedHeaders.set("idempotency-key", `dc_proxy_${crypto.randomUUID()}`);
  }

  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: request.method,
      headers: forwardedHeaders,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    console.error(`[api-proxy] ${request.method} ${targetUrl.pathname}: backend tidak dapat dijangkau.`);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BACKEND_UNAVAILABLE",
          message: "Layanan backend belum tersedia. Coba lagi beberapa saat lagi.",
        },
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: { "retry-after": "3" },
      },
    );
  }

  const responseHeaders = new Headers(response.headers);
  const setCookies = response.headers.getSetCookie?.() ?? [];

  if (setCookies.length > 0) {
    responseHeaders.delete("set-cookie");
  }

  const proxyResponse = new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });

  for (const cookie of setCookies) {
    proxyResponse.headers.append("set-cookie", cookie);
  }

  return proxyResponse;
}

export async function GET(request: NextRequest) {
  return forwardApiRequest(request);
}

export async function POST(request: NextRequest) {
  return forwardApiRequest(request);
}

export async function PUT(request: NextRequest) {
  return forwardApiRequest(request);
}

export async function PATCH(request: NextRequest) {
  return forwardApiRequest(request);
}

export async function DELETE(request: NextRequest) {
  return forwardApiRequest(request);
}
