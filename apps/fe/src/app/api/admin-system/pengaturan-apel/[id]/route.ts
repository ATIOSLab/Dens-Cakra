import { type NextRequest, NextResponse } from "next/server";

import { deleteApelConfig, updateApelConfig } from "@/server/apel-repository";
import { apiRouteErrorResponse } from "@/server/api-route-error";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cookie = request.headers.get("cookie") ?? "";
    const body = (await request.json()) as Record<string, unknown>;

    const updated = await updateApelConfig(cookie, id, body);
    return NextResponse.json({ success: true, config: updated });
  } catch (error) {
    return apiRouteErrorResponse(error, "Gagal memperbarui konfigurasi apel.");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cookie = request.headers.get("cookie") ?? "";

    await deleteApelConfig(cookie, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiRouteErrorResponse(error, "Gagal menghapus konfigurasi apel.");
  }
}
