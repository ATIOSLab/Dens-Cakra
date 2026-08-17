import { redirect } from "next/navigation";

import { SYSTEM_ROLE_HOME_ROUTES, SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

export const dynamic = "force-dynamic";

export default function Page() {
  redirect(SYSTEM_ROLE_HOME_ROUTES[SYSTEM_ROLES.EXECUTIVE]);
}
