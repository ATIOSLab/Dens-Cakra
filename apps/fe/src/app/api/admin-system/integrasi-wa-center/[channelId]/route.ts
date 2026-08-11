import { type NextRequest, NextResponse } from "next/server";

import { apiRouteErrorResponse } from "@/server/api-route-error";
import { removeWhatsappControlChannel, updateWhatsappControlChannel } from "@/server/field-ops/repository";

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
      scopeAreaIds?: string[];
      senderNumbers?: string[];
    };

    return NextResponse.json(await updateWhatsappControlChannel(request.headers.get("cookie") ?? "", channelId, body));
  } catch (error) {
    return apiRouteErrorResponse(error, "Gagal memperbarui kontrol WhatsApp.");
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { channelId } = await params;
    return NextResponse.json(await removeWhatsappControlChannel(request.headers.get("cookie") ?? "", channelId));
  } catch (error) {
    return apiRouteErrorResponse(error, "Gagal menghapus koneksi WhatsApp.");
  }
}
