import { NextRequest, NextResponse } from "next/server";

import { submitBaket } from "@/server/field-ops/repository";

type Params = {
  params: Promise<{
    baketId: string;
  }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { baketId } = await params;

    return NextResponse.json(await submitBaket(request.headers.get("cookie") ?? "", baketId));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal mengirim baket." },
      { status: 500 },
    );
  }
}
