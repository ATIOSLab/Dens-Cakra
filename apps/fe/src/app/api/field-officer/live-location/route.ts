import { NextRequest, NextResponse } from "next/server";

import { createOwnLocationPing } from "@/server/field-ops/repository";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      positionAssignmentId: string;
      latitude: number;
      longitude: number;
      gpsAccuracyMeters?: number | null;
      capturedAt: string;
      isStealth?: boolean;
    };

    return NextResponse.json(
      await createOwnLocationPing(request.headers.get("cookie") ?? "", body),
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal mengirim ping lokasi." },
      { status: 500 },
    );
  }
}
