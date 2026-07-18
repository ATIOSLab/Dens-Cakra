import { type NextRequest, NextResponse } from "next/server";

import { backendApi } from "@/server/backend-api";
import { createOwnLocationPing } from "@/server/field-ops/repository";
import type { AccessContext } from "@/server/field-ops/types";

type AccessMeResponse = {
  authorizationContext?: AccessContext | null;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      positionAssignmentId?: string;
      latitude: number;
      longitude: number;
      gpsAccuracyMeters?: number | null;
      capturedAt: string;
      isStealth?: boolean;
    };
    const cookie = request.headers.get("cookie") ?? "";
    const access = await backendApi<AccessMeResponse>("/access/me", { cookie });
    const positionAssignmentId = body.positionAssignmentId ?? access.authorizationContext?.primaryAssignmentId;

    if (!positionAssignmentId) {
      return NextResponse.json({ message: "Assignment Field Officer tidak tersedia." }, { status: 403 });
    }

    return NextResponse.json(await createOwnLocationPing(cookie, { ...body, positionAssignmentId }), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal mengirim ping lokasi." },
      { status: 500 },
    );
  }
}
