import { NextRequest, NextResponse } from "next/server";

import { createWhatsappControlChannel, getWhatsappControlChannels } from "@/server/field-ops/repository";

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(await getWhatsappControlChannels(request.headers.get("cookie") ?? ""));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal memuat kontrol WhatsApp." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      code: string;
      name: string;
      userId: string;
    };

    return NextResponse.json(
      await createWhatsappControlChannel(request.headers.get("cookie") ?? "", {
        code: body.code,
        name: body.name,
        config: {
          userId: body.userId,
        },
      }),
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal membuat kanal WhatsApp." },
      { status: 500 },
    );
  }
}
