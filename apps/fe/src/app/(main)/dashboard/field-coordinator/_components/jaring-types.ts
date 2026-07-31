export type AdministrativeAreaLevel =
  | "COUNTRY"
  | "PROVINCE"
  | "REGENCY"
  | "CITY"
  | "DISTRICT"
  | "VILLAGE"
  | "URBAN_VILLAGE"
  | "RW"
  | "RT";

export type JaringAdministrativeArea = {
  id: string;
  name: string;
  level: AdministrativeAreaLevel;
  parentId?: string | null;
  centroidLatitude?: string | number | null;
  centroidLongitude?: string | number | null;
  parent?: JaringAdministrativeArea | null;
};

export type RegistrationJaring = {
  id: string;
  code: string;
  aliasName: string | null;
  fullName: string | null;
  nationalIdNumber: string | null;
  address: string | null;
  birthPlace: string | null;
  birthDate: string | null;
  gender: string | null;
  whatsappNumber: string;
  occupation: { name: string } | null;
  profilePhotoFileId: string | null;
  profilePhotoFile: { id: string } | null;
  workplace: string | null;
  jobTitle: string | null;
  joinedAt: string | null;
  organizationName: string | null;
  politicalAffiliation: string | null;
  notes: string | null;
  registrationStatus: "PENDING" | "APPROVED" | "REJECTED";
  registeredAt: string;
  createdAt?: string;
  rejectionReason?: string | null;
  caretakerAssignments: Array<{
    fieldOfficerAssignment: { userProfile: { fullName: string | null } };
  }>;
  areaCoverages: Array<{ area: JaringAdministrativeArea }>;
};

export function findJaringArea(
  item: RegistrationJaring,
  levels: AdministrativeAreaLevel[],
): JaringAdministrativeArea | null {
  const acceptedLevels = new Set(levels);

  for (const coverage of item.areaCoverages) {
    let area: JaringAdministrativeArea | null | undefined = coverage.area;

    while (area) {
      if (acceptedLevels.has(area.level)) {
        return area;
      }
      area = area.parent;
    }
  }

  return null;
}

export function jaringVillage(item: RegistrationJaring) {
  return findJaringArea(item, ["URBAN_VILLAGE", "VILLAGE"]);
}

export function jaringDistrict(item: RegistrationJaring) {
  return findJaringArea(item, ["DISTRICT"]);
}

export function jaringCity(item: RegistrationJaring) {
  return findJaringArea(item, ["CITY", "REGENCY"]);
}
