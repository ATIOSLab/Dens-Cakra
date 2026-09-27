import React from "react";

import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";

import type { JaringReportData } from "../types/jaring-report.types";
import { JaringReportDocument } from "./jaring-report-document";

const mockReportData: JaringReportData = {
  meta: {
    title: "BUKU PROFILING DAN REKAPITULASI DATA JARING",
    generatedAt: "2026-09-27T12:00:00.000Z",
    area: {
      id: "area-dki",
      name: "Provinsi DKI Jakarta",
      level: "PROVINCE",
    },
    granularity: "PROVINCE_CITY",
    options: {
      includeCover: true,
      includeMap: true,
      includeToc: true,
      includeRecap: true,
      includeInfographic: true,
    },
  },
  summary: {
    total: 3,
    active: 2,
    inactive: 1,
    activePercentage: 66.7,
    inactivePercentage: 33.3,
  },
  wilayah: {
    citiesRanked: [
      { cityName: "Kota Adm. Jakarta Selatan", totalJaring: 2, percentage: 66.7 },
      { cityName: "Kota Adm. Jakarta Pusat", totalJaring: 1, percentage: 33.3 },
    ],
    dkiCounts: {
      jakartaPusat: 1,
      jakartaUtara: 0,
      jakartaBarat: 0,
      jakartaSelatan: 2,
      jakartaTimur: 0,
      kepulauanSeribu: 0,
      lainnya: 0,
    },
  },
  gender: {
    items: [
      { label: 'Pria', count: 2, percentage: 66.7, color: '#0284c7' },
      { label: 'Wanita', count: 1, percentage: 33.3, color: '#ec4899' },
    ],
  },
  ageGroups: {
    items: [
      { range: '< 25', count: 0, percentage: 0 },
      { range: '25–34', count: 1, percentage: 33.3 },
      { range: '35–44', count: 1, percentage: 33.3 },
      { range: '45–54', count: 1, percentage: 33.3 },
      { range: '≥ 55', count: 0, percentage: 0 },
    ],
  },
  generations: {
    items: [
      { name: 'Gen Z', birthRange: '1997–2012', count: 1, percentage: 33.3 },
      { name: 'Milenial', birthRange: '1981–1996', count: 1, percentage: 33.3 },
      { name: 'Gen X', birthRange: '1965–1980', count: 1, percentage: 33.3 },
      { name: 'Baby Boomer', birthRange: '1946–1964', count: 0, percentage: 0 },
    ],
  },
  occupations: {
    topCategories: [
      { name: 'Wiraswasta', count: 2, percentage: 66.7 },
      { name: 'Karyawan Swasta', count: 1, percentage: 33.3 },
    ],
  },
  statuses: {
    items: [
      {
        label: 'Aktif (Siap Ops)',
        count: 2,
        percentage: 66.7,
        color: '#16a34a',
      },
      {
        label: 'Tidak Aktif (Pasif)',
        count: 1,
        percentage: 33.3,
        color: '#ca8a04',
      },
    ],
  },
  groups: [
    {
      provinceName: "DKI Jakarta",
      totalJaring: 3,
      cities: [
        {
          cityName: "Kota Adm. Jakarta Selatan",
          totalJaring: 2,
          occupations: [{ name: "Wiraswasta", count: 2 }],
          districts: [
            {
              districtName: "Kebayoran Baru",
              totalJaring: 2,
              occupations: [{ name: "Wiraswasta", count: 2 }],
              villages: [
                {
                  villageName: "Senayan",
                  totalJaring: 2,
                  occupations: [{ name: "Wiraswasta", count: 2 }],
                  items: [],
                },
              ],
              items: [],
            },
          ],
          items: [
            {
              id: "jar-1",
              fullName: "Ahmad Fauzi",
              aliasName: "Elang-01",
              nationalIdNumber: "3171010101900001",
              address: "Jl. Senayan No. 12",
              birthPlace: "Jakarta",
              birthDate: "1990-05-15",
              gender: "LAKI-LAKI",
              status: "ACTIVE",
              lastReportAt: "2026-09-20T10:00:00.000Z",
              jobTitle: "Manajer Operasional",
              workplace: "PT Mega Sentosa",
              occupationName: "Wiraswasta",
              whatsappNumber: "081234567890",
              organizationName: "Paguyuban Warga",
              notes: "Jaring strategis bidang ekonomi",
              provinceName: "DKI Jakarta",
              cityName: "Kota Adm. Jakarta Selatan",
              districtName: "Kebayoran Baru",
              villageName: "Senayan",
              gaswilName: "Budi Santoso",
              profilingRows: [
                { label: "NIK", val: "3171010101900001" },
                { label: "TTL", val: "Jakarta, 15/05/1990" },
                { label: "Alamat", val: "Jl. Senayan No. 12" },
                { label: "Pekerjaan", val: "Wiraswasta" },
                { label: "No. HP", val: "081234567890" },
                { label: "Organisasi", val: "Paguyuban Warga" },
                { label: "Wilayah", val: "Senayan, Kebayoran Baru" },
                { label: "Gaswil", val: "Budi Santoso" },
              ],
            },
            {
              id: "jar-2",
              fullName: "Hendra Gunawan",
              aliasName: "Rajawali-02",
              nationalIdNumber: "3171010101850002",
              address: "Jl. Gandaria No. 45",
              birthPlace: "Bandung",
              birthDate: "1985-08-20",
              gender: "LAKI-LAKI",
              status: "ACTIVE",
              lastReportAt: "2026-09-22T08:00:00.000Z",
              jobTitle: "Wirausaha",
              workplace: "CV Berkah",
              occupationName: "Wiraswasta",
              whatsappNumber: "081298765432",
              organizationName: null,
              notes: null,
              provinceName: "DKI Jakarta",
              cityName: "Kota Adm. Jakarta Selatan",
              districtName: "Kebayoran Baru",
              villageName: "Senayan",
              gaswilName: "Budi Santoso",
              profilingRows: [
                { label: "NIK", val: "3171010101850002" },
                { label: "TTL", val: "Bandung, 20/08/1985" },
                { label: "Alamat", val: "Jl. Gandaria No. 45" },
                { label: "Pekerjaan", val: "Wiraswasta" },
                { label: "No. HP", val: "081298765432" },
                { label: "Wilayah", val: "Senayan, Kebayoran Baru" },
                { label: "Gaswil", val: "Budi Santoso" },
              ],
            },
          ],
        },
        {
          cityName: "Kota Adm. Jakarta Pusat",
          totalJaring: 1,
          occupations: [{ name: "Karyawan Swasta", count: 1 }],
          districts: [
            {
              districtName: "Menteng",
              totalJaring: 1,
              occupations: [{ name: "Karyawan Swasta", count: 1 }],
              villages: [
                {
                  villageName: "Gondangdia",
                  totalJaring: 1,
                  occupations: [{ name: "Karyawan Swasta", count: 1 }],
                  items: [],
                },
              ],
              items: [],
            },
          ],
          items: [
            {
              id: "jar-3",
              fullName: "Siti Rahmawati",
              aliasName: null,
              nationalIdNumber: "3171010101950003",
              address: "Jl. Cikini Raya No. 8",
              birthPlace: "Jakarta",
              birthDate: "1995-12-10",
              gender: "PEREMPUAN",
              status: "INACTIVE",
              lastReportAt: null,
              jobTitle: "Staf Administrasi",
              workplace: "PT Media Baru",
              occupationName: "Karyawan Swasta",
              whatsappNumber: "081311223344",
              organizationName: null,
              notes: null,
              provinceName: "DKI Jakarta",
              cityName: "Kota Adm. Jakarta Pusat",
              districtName: "Menteng",
              villageName: "Gondangdia",
              gaswilName: "Agus Pratama",
              profilingRows: [
                { label: "NIK", val: "3171010101950003" },
                { label: "TTL", val: "Jakarta, 10/12/1995" },
                { label: "Alamat", val: "Jl. Cikini Raya No. 8" },
                { label: "Pekerjaan", val: "Karyawan Swasta" },
                { label: "No. HP", val: "081311223344" },
                { label: "Wilayah", val: "Gondangdia, Menteng" },
                { label: "Gaswil", val: "Agus Pratama" },
              ],
            },
          ],
        },
      ],
      items: [],
    },
  ],
  items: [
    {
      id: "jar-1",
      fullName: "Ahmad Fauzi",
      aliasName: "Elang-01",
      nationalIdNumber: "3171010101900001",
      address: "Jl. Senayan No. 12",
      birthPlace: "Jakarta",
      birthDate: "1990-05-15",
      gender: "LAKI-LAKI",
      status: "ACTIVE",
      lastReportAt: "2026-09-20T10:00:00.000Z",
      jobTitle: "Manajer Operasional",
      workplace: "PT Mega Sentosa",
      occupationName: "Wiraswasta",
      whatsappNumber: "081234567890",
      organizationName: "Paguyuban Warga",
      notes: "Jaring strategis bidang ekonomi",
      provinceName: "DKI Jakarta",
      cityName: "Kota Adm. Jakarta Selatan",
      districtName: "Kebayoran Baru",
      villageName: "Senayan",
      gaswilName: "Budi Santoso",
      profilingRows: [
        { label: "NIK", val: "3171010101900001" },
        { label: "TTL", val: "Jakarta, 15/05/1990" },
        { label: "Alamat", val: "Jl. Senayan No. 12" },
        { label: "Pekerjaan", val: "Wiraswasta" },
        { label: "No. HP", val: "081234567890" },
        { label: "Organisasi", val: "Paguyuban Warga" },
        { label: "Wilayah", val: "Senayan, Kebayoran Baru" },
        { label: "Gaswil", val: "Budi Santoso" },
      ],
    },
    {
      id: "jar-2",
      fullName: "Hendra Gunawan",
      aliasName: "Rajawali-02",
      nationalIdNumber: "3171010101850002",
      address: "Jl. Gandaria No. 45",
      birthPlace: "Bandung",
      birthDate: "1985-08-20",
      gender: "LAKI-LAKI",
      status: "ACTIVE",
      lastReportAt: "2026-09-22T08:00:00.000Z",
      jobTitle: "Wirausaha",
      workplace: "CV Berkah",
      occupationName: "Wiraswasta",
      whatsappNumber: "081298765432",
      organizationName: null,
      notes: null,
      provinceName: "DKI Jakarta",
      cityName: "Kota Adm. Jakarta Selatan",
      districtName: "Kebayoran Baru",
      villageName: "Senayan",
      gaswilName: "Budi Santoso",
      profilingRows: [
        { label: "NIK", val: "3171010101850002" },
        { label: "TTL", val: "Bandung, 20/08/1985" },
        { label: "Alamat", val: "Jl. Gandaria No. 45" },
        { label: "Pekerjaan", val: "Wiraswasta" },
        { label: "No. HP", val: "081298765432" },
        { label: "Wilayah", val: "Senayan, Kebayoran Baru" },
        { label: "Gaswil", val: "Budi Santoso" },
      ],
    },
    {
      id: "jar-3",
      fullName: "Siti Rahmawati",
      aliasName: null,
      nationalIdNumber: "3171010101950003",
      address: "Jl. Cikini Raya No. 8",
      birthPlace: "Jakarta",
      birthDate: "1995-12-10",
      gender: "PEREMPUAN",
      status: "INACTIVE",
      lastReportAt: null,
      jobTitle: "Staf Administrasi",
      workplace: "PT Media Baru",
      occupationName: "Karyawan Swasta",
      whatsappNumber: "081311223344",
      organizationName: null,
      notes: null,
      provinceName: "DKI Jakarta",
      cityName: "Kota Adm. Jakarta Pusat",
      districtName: "Menteng",
      villageName: "Gondangdia",
      gaswilName: "Agus Pratama",
      profilingRows: [
        { label: "NIK", val: "3171010101950003" },
        { label: "TTL", val: "Jakarta, 10/12/1995" },
        { label: "Alamat", val: "Jl. Cikini Raya No. 8" },
        { label: "Pekerjaan", val: "Karyawan Swasta" },
        { label: "No. HP", val: "081311223344" },
        { label: "Wilayah", val: "Gondangdia, Menteng" },
        { label: "Gaswil", val: "Agus Pratama" },
      ],
    },
  ],
};

