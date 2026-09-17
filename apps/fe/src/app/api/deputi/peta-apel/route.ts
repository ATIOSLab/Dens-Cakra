import { type NextRequest, NextResponse } from "next/server";

import { apiRouteErrorResponse } from "@/server/api-route-error";
import { getApelMapData, getApelSessions } from "@/server/apel-repository";

export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") ?? "";
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId") ?? undefined;
    const date = searchParams.get("date") ?? undefined;
    const areaId = searchParams.get("areaId") ?? undefined;

    const [mapData, sessionsResult] = await Promise.all([
      getApelMapData(cookie, { sessionId, date, areaId }).catch((err) => {
        console.warn("[api/deputi/peta-apel] getApelMapData error, fallback to empty data:", err?.message || err);
        return {
          session: null,
          kpi: {
            totalTarget: 0,
            totalHadir: 0,
            totalBelum: 0,
            persentaseHadir: 0,
            isDeadlinePassed: true,
            remainingMinutes: 0,
            nearDeadlineCount: 0,
            totalSent: 0,
            totalFailed: 0,
            totalPendingDelivery: 0,
            deliveryPercentage: 0,
            totalVerifiedJarings: 0,
          },
          attendances: [],
        };
      }),
      getApelSessions(cookie, { limit: 15 }).catch(() => ({ items: [], total: 0, page: 1, limit: 15, totalPages: 0 })),
    ]);

    return NextResponse.json({
      ...mapData,
      availableSessions: sessionsResult.items,
    });
  } catch (error) {
    console.error("[api/deputi/peta-apel] Error loading map data:", error);
    return apiRouteErrorResponse(error, "Gagal memuat data peta apel jaring.");
  }
}
