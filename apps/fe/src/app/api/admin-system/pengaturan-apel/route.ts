import { type NextRequest, NextResponse } from "next/server";

import {
  createApelConfig,
  getApelBroadcastTargets,
  getApelConfigs,
  getApelSessions,
  triggerApelBlast,
} from "@/server/apel-repository";
import { apiRouteErrorResponse } from "@/server/api-route-error";
import { getWhatsappControlChannels } from "@/server/field-ops/repository";

export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") ?? "";
    const [configs, channels, sessionsResult, targets] = await Promise.all([
      getApelConfigs(cookie).catch(() => []),
      getWhatsappControlChannels(cookie).catch(() => []),
      getApelSessions(cookie, { limit: 10 }).catch(() => ({ items: [], total: 0, page: 1, limit: 10, totalPages: 0 })),
      getApelBroadcastTargets(cookie).catch(() => ({ areas: [], gaswils: [], jarings: [] })),
    ]);

    return NextResponse.json({
      configs,
      channels,
      sessions: sessionsResult.items,
      targets,
    });
  } catch (error) {
    return apiRouteErrorResponse(error, "Gagal memuat pengaturan apel.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") ?? "";
    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === "trigger_blast") {
      const { action: _action, ...blastPayload } = body;
      const result = await triggerApelBlast(cookie, blastPayload);
      return NextResponse.json({ success: true, session: result });
    }

    const created = await createApelConfig(cookie, body);
    return NextResponse.json({ success: true, config: created }, { status: 201 });
  } catch (error) {
    return apiRouteErrorResponse(error, "Gagal memproses permintaan pengaturan apel.");
  }
}
