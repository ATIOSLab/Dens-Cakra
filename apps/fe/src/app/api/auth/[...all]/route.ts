import { type NextRequest, NextResponse } from "next/server";

import { getBackendInternalUrl } from "@/lib/auth/backend-url";

export const dynamic = "force-dynamic";

async function forwardAuthRequest(request: NextRequest) {
  const targetUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, getBackendInternalUrl());
  const forwardedHeaders = new Headers(request.headers);

  forwardedHeaders.delete("host");
  forwardedHeaders.delete("content-length");
  forwardedHeaders.delete("connection");
  forwardedHeaders.delete("expect");
  forwardedHeaders.delete("keep-alive");
  forwardedHeaders.delete("proxy-authenticate");
  forwardedHeaders.delete("proxy-authorization");
  forwardedHeaders.delete("te");
  forwardedHeaders.delete("trailer");
  forwardedHeaders.delete("transfer-encoding");
  forwardedHeaders.delete("upgrade");

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
    console.error(`[auth-proxy] ${request.method} ${targetUrl.pathname}: backend tidak dapat dijangkau.`);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BACKEND_UNAVAILABLE",
          message: "Layanan autentikasi belum tersedia. Pastikan backend berjalan pada port 3001.",
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

  if (setCookies.length > 0) {
    for (const cookie of setCookies) {
      proxyResponse.headers.append("set-cookie", cookie);
    }
  }

  return proxyResponse;
}

export async function GET(request: NextRequest) {
  return forwardAuthRequest(request);
}

export async function POST(request: NextRequest) {
  return forwardAuthRequest(request);
}
