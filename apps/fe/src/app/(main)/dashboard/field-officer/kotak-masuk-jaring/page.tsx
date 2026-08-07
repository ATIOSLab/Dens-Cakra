import { headers } from "next/headers";

import { FieldOfficerOperationsPage } from "@/app/(main)/dashboard/field-officer/_components/field-officer-operations-page";
import { getFieldOfficerView } from "@/server/field-ops/repository";

export default async function Page() {
  const cookie = (await headers()).get("cookie") ?? "";
  const initial = await getFieldOfficerView(cookie, "incoming").catch(() => null);
  return <FieldOfficerOperationsPage view="incoming" initialWorkspace={initial?.data ?? null} />;
}
