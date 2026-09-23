import { type NextRequest, NextResponse } from "next/server";

import { type ReportPayload, validateReport } from "@/app/(print)/reports/jaring/_components/report-types";
import { apiServerFetch } from "@/lib/api/server-client";
import { storeReportPayloadForPrint } from "@/lib/auth/internal-print-token";
import { getSessionPrincipal } from "@/lib/auth/server-session";

import { execFile, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const dynamic = "force-dynamic";

function findBrowserBinary(): string | null {
  const candidates = [
    process.env.CHROME_BIN,
    process.env.EDGE_BIN,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
    "/opt/google/chrome/chrome",
    "/usr/local/bin/chrome",
    "/usr/local/bin/chromium",
  ].filter(Boolean) as string[];

  for (const bin of candidates) {
    if (fs.existsSync(bin)) return bin;
  }

  // Also check which/command in PATH if running on Linux
  if (process.platform === "linux") {
    for (const name of ["google-chrome-stable", "google-chrome", "chromium", "chromium-browser", "chrome"]) {
      try {
        const out = execFileSync("which", [name], { encoding: "utf8" }).trim();
        if (out && fs.existsSync(out)) return out;
      } catch {
        // Continue
      }
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const principal = await getSessionPrincipal();

  // Strict RBAC: only executive (Deputi II) can generate or download this report
  if (principal?.role !== "executive") {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Akses laporan rekap Jaring hanya diizinkan untuk Deputi II.",
        },
      },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start") ?? searchParams.get("startDate") ?? "2026-09-01";
  const end = searchParams.get("end") ?? searchParams.get("endDate") ?? "2026-09-23";
  const period = searchParams.get("period");
  const provinceCode = searchParams.get("provinceCode") ?? "31";

  const query: Record<string, string> = {
    start,
    end,
    provinceCode,
  };
  if (period) {
    query.period = period;
  }

  let reportData: ReportPayload;
  try {
    reportData = await apiServerFetch<ReportPayload>("/jaring/rekap-jangkauan", { query });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BACKEND_FETCH_FAILED",
          message: "Gagal mengambil data rekap jangkauan Jaring dari server backend.",
          detail: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 502 },
    );
  }

  const validation = validateReport(reportData);
  if (!validation.valid) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DATA_VALIDATION_FAILED",
          message: "Data rekap jangkauan tidak lolos validasi integritas.",
          errors: validation.errors,
        },
      },
      { status: 422 },
    );
  }

  const browserBin = findBrowserBinary();
  if (!browserBin) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BROWSER_NOT_FOUND",
          message: "Mesin perender PDF (Chromium/Edge) tidak ditemukan di sistem host.",
        },
      },
      { status: 500 },
    );
  }

  // Store payload in cache for the headless browser request
  const token = storeReportPayloadForPrint(reportData);
  const printUrl = new URL(`/reports/jaring/print?token=${encodeURIComponent(token)}`, request.url).toString();

  const tmpId = `rekap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const tmpPdfPath = path.join(os.tmpdir(), `${tmpId}.pdf`);

  try {
    // Execute Chromium / Edge CLI to render exact 13 A4 pages PDF
    await execFileAsync(browserBin, [
      "--headless=new",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-pdf-header-footer",
      "--run-all-compositor-stages-before-draw",
      "--virtual-time-budget=6000",
      `--print-to-pdf=${tmpPdfPath}`,
      printUrl,
    ]);

    if (!fs.existsSync(tmpPdfPath)) {
      throw new Error("Berkas PDF tidak berhasil dibuat oleh perender Chromium.");
    }

    const pdfBuffer = fs.readFileSync(tmpPdfPath);
    const filename = `Laporan Rekap Aktivitas Produktivitas Jaring ${reportData.metadata.periodLabel}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PDF_RENDER_FAILED",
          message: "Gagal merender PDF dari template laporan.",
          detail: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 500 },
    );
  } finally {
    try {
      if (fs.existsSync(tmpPdfPath)) fs.unlinkSync(tmpPdfPath);
    } catch {
      // Ignore cleanup error
    }
  }
}
