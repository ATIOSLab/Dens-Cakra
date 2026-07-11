import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const backendUrl = (process.env.BACKEND_INTERNAL_URL || "http://localhost:3001").replace(/\/$/, "");

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    const response = await fetch(`${backendUrl}/v1/whatsapp/users/${userId}/regenerate-pin`, {
      method: "POST",
      headers: {
        "x-field-officer-id": request.headers.get("x-field-officer-id") || "",
      },
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ message: "Backend WhatsApp user belum tersedia" }, { status: 503 });
  }
}
