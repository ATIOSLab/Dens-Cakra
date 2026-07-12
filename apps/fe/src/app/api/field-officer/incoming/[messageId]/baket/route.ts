import { NextRequest, NextResponse } from "next/server";

import { createBaketFromMessage } from "@/server/field-ops/repository";

type Params = {
  params: Promise<{
    messageId: string;
  }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { messageId } = await params;

    return NextResponse.json(
      await createBaketFromMessage(request.headers.get("cookie") ?? "", messageId),
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal membuat baket dari laporan." },
      { status: 500 },
    );
  }
}
