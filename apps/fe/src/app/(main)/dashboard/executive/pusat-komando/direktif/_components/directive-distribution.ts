import type {
  DirectiveRecipientInput,
  ProvinceBoundaryCollection,
  ProvinceBoundaryFeature,
  ProvinceOption,
  RegionalAssignmentOption,
  RegionalRecipientPreview,
} from "@/features/directives/types";

function uniqBy<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = getKey(item);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function deriveRegionalRecipientPreview(
  selectedProvinceIds: string[],
  provinces: ProvinceOption[],
  regionalAssignments: RegionalAssignmentOption[],
): RegionalRecipientPreview[] {
  const provinceMap = new Map(provinces.map((province) => [province.id, province]));

  return selectedProvinceIds.flatMap((provinceId) => {
    const province = provinceMap.get(provinceId);

    if (!province) {
      return [];
    }

    const recipients = uniqBy(
      regionalAssignments.filter((assignment) =>
        assignment.areaScopes.some((scope) => scope.areaId === provinceId),
      ),
      (assignment) => assignment.positionId,
    );

    return [
      {
        provinceId,
        provinceCode: province.code,
        provinceName: province.name,
        recipients,
      },
    ];
  });
}

export function deriveDirectiveRecipients(preview: RegionalRecipientPreview[]): DirectiveRecipientInput[] {
  return uniqBy(
    preview.flatMap((item) =>
      item.recipients.map((recipient) => ({
        targetPositionId: recipient.positionId,
      })),
    ),
    (recipient) => recipient.targetPositionId ?? "",
  );
}

export function buildProvinceBoundaryCollection(
  boundaries: ProvinceBoundaryCollection,
  provinces: ProvinceOption[],
  preview: RegionalRecipientPreview[],
  selectedProvinceIds: string[],
): ProvinceBoundaryCollection {
  const provinceMap = new Map(provinces.map((province) => [province.id, province]));
  const previewMap = new Map(preview.map((item) => [item.provinceId, item]));
  const selectedProvinceSet = new Set(selectedProvinceIds);

  return {
    type: "FeatureCollection",
    features: boundaries.features.flatMap((feature) => {
      const provinceId = feature.properties?.areaId;

      if (!provinceId) {
        return [];
      }

      const province = provinceMap.get(provinceId);
      const previewEntry = previewMap.get(provinceId);

      const normalizedFeature: ProvinceBoundaryFeature = {
        ...feature,
        properties: {
          ...feature.properties,
          areaId: provinceId,
          code: province?.code ?? feature.properties.code,
          level: province?.level ?? feature.properties.level,
          name: province?.name ?? feature.properties.name,
          selected: selectedProvinceSet.has(provinceId),
          hasRecipient: (previewEntry?.recipients.length ?? 0) > 0,
          recipientCount: previewEntry?.recipients.length ?? 0,
        },
      };

      return [normalizedFeature];
    }),
  };
}
