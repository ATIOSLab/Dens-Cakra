import { NextResponse } from "next/server";

const backendUrl = (process.env.BACKEND_INTERNAL_URL || "http://localhost:3001").replace(/\/$/, "");

export async function GET() {
  try {
    const response = await fetch(`${backendUrl}/v1/whatsapp/bot/status`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Backend status ${response.status}`);

    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json({
      status: "DISCONNECTED",
      qr: null,
      qrDataUrl: null,
    });
  }
}
