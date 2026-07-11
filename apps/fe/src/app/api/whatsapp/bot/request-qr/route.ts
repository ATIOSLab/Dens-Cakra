import { NextResponse } from "next/server";

const backendUrl = (process.env.BACKEND_INTERNAL_URL || "http://localhost:3001").replace(/\/$/, "");

export async function POST() {
  try {
    const response = await fetch(`${backendUrl}/v1/whatsapp/bot/request-qr`, {
      method: "POST",
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Backend status ${response.status}`);

    return NextResponse.json(await response.json());
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Gagal request QR baru" },
      { status: 500 },
    );
  }
}
