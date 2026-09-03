import { describe, expect, it } from "vitest";

import { buildMapAreaHierarchyOptions, isAreaChildOfParent, normalizeMapAreas } from "./maps-intelijen-area-hierarchy";
import type { MapArea, MapAreaFilterOptions, MapNetworkFilters } from "./maps-intelijen-types";

function createArea(
  id: string,
  code: string,
  name: string,
  level: string,
  parentId?: string | null,
  parentOfficialCode?: string | null,
): MapArea {
  return {
    id,
    code,
    officialCode: code,
    name,
    level,
    parentId: parentId ?? null,
    parentAreaId: parentId ?? null,
    parentOfficialCode: parentOfficialCode ?? null,
  };
}

describe("isAreaChildOfParent", () => {
  const dkiProv = createArea("p31", "31", "DKI Jakarta", "PROVINCE");
  const jabarProv = createArea("p32", "32", "Jawa Barat", "PROVINCE");

  const jakPus = createArea("c3171", "31.71", "Jakarta Pusat", "CITY", "p31");
  const jakSel = createArea("c3174", "31.74", "Jakarta Selatan", "CITY", null, "31");
  const bandung = createArea("c3273", "32.73", "Kota Bandung", "CITY", "p32");

  const gambir = createArea("d317101", "31.71.01", "Gambir", "DISTRICT", "c3171");
  const kemayoran = createArea("d317103", "31.71.03", "Kemayoran", "DISTRICT", null, "31.71");
  const kebayoranBaru = createArea("d317401", "31.74.01", "Kebayoran Baru", "DISTRICT", "c3174");
  const coblong = createArea("d327301", "32.73.01", "Coblong", "DISTRICT", "c3273");

  const kelGambir = createArea("v3171011001", "31.71.01.1001", "Gambir", "URBAN_VILLAGE", "d317101");
  const kelCideng = createArea("v3171011003", "31.71.01.1003", "Cideng", "URBAN_VILLAGE", null, "31.71.01");
  const kelSelong = createArea("v3174011001", "31.74.01.1001", "Selong", "URBAN_VILLAGE", "d317401");

  it("mencocokkan anak melalui parentId langsung", () => {
    expect(isAreaChildOfParent(jakPus, dkiProv)).toBe(true);
    expect(isAreaChildOfParent(bandung, jabarProv)).toBe(true);
    expect(isAreaChildOfParent(gambir, jakPus)).toBe(true);
    expect(isAreaChildOfParent(kelGambir, gambir)).toBe(true);
  });

  it("mencocokkan anak melalui parentOfficialCode dan prefix kode wilayah resmi", () => {
    expect(isAreaChildOfParent(jakSel, dkiProv)).toBe(true);
    expect(isAreaChildOfParent(kemayoran, jakPus)).toBe(true);
    expect(isAreaChildOfParent(kelCideng, gambir)).toBe(true);
  });

  it("menolak wilayah yang bukan merupakan anak hierarki", () => {
    expect(isAreaChildOfParent(bandung, dkiProv)).toBe(false);
    expect(isAreaChildOfParent(jakPus, jabarProv)).toBe(false);
    expect(isAreaChildOfParent(kebayoranBaru, jakPus)).toBe(false);
    expect(isAreaChildOfParent(coblong, jakPus)).toBe(false);
    expect(isAreaChildOfParent(kelSelong, gambir)).toBe(false);
  });
});

describe("normalizeMapAreas", () => {
  const areas: MapArea[] = [
    createArea("p31", "31", "DKI Jakarta", "PROVINCE"),
    createArea("p32", "32", "Jawa Barat", "PROVINCE"),
    createArea("c3171", "31.71", "Jakarta Pusat", "CITY", "p31"),
    createArea("c3174", "31.74", "Jakarta Selatan", "CITY", "p31"),
    createArea("c3273", "32.73", "Kota Bandung", "CITY", "p32"),
  ];

  it("hanya menyertakan level yang diminta dan mengurutkan nama", () => {
    const provinces = normalizeMapAreas(areas, ["PROVINCE"]);
    expect(provinces.map((a) => a.name)).toEqual(["DKI Jakarta", "Jawa Barat"]);
  });

  it("memfilter wilayah anak berdasarkan parent terpilih", () => {
    const dkiProv = areas[0];
    const dkiCities = normalizeMapAreas(areas, ["CITY", "REGENCY"], dkiProv);
    expect(dkiCities.map((a) => a.name)).toEqual(["Jakarta Pusat", "Jakarta Selatan"]);
    expect(dkiCities.some((a) => a.name === "Kota Bandung")).toBe(false);
  });
});

