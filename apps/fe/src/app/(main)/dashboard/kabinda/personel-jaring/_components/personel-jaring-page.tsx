import { apiServerGet } from "@/lib/api/server-client";
import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import { PersonelJaringClient } from "./personel-jaring-client";

export async function PersonelJaringPage() {
  await requireRole(SYSTEM_ROLES.REGIONAL_COMMANDER);
  const [network, locations] = await Promise.all([
    apiServerGet("/command-network"),
    apiServerGet("/personnel-location-map"),
  ]);

  return <PersonelJaringClient network={network} locations={locations} />;
}
