import { NextRequest, NextResponse } from "next/server";

import { validateIncomingMessage } from "@/server/field-ops/repository";

type Params = {
  params: Promise<{
    messageId: string;
  }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { messageId } = await params;

    return NextResponse.json(
      await validateIncomingMessage(request.headers.get("cookie") ?? "", messageId),
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal memvalidasi laporan." },
      { status: 500 },
    );
  }
}
