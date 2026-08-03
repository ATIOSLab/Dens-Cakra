import { PersonelLapanganDetailPage } from "../_components/personel-lapangan-page";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ assignmentId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { assignmentId } = await params;
  return <PersonelLapanganDetailPage assignmentId={assignmentId} />;
}
