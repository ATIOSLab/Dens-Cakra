import { type NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { apiRouteErrorResponse } from "@/server/api-route-error";
import { backendApi } from "@/server/backend-api";
import { createOwnLocationPing } from "@/server/field-ops/repository";
import type { AccessContext } from "@/server/field-ops/types";

type AccessMeResponse = {
  authorizationContext?: AccessContext | null;
};

const liveLocationSchema = z.object({
  positionAssignmentId: z.string().min(1).max(100).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  gpsAccuracyMeters: z.number().min(0).max(100000).nullable().optional(),
  capturedAt: z.string().min(1).max(64),
  isStealth: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json().catch(() => null);
    const parsed = liveLocationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Data lokasi tidak valid." }, { status: 400 });
    }

    const cookie = request.headers.get("cookie") ?? "";
    const access = await backendApi<AccessMeResponse>("/access/me", { cookie });
    const positionAssignmentId = parsed.data.positionAssignmentId ?? access.authorizationContext?.primaryAssignmentId;

    if (!positionAssignmentId) {
      return NextResponse.json({ message: "Penugasan Petugas Wilayah (Gaswil) tidak tersedia." }, { status: 403 });
    }

    return NextResponse.json(
      await createOwnLocationPing(cookie, {
        ...parsed.data,
        positionAssignmentId,
      }),
      { status: 201 },
    );
  } catch (error) {
    return apiRouteErrorResponse(error, "Gagal mengirim ping lokasi.");
  }
}
