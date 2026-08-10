import { type NextRequest, NextResponse } from "next/server";

import { apiRouteErrorResponse } from "@/server/api-route-error";
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
    return apiRouteErrorResponse(error, "Gagal menjalankan aksi kanal WhatsApp.");
  }
}
