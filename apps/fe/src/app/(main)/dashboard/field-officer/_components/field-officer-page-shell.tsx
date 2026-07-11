import { getSessionPrincipal } from "@/lib/auth/server-session";
import { resolveFieldOfficerIdFromEmail } from "@/server/field-officer/repository";

import { FieldOfficerWorkspace, type WorkTab } from "./field-officer-workspace";

export async function FieldOfficerPageShell({ initialTab }: { initialTab: WorkTab }) {
  const principal = await getSessionPrincipal();
  const fieldOfficerId = resolveFieldOfficerIdFromEmail(principal?.user.email);

  return <FieldOfficerWorkspace fieldOfficerId={fieldOfficerId} initialTab={initialTab} />;
}
