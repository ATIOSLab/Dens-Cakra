export type RegionalMasterDeputyOption = {
  id: string;
  code: string;
  name: string;
};

export type RegionalMasterProvinceArea = {
  id: string;
  code: string;
  name: string;
  level: string;
  isActive: boolean;
  centroidLatitude: number | null;
  centroidLongitude: number | null;
};

export type RegionalMasterBinda = {
  unitId: string;
  code: string;
  name: string;
  parentUnitId: string | null;
  parentUnitCode: string | null;
  parentUnitName: string | null;
};

export type RegionalMasterDirectorate = {
  unitId: string;
  code: string;
  name: string;
  profileCode: string | null;
  parentUnitId: string | null;
  parentUnitCode: string | null;
  parentUnitName: string | null;
  primaryProvinceAreaId: string | null;
  coverageAreas: Array<{
    areaId: string;
    code: string;
    name: string;
    level: string;
    isPrimary: boolean;
  }>;
};

export type RegionalMasterProvinceSummary = {
  province: RegionalMasterProvinceArea;
  binda: RegionalMasterBinda | null;
  directorates: RegionalMasterDirectorate[];
};

export type RegionalMasterOverview = {
  totals: {
    provinceCount: number;
    bindaCount: number;
    directorateCount: number;
    coveredProvinceCount: number;
  };
  deputyOptions: RegionalMasterDeputyOption[];
  provinces: RegionalMasterProvinceSummary[];
};
