import { type NextRequest, NextResponse } from "next/server";

import { regenerateFieldOfficerJaringPin } from "@/server/field-ops/repository";

type Params = {
  params: Promise<{
    jaringId: string;
  }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { jaringId } = await params;
    return NextResponse.json(await regenerateFieldOfficerJaringPin(request.headers.get("cookie") ?? "", jaringId));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal membuat ulang PIN Jaring." },
      { status: 500 },
    );
  }
}
