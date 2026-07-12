import { NextRequest, NextResponse } from "next/server";

import { updateWhatsappControlChannel } from "@/server/field-ops/repository";

type Params = {
  params: Promise<{
    channelId: string;
  }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { channelId } = await params;
    const body = (await request.json()) as {
      name?: string;
      botLabel?: string;
      provider?: string;
      senderNumbers?: string[];
    };

    return NextResponse.json(
      await updateWhatsappControlChannel(request.headers.get("cookie") ?? "", channelId, body),
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal memperbarui kontrol WhatsApp." },
      { status: 500 },
    );
  }
}
