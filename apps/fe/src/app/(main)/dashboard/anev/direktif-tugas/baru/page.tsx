import { OimTaskCreatePage } from "@/app/(main)/dashboard/_components/tasks/task-pages";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const rawUukStrId = params.uukStrId;
  const uukStrId = Array.isArray(rawUukStrId) ? rawUukStrId[0] : rawUukStrId;

  return <OimTaskCreatePage uukStrId={uukStrId} />;
}
