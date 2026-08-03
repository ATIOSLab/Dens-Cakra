"use client";

import * as React from "react";
import { LaporanPembinaanDetailClient } from "./_components/laporan-pembinaan-detail-client";

type PageProps = {
  params: Promise<{
    jaringId: string;
    reportId: string;
  }>;
};

export default function LaporanPembinaanDetailPage({ params }: PageProps) {
  const { jaringId, reportId } = React.use(params);

  return <LaporanPembinaanDetailClient jaringId={jaringId} reportId={reportId} />;
}
