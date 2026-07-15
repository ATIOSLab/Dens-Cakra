import { JabatanReportingLinePage } from "../../_components/jabatan-pages";

export default async function Page({
  params,
}: {
  params: Promise<{ positionId: string }>;
}) {
  const { positionId } = await params;
  return <JabatanReportingLinePage positionId={positionId} />;
}
