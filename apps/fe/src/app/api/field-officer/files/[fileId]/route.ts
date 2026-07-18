import { type NextRequest, NextResponse } from "next/server";

import { getBackendInternalUrl } from "@/lib/auth/backend-url";
import { backendApi } from "@/server/backend-api";

type RouteContext = {
  params: Promise<{ fileId: string }>;
};

type AccessUrlResponse = {
  url: string;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { fileId } = await params;
    const access = await backendApi<AccessUrlResponse>(`/files/${fileId}/access-url`, {
      cookie: request.headers.get("cookie") ?? "",
      query: {
        ttlSeconds: 120,
        disposition: "inline",
      },
    });
    const fileUrl = access.url.startsWith("http") ? access.url : `${getBackendInternalUrl()}${access.url}`;
    const response = await fetch(fileUrl, { cache: "no-store" });

    if (!response.ok || !response.body) {
      return NextResponse.json({ message: "File tidak dapat dibaca." }, { status: response.status || 404 });
    }

    return new NextResponse(response.body, {
      headers: {
        "cache-control": "private, max-age=60",
        "content-type": response.headers.get("content-type") ?? "image/jpeg",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal membaca file." },
      { status: 500 },
    );
  }
}
