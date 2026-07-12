import { UukCreatePage } from "@/features/uuk-str/pages";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    directiveVersionId?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;

  return <UukCreatePage directiveVersionId={resolvedSearchParams?.directiveVersionId} />;
}
