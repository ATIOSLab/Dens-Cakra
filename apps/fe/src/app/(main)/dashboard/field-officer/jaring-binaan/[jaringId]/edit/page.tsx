import { JaringRegistrationForm } from "../../_components/jaring-registration-form";

type PageProps = {
  params: Promise<{ jaringId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { jaringId } = await params;

  return <JaringRegistrationForm jaringId={jaringId} />;
}
