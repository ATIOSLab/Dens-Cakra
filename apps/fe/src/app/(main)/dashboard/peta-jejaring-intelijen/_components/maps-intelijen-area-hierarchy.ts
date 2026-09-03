import {
  isDistrictLevel,
  isDkiAreaScope,
  isDkiJakartaProvinceOption,
  isProvinceLevel,
  isRegencyLevel,
  isVillageLevel,
} from "@/lib/domain/area-filter";

import type { MapArea, MapAreaFilterOptions, MapNetworkFilters } from "./maps-intelijen-types";

export type MapAreaSelectOption = [value: string, label: string];

export function isAreaChildOfParent(child: MapArea, parent: MapArea): boolean {
  if (!parent.id) return false;

  // 1. Direct parent ID match
  if (child.parentId && child.parentId === parent.id) return true;
  if (child.parentAreaId && child.parentAreaId === parent.id) return true;
  if (child.parent?.id && child.parent.id === parent.id) return true;

  // 2. Parent official code match
  const parentCode = parent.officialCode?.trim() || parent.code.trim();
  const childParentCode = child.parentOfficialCode?.trim();
  if (parentCode && childParentCode && childParentCode === parentCode) return true;

  // 3. Code prefix match (e.g. child "31.71" starts with parent "31." or "31.71.01" starts with "31.71.")
  const childCode = child.officialCode?.trim() || child.code.trim();
  if (parentCode && childCode?.startsWith(`${parentCode}.`)) return true;

  // 4. Special DKI Jakarta hierarchy match (DKI province to DKI cities)
  if (isProvinceLevel(parent.level) && isRegencyLevel(child.level)) {
    if (isDkiJakartaProvinceOption(parent) && isDkiAreaScope(child)) return true;
  }

  return false;
}

function matchesLevel(level: string, levels: string[]) {
  for (const expected of levels) {
    if (level === expected) return true;
    if (isProvinceLevel(expected) && isProvinceLevel(level)) return true;
    if (isRegencyLevel(expected) && isRegencyLevel(level)) return true;
    if (isDistrictLevel(expected) && isDistrictLevel(level)) return true;
    if (isVillageLevel(expected) && isVillageLevel(level)) return true;
  }
  return false;
}

export function normalizeMapAreas(areas: MapArea[], levels: string[], parent?: MapArea | string | null) {
  const uniqueAreas = new Map<string, MapArea>();
  const parentObj: MapArea | null =
    typeof parent === "string" ? ({ id: parent, code: "", name: "", level: "" } as MapArea) : (parent ?? null);

  for (const area of areas) {
    if (!matchesLevel(area.level, levels)) continue;
    if (parentObj) {
      if (!parentObj.code && !parentObj.name) {
        if (area.parentId !== parentObj.id && area.parentAreaId !== parentObj.id && area.parent?.id !== parentObj.id) {
          continue;
        }
      } else {
        if (!isAreaChildOfParent(area, parentObj)) continue;
      }
    }
    uniqueAreas.set(area.id, area);
  }

  return [...uniqueAreas.values()].sort((left, right) => left.name.localeCompare(right.name, "id-ID"));
}

function optionLabel(area: MapArea) {
  return area.name;
}

function loadingOrAllLabel(
  loading: boolean,
  loadingLabel: string,
  selectedParent: MapArea | undefined,
  parentPrompt: string,
  allLabel: string,
) {
  if (loading) return loadingLabel;
  if (!selectedParent) return parentPrompt;
  return allLabel;
}

export function buildMapAreaHierarchyOptions(areaOptions: MapAreaFilterOptions, filters: MapNetworkFilters) {
  const provinces = normalizeMapAreas(areaOptions.provinces, ["PROVINCE", "PROVINSI"]);
  const selectedProvince = provinces.find((area) => area.id === filters.provinceId);

  const regencies = selectedProvince
    ? normalizeMapAreas(areaOptions.regencies, ["REGENCY", "CITY", "KOTA", "KABUPATEN"], selectedProvince)
    : [];

  const selectedRegency = regencies.find((area) => area.id === filters.regencyId);

  const districts = selectedRegency
    ? normalizeMapAreas(areaOptions.districts, ["DISTRICT", "KECAMATAN"], selectedRegency)
    : [];

  const selectedDistrict = districts.find((area) => area.id === filters.districtId);

  const villages = selectedDistrict
    ? normalizeMapAreas(areaOptions.villages, ["VILLAGE", "URBAN_VILLAGE", "DESA", "KELURAHAN"], selectedDistrict)
    : [];

  return {
    provinces: [
      ["ALL", areaOptions.loadingLevel === "province" ? "Memuat Provinsi..." : "Semua Provinsi"],
      ...provinces.map((area) => [area.id, optionLabel(area)] as MapAreaSelectOption),
    ] satisfies MapAreaSelectOption[],
    regencies: [
      [
        "ALL",
        loadingOrAllLabel(
          areaOptions.loadingLevel === "regency",
          "Memuat Kota/Kabupaten...",
          selectedProvince,
          "Pilih Provinsi dahulu",
          "Semua Kota/Kabupaten",
        ),
      ],
      ...regencies.map((area) => [area.id, optionLabel(area)] as MapAreaSelectOption),
    ] satisfies MapAreaSelectOption[],
    districts: [
      [
        "ALL",
        loadingOrAllLabel(
          areaOptions.loadingLevel === "district",
          "Memuat Kecamatan...",
          selectedRegency,
          "Pilih Kota/Kabupaten dahulu",
          "Semua Kecamatan",
        ),
      ],
      ...districts.map((area) => [area.id, optionLabel(area)] as MapAreaSelectOption),
    ] satisfies MapAreaSelectOption[],
    villages: [
      [
        "ALL",
        loadingOrAllLabel(
          areaOptions.loadingLevel === "village",
          "Memuat Kelurahan/Desa...",
          selectedDistrict,
          "Pilih Kecamatan dahulu",
          "Semua Kelurahan/Desa",
        ),
      ],
      ...villages.map((area) => [area.id, optionLabel(area)] as MapAreaSelectOption),
    ] satisfies MapAreaSelectOption[],
  };
}
