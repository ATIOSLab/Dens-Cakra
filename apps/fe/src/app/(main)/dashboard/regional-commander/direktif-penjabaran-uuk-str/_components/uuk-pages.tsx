import { redirect } from "next/navigation";

import type { UukDetail, UukDirectiveOption, UukSummary } from "@/features/uuk-str/types";
import { apiServerGet } from "@/lib/api/server-client";
import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import { UukDetailClient, UukEditorClient, UukListClient } from "./uuk-clients";

async function loadDirectiveOptions() {
  return apiServerGet<UukDirectiveOption[]>("/directives", {
    assignedToMe: true,
    limit: 50,
  });
}

export async function UukListPage() {
  await requireRole(SYSTEM_ROLES.REGIONAL_COMMANDER);
  const [directives, uuks] = await Promise.all([
    loadDirectiveOptions(),
    apiServerGet<UukSummary[]>("/uuk-strs", { limit: 50 }),
  ]);

  return <UukListClient directives={directives} uuks={uuks} />;
}

export async function UukCreatePage({ directiveVersionId }: { directiveVersionId?: string }) {
  await requireRole(SYSTEM_ROLES.REGIONAL_COMMANDER);
  const [access, directives] = await Promise.all([
    apiServerGet<{ authorizationContext: { organizationUnitId: string } }>("/access/me"),
    loadDirectiveOptions(),
  ]);

  return (
    <UukEditorClient
      ownerUnitId={access.authorizationContext.organizationUnitId}
      directives={directives}
      initialDirectiveVersionId={directiveVersionId}
    />
  );
}

export async function UukDetailPage({ uukStrId }: { uukStrId: string }) {
  await requireRole(SYSTEM_ROLES.REGIONAL_COMMANDER);
  const uuk = await apiServerGet<UukDetail>(`/uuk-strs/${uukStrId}`);

  return <UukDetailClient uuk={uuk} />;
}

export async function UukEditPage({ uukStrId }: { uukStrId: string }) {
  await requireRole(SYSTEM_ROLES.REGIONAL_COMMANDER);
  redirect(`/dashboard/regional-commander/direktif-penjabaran-uuk-str/${uukStrId}`);
  return null;
}

export async function UukVersionPage({ uukStrId, versionId }: { uukStrId: string; versionId: string }) {
  await requireRole(SYSTEM_ROLES.REGIONAL_COMMANDER);
  const [uuk, version] = await Promise.all([
    apiServerGet<UukDetail>(`/uuk-strs/${uukStrId}`),
    apiServerGet(`/uuk-str-versions/${versionId}`),
  ]);

  const versionedUuk: UukDetail = {
    ...uuk,
    versions: uuk.versions.map((item) => (item.id === versionId ? (version as UukDetail["versions"][number]) : item)),
  };

  return <UukDetailClient uuk={versionedUuk} />;
}
