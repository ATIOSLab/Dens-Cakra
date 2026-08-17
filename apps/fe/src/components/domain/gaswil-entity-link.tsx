"use client";

import Link from "next/link";

import { ArrowUpRight } from "lucide-react";

import { useOptionalRoleWorkspace } from "@/app/(main)/dashboard/_components/sidebar/role-workspace-provider";
import { cn } from "@/lib/utils";
import { SYSTEM_ROLES, type SystemRole } from "@/navigation/sidebar/system-roles";

export type GaswilEntityReference = {
  assignmentId?: string | null;
  userProfileId?: string | null;
  href?: string | null;
};

export function resolveGaswilDetailHref(role: SystemRole | undefined, reference: GaswilEntityReference) {
  if (reference.href) return reference.href;
  if (role === SYSTEM_ROLES.EXECUTIVE && reference.userProfileId) {
    return `/dashboard/daftar-petugas-wilayah/${reference.userProfileId}`;
  }
  if (role === SYSTEM_ROLES.ADMIN_SYSTEM && reference.userProfileId) {
    return `/dashboard/admin-system/pengguna/${reference.userProfileId}`;
  }
  if ((role === SYSTEM_ROLES.FIELD_COORDINATOR || role === SYSTEM_ROLES.REGIONAL_COMMANDER) && reference.assignmentId) {
    return `/dashboard/daftar-petugas-wilayah/${reference.assignmentId}`;
  }
  return null;
}

export function GaswilEntityLink({
  name,
  assignmentId,
  userProfileId,
  href,
  className,
  showIcon = true,
}: GaswilEntityReference & {
  name: string;
  className?: string;
  showIcon?: boolean;
}) {
  const workspace = useOptionalRoleWorkspace();
  const detailHref = resolveGaswilDetailHref(workspace?.activeRole, {
    assignmentId,
    userProfileId,
    href,
  });

  if (!detailHref) return <span className={className}>{name}</span>;

  return (
    <Link
      href={detailHref}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        "group/entity inline-flex max-w-full items-center gap-1 text-amber-700 underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 dark:text-amber-400",
        className,
      )}
      title={`Buka data ${name}`}
    >
      <span className="truncate">{name}</span>
      {showIcon ? (
        <ArrowUpRight className="size-3 shrink-0 opacity-70 transition-transform group-hover/entity:-translate-y-px group-hover/entity:translate-x-px" />
      ) : null}
    </Link>
  );
}
