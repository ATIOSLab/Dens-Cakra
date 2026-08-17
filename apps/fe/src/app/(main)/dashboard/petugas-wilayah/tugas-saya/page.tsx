import { headers } from "next/headers";

import { FieldOfficerOperationsPage } from "@/app/(main)/dashboard/petugas-wilayah/_components/field-officer-operations-page";
import { getFieldOfficerView } from "@/server/field-ops/repository";

export const dynamic = "force-dynamic";

export default async function Page() {
  const cookie = (await headers()).get("cookie") ?? "";
  const initial = await getFieldOfficerView(cookie, "tasks").catch(() => null);
  return <FieldOfficerOperationsPage view="tasks" initialWorkspace={initial?.data ?? null} />;
}
