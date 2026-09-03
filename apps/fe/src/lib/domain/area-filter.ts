export type AdministrativeAreaFilterScope = {
  id?: string;
  areaId?: string;
  code?: string | null;
  officialCode?: string | null;
  name: string;
  level: string;
  parentAreaId?: string | null;
  parentOfficialCode?: string | null;
};

export type ProvinceFilterOption = {
  id: string;
  name: string;
};

export type RegencyFilterOption = {
  id: string;
  name: string;
};

export type DistrictFilterOption = {
  id: string;
  name: string;
  regencyId: string | null;
  regencyName: string | null;
};

export type VillageFilterOption = {
  id: string;
  name: string;
  districtId: string | null;
  districtName: string | null;
};

export type AreaFilterIdentity = {
  id?: string;
  areaId?: string;
  code?: string | null;
  officialCode?: string | null;
  name: string;
  level?: string | null;
};

const DKI_JAKARTA_PROVINCE_CODE = "31";
const DKI_JAKARTA_NAME_MATCHERS = ["dki jakarta", "daerah khusus ibukota jakarta"] as const;

export function areaScopeId(area: AdministrativeAreaFilterScope) {
  return area.areaId ?? area.id ?? "";
}

export function isProvinceLevel(level: string) {
  return level === "PROVINCE" || level === "PROVINSI";
}

export function isRegencyLevel(level: string) {
  return level === "CITY" || level === "REGENCY" || level === "KOTA" || level === "KABUPATEN";
}

export function isDistrictLevel(level: string) {
  return level === "DISTRICT" || level === "KECAMATAN";
}

export function isVillageLevel(level: string) {
  return level === "VILLAGE" || level === "URBAN_VILLAGE" || level === "DESA" || level === "KELURAHAN";
}

function areaCode(area: AdministrativeAreaFilterScope) {
  return area.officialCode?.trim() || area.code?.trim() || "";
}

export function resolveDistrictRegency(
  district: AdministrativeAreaFilterScope,
  regencies: AdministrativeAreaFilterScope[],
): AdministrativeAreaFilterScope | null {
  if (district.parentAreaId) {
    const parent = regencies.find((regency) => areaScopeId(regency) === district.parentAreaId);
    if (parent) return parent;
  }

  const districtCode = areaCode(district);
  return (
    regencies.find((regency) => {
      const regencyCode = areaCode(regency);
      return (
        (Boolean(district.parentOfficialCode) && district.parentOfficialCode === regencyCode) ||
        (Boolean(regencyCode) && districtCode.startsWith(`${regencyCode}.`))
      );
    }) ?? null
  );
}

export function resolveRegencyProvince(
  regency: AdministrativeAreaFilterScope,
  provinces: AdministrativeAreaFilterScope[],
): AdministrativeAreaFilterScope | null {
  if (regency.parentAreaId) {
    const parent = provinces.find((province) => areaScopeId(province) === regency.parentAreaId);
    if (parent) return parent;
  }

  const regencyCode = areaCode(regency);
  return (
    provinces.find((province) => {
      const provinceCode = areaCode(province);
      return (
        (Boolean(regency.parentOfficialCode) && regency.parentOfficialCode === provinceCode) ||
        (Boolean(provinceCode) && regencyCode.startsWith(`${provinceCode}.`))
      );
    }) ?? null
  );
}

export function resolveVillageDistrict(
  village: AdministrativeAreaFilterScope,
  districts: AdministrativeAreaFilterScope[],
): AdministrativeAreaFilterScope | null {
  if (village.parentAreaId) {
    const parent = districts.find((district) => areaScopeId(district) === village.parentAreaId);
    if (parent) return parent;
  }

  const villageCode = areaCode(village);
  return (
    districts.find((district) => {
      const districtCode = areaCode(district);
      return (
        (Boolean(village.parentOfficialCode) && village.parentOfficialCode === districtCode) ||
        (Boolean(districtCode) && villageCode.startsWith(`${districtCode}.`))
      );
    }) ?? null
  );
}

