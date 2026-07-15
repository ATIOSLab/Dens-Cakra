import { ExecutivePersonnelPage } from "./_components/executive-personnel-pages";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: PageProps) {
  return <ExecutivePersonnelPage searchParams={searchParams} />;
}
