import React from "react";

import { type NextRequest, NextResponse } from "next/server";

import { renderToBuffer } from "@react-pdf/renderer";

import { type ReportPayload, validateReport } from "@/app/(print)/reports/jaring/_components/report-types";
import { JaringReportPdfDocument } from "@/app/(print)/reports/jaring/_pdf/jaring-pdf-document";
import { apiServerFetch } from "@/lib/api/server-client";
import { getSessionPrincipal } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const principal = await getSessionPrincipal();

  // Strict RBAC: only admin_system (Superadmin) can generate or download this report
  if (principal?.role !== "admin_system") {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Akses laporan rekap Jaring hanya diizinkan untuk Admin Sistem.",
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

  try {
    // Generate 13-page PDF directly in memory using @react-pdf/renderer
    const pdfBuffer = await renderToBuffer(
      React.createElement(JaringReportPdfDocument, { data: reportData }) as unknown as React.ReactElement<
        import("@react-pdf/renderer").DocumentProps
      >,
    );
    const filename = `Laporan Rekap Aktivitas Produktivitas Jaring ${reportData.metadata.periodLabel}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
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
  }
}
