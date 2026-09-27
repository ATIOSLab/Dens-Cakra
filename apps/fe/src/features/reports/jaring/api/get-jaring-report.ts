import { apiServerFetch } from "@/lib/api/server-client";
import type { QueryParams } from "@/lib/api/types";

import type { JaringReportData, JaringReportQuery } from "../types/jaring-report.types";

export async function getJaringReportData(query: JaringReportQuery): Promise<JaringReportData> {
  const queryParams: QueryParams = {};

  if (query.title) queryParams.title = query.title;
  if (query.includeCover !== undefined) queryParams.includeCover = String(query.includeCover);
  if (query.includeMap !== undefined) queryParams.includeMap = String(query.includeMap);
  if (query.includeToc !== undefined) queryParams.includeToc = String(query.includeToc);
  if (query.includeRecap !== undefined) queryParams.includeRecap = String(query.includeRecap);
  if (query.includeInfographic !== undefined) queryParams.includeInfographic = String(query.includeInfographic);
  if (query.areaId) queryParams.areaId = query.areaId;
  if (query.jaringIds) queryParams.jaringIds = query.jaringIds;
  if (query.status) queryParams.status = query.status;
  if (query.search) queryParams.search = query.search;
  if (query.fieldOfficerAssignmentId) queryParams.fieldOfficerAssignmentId = query.fieldOfficerAssignmentId;
  if (query.registrationStatus) queryParams.registrationStatus = query.registrationStatus;

  return apiServerFetch<JaringReportData>("/jaring/export/data", {
    query: queryParams,
  });
}
