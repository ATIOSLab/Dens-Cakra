import { type NextRequest, NextResponse } from "next/server";

import { apiRouteErrorResponse } from "@/server/api-route-error";
import { type FieldOfficerWorkspaceView, getFieldOfficerView } from "@/server/field-ops/repository";

const SUPPORTED_VIEWS = new Set<FieldOfficerWorkspaceView>([
  "tasks",
  "incoming",
  "jaring",
  "baket",
  "reports",
  "map",
  "alert",
  "overview",
]);

export async function GET(request: NextRequest, { params }: { params: Promise<{ view: string }> }) {
  const { view } = await params;
  if (!SUPPORTED_VIEWS.has(view as FieldOfficerWorkspaceView)) {
    return NextResponse.json({ message: "Tampilan Petugas Wilayah (Gaswil) tidak dikenali." }, { status: 404 });
  }

  try {
    const categoryId = request.nextUrl.searchParams.get("categoryId") || undefined;
    const from = request.nextUrl.searchParams.get("from") || undefined;
    const to = request.nextUrl.searchParams.get("to") || undefined;
    const sortBy = request.nextUrl.searchParams.get("sortBy") || undefined;
    const sortOrder = request.nextUrl.searchParams.get("sortOrder") || undefined;

    return NextResponse.json(
      await getFieldOfficerView(request.headers.get("cookie") ?? "", view as FieldOfficerWorkspaceView, {
        categoryId,
        from,
        to,
        sortBy,
        sortOrder,
      }),
    );
  } catch (error) {
    return apiRouteErrorResponse(error, "Gagal memuat tampilan Petugas Wilayah (Gaswil).");
  }
}
