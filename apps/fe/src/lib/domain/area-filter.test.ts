import { describe, expect, it } from "vitest";

import {
  type AdministrativeAreaFilterScope,
  buildDistrictFilterOptions,
  buildProvinceFilterOptions,
  buildRegencyFilterOptions,
  buildVillageFilterOptions,
  findDkiJakartaProvinceFilterId,
  isDkiAreaScope,
  isDkiJakartaProvinceOption,
  isProvinceLevel,
  isRegencyLevel,
  resolveAreaFilterSelection,
} from "@/lib/domain/area-filter";

const province = (id: string, code: string, name: string): AdministrativeAreaFilterScope => ({
  id,
  code,
  name,
  level: "PROVINCE",
});

const area = (
  id: string,
  code: string,
  name: string,
  level: string,
  parentAreaId?: string | null,
  parentOfficialCode?: string | null,
): AdministrativeAreaFilterScope => ({
  id,
  code,
  officialCode: code,
  name,
  level,
  parentAreaId,
  parentOfficialCode,
});

describe("deteksi level wilayah", () => {
  it("mengenali level provinsi dan kota/kabupaten", () => {
    expect(isProvinceLevel("PROVINCE")).toBe(true);
    expect(isProvinceLevel("PROVINSI")).toBe(true);
    expect(isRegencyLevel("CITY")).toBe(true);
    expect(isRegencyLevel("KABUPATEN")).toBe(true);
    expect(isRegencyLevel("PROVINCE")).toBe(false);
  });
});

describe("deteksi DKI Jakarta", () => {
  it("mengenali provinsi DKI dari kode 31", () => {
    expect(isDkiJakartaProvinceOption(province("a", "31", "DKI Jakarta"))).toBe(true);
  });

  it("mengenali provinsi DKI dari nama", () => {
    expect(isDkiJakartaProvinceOption(province("a", "11", "Daerah Khusus Ibukota Jakarta"))).toBe(true);
  });

  it("tidak menganggap provinsi lain sebagai DKI", () => {
    expect(isDkiJakartaProvinceOption(province("b", "32", "Jawa Barat"))).toBe(false);
  });

  it("mengenali area DKI dari prefix kode", () => {
    expect(isDkiAreaScope(province("c", "31.01", "Jakarta Selatan"))).toBe(true);
    expect(isDkiAreaScope(province("d", "32.01", "Bandung"))).toBe(false);
  });

  it("menemukan provinsi DKI dalam daftar", () => {
    const areas = [
      province("a", "32", "Jawa Barat"),
      province("b", "31", "DKI Jakarta"),
      province("c", "33", "Jawa Tengah"),
    ];
    expect(findDkiJakartaProvinceFilterId(areas)).toBe("b");
  });
});

describe("resolveAreaFilterSelection", () => {
  it("mengembalikan pilihan kosong untuk area yang tidak dikenal", () => {
    const result = resolveAreaFilterSelection([], "unknown");
    expect(result.provinceFilter).toBe("ALL");
    expect(result.selectedArea).toBeNull();
  });

  it("meresolusi seleksi provinsi", () => {
    const areas = [province("p1", "31", "DKI Jakarta")];
    const result = resolveAreaFilterSelection(areas, "p1");
    expect(result.provinceFilter).toBe("p1");
    expect(result.regencyFilter).toBe("ALL");
  });
});

describe("buildProvinceFilterOptions", () => {
  it("hanya menyertakan level provinsi dan mengurutkan", () => {
    const areas = [
      province("p2", "32", "Jawa Barat"),
      province("p1", "31", "DKI Jakarta"),
      { id: "k1", code: "31.01", name: "Jakarta Selatan", level: "CITY" },
    ];
    const options = buildProvinceFilterOptions(areas);
    expect(options.map((item) => item.name)).toEqual(["DKI Jakarta", "Jawa Barat"]);
  });
});

describe("opsi filter wilayah berjenjang", () => {
  const areas = [
    area("p31", "31", "DKI Jakarta", "PROVINCE"),
    area("p32", "32", "Jawa Barat", "PROVINCE"),
    area("c3174", "31.74", "Jakarta Selatan", "CITY", null, "31"),
    area("c3273", "32.73", "Kota Bandung", "CITY", "p32"),
    area("d317401", "31.74.01", "Kebayoran Baru", "DISTRICT", null, "31.74"),
    area("d327301", "32.73.01", "Coblong", "DISTRICT", "c3273"),
    area("v3174011001", "31.74.01.1001", "Selong", "URBAN_VILLAGE", null, "31.74.01"),
    area("v3273011001", "32.73.01.1001", "Dago", "VILLAGE", "d327301"),
  ];

  it("membatasi Kota/Kabupaten ke Provinsi terpilih", () => {
    expect(buildRegencyFilterOptions(areas, "p31").map((item) => item.name)).toEqual(["Jakarta Selatan"]);
  });

  it("membatasi Kecamatan ke Kota/Kabupaten terpilih", () => {
    expect(buildDistrictFilterOptions(areas, "c3174").map((item) => item.name)).toEqual(["Kebayoran Baru"]);
  });

  it("membatasi Kelurahan/Desa ke Kecamatan terpilih", () => {
    expect(buildVillageFilterOptions(areas, "d317401").map((item) => item.name)).toEqual(["Selong"]);
  });
});
