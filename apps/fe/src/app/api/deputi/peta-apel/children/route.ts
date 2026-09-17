import { type NextRequest, NextResponse } from "next/server";

import { apiRouteErrorResponse } from "@/server/api-route-error";
import { getAreaChildren } from "@/server/apel-repository";

export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") ?? "";
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parentId");

    if (!parentId || parentId === "ALL") {
      return NextResponse.json({ items: [] });
    }

    const items = await getAreaChildren(cookie, parentId);
    return NextResponse.json({ items: items || [] });
  } catch (error) {
    console.error("[api/deputi/peta-apel/children] Error loading children areas:", error);
    return apiRouteErrorResponse(error, "Gagal memuat daftar anak wilayah.");
  }
}
