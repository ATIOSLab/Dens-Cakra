import type { MapArea, MapAreaFilterOptions, MapNetworkFilters } from "./maps-intelijen-types";

export type MapAreaSelectOption = [value: string, label: string];

export function normalizeMapAreas(areas: MapArea[], levels: string[], parentId?: string) {
  const acceptedLevels = new Set(levels);
  const uniqueAreas = new Map<string, MapArea>();

  for (const area of areas) {
    if (!acceptedLevels.has(area.level)) continue;
    if (parentId && area.parentId !== parentId) continue;
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
  return `${allLabel} di ${selectedParent.name}`;
}

export function buildMapAreaHierarchyOptions(areaOptions: MapAreaFilterOptions, filters: MapNetworkFilters) {
  const provinces = normalizeMapAreas(areaOptions.provinces, ["PROVINCE"]);
  const selectedProvince = provinces.find((area) => area.id === filters.provinceId);
  const regencies = selectedProvince
    ? normalizeMapAreas(areaOptions.regencies, ["REGENCY", "CITY"], selectedProvince.id)
    : [];
  const selectedRegency = regencies.find((area) => area.id === filters.regencyId);
  const districts = selectedRegency ? normalizeMapAreas(areaOptions.districts, ["DISTRICT"], selectedRegency.id) : [];
  const selectedDistrict = districts.find((area) => area.id === filters.districtId);
  const villages = selectedDistrict
    ? normalizeMapAreas(areaOptions.villages, ["VILLAGE", "URBAN_VILLAGE"], selectedDistrict.id)
    : [];

  return {
    provinces: [
      ["ALL", areaOptions.loadingLevel === "province" ? "Memuat provinsi..." : "Seluruh provinsi dalam cakupan"],
      ...provinces.map((area) => [area.id, optionLabel(area)] as MapAreaSelectOption),
    ] satisfies MapAreaSelectOption[],
    regencies: [
      [
        "ALL",
        loadingOrAllLabel(
          areaOptions.loadingLevel === "regency",
          "Memuat Kota/Kabupaten...",
          selectedProvince,
          "Pilih provinsi terlebih dahulu",
          "Seluruh Kota/Kabupaten",
        ),
      ],
      ...regencies.map((area) => [area.id, optionLabel(area)] as MapAreaSelectOption),
    ] satisfies MapAreaSelectOption[],
    districts: [
      [
        "ALL",
        loadingOrAllLabel(
          areaOptions.loadingLevel === "district",
          "Memuat kecamatan...",
          selectedRegency,
          "Pilih Kota/Kabupaten terlebih dahulu",
          "Seluruh kecamatan",
        ),
      ],
      ...districts.map((area) => [area.id, optionLabel(area)] as MapAreaSelectOption),
    ] satisfies MapAreaSelectOption[],
    villages: [
      [
        "ALL",
        loadingOrAllLabel(
          areaOptions.loadingLevel === "village",
          "Memuat kelurahan/desa...",
          selectedDistrict,
          "Pilih kecamatan terlebih dahulu",
          "Seluruh kelurahan/desa",
        ),
      ],
      ...villages.map((area) => [area.id, optionLabel(area)] as MapAreaSelectOption),
    ] satisfies MapAreaSelectOption[],
  };
}
