import { NextRequest, NextResponse } from "next/server";

import { backendApi } from "@/server/backend-api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    return NextResponse.json(
      await backendApi("/jaring/clusters", {
        cookie: request.headers.get("cookie") ?? "",
        query: {
          includeInactive: "true",
          search: searchParams.get("search") || undefined,
          limit: 200,
        },
      }),
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal memuat cluster Jaring." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return NextResponse.json(
      await backendApi("/jaring/clusters", {
        cookie: request.headers.get("cookie") ?? "",
        method: "POST",
        body: await request.json(),
        idempotent: true,
      }),
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal membuat cluster Jaring." },
      { status: 500 },
    );
  }
}