export function buildProvinceFilterOptions(areaScopes: AdministrativeAreaFilterScope[]) {
  const provinces = new Map<string, ProvinceFilterOption>();
  for (const area of areaScopes) {
    const id = areaScopeId(area);
    if (id && isProvinceLevel(area.level)) {
      provinces.set(id, { id, name: area.name });
    }
  }
  return [...provinces.values()].sort((left, right) => left.name.localeCompare(right.name, "id-ID"));
}

export function buildRegencyFilterOptions(areaScopes: AdministrativeAreaFilterScope[], provinceFilter = "ALL") {
  const provinceScopes = areaScopes.filter((area) => isProvinceLevel(area.level));
  const regencies = new Map<string, RegencyFilterOption>();
  for (const area of areaScopes) {
    const id = areaScopeId(area);
    if (!id || !isRegencyLevel(area.level)) continue;

    if (provinceFilter !== "ALL") {
      const province = resolveRegencyProvince(area, provinceScopes);
      if ((province ? areaScopeId(province) : area.parentAreaId) !== provinceFilter) continue;
    }

    regencies.set(id, { id, name: area.name });
  }
  return [...regencies.values()].sort((left, right) => left.name.localeCompare(right.name, "id-ID"));
}

export function buildDistrictFilterOptions(
  areaScopes: AdministrativeAreaFilterScope[],
  regencyFilter: string,
  provinceFilter = "ALL",
) {
  const provinceScopes = areaScopes.filter((area) => isProvinceLevel(area.level));
  const regencies = areaScopes.filter((area) => isRegencyLevel(area.level));
  const districts = new Map<string, DistrictFilterOption>();

  const allowedRegencyIds = new Set<string>();
  for (const regency of regencies) {
    const regId = areaScopeId(regency);
    if (!regId) continue;
    if (provinceFilter !== "ALL") {
      const prov = resolveRegencyProvince(regency, provinceScopes);
      if ((prov ? areaScopeId(prov) : regency.parentAreaId) !== provinceFilter) continue;
    }
    allowedRegencyIds.add(regId);
  }

  for (const area of areaScopes) {
    const id = areaScopeId(area);
    if (!id || !isDistrictLevel(area.level)) continue;

    const regency = resolveDistrictRegency(area, regencies);
    const regencyId = regency ? areaScopeId(regency) : (area.parentAreaId ?? null);
    if (regencyFilter !== "ALL") {
      if (regencyId !== regencyFilter) continue;
    } else if (provinceFilter !== "ALL") {
      if (!regencyId || !allowedRegencyIds.has(regencyId)) continue;
    }

    districts.set(id, {
      id,
      name: area.name,
      regencyId,
      regencyName: regency ? regency.name : null,
    });
  }

  return [...districts.values()].sort((left, right) => left.name.localeCompare(right.name, "id-ID"));
}

