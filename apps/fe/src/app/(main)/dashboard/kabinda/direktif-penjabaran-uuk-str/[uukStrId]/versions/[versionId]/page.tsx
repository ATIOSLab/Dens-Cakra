import { UukVersionPage } from "../../../_components/uuk-pages";

export const dynamic = "force-dynamic";

type PageProps = {
  params?: Promise<Record<string, string>>;
};

export default async function Page({ params }: PageProps) {
  const routeParams = (await params) ?? {};
  return <UukVersionPage uukStrId={routeParams.uukStrId} versionId={routeParams.versionId} />;
}
