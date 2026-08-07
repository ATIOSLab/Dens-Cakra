import type { NextRequest } from "next/server";

import { serveAuthenticatedFile } from "@/server/files/serve-file-response";

type RouteContext = {
  params: Promise<{ fileId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { fileId } = await params;
  return serveAuthenticatedFile(request, fileId);
}