export function buildVillageFilterOptions(
  areaScopes: AdministrativeAreaFilterScope[],
  districtFilter: string,
  regencyFilter = "ALL",
  provinceFilter = "ALL",
) {
  const provinceScopes = areaScopes.filter((area) => isProvinceLevel(area.level));
  const regencies = areaScopes.filter((area) => isRegencyLevel(area.level));
  const allDistricts = areaScopes.filter((area) => isDistrictLevel(area.level));
  const villages = new Map<string, VillageFilterOption>();

  const allowedRegencyIds = new Set<string>();
  for (const regency of regencies) {
    const regId = areaScopeId(regency);
    if (!regId) continue;
    if (provinceFilter !== "ALL") {
      const prov = resolveRegencyProvince(regency, provinceScopes);
      if ((prov ? areaScopeId(prov) : regency.parentAreaId) !== provinceFilter) continue;
    }
    allowedRegencyIds.add(regId);
  }

  const allowedDistrictIds = new Set<string>();
  for (const dist of allDistricts) {
    const distId = areaScopeId(dist);
    if (!distId) continue;
    const reg = resolveDistrictRegency(dist, regencies);
    const regId = reg ? areaScopeId(reg) : dist.parentAreaId;

    if (regencyFilter !== "ALL") {
      if (regId !== regencyFilter) continue;
    } else if (provinceFilter !== "ALL") {
      if (!regId || !allowedRegencyIds.has(regId)) continue;
    }
    allowedDistrictIds.add(distId);
  }

  for (const area of areaScopes) {
    const id = areaScopeId(area);
    if (!id || !isVillageLevel(area.level)) continue;

    const district = resolveVillageDistrict(area, allDistricts);
    const districtId = district ? areaScopeId(district) : (area.parentAreaId ?? null);
    if (districtFilter !== "ALL") {
      if (districtId !== districtFilter) continue;
    } else if (regencyFilter !== "ALL" || provinceFilter !== "ALL") {
      if (!districtId || !allowedDistrictIds.has(districtId)) continue;
    }

    villages.set(id, {
      id,
      name: area.name,
      districtId,
      districtName: district ? district.name : null,
    });
  }

  return [...villages.values()].sort((left, right) => left.name.localeCompare(right.name, "id-ID"));
}

export function resolveAreaFilterSelection(areaScopes: AdministrativeAreaFilterScope[], areaId: string) {
  const selected = areaScopes.find((area) => areaScopeId(area) === areaId);
  if (!selected) {
    return {
      provinceFilter: "ALL",
      regencyFilter: "ALL",
      districtFilter: "ALL",
      villageFilter: "ALL",
      selectedArea: null,
    };
  }

  const provinces = areaScopes.filter((area) => isProvinceLevel(area.level));
  const regencies = areaScopes.filter((area) => isRegencyLevel(area.level));
  const districts = areaScopes.filter((area) => isDistrictLevel(area.level));

  if (isProvinceLevel(selected.level)) {
    return {
      provinceFilter: areaScopeId(selected),
      regencyFilter: "ALL",
      districtFilter: "ALL",
      villageFilter: "ALL",
      selectedArea: selected,
    };
  }

  if (isRegencyLevel(selected.level)) {
    const province = resolveRegencyProvince(selected, provinces);

    return {
      provinceFilter: province ? areaScopeId(province) : "ALL",
      regencyFilter: areaScopeId(selected),
      districtFilter: "ALL",
      villageFilter: "ALL",
      selectedArea: selected,
    };
  }

  if (isDistrictLevel(selected.level)) {
    const regency = resolveDistrictRegency(selected, regencies);
    const province = regency ? resolveRegencyProvince(regency, provinces) : null;

    return {
      provinceFilter: province ? areaScopeId(province) : "ALL",
      regencyFilter: regency ? areaScopeId(regency) : "ALL",
      districtFilter: areaScopeId(selected),
      villageFilter: "ALL",
      selectedArea: selected,
    };
  }

  if (isVillageLevel(selected.level)) {
    const district = resolveVillageDistrict(selected, districts);
    const regency = district ? resolveDistrictRegency(district, regencies) : null;
    const province = regency ? resolveRegencyProvince(regency, provinces) : null;

    return {
      provinceFilter: province ? areaScopeId(province) : "ALL",
      regencyFilter: regency ? areaScopeId(regency) : "ALL",
      districtFilter: district ? areaScopeId(district) : "ALL",
      villageFilter: areaScopeId(selected),
      selectedArea: selected,
    };
  }

  return {
    provinceFilter: "ALL",
    regencyFilter: "ALL",
    districtFilter: "ALL",
    villageFilter: "ALL",
    selectedArea: selected,
  };
}

export function isDkiAreaScope(area: AdministrativeAreaFilterScope) {
  const code = area.officialCode?.trim() || area.code?.trim() || "";
  const name = area.name.toLowerCase();

  return (
    code === "31" ||
    code.startsWith("31.") ||
    name.includes("dki jakarta") ||
    name.includes("daerah khusus ibukota jakarta")
  );
}

