import { describe, expect, it } from "vitest";

import type {
  PersonnelArea,
  PersonnelListItem,
  PersonnelMapFeature,
} from "@/app/(main)/dashboard/deputi/personil/_components/executive-personnel-types";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import {
  distributionFromEntries,
  type GaswilDistributionAreaCatalog,
  gaswilAreaHierarchy,
  gaswilEntry,
} from "./gaswil-distribution";

const jakartaPusat = {
  id: "city-jakarta-pusat",
  code: "31.71",
  name: "Jakarta Pusat",
  level: "CITY",
};

const joharBaru: PersonnelArea = {
  id: "district-johar-baru",
  code: "31.71.08",
  name: "Johar Baru",
  level: "DISTRICT",
  isPrimary: true,
  ancestors: [
    {
      id: "province-dki",
      code: "31",
      name: "DKI Jakarta",
      level: "PROVINCE",
    },
    jakartaPusat,
  ],
};

const joharBaruWithoutAncestors: PersonnelArea = {
  id: "district-johar-baru",
  code: "31.71.08",
  name: "Johar Baru",
  level: "DISTRICT",
  isPrimary: true,
};

const areaCatalog: GaswilDistributionAreaCatalog = {
  provinces: [
    {
      id: "province-dki",
      code: "31",
      name: "DKI Jakarta",
      level: "PROVINCE",
    },
  ],
  cities: [
    {
      ...jakartaPusat,
      parentId: "province-dki",
    },
  ],
};

function personnel(area: PersonnelArea = joharBaru): PersonnelListItem {
  return {
    id: "profile-1",
    username: null,
    fullName: "Tim Johar Baru",
    email: "gaswil@example.test",
    phone: null,
    status: "ACTIVE",
    isActive: true,
    authRole: "field_officer",
    authBanned: false,
    lastLoginAt: null,
    assignment: {
      id: "assignment-1",
      positionId: "position-1",
      title: "Petugas Wilayah",
      seatCode: "GW-001",
      roleCode: "FIELD_OFFICER",
      roleName: "Petugas Wilayah",
      positionCode: "FIELD_OFFICER",
      unit: {
        id: "unit-1",
        code: "UNIT-1",
        name: "Unit 1",
        type: "DISTRICT",
        branch: "BINDA",
      },
      branch: "BINDA",
      validFrom: "2026-01-01T00:00:00.000Z",
      isPrimary: true,
      isActive: true,
      areas: [area],
    },
    lastLocation: null,
    reportCount: 59,
    jaringCount: 22,
    jaringPreview: [],
  };
}

function mapFeature(area: PersonnelArea = joharBaru): PersonnelMapFeature {
  return {
    type: "Feature",
    id: "feature-1",
    geometry: { type: "Point", coordinates: [106.855, -6.183] },
    properties: {
      assignmentId: "assignment-1",
      userProfileId: "profile-1",
      name: "Tim Johar Baru",
      email: "gaswil@example.test",
      positionTitle: "Petugas Wilayah",
      seatCode: "GW-001",
      unitName: "Johar Baru",
      roleCode: "FIELD_OFFICER",
      status: "STALE",
      markerCode: "G",
      markerColor: "#64748b",
      hasLiveLocation: false,
      capturedAt: "2026-07-29T00:00:00.000Z",
      area,
    },
  };
}

describe("distribusi sebaran Gaswil", () => {
  it("menempatkan area utama kecamatan di bawah Kota/Kabupaten dari ancestor", () => {
    const item = personnel();
    const feature = mapFeature();
    const hierarchy = gaswilAreaHierarchy(item, feature);
    const entry = gaswilEntry(item, feature, SYSTEM_ROLES.EXECUTIVE);

    expect(hierarchy.city?.name).toBe("Jakarta Pusat");
    expect(hierarchy.district?.name).toBe("Johar Baru");
    expect(entry?.cityName).toBe("Jakarta Pusat");
    expect(entry?.districtName).toBe("Johar Baru");
  });

  it("tidak memakai nama kecamatan sebagai opsi Kota/Kabupaten", () => {
    const entry = gaswilEntry(personnel(), mapFeature(), SYSTEM_ROLES.EXECUTIVE);
    const distribution = distributionFromEntries(entry ? [entry] : []);

    expect(distribution).toHaveLength(1);
    expect(distribution[0]?.name).toBe("Jakarta Pusat");
    expect(distribution[0]?.districts.map((district) => district.name)).toEqual(["Johar Baru"]);
  });

  it("meresolusi provinsi dan Kota/Kabupaten dari master wilayah ketika ancestor payload kosong", () => {
    const entry = gaswilEntry(
      personnel(joharBaruWithoutAncestors),
      mapFeature(joharBaruWithoutAncestors),
      SYSTEM_ROLES.EXECUTIVE,
      areaCatalog,
    );
    const distribution = distributionFromEntries(entry ? [entry] : []);

    expect(entry?.provinceName).toBe("DKI Jakarta");
    expect(entry?.cityName).toBe("Jakarta Pusat");
    expect(distribution[0]?.provinceName).toBe("DKI Jakarta");
    expect(distribution[0]?.name).toBe("Jakarta Pusat");
    expect(distribution[0]?.districts.map((district) => district.name)).toEqual(["Johar Baru"]);
  });

  it("menampilkan semua kecamatan dari hierarki Kota/Kabupaten meskipun belum ada personel bertugas", () => {
    const gambirDistrict = {
      id: "district-gambir",
      code: "31.71.01",
      name: "Gambir",
      level: "DISTRICT",
      parentId: "city-jakarta-pusat",
      centroidLatitude: -6.1714,
      centroidLongitude: 106.8181,
    };
    const mentengDistrict = {
      id: "district-menteng",
      code: "31.71.06",
      name: "Menteng",
      level: "DISTRICT",
      parentId: "city-jakarta-pusat",
      centroidLatitude: -6.1958,
      centroidLongitude: 106.8352,
    };
    const joharBaruDistrict = {
      id: "district-johar-baru",
      code: "31.71.08",
      name: "Johar Baru",
      level: "DISTRICT",
      parentId: "city-jakarta-pusat",
      centroidLatitude: -6.1821,
      centroidLongitude: 106.8545,
    };

    const catalogWithDistricts: GaswilDistributionAreaCatalog = {
      ...areaCatalog,
      districts: [joharBaruDistrict, gambirDistrict, mentengDistrict],
    };

    const entry = gaswilEntry(personnel(), mapFeature(), SYSTEM_ROLES.EXECUTIVE, catalogWithDistricts);
    const distribution = distributionFromEntries(entry ? [entry] : [], catalogWithDistricts);

    expect(distribution).toHaveLength(1);
    expect(distribution[0]?.name).toBe("Jakarta Pusat");
    const districts = distribution[0]?.districts ?? [];
    expect(districts.map((d) => d.name)).toEqual(["Gambir", "Johar Baru", "Menteng"]);

    const gambir = districts.find((d) => d.name === "Gambir");
    expect(gambir?.total).toBe(0);
    expect(gambir?.centroidLatitude).toBe(-6.1714);

    const joharBaru = districts.find((d) => d.name === "Johar Baru");
    expect(joharBaru?.total).toBe(1);
    expect(joharBaru?.pending).toBe(1);
    expect(joharBaru?.fieldOfficerCount).toBe(1);

    const menteng = districts.find((d) => d.name === "Menteng");
    expect(menteng?.total).toBe(0);
  });
});
