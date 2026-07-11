import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const backendUrl = (process.env.BACKEND_INTERNAL_URL || "http://localhost:3001").replace(/\/$/, "");

export async function GET() {
  try {
    const response = await fetch(`${backendUrl}/v1/field-officer/live-locations`, {
      cache: "no-store",
    });

    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ message: "Backend live location belum tersedia" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const response = await fetch(`${backendUrl}/v1/field-officer/live-locations`, {
      method: "POST",
      body: await request.text(),
      headers: {
        "Content-Type": request.headers.get("Content-Type") || "application/json",
      },
    });

    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ message: "Backend live location belum tersedia" }, { status: 503 });
  }
}
