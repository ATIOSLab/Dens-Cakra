import type { ProvinceBoundaryCollection } from "@/features/directives/types";
import { ApiClientError } from "@/lib/api/errors";
import { apiServerGet } from "@/lib/api/server-client";
import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import { OrganisasiWilayahClient } from "./organisasi-wilayah-client";
import { OrganisasiWilayahCreateClient } from "./organisasi-wilayah-create-client";
import type { RegionalMasterOverview } from "./organisasi-wilayah-types";

function createEmptyProvinceBoundaryCollection(): ProvinceBoundaryCollection {
  return {
    type: "FeatureCollection",
    features: [],
  };
}

async function safeOptionalServerGet<T>(path: string, query: Record<string, string | number | boolean>) {
  try {
    return await apiServerGet<T>(path, query);
  } catch (error) {
    if (error instanceof ApiClientError && [403, 404].includes(error.status)) {
      return null;
    }

    throw error;
  }
}

async function loadRegionalMasterOverview() {
  return apiServerGet<RegionalMasterOverview>("/organization-units/regional-masters");
}

export async function OrganisasiWilayahPage() {
  await requireRole(SYSTEM_ROLES.ADMIN_SYSTEM);

  const [overview, provinceBoundaries] = await Promise.all([
    loadRegionalMasterOverview(),
    safeOptionalServerGet<ProvinceBoundaryCollection>("/administrative-areas/boundaries", {
      bbox: "93,-12,143,9",
      level: "PROVINCE",
      zoom: 4,
      limit: 200,
    }),
  ]);

  return (
    <OrganisasiWilayahClient
      initialOverview={overview}
      provinceBoundaries={provinceBoundaries ?? createEmptyProvinceBoundaryCollection()}
    />
  );
}

export async function OrganisasiWilayahCreatePage({
  masterType,
  selectedProvinceAreaId,
}: {
  masterType: "binda" | "directorate";
  selectedProvinceAreaId?: string;
}) {
  await requireRole(SYSTEM_ROLES.ADMIN_SYSTEM);

  const overview = await loadRegionalMasterOverview();

  return (
    <OrganisasiWilayahCreateClient
      overview={overview}
      masterType={masterType}
      selectedProvinceAreaId={selectedProvinceAreaId}
    />
  );
}
