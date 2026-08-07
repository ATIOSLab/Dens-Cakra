export type JaringIdentityArea = {
  id?: string;
  name?: string | null;
  level?: string | null;
  parent?: JaringIdentityArea | null;
};

export type JaringIdentitySource = {
  id?: string | null;
  fullName?: string | null;
  name?: string | null;
  aliasName?: string | null;
  code?: string | null;
  whatsappNumber?: string | null;
  jaringFullName?: string | null;
  jaringName?: string | null;
  jaringAlias?: string | null;
  jaringCode?: string | null;
  jaringWhatsAppNumber?: string | null;
  avatarUrl?: string | null;
  profilePhotoUrl?: string | null;
  profilePhotoFileId?: string | null;
  jaringProfilePhotoFileId?: string | null;
  gaswilName?: string | null;
  fieldOfficerName?: string | null;
  gaswilAssignmentId?: string | null;
  fieldOfficerAssignmentId?: string | null;
  gaswilUserProfileId?: string | null;
  fieldOfficerUserProfileId?: string | null;
  gaswilHref?: string | null;
  placementArea?: JaringIdentityArea | null;
  assignedArea?: JaringIdentityArea | null;
  villageName?: string | null;
  districtName?: string | null;
  cityName?: string | null;
  provinceName?: string | null;
};

export type JaringIdentity = {
  name: string;
  whatsappNumber: string;
  code: string;
  gaswilName: string;
  gaswilAssignmentId: string | null;
  gaswilUserProfileId: string | null;
  gaswilHref: string | null;
  placementArea: string;
  avatarUrl: string | null;
};

const EMPTY_VALUE = "Belum tersedia";
const UNASSIGNED_VALUE = "Belum ditetapkan";

function firstValue(...values: Array<string | null | undefined>) {
  return values.find((value) => value?.trim())?.trim();
}

export function formatJaringArea(area?: JaringIdentityArea | null) {
  if (!area?.name) return null;
  const names: string[] = [];
  const seen = new Set<string>();
  let current: JaringIdentityArea | null | undefined = area;

  while (current?.name) {
    const normalized = current.name.trim();
    const key = `${current.id ?? ""}:${normalized.toLocaleLowerCase("id-ID")}`;
    if (normalized && !seen.has(key)) {
      names.push(normalized);
      seen.add(key);
    }
    current = current.parent;
  }

  return names.join(", ") || null;
}

export function resolveJaringIdentity(source: JaringIdentitySource): JaringIdentity {
  const placementFromNames = [source.villageName, source.districtName, source.cityName, source.provinceName]
    .filter((value): value is string => Boolean(value && value !== "-"))
    .join(", ");

  const profilePhotoFileId = firstValue(source.profilePhotoFileId, source.jaringProfilePhotoFileId);

  return {
    name:
      firstValue(source.fullName, source.jaringFullName, source.jaringName, source.name, source.aliasName) ??
      EMPTY_VALUE,
    whatsappNumber: firstValue(source.whatsappNumber, source.jaringWhatsAppNumber) ?? EMPTY_VALUE,
    code: firstValue(source.aliasName, source.jaringAlias, source.jaringCode, source.code, source.id) ?? EMPTY_VALUE,
    gaswilName: firstValue(source.gaswilName, source.fieldOfficerName) ?? UNASSIGNED_VALUE,
    gaswilAssignmentId: firstValue(source.gaswilAssignmentId, source.fieldOfficerAssignmentId) ?? null,
    gaswilUserProfileId: firstValue(source.gaswilUserProfileId, source.fieldOfficerUserProfileId) ?? null,
    gaswilHref: firstValue(source.gaswilHref) ?? null,
    placementArea:
      firstValue(formatJaringArea(source.placementArea ?? source.assignedArea), placementFromNames) ?? UNASSIGNED_VALUE,
    avatarUrl:
      firstValue(source.avatarUrl, source.profilePhotoUrl) ??
      (profilePhotoFileId ? `/api/files/${profilePhotoFileId}` : null),
  };
}
