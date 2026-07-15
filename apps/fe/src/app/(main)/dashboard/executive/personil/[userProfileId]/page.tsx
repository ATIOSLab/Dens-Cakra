import { ExecutivePersonnelDetailPage } from "../_components/executive-personnel-pages";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ userProfileId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { userProfileId } = await params;
  return <ExecutivePersonnelDetailPage userProfileId={userProfileId} />;
}
