import { PenggunaListPage } from "./_components/pengguna-pages";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: PageProps) {
  return <PenggunaListPage searchParams={searchParams} />;
}
