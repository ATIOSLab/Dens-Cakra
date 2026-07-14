import { NextRequest, NextResponse } from "next/server";

import { activateWhatsappControlChannel } from "@/server/field-ops/repository";

type Params = {
  params: Promise<{
    channelId: string;
  }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { channelId } = await params;
    const body = (await request.json()) as {
      action: "activate" | "deactivate" | "test" | "request-qr";
    };

    return NextResponse.json(
      await activateWhatsappControlChannel(request.headers.get("cookie") ?? "", channelId, body.action),
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal menjalankan aksi kanal WhatsApp." },
      { status: 500 },
    );
  }
}
