import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const backendUrl = (process.env.BACKEND_INTERNAL_URL || "http://localhost:3001").replace(/\/$/, "");

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const { reportId } = await params;
    const response = await fetch(`${backendUrl}/v1/whatsapp/reports/${reportId}/status`, {
      method: "PATCH",
      body: await request.text(),
      headers: {
        "Content-Type": request.headers.get("Content-Type") || "application/json",
        "x-field-officer-id": request.headers.get("x-field-officer-id") || "",
      },
    });

    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ message: "Backend WhatsApp report belum tersedia" }, { status: 503 });
  }
}