export function isDkiJakartaProvinceOption(area: AreaFilterIdentity) {
  const code = area.officialCode?.trim() || area.code?.trim() || "";
  const name = String(area.name).toLocaleLowerCase("id-ID");
  const level = area.level?.toUpperCase();

  return (
    (!level || isProvinceLevel(level)) &&
    (code === DKI_JAKARTA_PROVINCE_CODE || DKI_JAKARTA_NAME_MATCHERS.some((matcher) => name.includes(matcher)))
  );
}

function isDkiJakartaAreaOption(area: AreaFilterIdentity) {
  const code = area.officialCode?.trim() || area.code?.trim() || "";
  const name = String(area.name).toLocaleLowerCase("id-ID");

  return (
    code === DKI_JAKARTA_PROVINCE_CODE ||
    code.startsWith(`${DKI_JAKARTA_PROVINCE_CODE}.`) ||
    DKI_JAKARTA_NAME_MATCHERS.some((matcher) => name.includes(matcher))
  );
}

export function findDkiJakartaProvinceFilterId<T extends AreaFilterIdentity>(areas: T[]) {
  const dkiProvince = areas.find(isDkiJakartaProvinceOption) ?? areas.find(isDkiJakartaAreaOption);
  return dkiProvince ? (dkiProvince.areaId ?? dkiProvince.id ?? "") : "";
}

export function selectedAreaFilterId(input: {
  provinceFilter?: string;
  regencyFilter: string;
  districtFilter: string;
  villageFilter: string;
}) {
  if (input.villageFilter !== "ALL") return input.villageFilter;
  if (input.districtFilter !== "ALL") return input.districtFilter;
  if (input.regencyFilter !== "ALL") return input.regencyFilter;
  if (input.provinceFilter && input.provinceFilter !== "ALL") return input.provinceFilter;
  return undefined;
}

export function buildAreaFilterSubtitle(input: {
  metricLabel: string;
  allScopeLabel?: string;
  provinceFilter?: string;
  regencyFilter: string;
  districtFilter: string;
  villageFilter: string;
  provinceOptions?: Array<{ id: string; name: string }>;
  regencyOptions: Array<{ id: string; name: string }>;
  districtOptions: Array<{ id: string; name: string }>;
  villageOptions: Array<{ id: string; name: string }>;
}) {
  const {
    metricLabel,
    allScopeLabel = "cakupan aktif",
    provinceFilter = "ALL",
    regencyFilter,
    districtFilter,
    villageFilter,
    provinceOptions = [],
    regencyOptions,
    districtOptions,
    villageOptions,
  } = input;
  const provinceName = provinceOptions.find((area) => area.id === provinceFilter)?.name;
  const regencyName = regencyOptions.find((area) => area.id === regencyFilter)?.name;
  const districtName = districtOptions.find((area) => area.id === districtFilter)?.name;
  const villageName = villageOptions.find((area) => area.id === villageFilter)?.name;

  if (villageFilter !== "ALL" && villageName) {
    const districtPart = districtName ? `Kecamatan ${districtName}, ` : "";
    const regencyPart = regencyName ? `Kota/Kabupaten ${regencyName}, ` : "";

    return `${metricLabel} ${regencyPart}${districtPart}Kelurahan/Desa ${villageName}`;
  }
  if (districtFilter !== "ALL" && districtName) {
    const regencyPart = regencyName ? `Kota/Kabupaten ${regencyName}, ` : "";

    return `${metricLabel} ${regencyPart}Kecamatan ${districtName}`;
  }
  if (regencyFilter !== "ALL" && regencyName) {
    return `${metricLabel} Kota/Kabupaten ${regencyName}`;
  }
  if (provinceFilter !== "ALL" && provinceName) {
    return `${metricLabel} Provinsi ${provinceName}`;
  }
  return `${metricLabel} ${allScopeLabel}`;
}
