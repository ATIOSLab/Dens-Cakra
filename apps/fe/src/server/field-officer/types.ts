export const DEFAULT_FIELD_OFFICER_ID = "fo-bangkinang-001";

export type FieldTaskPriority = "High" | "Medium";
export type FieldTaskStatus = "In Progress" | "Pending" | "Completed";
export type IncomingStatus = "Routed" | "Under Validation" | "Valid" | "Invalid" | "Converted" | "Closed";
export type BaketStatus = "Draft" | "Submitted" | "Returned" | "Verified";
export type WhatsappRole = "AGENT" | "JARING";

export interface FieldOfficer {
  id: string;
  agentUserId: number;
  name: string;
  title: string;
  sector: string;
  commander: string;
}

export interface JaringSource {
  id: string;
  fieldOfficerId: string;
  whatsappUserId: number;
  sourceCode: string;
  alias: string;
  area: string;
  reliability: "A" | "B" | "C";
  registeredAt: string;
  active: boolean;
}

export interface WhatsappUser {
  id: number;
  whatsappId: string;
  name?: string | null;
  role: WhatsappRole;
  authPin: string;
  agentUsername?: string | null;
  agentPasswordPlain?: string | null;
  agentId?: number | null;
  isVerified: boolean;
  createdAt?: string;
}

export interface FieldTask {
  id: string;
  title: string;
  commander: string;
  area: string;
  priority: FieldTaskPriority;
  due: string;
  status: FieldTaskStatus;
  fieldOfficerId: string;
  sourceDirective: string;
}

export interface ReportLocation {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  label: string;
}

export interface IncomingInformation {
  id: string;
  reportId: number;
  whatsappId: string;
  jaringId: string;
  fieldOfficerId: string;
  sourceCode: string;
  receivedAt: string;
  area: string;
  summary: string;
  content: string;
  status: IncomingStatus;
  photoUrl?: string | null;
  location?: ReportLocation | null;
  validatedBy?: string | null;
  validatedAt?: string | null;
  closedAt?: string | null;
  closureReason?: string | null;
}

export interface BaketDraft {
  id: string;
  sourceRef: string;
  incomingInformationId: string;
  fieldOfficerId: string;
  title: string;
  area: string;
  status: BaketStatus;
  completeness: string;
  summaryHtml?: string;
  summaryUpdatedAt?: string;
  submittedAt?: string;
}

export interface LocationPin {
  id: number;
  incomingInformationId: string;
  jaringId: string;
  sourceCode: string;
  submitter: string;
  area: string;
  content: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  status: IncomingStatus;
  createdAt: string;
}

export interface FieldOfficerWorkspace {
  fieldOfficer: FieldOfficer;
  jaring: JaringSource[];
  tasks: FieldTask[];
  forwardedTaskIds: string[];
  incomingItems: IncomingInformation[];
  baketItems: BaketDraft[];
  locationPins: LocationPin[];
}
