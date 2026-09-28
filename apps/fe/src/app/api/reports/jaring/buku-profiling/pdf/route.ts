import React from "react";

import { type NextRequest, NextResponse } from "next/server";

import { renderToBuffer } from "@react-pdf/renderer";
import sharp from "sharp";

import { getJaringReportData } from "@/features/reports/jaring/api/get-jaring-report";
import { JaringReportDocument } from "@/features/reports/jaring/pdf/jaring-report-document";
import type { FormattedJaring, JaringReportData } from "@/features/reports/jaring/types/jaring-report.types";
import { getBackendInternalUrl } from "@/lib/auth/backend-url";
import { backendApi } from "@/server/backend-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AccessUrlResponse = {
  url: string;
};

async function resolvePhotosInBatch(items: FormattedJaring[], cookieHeader: string | null): Promise<void> {
  const photoMap = new Map<string, string>();
  const uniqueFileIds = Array.from(
    new Set(
      items
        .filter((i) => !i.profilePhotoBase64 && Boolean(i.profilePhotoFileId))
        .map((i) => i.profilePhotoFileId as string),
    ),
  );

  if (uniqueFileIds.length === 0) {
    return;
  }

  const backendBaseUrl = getBackendInternalUrl();

  // Concurrency-limited photo downloader (max 10 simultaneous fetches)
  const batchSize = 10;
  for (let i = 0; i < uniqueFileIds.length; i += batchSize) {
    const chunk = uniqueFileIds.slice(i, i + batchSize);
    await Promise.all(
      chunk.map(async (fileId) => {
        try {
          const res = await backendApi<AccessUrlResponse>(`/files/${fileId}/access-url`, {
            cookie: cookieHeader,
            query: { ttlSeconds: 300, disposition: "inline" },
          });

          if (res?.url) {
            const fullUrl = res.url.startsWith("http") ? res.url : `${backendBaseUrl}${res.url}`;
            const imgRes = await fetch(fullUrl);
            if (imgRes.ok) {
              const arrayBuf = await imgRes.arrayBuffer();
              const rawBuf = Buffer.from(arrayBuf);
              // Resize to standard avatar dimensions to keep PDF buffer memory efficient
              const resized = await sharp(rawBuf).resize(160, 160, { fit: "cover" }).jpeg({ quality: 80 }).toBuffer();

              const dataUri = `data:image/jpeg;base64,${resized.toString("base64")}`;
              photoMap.set(fileId, dataUri);
            }
          }
        } catch {
          // Gracefully continue if photo cannot be fetched or converted
        }
      }),
    );
  }

  // Populate base64 data URIs into items
  for (const item of items) {
    if (!item.profilePhotoBase64 && item.profilePhotoFileId && photoMap.has(item.profilePhotoFileId)) {
      item.profilePhotoBase64 = photoMap.get(item.profilePhotoFileId);
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Feature flag / rollback mechanism support
  const renderer = searchParams.get("renderer") || process.env.PDF_RENDERER || "react-pdf";

  const query = {
    title: searchParams.get("title") || undefined,
    includeCover: searchParams.get("includeCover") !== "false",
    includeMap: searchParams.get("includeMap") !== "false",
    includeToc: searchParams.get("includeToc") !== "false",
    includeRecap: searchParams.get("includeRecap") !== "false",
    includeInfographic: searchParams.get("includeInfographic") !== "false",
    areaId: searchParams.get("areaId") || undefined,
    jaringIds: searchParams.get("jaringIds") || undefined,
    status: (searchParams.get("status") as "ACTIVE" | "INACTIVE") || undefined,
    search: searchParams.get("search") || undefined,
    fieldOfficerAssignmentId: searchParams.get("fieldOfficerAssignmentId") || undefined,
    registrationStatus: searchParams.get("registrationStatus") || "APPROVED",
  };

  const cookieHeader = request.headers.get("cookie");

  // Fallback to legacy PDFKit if explicitly requested
  if (renderer === "legacy") {
    try {
      const backendQuery: Record<string, string> = {};
      for (const [key, value] of searchParams.entries()) {
        if (key !== "renderer") {
          backendQuery[key] = value;
        }
      }

      const legacyStream = await backendApi<Response>("/jaring/export/pdf", {
        cookie: cookieHeader,
        query: backendQuery,
      });

      return legacyStream;
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "LEGACY_EXPORT_FAILED",
            message: "Gagal mengekspor laporan dengan renderer PDFKit legacy.",
            detail: error instanceof Error ? error.message : String(error),
          },
        },
        { status: 502 },
      );
    }
  }

  // Next.js + React PDF Pipeline
  let reportData: JaringReportData;
  try {
    reportData = await getJaringReportData(query);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BACKEND_REPORT_FETCH_FAILED",
          message: "Gagal mengambil data laporan dari server backend.",
          detail: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 502 },
    );
  }

  // Resolve avatars/photos in items before rendering
  try {
    await resolvePhotosInBatch(reportData.items, cookieHeader);
    for (const prov of reportData.groups) {
      for (const city of prov.cities) {
        for (const item of city.items) {
          if (!item.profilePhotoBase64) {
            const matched = reportData.items.find((i) => i.id === item.id);
            if (matched?.profilePhotoBase64) {
              item.profilePhotoBase64 = matched.profilePhotoBase64;
            }
          }
        }
      }
    }
  } catch {
    // Photos are optional, proceed even if resolution has issues
  }

  try {
    const pdfBuffer = await renderToBuffer(
      React.createElement(JaringReportDocument, {
        data: reportData,
      }) as unknown as React.ReactElement<import("@react-pdf/renderer").DocumentProps>,
    );

    const safeTitle = (reportData.meta.title || "buku-profiling-jaring").toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${safeTitle}-${dateStr}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
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
          message: "Gagal me-render dokumen PDF menggunakan React PDF.",
          detail: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 500 },
    );
  }
}
