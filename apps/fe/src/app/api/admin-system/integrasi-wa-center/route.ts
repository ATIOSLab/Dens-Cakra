import { type NextRequest, NextResponse } from "next/server";

import { apiRouteErrorResponse } from "@/server/api-route-error";
import { createWhatsappControlChannel, getWhatsappControlChannels } from "@/server/field-ops/repository";

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(await getWhatsappControlChannels(request.headers.get("cookie") ?? ""));
  } catch (error) {
    return apiRouteErrorResponse(error, "Gagal memuat kontrol WhatsApp.");
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
    return apiRouteErrorResponse(error, "Gagal membuat kanal WhatsApp.");
  }
}
