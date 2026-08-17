import { DirectiveDetailPage } from "../_components/directive-pages";

export const dynamic = "force-dynamic";

type PageProps = {
  params?: Promise<Record<string, string>>;
};

export default async function Page({ params }: PageProps) {
  const routeParams = (await params) ?? {};
  return <DirectiveDetailPage directiveId={routeParams.directiveId} />;
}
