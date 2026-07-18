import { type NextRequest, NextResponse } from "next/server";

import { updateFieldOfficerJaring } from "@/server/field-ops/repository";

type Params = {
  params: Promise<{
    jaringId: string;
  }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { jaringId } = await params;
    const body = (await request.json()) as {
      aliasName?: string;
      whatsappNumber?: string;
      notes?: string;
    };

    return NextResponse.json(await updateFieldOfficerJaring(request.headers.get("cookie") ?? "", jaringId, body));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal memperbarui jaring." },
      { status: 500 },
    );
  }
}
