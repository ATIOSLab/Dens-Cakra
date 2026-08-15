import { describe, expect, it } from "vitest";

import { escapeHtml, getInitials } from "@/lib/utils";

describe("escapeHtml", () => {
  it("melarikan karakter HTML berbahaya", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  });

  it("melarikan ampersand dan kutip tunggal", () => {
    expect(escapeHtml("a & b 'c'")).toBe("a &amp; b &#39;c&#39;");
  });

  it("mengembalikan string kosong untuk null dan undefined", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });

  it("mengonversi nilai non-string ke string", () => {
    expect(escapeHtml(42)).toBe("42");
  });

  it("membiarkan teks biasa tidak berubah", () => {
    expect(escapeHtml("Laporan Jaring")).toBe("Laporan Jaring");
  });
});

describe("getInitials", () => {
  it("mengambil inisial dari nama", () => {
    expect(getInitials("Petugas Wilayah")).toBe("PW");
  });

  it("mengembalikan tanda tanya untuk input kosong", () => {
    expect(getInitials("")).toBe("?");
    expect(getInitials("   ")).toBe("?");
  });
});
