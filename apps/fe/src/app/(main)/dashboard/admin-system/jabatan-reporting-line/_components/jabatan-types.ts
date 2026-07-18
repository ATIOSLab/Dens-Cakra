import type { PaginationMeta } from "@/lib/api/types";

import type {
  AreaSearchResult,
  CommandRouteType,
  OrganizationUnitSummary,
  PositionCode,
  RoleCode,
  UserPositionAssignment,
} from "../../pengguna/_components/pengguna-types";

export type PositionAreaCoverage = {
  id: string;
  areaId?: string;
  isPrimary: boolean;
  validFrom?: string;
  validUntil?: string | null;
  area: AreaSearchResult;
};

export type JabatanResource = {
  id: string;
  seatCode: string;
  code: PositionCode;
  title: string;
  branch?: CommandRouteType | "PUSAT" | null;
  isActive: boolean;
  role?: {
    id?: string;
    code: RoleCode;
    name: string;
  } | null;
  organizationUnit?: OrganizationUnitSummary | null;
  reportsTo?: {
    id: string;
    seatCode?: string;
    title: string;
    code?: PositionCode;
  } | null;
  subordinates?: JabatanResource[];
  areaCoverages?: PositionAreaCoverage[];
  assignments?: UserPositionAssignment[];
};

export type JabatanListResource = {
  items: JabatanResource[];
  pagination?: PaginationMeta;
};

export type JabatanListQueryState = {
  q: string;
  roleCode: string;
  positionCode: string;
  unitId: string;
  page: number;
  limit: number;
};

export const BRANCH_OPTIONS: Array<{ value: CommandRouteType | "PUSAT"; label: string }> = [
  { value: "PUSAT", label: "Pusat" },
  { value: "BINDA", label: "Binda" },
  { value: "DIRECTORATE", label: "Direktorat" },
];
