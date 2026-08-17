import { PetugasWilayahDetailPage } from "../_components/petugas-wilayah-page";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ assignmentId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { assignmentId } = await params;
  return <PetugasWilayahDetailPage assignmentId={assignmentId} />;
}
