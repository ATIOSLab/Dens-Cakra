import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const backendUrl = (process.env.BACKEND_INTERNAL_URL || "http://localhost:3001").replace(/\/$/, "");

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${backendUrl}/v1/whatsapp/reports`, {
      cache: "no-store",
      headers: {
        cookie: request.headers.get("cookie") || "",
        "x-field-officer-id": request.headers.get("x-field-officer-id") || "",
      },
    });

    if (!response.ok) return NextResponse.json([]);

    return NextResponse.json(await response.json());
  } catch (error) {
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const response = await fetch(`${backendUrl}/v1/whatsapp/reports`, {
      method: "POST",
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
