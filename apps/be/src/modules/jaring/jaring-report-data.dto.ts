import {
  AdministrativeLevel,
} from '../../generated/prisma/client.js';

export type OccupationStat = {
  name: string;
  count: number;
};

export type FormattedJaring = {
  id: string;
  fullName: string;
  aliasName: string | null;
  nationalIdNumber: string | null;
  address: string | null;
  birthPlace: string | null;
  birthDate: Date | null;
  gender: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  lastReportAt?: string | null;
  jobTitle: string | null;
  workplace: string | null;
  occupationName: string | null;
  whatsappNumber: string;
  organizationName: string | null;
  notes: string | null;
  provinceName: string;
  cityName: string;
  districtName: string;
  villageName: string;
  gaswilName: string;
  profilePhotoFileId?: string | null;
  profilePhotoStorageKey: string | null;
  profilingRows?: Array<{ label: string; val: string }>;
};

export type VillageGroup = {
  villageName: string;
  totalJaring: number;
  occupations: OccupationStat[];
  items: FormattedJaring[];
};

export type DistrictGroup = {
  districtName: string;
  totalJaring: number;
  occupations: OccupationStat[];
  villages: VillageGroup[];
  items: FormattedJaring[];
};

export type CityGroup = {
  cityName: string;
  totalJaring: number;
  occupations: OccupationStat[];
  districts: DistrictGroup[];
  items: FormattedJaring[];
};

export type ProvinceGroup = {
  provinceName: string;
  totalJaring: number;
  cities: CityGroup[];
  items: FormattedJaring[];
};

export type ProfilingStatistics = {
  summary: {
    total: number;
    active: number;
    inactive: number;
    activePercentage: number;
    inactivePercentage: number;
  };
  wilayah: {
    citiesRanked: Array<{
      cityName: string;
      totalJaring: number;
      percentage: number;
    }>;
    dkiCounts: {
      jakartaPusat: number;
      jakartaUtara: number;
      jakartaBarat: number;
      jakartaSelatan: number;
      jakartaTimur: number;
      kepulauanSeribu: number;
      lainnya: number;
    };
  };
  gender: {
    items: Array<{
      label: string;
      count: number;
      percentage: number;
      color: string;
    }>;
  };
  ageGroups: {
    items: Array<{
      range: string;
      count: number;
      percentage: number;
    }>;
  };
  generations: {
    items: Array<{
      name: string;
      birthRange: string;
      count: number;
      percentage: number;
    }>;
  };
  occupations: {
    topCategories: Array<{
      name: string;
      count: number;
      percentage: number;
    }>;
  };
  statuses: {
    items: Array<{
      label: string;
      count: number;
      percentage: number;
      color: string;
    }>;
  };
};

export enum RecapGranularity {
  PROVINCE_CITY = 'PROVINCE_CITY',
  CITY_DISTRICT_VILLAGE = 'CITY_DISTRICT_VILLAGE',
  DISTRICT_VILLAGE = 'DISTRICT_VILLAGE',
  VILLAGE = 'VILLAGE',
}

export type JaringReportMeta = {
  title: string;
  generatedAt: string;
  area: {
    id: string;
    name: string;
    level: AdministrativeLevel;
  } | null;
  granularity: RecapGranularity;
  options: {
    includeCover: boolean;
    includeMap: boolean;
    includeToc: boolean;
    includeRecap: boolean;
    includeInfographic: boolean;
  };
};

export type JaringReportDataDto = {
  meta: JaringReportMeta;
  summary: ProfilingStatistics['summary'];
  wilayah: ProfilingStatistics['wilayah'];
  gender: ProfilingStatistics['gender'];
  ageGroups: ProfilingStatistics['ageGroups'];
  generations: ProfilingStatistics['generations'];
  occupations: ProfilingStatistics['occupations'];
  statuses: ProfilingStatistics['statuses'];
  groups: ProvinceGroup[];
  items: FormattedJaring[];
};
