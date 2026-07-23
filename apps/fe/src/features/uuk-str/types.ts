import type { AreaOption, OrganizationUnitOption, PositionOption } from "@/features/directives/types";

export type UukDirectiveOption = {
  id: string;
  commandNumber: string;
  currentVersionNumber: number;
  versions: Array<{
    id: string;
    versionNumber: number;
    commandIssuer: string;
    commandDate: string;
    commandDescription?: string;
    classification?: string;
    dueDate?: string | null;
  }>;
  ownerUnit?: OrganizationUnitOption | null;
};

export type UukSectionItem = {
  id?: string;
  itemCode: string;
  content: string;
  orderNumber: number;
};

export type UukSection = {
  id?: string;
  sectionType: string;
  title: string;
  orderNumber: number;
  items: UukSectionItem[];
};

export type UukVersionResource = {
  id: string;
  versionNumber: number;
  title: string;
  createdAt?: string | null;
  changeReason?: string | null;
  sections: UukSection[];
  tasks?: Array<{
    id: string;
    title: string;
    status: string;
    ownerUnit?: OrganizationUnitOption | null;
  }>;
};

export type UukSummary = {
  id: string;
  status: string;
  currentVersionNumber: number;
  ownerUnit?: OrganizationUnitOption | null;
  directiveVersion?: {
    id: string;
    classification?: string;
    dueDate?: string | null;
    directive?: UukDirectiveOption | null;
    targetAreas?: Array<{
      areaId: string;
      isPrimary: boolean;
      area: {
        id: string;
        code: string;
        name: string;
        level: string;
      };
    }>;
    recipients?: Array<{
      id: string;
      status: string;
      targetUnit?: OrganizationUnitOption | null;
      targetPosition?: PositionOption | null;
    }>;
  } | null;
  versions: UukVersionResource[];
};

export type UukDetail = UukSummary & {
  createdByAssignment?: {
    userProfile?: {
      fullName?: string | null;
    } | null;
  } | null;
};

export type UukEditorOptionSet = {
  directives: UukDirectiveOption[];
  areaOptions: AreaOption[];
};
