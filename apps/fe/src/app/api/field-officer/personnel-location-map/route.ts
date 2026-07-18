import { type NextRequest, NextResponse } from "next/server";

import { backendApi } from "@/server/backend-api";

export async function GET(request: NextRequest) {
  try {
    const capturedAfter = request.nextUrl.searchParams.get("capturedAfter") ?? undefined;

    return NextResponse.json(
      await backendApi("/personnel-location-map", {
        cookie: request.headers.get("cookie") ?? "",
        query: { capturedAfter },
      }),
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal membaca peta lokasi personel." },
      { status: 500 },
    );
  }
}
