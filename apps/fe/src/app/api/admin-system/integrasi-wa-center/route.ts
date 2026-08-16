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
      userId?: string | null;
      operationalAssignmentId?: string | null;
      scopeAreaIds?: string[];
      scopeAreaId?: string | null;
      scopeAreaCode?: string | null;
      scopeAreaName?: string | null;
      scopeAreaLevel?: string | null;
      scopeAreaParentName?: string | null;
      scopeBranch?: string | null;
    };

    return NextResponse.json(
      await createWhatsappControlChannel(request.headers.get("cookie") ?? "", {
        code: body.code,
        name: body.name,
        config: {
          ...(body.userId ? { userId: body.userId } : {}),
          ...(body.operationalAssignmentId ? { operationalAssignmentId: body.operationalAssignmentId } : {}),
          scopeAreaIds: body.scopeAreaIds,
          scopeAreaId: body.scopeAreaId,
          scopeAreaCode: body.scopeAreaCode,
          scopeAreaName: body.scopeAreaName,
          scopeAreaLevel: body.scopeAreaLevel,
          scopeAreaParentName: body.scopeAreaParentName,
          scopeBranch: body.scopeBranch,
        },
      }),
    );
  } catch (error) {
    return apiRouteErrorResponse(error, "Gagal membuat kanal WhatsApp.");
  }
}
