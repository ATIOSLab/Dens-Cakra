import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params?: Promise<Record<string, string>>;
};

export default async function Page({ params }: PageProps) {
  const routeParams = (await params) ?? {};
  redirect(`/dashboard/anev/direktif-tugas/${routeParams.taskId}`);
}
