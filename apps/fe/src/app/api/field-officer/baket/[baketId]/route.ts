import { type NextRequest, NextResponse } from "next/server";

import { updateBaketDraft } from "@/server/field-ops/repository";

type Params = { params: Promise<{ baketId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { baketId } = await params;
    const body = await request.json();
    return NextResponse.json(await updateBaketDraft(request.headers.get("cookie") ?? "", baketId, body));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal memperbarui draft Baket." },
      { status: 500 },
    );
  }
}
