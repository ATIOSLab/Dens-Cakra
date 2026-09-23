import type { ReportPayload } from "@/app/(print)/reports/jaring/_components/report-types";

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function getCacheFilePath(token: string): string {
  const safeToken = token.replace(/[^a-zA-Z0-9-]/g, "");
  return path.join(os.tmpdir(), `dens_cakra_report_${safeToken}.json`);
}

export function storeReportPayloadForPrint(data: ReportPayload): string {
  const token = crypto.randomUUID();
  const filePath = getCacheFilePath(token);
  fs.writeFileSync(filePath, JSON.stringify(data), "utf8");
  return token;
}

export function getCachedReportPayload(token: string | null | undefined): ReportPayload | null {
  if (!token) return null;
  const filePath = getCacheFilePath(token);
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content) as ReportPayload;
  } catch {
    return null;
  }
}

export function removeCachedReportPayload(token: string | null | undefined): void {
  if (!token) return;
  const filePath = getCacheFilePath(token);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // Ignore cleanup error
  }
}
