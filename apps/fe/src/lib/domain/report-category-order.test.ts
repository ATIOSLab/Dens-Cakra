import { describe, expect, it } from "vitest";

import {
  compareReportCategories,
  sortReportCategories,
} from "@/lib/domain/report-category-order";

describe("compareReportCategories", () => {
  it("mengurutkan sesuai IPOLEKSOSBUDHANKAM", () => {
    const sorted = sortReportCategories([
      { code: "KEAMANAN", name: "Keamanan" },
      { code: "IDEOLOGI", name: "Ideologi" },
      { code: "EKONOMI", name: "Ekonomi" },
      { code: "POLITIK", name: "Politik" },
    ]);

    expect(sorted.map((item) => item.name)).toEqual([
      "Ideologi",
      "Politik",
      "Ekonomi",
      "Keamanan",
    ]);
  });

  it("mengenali sinonim token (HANKAM -> Pertahanan)", () => {
    expect(
      compareReportCategories(
        { code: "HANKAM", name: "Pertahanan Keamanan" },
        { code: "KEAMANAN", name: "Keamanan" },
      ),
    ).toBeLessThan(0);
  });

  it("meletakkan kategori tidak dikenal di akhir", () => {
    const sorted = sortReportCategories([
      { code: "LAINNYA", name: "Lainnya" },
      { code: "POLITIK", name: "Politik" },
    ]);

    expect(sorted.map((item) => item.name)).toEqual(["Politik", "Lainnya"]);
  });

  it("menangani daftar kosong", () => {
    expect(sortReportCategories([])).toEqual([]);
    expect(sortReportCategories(null)).toEqual([]);
  });
});
