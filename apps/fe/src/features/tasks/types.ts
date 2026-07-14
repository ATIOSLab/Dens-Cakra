import type {
  AccessContextResource,
  AreaOption,
  OrganizationUnitOption,
  PositionOption,
} from "@/features/directives/types";
import type { UukDetail } from "@/features/uuk-str/types";

export type TaskAssignmentPerson = {
  id: string;
  userProfile?: {
    fullName?: string | null;
    username?: string | null;
  } | null;
  position?: PositionOption | null;
};

export type TaskAssignmentDetail = {
  id: string;
  taskId: string;
  status: string;
  dueDate?: string | null;
  assignmentNote?: string | null;
  assignerAssignmentId: string;
  assigneeAssignmentId: string;
  assigner?: TaskAssignmentPerson | null;
  assignee?: TaskAssignmentPerson | null;
  progressLogs?: Array<{
    id: string;
    status: string;
    progressPercent?: number | null;
    note?: string | null;
    createdAt: string;
  }>;
  task?: TaskDetail | null;
};

export type TaskSummary = {
  id: string;
  title: string;
  description: string;
  priority: string;
  dueDate?: string | null;
  status: string;
  ownerUnitId: string;
  ownerUnit?: OrganizationUnitOption | null;
  directiveVersion?: {
    id: string;
    classification?: string;
    directive?: {
      id: string;
      commandNumber: string;
    } | null;
  } | null;
  uukStrVersion?: {
    id: string;
    title: string;
    uukStr?: {
      directiveVersion?: {
        id: string;
        classification?: string;
        directive?: {
          id: string;
          commandNumber: string;
        } | null;
      } | null;
    } | null;
    sections?: Array<{
      id: string;
      sectionType: string;
      title: string;
      orderNumber: number;
      items: Array<{
        id: string;
        itemCode: string;
        orderNumber: number;
        content?: string | null;
      }>;
    }>;
  } | null;
  targetAreas: Array<{
    areaId: string;
    area: {
      id: string;
      name: string;
      level: string;
    };
  }>;
  assignments: TaskAssignmentDetail[];
  _count?: {
    assignments: number;
    childTasks: number;
  };
};

export type TaskDetail = TaskSummary & {
  parentTask?: {
    id: string;
    title: string;
    status: string;
    dueDate?: string | null;
  } | null;
  childTasks?: Array<{
    id: string;
    title: string;
    status: string;
    ownerUnit?: OrganizationUnitOption | null;
    _count?: {
      assignments: number;
      childTasks: number;
    };
  }>;
  createdByAssignment?: {
    userProfile?: {
      fullName?: string | null;
    } | null;
    position?: {
      title?: string | null;
    } | null;
  } | null;
};

export type AssignmentCandidate = {
  id: string;
  userProfile?: {
    fullName?: string | null;
  } | null;
  position?: PositionOption | null;
  areaScopes?: Array<{
    area: {
      id: string;
      name: string;
    };
  }>;
};

export type TaskBuilderOptions = {
  access: AccessContextResource;
  directives: Array<{ id: string; label: string }>;
  uuks: Array<{ id: string; label: string }>;
  areaOptions: AreaOption[];
};

export type OimIncomingForwardingSource = UukDetail & {
  currentVersion: UukDetail["versions"][number];
};

export type OimForwardingOptions = {
  access: AccessContextResource;
  areaOptions: AreaOption[];
  areaTree: Array<{
    id: string;
    name: string;
    level: string;
    children?: OimForwardingOptions["areaTree"];
  }>;
  candidates: AssignmentCandidate[];
};
