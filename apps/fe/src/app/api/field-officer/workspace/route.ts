import { NextRequest, NextResponse } from "next/server";

import { getFieldOfficerWorkspace } from "@/server/field-ops/repository";

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(await getFieldOfficerWorkspace(request.headers.get("cookie") ?? ""));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal memuat workspace field officer." },
      { status: 500 },
    );
  }
}
