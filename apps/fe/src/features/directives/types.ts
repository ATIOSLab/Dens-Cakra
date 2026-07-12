import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";

export type AccessAreaScope = {
  areaId: string;
  code: string;
  name: string;
  level: string;
  isPrimary: boolean;
};

export type AccessContextResource = {
  user?: {
    id?: string;
    email?: string;
    name?: string;
    role?: string;
  } | null;
  availableRoles?: string[];
  authorizationContext: {
    authUserId: string;
    authRole: string;
    userProfileId: string;
    primaryAssignmentId: string;
    positionId: string;
    positionTitle: string;
    roleCode: string;
    organizationUnitId: string;
    organizationUnitName: string;
    permissions: string[];
    areaScopes: AccessAreaScope[];
  };
};

export type OrganizationUnitOption = {
  id: string;
  code: string;
  name: string;
  type: string;
};

export type PositionAssignmentOption = {
  id: string;
  userProfile?: {
    fullName?: string | null;
    username?: string | null;
  } | null;
};

export type PositionOption = {
  id: string;
  seatCode: string;
  title: string;
  role?: {
    code?: string;
    name?: string;
  } | null;
  organizationUnit?: {
    id: string;
    name: string;
  } | null;
  assignments?: PositionAssignmentOption[];
};

export type AreaNode = {
  id: string;
  code: string;
  name: string;
  level: string;
  parentId?: string | null;
  children?: AreaNode[];
};

export type ProvinceOption = {
  id: string;
  code: string;
  name: string;
  level: string;
  hasActiveBoundary?: boolean;
};

export type ProvinceBoundaryProperties = {
  areaId: string;
  name: string;
  code?: string;
  level?: string;
  selected?: boolean;
  hasRecipient?: boolean;
  recipientCount?: number;
};

export type ProvinceBoundaryFeature = Feature<
  Polygon | MultiPolygon,
  ProvinceBoundaryProperties
>;

export type ProvinceBoundaryCollection = FeatureCollection<
  Polygon | MultiPolygon,
  ProvinceBoundaryProperties
>;

export type RegionalAssignmentOption = {
  id: string;
  positionId: string;
  positionTitle: string;
  positionCode: string;
  organizationUnitId: string;
  organizationUnitName: string;
  assigneeName?: string | null;
  assigneeUsername?: string | null;
  areaScopes: AccessAreaScope[];
};

export type RegionalRecipientPreview = {
  provinceId: string;
  provinceCode: string;
  provinceName: string;
  recipients: RegionalAssignmentOption[];
};

export type DirectiveRecipientResource = {
  id: string;
  status: string;
  targetUnitId?: string | null;
  targetPositionId?: string | null;
  targetUnit?: OrganizationUnitOption | null;
  targetPosition?: PositionOption | null;
  sentAt?: string | null;
  acknowledgedAt?: string | null;
};

export type DirectiveVersionResource = {
  id: string;
  versionNumber: number;
  classification: string;
  commandSource: string;
  commandIssuer: string;
  commandDate: string;
  dueDate?: string | null;
  strategicIssue?: string | null;
  commandDescription: string;
  changeReason?: string | null;
  targetAreas: Array<{
    areaId: string;
    isPrimary: boolean;
    area: {
      id: string;
      code: string;
      name: string;
      level: string;
    };
  }>;
  recipients: DirectiveRecipientResource[];
  tasks?: Array<{
    id: string;
    title: string;
    status: string;
    ownerUnitId: string;
    ownerUnit?: OrganizationUnitOption | null;
    assignments?: Array<{
      id: string;
      status: string;
      assignerAssignmentId: string;
      assigneeAssignmentId: string;
    }>;
  }>;
  uukStrs?: Array<{
    id: string;
    status: string;
    ownerUnit?: OrganizationUnitOption | null;
    versions?: Array<{
      id: string;
      versionNumber: number;
      title: string;
    }>;
  }>;
};

export type DirectiveSummary = {
  id: string;
  commandNumber: string;
  status: string;
  currentVersionNumber: number;
  ownerUnit?: OrganizationUnitOption | null;
  versions: DirectiveVersionResource[];
};

export type DirectiveDetail = DirectiveSummary & {
  createdByAssignment?: {
    id?: string;
    userProfile?: {
      fullName?: string | null;
    } | null;
    position?: {
      title?: string | null;
    } | null;
  } | null;
};

export type DirectiveTracking = {
  directiveId: string;
  versionId?: string | null;
  recipientSummary: Record<string, number>;
  taskSummary: Record<string, number>;
  baketCount: number;
  tasks?: Array<{
    id: string;
    title: string;
    status: string;
    ownerUnitId: string;
    ownerUnit?: OrganizationUnitOption | null;
    assignments?: Array<{
      id: string;
      status: string;
      assignee?: {
        userProfile?: {
          fullName?: string | null;
        } | null;
        position?: {
          title?: string | null;
        } | null;
      } | null;
    }>;
  }>;
};

export type DirectiveRecipientInput = {
  targetUnitId?: string;
  targetPositionId?: string;
};

export type AreaOption = {
  id: string;
  label: string;
  level: string;
};
