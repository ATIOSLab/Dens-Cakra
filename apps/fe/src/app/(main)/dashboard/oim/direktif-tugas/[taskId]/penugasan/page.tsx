import { OimTaskAssignmentPage } from "@/app/(main)/dashboard/_components/tasks/task-pages";

export const dynamic = "force-dynamic";

type PageProps = {
  params?: Promise<Record<string, string>>;
};

export default async function Page({ params }: PageProps) {
  const routeParams = (await params) ?? {};
  return <OimTaskAssignmentPage taskId={routeParams.taskId} />;
}
