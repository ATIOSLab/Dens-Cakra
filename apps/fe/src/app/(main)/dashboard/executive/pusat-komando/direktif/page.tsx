import { DirectiveListPage } from "./_components/directive-pages";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: PageProps) {
  const query = (await searchParams) ?? {};
  return (
    <DirectiveListPage
      sortBy={typeof query.sortBy === "string" ? query.sortBy : undefined}
      sortOrder={typeof query.sortOrder === "string" ? query.sortOrder : undefined}
    />
  );
}
