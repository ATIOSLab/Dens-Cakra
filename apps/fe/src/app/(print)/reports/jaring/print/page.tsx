import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { apiServerFetch } from "@/lib/api/server-client";
import { getCachedReportPayload } from "@/lib/auth/internal-print-token";
import { getSessionPrincipal } from "@/lib/auth/server-session";

import { ReportDocument } from "../_components/report-document";
import { type ReportPayload, validateReport } from "../_components/report-types";
import { ReportActionBar } from "./report-action-bar";
import "./report-print.css";

export const metadata: Metadata = {
  title: "Laporan Rekap Aktivitas dan Produktivitas Jaring",
  robots: {
    index: false,
    follow: false,
  },
};

type PrintPageProps = {
  searchParams: Promise<{
    start?: string;
    startDate?: string;
    end?: string;
    endDate?: string;
    period?: string;
    provinceCode?: string;
    token?: string;
  }>;
};

export default async function JaringReportPrintPage({ searchParams }: PrintPageProps) {
  const params = await searchParams;
  const token = params.token;
  const cachedData = getCachedReportPayload(token);

  let reportData: ReportPayload;
  let start = params.start ?? params.startDate ?? "2026-09-01";
  let end = params.end ?? params.endDate ?? "2026-09-23";

  if (cachedData) {
    reportData = cachedData;
    start = cachedData.metadata.periodStart;
    end = cachedData.metadata.periodEnd;
  } else {
    const principal = await getSessionPrincipal();
    // Strict RBAC: only admin_system (Superadmin) may access this report
    if (principal?.role !== "admin_system") {
      redirect("/unauthorized");
    }

    const period = params.period;
    const provinceCode = params.provinceCode ?? "31";

    const query: Record<string, string> = {
      start,
      end,
      provinceCode,
    };
    if (period) {
      query.period = period;
    }

    try {
      reportData = await apiServerFetch<ReportPayload>("/jaring/rekap-jangkauan", { query });
    } catch (error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 p-6 text-center text-white">
          <div className="max-w-md rounded-xl border border-red-500/40 bg-slate-800 p-6 shadow-xl">
            <h1 className="mb-2 font-bold text-lg text-red-400">Gagal Memuat Data Laporan</h1>
            <p className="mb-4 text-slate-300 text-sm">
              Tidak dapat mengambil data rekap jangkauan Jaring dari server backend.
            </p>
            <p className="mb-4 rounded bg-red-950/50 p-2 font-mono text-red-300 text-xs">
              {error instanceof Error ? error.message : "Kesalahan tidak dikenal."}
            </p>
            <a
              href="/dashboard/admin-system"
              className="inline-block rounded bg-slate-700 px-4 py-2 font-semibold text-white text-xs hover:bg-slate-600"
            >
              Kembali ke Dashboard Admin Sistem
            </a>
          </div>
        </div>
      );
    }
  }

  const validation = validateReport(reportData);

  return (
    <div className="report-container min-h-screen bg-slate-800 text-slate-900 print:min-h-0 print:bg-white">
      <ReportActionBar
        periodLabel={reportData.metadata.periodLabel}
        start={start}
        end={end}
        period={params.period}
        provinceCode={params.provinceCode ?? "31"}
        isValid={validation.valid}
      />

      <div className="flex flex-col items-center gap-8 py-8 print:block print:p-0">
        <div className="bg-white shadow-2xl print:block print:shadow-none">
          <ReportDocument data={reportData} />
        </div>
      </div>
    </div>
  );
}
