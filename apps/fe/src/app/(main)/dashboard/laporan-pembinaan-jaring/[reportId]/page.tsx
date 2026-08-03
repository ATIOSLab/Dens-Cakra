import { requireSession } from "@/lib/auth/server-session";

import { LaporanPembinaanDetailCoordinatorClient } from "../_components/laporan-pembinaan-detail-coordinator-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    reportId: string;
  }>;
};

export default async function LaporanPembinaanDetailPage({ params }: PageProps) {
  await requireSession();
  const { reportId } = await params;

  return <LaporanPembinaanDetailCoordinatorClient reportId={reportId} />;
}
