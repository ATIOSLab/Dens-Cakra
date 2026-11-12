import { type NextRequest, NextResponse } from "next/server";

import { apiRouteErrorResponse } from "@/server/api-route-error";
import { updateWhatsappChannelLocationRequirement } from "@/server/field-ops/repository";

type Params = {
  params: Promise<{
    channelId: string;
  }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { channelId } = await params;
    const body = (await request.json()) as {
      locationRequirement: "REQUIRED" | "OPTIONAL";
    };

    return NextResponse.json(
      await updateWhatsappChannelLocationRequirement(
        request.headers.get("cookie") ?? "",
        channelId,
        body.locationRequirement,
      ),
    );
  } catch (error) {
    return apiRouteErrorResponse(error, "Gagal memperbarui kewajiban Live Location.");
  }
}
