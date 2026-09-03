"use client";

import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";

import { buildMapAreaHierarchyOptions, type MapAreaSelectOption } from "./maps-intelijen-area-hierarchy";
import type { MapAreaFilterOptions, MapNetworkFilters } from "./maps-intelijen-types";

const AREA_PAGE_SIZE = 7;

function toSelectOptions(options: MapAreaSelectOption[]): SearchableSelectOption[] {
  return options.map(([value, label]) => ({ value, label }));
}

export function MapsIntelijenAreaFilter({
  areaOptions,
  filters,
  onChange,
}: {
  areaOptions: MapAreaFilterOptions;
  filters: MapNetworkFilters;
  onChange: (patch: Partial<MapNetworkFilters>) => void;
}) {
  const hierarchy = buildMapAreaHierarchyOptions(areaOptions, filters);

  const fields = [
    {
      label: "Provinsi",
      value: filters.provinceId,
      options: toSelectOptions(hierarchy.provinces),
      disabled: areaOptions.loadingLevel === "province",
      onChange: (provinceId: string) => onChange({ provinceId, regencyId: "ALL", districtId: "ALL", villageId: "ALL" }),
      searchPlaceholder: "Cari provinsi...",
    },
    {
      label: "Kota/Kabupaten",
      value: filters.regencyId,
      options: toSelectOptions(hierarchy.regencies),
      disabled: filters.provinceId === "ALL" || areaOptions.loadingLevel === "regency",
      onChange: (regencyId: string) => onChange({ regencyId, districtId: "ALL", villageId: "ALL" }),
      searchPlaceholder: "Cari kota/kabupaten...",
    },
    {
      label: "Kecamatan",
      value: filters.districtId,
      options: toSelectOptions(hierarchy.districts),
      disabled: filters.regencyId === "ALL" || areaOptions.loadingLevel === "district",
      onChange: (districtId: string) => onChange({ districtId, villageId: "ALL" }),
      searchPlaceholder: "Cari kecamatan...",
    },
    {
      label: "Kelurahan/Desa",
      value: filters.villageId,
      options: toSelectOptions(hierarchy.villages),
      disabled: filters.districtId === "ALL" || areaOptions.loadingLevel === "village",
      onChange: (villageId: string) => onChange({ villageId }),
      searchPlaceholder: "Cari kelurahan/desa...",
    },
  ];

  return (
    <section aria-label="Filter wilayah" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
      {fields.map((field) => (
        <div key={field.label} className="grid min-w-0 gap-1">
          <span className="truncate text-xs text-muted-foreground">{field.label}</span>
          <SearchableSelect
            value={field.value}
            options={field.options}
            onValueChange={field.onChange}
            placeholder={field.label}
            searchPlaceholder={field.searchPlaceholder}
            disabled={field.disabled}
            pageSize={AREA_PAGE_SIZE}
            aria-label={field.label}
            className="w-full min-w-0"
          />
        </div>
      ))}
    </section>
  );
}
