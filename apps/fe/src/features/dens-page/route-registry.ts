import type { QueryParams } from "@/lib/api/types";

export type DensPageArchetype =
  | "dashboard-grid"
  | "list-table"
  | "detail-two-column"
  | "master-detail"
  | "tree-detail"
  | "workflow-workspace"
  | "dynamic-form"
  | "map-workspace";

export type DensEndpointSpec = {
  label: string;
  path: string;
  query?: QueryParams;
  required?: boolean;
};

export type DensRouteSpec = {
  routePattern: string;
  title: string;
  moduleLabel: string;
  roleLabel: string;
  archetype: DensPageArchetype;
  description: string;
  endpoints: DensEndpointSpec[];
  availableActions: string[];
  readonly?: boolean;
};

const roleLabels: Array<[string, string]> = [
  ["/dashboard/admin-system", "Admin Sistem"],
  ["/dashboard/executive", "Eksekutif"],
  ["/dashboard/regional-commander", "Komandan Regional"],
  ["/dashboard/oim", "Manajer Intelijen Operasional"],
  ["/dashboard/field-coordinator", "Koordinator Lapangan"],
  ["/dashboard/field-officer", "Petugas Lapangan"],
];

const titleOverrides: Record<string, string> = {
  oim: "OIM",
  wa: "WA",
  uuk: "UUK",
  str: "STR",
  kpi: "KPI",
};

const routeTitleOverrides: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/profil": "Profil & Keamanan",
  "/dashboard/notifications": "Notifikasi",
  "/dashboard/admin-system": "Dashboard Sistem",
  "/dashboard/oim": "Dashboard OIM",
};

