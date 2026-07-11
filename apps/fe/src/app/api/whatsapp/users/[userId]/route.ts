import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const backendUrl = (process.env.BACKEND_INTERNAL_URL || "http://localhost:3001").replace(/\/$/, "");

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    const response = await fetch(`${backendUrl}/v1/whatsapp/users/${userId}`, {
      method: "DELETE",
      headers: {
        "x-field-officer-id": request.headers.get("x-field-officer-id") || "",
      },
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({ message: "Gagal menghapus user WhatsApp" }))) as unknown;
      return NextResponse.json(body, { status: response.status });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Backend WhatsApp user belum tersedia" }, { status: 503 });
  }
}
