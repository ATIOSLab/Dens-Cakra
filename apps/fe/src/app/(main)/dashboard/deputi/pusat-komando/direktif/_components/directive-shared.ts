import type {
  DirectiveDetail,
  DirectiveSummary,
  OrganizationUnitOption,
  PositionOption,
  ProvinceOption,
} from "@/features/directives/types";

export function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function badgeVariant(status: string) {
  if (["CANCELLED", "FAILED"].includes(status)) {
    return "destructive" as const;
  }

  if (["PUBLISHED", "DISTRIBUTED", "COMPLETED", "ACKNOWLEDGED"].includes(status)) {
    return "default" as const;
  }

  return "outline" as const;
}

export function getCurrentVersion(directive: DirectiveDetail | DirectiveSummary) {
  return (
    directive.versions.find((item) => item.versionNumber === directive.currentVersionNumber) ?? directive.versions[0]
  );
}

export function normalizeProvinceSelection(selectedProvinceIds: string[], provinces: ProvinceOption[]) {
  const provinceIdByKey = new Map<string, string>();

  for (const province of provinces) {
    provinceIdByKey.set(province.id, province.id);
    provinceIdByKey.set(province.code, province.id);
  }

  return Array.from(
    new Set(
      selectedProvinceIds.flatMap((value) => {
        const normalizedId = provinceIdByKey.get(value);
        return normalizedId ? [normalizedId] : [];
      }),
    ),
  );
}

export function renderRecipientLabel(recipient: {
  targetPosition?: PositionOption | null;
  targetUnit?: OrganizationUnitOption | null;
}) {
  return recipient.targetPosition?.title ?? recipient.targetUnit?.name ?? "Target tidak diketahui";
}
