import { type NextRequest, NextResponse } from "next/server";

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
    return NextResponse.json({ message: "View Field Officer tidak dikenali." }, { status: 404 });
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
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Gagal memuat view Field Officer.",
      },
      { status: 500 },
    );
  }
}