function humanizeSegment(segment: string) {
  if (segment.startsWith("[") && segment.endsWith("]")) {
    return segment.slice(1, -1);
  }

  return segment
    .split("-")
    .map((part) => titleOverrides[part] ?? part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getRoleLabel(routePattern: string) {
  return roleLabels.find(([prefix]) => routePattern.startsWith(prefix))?.[1] ?? "Global";
}

function getModuleLabel(routePattern: string) {
  const segments = routePattern.split("/").filter(Boolean);
  const dashboardIndex = segments.indexOf("dashboard");
  const moduleSegment = segments[dashboardIndex + 1];

  if (!moduleSegment) {
    return "Global";
  }

  return humanizeSegment(moduleSegment);
}

function getTitle(routePattern: string) {
  if (routeTitleOverrides[routePattern]) {
    return routeTitleOverrides[routePattern];
  }

  const staticSegments = routePattern.split("/").filter((segment) => segment && !segment.startsWith("["));
  const last = staticSegments.at(-1) ?? "dashboard";

  if (["baru", "edit", "revisi", "boundary", "tracking", "distribution", "reporting-line"].includes(last)) {
    return humanizeSegment(last);
  }

  return humanizeSegment(last);
}

function getArchetype(routePattern: string): DensPageArchetype {
  if (routePattern.includes("/peta") || routePattern.includes("map")) {
    return "map-workspace";
  }
  if (routePattern.includes("/baru") || routePattern.includes("/edit") || routePattern.includes("/revisi")) {
    return "dynamic-form";
  }
  if (
    routePattern.includes("/persetujuan") ||
    routePattern.includes("/verification") ||
    routePattern.includes("/verifikasi") ||
    routePattern.includes("/penugasan") ||
    routePattern.includes("/workflow")
  ) {
    return "workflow-workspace";
  }
  if (
    routePattern.includes("/organisasi-wilayah") ||
    routePattern.includes("/jabatan-reporting-line") ||
    routePattern.includes("/role-hak-akses")
  ) {
    return "master-detail";
  }
  if (routePattern.includes("[") || routePattern.includes("/versions/")) {
    return "detail-two-column";
  }
  if (routePattern.endsWith("/dashboard") || routePattern.split("/").filter(Boolean).length <= 3) {
    return "dashboard-grid";
  }

  return "list-table";
}

function replaceParams(path: string, params: Record<string, string>) {
  return path.replace(/\{([^}]+)\}/g, (_, key: string) => params[key] ?? `{${key}}`);
}

function detailEndpoint(routePattern: string, params: Record<string, string>): DensEndpointSpec | null {
  const byParam: Array<[string, string, string]> = [
    ["userProfileId", "User profile detail", "/user-profiles/{userProfileId}"],
    ["roleId", "Role detail", "/roles/{roleId}"],
    ["channelId", "Integration channel detail", "/integration-channels/{channelId}"],
    ["eventId", "Webhook event detail", "/webhook-events/{eventId}"],
    ["positionId", "Position detail", "/positions/{positionId}"],
    ["auditLogId", "Audit log detail", "/audit-logs/{auditLogId}"],
    ["settingKey", "System setting detail", "/system/settings/{settingKey}"],
    ["policyId", "Position area policy detail", "/position-area-policies/{policyId}"],
    ["productTypeId", "Product type detail", "/product-types/{productTypeId}"],
    ["templateId", "Product template detail", "/product-templates/{templateId}"],
    ["unitId", "Organization unit detail", "/organization-units/{unitId}"],
    ["areaId", "Administrative area detail", "/administrative-areas/{areaId}"],
    ["stepId", "Approval step detail", "/approval-steps/{stepId}"],
    ["productId", "Product detail", "/products/{productId}"],
    ["directiveId", "Directive detail", "/directives/{directiveId}"],
    ["uukStrId", "UUK/STR detail", "/uuk-strs/{uukStrId}"],
    ["incidentId", "Emergency incident detail", "/emergency-incidents/{incidentId}"],
    ["alertId", "Alert detail", "/alerts/{alertId}"],
    ["taskId", "Task detail", "/tasks/{taskId}"],
    ["jaringId", "Jaring detail", "/jaring/{jaringId}"],
    ["baketId", "Baket detail", "/bakets/{baketId}"],
    ["messageId", "WhatsApp message detail", "/whatsapp-messages/{messageId}"],
    ["caseId", "Analysis case detail", "/analysis-cases/{caseId}"],
    ["verificationId", "Verification detail", "/verifications/{verificationId}"],
    ["workflowId", "Approval workflow detail", "/approval-workflows/{workflowId}"],
    ["jobId", "Import job detail", "/administrative-area-imports/{jobId}"],
  ];

  if (params.versionId) {
    if (
      routePattern.includes("baket") ||
      routePattern.includes("laporan-saya") ||
      routePattern.includes("laporan-masuk")
    ) {
      return { label: "Baket version detail", path: `/baket-versions/${params.versionId}`, required: true };
    }
    if (routePattern.includes("analisis")) {
      return { label: "Analysis version detail", path: `/analysis-versions/${params.versionId}`, required: true };
    }
    if (routePattern.includes("direktif")) {
      return { label: "Directive version detail", path: `/directive-versions/${params.versionId}`, required: true };
    }
    if (routePattern.includes("uuk") || routePattern.includes("str")) {
      return { label: "UUK/STR version detail", path: `/uuk-str-versions/${params.versionId}`, required: true };
    }
    return { label: "Product version detail", path: `/product-versions/${params.versionId}`, required: true };
  }

  if (params.assignmentId) {
    const path = routePattern.includes("personel")
      ? `/position-assignments/${params.assignmentId}`
      : `/task-assignments/${params.assignmentId}`;
    return { label: "Assignment detail", path, required: true };
  }

  const match = byParam.find(([param]) => params[param]);
  if (!match) {
    return null;
  }

  return { label: match[1], path: replaceParams(match[2], params), required: true };
}

function listEndpoints(routePattern: string, search: QueryParams): DensEndpointSpec[] {
  const query: QueryParams = { ...search, limit: search.limit ?? 10 };
  const mapQuery: QueryParams = {
    ...query,
    bbox: query.bbox ?? "94,-12,142,8",
    zoom: query.zoom ?? 5,
    limit: query.limit ?? 500,
  };

  if (routePattern === "/dashboard") {
    return [
      { label: "Me", path: "/me", required: true },
      { label: "Authorization context", path: "/me/authorization-context" },
    ];
  }
  if (routePattern.includes("notifications")) {
    return [
      { label: "Notification feed", path: "/notifications", query },
      { label: "Unread count", path: "/notifications/unread-count" },
    ];
  }
  if (routePattern.includes("laporan-briefing")) {
    return [{ label: "Dashboard briefing", path: "/dashboard/briefing", query }];
  }
  if (routePattern.includes("profil")) {
    return [
      { label: "Profile", path: "/me", required: true },
      { label: "Authorization context", path: "/me/authorization-context" },
      { label: "Area scopes", path: "/me/area-scopes" },
    ];
  }
  if (routePattern.includes("pengguna")) {
    return [{ label: "User profiles", path: "/user-profiles", query }];
  }
  if (routePattern.includes("role-hak-akses")) {
    return [
      { label: "Roles", path: "/roles" },
      { label: "Permissions", path: "/permissions" },
    ];
  }
  if (routePattern.includes("organisasi-wilayah")) {
    return [
      { label: "Organization units", path: "/organization-units", query },
      { label: "Administrative areas", path: "/administrative-areas", query },
    ];
  }
  if (routePattern.includes("jabatan-reporting-line") || routePattern.includes("personel")) {
    return [
      { label: "Positions", path: "/positions", query },
      { label: "Assignments", path: "/position-assignments", query },
    ];
  }
  if (routePattern.includes("integrasi-wa-center")) {
    return [{ label: "Integration channels", path: "/integration-channels", query }];
  }
  if (routePattern.includes("keamanan-audit")) {
    return [{ label: "Audit logs", path: "/audit-logs", query }];
  }
  if (routePattern.includes("konfigurasi-sistem")) {
    return [
      { label: "System settings", path: "/system/settings" },
      { label: "System diagnostics", path: "/system/diagnostics" },
    ];
  }
  if (routePattern.includes("master-data")) {
    return [
      { label: "Reference enums", path: "/reference-data/enums" },
      { label: "Product types", path: "/product-types" },
      { label: "Area policies", path: "/position-area-policies" },
    ];
  }
  if (routePattern.includes("peta")) {
    return [
      { label: "Map reports", path: "/map/reports", query: mapQuery },
      { label: "Map tasks", path: "/map/tasks", query: mapQuery },
      { label: "Map alerts", path: "/map/alerts", query: mapQuery },
      { label: "Map emergencies", path: "/map/emergencies", query: mapQuery },
    ];
  }
  if (routePattern.includes("peringatan-dini") || routePattern.includes("alert")) {
    return [{ label: "Alerts", path: "/alerts", query }];
  }
  if (routePattern.includes("darurat") || routePattern.includes("operasi-darurat")) {
    return [{ label: "Emergency incidents", path: "/emergency-incidents", query }];
  }
  if (routePattern.includes("direktif")) {
    return [{ label: "Directives", path: "/directives", query }];
  }
  if (routePattern.includes("uuk") || routePattern.includes("str")) {
    return [{ label: "UUK/STR", path: "/uuk-strs", query }];
  }
  if (routePattern.includes("tugas") || routePattern.includes("monitoring")) {
    return [{ label: "Tasks", path: "/tasks", query }];
  }
  if (routePattern.includes("jaring")) {
    return [{ label: "Jaring", path: "/jaring", query }];
  }
  if (routePattern.includes("kotak-masuk")) {
    return [{ label: "WhatsApp inbox", path: "/whatsapp-messages", query }];
  }
  if (routePattern.includes("baket") || routePattern.includes("laporan")) {
    return [{ label: "Baket", path: "/bakets", query }];
  }
  if (routePattern.includes("verifikasi")) {
    return [{ label: "Verifications", path: "/verifications", query }];
  }
  if (routePattern.includes("analisis")) {
    return [{ label: "Analysis cases", path: "/analysis-cases", query }];
  }
  if (routePattern.includes("persetujuan")) {
    return [{ label: "Approval inbox", path: "/approval-inbox", query }];
  }
  if (routePattern.includes("produk-intelijen")) {
    return [{ label: "Products", path: "/products", query }];
  }
  if (routePattern.includes("distrib")) {
    return [{ label: "Distributions", path: "/distributions", query }];
  }

  return [
    { label: "Dashboard overview", path: "/dashboard/overview", query },
    { label: "Dashboard KPIs", path: "/dashboard/kpis", query },
  ];
}

function actionsFor(archetype: DensPageArchetype, routePattern: string) {
  if (archetype === "dynamic-form") {
    return ["Simpan draft", "Validasi", "Kirim"];
  }
  if (archetype === "workflow-workspace") {
    return ["Setujui", "Minta revisi", "Tolak"];
  }
  if (archetype === "map-workspace") {
    return ["Refresh layer", "Buka detail", "Export viewport"];
  }
  if (routePattern.includes("notifications")) {
    return ["Tandai dibaca", "Tandai semua dibaca"];
  }
  if (archetype === "detail-two-column") {
    return ["Buka timeline", "Lihat traceability"];
  }

  return ["Filter", "Refresh", "Buka detail"];
}

export function getDensRouteSpec(
  routePattern: string,
  params: Record<string, string>,
  search: QueryParams,
): DensRouteSpec {
  const archetype = getArchetype(routePattern);
  const primaryDetail = detailEndpoint(routePattern, params);
  const endpoints = primaryDetail ? [primaryDetail] : listEndpoints(routePattern, search);
  const title = getTitle(routePattern);

  return {
    routePattern,
    title,
    moduleLabel: getModuleLabel(routePattern),
    roleLabel: getRoleLabel(routePattern),
    archetype,
    description:
      archetype === "dashboard-grid"
        ? "Ringkasan operasional role dengan KPI, antrean prioritas, dan status sistem."
        : "Halaman operasional terhubung ke API DENS CAKRA dengan filter URL, scope, dan state server-authoritative.",
    endpoints,
    availableActions: actionsFor(archetype, routePattern),
    readonly: routePattern.includes("/versions/") || routePattern.includes("/tracking"),
  };
}
