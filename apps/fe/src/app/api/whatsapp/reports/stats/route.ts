import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const backendUrl = (process.env.BACKEND_INTERNAL_URL || "http://localhost:3001").replace(/\/$/, "");

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${backendUrl}/v1/whatsapp/reports/stats`, {
      cache: "no-store",
      headers: {
        cookie: request.headers.get("cookie") || "",
        "x-field-officer-id": request.headers.get("x-field-officer-id") || "",
      },
    });

    if (!response.ok) return NextResponse.json({ totalReports: 0, totalUsers: 0, todayReports: 0 });

    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json({ totalReports: 0, totalUsers: 0, todayReports: 0 });
  }
}
