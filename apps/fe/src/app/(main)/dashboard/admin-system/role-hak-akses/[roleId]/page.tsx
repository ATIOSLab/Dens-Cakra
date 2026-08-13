import { notFound } from "next/navigation";

import { parseSystemRole } from "@/navigation/sidebar/system-roles";

import { RoleHakAksesDetailContent } from "../_components/role-access-content";

export default async function DetailRoleHakAksesPage({ params }: { params: Promise<{ roleId: string }> }) {
  const { roleId } = await params;
  const role = parseSystemRole(decodeURIComponent(roleId));

  if (!role) {
    notFound();
  }

  return <RoleHakAksesDetailContent role={role} />;
}