describe("buildMapAreaHierarchyOptions", () => {
  const dkiProv = createArea("p31", "31", "DKI Jakarta", "PROVINCE");
  const jabarProv = createArea("p32", "32", "Jawa Barat", "PROVINCE");

  const jakPus = createArea("c3171", "31.71", "Jakarta Pusat", "CITY", "p31");
  const jakSel = createArea("c3174", "31.74", "Jakarta Selatan", "CITY", null, "31");
  const bandung = createArea("c3273", "32.73", "Kota Bandung", "CITY", "p32");

  const gambir = createArea("d317101", "31.71.01", "Gambir", "DISTRICT", "c3171");
  const kemayoran = createArea("d317103", "31.71.03", "Kemayoran", "DISTRICT", null, "31.71");
  const kebayoranBaru = createArea("d317401", "31.74.01", "Kebayoran Baru", "DISTRICT", "c3174");
  const coblong = createArea("d327301", "32.73.01", "Coblong", "DISTRICT", "c3273");

  const kelGambir = createArea("v3171011001", "31.71.01.1001", "Gambir", "URBAN_VILLAGE", "d317101");
  const kelCideng = createArea("v3171011003", "31.71.01.1003", "Cideng", "URBAN_VILLAGE", null, "31.71.01");
  const kelSelong = createArea("v3174011001", "31.74.01.1001", "Selong", "URBAN_VILLAGE", "d317401");

  const areaOptions: MapAreaFilterOptions = {
    provinces: [dkiProv, jabarProv],
    regencies: [jakPus, jakSel, bandung],
    districts: [gambir, kemayoran, kebayoranBaru, coblong],
    villages: [kelGambir, kelCideng, kelSelong],
    loading: false,
    loadingLevel: null,
  };

  const baseFilters: MapNetworkFilters = {
    search: "",
    period: "LAST_30_DAYS",
    startDate: "",
    endDate: "",
    dataType: "ALL",
    urgency: "ALL",
    categoryId: "ALL",
    fieldOfficerAssignmentId: "ALL",
    jaringId: "ALL",
    provinceId: "ALL",
    regencyId: "ALL",
    districtId: "ALL",
    villageId: "ALL",
    suitability: "ALL",
  };

  it("saat Provinsi ALL, opsi anak kosong dan menampilkan placeholder petunjuk", () => {
    const result = buildMapAreaHierarchyOptions(areaOptions, baseFilters);

    expect(result.provinces).toEqual([
      ["ALL", "Semua Provinsi"],
      ["p31", "DKI Jakarta"],
      ["p32", "Jawa Barat"],
    ]);
    expect(result.regencies).toEqual([["ALL", "Pilih Provinsi dahulu"]]);
    expect(result.districts).toEqual([["ALL", "Pilih Kota/Kabupaten dahulu"]]);
    expect(result.villages).toEqual([["ALL", "Pilih Kecamatan dahulu"]]);
  });

  it("saat Provinsi DKI Jakarta terpilih, Kota/Kabupaten HANYA menampilkan wilayah DKI Jakarta", () => {
    const filters: MapNetworkFilters = {
      ...baseFilters,
      provinceId: "p31",
    };
    const result = buildMapAreaHierarchyOptions(areaOptions, filters);

    expect(result.regencies).toEqual([
      ["ALL", "Semua Kota/Kabupaten"],
      ["c3171", "Jakarta Pusat"],
      ["c3174", "Jakarta Selatan"],
    ]);
    // Kota Bandung tidak boleh muncul
    expect(result.regencies.some((opt) => opt[1] === "Kota Bandung")).toBe(false);

    // Kecamatan dan kelurahan tetap belum dibuka jika Kota/Kabupaten belum dipilih
    expect(result.districts).toEqual([["ALL", "Pilih Kota/Kabupaten dahulu"]]);
    expect(result.villages).toEqual([["ALL", "Pilih Kecamatan dahulu"]]);
  });

  it("saat Kota Jakarta Pusat terpilih, Kecamatan HANYA menampilkan kecamatan di bawah Jakarta Pusat", () => {
    const filters: MapNetworkFilters = {
      ...baseFilters,
      provinceId: "p31",
      regencyId: "c3171",
    };
    const result = buildMapAreaHierarchyOptions(areaOptions, filters);

    expect(result.districts).toEqual([
      ["ALL", "Semua Kecamatan"],
      ["d317101", "Gambir"],
      ["d317103", "Kemayoran"],
    ]);
    // Kebayoran Baru (Jaksel) dan Coblong (Bandung) tidak boleh muncul
    expect(result.districts.some((opt) => opt[1] === "Kebayoran Baru")).toBe(false);
    expect(result.districts.some((opt) => opt[1] === "Coblong")).toBe(false);
  });

  it("saat Kecamatan Gambir terpilih, Kelurahan HANYA menampilkan kelurahan di bawah Gambir", () => {
    const filters: MapNetworkFilters = {
      ...baseFilters,
      provinceId: "p31",
      regencyId: "c3171",
      districtId: "d317101",
    };
    const result = buildMapAreaHierarchyOptions(areaOptions, filters);

    expect(result.villages).toEqual([
      ["ALL", "Semua Kelurahan/Desa"],
      ["v3171011003", "Cideng"],
      ["v3171011001", "Gambir"],
    ]);
    // Selong (Kebayoran Baru) tidak boleh muncul
    expect(result.villages.some((opt) => opt[1] === "Selong")).toBe(false);
  });
});