describe("JaringReportDocument (React PDF)", () => {
  it("harus memvalidasi single source of truth invariant pada dataset mock", () => {
    expect(mockReportData.summary.total).toBe(mockReportData.items.length);
    expect(mockReportData.summary.active + mockReportData.summary.inactive).toBe(mockReportData.summary.total);
    const sumCities = mockReportData.wilayah.citiesRanked.reduce((acc, c) => acc + c.totalJaring, 0);
    expect(sumCities).toBe(mockReportData.summary.total);
  });

  it("dapat me-render dokumen PDF lengkap ke Buffer tanpa crash", async () => {
    const docElement = React.createElement(JaringReportDocument, {
      data: mockReportData,
    }) as unknown as React.ReactElement<import("@react-pdf/renderer").DocumentProps>;

    const buffer = await renderToBuffer(docElement);

    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(1000);
    // PDF Magic Bytes: %PDF-
    const header = buffer.subarray(0, 5).toString("ascii");
    expect(header).toBe("%PDF-");
  });

  it("dapat me-render empty state tanpa crash ketika 0 item jaring", async () => {
    const emptyData: JaringReportData = {
      ...mockReportData,
      summary: {
        total: 0,
        active: 0,
        inactive: 0,
        activePercentage: 0,
        inactivePercentage: 0,
      },
      wilayah: {
        citiesRanked: [],
        dkiCounts: {
          jakartaPusat: 0,
          jakartaUtara: 0,
          jakartaBarat: 0,
          jakartaSelatan: 0,
          jakartaTimur: 0,
          kepulauanSeribu: 0,
          lainnya: 0,
        },
      },
      gender: { items: [] },
      ageGroups: { items: [] },
      generations: { items: [] },
      occupations: { topCategories: [] },
      statuses: { items: [] },
      groups: [],
      items: [],
    };

    const docElement = React.createElement(JaringReportDocument, {
      data: emptyData,
    }) as unknown as React.ReactElement<import("@react-pdf/renderer").DocumentProps>;

    const buffer = await renderToBuffer(docElement);

    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(500);
    const header = buffer.subarray(0, 5).toString("ascii");
    expect(header).toBe("%PDF-");
  });
});
