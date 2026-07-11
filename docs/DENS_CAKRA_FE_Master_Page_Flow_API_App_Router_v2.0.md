# DENS CAKRA Frontend Master Page, Flow, API, and App Router Specification

| Field | Value |
|---|---|
| Product | DENS CAKRA |
| Document | Frontend Master Page, Flow, API, and App Router Specification |
| Version | v2.0 |
| Date | 11 July 2026 |
| Author | Product Architect Pro — System Analyst |
| Status | Draft for Frontend Implementation |
| Baselines | API Contract v1.0, Page/API Matrix v1.0, App Router Mapping v1.1 |

## Revision History

| Version | Date | Description |
|---|---|---|
| v1.0 | 11 July 2026 | Menu-level page and API mapping. |
| v1.1 | 11 July 2026 | Dynamic detail/create/edit/version route mapping. |
| v2.0 | 11 July 2026 | Consolidated complete page purpose, interaction flow, UI data, filters, forms, request/response contracts, query rules, and exact App Router files. |

## 1. Scope and Decision

This document is the implementation bridge between the current Next.js menu tree and the DENS CAKRA API contract. It covers menu pages, dynamic details, create/edit/revision forms, immutable version pages, workflow action pages, map deep-links, and supporting route files.

- Base/menu pages mapped: **72**
- Dynamic/create/edit/version/action page files mapped: **115**
- Total `page.tsx` files in the plan: **185**
- API references validated against OpenAPI: **848** contracted references
- Unique non-contracted references found: **0**

The previously inconsistent Directive actions have been corrected to version-level operations:

```http
POST /api/v1/directive-versions/{versionId}/publish
POST /api/v1/directive-versions/{versionId}/distribute
```

## 2. Next.js App Router Operating Model

### 2.1 Route and Folder Rules

- A folder becomes a URL segment; a route becomes public only when the segment contains `page.tsx` or `route.ts`.
- Use `[resourceId]` for detail route params.
- Use `_components`, `_lib`, `_schemas`, and `_actions` for private non-routable implementation details.
- Use `loading.tsx`, `error.tsx`, and `not-found.tsx` at role/module/detail boundaries.
- Keep pages and layouts as Server Components by default.
- Isolate mapcn, forms, browser geolocation, dialogs, and mutation state in small Client Components.

### 2.2 Frontend and API Separation

The `src/app/dashboard/...` folders define UI routes. The DENS CAKRA `/api/v1/...` contract remains the backend domain API. Do not create a duplicate Next.js `route.ts` for every domain endpoint unless the project intentionally uses Next.js as a BFF/proxy.

Recommended clients:

```text
src/lib/api/server-client.ts   # forwards session/cookies from Server Components
src/lib/api/browser-client.ts  # client mutations and interactive refetch
src/features/<domain>/api/     # typed domain functions
```

### 2.3 Global Page Lifecycle

```text
Better Auth session
→ GET /api/v1/me
→ GET /api/v1/me/authorization-context
→ resolve role workspace and primary assignment
→ read URL filters
→ fetch server-scoped data
→ render page and availableActions
→ execute explicit action endpoint
→ audit/notification on backend
→ invalidate affected frontend queries
```

### 2.4 Standard Detail Lifecycle

```text
List/map selection
→ canonical [resourceId] URL
→ backend permission/scope/clearance check
→ masked 404 when sensitive resource is outside scope
→ render detail, timeline, traceability, availableActions
→ execute an explicit action
→ refresh detail, queue, counters, dashboards, and map layers
```

### 2.5 Standard Form Lifecycle

```text
Load reference data
→ initialize create/edit form
→ client validation
→ server validation
→ create/update draft
→ save returned resource/version ID and ETag
→ explicit submit/publish/approve action
→ redirect to immutable detail or tracking page
```

## 3. mapcn Spatial Page Pattern

mapcn is the presentation layer; PostGIS and the DENS CAKRA API remain the spatial authority.

```text
Controlled map viewport
→ URL-backed bbox/zoom/layer filters
→ debounce 300–500 ms
→ GET boundaries
→ GET cluster/point/heatmap layer
→ click cluster to zoom
→ click point for popup
→ open canonical detail URL
```

Standard map query:

```http
GET /api/v1/map/clusters
  ?bbox={minLng,minLat,maxLng,maxLat}
  &zoom={zoom}
  &areaId={areaId}
  &from={ISO}
  &to={ISO}
  &status={status}
  &urgency={urgency}
```

The server must intersect the viewport with effective organization scope, administrative area scope, clearance, and resource membership. The frontend must never expand scope.

## 4. Complete Base/Menu Page Specification

### 4.1 Global

#### `/dashboard` — Role Dashboard Redirect

**Function:** `redirect` page for Role Dashboard Redirect.

**Page flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed data**

- Loading state
- Access error state

**Filters / URL params**

- No page-level filters; use route params or the current authorization context.

**Actions and navigation**

- Redirect ke workspace berdasarkan business role dan primary assignment

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/me` | Ambil identitas dan profil pengguna aktif | `authenticated` | Tidak ada body. Query opsional: include=primaryAssignment,unit,areaScopes | MeResponse | Resolve Better Auth session; join User→UserProfile→primary active PositionAssignment→Position→Role→OrganizationUnit. Tolak 401 jika session invalid; 423 jika banned/locked; 403 jika profile bukan ACTIVE. |
| `GET` | `/me/authorization-context` | Ambil konteks authorization efektif | `authenticated` | Tidak ada body | AuthorizationContextResponse | Hitung coarse auth role, domain role, permission set, command branch, unit ancestors, area scopes, clearance rank. Response tidak boleh memuat secret permission implementation details di luar kebutuhan UI. |

**Business and UI rules**

- Jangan menentukan workspace hanya dari URL
- Role Better Auth harus cocok dengan domain role

**Form contracts**

No mutation form on this page.

#### `/dashboard/notifications` — Notifications

**Function:** `list` page for Notifications.

**Page flow**

1. Read filters, sorting, and pagination from URL search params.
2. Call the scoped list endpoint and render rows/cards plus filter facets.
3. Selecting a row navigates to the canonical dynamic detail route.
4. After a mutation, invalidate list, counters, dashboard widgets, and map layers affected by the resource.

**Displayed data**

- Unread counter
- Notification feed
- Type badge
- Timestamp
- Deep-link resource

**Filters / URL params**

- `unreadOnly`
- `type`
- `cursor`
- `limit`

**Actions and navigation**

- POST /api/v1/notifications/{notificationId}/read
- POST /api/v1/notifications/read-all

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/notifications` | Notifikasi pengguna | `notification.read-own` | Query: cursor,limit,type,unreadOnly=false,from,to | CursorPage<NotificationResponse> | Filter userProfileId=current user; order createdAt desc. No cross-user access. |
| `GET` | `/notifications/unread-count` | Jumlah unread | `notification.read-own` | Tidak ada body | UnreadCountResponse | COUNT where userProfileId and readAt NULL. Cache short-lived. |
| `POST` | `/notifications/{notificationId}/read` | Tandai satu notifikasi dibaca | `notification.read-own` | Tidak ada body | NotificationResponse | Set readAt if owned. Idempotent. |
| `POST` | `/notifications/read-all` | Tandai semua dibaca | `notification.read-own` | {"before":"ISO optional","types":["TASK","ALERT"] optional} | ActionResultResponse | Bulk update owned notifications matching filter. Return affectedCount. |

**Business and UI rules**

- Deep-link tetap diotorisasi ulang
- Mark read idempotent

**Form contracts**

No mutation form on this page.

#### `/dashboard/profil` — Profile & Security

**Function:** `detail` page for Profile & Security.

**Page flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed data**

- Profile
- Business role
- Position
- Unit
- Clearance
- Area scopes
- Active sessions summary

**Filters / URL params**

- No page-level filters; use route params or the current authorization context.

**Actions and navigation**

- POST /api/v1/me/revoke-other-sessions
- Better Auth password/session actions

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/me` | Ambil identitas dan profil pengguna aktif | `authenticated` | Tidak ada body. Query opsional: include=primaryAssignment,unit,areaScopes | MeResponse | Resolve Better Auth session; join User→UserProfile→primary active PositionAssignment→Position→Role→OrganizationUnit. Tolak 401 jika session invalid; 423 jika banned/locked; 403 jika profile bukan ACTIVE. |
| `GET` | `/me/authorization-context` | Ambil konteks authorization efektif | `authenticated` | Tidak ada body | AuthorizationContextResponse | Hitung coarse auth role, domain role, permission set, command branch, unit ancestors, area scopes, clearance rank. Response tidak boleh memuat secret permission implementation details di luar kebutuhan UI. |
| `GET` | `/me/area-scopes` | Ambil wilayah yang dapat diakses pengguna | `authenticated` | Query: includeDescendants=false\|true, level? | AreaScopeListResponse | Baca PositionAreaScope aktif; perluas melalui AdministrativeAreaClosure jika includeDescendants=true. Hanya active assignment dan scope dengan validUntil NULL/masih berlaku. |
| `POST` | `/me/revoke-other-sessions` | Cabut semua session lain | `authenticated` | {"reason":"string optional"} | ActionResultResponse | Delegasikan ke Better Auth session revocation; pertahankan session saat ini. Catat AUTH.REVOKE_OTHER_SESSIONS pada AuditLog; idempotent. |

**Business and UI rules**

- Tidak boleh mengubah role/position sendiri
- Security actions perlu confirmation

**Form contracts**

#### Form `F-PROFILE-METADATA`

**Endpoint:** `PATCH /api/v1/user-profiles/{userProfileId}`

```json
{
  "fullName": "string",
  "phone": "string|null",
  "username": "string|null"
}
```

Rules:

- Self-service fields only; role, clearance, assignment are excluded.

### 4.2 Admin System

#### `/dashboard/admin-system` — System Dashboard

**Function:** `dashboard` page for System Dashboard.

**Page flow**

1. Resolve session, primary assignment, permission, organization scope, area scope, and clearance.
2. Read all page filters from URL search params.
3. Load independent widgets in parallel; one widget failure must not blank the entire page.
4. Render last-updated timestamp and applied-scope indicator.
5. Drill-down actions navigate to canonical list/detail routes.

**Displayed data**

- System readiness
- Integration health
- Webhook error count
- Active users
- Locked users
- Audit anomaly cards

**Filters / URL params**

- `from`
- `to`
- `channelId`
- `severity`

**Actions and navigation**

- Open integration detail
- Open audit investigation

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/system/diagnostics` | Diagnostics administratif | `system.diagnostics.read` | Query: include=database,queue,integrations | DiagnosticsResponse | Aggregate sanitized health/version/migration status. Admin only; no credentials. |
| `GET` | `/health/ready` | Readiness probe | `public-internal` | Tidak ada body | HealthResponse | Check DB, PostGIS extension, queue, object storage and critical integrations with timeouts. Return 503 if not ready. |
| `GET` | `/integration-channels` | Daftar channel integrasi | `integration.read` | Query: status?,channelType? | List<IntegrationChannelSummary> | Read metadata; config secrets redacted. Admin System only. |
| `GET` | `/audit-logs` | Cari audit log | `audit.read` | Query: cursor,limit,actorUserProfileId,actorAssignmentId,action,entityType,entityId,from,to,ipAddress | CursorPage<AuditLogResponse> | Append-only query with strict admin/compliance scope; index on entity and actor. Never expose secret before/after fields without permission. |

**Business and UI rules**

- Admin Sistem tidak otomatis dapat membaca isi intelijen

**Form contracts**

No mutation form on this page.

#### `/dashboard/admin-system/integrasi-wa-center` — WA Center Integration

**Function:** `master-detail` page for WA Center Integration.

**Page flow**

1. Load master records and facets.
2. Open a canonical detail route or side panel backed by the same detail endpoint.
3. Create/edit operations validate uniqueness, references, active-state constraints, and audit requirements.
4. Refresh both the master list and selected detail after mutation.

**Displayed data**

- Channel table
- Status
- Last health
- Webhook timeline
- Failure reason
- Retry state
- Inbox summary

**Filters / URL params**

- `status`
- `channelType`
- `success`
- `from`
- `to`
- `page`
- `limit`

**Actions and navigation**

- POST /api/v1/integration-channels
- PATCH /api/v1/integration-channels/{channelId}
- POST /api/v1/integration-channels/{channelId}/activate
- POST /api/v1/integration-channels/{channelId}/deactivate
- POST /api/v1/integration-channels/{channelId}/test
- POST /api/v1/webhook-events/{eventId}/retry

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/integration-channels` | Daftar channel integrasi | `integration.read` | Query: status?,channelType? | List<IntegrationChannelSummary> | Read metadata; config secrets redacted. Admin System only. |
| `GET` | `/integration-channels/{channelId}` | Detail channel | `integration.read` | Tidak ada body | IntegrationChannelResponse | Return redacted config and health. Admin only. |
| `GET` | `/integration-channels/{channelId}/webhook-events` | Daftar webhook event | `integration.read` | Query: cursor,limit,eventType,success,from,to | CursorPage<WebhookEventSummary> | Query channelId; raw payload omitted. Admin/integration operator. |
| `GET` | `/whatsapp-inbox/summary` | Ringkasan inbox | `whatsapp.read` | Query: areaId?,from?,to? | WhatsAppInboxSummaryResponse | Aggregate counts by status/validation/unknown sender/routing SLA under identical scope. No global count leakage. |
| `POST` | `/integration-channels` | Buat channel | `integration.manage` | {"code":"...","name":"...","channelType":"WHATSAPP","config":{},"status":"INACTIVE"} | 201 IntegrationChannelResponse | Encrypt/separate secrets; insert channel. Never return secret values. |
| `PATCH` | `/integration-channels/{channelId}` | Ubah channel | `integration.manage` | {"name?":"...","configPatch?":{} } | IntegrationChannelResponse | Patch config via secret manager reference; audit. Status uses actions. |
| `POST` | `/integration-channels/{channelId}/activate` | Aktifkan channel | `integration.manage` | {"reason":"string"} | IntegrationChannelResponse | Run health check/signature config validation then ACTIVE. Fail 422 if unhealthy. |
| `POST` | `/integration-channels/{channelId}/deactivate` | Nonaktifkan channel | `integration.manage` | {"reason":"string"} | IntegrationChannelResponse | Set INACTIVE; stop consumers safely. Pending events retained. |
| `POST` | `/integration-channels/{channelId}/test` | Tes koneksi | `integration.manage` | {"mode":"HEALTH\|SEND_TEST","target":"string optional"} | IntegrationTestResponse | Call provider adapter, update lastHealthAt/status. Rate limited; no secrets in logs. |
| `POST` | `/webhook-events/{eventId}/retry` | Retry event gagal | `integration.retry` | {"reason":"string"} | 202 WebhookEventDetail | Check prior failed/not processed; enqueue idempotent processing. No duplicate domain message. |

**Business and UI rules**

- Secret tidak ditampilkan kembali
- Retry idempotent
- Payload webhook read-only

**Form contracts**

#### Form `F-INTEGRATION-CHANNEL`

**Endpoint:** `POST /api/v1/integration-channels or PATCH /api/v1/integration-channels/{channelId}`

```json
{
  "code": "WA_MAIN",
  "name": "WA Center Utama",
  "channelType": "WHATSAPP",
  "config": {
    "provider": "string",
    "secretRef": "string"
  }
}
```

Rules:

- Never return secrets in response.

#### Form `F-WEBHOOK-RETRY`

**Endpoint:** `POST /api/v1/webhook-events/{eventId}/retry`

```json
{
  "reason": "string"
}
```

Rules:

- Idempotency-Key required.

#### `/dashboard/admin-system/jabatan-reporting-line` — Position & Reporting Line

**Function:** `tree-table` page for Position & Reporting Line.

**Page flow**

1. Load hierarchy nodes lazily and keep selection in the URL.
2. Open a node detail route for metadata, relationships, and assignments.
3. Validate cycles, role-position rules, and reporting-line rules before mutation.

**Displayed data**

- Organization/position tree
- Seat code
- Role
- Current occupant
- Reports-to
- Area policy
- Vacancy status

**Filters / URL params**

- `unitId`
- `positionCode`
- `roleCode`
- `isActive`
- `q`
- `page`
- `limit`

**Actions and navigation**

- POST /api/v1/positions
- PATCH /api/v1/positions/{positionId}
- POST /api/v1/positions/{positionId}/change-reporting-line

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/positions` | Daftar seat/jabatan | `position.read` | Query: page,limit,search,code,roleCode,unitId,reportsToPositionId,isActive | Paged<PositionSummary> | Filter Position and join role/unit/current occupant. Apply org scope. |
| `GET` | `/positions/{positionId}` | Detail position | `position.read` | Query: include=occupant,subordinates,reportingChain | PositionDetail | Join role, unit, active occupant. Scoped. |
| `GET` | `/positions/{positionId}/subordinates` | Daftar bawahan langsung/berjenjang | `position.read` | Query: recursive=false,depth? | List<PositionSummary> | Direct query reportsToPositionId or recursive traversal. Only accessible command chain. |
| `GET` | `/positions/{positionId}/reporting-chain` | Rantai komando position | `position.read` | Tidak ada body | List<PositionSummary> | Recursive CTE on reportsToPositionId with cycle guard. Used by routing and approval. |
| `GET` | `/position-assignments` | Daftar assignment | `assignment.read` | Query: page,limit,userProfileId,positionId,unitId,isActive,validAt | Paged<PositionAssignmentDetail> | Filter assignment and joins. Scoped by organization chain. |
| `POST` | `/positions` | Buat seat/jabatan | `position.create` | {"code":"KORWIL","title":"Korwil Pekanbaru","roleId":"uuid","organizationUnitId":"uuid","reportsToPositionId":"uuid"} | 201 PositionDetail | Validate PositionCode↔RoleCode and branch-specific reporting line. KORWIL can be DIRECTORATE or BINDA branch but reportsTo must be KASUBDIT/KABAGOPS respectively. |
| `PATCH` | `/positions/{positionId}` | Ubah title/status position | `position.update` | {"title?":"...","isActive?":true} | PositionDetail | Update mutable metadata. Role/unit/reporting line change uses dedicated endpoints to ensure validation. |
| `POST` | `/positions/{positionId}/change-reporting-line` | Ubah atasan jabatan | `position.reporting.manage` | {"reportsToPositionId":"uuid","reason":"string"} | PositionDetail | Validate no reporting cycle, role/branch compatibility, same or allowed organization branch. Audit mandatory. |

**Business and UI rules**

- Role-position mapping wajib valid
- KORWIL Directorate melapor ke KASUBDIT; KORWIL Binda ke KABAGOPS

**Form contracts**

#### Form `F-POSITION`

**Endpoint:** `POST /api/v1/positions`

```json
{
  "code": "KORWIL",
  "title": "Korwil Pekanbaru",
  "roleId": "uuid",
  "organizationUnitId": "uuid",
  "reportsToPositionId": "uuid|null"
}
```

Rules:

- Validate position-role mapping and branch.

#### Form `F-REPORTING-LINE`

**Endpoint:** `POST /api/v1/positions/{positionId}/change-reporting-line`

```json
{
  "reportsToPositionId": "uuid|null",
  "effectiveAt": "ISO-8601",
  "reason": "string"
}
```

Rules:

- Prevent cycles; preserve audit history.

#### `/dashboard/admin-system/keamanan-audit` — Security & Audit

**Function:** `investigation` page for Security & Audit.

**Page flow**

1. Load immutable events with strict filters.
2. Open a detail route that shows actor, entity, before/after, device, and metadata.
3. Require a reason for export and process large exports asynchronously.

**Displayed data**

- Audit table
- Actor
- Action
- Entity
- Before/after diff
- IP/device
- Security event severity

**Filters / URL params**

- `actorUserProfileId`
- `actorAssignmentId`
- `action`
- `entityType`
- `entityId`
- `from`
- `to`
- `page`
- `limit`

**Actions and navigation**

- POST /api/v1/audit-exports
- Open related entity if authorized

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/audit-logs` | Cari audit log | `audit.read` | Query: cursor,limit,actorUserProfileId,actorAssignmentId,action,entityType,entityId,from,to,ipAddress | CursorPage<AuditLogResponse> | Append-only query with strict admin/compliance scope; index on entity and actor. Never expose secret before/after fields without permission. |
| `GET` | `/audit-logs/{auditLogId}` | Detail audit event | `audit.read` | Tidak ada body | AuditLogDetail | Load event; redact secrets and credentials recursively. Audit read itself may be audited. |
| `GET` | `/entities/{entityType}/{entityId}/audit-trail` | Audit trail resource | `audit.read` | Query: cursor,limit | CursorPage<AuditLogResponse> | Filter entity type/id; verify caller can access resource. No existence leakage. |
| `POST` | `/audit-exports` | Minta export audit | `audit.export` | {"filters":{},"format":"CSV\|JSON","reason":"string"} | 202 ExportJobResponse | Create async export job, apply same scope/redaction, encrypt output, short TTL. Requires ExportJob model/job store; every download audited. |

**Business and UI rules**

- Audit append-only
- Sensitive resource may remain masked
- Export requires reason

**Form contracts**

#### Form `F-AUDIT-EXPORT`

**Endpoint:** `POST /api/v1/audit-exports`

```json
{
  "filters": {
    "action": "string|null",
    "entityType": "string|null",
    "from": "ISO",
    "to": "ISO"
  },
  "format": "CSV",
  "reason": "string"
}
```

Rules:

- Returns 202 job reference.

#### `/dashboard/admin-system/konfigurasi-sistem` — System Configuration

**Function:** `settings` page for System Configuration.

**Page flow**

1. Load grouped settings and secret indicators.
2. Edit one setting through a dedicated detail route or confirmed dialog.
3. Mask secrets in all responses and write an audit event for every change.

**Displayed data**

- Setting groups
- Effective value
- Secret indicator
- Last updated
- Diagnostics

**Filters / URL params**

- `group`
- `q`
- `isSecret`

**Actions and navigation**

- PUT /api/v1/system/settings/{key}

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/system/settings` | Daftar settings | `system.setting.read` | Query: search?,includeSecrets=false | List<SystemSettingResponse> | Read settings; secret values always redacted. Admin only. |
| `GET` | `/system/settings/{key}` | Detail setting | `system.setting.read` | Tidak ada body | SystemSettingResponse | Load by key with redaction. No secret plaintext. |
| `GET` | `/system/diagnostics` | Diagnostics administratif | `system.diagnostics.read` | Query: include=database,queue,integrations | DiagnosticsResponse | Aggregate sanitized health/version/migration status. Admin only; no credentials. |
| `PUT` | `/system/settings/{key}` | Upsert setting | `system.setting.manage` | {"value":{},"description":"...","isSecret":false} | SystemSettingResponse | Validate key schema; encrypt/store secret reference if secret; invalidate cache. Audit before/after with redaction. |

**Business and UI rules**

- Secret encrypted and masked
- Critical settings require confirmation and audit

**Form contracts**

#### Form `F-SYSTEM-SETTING`

**Endpoint:** `PUT /api/v1/system/settings/{key}`

```json
{
  "value": "JSON",
  "description": "string|null",
  "isSecret": false
}
```

Rules:

- If secret, display only masked status after save.

#### `/dashboard/admin-system/master-data` — Reference & Master Data

**Function:** `tabs` page for Reference & Master Data.

**Page flow**

1. Store the active tab in the URL.
2. Load each tab only when selected.
3. Use canonical detail routes for records opened from a tab.

**Displayed data**

- Enum catalog
- Product types
- Product templates
- Position area policies
- Boundary data sources

**Filters / URL params**

- `tab`
- `isActive`
- `q`
- `page`
- `limit`

**Actions and navigation**

- POST /api/v1/product-types
- PATCH /api/v1/product-types/{productTypeId}
- POST /api/v1/product-types/{productTypeId}/templates
- POST /api/v1/product-templates/{templateId}/activate
- PUT /api/v1/position-area-policies/{policyId}

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/reference-data/enums` | Enum/reference untuk UI | `authenticated` | Query: names=RoleCode,PositionCode,... | ReferenceDataResponse | Serve allowlisted enum values and labels; cache. Do not expose internal-only enums unless requested. |
| `GET` | `/product-types` | Daftar jenis produk intelijen | `product.template.read` | Query: isActive? | List<ProductTypeResponse> | Read ProductTypeDefinition with active template version. Available to product creators. |
| `GET` | `/position-area-policies` | Daftar kebijakan level wilayah per posisi | `area.policy.read` | Query: positionCode?,isActive? | List<PositionAreaPolicyResponse> | Query PositionAreaPolicy. Digunakan saat validasi assignment/scope. |
| `POST` | `/product-types` | Buat jenis produk | `product.template.manage` | {"code":"...","name":"...","formatNo":"...","description":"..."} | 201 ProductTypeResponse | Insert unique code. Admin/template manager only. |
| `PATCH` | `/product-types/{productTypeId}` | Ubah metadata jenis produk | `product.template.manage` | {"name?":"...","formatNo?":"...","description?":"...","isActive?":true} | ProductTypeResponse | Update metadata, not code if already used. Deactivation does not invalidate existing products. |
| `POST` | `/product-types/{productTypeId}/templates` | Buat template version | `product.template.manage` | {"name":"...","sections":[{"code":"SUMMARY","title":"Ringkasan","orderNumber":1,"isRepeatable":false,"fields":[{"code":"content","label":"Isi","dataType":"richtext","isRequired":true,"orderNumber":1,"validation":{}}]}],"activate":true} | 201 ProductTemplateDetail | Create next version with sections/fields atomically; optionally deactivate prior active. Template version immutable once used by ProductVersion. |
| `POST` | `/product-templates/{templateId}/activate` | Aktifkan template | `product.template.manage` | {"reason":"string"} | ProductTemplateDetail | Deactivate other active templates of type and activate target. One active template per product type. |
| `PUT` | `/position-area-policies/{policyId}` | Ubah policy area posisi | `area.policy.manage` | {"scopeMode":"EXPLICIT","minimumAreas":1,"maximumAreas":5,"isActive":true} | PositionAreaPolicyResponse | Update policy dan jalankan impact preview terhadap assignment aktif. 409 jika perubahan membuat assignment aktif invalid kecuali force=true dan remediation plan. |

**Business and UI rules**

- Template aktif tidak diedit; buat versi baru

**Form contracts**

#### Form `F-PRODUCT-TYPE`

**Endpoint:** `POST /api/v1/product-types`

```json
{
  "code": "LAPIN",
  "name": "Laporan Intelijen",
  "formatNo": "string|null",
  "description": "string|null"
}
```

#### Form `F-PRODUCT-TEMPLATE`

**Endpoint:** `POST /api/v1/product-types/{productTypeId}/templates`

```json
{
  "name": "Template v1",
  "sections": [
    {
      "code": "INDICATIONS",
      "title": "Indikasi",
      "orderNumber": 1,
      "isRepeatable": false,
      "fields": [
        {
          "code": "content",
          "label": "Isi",
          "dataType": "RICH_TEXT",
          "isRequired": true,
          "orderNumber": 1,
          "validation": {}
        }
      ]
    }
  ]
}
```

Rules:

- Activate only after validation.

#### Form `F-POSITION-AREA-POLICY`

**Endpoint:** `PUT /api/v1/position-area-policies/{policyId}`

```json
{
  "scopeMode": "EXPLICIT",
  "minimumAreas": 1,
  "maximumAreas": 5,
  "isActive": true
}
```

#### `/dashboard/admin-system/organisasi-wilayah` — Organization & Administrative Area

**Function:** `split-tree-map` page for Organization & Administrative Area.

**Page flow**

1. Load organization tree and administrative area tree independently.
2. Display the selected administrative boundary and coverage overlays on the map.
3. Run move/import/boundary operations through transactional action endpoints.
4. Refresh closure paths, tree nodes, and spatial layers after mutation.

**Displayed data**

- Organization tree
- Area tree
- Boundary map
- Coverage overlay
- Boundary quality
- Import jobs

**Filters / URL params**

- `tab`
- `parentId`
- `level`
- `unitType`
- `q`
- `bbox`
- `zoom`
- `isActive`

**Actions and navigation**

- POST /api/v1/organization-units
- PATCH /api/v1/organization-units/{unitId}
- POST /api/v1/organization-units/{unitId}/move
- PUT /api/v1/organization-units/{unitId}/area-coverages
- POST /api/v1/administrative-areas
- PATCH /api/v1/administrative-areas/{areaId}
- POST /api/v1/administrative-areas/{areaId}/move
- POST /api/v1/administrative-areas/{areaId}/boundaries
- POST /api/v1/administrative-area-imports

**Map mode:** `boundary-editor`

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/organization-units` | Daftar unit organisasi | `organization.read` | Query: page,limit,search,type,parentId,isActive,branchType? | Paged<OrganizationUnitSummary> | Apply organization scope via OrganizationUnitClosure; optional direct children by parentId. Default deletedAt IS NULL. |
| `GET` | `/organization-units/{unitId}/tree` | Ambil subtree organisasi | `organization.read` | Query: maxDepth=5,includePositions=false | OrganizationTreeResponse | Fetch descendants once and assemble tree in service. Limit maxDepth untuk mencegah payload berlebih. |
| `GET` | `/administrative-areas/tree` | Cascading tree wilayah | `area.read` | Query: rootId?,maxDepth=3,levels?,includeBoundaryStatus=true | AdministrativeAreaTreeResponse | Fetch closure descendants; annotate boundary availability and childCount. Payload depth capped. |
| `GET` | `/administrative-areas/boundaries` | Boundary berdasarkan viewport | `area.read` | Query: bbox=minLng,minLat,maxLng,maxLat,level,zoom,limit | GeoJsonFeatureCollectionResponse | GiST ST_Intersects against envelope; choose simplification by zoom. Reject overly large bbox without coarse level. |
| `GET` | `/administrative-area-imports/{jobId}` | Status import | `area.import` | Path jobId | ImportJobResponse | Read job progress/error summary. Job data retained for audit. |
| `POST` | `/organization-units` | Buat unit organisasi | `organization.create` | {"code":"...","name":"...","type":"SUBDIRECTORATE","parentId":"uuid"} | 201 OrganizationUnitDetail | Validate allowed parent-child type; insert unit and closure self/ancestor paths in transaction. Code unique; cycle impossible on create. |
| `PATCH` | `/organization-units/{unitId}` | Ubah metadata unit | `organization.update` | {"name?":"...","isActive?":true} | OrganizationUnitDetail | Update mutable fields only. parentId tidak boleh diubah di endpoint ini. |
| `POST` | `/organization-units/{unitId}/move` | Pindahkan unit dalam hierarchy | `organization.move` | {"newParentId":"uuid","reason":"string"} | OrganizationUnitDetail | Validate type compatibility and no cycle; rebuild affected OrganizationUnitClosure paths transactionally. Tolak jika active workflow/assignment akan kehilangan valid branch tanpa remediation. |
| `PUT` | `/organization-units/{unitId}/area-coverages` | Ganti coverage wilayah unit | `organization.coverage.manage` | {"areas":[{"areaId":"uuid","isPrimary":true}],"effectiveAt":"ISO","reason":"string"} | List<OrganizationAreaCoverageResponse> | Close existing active coverage and insert replacements in transaction; validate subset of parent unit coverage. Minimal satu primary bila policy membutuhkan. |
| `POST` | `/administrative-areas` | Buat wilayah manual | `area.manage` | {"code":"...","officialCode":"...","name":"...","level":"RW","parentId":"uuid","centroidLatitude":null,"centroidLongitude":null} | 201 AdministrativeAreaDetail | Validate level-parent pair; insert area and closure paths. Admin only; officialCode unique if provided. |
| `PATCH` | `/administrative-areas/{areaId}` | Ubah metadata wilayah | `area.manage` | {"name?":"...","isActive?":true,"centroidLatitude?":0,"centroidLongitude?":0} | AdministrativeAreaDetail | Update non-hierarchy fields. parentId/level change forbidden here. |
| `POST` | `/administrative-areas/{areaId}/move` | Pindahkan area hierarchy | `area.manage` | {"newParentId":"uuid","reason":"string"} | AdministrativeAreaDetail | Validate no cycle and level compatibility; rebuild closure affected paths. High-risk admin action; dryRun query parameter supported. |
| `POST` | `/administrative-areas/{areaId}/boundaries` | Tambah versi boundary | `area.boundary.manage` | {"dataSourceId":"uuid optional","versionNumber":2,"geoJson":{},"qualityStatus":"VERIFIED","simplificationToleranceMeters":0,"effectiveFrom":"ISO","activate":true} | 201 AdministrativeAreaBoundaryResponse | Convert GeoJSON via ST_GeomFromGeoJSON→ST_Multi→SRID 4326; validate geometry; calculate centroid/bbox/hash; deactivate prior active boundary atomically if activate. Geometry must be valid MultiPolygon and match area context. |
| `POST` | `/administrative-area-imports` | Import dataset wilayah/boundary | `area.import` | multipart file + metadata {name,sourceType,referenceUrl,versionLabel,effectiveDate,mode:VALIDATE\|UPSERT} | 202 ImportJobResponse | Store source metadata; parse asynchronously; validate hierarchy/codes/geometries; upsert in batches; rebuild closure. Requires ImportJob persistence/queue; checksum idempotency. |

**Business and UI rules**

- Move hierarchy transactional
- Boundary validation before activation
- Prevent cycles

**Form contracts**

#### Form `F-ORGANIZATION-UNIT`

**Endpoint:** `POST /api/v1/organization-units`

```json
{
  "code": "BINDA-RIAU",
  "name": "Binda Riau",
  "type": "BINDA",
  "parentId": "uuid|null"
}
```

Rules:

- Create closure self-link and ancestor links.

#### Form `F-UNIT-COVERAGE`

**Endpoint:** `PUT /api/v1/organization-units/{unitId}/area-coverages`

```json
{
  "areas": [
    {
      "areaId": "uuid",
      "isPrimary": true,
      "validFrom": "ISO",
      "validUntil": null
    }
  ]
}
```

Rules:

- Replace active coverage transactionally.

#### Form `F-ADMIN-AREA`

**Endpoint:** `POST /api/v1/administrative-areas`

```json
{
  "code": "11.05.07.2002",
  "officialCode": "11.05.07.2002",
  "name": "Alue Bagok",
  "level": "VILLAGE",
  "parentId": "uuid"
}
```

Rules:

- Validate allowed parent level.

#### Form `F-BOUNDARY-VERSION`

**Endpoint:** `POST /api/v1/administrative-areas/{areaId}/boundaries`

```json
{
  "geoJson": {
    "type": "MultiPolygon",
    "coordinates": []
  },
  "dataSourceId": "uuid|null",
  "qualityStatus": "VERIFIED",
  "effectiveFrom": "ISO",
  "simplificationToleranceMeters": 0
}
```

Rules:

- Validate SRID, geometry, parent containment, sibling overlap.

#### Form `F-AREA-IMPORT`

**Endpoint:** `POST /api/v1/administrative-area-imports`

```json
{
  "fileId": "uuid",
  "mode": "UPSERT",
  "includeBoundaries": true,
  "dryRun": true
}
```

Rules:

- Returns 202 jobId; run dry-run before commit.

#### `/dashboard/admin-system/pengguna` — User Provisioning

**Function:** `master-detail` page for User Provisioning.

**Page flow**

1. Load master records and facets.
2. Open a canonical detail route or side panel backed by the same detail endpoint.
3. Create/edit operations validate uniqueness, references, active-state constraints, and audit requirements.
4. Refresh both the master list and selected detail after mutation.

**Displayed data**

- User list
- Status
- Role
- Primary position
- Unit
- Area scope
- Lock/ban indicators
- Assignment history

**Filters / URL params**

- `q`
- `status`
- `roleCode`
- `positionCode`
- `unitId`
- `areaId`
- `page`
- `limit`

**Actions and navigation**

- POST /api/v1/user-profiles/provision
- PATCH /api/v1/user-profiles/{userProfileId}
- POST /api/v1/user-profiles/{userProfileId}/activate
- POST /api/v1/user-profiles/{userProfileId}/suspend
- POST /api/v1/user-profiles/{userProfileId}/lock
- POST /api/v1/user-profiles/{userProfileId}/unlock
- POST /api/v1/user-profiles/{userProfileId}/change-primary-assignment
- POST /api/v1/user-profiles/{userProfileId}/archive

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/user-profiles` | Daftar user profile | `user.read` | Query: page,limit,search,status,roleCode,positionCode,unitId,areaId,includeArchived=false | Paged<UserProfileSummary> | Filter profile; join primary assignment. areaId menggunakan closure descendant match. Default deletedAt IS NULL. Admin melihat seluruh; pimpinan hanya subordinate chain jika diberi permission. |
| `GET` | `/user-profiles/{userProfileId}` | Detail user profile | `user.read` | Path: userProfileId; Query: include=assignments,scopes,auditSummary | UserProfileDetail | Load profile dan assignment history dengan access scope. Resource di luar command chain dikembalikan 404 untuk mencegah enumeration. |
| `GET` | `/user-profiles/{userProfileId}/assignments` | Riwayat penugasan jabatan | `assignment.read` | Query: activeOnly=false | List<PositionAssignmentDetail> | Query by userProfileId order validFrom desc. Scope view mengikuti command chain. |
| `POST` | `/user-profiles/provision` | Provision akun, profile, jabatan dan scope secara atomik | `user.provision` | {"auth":{"name":"...","email":"...","password":"...","role":"field_officer"},"profile":{"username":"...","fullName":"...","phone":"...","clearanceLevel":"TERBATAS"},"assignment":{"positionId":"uuid","validFrom":"ISO"},"areaScopeIds":["uuid"]} | 201 UserProfileDetail | Transaction: create Better Auth user→UserProfile PENDING→validate role-position→create assignment→create scopes→set ACTIVE→revoke initial stale sessions if any. Email/username unique; auth role harus match RoleCode assignment; tidak ada public self-registration; Idempotency-Key wajib. |
| `PATCH` | `/user-profiles/{userProfileId}` | Ubah metadata profile | `user.update` | {"username?":"...","fullName?":"...","phone?":"...","clearanceLevel?":"RAHASIA"} | UserProfileDetail | Update field mutable saja; clearance change memerlukan permission khusus dan audit before/after. Tidak boleh mengubah auth role, status, assignment atau scope melalui endpoint ini. |
| `POST` | `/user-profiles/{userProfileId}/activate` | Aktifkan profile setelah provisioning | `user.activate` | {"reason":"string"} | ActionResultResponse | Pastikan ada primary active assignment, role match, position aktif, area scope memenuhi policy; set status ACTIVE. 409 jika sudah ACTIVE; 422 jika provisioning belum lengkap. |
| `POST` | `/user-profiles/{userProfileId}/suspend` | Suspend akses operasional | `user.suspend` | {"reason":"string","until":"ISO optional","revokeSessions":true} | ActionResultResponse | Set profile SUSPENDED, optional operational lock, revoke sessions; assignment history tidak dihapus. Reason wajib; tidak boleh suspend diri sendiri kecuali break-glass policy. |
| `POST` | `/user-profiles/{userProfileId}/lock` | Operational security lock | `user.lock` | {"reason":"string","lockedUntil":"ISO optional"} | ActionResultResponse | Set operationalLockedAt/reason/until dan revoke sessions. 423 untuk akses berikutnya; semua lock harus diaudit. |
| `POST` | `/user-profiles/{userProfileId}/unlock` | Lepas operational lock | `user.unlock` | {"reason":"string"} | ActionResultResponse | Clear operational lock fields; tidak otomatis mengubah SUSPENDED menjadi ACTIVE. Audit wajib. |
| `POST` | `/user-profiles/{userProfileId}/change-primary-assignment` | Mutasi jabatan utama | `assignment.transfer` | {"newPositionId":"uuid","areaScopeIds":["uuid"],"effectiveAt":"ISO","reason":"string"} | PositionAssignmentDetail | Single transaction: validate branch/reporting line→close old assignment/scopes→create new assignment/scopes→sync Better Auth role→revoke sessions. Tidak boleh menghasilkan dua primary assignment aktif; Idempotency-Key wajib. |
| `POST` | `/user-profiles/{userProfileId}/archive` | Arsipkan personel | `user.archive` | {"reason":"string","effectiveAt":"ISO"} | ActionResultResponse | Close all active assignments/scopes; status ARCHIVED; deletedAt opsional sesuai kebijakan; revoke sessions. Tidak melakukan hard delete. |

**Business and UI rules**

- Provisioning atomik
- Role auth dan domain harus sinkron
- Tidak ada hard delete

**Form contracts**

#### Form `F-USER-PROVISION`

**Endpoint:** `POST /api/v1/user-profiles/provision`

```json
{
  "name": "string",
  "email": "string",
  "authRole": "field_officer",
  "username": "string|null",
  "fullName": "string",
  "phone": "string|null",
  "clearanceLevel": "TERBATAS",
  "positionId": "uuid",
  "areaScopeIds": [
    "uuid"
  ],
  "isPrimary": true
}
```

Rules:

- Atomic Better Auth user + profile + primary assignment + area scopes.
- Profile remains PENDING until activation checks pass.

#### Form `F-USER-METADATA`

**Endpoint:** `PATCH /api/v1/user-profiles/{userProfileId}`

```json
{
  "fullName": "string",
  "phone": "string|null",
  "clearanceLevel": "RAHASIA"
}
```

Rules:

- Clearance update requires privileged permission and audit.

#### Form `F-USER-LOCK`

**Endpoint:** `POST /api/v1/user-profiles/{userProfileId}/lock`

```json
{
  "reason": "string",
  "lockedUntil": "ISO-8601|null"
}
```

Rules:

- Revoke sessions after lock.

#### Form `F-PRIMARY-ASSIGNMENT`

**Endpoint:** `POST /api/v1/user-profiles/{userProfileId}/change-primary-assignment`

```json
{
  "positionId": "uuid",
  "validFrom": "ISO-8601",
  "areaScopeIds": [
    "uuid"
  ],
  "reason": "string"
}
```

Rules:

- Close old assignment, create new assignment, sync auth role, revoke sessions.

#### `/dashboard/admin-system/role-hak-akses` — Roles & Permissions

**Function:** `matrix` page for Roles & Permissions.

**Page flow**

1. Load the role-permission matrix and current policy version.
2. Edit a draft selection and preview impact.
3. Submit a full replacement with a change reason and concurrency token.
4. Refresh authorization caches and write an audit event.

**Displayed data**

- Role-permission matrix
- Permission catalog
- Position area policy
- Impact preview

**Filters / URL params**

- `roleId`
- `module`
- `q`

**Actions and navigation**

- PUT /api/v1/roles/{roleId}/permissions
- PUT /api/v1/position-area-policies/{policyId}

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/roles` | Daftar role domain | `role.read` | Query: isActive? | List<RoleResponse> | Read Role plus permission count and position count. RoleCode fixed; no delete. |
| `GET` | `/roles/{roleId}` | Detail role dan permission | `role.read` | Path: roleId | RoleDetail | Join RolePermission→Permission. Tidak memuat pengguna. |
| `GET` | `/permissions` | Daftar permission catalog | `permission.read` | Query: search?,module? | List<PermissionResponse> | Filter Permission.code/name. Read-only kecuali deployment seed. |
| `GET` | `/position-area-policies` | Daftar kebijakan level wilayah per posisi | `area.policy.read` | Query: positionCode?,isActive? | List<PositionAreaPolicyResponse> | Query PositionAreaPolicy. Digunakan saat validasi assignment/scope. |
| `PUT` | `/roles/{roleId}/permissions` | Ganti permission role | `role.permission.manage` | {"permissionCodes":["directive.read","task.assign"]} | RoleDetail | Validate all codes; replace junction rows in transaction; invalidate authorization cache. Admin System only; audit before/after; tidak boleh menghapus permission minimum ADMIN_SYSTEM. |
| `PUT` | `/position-area-policies/{policyId}` | Ubah policy area posisi | `area.policy.manage` | {"scopeMode":"EXPLICIT","minimumAreas":1,"maximumAreas":5,"isActive":true} | PositionAreaPolicyResponse | Update policy dan jalankan impact preview terhadap assignment aktif. 409 jika perubahan membuat assignment aktif invalid kecuali force=true dan remediation plan. |

**Business and UI rules**

- Separation of duties
- Admin access does not imply intelligence content access

**Form contracts**

#### Form `F-ROLE-PERMISSIONS`

**Endpoint:** `PUT /api/v1/roles/{roleId}/permissions`

```json
{
  "permissionIds": [
    "uuid"
  ],
  "changeReason": "string"
}
```

Rules:

- Full replacement; use If-Match.

#### Form `F-POSITION-AREA-POLICY`

**Endpoint:** `PUT /api/v1/position-area-policies/{policyId}`

```json
{
  "scopeMode": "EXPLICIT",
  "minimumAreas": 1,
  "maximumAreas": 5,
  "isActive": true
}
```

### 4.3 Executive

#### `/dashboard/executive` — Executive Dashboard

**Function:** `dashboard` page for Executive Dashboard.

**Page flow**

1. Resolve session, primary assignment, permission, organization scope, area scope, and clearance.
2. Read all page filters from URL search params.
3. Load independent widgets in parallel; one widget failure must not blank the entire page.
4. Render last-updated timestamp and applied-scope indicator.
5. Drill-down actions navigate to canonical list/detail routes.

**Displayed data**

- National KPIs
- Critical alerts
- Directive progress
- Product pipeline
- National map summary
- Pending approvals

**Filters / URL params**

- `areaId`
- `from`
- `to`
- `classificationMax`

**Actions and navigation**

- Open critical alert
- Open approval
- Create strategic directive

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/dashboard/overview` | Overview dashboard sesuai role | `dashboard.read` | Query: areaId?,from,to,ownerUnitId?,classificationMax? | DashboardOverviewResponse | Resolve access context; aggregate report/task/directive/product/alert metrics using same scope CTE and time range. All widgets must use identical filter context. |
| `GET` | `/dashboard/kpis` | KPI operasional | `dashboard.read` | Query: areaId?,from,to,compareWithPrevious=true | DashboardKpiResponse | Aggregate counts, completion rates, verification SLA, approval backlog; compute comparison window. No count leakage outside scope. |
| `GET` | `/dashboard/trends` | Tren laporan/alert/status | `dashboard.read` | Query: metric=bakets\|alerts\|products\|tasks,interval=day\|week\|month,areaId?,from,to,groupBy? | TimeSeriesResponse | DATE_TRUNC interval over scoped dataset; fill zero buckets. Range/interval caps. |
| `GET` | `/alerts/summary` | Ringkasan alert | `alert.read` | Query: areaId?,from,to | AlertSummaryResponse | Aggregate open alerts by severity/status/area within scope. No leakage. |
| `GET` | `/approval-inbox` | Inbox approval pengguna | `approval.read` | Query: page,limit,stage,status,routeType,classification,areaId,from,to | Paged<ApprovalInboxItem> | Find ACTIVE/WAITING steps whose targetPosition currently occupied by caller assignment; apply clearance/scope. No approval based solely on role. |
| `GET` | `/map/area-summary` | Summary area terpilih | `map.read` | Query: areaId,from,to | MapAreaSummaryResponse | Aggregate all descendant events and return boundary/centroid plus KPI. Uses AdministrativeAreaClosure. |

**Business and UI rules**

- All widgets use one filter context

**Form contracts**

No mutation form on this page.

#### `/dashboard/executive/kinerja-evaluasi` — National Performance & Evaluation

**Function:** `analytics` page for National Performance & Evaluation.

**Page flow**

1. Read period, area, unit, grouping, and comparison filters from the URL.
2. Load server-calculated metrics derived from workflow events.
3. Allow drill-down only to resources within the same effective scope.
4. Display metric definitions and data freshness.

**Displayed data**

- KPI cards
- Task completion
- Directive fulfillment
- Verification quality
- Product status
- Area ranking

**Filters / URL params**

- `areaId`
- `unitId`
- `from`
- `to`
- `groupBy`
- `compareWithPrevious`

**Actions and navigation**

- Drill down to region/unit
- Export via controlled report flow

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/dashboard/kpis` | KPI operasional | `dashboard.read` | Query: areaId?,from,to,compareWithPrevious=true | DashboardKpiResponse | Aggregate counts, completion rates, verification SLA, approval backlog; compute comparison window. No count leakage outside scope. |
| `GET` | `/dashboard/task-performance` | Kinerja tugas | `dashboard.read` | Query: areaId?,unitId?,from,to,groupBy=unit\|position\|area | TaskPerformanceResponse | Aggregate assignment statuses, overdue, avg completion time and workload. Only managerial command chain. |
| `GET` | `/dashboard/directive-progress` | Progress direktif | `dashboard.read` | Query: directiveId?,areaId?,unitId? | DirectiveProgressDashboardResponse | Aggregate recipients/child tasks/Baket outputs by directive. Scoped. |
| `GET` | `/dashboard/verification-quality` | Kualitas verification | `dashboard.read` | Query: areaId?,unitId?,from,to | VerificationQualityResponse | Aggregate A-F/1-6 distribution, needs-development rate, turnaround time. Interpret cautiously; source identity hidden. |
| `GET` | `/dashboard/product-status` | Pipeline produk | `dashboard.read` | Query: areaId?,ownerUnitId?,from,to | ProductPipelineResponse | Aggregate ProductStatus and approval aging. Classification filter. |
| `GET` | `/dashboard/area-breakdown` | Agregasi per wilayah | `dashboard.read` | Query: metric=bakets\|alerts\|emergencies,areaId,childLevel,from,to,limit | AreaBreakdownResponse | Find direct children/selected level via closure; group events by resolved descendant ancestor. Supports cascading filter. |

**Business and UI rules**

- Metrics calculated from immutable workflow events

**Form contracts**

No mutation form on this page.

#### `/dashboard/executive/laporan-briefing` — Executive Briefing

**Function:** `composition` page for Executive Briefing.

**Page flow**

1. Load multiple scoped sources in parallel or use a composition endpoint when available.
2. Render each source section independently with freshness metadata.
3. Navigate to canonical source details.

**Displayed data**

- Approved product highlights
- Critical alerts
- Open directives
- Trend chart
- Regional exceptions
- Briefing notes

**Filters / URL params**

- `areaId`
- `from`
- `to`
- `classification`
- `productTypeId`

**Actions and navigation**

- Open product
- Open alert
- Open directive

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/products` | Daftar produk intelijen | `product.read` | Query: page,limit,status,productTypeId,ownerUnitId,classification,areaId,periodFrom,periodTo,search,createdByAssignmentId | Paged<IntelligenceProductSummary> | Join current version/type; apply org/area/clearance/workflow/distribution scope. Only approved/distributed visibility for broader audiences. |
| `GET` | `/alerts` | Daftar alert | `alert.read` | Query: cursor,limit,status,severity,areaId,assignedPositionId,sourceBaketId,sourceIncidentId,from,to | CursorPage<AlertSummary> | Apply target assignment/command chain/area scope. Order unresolved severity desc, createdAt desc. |
| `GET` | `/directives` | Daftar direktif | `directive.read` | Query: page,limit,status,ownerUnitId,areaId,classification,from,to,search,assignedToMe | Paged<DirectiveSummary> | Join current version; apply recipient/unit/position, org/area scope and clearance filters. Only current version fields in summary. |
| `GET` | `/dashboard/trends` | Tren laporan/alert/status | `dashboard.read` | Query: metric=bakets\|alerts\|products\|tasks,interval=day\|week\|month,areaId?,from,to,groupBy? | TimeSeriesResponse | DATE_TRUNC interval over scoped dataset; fill zero buckets. Range/interval caps. |
| `GET` | `/dashboard/area-breakdown` | Agregasi per wilayah | `dashboard.read` | Query: metric=bakets\|alerts\|emergencies,areaId,childLevel,from,to,limit | AreaBreakdownResponse | Find direct children/selected level via closure; group events by resolved descendant ancestor. Supports cascading filter. |

**Business and UI rules**

- Use parallel existing APIs initially
- Recommended composition endpoint GAP-COMP-001

**Form contracts**

No mutation form on this page.

#### `/dashboard/executive/monitoring-nasional` — National Monitoring

**Function:** `analytics-map` page for National Monitoring.

**Page flow**

1. Load scoped aggregate metrics and spatial layers using one shared filter context.
2. Update charts and map together when the area or period changes.
3. Drill to canonical regional, task, report, or incident details.

**Displayed data**

- National map
- Area breakdown
- Task status
- Emergency count
- Report trend
- Regional leaderboard

**Filters / URL params**

- `areaId`
- `from`
- `to`
- `metric`
- `childLevel`
- `status`
- `urgency`

**Actions and navigation**

- Select region
- Open regional detail

**Map mode:** `national-choropleth`

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/map/area-summary` | Summary area terpilih | `map.read` | Query: areaId,from,to | MapAreaSummaryResponse | Aggregate all descendant events and return boundary/centroid plus KPI. Uses AdministrativeAreaClosure. |
| `GET` | `/map/heatmap` | Heatmap laporan | `map.read` | Query: bbox,zoom,areaId?,from,to,metric=count\|urgencyWeight,status? | HeatmapResponse | Aggregate weighted points into tiles/grid; scoped. Cache by role-scope hash+filters; small-cell suppression for confidentiality. |
| `GET` | `/dashboard/area-breakdown` | Agregasi per wilayah | `dashboard.read` | Query: metric=bakets\|alerts\|emergencies,areaId,childLevel,from,to,limit | AreaBreakdownResponse | Find direct children/selected level via closure; group events by resolved descendant ancestor. Supports cascading filter. |
| `GET` | `/dashboard/task-performance` | Kinerja tugas | `dashboard.read` | Query: areaId?,unitId?,from,to,groupBy=unit\|position\|area | TaskPerformanceResponse | Aggregate assignment statuses, overdue, avg completion time and workload. Only managerial command chain. |
| `GET` | `/emergency-incidents` | Daftar insiden darurat | `emergency.read` | Query: cursor,limit,status,severity,areaId,from,to,reportedByAssignmentId | CursorPage<EmergencyIncidentSummary> | Apply command chain/area scope; order severity and createdAt. Emergency visibility may bypass normal path only for designated leaders. |

**Business and UI rules**

- No raw source identity at executive aggregation

**Form contracts**

No mutation form on this page.

#### `/dashboard/executive/persetujuan` — Approval Summary

**Function:** `landing` page for Approval Summary.

**Page flow**

1. Load summary counts and quick links for the module.
2. Show only actions permitted by the effective authorization context.
3. Navigate to actionable list, detail, or create routes.

**Displayed data**

- Pending count
- Overdue count
- Recent decisions
- Approval pipeline
- Quick links

**Filters / URL params**

- `routeType`
- `status`
- `from`
- `to`

**Actions and navigation**

- Open executive approval inbox

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/approval-inbox` | Inbox approval pengguna | `approval.read` | Query: page,limit,stage,status,routeType,classification,areaId,from,to | Paged<ApprovalInboxItem> | Find ACTIVE/WAITING steps whose targetPosition currently occupied by caller assignment; apply clearance/scope. No approval based solely on role. |
| `GET` | `/dashboard/product-status` | Pipeline produk | `dashboard.read` | Query: areaId?,ownerUnitId?,from,to | ProductPipelineResponse | Aggregate ProductStatus and approval aging. Classification filter. |

**Business and UI rules**

- Summary only; decision is performed on detail page

**Form contracts**

No mutation form on this page.

#### `/dashboard/executive/persetujuan-eksekutif` — Executive Approval Inbox

**Function:** `queue-detail` page for Executive Approval Inbox.

**Page flow**

1. Load the scoped work queue using URL filters.
2. Open the selected record through its canonical detail route.
3. Load detail, timeline, traceability, and server-calculated available actions.
4. Execute only explicit action endpoints; never patch workflow status directly.
5. Refresh the queue and notification badge after a successful action.

**Displayed data**

- Active steps
- Product summary
- Traceability
- Regional decision
- Classification
- Deadline

**Filters / URL params**

- `status`
- `productTypeId`
- `classification`
- `from`
- `to`
- `page`
- `limit`

**Actions and navigation**

- POST /api/v1/approval-steps/{stepId}/approve
- POST /api/v1/approval-steps/{stepId}/request-revision
- POST /api/v1/approval-steps/{stepId}/reject
- POST /api/v1/approval-steps/{stepId}/request-clarification

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/approval-inbox` | Inbox approval pengguna | `approval.read` | Query: page,limit,stage,status,routeType,classification,areaId,from,to | Paged<ApprovalInboxItem> | Find ACTIVE/WAITING steps whose targetPosition currently occupied by caller assignment; apply clearance/scope. No approval based solely on role. |
| `GET` | `/approval-steps/{stepId}` | Detail approval step | `approval.read` | Tidak ada body | ApprovalStepDetail | Authorize target occupant, creator chain, prior approvers or executive read. Decision notes redacted if policy. |
| `GET` | `/products/{productId}` | Detail produk current version | `product.read` | Query: include=versions,sources,approval,distribution,attachments | IntelligenceProductDetail | Load scoped product. Clearance and need-to-know. |
| `GET` | `/products/{productId}/traceability` | Traceability produk | `product.read` | Tidak ada body | ProductTraceabilityResponse | Graph product→sources→Baket→messages plus approval/distribution. Redacted by access. |
| `GET` | `/approval-workflows/{workflowId}/timeline` | Timeline approval | `approval.read` | Tidak ada body | TimelineResponse | Return step activations, decisions, revision cycles and notifications. Immutable history. |
| `POST` | `/approval-steps/{stepId}/approve` | Approve step | `approval.decide` | {"note":"string optional","confirmation":"APPROVE"} | ApprovalWorkflowDetail | Lock workflow; verify step ACTIVE and caller occupies targetPosition; persist decision/decider/time; activate next step or complete; update ProductStatus. One decision only; idempotency. |
| `POST` | `/approval-steps/{stepId}/request-revision` | Kembalikan produk untuk revisi | `approval.decide` | {"note":"string","requiredChanges":["..."]} | ApprovalWorkflowDetail | Set step/workflow NEEDS_REVISION; product NEEDS_REVISION; notify OIM; do not mutate version. Note mandatory. |
| `POST` | `/approval-steps/{stepId}/reject` | Tolak produk | `approval.decide` | {"note":"string","confirmation":"REJECT"} | ApprovalWorkflowDetail | Set step REJECTED/workflow CANCELLED or terminal policy; product NEEDS_REVISION/ARCHIVED per rule. Elevated permission; reason mandatory. |
| `POST` | `/approval-steps/{stepId}/request-clarification` | Minta klarifikasi tanpa final decision | `approval.decide` | {"note":"string","dueAt":"ISO optional"} | ApprovalWorkflowDetail | Record decision REQUEST_CLARIFICATION or dedicated event; keep step ACTIVE; notify creator. Schema may need clarification event history to avoid overwriting. |

**Business and UI rules**

- Only ACTIVE step
- Decision immutable
- Reason required for revision/reject

**Form contracts**

#### Form `F-APPROVAL-DECISION`

**Endpoint:** `POST /api/v1/approval-steps/{stepId}/{approve|request-revision|reject|request-clarification}`

```json
{
  "note": "string",
  "requiredChanges": [
    "string"
  ]
}
```

Rules:

- Required changes mandatory for revision; note mandatory for reject.

#### `/dashboard/executive/produk-intelijen` — Approved Intelligence Products

**Function:** `catalog` page for Approved Intelligence Products.

**Page flow**

1. Load formal catalog entries with scope and classification filters.
2. Open immutable detail/version routes.
3. Expose distribution/archive actions only when returned by the server.

**Displayed data**

- Product cards/table
- Status
- Type
- Owner region
- Period
- Classification
- Distribution

**Filters / URL params**

- `q`
- `status`
- `productTypeId`
- `ownerUnitId`
- `areaId`
- `classification`
- `from`
- `to`
- `page`
- `limit`

**Actions and navigation**

- Open detail
- Distribute approved product if permitted
- Archive if permitted

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/products` | Daftar produk intelijen | `product.read` | Query: page,limit,status,productTypeId,ownerUnitId,classification,areaId,periodFrom,periodTo,search,createdByAssignmentId | Paged<IntelligenceProductSummary> | Join current version/type; apply org/area/clearance/workflow/distribution scope. Only approved/distributed visibility for broader audiences. |
| `GET` | `/products/{productId}` | Detail produk current version | `product.read` | Query: include=versions,sources,approval,distribution,attachments | IntelligenceProductDetail | Load scoped product. Clearance and need-to-know. |
| `GET` | `/products/{productId}/timeline` | Timeline produk | `product.read` | Tidak ada body | TimelineResponse | Merge versions, workflow steps, decisions, distributions, audit. Scoped. |
| `GET` | `/products/{productId}/distribution-summary` | Ringkasan distribusi produk | `distribution.read` | Tidak ada body | DistributionSummaryResponse | Aggregate queued/sent/delivered/read/failed/revoked and recipient categories. Respect visibility. |

**Business and UI rules**

- Executive normally sees approved/formal products, not raw WhatsApp

**Form contracts**

#### Form `F-PRODUCT-DISTRIBUTION`

**Endpoint:** `POST /api/v1/product-versions/{versionId}/distributions`

```json
{
  "targets": [
    {
      "targetUnitId": "uuid|null",
      "targetPositionId": "uuid|null",
      "targetUserProfileId": "uuid|null"
    }
  ],
  "classification": "RAHASIA",
  "message": "string|null"
}
```

Rules:

- Exactly one target field per target row.

#### `/dashboard/executive/pusat-komando` — Command Center

**Function:** `landing` page for Command Center.

**Page flow**

1. Load summary counts and quick links for the module.
2. Show only actions permitted by the effective authorization context.
3. Navigate to actionable list, detail, or create routes.

**Displayed data**

- Active directives
- Emergency panel
- Approval queue
- National map
- Quick actions

**Filters / URL params**

- `areaId`
- `from`
- `to`

**Actions and navigation**

- Create directive
- Open emergency operations

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/dashboard/overview` | Overview dashboard sesuai role | `dashboard.read` | Query: areaId?,from,to,ownerUnitId?,classificationMax? | DashboardOverviewResponse | Resolve access context; aggregate report/task/directive/product/alert metrics using same scope CTE and time range. All widgets must use identical filter context. |
| `GET` | `/dashboard/directive-progress` | Progress direktif | `dashboard.read` | Query: directiveId?,areaId?,unitId? | DirectiveProgressDashboardResponse | Aggregate recipients/child tasks/Baket outputs by directive. Scoped. |
| `GET` | `/emergency-incidents` | Daftar insiden darurat | `emergency.read` | Query: cursor,limit,status,severity,areaId,from,to,reportedByAssignmentId | CursorPage<EmergencyIncidentSummary> | Apply command chain/area scope; order severity and createdAt. Emergency visibility may bypass normal path only for designated leaders. |
| `GET` | `/alerts/summary` | Ringkasan alert | `alert.read` | Query: areaId?,from,to | AlertSummaryResponse | Aggregate open alerts by severity/status/area within scope. No leakage. |

**Business and UI rules**

- Landing page only

**Form contracts**

No mutation form on this page.

#### `/dashboard/executive/pusat-komando/direktif` — Strategic Directives

**Function:** `list-detail` page for Strategic Directives.

**Page flow**

1. Load a scoped list and preserve filters in the URL.
2. Navigate to a dynamic detail route when a row is selected.
3. Render detail sections according to clearance and need-to-know.
4. Use explicit actions for state transitions and return to the preserved list state.

**Displayed data**

- Directive table
- Current version
- Recipients
- Target areas
- Acknowledgement
- Progress

**Filters / URL params**

- `q`
- `status`
- `classification`
- `areaId`
- `from`
- `to`
- `page`
- `limit`

**Actions and navigation**

- POST /api/v1/directives
- POST /api/v1/directives/{directiveId}/versions
- POST /api/v1/directive-versions/{versionId}/publish
- POST /api/v1/directive-versions/{versionId}/distribute

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/directives` | Daftar direktif | `directive.read` | Query: page,limit,status,ownerUnitId,areaId,classification,from,to,search,assignedToMe | Paged<DirectiveSummary> | Join current version; apply recipient/unit/position, org/area scope and clearance filters. Only current version fields in summary. |
| `GET` | `/directives/{directiveId}` | Detail directive current version | `directive.read` | Query: include=recipients,targets,versions,tracking | DirectiveDetail | Load root, current version and relations under security filter. Classified inaccessible resource returns 404. |
| `GET` | `/directives/{directiveId}/versions` | Riwayat versi directive | `directive.read` | Query: page,limit | Paged<DirectiveVersionSummary> | Order versionNumber desc. Published versions immutable. |
| `GET` | `/directives/{directiveId}/tracking` | Tracking pelaksanaan direktif | `directive.track` | Query: areaId?,unitId?,includeTasks=true | DirectiveTrackingResponse | Aggregate recipient status, descendant tasks, assignments, progress and linked Baket by area/unit. Counts must use same scoped filter as detail. |
| `POST` | `/directives` | Buat directive dan versi awal | `directive.create` | {"ownerUnitId":"uuid","version":{"commandNumber":"...","classification":"RAHASIA","commandSource":"...","commandIssuer":"...","commandDate":"ISO","dueDate":"ISO","strategicIssue":"...","commandDescription":"...","targetAreaIds":["uuid"],"recipients":[{"targetUnitId":"uuid"}]}} | 201 DirectiveDetail | Transaction create root+version1+targets+recipients draft; validate clearance and recipient target exactly-one. Executive/authorized issuer only; commandNumber SHALL remain identical across revisions by service invariant until moved to Directive root. |
| `POST` | `/directives/{directiveId}/versions` | Buat versi revisi | `directive.update` | {"basedOnVersionId":"uuid","changeReason":"string","patch":{"dueDate":"ISO","strategicIssue":"...","commandDescription":"...","targetAreaIds":[],"recipients":[]}} | 201 DirectiveVersionDetail | Lock root; clone latest; apply patch; increment currentVersionNumber; insert new relations. Allowed only before completion/cancel; preserve prior version. |
| `POST` | `/directive-versions/{versionId}/publish` | Publish directive | `directive.publish` | {"confirmation":"PUBLISH","note":"string optional"} | DirectiveDetail | Validate mandatory fields, at least one target/recipient, clearance; set status PUBLISHED; freeze version; create audit. Idempotency-Key; cannot unpublish. |
| `POST` | `/directive-versions/{versionId}/distribute` | Distribusikan directive | `directive.distribute` | {"sendNotifications":true,"scheduledAt":"ISO optional"} | DistributionActionResponse | Create/send recipient deliveries, set status DISTRIBUTED; enqueue notifications/read tracking. Only published current version; retry safe via idempotency. |

**Business and UI rules**

- Published version immutable
- Target area and recipient validation required

**Form contracts**

#### Form `F-DIRECTIVE`

**Endpoint:** `POST /api/v1/directives`

```json
{
  "ownerUnitId": "uuid",
  "version": {
    "commandNumber": "string",
    "classification": "RAHASIA",
    "commandSource": "string",
    "commandIssuer": "string",
    "commandDate": "ISO",
    "dueDate": "ISO|null",
    "strategicIssue": "string|null",
    "commandDescription": "string"
  },
  "targetAreaIds": [
    "uuid"
  ],
  "recipientTargets": [
    {
      "targetPositionId": "uuid"
    }
  ]
}
```

Rules:

- Exactly one recipient target per row.
- Publish and distribute are separate actions.

#### `/dashboard/executive/pusat-komando/direktif-strategis` — Directive Builder

**Function:** `wizard` page for Directive Builder.

**Page flow**

1. Load reference data and permitted selectable resources.
2. Persist a draft before advancing beyond the first meaningful step.
3. Validate each step on the client for usability and again on the server for authority.
4. Submit the final immutable version using an explicit action endpoint.
5. Redirect to the canonical detail or tracking route.

**Displayed data**

- Step 1 identity
- Step 2 content
- Step 3 target areas
- Step 4 recipients
- Step 5 review

**Filters / URL params**

- No page-level filters; use route params or the current authorization context.

**Actions and navigation**

- POST /api/v1/directives
- POST /api/v1/directive-versions/{versionId}/publish
- POST /api/v1/directive-versions/{versionId}/distribute

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/reference-data/enums` | Enum/reference untuk UI | `authenticated` | Query: names=RoleCode,PositionCode,... | ReferenceDataResponse | Serve allowlisted enum values and labels; cache. Do not expose internal-only enums unless requested. |
| `GET` | `/administrative-areas/tree` | Cascading tree wilayah | `area.read` | Query: rootId?,maxDepth=3,levels?,includeBoundaryStatus=true | AdministrativeAreaTreeResponse | Fetch closure descendants; annotate boundary availability and childCount. Payload depth capped. |
| `GET` | `/positions` | Daftar seat/jabatan | `position.read` | Query: page,limit,search,code,roleCode,unitId,reportsToPositionId,isActive | Paged<PositionSummary> | Filter Position and join role/unit/current occupant. Apply org scope. |
| `GET` | `/organization-units` | Daftar unit organisasi | `organization.read` | Query: page,limit,search,type,parentId,isActive,branchType? | Paged<OrganizationUnitSummary> | Apply organization scope via OrganizationUnitClosure; optional direct children by parentId. Default deletedAt IS NULL. |
| `POST` | `/directives` | Buat directive dan versi awal | `directive.create` | {"ownerUnitId":"uuid","version":{"commandNumber":"...","classification":"RAHASIA","commandSource":"...","commandIssuer":"...","commandDate":"ISO","dueDate":"ISO","strategicIssue":"...","commandDescription":"...","targetAreaIds":["uuid"],"recipients":[{"targetUnitId":"uuid"}]}} | 201 DirectiveDetail | Transaction create root+version1+targets+recipients draft; validate clearance and recipient target exactly-one. Executive/authorized issuer only; commandNumber SHALL remain identical across revisions by service invariant until moved to Directive root. |
| `POST` | `/directive-versions/{versionId}/publish` | Publish directive | `directive.publish` | {"confirmation":"PUBLISH","note":"string optional"} | DirectiveDetail | Validate mandatory fields, at least one target/recipient, clearance; set status PUBLISHED; freeze version; create audit. Idempotency-Key; cannot unpublish. |
| `POST` | `/directive-versions/{versionId}/distribute` | Distribusikan directive | `directive.distribute` | {"sendNotifications":true,"scheduledAt":"ISO optional"} | DistributionActionResponse | Create/send recipient deliveries, set status DISTRIBUTED; enqueue notifications/read tracking. Only published current version; retry safe via idempotency. |

**Business and UI rules**

- Prefer merge with directive list as create route; avoid duplicated business logic

**Form contracts**

#### Form `F-DIRECTIVE`

**Endpoint:** `POST /api/v1/directives`

```json
{
  "ownerUnitId": "uuid",
  "version": {
    "commandNumber": "string",
    "classification": "RAHASIA",
    "commandSource": "string",
    "commandIssuer": "string",
    "commandDate": "ISO",
    "dueDate": "ISO|null",
    "strategicIssue": "string|null",
    "commandDescription": "string"
  },
  "targetAreaIds": [
    "uuid"
  ],
  "recipientTargets": [
    {
      "targetPositionId": "uuid"
    }
  ]
}
```

Rules:

- Exactly one recipient target per row.
- Publish and distribute are separate actions.

#### `/dashboard/executive/pusat-komando/operasi-darurat` — Emergency Operations

**Function:** `map-command` page for Emergency Operations.

**Page flow**

1. Load scoped incidents, alerts, boundaries, and map layers.
2. Select an incident from the map or queue and open the canonical action workspace.
3. Execute command actions only when the server exposes them.
4. Refresh incident, alert, notification, and map data after each action.

**Displayed data**

- Live incident map
- Critical queue
- Incident timeline
- Assigned positions
- Action status

**Filters / URL params**

- `status`
- `severity`
- `areaId`
- `from`
- `to`
- `bbox`
- `zoom`

**Actions and navigation**

- POST /api/v1/emergency-incidents/{incidentId}/acknowledge
- POST /api/v1/emergency-incidents/{incidentId}/verify
- POST /api/v1/emergency-incidents/{incidentId}/start-response
- POST /api/v1/emergency-incidents/{incidentId}/mark-controlled
- POST /api/v1/emergency-incidents/{incidentId}/resolve

**Map mode:** `emergency-command`

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/emergency-incidents` | Daftar insiden darurat | `emergency.read` | Query: cursor,limit,status,severity,areaId,from,to,reportedByAssignmentId | CursorPage<EmergencyIncidentSummary> | Apply command chain/area scope; order severity and createdAt. Emergency visibility may bypass normal path only for designated leaders. |
| `GET` | `/alerts` | Daftar alert | `alert.read` | Query: cursor,limit,status,severity,areaId,assignedPositionId,sourceBaketId,sourceIncidentId,from,to | CursorPage<AlertSummary> | Apply target assignment/command chain/area scope. Order unresolved severity desc, createdAt desc. |
| `GET` | `/map/reports` | Marker laporan pada viewport | `map.read` | Query: bbox,zoom,areaId?,from,to,status?,urgency?,limit<=5000 | MapReportFeatureCollection | Spatial query locationPoint ST_Intersects viewport; also area closure filter; return minimal popup properties. At low zoom require clusters instead of raw markers. |
| `POST` | `/emergency-incidents/{incidentId}/acknowledge` | Acknowledge insiden | `emergency.manage` | {"note":"string optional"} | EmergencyIncidentDetail | NEW→ACKNOWLEDGED. Authorized command/picket. |
| `POST` | `/emergency-incidents/{incidentId}/verify` | Verifikasi cepat | `emergency.verify` | {"note":"string","verifiedSeverity":"CRITICAL"} | EmergencyIncidentDetail | ACKNOWLEDGED/NEW→VERIFIED; record verifier in audit (schema may add field). Fast verification does not replace later formal report. |
| `POST` | `/emergency-incidents/{incidentId}/start-response` | Mulai penanganan | `emergency.manage` | {"actionPlan":"string optional"} | EmergencyIncidentDetail | VERIFIED/ACKNOWLEDGED→IN_PROGRESS. Notify involved positions. |
| `POST` | `/emergency-incidents/{incidentId}/mark-controlled` | Tandai situasi terkendali | `emergency.manage` | {"note":"string"} | EmergencyIncidentDetail | IN_PROGRESS→CONTROLLED. Reason/note required. |
| `POST` | `/emergency-incidents/{incidentId}/resolve` | Selesaikan insiden | `emergency.manage` | {"resolution":"string","resolvedAt":"ISO optional"} | EmergencyIncidentDetail | CONTROLLED/IN_PROGRESS→RESOLVED; set resolvedAt. Open critical alerts must be resolved/linked. |

**Business and UI rules**

- Command chain only
- Critical actions audited

**Form contracts**

#### Form `F-EMERGENCY-ACTION`

**Endpoint:** `POST /api/v1/emergency-incidents/{incidentId}/{acknowledge|verify|start-response|mark-controlled|resolve}`

```json
{
  "note": "string",
  "actionPlan": "string|null",
  "resolution": "string|null"
}
```

Rules:

- Body varies by action; state transition validated.

#### `/dashboard/executive/situasi-nasional` — National Situation

**Function:** `landing` page for National Situation.

**Page flow**

1. Load summary counts and quick links for the module.
2. Show only actions permitted by the effective authorization context.
3. Navigate to actionable list, detail, or create routes.

**Displayed data**

- National situation scorecards
- Risk map preview
- Warning list
- Trend snapshot

**Filters / URL params**

- `areaId`
- `from`
- `to`

**Actions and navigation**

- Open warning
- Open risk map

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/dashboard/overview` | Overview dashboard sesuai role | `dashboard.read` | Query: areaId?,from,to,ownerUnitId?,classificationMax? | DashboardOverviewResponse | Resolve access context; aggregate report/task/directive/product/alert metrics using same scope CTE and time range. All widgets must use identical filter context. |
| `GET` | `/dashboard/trends` | Tren laporan/alert/status | `dashboard.read` | Query: metric=bakets\|alerts\|products\|tasks,interval=day\|week\|month,areaId?,from,to,groupBy? | TimeSeriesResponse | DATE_TRUNC interval over scoped dataset; fill zero buckets. Range/interval caps. |
| `GET` | `/alerts/summary` | Ringkasan alert | `alert.read` | Query: areaId?,from,to | AlertSummaryResponse | Aggregate open alerts by severity/status/area within scope. No leakage. |
| `GET` | `/map/area-summary` | Summary area terpilih | `map.read` | Query: areaId,from,to | MapAreaSummaryResponse | Aggregate all descendant events and return boundary/centroid plus KPI. Uses AdministrativeAreaClosure. |

**Business and UI rules**

- Real-time operational horizon

**Form contracts**

No mutation form on this page.

#### `/dashboard/executive/situasi-nasional/peringatan-dini` — National Early Warning

**Function:** `alert-queue` page for National Early Warning.

**Page flow**

1. Load alerts by severity, status, area, and period.
2. Open the alert action workspace.
3. Apply acknowledge/assign/start/resolve through explicit actions and refresh summary counters.

**Displayed data**

- Alert queue
- Severity
- Area
- Source
- Age
- Owner
- Status

**Filters / URL params**

- `status`
- `severity`
- `areaId`
- `from`
- `to`
- `page`
- `limit`

**Actions and navigation**

- POST /api/v1/alerts/{alertId}/acknowledge
- POST /api/v1/alerts/{alertId}/assign
- POST /api/v1/alerts/{alertId}/start
- POST /api/v1/alerts/{alertId}/resolve

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/alerts` | Daftar alert | `alert.read` | Query: cursor,limit,status,severity,areaId,assignedPositionId,sourceBaketId,sourceIncidentId,from,to | CursorPage<AlertSummary> | Apply target assignment/command chain/area scope. Order unresolved severity desc, createdAt desc. |
| `GET` | `/alerts/summary` | Ringkasan alert | `alert.read` | Query: areaId?,from,to | AlertSummaryResponse | Aggregate open alerts by severity/status/area within scope. No leakage. |
| `GET` | `/alerts/{alertId}` | Detail alert | `alert.read` | Tidak ada body | AlertDetail | Load scoped alert and source summaries. Source detail separate authorization. |
| `POST` | `/alerts/{alertId}/acknowledge` | Acknowledge alert | `alert.execute` | {"note":"string optional"} | AlertDetail | NEW→ACKNOWLEDGED; set acknowledgedAt. Assigned/command position. |
| `POST` | `/alerts/{alertId}/assign` | Assign alert | `alert.assign` | {"positionId":"uuid","note":"string optional"} | AlertDetail | Validate position active and area/branch overlap; set ASSIGNED. Notify occupant. |
| `POST` | `/alerts/{alertId}/start` | Mulai tindak lanjut alert | `alert.execute` | Tidak ada body | AlertDetail | ACKNOWLEDGED/ASSIGNED→IN_PROGRESS. Occupant only. |
| `POST` | `/alerts/{alertId}/resolve` | Selesaikan alert | `alert.execute` | {"resolution":"string"} | AlertDetail | IN_PROGRESS/ACKNOWLEDGED→RESOLVED; set resolvedAt. Resolution mandatory. |

**Business and UI rules**

- Executive actions may be restricted to command-level alerts

**Form contracts**

#### Form `F-ALERT-ACTION`

**Endpoint:** `POST /api/v1/alerts/{alertId}/{acknowledge|assign|start|resolve}`

```json
{
  "note": "string|null",
  "assignedPositionId": "uuid|null",
  "resolution": "string|null"
}
```

Rules:

- Body varies by action.

#### `/dashboard/executive/situasi-nasional/peta-kerawanan` — National Risk Map

**Function:** `map` page for National Risk Map.

**Page flow**

1. Initialize a controlled map viewport and URL-backed spatial filters.
2. Load administrative boundaries independently from point/cluster layers.
3. Debounce viewport changes before requesting bbox/zoom-scoped data.
4. Open a lightweight popup on selection and navigate to a canonical detail route for the full record.
5. Keep table, KPI, and map filters synchronized.

**Displayed data**

- Choropleth boundary
- Heatmap
- Report clusters
- Legend
- Area summary drawer

**Filters / URL params**

- `bbox`
- `zoom`
- `areaId`
- `from`
- `to`
- `metric`
- `status`
- `urgency`
- `viewMode`

**Actions and navigation**

- Click region to drill down
- Switch cluster/heatmap/choropleth

**Map mode:** `risk-choropleth`

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/administrative-areas/boundaries` | Boundary berdasarkan viewport | `area.read` | Query: bbox=minLng,minLat,maxLng,maxLat,level,zoom,limit | GeoJsonFeatureCollectionResponse | GiST ST_Intersects against envelope; choose simplification by zoom. Reject overly large bbox without coarse level. |
| `GET` | `/map/clusters` | Cluster laporan | `map.read` | Query: bbox,zoom,areaId?,from,to,status?,urgency? | MapClusterFeatureCollection | Use ST_SnapToGrid/geohash or clustering extension; count and centroid per cell under scope. No sensitive attributes in clusters. |
| `GET` | `/map/heatmap` | Heatmap laporan | `map.read` | Query: bbox,zoom,areaId?,from,to,metric=count\|urgencyWeight,status? | HeatmapResponse | Aggregate weighted points into tiles/grid; scoped. Cache by role-scope hash+filters; small-cell suppression for confidentiality. |
| `GET` | `/map/area-summary` | Summary area terpilih | `map.read` | Query: areaId,from,to | MapAreaSummaryResponse | Aggregate all descendant events and return boundary/centroid plus KPI. Uses AdministrativeAreaClosure. |

**Business and UI rules**

- Use aggregate properties; suppress small-cell sensitive data

**Form contracts**

No mutation form on this page.

#### `/dashboard/executive/situasi-strategis` — Strategic Situation

**Function:** `analytics` page for Strategic Situation.

**Page flow**

1. Read period, area, unit, grouping, and comparison filters from the URL.
2. Load server-calculated metrics derived from workflow events.
3. Allow drill-down only to resources within the same effective scope.
4. Display metric definitions and data freshness.

**Displayed data**

- 30/90-day trends
- Strategic issues
- Formal products
- Area comparison
- Risk movement

**Filters / URL params**

- `areaId`
- `from`
- `to`
- `interval`
- `productTypeId`
- `classification`

**Actions and navigation**

- Open analysis/product

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/dashboard/trends` | Tren laporan/alert/status | `dashboard.read` | Query: metric=bakets\|alerts\|products\|tasks,interval=day\|week\|month,areaId?,from,to,groupBy? | TimeSeriesResponse | DATE_TRUNC interval over scoped dataset; fill zero buckets. Range/interval caps. |
| `GET` | `/dashboard/area-breakdown` | Agregasi per wilayah | `dashboard.read` | Query: metric=bakets\|alerts\|emergencies,areaId,childLevel,from,to,limit | AreaBreakdownResponse | Find direct children/selected level via closure; group events by resolved descendant ancestor. Supports cascading filter. |
| `GET` | `/products` | Daftar produk intelijen | `product.read` | Query: page,limit,status,productTypeId,ownerUnitId,classification,areaId,periodFrom,periodTo,search,createdByAssignmentId | Paged<IntelligenceProductSummary> | Join current version/type; apply org/area/clearance/workflow/distribution scope. Only approved/distributed visibility for broader audiences. |
| `GET` | `/analysis-cases` | Daftar analysis case | `analysis.read` | Query: page,limit,status,ownerUnitId,periodFrom,periodTo,search,areaId? | Paged<AnalysisCaseSummary> | Filter owner unit via org closure and source Baket areas if area filter. OIM and authorized leaders. |

**Business and UI rules**

- Strategic horizon; do not duplicate real-time national page

**Form contracts**

No mutation form on this page.

#### `/dashboard/executive/situasi-strategis/peringatan-dini` — Strategic Warning Analysis

**Function:** `analytics-alerts` page for Strategic Warning Analysis.

**Page flow**

1. Load alert history and trend aggregates for the selected period.
2. Drill to canonical alert details and related products/analysis.

**Displayed data**

- Alert trends
- Recurring areas
- Severity movement
- Related products/analysis

**Filters / URL params**

- `areaId`
- `from`
- `to`
- `interval`
- `severity`
- `status`

**Actions and navigation**

- Open alert history
- Open related product

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/alerts` | Daftar alert | `alert.read` | Query: cursor,limit,status,severity,areaId,assignedPositionId,sourceBaketId,sourceIncidentId,from,to | CursorPage<AlertSummary> | Apply target assignment/command chain/area scope. Order unresolved severity desc, createdAt desc. |
| `GET` | `/dashboard/trends` | Tren laporan/alert/status | `dashboard.read` | Query: metric=bakets\|alerts\|products\|tasks,interval=day\|week\|month,areaId?,from,to,groupBy? | TimeSeriesResponse | DATE_TRUNC interval over scoped dataset; fill zero buckets. Range/interval caps. |
| `GET` | `/dashboard/area-breakdown` | Agregasi per wilayah | `dashboard.read` | Query: metric=bakets\|alerts\|emergencies,areaId,childLevel,from,to,limit | AreaBreakdownResponse | Find direct children/selected level via closure; group events by resolved descendant ancestor. Supports cascading filter. |

**Business and UI rules**

- Recommended shared component with national warning page using strategic preset

**Form contracts**

No mutation form on this page.

#### `/dashboard/executive/situasi-strategis/peta-kerawanan` — Strategic Risk Trend Map

**Function:** `map-analytics` page for Strategic Risk Trend Map.

**Page flow**

1. Load boundary geometry and aggregated spatial metrics.
2. Keep selected period, metric, area, bbox, and zoom in the URL.
3. Drill from parent areas to descendants without expanding authorization scope.
4. Use canonical domain details for point-level records.

**Displayed data**

- Area choropleth by period
- Compare-period toggle
- Trend drawer
- Heatmap

**Filters / URL params**

- `bbox`
- `zoom`
- `areaId`
- `from`
- `to`
- `compareFrom`
- `compareTo`
- `metric`

**Actions and navigation**

- Compare periods
- Drill to area

**Map mode:** `strategic-choropleth`

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/administrative-areas/boundaries` | Boundary berdasarkan viewport | `area.read` | Query: bbox=minLng,minLat,maxLng,maxLat,level,zoom,limit | GeoJsonFeatureCollectionResponse | GiST ST_Intersects against envelope; choose simplification by zoom. Reject overly large bbox without coarse level. |
| `GET` | `/map/heatmap` | Heatmap laporan | `map.read` | Query: bbox,zoom,areaId?,from,to,metric=count\|urgencyWeight,status? | HeatmapResponse | Aggregate weighted points into tiles/grid; scoped. Cache by role-scope hash+filters; small-cell suppression for confidentiality. |
| `GET` | `/dashboard/area-breakdown` | Agregasi per wilayah | `dashboard.read` | Query: metric=bakets\|alerts\|emergencies,areaId,childLevel,from,to,limit | AreaBreakdownResponse | Find direct children/selected level via closure; group events by resolved descendant ancestor. Supports cascading filter. |

**Business and UI rules**

- Current API can compose; compare-period endpoint optional

**Form contracts**

No mutation form on this page.

### 4.4 Regional Commander

#### `/dashboard/regional-commander` — Regional Command Dashboard

**Function:** `dashboard` page for Regional Command Dashboard.

**Page flow**

1. Resolve session, primary assignment, permission, organization scope, area scope, and clearance.
2. Read all page filters from URL search params.
3. Load independent widgets in parallel; one widget failure must not blank the entire page.
4. Render last-updated timestamp and applied-scope indicator.
5. Drill-down actions navigate to canonical list/detail routes.

**Displayed data**

- Regional KPIs
- Directive status
- Task progress
- Pending approvals
- Warnings
- Map summary

**Filters / URL params**

- `areaId`
- `from`
- `to`

**Actions and navigation**

- Open UUK/STR
- Open approval
- Open warning

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/dashboard/overview` | Overview dashboard sesuai role | `dashboard.read` | Query: areaId?,from,to,ownerUnitId?,classificationMax? | DashboardOverviewResponse | Resolve access context; aggregate report/task/directive/product/alert metrics using same scope CTE and time range. All widgets must use identical filter context. |
| `GET` | `/dashboard/kpis` | KPI operasional | `dashboard.read` | Query: areaId?,from,to,compareWithPrevious=true | DashboardKpiResponse | Aggregate counts, completion rates, verification SLA, approval backlog; compute comparison window. No count leakage outside scope. |
| `GET` | `/dashboard/directive-progress` | Progress direktif | `dashboard.read` | Query: directiveId?,areaId?,unitId? | DirectiveProgressDashboardResponse | Aggregate recipients/child tasks/Baket outputs by directive. Scoped. |
| `GET` | `/approval-inbox` | Inbox approval pengguna | `approval.read` | Query: page,limit,stage,status,routeType,classification,areaId,from,to | Paged<ApprovalInboxItem> | Find ACTIVE/WAITING steps whose targetPosition currently occupied by caller assignment; apply clearance/scope. No approval based solely on role. |
| `GET` | `/alerts/summary` | Ringkasan alert | `alert.read` | Query: areaId?,from,to | AlertSummaryResponse | Aggregate open alerts by severity/status/area within scope. No leakage. |
| `GET` | `/map/area-summary` | Summary area terpilih | `map.read` | Query: areaId,from,to | MapAreaSummaryResponse | Aggregate all descendant events and return boundary/centroid plus KPI. Uses AdministrativeAreaClosure. |

**Business and UI rules**

- Scope by Directorate/Binda branch and area

**Form contracts**

No mutation form on this page.

#### `/dashboard/regional-commander/direktif-penjabaran-uuk-str` — UUK/STR Elaboration

**Function:** `wizard-list` page for UUK/STR Elaboration.

**Page flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed data**

- Received directive
- UUK/STR versions
- Section completeness
- Target area
- Publication state

**Filters / URL params**

- `directiveVersionId`
- `status`
- `from`
- `to`
- `page`
- `limit`

**Actions and navigation**

- POST /api/v1/uuk-strs
- POST /api/v1/uuk-strs/{uukStrId}/versions
- PATCH /api/v1/uuk-str-versions/{versionId}
- PUT /api/v1/uuk-str-versions/{versionId}/sections
- POST /api/v1/uuk-str-versions/{versionId}/publish
- POST /api/v1/uuk-strs/{uukStrId}/cancel

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/directives` | Daftar direktif | `directive.read` | Query: page,limit,status,ownerUnitId,areaId,classification,from,to,search,assignedToMe | Paged<DirectiveSummary> | Join current version; apply recipient/unit/position, org/area scope and clearance filters. Only current version fields in summary. |
| `GET` | `/uuk-strs` | Daftar UUK/STR | `uuk.read` | Query: page,limit,status,ownerUnitId,directiveId,search | Paged<UukStrSummary> | Join current version and directive security scope. Clearance inherited from directive. |
| `GET` | `/uuk-strs/{uukStrId}` | Detail UUK/STR | `uuk.read` | Query: include=versions,sections,tasks | UukStrDetail | Load current version and scoped relations. No access beyond directive scope. |
| `GET` | `/uuk-strs/{uukStrId}/versions` | Riwayat versi UUK/STR | `uuk.read` | Query: page,limit | Paged<UukStrVersionSummary> | Order version desc. Immutable after publish. |
| `POST` | `/uuk-strs` | Buat UUK/STR versi awal | `uuk.create` | {"directiveVersionId":"uuid","ownerUnitId":"uuid","title":"...","sections":[{"sectionType":"BASIS_BACKGROUND","title":"...","items":[{"itemCode":"1","content":"...","orderNumber":1}]}]} | 201 UukStrDetail | Create root/version1/9 sections/items transactionally; validate directive current/published as policy. All mandatory section types required before publish. |
| `POST` | `/uuk-strs/{uukStrId}/versions` | Buat revisi UUK/STR | `uuk.update` | {"basedOnVersionId":"uuid","title":"...","changeReason":"...","sections":[...]} | 201 UukStrVersionDetail | Clone or replace all sections/items; increment current version. Preserve original UUK/PIR wording where required. |
| `PATCH` | `/uuk-str-versions/{versionId}` | Edit judul versi draft | `uuk.update` | {"title":"...","changeReason?":"..."} | UukStrVersionDetail | Current DRAFT only. Sections use dedicated PUT. |
| `PUT` | `/uuk-str-versions/{versionId}/sections` | Ganti seluruh section draft | `uuk.update` | {"sections":[{"sectionType":"...","title":"...","orderNumber":1,"items":[...]}]} | UukStrVersionDetail | Validate unique sectionType/order and required nine sections. Atomic replace; draft only. |
| `POST` | `/uuk-str-versions/{versionId}/publish` | Publish UUK/STR | `uuk.publish` | {"confirmation":"PUBLISH"} | UukStrDetail | Validate completeness; set status PUBLISHED; freeze version; notify relevant chain. Idempotency-Key. |
| `POST` | `/uuk-strs/{uukStrId}/cancel` | Batalkan UUK/STR | `uuk.cancel` | {"reason":"string"} | UukStrDetail | Set CANCELLED and preserve linked tasks/history. Cannot cancel after all linked tasks completed without executive override. |

**Business and UI rules**

- Mandatory sections before publish
- Published version immutable

**Form contracts**

#### Form `F-UUK-STR`

**Endpoint:** `POST /api/v1/uuk-strs or PUT /api/v1/uuk-str-versions/{versionId}/sections`

```json
{
  "directiveVersionId": "uuid",
  "ownerUnitId": "uuid",
  "title": "string",
  "sections": [
    {
      "sectionType": "BASIS_BACKGROUND",
      "title": "string",
      "orderNumber": 1,
      "items": [
        {
          "itemCode": "1.1",
          "content": "string",
          "orderNumber": 1
        }
      ]
    }
  ]
}
```

Rules:

- Mandatory sections before publish.

#### `/dashboard/regional-commander/jawaban-lapangan` — Field Answers

**Function:** `list-detail` page for Field Answers.

**Page flow**

1. Load a scoped list and preserve filters in the URL.
2. Navigate to a dynamic detail route when a row is selected.
3. Render detail sections according to clearance and need-to-know.
4. Use explicit actions for state transitions and return to the preserved list state.

**Displayed data**

- Task outputs
- Baket summaries
- Verification state
- Area
- Timeliness
- Traceability

**Filters / URL params**

- `directiveId`
- `taskId`
- `status`
- `areaId`
- `from`
- `to`
- `page`
- `limit`

**Actions and navigation**

- Open formal finding
- Open task cascade

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/tasks` | Daftar tugas | `task.read` | Query: page,limit,status,priority,ownerUnitId,assigneeAssignmentId,areaId,dueBefore,dueAfter,parentTaskId,directiveId,uukStrId,overdue? | Paged<TaskSummary> | Apply command chain, assignments, org/area scope and classification; current user's assigned/created/managed tasks. Overdue computed from dueDate and status. |
| `GET` | `/tasks/{taskId}/progress-summary` | Ringkasan progress | `task.read` | Query: groupBy=unit\|area\|position | TaskProgressSummaryResponse | Aggregate assignment statuses, overdue, latest progress by group. Same security filter as task list. |
| `GET` | `/bakets` | Daftar Baket | `baket.read` | Query: page,limit,status,urgency,createdByAssignmentId,taskAssignmentId,jaringId,areaId,from,to,search,coverageStatus | Paged<BaketSummary> | Join current version; apply owner/recipient OIM chain, area scope, org scope and classification if inherited. areaId includes descendants. |
| `GET` | `/bakets/{baketId}/traceability` | Traceability sumber-ke-produk | `baket.read` | Tidak ada body | BaketTraceabilityResponse | Graph source messages→versions→verification→analysis→products→approvals/distributions. Only nodes caller can access; report redacted node counts if policy allows. |

**Business and UI rules**

- Do not expose raw WhatsApp unless specifically authorized

**Form contracts**

No mutation form on this page.

#### `/dashboard/regional-commander/komando-regional` — Regional Command Center

**Function:** `command-board` page for Regional Command Center.

**Page flow**

1. Load active directives, UUK/STR, tasks, incidents, and scoped map summary.
2. Route creation and execution to their canonical feature modules.
3. Keep this page read-mostly and avoid duplicating domain forms.

**Displayed data**

- Active directives
- Published UUK/STR
- OIM tasking
- Emergency panel
- Regional map

**Filters / URL params**

- `areaId`
- `from`
- `to`
- `status`

**Actions and navigation**

- Create UUK/STR
- Open emergency
- Track directive

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/directives` | Daftar direktif | `directive.read` | Query: page,limit,status,ownerUnitId,areaId,classification,from,to,search,assignedToMe | Paged<DirectiveSummary> | Join current version; apply recipient/unit/position, org/area scope and clearance filters. Only current version fields in summary. |
| `GET` | `/uuk-strs` | Daftar UUK/STR | `uuk.read` | Query: page,limit,status,ownerUnitId,directiveId,search | Paged<UukStrSummary> | Join current version and directive security scope. Clearance inherited from directive. |
| `GET` | `/tasks` | Daftar tugas | `task.read` | Query: page,limit,status,priority,ownerUnitId,assigneeAssignmentId,areaId,dueBefore,dueAfter,parentTaskId,directiveId,uukStrId,overdue? | Paged<TaskSummary> | Apply command chain, assignments, org/area scope and classification; current user's assigned/created/managed tasks. Overdue computed from dueDate and status. |
| `GET` | `/emergency-incidents` | Daftar insiden darurat | `emergency.read` | Query: cursor,limit,status,severity,areaId,from,to,reportedByAssignmentId | CursorPage<EmergencyIncidentSummary> | Apply command chain/area scope; order severity and createdAt. Emergency visibility may bypass normal path only for designated leaders. |
| `GET` | `/map/area-summary` | Summary area terpilih | `map.read` | Query: areaId,from,to | MapAreaSummaryResponse | Aggregate all descendant events and return boundary/centroid plus KPI. Uses AdministrativeAreaClosure. |

**Business and UI rules**

- Regional Commander elaborates directive; OIM performs tasking

**Form contracts**

No mutation form on this page.

#### `/dashboard/regional-commander/kpi-evaluasi` — Regional KPI & Evaluation

**Function:** `analytics` page for Regional KPI & Evaluation.

**Page flow**

1. Read period, area, unit, grouping, and comparison filters from the URL.
2. Load server-calculated metrics derived from workflow events.
3. Allow drill-down only to resources within the same effective scope.
4. Display metric definitions and data freshness.

**Displayed data**

- Task KPI
- Directive progress
- Verification quality
- Product pipeline
- Area comparison

**Filters / URL params**

- `areaId`
- `unitId`
- `from`
- `to`
- `groupBy`
- `compareWithPrevious`

**Actions and navigation**

- Drill to unit/area

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/dashboard/kpis` | KPI operasional | `dashboard.read` | Query: areaId?,from,to,compareWithPrevious=true | DashboardKpiResponse | Aggregate counts, completion rates, verification SLA, approval backlog; compute comparison window. No count leakage outside scope. |
| `GET` | `/dashboard/task-performance` | Kinerja tugas | `dashboard.read` | Query: areaId?,unitId?,from,to,groupBy=unit\|position\|area | TaskPerformanceResponse | Aggregate assignment statuses, overdue, avg completion time and workload. Only managerial command chain. |
| `GET` | `/dashboard/directive-progress` | Progress direktif | `dashboard.read` | Query: directiveId?,areaId?,unitId? | DirectiveProgressDashboardResponse | Aggregate recipients/child tasks/Baket outputs by directive. Scoped. |
| `GET` | `/dashboard/verification-quality` | Kualitas verification | `dashboard.read` | Query: areaId?,unitId?,from,to | VerificationQualityResponse | Aggregate A-F/1-6 distribution, needs-development rate, turnaround time. Interpret cautiously; source identity hidden. |
| `GET` | `/dashboard/product-status` | Pipeline produk | `dashboard.read` | Query: areaId?,ownerUnitId?,from,to | ProductPipelineResponse | Aggregate ProductStatus and approval aging. Classification filter. |
| `GET` | `/dashboard/area-breakdown` | Agregasi per wilayah | `dashboard.read` | Query: metric=bakets\|alerts\|emergencies,areaId,childLevel,from,to,limit | AreaBreakdownResponse | Find direct children/selected level via closure; group events by resolved descendant ancestor. Supports cascading filter. |

**Business and UI rules**

- No ranking based on unverified raw data

**Form contracts**

No mutation form on this page.

#### `/dashboard/regional-commander/laporan-intelijen` — Regional Intelligence Findings

**Function:** `catalog` page for Regional Intelligence Findings.

**Page flow**

1. Load formal catalog entries with scope and classification filters.
2. Open immutable detail/version routes.
3. Expose distribution/archive actions only when returned by the server.

**Displayed data**

- Verified Baket summary
- Analysis cases
- Area
- Issue
- Confidence/score summary
- Period

**Filters / URL params**

- `q`
- `areaId`
- `from`
- `to`
- `status`
- `page`
- `limit`

**Actions and navigation**

- Open analysis
- Open verification summary

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/verifications` | Daftar verification | `verification.read` | Query: page,limit,status,verifiedByAssignmentId,baketId,areaId,from,to,reliability,credibility | Paged<VerificationSummary> | Join BaketVersion/Baket current context; OIM branch/area scope. Only OIM and authorized leaders. |
| `GET` | `/analysis-cases` | Daftar analysis case | `analysis.read` | Query: page,limit,status,ownerUnitId,periodFrom,periodTo,search,areaId? | Paged<AnalysisCaseSummary> | Filter owner unit via org closure and source Baket areas if area filter. OIM and authorized leaders. |
| `GET` | `/analysis-cases/{caseId}/traceability` | Traceability analysis | `analysis.read` | Tidak ada body | AnalysisTraceabilityResponse | Return verification→Baket→messages and downstream product links. Redact inaccessible source nodes. |

**Business and UI rules**

- Source identities masked by need-to-know

**Form contracts**

No mutation form on this page.

#### `/dashboard/regional-commander/laporan-produk-intelijen` — Regional Intelligence Products

**Function:** `catalog` page for Regional Intelligence Products.

**Page flow**

1. Load formal catalog entries with scope and classification filters.
2. Open immutable detail/version routes.
3. Expose distribution/archive actions only when returned by the server.

**Displayed data**

- Product list
- Type
- Status
- Version
- Classification
- Approval timeline
- Distribution

**Filters / URL params**

- `q`
- `status`
- `productTypeId`
- `classification`
- `areaId`
- `from`
- `to`
- `page`
- `limit`

**Actions and navigation**

- Open product
- Open approval

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/products` | Daftar produk intelijen | `product.read` | Query: page,limit,status,productTypeId,ownerUnitId,classification,areaId,periodFrom,periodTo,search,createdByAssignmentId | Paged<IntelligenceProductSummary> | Join current version/type; apply org/area/clearance/workflow/distribution scope. Only approved/distributed visibility for broader audiences. |
| `GET` | `/products/{productId}` | Detail produk current version | `product.read` | Query: include=versions,sources,approval,distribution,attachments | IntelligenceProductDetail | Load scoped product. Clearance and need-to-know. |
| `GET` | `/products/{productId}/timeline` | Timeline produk | `product.read` | Tidak ada body | TimelineResponse | Merge versions, workflow steps, decisions, distributions, audit. Scoped. |
| `GET` | `/products/{productId}/distribution-summary` | Ringkasan distribusi produk | `distribution.read` | Tidak ada body | DistributionSummaryResponse | Aggregate queued/sent/delivered/read/failed/revoked and recipient categories. Respect visibility. |

**Business and UI rules**

- Formal products only

**Form contracts**

No mutation form on this page.

#### `/dashboard/regional-commander/monitoring-tugas` — Regional Task Monitoring

**Function:** `analytics-tree` page for Regional Task Monitoring.

**Page flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed data**

- Directive-to-task tree
- Unit progress
- Overdue
- Area
- Baket output count

**Filters / URL params**

- `directiveId`
- `status`
- `areaId`
- `unitId`
- `from`
- `to`

**Actions and navigation**

- Open task cascade
- Open output

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/tasks` | Daftar tugas | `task.read` | Query: page,limit,status,priority,ownerUnitId,assigneeAssignmentId,areaId,dueBefore,dueAfter,parentTaskId,directiveId,uukStrId,overdue? | Paged<TaskSummary> | Apply command chain, assignments, org/area scope and classification; current user's assigned/created/managed tasks. Overdue computed from dueDate and status. |
| `GET` | `/tasks/{taskId}/cascade` | Visualisasi cascade tugas | `task.read` | Query: includeAssignments=true,maxDepth=10 | TaskCascadeResponse | Recursive CTE task hierarchy plus assignments. Scoped and depth-capped. |
| `GET` | `/tasks/{taskId}/progress-summary` | Ringkasan progress | `task.read` | Query: groupBy=unit\|area\|position | TaskProgressSummaryResponse | Aggregate assignment statuses, overdue, latest progress by group. Same security filter as task list. |
| `GET` | `/dashboard/task-performance` | Kinerja tugas | `dashboard.read` | Query: areaId?,unitId?,from,to,groupBy=unit\|position\|area | TaskPerformanceResponse | Aggregate assignment statuses, overdue, avg completion time and workload. Only managerial command chain. |

**Business and UI rules**

- Regional Commander monitors; OIM/Field Coordinator executes assignment

**Form contracts**

No mutation form on this page.

#### `/dashboard/regional-commander/persetujuan-regional` — Regional Approval

**Function:** `queue-detail` page for Regional Approval.

**Page flow**

1. Load the scoped work queue using URL filters.
2. Open the selected record through its canonical detail route.
3. Load detail, timeline, traceability, and server-calculated available actions.
4. Execute only explicit action endpoints; never patch workflow status directly.
5. Refresh the queue and notification badge after a successful action.

**Displayed data**

- Active approval steps
- Product
- Traceability
- Source analysis
- Classification
- Deadline

**Filters / URL params**

- `status`
- `productTypeId`
- `classification`
- `from`
- `to`
- `page`
- `limit`

**Actions and navigation**

- POST /api/v1/approval-steps/{stepId}/approve
- POST /api/v1/approval-steps/{stepId}/request-revision
- POST /api/v1/approval-steps/{stepId}/reject
- POST /api/v1/approval-steps/{stepId}/request-clarification

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/approval-inbox` | Inbox approval pengguna | `approval.read` | Query: page,limit,stage,status,routeType,classification,areaId,from,to | Paged<ApprovalInboxItem> | Find ACTIVE/WAITING steps whose targetPosition currently occupied by caller assignment; apply clearance/scope. No approval based solely on role. |
| `GET` | `/approval-steps/{stepId}` | Detail approval step | `approval.read` | Tidak ada body | ApprovalStepDetail | Authorize target occupant, creator chain, prior approvers or executive read. Decision notes redacted if policy. |
| `GET` | `/products/{productId}` | Detail produk current version | `product.read` | Query: include=versions,sources,approval,distribution,attachments | IntelligenceProductDetail | Load scoped product. Clearance and need-to-know. |
| `GET` | `/products/{productId}/traceability` | Traceability produk | `product.read` | Tidak ada body | ProductTraceabilityResponse | Graph product→sources→Baket→messages plus approval/distribution. Redacted by access. |
| `POST` | `/approval-steps/{stepId}/approve` | Approve step | `approval.decide` | {"note":"string optional","confirmation":"APPROVE"} | ApprovalWorkflowDetail | Lock workflow; verify step ACTIVE and caller occupies targetPosition; persist decision/decider/time; activate next step or complete; update ProductStatus. One decision only; idempotency. |
| `POST` | `/approval-steps/{stepId}/request-revision` | Kembalikan produk untuk revisi | `approval.decide` | {"note":"string","requiredChanges":["..."]} | ApprovalWorkflowDetail | Set step/workflow NEEDS_REVISION; product NEEDS_REVISION; notify OIM; do not mutate version. Note mandatory. |
| `POST` | `/approval-steps/{stepId}/reject` | Tolak produk | `approval.decide` | {"note":"string","confirmation":"REJECT"} | ApprovalWorkflowDetail | Set step REJECTED/workflow CANCELLED or terminal policy; product NEEDS_REVISION/ARCHIVED per rule. Elevated permission; reason mandatory. |
| `POST` | `/approval-steps/{stepId}/request-clarification` | Minta klarifikasi tanpa final decision | `approval.decide` | {"note":"string","dueAt":"ISO optional"} | ApprovalWorkflowDetail | Record decision REQUEST_CLARIFICATION or dedicated event; keep step ACTIVE; notify creator. Schema may need clarification event history to avoid overwriting. |

**Business and UI rules**

- Target position must match DIREKTUR_WILAYAH or KABINDA snapshot

**Form contracts**

#### Form `F-APPROVAL-DECISION`

**Endpoint:** `POST /api/v1/approval-steps/{stepId}/{approve|request-revision|reject|request-clarification}`

```json
{
  "note": "string",
  "requiredChanges": [
    "string"
  ]
}
```

Rules:

- Required changes mandatory for revision; note mandatory for reject.

#### `/dashboard/regional-commander/personel-jaring` — Regional Personnel & Jaring

**Function:** `tabs` page for Regional Personnel & Jaring.

**Page flow**

1. Store the active tab in the URL.
2. Load each tab only when selected.
3. Use canonical detail routes for records opened from a tab.

**Displayed data**

- Personnel counts
- Position occupancy
- Jaring status
- Coverage gaps
- Caretaker relationship

**Filters / URL params**

- `tab`
- `q`
- `status`
- `areaId`
- `unitId`
- `positionCode`
- `page`
- `limit`

**Actions and navigation**

- Open detail
- No direct caretaker mutation unless permission

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/position-assignments` | Daftar assignment | `assignment.read` | Query: page,limit,userProfileId,positionId,unitId,isActive,validAt | Paged<PositionAssignmentDetail> | Filter assignment and joins. Scoped by organization chain. |
| `GET` | `/jaring` | Daftar Jaring | `jaring.read` | Query: page,limit,search,status,caretakerAssignmentId,areaId,hasRecentMessage? | Paged<JaringSummary> | Filter by caretaker/area closure and caller command chain. Alias/phone field-level redaction by permission. |
| `GET` | `/jaring/{jaringId}/caretakers` | Riwayat caretaker | `jaring.read` | Query: activeOnly=false | List<JaringCaretakerAssignmentResponse> | Order validFrom desc. Scoped. |
| `GET` | `/dashboard/task-performance` | Kinerja tugas | `dashboard.read` | Query: areaId?,unitId?,from,to,groupBy=unit\|position\|area | TaskPerformanceResponse | Aggregate assignment statuses, overdue, avg completion time and workload. Only managerial command chain. |

**Business and UI rules**

- Regional aggregated view

**Form contracts**

No mutation form on this page.

#### `/dashboard/regional-commander/peta-peringatan-dini` — Regional Early Warning Map

**Function:** `map` page for Regional Early Warning Map.

**Page flow**

1. Initialize a controlled map viewport and URL-backed spatial filters.
2. Load administrative boundaries independently from point/cluster layers.
3. Debounce viewport changes before requesting bbox/zoom-scoped data.
4. Open a lightweight popup on selection and navigate to a canonical detail route for the full record.
5. Keep table, KPI, and map filters synchronized.

**Displayed data**

- Alert layer
- Emergency layer
- Report cluster
- Heatmap
- Boundary
- Area summary

**Filters / URL params**

- `bbox`
- `zoom`
- `areaId`
- `from`
- `to`
- `severity`
- `status`
- `urgency`
- `layers`

**Actions and navigation**

- Open alert
- Acknowledge/assign if permitted
- Drill area

**Map mode:** `regional-warning`

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/alerts` | Daftar alert | `alert.read` | Query: cursor,limit,status,severity,areaId,assignedPositionId,sourceBaketId,sourceIncidentId,from,to | CursorPage<AlertSummary> | Apply target assignment/command chain/area scope. Order unresolved severity desc, createdAt desc. |
| `GET` | `/emergency-incidents` | Daftar insiden darurat | `emergency.read` | Query: cursor,limit,status,severity,areaId,from,to,reportedByAssignmentId | CursorPage<EmergencyIncidentSummary> | Apply command chain/area scope; order severity and createdAt. Emergency visibility may bypass normal path only for designated leaders. |
| `GET` | `/map/clusters` | Cluster laporan | `map.read` | Query: bbox,zoom,areaId?,from,to,status?,urgency? | MapClusterFeatureCollection | Use ST_SnapToGrid/geohash or clustering extension; count and centroid per cell under scope. No sensitive attributes in clusters. |
| `GET` | `/map/heatmap` | Heatmap laporan | `map.read` | Query: bbox,zoom,areaId?,from,to,metric=count\|urgencyWeight,status? | HeatmapResponse | Aggregate weighted points into tiles/grid; scoped. Cache by role-scope hash+filters; small-cell suppression for confidentiality. |
| `GET` | `/administrative-areas/boundaries` | Boundary berdasarkan viewport | `area.read` | Query: bbox=minLng,minLat,maxLng,maxLat,level,zoom,limit | GeoJsonFeatureCollectionResponse | GiST ST_Intersects against envelope; choose simplification by zoom. Reject overly large bbox without coarse level. |
| `GET` | `/map/area-summary` | Summary area terpilih | `map.read` | Query: areaId,from,to | MapAreaSummaryResponse | Aggregate all descendant events and return boundary/centroid plus KPI. Uses AdministrativeAreaClosure. |

**Business and UI rules**

- Current alert/emergency list may be client-transformed; dedicated map endpoints are optional

**Form contracts**

#### Form `F-ALERT-ACTION`

**Endpoint:** `POST /api/v1/alerts/{alertId}/{acknowledge|assign|start|resolve}`

```json
{
  "note": "string|null",
  "assignedPositionId": "uuid|null",
  "resolution": "string|null"
}
```

Rules:

- Body varies by action.

### 4.5 Operational Intelligence Manager

#### `/dashboard/oim` — OIM Dashboard

**Function:** `dashboard` page for OIM Dashboard.

**Page flow**

1. Resolve session, primary assignment, permission, organization scope, area scope, and clearance.
2. Read all page filters from URL search params.
3. Load independent widgets in parallel; one widget failure must not blank the entire page.
4. Render last-updated timestamp and applied-scope indicator.
5. Drill-down actions navigate to canonical list/detail routes.

**Displayed data**

- Incoming Baket
- Verification queue
- Needs development
- Analysis cases
- Product drafts
- Field progress

**Filters / URL params**

- `areaId`
- `from`
- `to`

**Actions and navigation**

- Open verification
- Create analysis
- Create product

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/dashboard/overview` | Overview dashboard sesuai role | `dashboard.read` | Query: areaId?,from,to,ownerUnitId?,classificationMax? | DashboardOverviewResponse | Resolve access context; aggregate report/task/directive/product/alert metrics using same scope CTE and time range. All widgets must use identical filter context. |
| `GET` | `/dashboard/verification-quality` | Kualitas verification | `dashboard.read` | Query: areaId?,unitId?,from,to | VerificationQualityResponse | Aggregate A-F/1-6 distribution, needs-development rate, turnaround time. Interpret cautiously; source identity hidden. |
| `GET` | `/bakets` | Daftar Baket | `baket.read` | Query: page,limit,status,urgency,createdByAssignmentId,taskAssignmentId,jaringId,areaId,from,to,search,coverageStatus | Paged<BaketSummary> | Join current version; apply owner/recipient OIM chain, area scope, org scope and classification if inherited. areaId includes descendants. |
| `GET` | `/verifications` | Daftar verification | `verification.read` | Query: page,limit,status,verifiedByAssignmentId,baketId,areaId,from,to,reliability,credibility | Paged<VerificationSummary> | Join BaketVersion/Baket current context; OIM branch/area scope. Only OIM and authorized leaders. |
| `GET` | `/products` | Daftar produk intelijen | `product.read` | Query: page,limit,status,productTypeId,ownerUnitId,classification,areaId,periodFrom,periodTo,search,createdByAssignmentId | Paged<IntelligenceProductSummary> | Join current version/type; apply org/area/clearance/workflow/distribution scope. Only approved/distributed visibility for broader audiences. |

**Business and UI rules**

- OIM sees own branch and scope

**Form contracts**

No mutation form on this page.

#### `/dashboard/oim/analisis-intelijen` — Intelligence Analysis

**Function:** `workspace` page for Intelligence Analysis.

**Page flow**

1. Load the root resource, active version, traceability, and permitted sources.
2. Keep editable content separate from immutable historical versions.
3. Persist draft changes through version-specific endpoints.
4. Validate or finalize using explicit action endpoints.

**Displayed data**

- Analysis case list
- Source verifications
- Version editor
- Entities
- Relationships
- Graph
- Traceability

**Filters / URL params**

- `q`
- `status`
- `ownerUnitId`
- `from`
- `to`
- `page`
- `limit`

**Actions and navigation**

- POST /api/v1/analysis-cases
- PUT /api/v1/analysis-cases/{caseId}/sources
- POST /api/v1/analysis-cases/{caseId}/versions
- PATCH /api/v1/analysis-versions/{versionId}
- PUT /api/v1/analysis-versions/{versionId}/entities
- PUT /api/v1/analysis-versions/{versionId}/relationships
- POST /api/v1/analysis-versions/{versionId}/validate

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/analysis-cases` | Daftar analysis case | `analysis.read` | Query: page,limit,status,ownerUnitId,periodFrom,periodTo,search,areaId? | Paged<AnalysisCaseSummary> | Filter owner unit via org closure and source Baket areas if area filter. OIM and authorized leaders. |
| `GET` | `/analysis-cases/{caseId}` | Detail analysis case | `analysis.read` | Query: include=sources,versions,graphSummary | AnalysisCaseDetail | Load scoped case. Clearance from highest source classification. |
| `GET` | `/analysis-cases/{caseId}/graph` | Graph entities/relationships | `analysis.read` | Query: version=current\|number,entityType?,minConfidence? | AnalysisGraphResponse | Query entities/relationships for selected version. No raw AI-only nodes unless accepted. |
| `GET` | `/analysis-cases/{caseId}/traceability` | Traceability analysis | `analysis.read` | Tidak ada body | AnalysisTraceabilityResponse | Return verification→Baket→messages and downstream product links. Redact inaccessible source nodes. |
| `POST` | `/analysis-cases` | Buat analysis case | `analysis.create` | {"ownerUnitId":"uuid","title":"...","periodStart":"ISO optional","periodEnd":"ISO optional","verificationIds":["uuid"]} | 201 AnalysisCaseDetail | Validate all verifications VERIFIED and accessible; create case/version1 optional. At least one source recommended/required by policy. |
| `PUT` | `/analysis-cases/{caseId}/sources` | Ganti sumber verification | `analysis.update` | {"verificationIds":["uuid"]} | List<VerificationSummary> | Validate VERIFIED/access; replace source junction. Cannot remove source already cited by validated version without new version. |
| `POST` | `/analysis-cases/{caseId}/versions` | Buat versi analisis | `analysis.update` | {"basedOnVersionId":"uuid optional","indications":"...","analysis":"...","impact":"...","efforts":"...","recommendations":"...","aiDraft":{} optional} | 201 AnalysisVersionDetail | Create new version, optionally clone entities/relationships; increment current version. AI draft must be marked and human validated before use. |
| `PATCH` | `/analysis-versions/{versionId}` | Edit versi analisis belum tervalidasi | `analysis.update` | {"indications?":"...","analysis?":"...","impact?":"...","efforts?":"...","recommendations?":"...","aiDraft?":{}} | AnalysisVersionDetail | Only current unvalidated version. validatedAt not patchable. |
| `PUT` | `/analysis-versions/{versionId}/entities` | Ganti entities | `analysis.update` | {"entities":[{"clientKey":"e1","entityType":"PERSON","name":"...","normalizedName":"...","metadata":{}}]} | List<AnalysisEntityResponse> | Atomic replace/upsert with client keys for relationship mapping. Unvalidated version only. |
| `PUT` | `/analysis-versions/{versionId}/relationships` | Ganti relationships | `analysis.update` | {"relationships":[{"fromEntityId":"uuid","toEntityId":"uuid","relationshipType":"...","description":"...","confidence":80}]} | List<AnalysisRelationshipResponse> | Validate both entities belong to same version; confidence 0..100. Unvalidated only. |
| `POST` | `/analysis-versions/{versionId}/validate` | Human validation analisis | `analysis.validate` | {"decision":"VALIDATE","note":"string optional"} | AnalysisVersionDetail | Ensure completeness/source traceability; set validatedBy/At and case VALIDATED. Validator may be distinct from creator per policy. |

**Business and UI rules**

- Sources must be VERIFIED
- AI draft requires human validation

**Form contracts**

#### Form `F-ANALYSIS-CASE`

**Endpoint:** `POST /api/v1/analysis-cases`

```json
{
  "ownerUnitId": "uuid",
  "title": "string",
  "periodStart": "ISO|null",
  "periodEnd": "ISO|null",
  "verificationIds": [
    "uuid"
  ]
}
```

Rules:

- All sources must be VERIFIED and readable by caller.

#### Form `F-ANALYSIS-VERSION`

**Endpoint:** `PATCH /api/v1/analysis-versions/{versionId}`

```json
{
  "indications": "string|null",
  "analysis": "string|null",
  "impact": "string|null",
  "efforts": "string|null",
  "recommendations": "string|null",
  "aiDraft": "JSON|null"
}
```

Rules:

- Validated version immutable.

#### `/dashboard/oim/direktif-tugas` — Directive & Tasking

**Function:** `list-builder` page for Directive & Tasking.

**Page flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed data**

- Received directives/UUK
- Task builder
- Field Coordinator candidates
- Target areas
- Progress

**Filters / URL params**

- `directiveId`
- `uukStrVersionId`
- `status`
- `priority`
- `areaId`
- `from`
- `to`

**Actions and navigation**

- POST /api/v1/tasks
- POST /api/v1/tasks/{taskId}/assignments
- PUT /api/v1/tasks/{taskId}/target-areas
- POST /api/v1/tasks/{taskId}/cancel

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/directives` | Daftar direktif | `directive.read` | Query: page,limit,status,ownerUnitId,areaId,classification,from,to,search,assignedToMe | Paged<DirectiveSummary> | Join current version; apply recipient/unit/position, org/area scope and clearance filters. Only current version fields in summary. |
| `GET` | `/uuk-strs` | Daftar UUK/STR | `uuk.read` | Query: page,limit,status,ownerUnitId,directiveId,search | Paged<UukStrSummary> | Join current version and directive security scope. Clearance inherited from directive. |
| `GET` | `/tasks` | Daftar tugas | `task.read` | Query: page,limit,status,priority,ownerUnitId,assigneeAssignmentId,areaId,dueBefore,dueAfter,parentTaskId,directiveId,uukStrId,overdue? | Paged<TaskSummary> | Apply command chain, assignments, org/area scope and classification; current user's assigned/created/managed tasks. Overdue computed from dueDate and status. |
| `GET` | `/position-assignments` | Daftar assignment | `assignment.read` | Query: page,limit,userProfileId,positionId,unitId,isActive,validAt | Paged<PositionAssignmentDetail> | Filter assignment and joins. Scoped by organization chain. |
| `POST` | `/tasks` | Buat tugas | `task.create` | {"parentTaskId":"uuid optional","directiveVersionId":"uuid optional","uukStrVersionId":"uuid optional","ownerUnitId":"uuid","title":"...","description":"...","classification":"TERBATAS","priority":"HIGH","dueDate":"ISO","targetAreaIds":["uuid"],"attachmentFileIds":[]} | 201 TaskDetail | Validate creator can task downward; source consistency; target areas subset of parent; dueDate <= parent dueDate. At least one source or explicit standalone reason. |
| `POST` | `/tasks/{taskId}/assignments` | Assign tugas ke personel | `task.assign` | {"assignments":[{"assigneeAssignmentId":"uuid","dueDate":"ISO","assignmentNote":"..."}]} | 201 List<TaskAssignmentDetail> | Validate direct/subordinate chain, active assignment, area overlap, clearance, workload policy; create assignment and notifications. No self-assign unless allowed; duplicate active assignment conflict. |
| `PUT` | `/tasks/{taskId}/target-areas` | Ganti target area tugas | `task.update` | {"areaIds":["uuid"]} | List<AreaSummary> | Validate scope and parent subset. Only before assignment or with controlled change version/audit. |
| `POST` | `/tasks/{taskId}/cancel` | Batalkan tugas | `task.cancel` | {"reason":"string","cascade":false} | TaskDetail | Set task CANCELLED; cancel eligible active assignments; optional cascade to child tasks. Completed assignments remain immutable. |

**Business and UI rules**

- OIM assigns Field Coordinator, not Field Officer directly

**Form contracts**

#### Form `F-TASK`

**Endpoint:** `POST /api/v1/tasks`

```json
{
  "parentTaskId": "uuid|null",
  "directiveVersionId": "uuid|null",
  "uukStrVersionId": "uuid|null",
  "ownerUnitId": "uuid",
  "title": "string",
  "description": "string",
  "classification": "TERBATAS",
  "priority": "HIGH",
  "dueDate": "ISO|null",
  "targetAreaIds": [
    "uuid"
  ]
}
```

Rules:

- Due date cannot exceed parent task/directive due date.

#### Form `F-TASK-ASSIGNMENT`

**Endpoint:** `POST /api/v1/tasks/{taskId}/assignments`

```json
{
  "assignments": [
    {
      "assigneeAssignmentId": "uuid",
      "dueDate": "ISO|null",
      "assignmentNote": "string|null"
    }
  ]
}
```

Rules:

- Assignee must be subordinate and area-compatible.

#### `/dashboard/oim/laporan-masuk` — Incoming Baket

**Function:** `queue-detail` page for Incoming Baket.

**Page flow**

1. Load the scoped work queue using URL filters.
2. Open the selected record through its canonical detail route.
3. Load detail, timeline, traceability, and server-calculated available actions.
4. Execute only explicit action endpoints; never patch workflow status directly.
5. Refresh the queue and notification badge after a successful action.

**Displayed data**

- Baket queue
- Field Officer
- Task
- Area
- Urgency
- Coverage status
- Submission time

**Filters / URL params**

- `status=SENT_TO_OIM,UNDER_VERIFICATION,NEEDS_DEVELOPMENT`
- `areaId`
- `urgency`
- `from`
- `to`
- `page`
- `limit`

**Actions and navigation**

- POST /api/v1/baket-versions/{versionId}/verification

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/bakets` | Daftar Baket | `baket.read` | Query: page,limit,status,urgency,createdByAssignmentId,taskAssignmentId,jaringId,areaId,from,to,search,coverageStatus | Paged<BaketSummary> | Join current version; apply owner/recipient OIM chain, area scope, org scope and classification if inherited. areaId includes descendants. |
| `GET` | `/bakets/{baketId}` | Detail Baket current version | `baket.read` | Query: include=versions,sources,attachments,revisionRequests,verification | BaketDetail | Load root/current version/traceability under access context. Verified data read-only for lower unit. |
| `GET` | `/bakets/{baketId}/traceability` | Traceability sumber-ke-produk | `baket.read` | Tidak ada body | BaketTraceabilityResponse | Graph source messages→versions→verification→analysis→products→approvals/distributions. Only nodes caller can access; report redacted node counts if policy allows. |
| `POST` | `/baket-versions/{versionId}/verification` | Buat canonical verification | `verification.create` | {"summary":"string optional"} | 201 VerificationDetail | Validate Baket SENT_TO_OIM/UNDER_VERIFICATION, caller OIM for branch, no canonical verification exists; set Baket UNDER_VERIFICATION. One canonical verification per BaketVersion. |

**Business and UI rules**

- This page receives Baket, not raw WhatsApp

**Form contracts**

#### Form `F-VERIFICATION-CREATE`

**Endpoint:** `POST /api/v1/baket-versions/{versionId}/verification`

```json
{
  "note": "string|null"
}
```

Rules:

- Only one canonical verification per BaketVersion.

#### `/dashboard/oim/monitoring-lapangan` — Field Monitoring

**Function:** `analytics-map` page for Field Monitoring.

**Page flow**

1. Load scoped aggregate metrics and spatial layers using one shared filter context.
2. Update charts and map together when the area or period changes.
3. Drill to canonical regional, task, report, or incident details.

**Displayed data**

- Task performance
- Field reports
- Personnel locations
- Emergencies
- Area map

**Filters / URL params**

- `areaId`
- `unitId`
- `from`
- `to`
- `status`
- `priority`
- `bbox`
- `zoom`

**Actions and navigation**

- Open task/report/emergency

**Map mode:** `oim-monitoring`

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/dashboard/task-performance` | Kinerja tugas | `dashboard.read` | Query: areaId?,unitId?,from,to,groupBy=unit\|position\|area | TaskPerformanceResponse | Aggregate assignment statuses, overdue, avg completion time and workload. Only managerial command chain. |
| `GET` | `/tasks` | Daftar tugas | `task.read` | Query: page,limit,status,priority,ownerUnitId,assigneeAssignmentId,areaId,dueBefore,dueAfter,parentTaskId,directiveId,uukStrId,overdue? | Paged<TaskSummary> | Apply command chain, assignments, org/area scope and classification; current user's assigned/created/managed tasks. Overdue computed from dueDate and status. |
| `GET` | `/bakets` | Daftar Baket | `baket.read` | Query: page,limit,status,urgency,createdByAssignmentId,taskAssignmentId,jaringId,areaId,from,to,search,coverageStatus | Paged<BaketSummary> | Join current version; apply owner/recipient OIM chain, area scope, org scope and classification if inherited. areaId includes descendants. |
| `GET` | `/personnel-location-map` | Peta lokasi personel terbaru | `location.read` | Query: areaId?,unitId?,capturedAfter?,includeStealth=false | PersonnelMapFeatureCollection | For authorized direct command chain, select DISTINCT ON assignment latest ping; apply area closure. Stealth requires explicit permission; small group masking. |
| `GET` | `/emergency-incidents` | Daftar insiden darurat | `emergency.read` | Query: cursor,limit,status,severity,areaId,from,to,reportedByAssignmentId | CursorPage<EmergencyIncidentSummary> | Apply command chain/area scope; order severity and createdAt. Emergency visibility may bypass normal path only for designated leaders. |

**Business and UI rules**

- Managerial direct command chain only

**Form contracts**

No mutation form on this page.

#### `/dashboard/oim/pengajuan-persetujuan` — Submission & Approval Tracking

**Function:** `queue` page for Submission & Approval Tracking.

**Page flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed data**

- Products ready to submit
- Validation errors
- Workflow status
- Regional step
- Executive step

**Filters / URL params**

- `status`
- `productTypeId`
- `classification`
- `from`
- `to`
- `page`
- `limit`

**Actions and navigation**

- POST /api/v1/product-versions/{versionId}/validate
- POST /api/v1/products/{productId}/submit

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/products` | Daftar produk intelijen | `product.read` | Query: page,limit,status,productTypeId,ownerUnitId,classification,areaId,periodFrom,periodTo,search,createdByAssignmentId | Paged<IntelligenceProductSummary> | Join current version/type; apply org/area/clearance/workflow/distribution scope. Only approved/distributed visibility for broader audiences. |
| `GET` | `/approval-workflows/{workflowId}` | Detail workflow approval | `approval.read` | Query: include=steps,product | ApprovalWorkflowDetail | Load workflow and ordered steps. Scoped. |
| `GET` | `/approval-workflows/{workflowId}/timeline` | Timeline approval | `approval.read` | Tidak ada body | TimelineResponse | Return step activations, decisions, revision cycles and notifications. Immutable history. |
| `POST` | `/product-versions/{versionId}/validate` | Validasi kesiapan submit | `product.update` | Tidak ada body | ProductValidationResponse | Check template, sources, classification, routing metadata, period, traceability. Returns warnings/errors; no state change. |
| `POST` | `/products/{productId}/submit` | Submit ke approval regional | `product.submit` | {"versionId":"uuid","confirmation":"SUBMIT"} | ApprovalWorkflowDetail | Validate current version; resolve routeType from creator branch; create approval workflow/steps Regional→Executive; set UNDER_REGIONAL_REVIEW. OIM only; idempotency. |

**Business and UI rules**

- Submit exact immutable product version

**Form contracts**

#### Form `F-PRODUCT-SUBMIT`

**Endpoint:** `POST /api/v1/products/{productId}/submit`

```json
{
  "versionId": "uuid",
  "confirmation": "SUBMIT"
}
```

Rules:

- Creates approval workflow snapshot.

#### `/dashboard/oim/peta-situasi` — OIM Situation Map

**Function:** `map` page for OIM Situation Map.

**Page flow**

1. Initialize a controlled map viewport and URL-backed spatial filters.
2. Load administrative boundaries independently from point/cluster layers.
3. Debounce viewport changes before requesting bbox/zoom-scoped data.
4. Open a lightweight popup on selection and navigate to a canonical detail route for the full record.
5. Keep table, KPI, and map filters synchronized.

**Displayed data**

- Verified report layer
- Incoming Baket layer
- Alert layer
- Heatmap
- Area boundary
- Popup with score summary

**Filters / URL params**

- `bbox`
- `zoom`
- `areaId`
- `from`
- `to`
- `status`
- `urgency`
- `viewMode`

**Actions and navigation**

- Open Baket/verification
- Create analysis from selected items

**Map mode:** `oim-situation`

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/map/reports` | Marker laporan pada viewport | `map.read` | Query: bbox,zoom,areaId?,from,to,status?,urgency?,limit<=5000 | MapReportFeatureCollection | Spatial query locationPoint ST_Intersects viewport; also area closure filter; return minimal popup properties. At low zoom require clusters instead of raw markers. |
| `GET` | `/map/clusters` | Cluster laporan | `map.read` | Query: bbox,zoom,areaId?,from,to,status?,urgency? | MapClusterFeatureCollection | Use ST_SnapToGrid/geohash or clustering extension; count and centroid per cell under scope. No sensitive attributes in clusters. |
| `GET` | `/map/heatmap` | Heatmap laporan | `map.read` | Query: bbox,zoom,areaId?,from,to,metric=count\|urgencyWeight,status? | HeatmapResponse | Aggregate weighted points into tiles/grid; scoped. Cache by role-scope hash+filters; small-cell suppression for confidentiality. |
| `GET` | `/administrative-areas/boundaries` | Boundary berdasarkan viewport | `area.read` | Query: bbox=minLng,minLat,maxLng,maxLat,level,zoom,limit | GeoJsonFeatureCollectionResponse | GiST ST_Intersects against envelope; choose simplification by zoom. Reject overly large bbox without coarse level. |
| `GET` | `/alerts` | Daftar alert | `alert.read` | Query: cursor,limit,status,severity,areaId,assignedPositionId,sourceBaketId,sourceIncidentId,from,to | CursorPage<AlertSummary> | Apply target assignment/command chain/area scope. Order unresolved severity desc, createdAt desc. |

**Business and UI rules**

- Source identity masked according to clearance

**Form contracts**

No mutation form on this page.

#### `/dashboard/oim/produk-intelijen` — Intelligence Products Workspace

**Function:** `landing` page for Intelligence Products Workspace.

**Page flow**

1. Load summary counts and quick links for the module.
2. Show only actions permitted by the effective authorization context.
3. Navigate to actionable list, detail, or create routes.

**Displayed data**

- Draft count
- Needs revision
- Submitted
- Approved
- Template shortcuts

**Filters / URL params**

- `status`
- `productTypeId`

**Actions and navigation**

- Create product
- Open product list

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/products` | Daftar produk intelijen | `product.read` | Query: page,limit,status,productTypeId,ownerUnitId,classification,areaId,periodFrom,periodTo,search,createdByAssignmentId | Paged<IntelligenceProductSummary> | Join current version/type; apply org/area/clearance/workflow/distribution scope. Only approved/distributed visibility for broader audiences. |
| `GET` | `/product-types` | Daftar jenis produk intelijen | `product.template.read` | Query: isActive? | List<ProductTypeResponse> | Read ProductTypeDefinition with active template version. Available to product creators. |

**Business and UI rules**

- Parent navigation

**Form contracts**

No mutation form on this page.

#### `/dashboard/oim/produk-intelijen/buat-produk` — Product Builder

**Function:** `dynamic-form` page for Product Builder.

**Page flow**

1. Load the active template and reference sources.
2. Generate form controls from the template schema.
3. Autosave only editable drafts and use optimistic concurrency.
4. Validate the complete content against the template before submission.
5. Submit the exact version and redirect to workflow tracking.

**Displayed data**

- Product type
- Template sections
- Source verifications
- Source analyses
- Attachments
- Validation panel

**Filters / URL params**

- No page-level filters; use route params or the current authorization context.

**Actions and navigation**

- POST /api/v1/products
- PATCH /api/v1/product-versions/{versionId}
- PUT /api/v1/product-versions/{versionId}/source-verifications
- PUT /api/v1/product-versions/{versionId}/source-analyses
- PUT /api/v1/product-versions/{versionId}/attachments
- POST /api/v1/product-versions/{versionId}/validate

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/product-types` | Daftar jenis produk intelijen | `product.template.read` | Query: isActive? | List<ProductTypeResponse> | Read ProductTypeDefinition with active template version. Available to product creators. |
| `GET` | `/product-types/{productTypeId}/templates` | Daftar versi template | `product.template.read` | Query: activeOnly=false | List<ProductTemplateSummary> | Order versionNumber desc. Template used by product remains readable. |
| `GET` | `/product-templates/{templateId}` | Detail template | `product.template.read` | Tidak ada body | ProductTemplateDetail | Load ordered sections/fields. Scoped by active product type. |
| `GET` | `/verifications` | Daftar verification | `verification.read` | Query: page,limit,status,verifiedByAssignmentId,baketId,areaId,from,to,reliability,credibility | Paged<VerificationSummary> | Join BaketVersion/Baket current context; OIM branch/area scope. Only OIM and authorized leaders. |
| `GET` | `/analysis-cases` | Daftar analysis case | `analysis.read` | Query: page,limit,status,ownerUnitId,periodFrom,periodTo,search,areaId? | Paged<AnalysisCaseSummary> | Filter owner unit via org closure and source Baket areas if area filter. OIM and authorized leaders. |
| `POST` | `/products` | Buat produk dan versi awal | `product.create` | {"productTypeId":"uuid","ownerUnitId":"uuid","classification":"RAHASIA","productNumber":"...","title":"...","periodStart":"ISO","periodEnd":"ISO","version":{"templateId":"uuid","routingTo":"...","routingFrom":"...","routingCc":"...","subject":"...","content":{},"sourceVerificationIds":[],"sourceAnalysisVersionIds":[],"attachmentFileIds":[]}} | 201 IntelligenceProductDetail | OIM only; validate template content, source access/status, classification >= sources; create root/version1/junctions. At least one verified source or validated analysis. |
| `PATCH` | `/product-versions/{versionId}` | Edit product version draft | `product.update` | {"routingTo?":"...","routingFrom?":"...","routingCc?":"...","subject?":"...","content?":{}} | ProductVersionDetail | Current version and product DRAFT/NEEDS_REVISION only; validate template. No status patch. |
| `PUT` | `/product-versions/{versionId}/source-verifications` | Ganti source verifications | `product.update` | {"verificationIds":["uuid"]} | List<VerificationSummary> | Validate VERIFIED and accessible; preserve traceability. Draft only. |
| `PUT` | `/product-versions/{versionId}/source-analyses` | Ganti source analyses | `product.update` | {"analysisVersionIds":["uuid"]} | List<AnalysisVersionSummary> | Validate human-validated analysis. Draft only. |
| `PUT` | `/product-versions/{versionId}/attachments` | Ganti lampiran | `product.update` | {"attachments":[{"fileId":"uuid","caption":"..."}]} | List<FileAssetResponse> | Validate clean files and classification handling. Draft only. |
| `POST` | `/product-versions/{versionId}/validate` | Validasi kesiapan submit | `product.update` | Tidak ada body | ProductValidationResponse | Check template, sources, classification, routing metadata, period, traceability. Returns warnings/errors; no state change. |

**Business and UI rules**

- Form generated from active template
- No PDF requirement

**Form contracts**

#### Form `F-PRODUCT`

**Endpoint:** `POST /api/v1/products and PATCH /api/v1/product-versions/{versionId}`

```json
{
  "productTypeId": "uuid",
  "ownerUnitId": "uuid",
  "classification": "RAHASIA",
  "productNumber": "string",
  "title": "string",
  "periodStart": "ISO|null",
  "periodEnd": "ISO|null",
  "templateId": "uuid",
  "content": {
    "fieldCode": "value"
  }
}
```

Rules:

- Content validated against active template.

#### `/dashboard/oim/produk-intelijen/daftar-produk` — Product List

**Function:** `list-detail` page for Product List.

**Page flow**

1. Load a scoped list and preserve filters in the URL.
2. Navigate to a dynamic detail route when a row is selected.
3. Render detail sections according to clearance and need-to-know.
4. Use explicit actions for state transitions and return to the preserved list state.

**Displayed data**

- Product table
- Type
- Status
- Version
- Classification
- Workflow
- Period

**Filters / URL params**

- `q`
- `status`
- `productTypeId`
- `classification`
- `areaId`
- `from`
- `to`
- `page`
- `limit`

**Actions and navigation**

- Create revision
- Validate
- Submit
- Archive

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/products` | Daftar produk intelijen | `product.read` | Query: page,limit,status,productTypeId,ownerUnitId,classification,areaId,periodFrom,periodTo,search,createdByAssignmentId | Paged<IntelligenceProductSummary> | Join current version/type; apply org/area/clearance/workflow/distribution scope. Only approved/distributed visibility for broader audiences. |
| `GET` | `/products/{productId}` | Detail produk current version | `product.read` | Query: include=versions,sources,approval,distribution,attachments | IntelligenceProductDetail | Load scoped product. Clearance and need-to-know. |
| `GET` | `/products/{productId}/versions` | Riwayat versi produk | `product.read` | Query: page,limit | Paged<ProductVersionSummary> | Order desc. Submitted/approved versions immutable. |
| `GET` | `/products/{productId}/timeline` | Timeline produk | `product.read` | Tidak ada body | TimelineResponse | Merge versions, workflow steps, decisions, distributions, audit. Scoped. |

**Business and UI rules**

- Submitted/approved versions immutable

**Form contracts**

#### Form `F-PRODUCT-REVISION`

**Endpoint:** `POST /api/v1/products/{productId}/versions`

```json
{
  "basedOnVersionId": "uuid",
  "templateId": "uuid",
  "changeReason": "string",
  "content": {
    "fieldCode": "value"
  }
}
```

#### `/dashboard/oim/verifikasi-neraca-penilaian` — Verification & Assessment Balance

**Function:** `workspace` page for Verification & Assessment Balance.

**Page flow**

1. Load the root resource, active version, traceability, and permitted sources.
2. Keep editable content separate from immutable historical versions.
3. Persist draft changes through version-specific endpoints.
4. Validate or finalize using explicit action endpoints.

**Displayed data**

- Verification queue
- Baket source
- Checklist
- Cross references
- A-F selector
- 1-6 selector
- Score interpretation
- Decision

**Filters / URL params**

- `status`
- `areaId`
- `verifiedByMe`
- `from`
- `to`
- `page`
- `limit`

**Actions and navigation**

- POST /api/v1/verifications/{verificationId}/start
- PATCH /api/v1/verifications/{verificationId}
- PUT /api/v1/verifications/{verificationId}/checks
- PUT /api/v1/verifications/{verificationId}/cross-references
- POST /api/v1/verifications/{verificationId}/complete
- POST /api/v1/verifications/{verificationId}/needs-development
- POST /api/v1/verifications/{verificationId}/reject

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/verifications` | Daftar verification | `verification.read` | Query: page,limit,status,verifiedByAssignmentId,baketId,areaId,from,to,reliability,credibility | Paged<VerificationSummary> | Join BaketVersion/Baket current context; OIM branch/area scope. Only OIM and authorized leaders. |
| `GET` | `/verifications/{verificationId}` | Detail verification | `verification.read` | Query: include=checks,crossReferences,baket | VerificationDetail | Load scoped verification. Source identity redaction as needed. |
| `GET` | `/verifications/{verificationId}/score` | Ringkasan Neraca Penilaian | `verification.read` | Tidak ada body | VerificationScoreResponse | Return A-F,1-6, matrix label and interpretation from controlled reference mapping. Interpretation is descriptive, not auto intelligence conclusion. |
| `POST` | `/verifications/{verificationId}/start` | Mulai verification | `verification.update` | Tidak ada body | VerificationDetail | DRAFT→IN_PROGRESS; startedAt if absent. Verifier assignment only or delegated OIM. |
| `PATCH` | `/verifications/{verificationId}` | Edit draft/in-progress verification | `verification.update` | {"sourceReliability?":"A","informationCredibility?":"ONE","summary?":"..."} | VerificationDetail | Update score/summary only before completed. A-F/1-6 only OIM. |
| `PUT` | `/verifications/{verificationId}/checks` | Ganti verification checklist | `verification.update` | {"checks":[{"code":"SOURCE_IDENTITY","label":"...","status":"PASS","note":"..."}]} | List<VerificationCheckResponse> | Validate required check codes; atomic upsert/replace. IN_PROGRESS only. |
| `PUT` | `/verifications/{verificationId}/cross-references` | Ganti cross references | `verification.update` | {"references":[{"relatedBaketId":"uuid optional","externalRef":"string optional","description":"..."}]} | List<VerificationCrossReferenceResponse> | Each item requires relatedBaketId or externalRef; validate access. IN_PROGRESS only. |
| `POST` | `/verifications/{verificationId}/complete` | Selesaikan verification valid | `verification.complete` | {"decision":"VERIFIED","summary":"..."} | VerificationDetail | Validate all mandatory checks, sourceReliability and informationCredibility; set VERIFIED/completedAt; Baket VERIFIED; notify/create analysis eligibility. Immutable after complete; idempotency. |
| `POST` | `/verifications/{verificationId}/needs-development` | Kembalikan untuk pengembangan | `verification.complete` | {"reason":"...","requiredInformation":"...","dueDate":"ISO optional"} | VerificationDetail | Set NEEDS_DEVELOPMENT/completedAt; create BaketRevisionRequest; set Baket NEEDS_DEVELOPMENT; notify Field Officer. Transactional. |
| `POST` | `/verifications/{verificationId}/reject` | Tolak Baket | `verification.complete` | {"reason":"string"} | VerificationDetail | Set REJECTED/completedAt and Baket REJECTED. Requires explicit reason and elevated permission. |

**Business and UI rules**

- Only OIM assigns A-F/1-6
- One canonical verification per BaketVersion

**Form contracts**

#### Form `F-VERIFICATION`

**Endpoint:** `PATCH /api/v1/verifications/{verificationId}`

```json
{
  "sourceReliability": "A",
  "informationCredibility": "TWO",
  "summary": "string"
}
```

Rules:

- Checklist and cross references use separate PUT endpoints.

### 4.6 Field Coordinator

#### `/dashboard/field-coordinator` — Field Coordination Dashboard

**Function:** `dashboard` page for Field Coordination Dashboard.

**Page flow**

1. Resolve session, primary assignment, permission, organization scope, area scope, and clearance.
2. Read all page filters from URL search params.
3. Load independent widgets in parallel; one widget failure must not blank the entire page.
4. Render last-updated timestamp and applied-scope indicator.
5. Drill-down actions navigate to canonical list/detail routes.

**Displayed data**

- Incoming tasks
- Team workload
- Overdue items
- Field map
- Emergencies
- Recent Baket outputs

**Filters / URL params**

- `areaId`
- `from`
- `to`

**Actions and navigation**

- Acknowledge task
- Assign Field Officer
- Open emergency

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/dashboard/overview` | Overview dashboard sesuai role | `dashboard.read` | Query: areaId?,from,to,ownerUnitId?,classificationMax? | DashboardOverviewResponse | Resolve access context; aggregate report/task/directive/product/alert metrics using same scope CTE and time range. All widgets must use identical filter context. |
| `GET` | `/dashboard/task-performance` | Kinerja tugas | `dashboard.read` | Query: areaId?,unitId?,from,to,groupBy=unit\|position\|area | TaskPerformanceResponse | Aggregate assignment statuses, overdue, avg completion time and workload. Only managerial command chain. |
| `GET` | `/tasks` | Daftar tugas | `task.read` | Query: page,limit,status,priority,ownerUnitId,assigneeAssignmentId,areaId,dueBefore,dueAfter,parentTaskId,directiveId,uukStrId,overdue? | Paged<TaskSummary> | Apply command chain, assignments, org/area scope and classification; current user's assigned/created/managed tasks. Overdue computed from dueDate and status. |
| `GET` | `/personnel-location-map` | Peta lokasi personel terbaru | `location.read` | Query: areaId?,unitId?,capturedAfter?,includeStealth=false | PersonnelMapFeatureCollection | For authorized direct command chain, select DISTINCT ON assignment latest ping; apply area closure. Stealth requires explicit permission; small group masking. |
| `GET` | `/emergency-incidents` | Daftar insiden darurat | `emergency.read` | Query: cursor,limit,status,severity,areaId,from,to,reportedByAssignmentId | CursorPage<EmergencyIncidentSummary> | Apply command chain/area scope; order severity and createdAt. Emergency visibility may bypass normal path only for designated leaders. |

**Business and UI rules**

- Only own command branch and area scope

**Form contracts**

No mutation form on this page.

#### `/dashboard/field-coordinator/laporan-darurat` — Field Emergency Monitor

**Function:** `queue-map` page for Field Emergency Monitor.

**Page flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed data**

- Incident list
- Map
- Severity
- Status
- Reporter
- Response timeline

**Filters / URL params**

- `status`
- `severity`
- `areaId`
- `from`
- `to`
- `bbox`
- `zoom`

**Actions and navigation**

- POST /api/v1/emergency-incidents/{incidentId}/acknowledge
- POST /api/v1/emergency-incidents/{incidentId}/verify
- POST /api/v1/emergency-incidents/{incidentId}/start-response
- POST /api/v1/emergency-incidents/{incidentId}/mark-controlled
- POST /api/v1/emergency-incidents/{incidentId}/resolve

**Map mode:** `emergency-field`

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/emergency-incidents` | Daftar insiden darurat | `emergency.read` | Query: cursor,limit,status,severity,areaId,from,to,reportedByAssignmentId | CursorPage<EmergencyIncidentSummary> | Apply command chain/area scope; order severity and createdAt. Emergency visibility may bypass normal path only for designated leaders. |
| `GET` | `/emergency-incidents/{incidentId}` | Detail insiden | `emergency.read` | Query: include=attachments,alerts,timeline | EmergencyIncidentDetail | Load scoped incident. Sensitive coordinates only to authorized command. |
| `GET` | `/alerts` | Daftar alert | `alert.read` | Query: cursor,limit,status,severity,areaId,assignedPositionId,sourceBaketId,sourceIncidentId,from,to | CursorPage<AlertSummary> | Apply target assignment/command chain/area scope. Order unresolved severity desc, createdAt desc. |
| `POST` | `/emergency-incidents/{incidentId}/acknowledge` | Acknowledge insiden | `emergency.manage` | {"note":"string optional"} | EmergencyIncidentDetail | NEW→ACKNOWLEDGED. Authorized command/picket. |
| `POST` | `/emergency-incidents/{incidentId}/verify` | Verifikasi cepat | `emergency.verify` | {"note":"string","verifiedSeverity":"CRITICAL"} | EmergencyIncidentDetail | ACKNOWLEDGED/NEW→VERIFIED; record verifier in audit (schema may add field). Fast verification does not replace later formal report. |
| `POST` | `/emergency-incidents/{incidentId}/start-response` | Mulai penanganan | `emergency.manage` | {"actionPlan":"string optional"} | EmergencyIncidentDetail | VERIFIED/ACKNOWLEDGED→IN_PROGRESS. Notify involved positions. |
| `POST` | `/emergency-incidents/{incidentId}/mark-controlled` | Tandai situasi terkendali | `emergency.manage` | {"note":"string"} | EmergencyIncidentDetail | IN_PROGRESS→CONTROLLED. Reason/note required. |
| `POST` | `/emergency-incidents/{incidentId}/resolve` | Selesaikan insiden | `emergency.manage` | {"resolution":"string","resolvedAt":"ISO optional"} | EmergencyIncidentDetail | CONTROLLED/IN_PROGRESS→RESOLVED; set resolvedAt. Open critical alerts must be resolved/linked. |

**Business and UI rules**

- Direct command chain only

**Form contracts**

#### Form `F-EMERGENCY-ACTION`

**Endpoint:** `POST /api/v1/emergency-incidents/{incidentId}/{acknowledge|verify|start-response|mark-controlled|resolve}`

```json
{
  "note": "string",
  "actionPlan": "string|null",
  "resolution": "string|null"
}
```

Rules:

- Body varies by action; state transition validated.

#### `/dashboard/field-coordinator/laporan-lapangan` — Field Reports

**Function:** `list-detail` page for Field Reports.

**Page flow**

1. Load a scoped list and preserve filters in the URL.
2. Navigate to a dynamic detail route when a row is selected.
3. Render detail sections according to clearance and need-to-know.
4. Use explicit actions for state transitions and return to the preserved list state.

**Displayed data**

- Baket from subordinate Field Officers
- Status
- Urgency
- Area
- Task
- Latest version
- Coverage flag

**Filters / URL params**

- `q`
- `status`
- `urgency`
- `areaId`
- `assigneeAssignmentId`
- `taskId`
- `from`
- `to`
- `page`
- `limit`

**Actions and navigation**

- Open detail
- Open source task
- No formal verification action

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/bakets` | Daftar Baket | `baket.read` | Query: page,limit,status,urgency,createdByAssignmentId,taskAssignmentId,jaringId,areaId,from,to,search,coverageStatus | Paged<BaketSummary> | Join current version; apply owner/recipient OIM chain, area scope, org scope and classification if inherited. areaId includes descendants. |
| `GET` | `/bakets/{baketId}` | Detail Baket current version | `baket.read` | Query: include=versions,sources,attachments,revisionRequests,verification | BaketDetail | Load root/current version/traceability under access context. Verified data read-only for lower unit. |
| `GET` | `/bakets/{baketId}/timeline` | Timeline Baket | `baket.read` | Tidak ada body | TimelineResponse | Merge versions, status events, revision requests, verification, audit events sorted time. Field-level redaction. |

**Business and UI rules**

- Field Coordinator does not assign A-F/1-6

**Form contracts**

No mutation form on this page.

#### `/dashboard/field-coordinator/monitoring-tugas` — Task Monitoring

**Function:** `analytics-table` page for Task Monitoring.

**Page flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed data**

- Task tree
- Assignment status
- Progress
- Overdue
- Team workload
- Area

**Filters / URL params**

- `status`
- `priority`
- `areaId`
- `assigneeAssignmentId`
- `from`
- `to`
- `groupBy`

**Actions and navigation**

- Open assignment
- Reassign if permitted
- Escalate emergency operationally

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/tasks` | Daftar tugas | `task.read` | Query: page,limit,status,priority,ownerUnitId,assigneeAssignmentId,areaId,dueBefore,dueAfter,parentTaskId,directiveId,uukStrId,overdue? | Paged<TaskSummary> | Apply command chain, assignments, org/area scope and classification; current user's assigned/created/managed tasks. Overdue computed from dueDate and status. |
| `GET` | `/tasks/{taskId}/cascade` | Visualisasi cascade tugas | `task.read` | Query: includeAssignments=true,maxDepth=10 | TaskCascadeResponse | Recursive CTE task hierarchy plus assignments. Scoped and depth-capped. |
| `GET` | `/tasks/{taskId}/progress-summary` | Ringkasan progress | `task.read` | Query: groupBy=unit\|area\|position | TaskProgressSummaryResponse | Aggregate assignment statuses, overdue, latest progress by group. Same security filter as task list. |
| `GET` | `/dashboard/task-performance` | Kinerja tugas | `dashboard.read` | Query: areaId?,unitId?,from,to,groupBy=unit\|position\|area | TaskPerformanceResponse | Aggregate assignment statuses, overdue, avg completion time and workload. Only managerial command chain. |

**Business and UI rules**

- No status patch; use action endpoints

**Form contracts**

#### Form `F-TASK-REASSIGN`

**Endpoint:** `POST /api/v1/task-assignments/{assignmentId}/reassign`

```json
{
  "newAssigneeAssignmentId": "uuid",
  "reason": "string",
  "dueDate": "ISO|null"
}
```

Rules:

- Close old assignment and create linked replacement.

#### `/dashboard/field-coordinator/penugasan-field-officer` — Assign Field Officer

**Function:** `assignment-builder` page for Assign Field Officer.

**Page flow**

1. Load the task plus eligible subordinate assignments and workload.
2. Filter candidates by command chain, active assignment, area coverage, and availability.
3. Submit assignments atomically.
4. Refresh task cascade, workload, and notification data.

**Displayed data**

- Available Field Officers
- Current workload
- Area scope
- Task details
- Due date

**Filters / URL params**

- `taskId`
- `areaId`
- `availability`
- `q`

**Actions and navigation**

- POST /api/v1/tasks/{taskId}/assignments

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/tasks/{taskId}` | Detail tugas | `task.read` | Query: include=assignments,targetAreas,attachments,parent,children | TaskDetail | Load scoped task and relations. Classified 404 masking. |
| `GET` | `/position-assignments` | Daftar assignment | `assignment.read` | Query: page,limit,userProfileId,positionId,unitId,isActive,validAt | Paged<PositionAssignmentDetail> | Filter assignment and joins. Scoped by organization chain. |
| `GET` | `/positions/{positionId}/subordinates` | Daftar bawahan langsung/berjenjang | `position.read` | Query: recursive=false,depth? | List<PositionSummary> | Direct query reportsToPositionId or recursive traversal. Only accessible command chain. |
| `GET` | `/dashboard/task-performance` | Kinerja tugas | `dashboard.read` | Query: areaId?,unitId?,from,to,groupBy=unit\|position\|area | TaskPerformanceResponse | Aggregate assignment statuses, overdue, avg completion time and workload. Only managerial command chain. |
| `POST` | `/tasks/{taskId}/assignments` | Assign tugas ke personel | `task.assign` | {"assignments":[{"assigneeAssignmentId":"uuid","dueDate":"ISO","assignmentNote":"..."}]} | 201 List<TaskAssignmentDetail> | Validate direct/subordinate chain, active assignment, area overlap, clearance, workload policy; create assignment and notifications. No self-assign unless allowed; duplicate active assignment conflict. |

**Business and UI rules**

- Assignee must be subordinate Field Officer and cover target area

**Form contracts**

#### Form `F-TASK-ASSIGNMENT`

**Endpoint:** `POST /api/v1/tasks/{taskId}/assignments`

```json
{
  "assignments": [
    {
      "assigneeAssignmentId": "uuid",
      "dueDate": "ISO|null",
      "assignmentNote": "string|null"
    }
  ]
}
```

Rules:

- Assignee must be subordinate and area-compatible.

#### `/dashboard/field-coordinator/personel-jaring` — Personnel & Jaring

**Function:** `tabs` page for Personnel & Jaring.

**Page flow**

1. Store the active tab in the URL.
2. Load each tab only when selected.
3. Use canonical detail routes for records opened from a tab.

**Displayed data**

- Tab personnel
- Tab Jaring
- Caretaker relationship
- Coverage
- Status
- Workload

**Filters / URL params**

- `tab`
- `q`
- `status`
- `areaId`
- `positionCode`
- `page`
- `limit`

**Actions and navigation**

- Transfer caretaker
- Update Jaring coverage
- Open personnel

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/position-assignments` | Daftar assignment | `assignment.read` | Query: page,limit,userProfileId,positionId,unitId,isActive,validAt | Paged<PositionAssignmentDetail> | Filter assignment and joins. Scoped by organization chain. |
| `GET` | `/jaring` | Daftar Jaring | `jaring.read` | Query: page,limit,search,status,caretakerAssignmentId,areaId,hasRecentMessage? | Paged<JaringSummary> | Filter by caretaker/area closure and caller command chain. Alias/phone field-level redaction by permission. |
| `GET` | `/jaring/{jaringId}/caretakers` | Riwayat caretaker | `jaring.read` | Query: activeOnly=false | List<JaringCaretakerAssignmentResponse> | Order validFrom desc. Scoped. |
| `GET` | `/jaring/{jaringId}/area-coverages` | Coverage Jaring | `jaring.read` | Query: activeOnly=true,expand=false | List<JaringAreaCoverageResponse> | Read coverages. Sensitive scope visibility restricted. |

**Business and UI rules**

- Only Jaring and personnel inside command chain

**Form contracts**

#### Form `F-JARING-TRANSFER`

**Endpoint:** `POST /api/v1/jaring/{jaringId}/caretaker-transfer`

```json
{
  "newFieldOfficerAssignmentId": "uuid",
  "effectiveAt": "ISO",
  "transferReason": "string"
}
```

Rules:

- Exactly one active caretaker.

#### Form `F-JARING-COVERAGE`

**Endpoint:** `PUT /api/v1/jaring/{jaringId}/area-coverages`

```json
{
  "areas": [
    {
      "areaId": "uuid",
      "isPrimary": true,
      "validFrom": "ISO",
      "validUntil": null
    }
  ]
}
```

Rules:

- Replace active coverages transactionally.

#### `/dashboard/field-coordinator/personel-lapangan` — Field Personnel

**Function:** `directory-map` page for Field Personnel.

**Page flow**

1. Load scoped personnel directory and latest-location layer.
2. Mark stale or low-accuracy locations clearly.
3. Open the canonical personnel detail route and audit location access.

**Displayed data**

- Personnel cards/table
- Position
- Availability
- Active tasks
- Last location time
- Coverage

**Filters / URL params**

- `q`
- `areaId`
- `status`
- `hasActiveTask`
- `capturedAfter`

**Actions and navigation**

- Open personnel detail
- Open assignment form

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/position-assignments` | Daftar assignment | `assignment.read` | Query: page,limit,userProfileId,positionId,unitId,isActive,validAt | Paged<PositionAssignmentDetail> | Filter assignment and joins. Scoped by organization chain. |
| `GET` | `/personnel-location-map` | Peta lokasi personel terbaru | `location.read` | Query: areaId?,unitId?,capturedAfter?,includeStealth=false | PersonnelMapFeatureCollection | For authorized direct command chain, select DISTINCT ON assignment latest ping; apply area closure. Stealth requires explicit permission; small group masking. |
| `GET` | `/dashboard/task-performance` | Kinerja tugas | `dashboard.read` | Query: areaId?,unitId?,from,to,groupBy=unit\|position\|area | TaskPerformanceResponse | Aggregate assignment statuses, overdue, avg completion time and workload. Only managerial command chain. |

**Business and UI rules**

- Location access audited
- Stale location clearly marked

**Form contracts**

No mutation form on this page.

#### `/dashboard/field-coordinator/peta-lapangan` — Field Operations Map

**Function:** `map` page for Field Operations Map.

**Page flow**

1. Initialize a controlled map viewport and URL-backed spatial filters.
2. Load administrative boundaries independently from point/cluster layers.
3. Debounce viewport changes before requesting bbox/zoom-scoped data.
4. Open a lightweight popup on selection and navigate to a canonical detail route for the full record.
5. Keep table, KPI, and map filters synchronized.

**Displayed data**

- Personnel layer
- Task target layer
- Report layer
- Emergency layer
- Boundary layer
- Layer legend

**Filters / URL params**

- `bbox`
- `zoom`
- `areaId`
- `from`
- `to`
- `layers`
- `status`
- `urgency`
- `capturedAfter`

**Actions and navigation**

- Select personnel
- Select report
- Drill area

**Map mode:** `field-operations`

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/personnel-location-map` | Peta lokasi personel terbaru | `location.read` | Query: areaId?,unitId?,capturedAfter?,includeStealth=false | PersonnelMapFeatureCollection | For authorized direct command chain, select DISTINCT ON assignment latest ping; apply area closure. Stealth requires explicit permission; small group masking. |
| `GET` | `/map/reports` | Marker laporan pada viewport | `map.read` | Query: bbox,zoom,areaId?,from,to,status?,urgency?,limit<=5000 | MapReportFeatureCollection | Spatial query locationPoint ST_Intersects viewport; also area closure filter; return minimal popup properties. At low zoom require clusters instead of raw markers. |
| `GET` | `/map/clusters` | Cluster laporan | `map.read` | Query: bbox,zoom,areaId?,from,to,status?,urgency? | MapClusterFeatureCollection | Use ST_SnapToGrid/geohash or clustering extension; count and centroid per cell under scope. No sensitive attributes in clusters. |
| `GET` | `/administrative-areas/boundaries` | Boundary berdasarkan viewport | `area.read` | Query: bbox=minLng,minLat,maxLng,maxLat,level,zoom,limit | GeoJsonFeatureCollectionResponse | GiST ST_Intersects against envelope; choose simplification by zoom. Reject overly large bbox without coarse level. |
| `GET` | `/emergency-incidents` | Daftar insiden darurat | `emergency.read` | Query: cursor,limit,status,severity,areaId,from,to,reportedByAssignmentId | CursorPage<EmergencyIncidentSummary> | Apply command chain/area scope; order severity and createdAt. Emergency visibility may bypass normal path only for designated leaders. |

**Business and UI rules**

- Task-target map requires GAP-MAP-001 or client transform from tasks

**Form contracts**

No mutation form on this page.

#### `/dashboard/field-coordinator/tugas-lapangan` — Field Task Workspace

**Function:** `landing` page for Field Task Workspace.

**Page flow**

1. Load summary counts and quick links for the module.
2. Show only actions permitted by the effective authorization context.
3. Navigate to actionable list, detail, or create routes.

**Displayed data**

- Received tasks
- Team assignments
- Operational board
- Overdue alerts

**Filters / URL params**

- `status`
- `priority`
- `areaId`

**Actions and navigation**

- Open received task
- Open team assignment

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/tasks` | Daftar tugas | `task.read` | Query: page,limit,status,priority,ownerUnitId,assigneeAssignmentId,areaId,dueBefore,dueAfter,parentTaskId,directiveId,uukStrId,overdue? | Paged<TaskSummary> | Apply command chain, assignments, org/area scope and classification; current user's assigned/created/managed tasks. Overdue computed from dueDate and status. |
| `GET` | `/dashboard/task-performance` | Kinerja tugas | `dashboard.read` | Query: areaId?,unitId?,from,to,groupBy=unit\|position\|area | TaskPerformanceResponse | Aggregate assignment statuses, overdue, avg completion time and workload. Only managerial command chain. |

**Business and UI rules**

- Parent navigation page

**Form contracts**

No mutation form on this page.

#### `/dashboard/field-coordinator/tugas-lapangan/tugas-diterima` — Received Tasks

**Function:** `inbox` page for Received Tasks.

**Page flow**

1. Load records addressed to the current assignment.
2. Mark read/acknowledged through idempotent action endpoints.
3. Open the canonical detail route for work execution.

**Displayed data**

- Task inbox
- Directive/UUK source
- Priority
- Due date
- Target area
- Read/ack status

**Filters / URL params**

- `status`
- `priority`
- `areaId`
- `from`
- `to`
- `page`
- `limit`

**Actions and navigation**

- POST /api/v1/task-assignments/{assignmentId}/mark-read
- POST /api/v1/task-assignments/{assignmentId}/acknowledge
- POST /api/v1/task-assignments/{assignmentId}/start

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/tasks` | Daftar tugas | `task.read` | Query: page,limit,status,priority,ownerUnitId,assigneeAssignmentId,areaId,dueBefore,dueAfter,parentTaskId,directiveId,uukStrId,overdue? | Paged<TaskSummary> | Apply command chain, assignments, org/area scope and classification; current user's assigned/created/managed tasks. Overdue computed from dueDate and status. |
| `GET` | `/task-assignments/{assignmentId}` | Detail task assignment | `task.read` | Query: include=progress,bakets | TaskAssignmentDetail | Authorize assignee/assigner/command chain. 404 if inaccessible. |
| `POST` | `/task-assignments/{assignmentId}/mark-read` | Tandai tugas dibaca | `task.execute` | Tidak ada body | TaskAssignmentDetail | Set readAt once; SENT→READ. Assignee only; idempotent. |
| `POST` | `/task-assignments/{assignmentId}/acknowledge` | Terima tugas | `task.execute` | {"note":"string optional"} | TaskAssignmentDetail | Set acknowledgedAt; status READ/SENT→ACKNOWLEDGED. Assignee only. |
| `POST` | `/task-assignments/{assignmentId}/start` | Mulai pengerjaan | `task.execute` | Tidak ada body | TaskAssignmentDetail | Set startedAt; status ACKNOWLEDGED→IN_PROGRESS; update parent task aggregate. Must acknowledge first unless policy auto-ack. |

**Business and UI rules**

- Only own assignments

**Form contracts**

#### Form `F-TASK-START`

**Endpoint:** `POST /api/v1/task-assignments/{assignmentId}/start`

```json
{
  "note": "string|null"
}
```

Rules:

- ACKNOWLEDGED -> IN_PROGRESS.

#### `/dashboard/field-coordinator/tugas-lapangan/penugasan-tim` — Team Assignment

**Function:** `assignment-builder` page for Team Assignment.

**Page flow**

1. Load the task plus eligible subordinate assignments and workload.
2. Filter candidates by command chain, active assignment, area coverage, and availability.
3. Submit assignments atomically.
4. Refresh task cascade, workload, and notification data.

**Displayed data**

- Task detail
- Subordinate roster
- Workload
- Area coverage
- Assigned members

**Filters / URL params**

- `taskId`
- `areaId`
- `q`

**Actions and navigation**

- POST /api/v1/tasks/{taskId}/assignments
- POST /api/v1/task-assignments/{assignmentId}/reassign

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/tasks/{taskId}` | Detail tugas | `task.read` | Query: include=assignments,targetAreas,attachments,parent,children | TaskDetail | Load scoped task and relations. Classified 404 masking. |
| `GET` | `/positions/{positionId}/subordinates` | Daftar bawahan langsung/berjenjang | `position.read` | Query: recursive=false,depth? | List<PositionSummary> | Direct query reportsToPositionId or recursive traversal. Only accessible command chain. |
| `GET` | `/position-assignments` | Daftar assignment | `assignment.read` | Query: page,limit,userProfileId,positionId,unitId,isActive,validAt | Paged<PositionAssignmentDetail> | Filter assignment and joins. Scoped by organization chain. |
| `GET` | `/tasks/{taskId}/assignments` | Daftar assignment tugas | `task.read` | Query: status?,page,limit | Paged<TaskAssignmentDetail> | Query by taskId with scoped visibility. Managers see subordinates; assignee sees own. |
| `POST` | `/tasks/{taskId}/assignments` | Assign tugas ke personel | `task.assign` | {"assignments":[{"assigneeAssignmentId":"uuid","dueDate":"ISO","assignmentNote":"..."}]} | 201 List<TaskAssignmentDetail> | Validate direct/subordinate chain, active assignment, area overlap, clearance, workload policy; create assignment and notifications. No self-assign unless allowed; duplicate active assignment conflict. |
| `POST` | `/task-assignments/{assignmentId}/reassign` | Alihkan assignment | `task.reassign` | {"newAssigneeAssignmentId":"uuid","reason":"string","dueDate":"ISO optional"} | 201 TaskAssignmentDetail | Transaction mark old REASSIGNED, create new linked reassignedFromId, copy task, notify both. Validate chain/scope; idempotency. |

**Business and UI rules**

- One action may create multiple assignments atomically

**Form contracts**

#### Form `F-TASK-ASSIGNMENT`

**Endpoint:** `POST /api/v1/tasks/{taskId}/assignments`

```json
{
  "assignments": [
    {
      "assigneeAssignmentId": "uuid",
      "dueDate": "ISO|null",
      "assignmentNote": "string|null"
    }
  ]
}
```

Rules:

- Assignee must be subordinate and area-compatible.

#### Form `F-TASK-REASSIGN`

**Endpoint:** `POST /api/v1/task-assignments/{assignmentId}/reassign`

```json
{
  "newAssigneeAssignmentId": "uuid",
  "reason": "string",
  "dueDate": "ISO|null"
}
```

Rules:

- Close old assignment and create linked replacement.

#### `/dashboard/field-coordinator/tugas-operasional` — Operational Task Board

**Function:** `kanban` page for Operational Task Board.

**Page flow**

1. Load task assignments grouped by state.
2. Treat drag-and-drop as a request to an explicit action endpoint.
3. Reject invalid transitions and restore the card to the authoritative server state.

**Displayed data**

- Columns SENT/ACK/IN_PROGRESS/OVERDUE/COMPLETED
- Task cards
- Progress
- Officer
- Area
- Due date

**Filters / URL params**

- `status`
- `priority`
- `areaId`
- `assigneeAssignmentId`
- `from`
- `to`

**Actions and navigation**

- Open task
- Reassign
- Cancel child task if permitted

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/tasks` | Daftar tugas | `task.read` | Query: page,limit,status,priority,ownerUnitId,assigneeAssignmentId,areaId,dueBefore,dueAfter,parentTaskId,directiveId,uukStrId,overdue? | Paged<TaskSummary> | Apply command chain, assignments, org/area scope and classification; current user's assigned/created/managed tasks. Overdue computed from dueDate and status. |
| `GET` | `/tasks/{taskId}/assignments` | Daftar assignment tugas | `task.read` | Query: status?,page,limit | Paged<TaskAssignmentDetail> | Query by taskId with scoped visibility. Managers see subordinates; assignee sees own. |
| `GET` | `/tasks/{taskId}/progress-summary` | Ringkasan progress | `task.read` | Query: groupBy=unit\|area\|position | TaskProgressSummaryResponse | Aggregate assignment statuses, overdue, latest progress by group. Same security filter as task list. |

**Business and UI rules**

- Drag-and-drop must call explicit action, not local status mutation

**Form contracts**

#### Form `F-TASK-REASSIGN`

**Endpoint:** `POST /api/v1/task-assignments/{assignmentId}/reassign`

```json
{
  "newAssigneeAssignmentId": "uuid",
  "reason": "string",
  "dueDate": "ISO|null"
}
```

Rules:

- Close old assignment and create linked replacement.

### 4.7 Field Officer

#### `/dashboard/field-officer` — Field Officer Dashboard

**Function:** `dashboard` page for Field Officer Dashboard.

**Page flow**

1. Resolve session, primary assignment, permission, organization scope, area scope, and clearance.
2. Read all page filters from URL search params.
3. Load independent widgets in parallel; one widget failure must not blank the entire page.
4. Render last-updated timestamp and applied-scope indicator.
5. Drill-down actions navigate to canonical list/detail routes.

**Displayed data**

- My tasks
- Jaring inbox
- Draft Baket
- Revision requests
- Emergency shortcut
- Task map preview

**Filters / URL params**

- `from`
- `to`

**Actions and navigation**

- Open task
- Create Baket
- Send emergency report

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/dashboard/overview` | Overview dashboard sesuai role | `dashboard.read` | Query: areaId?,from,to,ownerUnitId?,classificationMax? | DashboardOverviewResponse | Resolve access context; aggregate report/task/directive/product/alert metrics using same scope CTE and time range. All widgets must use identical filter context. |
| `GET` | `/tasks` | Daftar tugas | `task.read` | Query: page,limit,status,priority,ownerUnitId,assigneeAssignmentId,areaId,dueBefore,dueAfter,parentTaskId,directiveId,uukStrId,overdue? | Paged<TaskSummary> | Apply command chain, assignments, org/area scope and classification; current user's assigned/created/managed tasks. Overdue computed from dueDate and status. |
| `GET` | `/whatsapp-inbox/summary` | Ringkasan inbox | `whatsapp.read` | Query: areaId?,from?,to? | WhatsAppInboxSummaryResponse | Aggregate counts by status/validation/unknown sender/routing SLA under identical scope. No global count leakage. |
| `GET` | `/bakets` | Daftar Baket | `baket.read` | Query: page,limit,status,urgency,createdByAssignmentId,taskAssignmentId,jaringId,areaId,from,to,search,coverageStatus | Paged<BaketSummary> | Join current version; apply owner/recipient OIM chain, area scope, org scope and classification if inherited. areaId includes descendants. |
| `GET` | `/emergency-incidents` | Daftar insiden darurat | `emergency.read` | Query: cursor,limit,status,severity,areaId,from,to,reportedByAssignmentId | CursorPage<EmergencyIncidentSummary> | Apply command chain/area scope; order severity and createdAt. Emergency visibility may bypass normal path only for designated leaders. |

**Business and UI rules**

- Only own assignment and Jaring

**Form contracts**

No mutation form on this page.

#### `/dashboard/field-officer/buat-baket` — Create Baket

**Function:** `wizard` page for Create Baket.

**Page flow**

1. Load reference data and permitted selectable resources.
2. Persist a draft before advancing beyond the first meaningful step.
3. Validate each step on the client for usability and again on the server for authority.
4. Submit the final immutable version using an explicit action endpoint.
5. Redirect to the canonical detail or tracking route.

**Displayed data**

- Source selection
- 5W+1H content
- Event time
- Map pin
- Resolved area
- Attachments
- Coverage warning
- Review

**Filters / URL params**

- No page-level filters; use route params or the current authorization context.

**Actions and navigation**

- POST /api/v1/bakets
- PATCH /api/v1/baket-versions/{versionId}
- PUT /api/v1/bakets/{baketId}/source-messages
- PUT /api/v1/bakets/{baketId}/attachments
- POST /api/v1/baket-versions/{versionId}/resolve-area
- POST /api/v1/baket-versions/{versionId}/manual-area-override
- POST /api/v1/baket-versions/{versionId}/validate-coverage

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/tasks` | Daftar tugas | `task.read` | Query: page,limit,status,priority,ownerUnitId,assigneeAssignmentId,areaId,dueBefore,dueAfter,parentTaskId,directiveId,uukStrId,overdue? | Paged<TaskSummary> | Apply command chain, assignments, org/area scope and classification; current user's assigned/created/managed tasks. Overdue computed from dueDate and status. |
| `GET` | `/whatsapp-messages` | Inbox pesan WhatsApp | `whatsapp.read` | Query: cursor,limit,status,validationStatus,jaringId,routedToAssignmentId,resolvedAreaId,from,to,hasGps?,unknownSender? | CursorPage<WhatsAppMessageSummary> | Apply routing assignment/command chain/area scope; no rawPayload by default. Cursor based on receivedAt,id. |
| `GET` | `/administrative-areas/tree` | Cascading tree wilayah | `area.read` | Query: rootId?,maxDepth=3,levels?,includeBoundaryStatus=true | AdministrativeAreaTreeResponse | Fetch closure descendants; annotate boundary availability and childCount. Payload depth capped. |
| `GET` | `/reference-data/enums` | Enum/reference untuk UI | `authenticated` | Query: names=RoleCode,PositionCode,... | ReferenceDataResponse | Serve allowlisted enum values and labels; cache. Do not expose internal-only enums unless requested. |
| `POST` | `/bakets` | Buat Baket manual/from task | `baket.create` | {"taskAssignmentId":"uuid optional","primaryJaringId":"uuid optional","sourceMessageIds":[],"version":{"title":"...","originalContent":"...","normalizedContent":"...","eventTime":"ISO","latitude":0,"longitude":0,"urgency":"NORMAL","fieldOfficerNote":"..."},"attachmentFileIds":[]} | 201 BaketDetail | Only FIELD_OFFICER; require source message or task assignment per rule; resolve area and coverage; create version1/links/attachments. Field Officer cannot set A-F/1-6. |
| `PATCH` | `/baket-versions/{versionId}` | Edit versi draft | `baket.update` | {"title?":"...","originalContent?":"...","normalizedContent?":"...","eventTime?":"ISO","latitude?":0,"longitude?":0,"urgency?":"HIGH","fieldOfficerNote?":"..."} | BaketVersionDetail | Only current version while Baket DRAFT/NEEDS_DEVELOPMENT and not submitted. Coordinates must be pair; any change reruns resolution. |
| `PUT` | `/bakets/{baketId}/source-messages` | Ganti/tambah sumber pesan draft | `baket.update` | {"messageIds":["uuid"]} | List<WhatsAppMessageSummary> | Validate caller access to messages; replace links only before submit. At least one source if no task assignment. |
| `PUT` | `/bakets/{baketId}/attachments` | Ganti lampiran draft | `baket.update` | {"attachments":[{"fileId":"uuid","caption":"..."}]} | List<FileAssetResponse> | Validate clean files and ownership; replace links. Evidence preserved after submit. |
| `POST` | `/baket-versions/{versionId}/resolve-area` | Resolve ulang area Baket | `baket.update` | {"force":false} | CoordinateResolutionResponse | ST_Covers coordinate; update eventAreaId/method/confidence/time. Cannot alter submitted version except system correction policy creates new version. |
| `POST` | `/baket-versions/{versionId}/manual-area-override` | Override area hasil spatial | `baket.update` | {"eventAreaId":"uuid","reason":"string"} | BaketVersionDetail | Validate selected area contains point or record warning; set MANUAL_CONFIRMATION and reason. Reason mandatory; audit. |
| `POST` | `/baket-versions/{versionId}/validate-coverage` | Validasi coverage berlapis | `baket.update` | {"scopeTypes":["JARING","FIELD_OFFICER","FIELD_COORDINATOR","ORGANIZATION_UNIT"]} | CoverageValidationResponse | Compare eventArea against active coverages via closure; return per-layer detail and persist summary. Out-of-scope does not auto-reject. |

**Business and UI rules**

- No A-F/1-6 fields
- Original WhatsApp immutable
- Draft autosave allowed

**Form contracts**

#### Form `F-BAKET-DRAFT`

**Endpoint:** `POST /api/v1/bakets and PATCH /api/v1/baket-versions/{versionId}`

```json
{
  "taskAssignmentId": "uuid|null",
  "primaryJaringId": "uuid|null",
  "title": "string",
  "originalContent": "string",
  "normalizedContent": "string|null",
  "eventTime": "ISO|null",
  "latitude": -6.2,
  "longitude": 106.8,
  "gpsAccuracyMeters": 10.0,
  "coordinateSource": "DEVICE_GPS",
  "urgency": "HIGH",
  "fieldOfficerNote": "string|null"
}
```

Rules:

- Coordinates stored and resolved to eventAreaId.

#### Form `F-MANUAL-AREA-OVERRIDE`

**Endpoint:** `POST /api/v1/baket-versions/{versionId}/manual-area-override`

```json
{
  "areaId": "uuid",
  "reason": "string"
}
```

Rules:

- Audit original and overridden area.

#### `/dashboard/field-officer/jaring-binaan` — Managed Jaring

**Function:** `list-detail` page for Managed Jaring.

**Page flow**

1. Load a scoped list and preserve filters in the URL.
2. Navigate to a dynamic detail route when a row is selected.
3. Render detail sections according to clearance and need-to-know.
4. Use explicit actions for state transitions and return to the preserved list state.

**Displayed data**

- Jaring list
- Alias
- Normalized WhatsApp
- Status
- Coverage
- Last message
- Caretaker history

**Filters / URL params**

- `q`
- `status`
- `areaId`
- `page`
- `limit`

**Actions and navigation**

- POST /api/v1/jaring
- PATCH /api/v1/jaring/{jaringId}
- POST /api/v1/jaring/{jaringId}/activate
- POST /api/v1/jaring/{jaringId}/deactivate
- PUT /api/v1/jaring/{jaringId}/area-coverages

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/jaring` | Daftar Jaring | `jaring.read` | Query: page,limit,search,status,caretakerAssignmentId,areaId,hasRecentMessage? | Paged<JaringSummary> | Filter by caretaker/area closure and caller command chain. Alias/phone field-level redaction by permission. |
| `GET` | `/jaring/{jaringId}` | Detail Jaring | `jaring.read` | Query: include=caretakers,coverages,stats | JaringDetail | Scoped by caretaker/command chain/area. Sensitive identity redacted based on permission. |
| `GET` | `/jaring/{jaringId}/messages` | Pesan WhatsApp milik Jaring | `whatsapp.read` | Query: cursor,limit,status,from,to | CursorPage<WhatsAppMessageSummary> | Filter jaringId and scope; order receivedAt desc. Raw payload not included. |
| `GET` | `/jaring/{jaringId}/bakets` | Baket terkait Jaring | `baket.read` | Query: page,limit,status | Paged<BaketSummary> | Query primaryJaringId or source messages linked to Jaring. Need-to-know applies. |
| `POST` | `/jaring` | Daftarkan Jaring | `jaring.create` | {"code":"...","aliasName":"...","whatsappNumber":"628...","notes":"...","caretakerAssignmentId":"uuid","areaCoverages":[{"areaId":"uuid","isPrimary":true}]} | 201 JaringDetail | Normalize phone; validate unique active number; validate caretaker is active FIELD_OFFICER and coverage subset; transaction create all. Jaring has no auth account. |
| `PATCH` | `/jaring/{jaringId}` | Ubah metadata Jaring | `jaring.update` | {"aliasName?":"...","notes?":"...","whatsappNumber?":"628..."} | JaringDetail | Normalize/validate phone; mutable while not ARCHIVED. Caretaker/coverage/status not changed here. |
| `POST` | `/jaring/{jaringId}/activate` | Aktifkan Jaring | `jaring.manage` | {"reason":"string"} | JaringDetail | Validate active caretaker and unique number; set ACTIVE. Archived may require reactivation permission. |
| `POST` | `/jaring/{jaringId}/deactivate` | Nonaktifkan Jaring | `jaring.manage` | {"reason":"string","effectiveAt":"ISO"} | JaringDetail | Set INACTIVE/deactivatedAt; preserve messages/history. Does not delete. |
| `PUT` | `/jaring/{jaringId}/area-coverages` | Ganti coverage Jaring | `jaring.coverage.manage` | {"areas":[{"areaId":"uuid","isPrimary":true}],"effectiveAt":"ISO","reason":"string"} | List<JaringAreaCoverageResponse> | Validate local levels and subset of caretaker assignment scope; close/insert transaction. At least one primary area. |

**Business and UI rules**

- Field Officer manages assigned Jaring only

**Form contracts**

#### Form `F-JARING`

**Endpoint:** `POST /api/v1/jaring`

```json
{
  "code": "JR-0001",
  "aliasName": "string|null",
  "whatsappNumber": "628123456789",
  "notes": "string|null",
  "areaCoverages": [
    {
      "areaId": "uuid",
      "isPrimary": true
    }
  ]
}
```

Rules:

- Normalize number before uniqueness check.

#### Form `F-JARING-COVERAGE`

**Endpoint:** `PUT /api/v1/jaring/{jaringId}/area-coverages`

```json
{
  "areas": [
    {
      "areaId": "uuid",
      "isPrimary": true,
      "validFrom": "ISO",
      "validUntil": null
    }
  ]
}
```

Rules:

- Replace active coverages transactionally.

#### `/dashboard/field-officer/kirim-baket` — Submit Baket

**Function:** `review-submit` page for Submit Baket.

**Page flow**

1. Load the current draft version, completeness result, source links, and available actions.
2. Display blocking errors separately from warnings requiring confirmation.
3. Submit with Idempotency-Key and If-Match.
4. Redirect to the submitted detail/timeline and invalidate receiving queues.

**Displayed data**

- Completeness summary
- Source messages
- Coordinates
- Area path
- Coverage checks
- Attachments
- Revision warning

**Filters / URL params**

- `status=DRAFT,READY_TO_SEND`
- `q`
- `areaId`

**Actions and navigation**

- POST /api/v1/bakets/{baketId}/submit
- POST /api/v1/bakets/{baketId}/resubmit

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/bakets` | Daftar Baket | `baket.read` | Query: page,limit,status,urgency,createdByAssignmentId,taskAssignmentId,jaringId,areaId,from,to,search,coverageStatus | Paged<BaketSummary> | Join current version; apply owner/recipient OIM chain, area scope, org scope and classification if inherited. areaId includes descendants. |
| `GET` | `/bakets/{baketId}` | Detail Baket current version | `baket.read` | Query: include=versions,sources,attachments,revisionRequests,verification | BaketDetail | Load root/current version/traceability under access context. Verified data read-only for lower unit. |
| `GET` | `/bakets/{baketId}/revision-requests` | Daftar permintaan revisi | `baket.read` | Query: status? | List<BaketRevisionRequestResponse> | Query by baketId order createdAt desc. Scoped. |
| `POST` | `/bakets/{baketId}/submit` | Kirim Baket ke OIM | `baket.submit` | {"confirmation":"SUBMIT"} | BaketDetail | Validate current version completeness, source/task, coordinates/area warning, attachments policy; set SENT_TO_OIM; resolve target OIM from reporting branch; notify. Field Officer only; idempotency. |
| `POST` | `/bakets/{baketId}/resubmit` | Kirim ulang setelah revisi | `baket.submit` | {"versionId":"uuid","revisionRequestId":"uuid"} | BaketDetail | Ensure new version resolves open request; set RESUBMITTED/request IN_PROGRESS→RESUBMITTED and Baket SENT_TO_OIM. Version must be newer than requested-against. |

**Business and UI rules**

- Idempotency-Key and If-Match
- Target OIM resolved by reporting branch

**Form contracts**

#### Form `F-BAKET-SUBMIT`

**Endpoint:** `POST /api/v1/bakets/{baketId}/submit or /resubmit`

```json
{
  "confirmation": "SUBMIT",
  "note": "string|null"
}
```

Rules:

- Idempotency-Key and If-Match required.

#### `/dashboard/field-officer/kotak-masuk-jaring` — Jaring Inbox

**Function:** `inbox-detail` page for Jaring Inbox.

**Page flow**

1. Load the routed inbox and selected immutable source record.
2. Render validation, routing, media, location, and source context.
3. Run validation/duplicate/spam/create-resource actions explicitly.

**Displayed data**

- WhatsApp messages
- Sender/Jaring
- Validation issues
- GPS
- Resolved area
- Media
- Routing status

**Filters / URL params**

- `status`
- `validationStatus`
- `hasGps`
- `jaringId`
- `from`
- `to`
- `cursor`
- `limit`

**Actions and navigation**

- POST /api/v1/whatsapp-messages/{messageId}/validate
- POST /api/v1/whatsapp-messages/{messageId}/resolve-area
- POST /api/v1/whatsapp-messages/{messageId}/mark-spam
- POST /api/v1/whatsapp-messages/{messageId}/mark-duplicate
- POST /api/v1/whatsapp-messages/{messageId}/create-baket

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/whatsapp-messages` | Inbox pesan WhatsApp | `whatsapp.read` | Query: cursor,limit,status,validationStatus,jaringId,routedToAssignmentId,resolvedAreaId,from,to,hasGps?,unknownSender? | CursorPage<WhatsAppMessageSummary> | Apply routing assignment/command chain/area scope; no rawPayload by default. Cursor based on receivedAt,id. |
| `GET` | `/whatsapp-messages/{messageId}` | Detail pesan WhatsApp | `whatsapp.read` | Query: include=media,routingLogs,rawPayload(false) | WhatsAppMessageDetail | Authorize via routed Field Officer, caretaker, command chain; fetch media and area breadcrumb. rawPayload requires whatsapp.raw.read and audit. |
| `GET` | `/whatsapp-messages/{messageId}/routing-logs` | Riwayat routing | `whatsapp.read` | Tidak ada body | List<WhatsAppRoutingLogResponse> | Query messageId order createdAt. Append-only. |
| `POST` | `/whatsapp-messages/{messageId}/validate` | Validasi format laporan | `whatsapp.validate` | {"forceRevalidate":false} | WhatsAppValidationResponse | Check title, photo media, GPS pair, content; persist summary/issues per final schema; set validationStatus. One message may have multiple issues; endpoint should return all. |
| `POST` | `/whatsapp-messages/{messageId}/resolve-area` | Resolve GPS ke area | `whatsapp.resolve` | {"force":false} | CoordinateResolutionResponse | Use locationPoint or lat/lng; ST_Covers active boundaries; update resolvedAreaId/method/confidence/time. Do not discard original coordinates. |
| `POST` | `/whatsapp-messages/{messageId}/mark-spam` | Tandai spam | `whatsapp.moderate` | {"reason":"string"} | WhatsAppMessageDetail | Set SPAM and routing log; no delete. Cannot mark linked processed Baket as spam without supervisor review. |
| `POST` | `/whatsapp-messages/{messageId}/mark-duplicate` | Tandai duplikat | `whatsapp.moderate` | {"canonicalMessageId":"uuid","reason":"string"} | WhatsAppMessageDetail | Set DUPLICATE and record canonical reference in metadata/routing note. Canonical must be accessible and not self. |
| `POST` | `/whatsapp-messages/{messageId}/create-baket` | Buat Baket dari pesan | `baket.create` | {"title":"... optional","taskAssignmentId":"uuid optional","additionalMessageIds":[]} | 201 BaketDetail | Validate caller Field Officer is routed caretaker; create Baket/version1/source links; copy original content/GPS/area; do not mutate message. Idempotency prevents duplicate Baket for same request. |

**Business and UI rules**

- Raw message immutable
- Only routed messages visible

**Form contracts**

#### Form `F-WHATSAPP-VALIDATE`

**Endpoint:** `POST /api/v1/whatsapp-messages/{messageId}/validate`

```json
{
  "decision": "VALID",
  "issueCodes": [],
  "note": "string|null"
}
```

Rules:

- Supports multiple issue codes after schema hardening.

#### Form `F-WHATSAPP-DUPLICATE`

**Endpoint:** `POST /api/v1/whatsapp-messages/{messageId}/mark-duplicate`

```json
{
  "duplicateOfMessageId": "uuid",
  "reason": "string"
}
```

#### `/dashboard/field-officer/laporan-darurat` — Emergency Report

**Function:** `quick-form` page for Emergency Report.

**Page flow**

1. Show the minimum fields needed to complete the urgent task.
2. Capture GPS when available but do not block submission when unavailable.
3. Submit once with an idempotency key and show a durable confirmation.

**Displayed data**

- Large severity selector
- Situation
- Action taken
- Needs
- GPS status
- Attachments
- Send confirmation

**Filters / URL params**

- No page-level filters; use route params or the current authorization context.

**Actions and navigation**

- POST /api/v1/emergency-incidents

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/me` | Ambil identitas dan profil pengguna aktif | `authenticated` | Tidak ada body. Query opsional: include=primaryAssignment,unit,areaScopes | MeResponse | Resolve Better Auth session; join User→UserProfile→primary active PositionAssignment→Position→Role→OrganizationUnit. Tolak 401 jika session invalid; 423 jika banned/locked; 403 jika profile bukan ACTIVE. |
| `GET` | `/personnel-location-pings/me/latest` | Lokasi terbaru diri sendiri | `location.read-own` | Tidak ada body | PersonnelLocationPingResponse | Latest by capturedAt for user's active assignment. Own only. |
| `POST` | `/emergency-incidents` | Buat laporan cepat | `emergency.create` | {"title":"...","severity":"CRITICAL","latitude":0,"longitude":0,"situation":"...","actionTaken":"...","needs":"...","attachmentFileIds":[]} | 201 EmergencyIncidentDetail | Resolve area; create incident; notify vertical and parallel command targets; optionally create alert. Minimal SITUATION-ACTION-NEEDS; Idempotency-Key. |

**Business and UI rules**

- Must work without GPS
- Idempotency-Key
- One-task-per-screen mobile

**Form contracts**

#### Form `F-EMERGENCY-CREATE`

**Endpoint:** `POST /api/v1/emergency-incidents`

```json
{
  "title": "string",
  "severity": "CRITICAL",
  "latitude": -6.2,
  "longitude": 106.8,
  "situation": "string",
  "actionTaken": "string|null",
  "needs": "string|null",
  "attachmentFileIds": [
    "uuid"
  ]
}
```

Rules:

- Coordinates optional; Idempotency-Key required.

#### `/dashboard/field-officer/laporan-saya` — My Baket

**Function:** `list-detail` page for My Baket.

**Page flow**

1. Load a scoped list and preserve filters in the URL.
2. Navigate to a dynamic detail route when a row is selected.
3. Render detail sections according to clearance and need-to-know.
4. Use explicit actions for state transitions and return to the preserved list state.

**Displayed data**

- My reports
- Status
- Current version
- Revision request
- Urgency
- Area
- Submitted time

**Filters / URL params**

- `q`
- `status`
- `areaId`
- `from`
- `to`
- `page`
- `limit`

**Actions and navigation**

- Create revision version
- Resolve revision request
- Resubmit

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/bakets` | Daftar Baket | `baket.read` | Query: page,limit,status,urgency,createdByAssignmentId,taskAssignmentId,jaringId,areaId,from,to,search,coverageStatus | Paged<BaketSummary> | Join current version; apply owner/recipient OIM chain, area scope, org scope and classification if inherited. areaId includes descendants. |
| `GET` | `/bakets/{baketId}` | Detail Baket current version | `baket.read` | Query: include=versions,sources,attachments,revisionRequests,verification | BaketDetail | Load root/current version/traceability under access context. Verified data read-only for lower unit. |
| `GET` | `/bakets/{baketId}/timeline` | Timeline Baket | `baket.read` | Tidak ada body | TimelineResponse | Merge versions, status events, revision requests, verification, audit events sorted time. Field-level redaction. |
| `GET` | `/bakets/{baketId}/revision-requests` | Daftar permintaan revisi | `baket.read` | Query: status? | List<BaketRevisionRequestResponse> | Query by baketId order createdAt desc. Scoped. |

**Business and UI rules**

- Only own Baket

**Form contracts**

#### Form `F-BAKET-REVISION`

**Endpoint:** `POST /api/v1/bakets/{baketId}/versions`

```json
{
  "basedOnVersionId": "uuid",
  "revisionReason": "string",
  "changes": {
    "title": "string|null",
    "content": "string|null"
  }
}
```

Rules:

- Resolve revision request after creating new version.

#### `/dashboard/field-officer/peta-tugas` — My Task Map

**Function:** `map` page for My Task Map.

**Page flow**

1. Initialize a controlled map viewport and URL-backed spatial filters.
2. Load administrative boundaries independently from point/cluster layers.
3. Debounce viewport changes before requesting bbox/zoom-scoped data.
4. Open a lightweight popup on selection and navigate to a canonical detail route for the full record.
5. Keep table, KPI, and map filters synchronized.

**Displayed data**

- Task target areas
- My report points
- My latest location
- Selected task drawer

**Filters / URL params**

- `bbox`
- `zoom`
- `areaId`
- `status`
- `from`
- `to`

**Actions and navigation**

- Open task
- Start task
- Create Baket at selected task

**Map mode:** `my-task-map`

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/tasks` | Daftar tugas | `task.read` | Query: page,limit,status,priority,ownerUnitId,assigneeAssignmentId,areaId,dueBefore,dueAfter,parentTaskId,directiveId,uukStrId,overdue? | Paged<TaskSummary> | Apply command chain, assignments, org/area scope and classification; current user's assigned/created/managed tasks. Overdue computed from dueDate and status. |
| `GET` | `/map/reports` | Marker laporan pada viewport | `map.read` | Query: bbox,zoom,areaId?,from,to,status?,urgency?,limit<=5000 | MapReportFeatureCollection | Spatial query locationPoint ST_Intersects viewport; also area closure filter; return minimal popup properties. At low zoom require clusters instead of raw markers. |
| `GET` | `/personnel-location-pings/me/latest` | Lokasi terbaru diri sendiri | `location.read-own` | Tidak ada body | PersonnelLocationPingResponse | Latest by capturedAt for user's active assignment. Own only. |
| `GET` | `/administrative-areas/boundaries` | Boundary berdasarkan viewport | `area.read` | Query: bbox=minLng,minLat,maxLng,maxLat,level,zoom,limit | GeoJsonFeatureCollectionResponse | GiST ST_Intersects against envelope; choose simplification by zoom. Reject overly large bbox without coarse level. |

**Business and UI rules**

- Task-target GeoJSON requires GAP-MAP-001 or client-derived centroids

**Form contracts**

No mutation form on this page.

#### `/dashboard/field-officer/tugas-saya` — My Tasks

**Function:** `inbox-kanban` page for My Tasks.

**Page flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed data**

- Assignments
- Priority
- Due date
- Target area
- Progress
- Related Baket

**Filters / URL params**

- `status`
- `priority`
- `areaId`
- `from`
- `to`
- `page`
- `limit`

**Actions and navigation**

- POST /api/v1/task-assignments/{assignmentId}/mark-read
- POST /api/v1/task-assignments/{assignmentId}/acknowledge
- POST /api/v1/task-assignments/{assignmentId}/start
- POST /api/v1/task-assignments/{assignmentId}/progress
- POST /api/v1/task-assignments/{assignmentId}/complete

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/tasks` | Daftar tugas | `task.read` | Query: page,limit,status,priority,ownerUnitId,assigneeAssignmentId,areaId,dueBefore,dueAfter,parentTaskId,directiveId,uukStrId,overdue? | Paged<TaskSummary> | Apply command chain, assignments, org/area scope and classification; current user's assigned/created/managed tasks. Overdue computed from dueDate and status. |
| `GET` | `/task-assignments/{assignmentId}` | Detail task assignment | `task.read` | Query: include=progress,bakets | TaskAssignmentDetail | Authorize assignee/assigner/command chain. 404 if inaccessible. |
| `POST` | `/task-assignments/{assignmentId}/mark-read` | Tandai tugas dibaca | `task.execute` | Tidak ada body | TaskAssignmentDetail | Set readAt once; SENT→READ. Assignee only; idempotent. |
| `POST` | `/task-assignments/{assignmentId}/acknowledge` | Terima tugas | `task.execute` | {"note":"string optional"} | TaskAssignmentDetail | Set acknowledgedAt; status READ/SENT→ACKNOWLEDGED. Assignee only. |
| `POST` | `/task-assignments/{assignmentId}/start` | Mulai pengerjaan | `task.execute` | Tidak ada body | TaskAssignmentDetail | Set startedAt; status ACKNOWLEDGED→IN_PROGRESS; update parent task aggregate. Must acknowledge first unless policy auto-ack. |
| `POST` | `/task-assignments/{assignmentId}/progress` | Tambah progress log | `task.execute` | {"progressPercent":60,"note":"...","status":"IN_PROGRESS"} | 201 TaskProgressLogResponse | Insert append-only progress log; update assignment status/timestamps if valid transition. Percent 0..100; cannot decrease without correction reason. |
| `POST` | `/task-assignments/{assignmentId}/complete` | Selesaikan assignment | `task.execute` | {"note":"...","completionEvidenceFileIds":[]} | TaskAssignmentDetail | Validate required outputs/Baket as task policy; set COMPLETED/100%; recalc task completion. Cannot complete cancelled/reassigned. |

**Business and UI rules**

- Complete may require evidence/Baket

**Form contracts**

#### Form `F-TASK-PROGRESS`

**Endpoint:** `POST /api/v1/task-assignments/{assignmentId}/progress`

```json
{
  "progressPercent": 50,
  "note": "string",
  "attachmentFileIds": [
    "uuid"
  ]
}
```

Rules:

- Append-only progress log.

#### Form `F-TASK-COMPLETE`

**Endpoint:** `POST /api/v1/task-assignments/{assignmentId}/complete`

```json
{
  "note": "string",
  "relatedBaketIds": [
    "uuid"
  ]
}
```

Rules:

- May require evidence according to task policy.

## 5. Complete Dynamic Detail, Create, Edit, Version, and Action Routes

Every entry below is an actual `page.tsx` file to add. A map drawer or table side panel may reuse the same feature component, but the canonical URL must remain available.

### 5.1 Global

#### `/dashboard/notifications`

- **File:** `src/app/dashboard/notifications/page.tsx`
- **Resource:** `Notification`
- **Page type:** `list`
- **Purpose:** Notification feed

**Flow**

1. Read filters, sorting, and pagination from URL search params.
2. Call the scoped list endpoint and render rows/cards plus filter facets.
3. Selecting a row navigates to the canonical dynamic detail route.
4. After a mutation, invalidate list, counters, dashboard widgets, and map layers affected by the resource.

**Displayed sections**

- Type
- Title
- Message
- Timestamp
- Read state
- Destination

**API mapping**

No direct API operation.

**Inherited page rules**

- Deep-link tetap diotorisasi ulang
- Mark read idempotent

#### `/dashboard/profil`

- **File:** `src/app/dashboard/profil/page.tsx`
- **Resource:** `UserProfile`
- **Page type:** `detail`
- **Purpose:** Own profile and security

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Identity and account status
- Auth role and domain role
- Clearance
- Primary assignment
- Area scopes
- Assignment and security history

**API mapping**

No direct API operation.

**Applicable shared forms**

- `F-PROFILE-METADATA`

**Inherited page rules**

- Tidak boleh mengubah role/position sendiri
- Security actions perlu confirmation

#### `/dashboard/profil/keamanan`

- **File:** `src/app/dashboard/profil/keamanan/page.tsx`
- **Resource:** `UserProfile`
- **Page type:** `action-page`
- **Purpose:** Sessions and password/security actions

**Flow**

1. Load the resource and available actions.
2. Display a focused form for one explicit business action.
3. Require confirmation/reason where applicable.
4. Execute the action and redirect to the canonical detail.

**Displayed sections**

- Identity and account status
- Auth role and domain role
- Clearance
- Primary assignment
- Area scopes
- Assignment and security history

**API mapping**

No direct API operation.

**Applicable shared forms**

- `F-PROFILE-METADATA`

**Inherited page rules**

- Tidak boleh mengubah role/position sendiri
- Security actions perlu confirmation

### 5.2 Admin System

#### `/dashboard/admin-system/pengguna/baru`

- **File:** `src/app/dashboard/admin-system/pengguna/baru/page.tsx`
- **Resource:** `UserProfile`
- **Page type:** `create`
- **Purpose:** Provision user

**Flow**

1. Load reference data and eligible relationships.
2. Validate the form locally and on the server.
3. Create the resource or draft in one transaction.
4. Redirect to the canonical detail/edit route returned by the API.

**Displayed sections**

- Identity and account status
- Auth role and domain role
- Clearance
- Primary assignment
- Area scopes
- Assignment and security history

**API mapping**

No direct API operation.

**Applicable shared forms**

- `F-USER-PROVISION`
- `F-USER-METADATA`
- `F-USER-LOCK`
- `F-PRIMARY-ASSIGNMENT`

**Inherited page rules**

- Provisioning atomik
- Role auth dan domain harus sinkron
- Tidak ada hard delete

#### `/dashboard/admin-system/pengguna/[userProfileId]`

- **File:** `src/app/dashboard/admin-system/pengguna/[userProfileId]/page.tsx`
- **Resource:** `UserProfile`
- **Page type:** `detail`
- **Purpose:** User profile, role, assignment, scope

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Identity and account status
- Auth role and domain role
- Clearance
- Primary assignment
- Area scopes
- Assignment and security history

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/user-profiles/{userProfileId}` | Detail user profile | `user.read` | Path: userProfileId; Query: include=assignments,scopes,auditSummary | UserProfileDetail | Load profile dan assignment history dengan access scope. Resource di luar command chain dikembalikan 404 untuk mencegah enumeration. |

**Applicable shared forms**

- `F-USER-PROVISION`
- `F-USER-METADATA`
- `F-USER-LOCK`
- `F-PRIMARY-ASSIGNMENT`

**Inherited page rules**

- Provisioning atomik
- Role auth dan domain harus sinkron
- Tidak ada hard delete

#### `/dashboard/admin-system/pengguna/[userProfileId]/edit`

- **File:** `src/app/dashboard/admin-system/pengguna/[userProfileId]/edit/page.tsx`
- **Resource:** `UserProfile`
- **Page type:** `edit`
- **Purpose:** Edit permitted profile metadata

**Flow**

1. Load the editable draft and ETag/version token.
2. Submit only permitted fields with If-Match.
3. Handle 409 conflicts without overwriting newer data.

**Displayed sections**

- Identity and account status
- Auth role and domain role
- Clearance
- Primary assignment
- Area scopes
- Assignment and security history

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/user-profiles/{userProfileId}` | Detail user profile | `user.read` | Path: userProfileId; Query: include=assignments,scopes,auditSummary | UserProfileDetail | Load profile dan assignment history dengan access scope. Resource di luar command chain dikembalikan 404 untuk mencegah enumeration. |
| `PATCH` | `/user-profiles/{userProfileId}` | Ubah metadata profile | `user.update` | {"username?":"...","fullName?":"...","phone?":"...","clearanceLevel?":"RAHASIA"} | UserProfileDetail | Update field mutable saja; clearance change memerlukan permission khusus dan audit before/after. Tidak boleh mengubah auth role, status, assignment atau scope melalui endpoint ini. |

**Applicable shared forms**

- `F-USER-PROVISION`
- `F-USER-METADATA`
- `F-USER-LOCK`
- `F-PRIMARY-ASSIGNMENT`

**Inherited page rules**

- Provisioning atomik
- Role auth dan domain harus sinkron
- Tidak ada hard delete

#### `/dashboard/admin-system/pengguna/[userProfileId]/assignments`

- **File:** `src/app/dashboard/admin-system/pengguna/[userProfileId]/assignments/page.tsx`
- **Resource:** `UserProfile`
- **Page type:** `history`
- **Purpose:** Assignment history

**Flow**

1. Load immutable history ordered by effective date/version.
2. Open the exact historical record when selected.

**Displayed sections**

- Identity and account status
- Auth role and domain role
- Clearance
- Primary assignment
- Area scopes
- Assignment and security history

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/user-profiles/{userProfileId}` | Detail user profile | `user.read` | Path: userProfileId; Query: include=assignments,scopes,auditSummary | UserProfileDetail | Load profile dan assignment history dengan access scope. Resource di luar command chain dikembalikan 404 untuk mencegah enumeration. |
| `GET` | `/user-profiles/{userProfileId}/assignments` | Riwayat penugasan jabatan | `assignment.read` | Query: activeOnly=false | List<PositionAssignmentDetail> | Query by userProfileId order validFrom desc. Scope view mengikuti command chain. |

**Applicable shared forms**

- `F-USER-PROVISION`
- `F-USER-METADATA`
- `F-USER-LOCK`
- `F-PRIMARY-ASSIGNMENT`

**Inherited page rules**

- Provisioning atomik
- Role auth dan domain harus sinkron
- Tidak ada hard delete

#### `/dashboard/admin-system/pengguna/[userProfileId]/assignments/baru`

- **File:** `src/app/dashboard/admin-system/pengguna/[userProfileId]/assignments/baru/page.tsx`
- **Resource:** `UserProfile`
- **Page type:** `create`
- **Purpose:** Create/change assignment

**Flow**

1. Load reference data and eligible relationships.
2. Validate the form locally and on the server.
3. Create the resource or draft in one transaction.
4. Redirect to the canonical detail/edit route returned by the API.

**Displayed sections**

- Identity and account status
- Auth role and domain role
- Clearance
- Primary assignment
- Area scopes
- Assignment and security history

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/user-profiles/{userProfileId}` | Detail user profile | `user.read` | Path: userProfileId; Query: include=assignments,scopes,auditSummary | UserProfileDetail | Load profile dan assignment history dengan access scope. Resource di luar command chain dikembalikan 404 untuk mencegah enumeration. |
| `GET` | `/positions` | Daftar seat/jabatan | `position.read` | Query: page,limit,search,code,roleCode,unitId,reportsToPositionId,isActive | Paged<PositionSummary> | Filter Position and join role/unit/current occupant. Apply org scope. |
| `POST` | `/position-assignments` | Buat assignment non-mutasi | `assignment.create` | {"userProfileId":"uuid","positionId":"uuid","isPrimary":false,"validFrom":"ISO","validUntil":"ISO optional","areaScopeIds":["uuid"]} | 201 PositionAssignmentDetail | Validate user status, role match, seat vacancy, time overlap and area policy; insert assignment/scopes transactionally. Primary role must match Better Auth role. |

**Applicable shared forms**

- `F-USER-PROVISION`
- `F-USER-METADATA`
- `F-USER-LOCK`
- `F-PRIMARY-ASSIGNMENT`

**Inherited page rules**

- Provisioning atomik
- Role auth dan domain harus sinkron
- Tidak ada hard delete

#### `/dashboard/admin-system/role-hak-akses/[roleId]`

- **File:** `src/app/dashboard/admin-system/role-hak-akses/[roleId]/page.tsx`
- **Resource:** `Role`
- **Page type:** `detail-edit`
- **Purpose:** Permission matrix and area policy

**Flow**

1. Load current data and concurrency metadata.
2. Permit editing only when the server reports the resource as editable.
3. Submit validated changes and refresh dependent views.

**Displayed sections**

- Role identity
- Permission matrix
- Position mapping
- Area policy
- Change history

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/roles/{roleId}` | Detail role dan permission | `role.read` | Path: roleId | RoleDetail | Join RolePermission→Permission. Tidak memuat pengguna. |
| `GET` | `/permissions` | Daftar permission catalog | `permission.read` | Query: search?,module? | List<PermissionResponse> | Filter Permission.code/name. Read-only kecuali deployment seed. |
| `PUT` | `/roles/{roleId}/permissions` | Ganti permission role | `role.permission.manage` | {"permissionCodes":["directive.read","task.assign"]} | RoleDetail | Validate all codes; replace junction rows in transaction; invalidate authorization cache. Admin System only; audit before/after; tidak boleh menghapus permission minimum ADMIN_SYSTEM. |

**Applicable shared forms**

- `F-ROLE-PERMISSIONS`
- `F-POSITION-AREA-POLICY`

**Inherited page rules**

- Separation of duties
- Admin access does not imply intelligence content access

#### `/dashboard/admin-system/jabatan-reporting-line/baru`

- **File:** `src/app/dashboard/admin-system/jabatan-reporting-line/baru/page.tsx`
- **Resource:** `Position`
- **Page type:** `create`
- **Purpose:** Create position seat

**Flow**

1. Load reference data and eligible relationships.
2. Validate the form locally and on the server.
3. Create the resource or draft in one transaction.
4. Redirect to the canonical detail/edit route returned by the API.

**Displayed sections**

- Seat identity
- Role
- Organization unit
- Reports-to
- Current occupant
- Subordinates
- Area policy

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/roles` | Daftar role domain | `role.read` | Query: isActive? | List<RoleResponse> | Read Role plus permission count and position count. RoleCode fixed; no delete. |
| `GET` | `/organization-units` | Daftar unit organisasi | `organization.read` | Query: page,limit,search,type,parentId,isActive,branchType? | Paged<OrganizationUnitSummary> | Apply organization scope via OrganizationUnitClosure; optional direct children by parentId. Default deletedAt IS NULL. |
| `GET` | `/positions` | Daftar seat/jabatan | `position.read` | Query: page,limit,search,code,roleCode,unitId,reportsToPositionId,isActive | Paged<PositionSummary> | Filter Position and join role/unit/current occupant. Apply org scope. |
| `POST` | `/positions` | Buat seat/jabatan | `position.create` | {"code":"KORWIL","title":"Korwil Pekanbaru","roleId":"uuid","organizationUnitId":"uuid","reportsToPositionId":"uuid"} | 201 PositionDetail | Validate PositionCode↔RoleCode and branch-specific reporting line. KORWIL can be DIRECTORATE or BINDA branch but reportsTo must be KASUBDIT/KABAGOPS respectively. |

**Applicable shared forms**

- `F-POSITION`
- `F-REPORTING-LINE`

**Inherited page rules**

- Role-position mapping wajib valid
- KORWIL Directorate melapor ke KASUBDIT; KORWIL Binda ke KABAGOPS

#### `/dashboard/admin-system/jabatan-reporting-line/[positionId]`

- **File:** `src/app/dashboard/admin-system/jabatan-reporting-line/[positionId]/page.tsx`
- **Resource:** `Position`
- **Page type:** `detail`
- **Purpose:** Position, occupant, reporting chain

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Seat identity
- Role
- Organization unit
- Reports-to
- Current occupant
- Subordinates
- Area policy

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/positions/{positionId}` | Detail position | `position.read` | Query: include=occupant,subordinates,reportingChain | PositionDetail | Join role, unit, active occupant. Scoped. |

**Applicable shared forms**

- `F-POSITION`
- `F-REPORTING-LINE`

**Inherited page rules**

- Role-position mapping wajib valid
- KORWIL Directorate melapor ke KASUBDIT; KORWIL Binda ke KABAGOPS

#### `/dashboard/admin-system/jabatan-reporting-line/[positionId]/edit`

- **File:** `src/app/dashboard/admin-system/jabatan-reporting-line/[positionId]/edit/page.tsx`
- **Resource:** `Position`
- **Page type:** `edit`
- **Purpose:** Edit title/role/unit

**Flow**

1. Load the editable draft and ETag/version token.
2. Submit only permitted fields with If-Match.
3. Handle 409 conflicts without overwriting newer data.

**Displayed sections**

- Seat identity
- Role
- Organization unit
- Reports-to
- Current occupant
- Subordinates
- Area policy

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/positions/{positionId}` | Detail position | `position.read` | Query: include=occupant,subordinates,reportingChain | PositionDetail | Join role, unit, active occupant. Scoped. |
| `PATCH` | `/positions/{positionId}` | Ubah title/status position | `position.update` | {"title?":"...","isActive?":true} | PositionDetail | Update mutable metadata. Role/unit/reporting line change uses dedicated endpoints to ensure validation. |

**Applicable shared forms**

- `F-POSITION`
- `F-REPORTING-LINE`

**Inherited page rules**

- Role-position mapping wajib valid
- KORWIL Directorate melapor ke KASUBDIT; KORWIL Binda ke KABAGOPS

#### `/dashboard/admin-system/jabatan-reporting-line/[positionId]/reporting-line`

- **File:** `src/app/dashboard/admin-system/jabatan-reporting-line/[positionId]/reporting-line/page.tsx`
- **Resource:** `Position`
- **Page type:** `action-page`
- **Purpose:** Change supervisor

**Flow**

1. Load the resource and available actions.
2. Display a focused form for one explicit business action.
3. Require confirmation/reason where applicable.
4. Execute the action and redirect to the canonical detail.

**Displayed sections**

- Seat identity
- Role
- Organization unit
- Reports-to
- Current occupant
- Subordinates
- Area policy

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/positions/{positionId}` | Detail position | `position.read` | Query: include=occupant,subordinates,reportingChain | PositionDetail | Join role, unit, active occupant. Scoped. |
| `GET` | `/positions/{positionId}/reporting-chain` | Rantai komando position | `position.read` | Tidak ada body | List<PositionSummary> | Recursive CTE on reportsToPositionId with cycle guard. Used by routing and approval. |
| `POST` | `/positions/{positionId}/change-reporting-line` | Ubah atasan jabatan | `position.reporting.manage` | {"reportsToPositionId":"uuid","reason":"string"} | PositionDetail | Validate no reporting cycle, role/branch compatibility, same or allowed organization branch. Audit mandatory. |

**Applicable shared forms**

- `F-POSITION`
- `F-REPORTING-LINE`

**Inherited page rules**

- Role-position mapping wajib valid
- KORWIL Directorate melapor ke KASUBDIT; KORWIL Binda ke KABAGOPS

#### `/dashboard/admin-system/organisasi-wilayah/organisasi/baru`

- **File:** `src/app/dashboard/admin-system/organisasi-wilayah/organisasi/baru/page.tsx`
- **Resource:** `OrganizationUnit + AdministrativeArea`
- **Page type:** `create`
- **Purpose:** Create organization unit

**Flow**

1. Load reference data and eligible relationships.
2. Validate the form locally and on the server.
3. Create the resource or draft in one transaction.
4. Redirect to the canonical detail/edit route returned by the API.

**Displayed sections**

- Unit identity
- Parent/ancestor path
- Children
- Positions
- Area coverage
- Active state

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/organization-units` | Daftar unit organisasi | `organization.read` | Query: page,limit,search,type,parentId,isActive,branchType? | Paged<OrganizationUnitSummary> | Apply organization scope via OrganizationUnitClosure; optional direct children by parentId. Default deletedAt IS NULL. |
| `POST` | `/organization-units` | Buat unit organisasi | `organization.create` | {"code":"...","name":"...","type":"SUBDIRECTORATE","parentId":"uuid"} | 201 OrganizationUnitDetail | Validate allowed parent-child type; insert unit and closure self/ancestor paths in transaction. Code unique; cycle impossible on create. |

**Applicable shared forms**

- `F-ORGANIZATION-UNIT`
- `F-UNIT-COVERAGE`
- `F-ADMIN-AREA`
- `F-BOUNDARY-VERSION`
- `F-AREA-IMPORT`

**Inherited page rules**

- Move hierarchy transactional
- Boundary validation before activation
- Prevent cycles

#### `/dashboard/admin-system/organisasi-wilayah/organisasi/[unitId]`

- **File:** `src/app/dashboard/admin-system/organisasi-wilayah/organisasi/[unitId]/page.tsx`
- **Resource:** `OrganizationUnit + AdministrativeArea`
- **Page type:** `detail`
- **Purpose:** Unit detail and coverage

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Unit identity
- Parent/ancestor path
- Children
- Positions
- Area coverage
- Active state

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/organization-units/{unitId}` | Detail unit | `organization.read` | Query: include=parent,children,positions,coverages | OrganizationUnitDetail | Load scoped unit and requested relations. Return 404 if outside scope. |
| `GET` | `/organization-units/{unitId}/area-coverages` | Coverage wilayah unit | `organization.coverage.read` | Query: activeOnly=true,includeDescendants=false | List<OrganizationAreaCoverageResponse> | Read coverage aktif; optional expand via area closure. Hanya area dalam scope caller. |

**Applicable shared forms**

- `F-ORGANIZATION-UNIT`
- `F-UNIT-COVERAGE`
- `F-ADMIN-AREA`
- `F-BOUNDARY-VERSION`
- `F-AREA-IMPORT`

**Inherited page rules**

- Move hierarchy transactional
- Boundary validation before activation
- Prevent cycles

#### `/dashboard/admin-system/organisasi-wilayah/organisasi/[unitId]/edit`

- **File:** `src/app/dashboard/admin-system/organisasi-wilayah/organisasi/[unitId]/edit/page.tsx`
- **Resource:** `OrganizationUnit + AdministrativeArea`
- **Page type:** `edit`
- **Purpose:** Edit/move unit

**Flow**

1. Load the editable draft and ETag/version token.
2. Submit only permitted fields with If-Match.
3. Handle 409 conflicts without overwriting newer data.

**Displayed sections**

- Unit identity
- Parent/ancestor path
- Children
- Positions
- Area coverage
- Active state

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/organization-units/{unitId}` | Detail unit | `organization.read` | Query: include=parent,children,positions,coverages | OrganizationUnitDetail | Load scoped unit and requested relations. Return 404 if outside scope. |
| `GET` | `/organization-units/{unitId}/area-coverages` | Coverage wilayah unit | `organization.coverage.read` | Query: activeOnly=true,includeDescendants=false | List<OrganizationAreaCoverageResponse> | Read coverage aktif; optional expand via area closure. Hanya area dalam scope caller. |
| `PATCH` | `/organization-units/{unitId}` | Ubah metadata unit | `organization.update` | {"name?":"...","isActive?":true} | OrganizationUnitDetail | Update mutable fields only. parentId tidak boleh diubah di endpoint ini. |
| `POST` | `/organization-units/{unitId}/move` | Pindahkan unit dalam hierarchy | `organization.move` | {"newParentId":"uuid","reason":"string"} | OrganizationUnitDetail | Validate type compatibility and no cycle; rebuild affected OrganizationUnitClosure paths transactionally. Tolak jika active workflow/assignment akan kehilangan valid branch tanpa remediation. |

**Applicable shared forms**

- `F-ORGANIZATION-UNIT`
- `F-UNIT-COVERAGE`
- `F-ADMIN-AREA`
- `F-BOUNDARY-VERSION`
- `F-AREA-IMPORT`

**Inherited page rules**

- Move hierarchy transactional
- Boundary validation before activation
- Prevent cycles

#### `/dashboard/admin-system/organisasi-wilayah/wilayah/baru`

- **File:** `src/app/dashboard/admin-system/organisasi-wilayah/wilayah/baru/page.tsx`
- **Resource:** `OrganizationUnit + AdministrativeArea`
- **Page type:** `create`
- **Purpose:** Create administrative area

**Flow**

1. Load reference data and eligible relationships.
2. Validate the form locally and on the server.
3. Create the resource or draft in one transaction.
4. Redirect to the canonical detail/edit route returned by the API.

**Displayed sections**

- Unit identity
- Parent/ancestor path
- Children
- Positions
- Area coverage
- Active state

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/administrative-areas/tree` | Cascading tree wilayah | `area.read` | Query: rootId?,maxDepth=3,levels?,includeBoundaryStatus=true | AdministrativeAreaTreeResponse | Fetch closure descendants; annotate boundary availability and childCount. Payload depth capped. |
| `POST` | `/administrative-areas` | Buat wilayah manual | `area.manage` | {"code":"...","officialCode":"...","name":"...","level":"RW","parentId":"uuid","centroidLatitude":null,"centroidLongitude":null} | 201 AdministrativeAreaDetail | Validate level-parent pair; insert area and closure paths. Admin only; officialCode unique if provided. |

**Applicable shared forms**

- `F-ORGANIZATION-UNIT`
- `F-UNIT-COVERAGE`
- `F-ADMIN-AREA`
- `F-BOUNDARY-VERSION`
- `F-AREA-IMPORT`

**Inherited page rules**

- Move hierarchy transactional
- Boundary validation before activation
- Prevent cycles

#### `/dashboard/admin-system/organisasi-wilayah/wilayah/[areaId]`

- **File:** `src/app/dashboard/admin-system/organisasi-wilayah/wilayah/[areaId]/page.tsx`
- **Resource:** `OrganizationUnit + AdministrativeArea`
- **Page type:** `detail`
- **Purpose:** Area hierarchy and boundary

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Unit identity
- Parent/ancestor path
- Children
- Positions
- Area coverage
- Active state

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/administrative-areas/{areaId}` | Detail wilayah | `area.read` | Query: include=parent,children,ancestors,boundaryMeta | AdministrativeAreaDetail | Load scoped area and requested relations. No raw geometry unless requested via boundary endpoint. |
| `GET` | `/administrative-areas/{areaId}/ancestors` | Breadcrumb administratif | `area.read` | Query: includeSelf=true | List<AdministrativeAreaSummary> | Closure where descendantId=areaId ordered highest to lowest. Scoped. |
| `GET` | `/administrative-areas/{areaId}/children` | Anak wilayah untuk cascading filter | `area.read` | Query: level?,search?,limit=1000 | List<AdministrativeAreaSummary> | Query parentId=areaId; order by name/code. Used for Provinsi→Kab/Kota→Kecamatan→Desa→RW→RT. |

**Applicable shared forms**

- `F-ORGANIZATION-UNIT`
- `F-UNIT-COVERAGE`
- `F-ADMIN-AREA`
- `F-BOUNDARY-VERSION`
- `F-AREA-IMPORT`

**Inherited page rules**

- Move hierarchy transactional
- Boundary validation before activation
- Prevent cycles

#### `/dashboard/admin-system/organisasi-wilayah/wilayah/[areaId]/edit`

- **File:** `src/app/dashboard/admin-system/organisasi-wilayah/wilayah/[areaId]/edit/page.tsx`
- **Resource:** `OrganizationUnit + AdministrativeArea`
- **Page type:** `edit`
- **Purpose:** Edit/move area

**Flow**

1. Load the editable draft and ETag/version token.
2. Submit only permitted fields with If-Match.
3. Handle 409 conflicts without overwriting newer data.

**Displayed sections**

- Unit identity
- Parent/ancestor path
- Children
- Positions
- Area coverage
- Active state

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/administrative-areas/{areaId}` | Detail wilayah | `area.read` | Query: include=parent,children,ancestors,boundaryMeta | AdministrativeAreaDetail | Load scoped area and requested relations. No raw geometry unless requested via boundary endpoint. |
| `GET` | `/administrative-areas/{areaId}/ancestors` | Breadcrumb administratif | `area.read` | Query: includeSelf=true | List<AdministrativeAreaSummary> | Closure where descendantId=areaId ordered highest to lowest. Scoped. |
| `GET` | `/administrative-areas/{areaId}/children` | Anak wilayah untuk cascading filter | `area.read` | Query: level?,search?,limit=1000 | List<AdministrativeAreaSummary> | Query parentId=areaId; order by name/code. Used for Provinsi→Kab/Kota→Kecamatan→Desa→RW→RT. |
| `PATCH` | `/administrative-areas/{areaId}` | Ubah metadata wilayah | `area.manage` | {"name?":"...","isActive?":true,"centroidLatitude?":0,"centroidLongitude?":0} | AdministrativeAreaDetail | Update non-hierarchy fields. parentId/level change forbidden here. |
| `POST` | `/administrative-areas/{areaId}/move` | Pindahkan area hierarchy | `area.manage` | {"newParentId":"uuid","reason":"string"} | AdministrativeAreaDetail | Validate no cycle and level compatibility; rebuild closure affected paths. High-risk admin action; dryRun query parameter supported. |

**Applicable shared forms**

- `F-ORGANIZATION-UNIT`
- `F-UNIT-COVERAGE`
- `F-ADMIN-AREA`
- `F-BOUNDARY-VERSION`
- `F-AREA-IMPORT`

**Inherited page rules**

- Move hierarchy transactional
- Boundary validation before activation
- Prevent cycles

#### `/dashboard/admin-system/organisasi-wilayah/wilayah/[areaId]/boundary`

- **File:** `src/app/dashboard/admin-system/organisasi-wilayah/wilayah/[areaId]/boundary/page.tsx`
- **Resource:** `OrganizationUnit + AdministrativeArea`
- **Page type:** `map-editor`
- **Purpose:** Boundary version editor

**Flow**

1. Load the selected area, active boundary, source metadata, and parent/sibling boundaries.
2. Edit/import GeoJSON in a client-only map component.
3. Run geometry validation before activation.
4. Create a new boundary version rather than overwriting history.

**Displayed sections**

- Unit identity
- Parent/ancestor path
- Children
- Positions
- Area coverage
- Active state

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/administrative-areas/{areaId}` | Detail wilayah | `area.read` | Query: include=parent,children,ancestors,boundaryMeta | AdministrativeAreaDetail | Load scoped area and requested relations. No raw geometry unless requested via boundary endpoint. |
| `GET` | `/administrative-areas/{areaId}/ancestors` | Breadcrumb administratif | `area.read` | Query: includeSelf=true | List<AdministrativeAreaSummary> | Closure where descendantId=areaId ordered highest to lowest. Scoped. |
| `GET` | `/administrative-areas/{areaId}/children` | Anak wilayah untuk cascading filter | `area.read` | Query: level?,search?,limit=1000 | List<AdministrativeAreaSummary> | Query parentId=areaId; order by name/code. Used for Provinsi→Kab/Kota→Kecamatan→Desa→RW→RT. |
| `GET` | `/administrative-areas/{areaId}/boundary` | Ambil boundary GeoJSON | `area.read` | Query: version=active\|number,format=geojson,simplifyMeters?,bboxOnly=false | GeoJsonFeatureResponse | SpatialRepository uses ST_AsGeoJSON; optional ST_SimplifyPreserveTopology; return metadata. Never return INVALID boundary; simplification capped by zoom. |
| `POST` | `/administrative-areas/{areaId}/boundaries` | Tambah versi boundary | `area.boundary.manage` | {"dataSourceId":"uuid optional","versionNumber":2,"geoJson":{},"qualityStatus":"VERIFIED","simplificationToleranceMeters":0,"effectiveFrom":"ISO","activate":true} | 201 AdministrativeAreaBoundaryResponse | Convert GeoJSON via ST_GeomFromGeoJSON→ST_Multi→SRID 4326; validate geometry; calculate centroid/bbox/hash; deactivate prior active boundary atomically if activate. Geometry must be valid MultiPolygon and match area context. |

**Applicable shared forms**

- `F-ORGANIZATION-UNIT`
- `F-UNIT-COVERAGE`
- `F-ADMIN-AREA`
- `F-BOUNDARY-VERSION`
- `F-AREA-IMPORT`

**Inherited page rules**

- Move hierarchy transactional
- Boundary validation before activation
- Prevent cycles

#### `/dashboard/admin-system/organisasi-wilayah/imports/baru`

- **File:** `src/app/dashboard/admin-system/organisasi-wilayah/imports/baru/page.tsx`
- **Resource:** `OrganizationUnit + AdministrativeArea`
- **Page type:** `create`
- **Purpose:** Import area/boundary dataset

**Flow**

1. Load reference data and eligible relationships.
2. Validate the form locally and on the server.
3. Create the resource or draft in one transaction.
4. Redirect to the canonical detail/edit route returned by the API.

**Displayed sections**

- Unit identity
- Parent/ancestor path
- Children
- Positions
- Area coverage
- Active state

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `POST` | `/files/presign` | Minta signed upload URL | `file.create` | {"originalName":"photo.jpg","mimeType":"image/jpeg","fileType":"PHOTO","sizeBytes":12345,"checksumSha256":"...","context":"BAKET"} | 201 PresignedUploadResponse | Validate MIME, size, extension, caller permission; reserve storage key and pending metadata. Idempotency by checksum+context; malware scan required before usable. |
| `POST` | `/files/complete` | Konfirmasi upload selesai | `file.create` | {"uploadToken":"...","storageKey":"..."} | 201 FileAssetResponse | HEAD object; verify size/checksum; create FileAsset; enqueue malware scan. File cannot attach until scan status clean; schema may require scan metadata extension. |
| `POST` | `/administrative-area-imports` | Import dataset wilayah/boundary | `area.import` | multipart file + metadata {name,sourceType,referenceUrl,versionLabel,effectiveDate,mode:VALIDATE\|UPSERT} | 202 ImportJobResponse | Store source metadata; parse asynchronously; validate hierarchy/codes/geometries; upsert in batches; rebuild closure. Requires ImportJob persistence/queue; checksum idempotency. |

**Applicable shared forms**

- `F-ORGANIZATION-UNIT`
- `F-UNIT-COVERAGE`
- `F-ADMIN-AREA`
- `F-BOUNDARY-VERSION`
- `F-AREA-IMPORT`

**Inherited page rules**

- Move hierarchy transactional
- Boundary validation before activation
- Prevent cycles

#### `/dashboard/admin-system/organisasi-wilayah/imports/[jobId]`

- **File:** `src/app/dashboard/admin-system/organisasi-wilayah/imports/[jobId]/page.tsx`
- **Resource:** `OrganizationUnit + AdministrativeArea`
- **Page type:** `detail`
- **Purpose:** Import job result

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Unit identity
- Parent/ancestor path
- Children
- Positions
- Area coverage
- Active state

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/administrative-area-imports/{jobId}` | Status import | `area.import` | Path jobId | ImportJobResponse | Read job progress/error summary. Job data retained for audit. |

**Applicable shared forms**

- `F-ORGANIZATION-UNIT`
- `F-UNIT-COVERAGE`
- `F-ADMIN-AREA`
- `F-BOUNDARY-VERSION`
- `F-AREA-IMPORT`

**Inherited page rules**

- Move hierarchy transactional
- Boundary validation before activation
- Prevent cycles

#### `/dashboard/admin-system/integrasi-wa-center/baru`

- **File:** `src/app/dashboard/admin-system/integrasi-wa-center/baru/page.tsx`
- **Resource:** `IntegrationChannel`
- **Page type:** `create`
- **Purpose:** Create integration channel

**Flow**

1. Load reference data and eligible relationships.
2. Validate the form locally and on the server.
3. Create the resource or draft in one transaction.
4. Redirect to the canonical detail/edit route returned by the API.

**Displayed sections**

- Channel identity
- Status
- Masked configuration
- Last health
- Webhook events
- Failure and retry history

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `POST` | `/integration-channels` | Buat channel | `integration.manage` | {"code":"...","name":"...","channelType":"WHATSAPP","config":{},"status":"INACTIVE"} | 201 IntegrationChannelResponse | Encrypt/separate secrets; insert channel. Never return secret values. |

**Applicable shared forms**

- `F-INTEGRATION-CHANNEL`
- `F-WEBHOOK-RETRY`

**Inherited page rules**

- Secret tidak ditampilkan kembali
- Retry idempotent
- Payload webhook read-only

#### `/dashboard/admin-system/integrasi-wa-center/[channelId]`

- **File:** `src/app/dashboard/admin-system/integrasi-wa-center/[channelId]/page.tsx`
- **Resource:** `IntegrationChannel`
- **Page type:** `detail`
- **Purpose:** Channel health and webhook history

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Channel identity
- Status
- Masked configuration
- Last health
- Webhook events
- Failure and retry history

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/integration-channels/{channelId}` | Detail channel | `integration.read` | Tidak ada body | IntegrationChannelResponse | Return redacted config and health. Admin only. |
| `GET` | `/integration-channels/{channelId}/webhook-events` | Daftar webhook event | `integration.read` | Query: cursor,limit,eventType,success,from,to | CursorPage<WebhookEventSummary> | Query channelId; raw payload omitted. Admin/integration operator. |

**Applicable shared forms**

- `F-INTEGRATION-CHANNEL`
- `F-WEBHOOK-RETRY`

**Inherited page rules**

- Secret tidak ditampilkan kembali
- Retry idempotent
- Payload webhook read-only

#### `/dashboard/admin-system/integrasi-wa-center/[channelId]/edit`

- **File:** `src/app/dashboard/admin-system/integrasi-wa-center/[channelId]/edit/page.tsx`
- **Resource:** `IntegrationChannel`
- **Page type:** `edit`
- **Purpose:** Edit non-secret configuration

**Flow**

1. Load the editable draft and ETag/version token.
2. Submit only permitted fields with If-Match.
3. Handle 409 conflicts without overwriting newer data.

**Displayed sections**

- Channel identity
- Status
- Masked configuration
- Last health
- Webhook events
- Failure and retry history

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/integration-channels/{channelId}` | Detail channel | `integration.read` | Tidak ada body | IntegrationChannelResponse | Return redacted config and health. Admin only. |
| `GET` | `/integration-channels/{channelId}/webhook-events` | Daftar webhook event | `integration.read` | Query: cursor,limit,eventType,success,from,to | CursorPage<WebhookEventSummary> | Query channelId; raw payload omitted. Admin/integration operator. |
| `PATCH` | `/integration-channels/{channelId}` | Ubah channel | `integration.manage` | {"name?":"...","configPatch?":{} } | IntegrationChannelResponse | Patch config via secret manager reference; audit. Status uses actions. |

**Applicable shared forms**

- `F-INTEGRATION-CHANNEL`
- `F-WEBHOOK-RETRY`

**Inherited page rules**

- Secret tidak ditampilkan kembali
- Retry idempotent
- Payload webhook read-only

#### `/dashboard/admin-system/integrasi-wa-center/[channelId]/webhooks/[eventId]`

- **File:** `src/app/dashboard/admin-system/integrasi-wa-center/[channelId]/webhooks/[eventId]/page.tsx`
- **Resource:** `IntegrationChannel`
- **Page type:** `detail`
- **Purpose:** Immutable webhook event

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Channel identity
- Status
- Masked configuration
- Last health
- Webhook events
- Failure and retry history

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/integration-channels/{channelId}` | Detail channel | `integration.read` | Tidak ada body | IntegrationChannelResponse | Return redacted config and health. Admin only. |
| `GET` | `/integration-channels/{channelId}/webhook-events` | Daftar webhook event | `integration.read` | Query: cursor,limit,eventType,success,from,to | CursorPage<WebhookEventSummary> | Query channelId; raw payload omitted. Admin/integration operator. |
| `GET` | `/webhook-events/{eventId}` | Detail webhook event | `integration.read` | Query: includePayload=false | WebhookEventDetail | Load event; raw payload permission + redaction. Payload read audited. |
| `POST` | `/webhook-events/{eventId}/retry` | Retry event gagal | `integration.retry` | {"reason":"string"} | 202 WebhookEventDetail | Check prior failed/not processed; enqueue idempotent processing. No duplicate domain message. |

**Applicable shared forms**

- `F-INTEGRATION-CHANNEL`
- `F-WEBHOOK-RETRY`

**Inherited page rules**

- Secret tidak ditampilkan kembali
- Retry idempotent
- Payload webhook read-only

#### `/dashboard/admin-system/master-data/product-types/baru`

- **File:** `src/app/dashboard/admin-system/master-data/product-types/baru/page.tsx`
- **Resource:** `Reference Data`
- **Page type:** `create`
- **Purpose:** Create product type

**Flow**

1. Load reference data and eligible relationships.
2. Validate the form locally and on the server.
3. Create the resource or draft in one transaction.
4. Redirect to the canonical detail/edit route returned by the API.

**Displayed sections**

- Resource identity
- Current state
- Related records
- Timeline
- Available actions

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `POST` | `/product-types` | Buat jenis produk | `product.template.manage` | {"code":"...","name":"...","formatNo":"...","description":"..."} | 201 ProductTypeResponse | Insert unique code. Admin/template manager only. |

**Applicable shared forms**

- `F-PRODUCT-TYPE`
- `F-PRODUCT-TEMPLATE`
- `F-POSITION-AREA-POLICY`

**Inherited page rules**

- Template aktif tidak diedit; buat versi baru

#### `/dashboard/admin-system/master-data/product-types/[productTypeId]`

- **File:** `src/app/dashboard/admin-system/master-data/product-types/[productTypeId]/page.tsx`
- **Resource:** `Reference Data`
- **Page type:** `detail`
- **Purpose:** Product type detail

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Resource identity
- Current state
- Related records
- Timeline
- Available actions

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/product-types` | Daftar jenis produk intelijen | `product.template.read` | Query: isActive? | List<ProductTypeResponse> | Read ProductTypeDefinition with active template version. Available to product creators. |
| `GET` | `/product-types/{productTypeId}/templates` | Daftar versi template | `product.template.read` | Query: activeOnly=false | List<ProductTemplateSummary> | Order versionNumber desc. Template used by product remains readable. |

**Applicable shared forms**

- `F-PRODUCT-TYPE`
- `F-PRODUCT-TEMPLATE`
- `F-POSITION-AREA-POLICY`

**Inherited page rules**

- Template aktif tidak diedit; buat versi baru

#### `/dashboard/admin-system/master-data/product-types/[productTypeId]/templates/baru`

- **File:** `src/app/dashboard/admin-system/master-data/product-types/[productTypeId]/templates/baru/page.tsx`
- **Resource:** `Reference Data`
- **Page type:** `create`
- **Purpose:** Create template version

**Flow**

1. Load reference data and eligible relationships.
2. Validate the form locally and on the server.
3. Create the resource or draft in one transaction.
4. Redirect to the canonical detail/edit route returned by the API.

**Displayed sections**

- Resource identity
- Current state
- Related records
- Timeline
- Available actions

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/product-types` | Daftar jenis produk intelijen | `product.template.read` | Query: isActive? | List<ProductTypeResponse> | Read ProductTypeDefinition with active template version. Available to product creators. |
| `GET` | `/product-types/{productTypeId}/templates` | Daftar versi template | `product.template.read` | Query: activeOnly=false | List<ProductTemplateSummary> | Order versionNumber desc. Template used by product remains readable. |

**Applicable shared forms**

- `F-PRODUCT-TYPE`
- `F-PRODUCT-TEMPLATE`
- `F-POSITION-AREA-POLICY`

**Inherited page rules**

- Template aktif tidak diedit; buat versi baru

#### `/dashboard/admin-system/master-data/product-types/[productTypeId]/templates/[templateId]`

- **File:** `src/app/dashboard/admin-system/master-data/product-types/[productTypeId]/templates/[templateId]/page.tsx`
- **Resource:** `Reference Data`
- **Page type:** `detail-edit`
- **Purpose:** Template sections and fields

**Flow**

1. Load current data and concurrency metadata.
2. Permit editing only when the server reports the resource as editable.
3. Submit validated changes and refresh dependent views.

**Displayed sections**

- Resource identity
- Current state
- Related records
- Timeline
- Available actions

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/product-templates/{templateId}` | Detail template | `product.template.read` | Tidak ada body | ProductTemplateDetail | Load ordered sections/fields. Scoped by active product type. |
| `POST` | `/product-templates/{templateId}/validate-content` | Validasi payload produk terhadap template | `product.create` | {"content":{}} | TemplateValidationResponse | Apply required/dataType/validation JSON rules. No persistence; returns all field errors. |

**Applicable shared forms**

- `F-PRODUCT-TYPE`
- `F-PRODUCT-TEMPLATE`
- `F-POSITION-AREA-POLICY`

**Inherited page rules**

- Template aktif tidak diedit; buat versi baru

#### `/dashboard/admin-system/master-data/position-area-policies/[policyId]`

- **File:** `src/app/dashboard/admin-system/master-data/position-area-policies/[policyId]/page.tsx`
- **Resource:** `Reference Data`
- **Page type:** `detail-edit`
- **Purpose:** Area policy

**Flow**

1. Load current data and concurrency metadata.
2. Permit editing only when the server reports the resource as editable.
3. Submit validated changes and refresh dependent views.

**Displayed sections**

- Resource identity
- Current state
- Related records
- Timeline
- Available actions

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/position-area-policies` | Daftar kebijakan level wilayah per posisi | `area.policy.read` | Query: positionCode?,isActive? | List<PositionAreaPolicyResponse> | Query PositionAreaPolicy. Digunakan saat validasi assignment/scope. |
| `PUT` | `/position-area-policies/{policyId}` | Ubah policy area posisi | `area.policy.manage` | {"scopeMode":"EXPLICIT","minimumAreas":1,"maximumAreas":5,"isActive":true} | PositionAreaPolicyResponse | Update policy dan jalankan impact preview terhadap assignment aktif. 409 jika perubahan membuat assignment aktif invalid kecuali force=true dan remediation plan. |

**Applicable shared forms**

- `F-PRODUCT-TYPE`
- `F-PRODUCT-TEMPLATE`
- `F-POSITION-AREA-POLICY`

**Inherited page rules**

- Template aktif tidak diedit; buat versi baru

#### `/dashboard/admin-system/keamanan-audit/[auditLogId]`

- **File:** `src/app/dashboard/admin-system/keamanan-audit/[auditLogId]/page.tsx`
- **Resource:** `AuditLog`
- **Page type:** `detail`
- **Purpose:** Audit detail and before/after diff

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Actor
- Assignment
- Action
- Entity
- Before/after diff
- Metadata
- IP/device
- Timestamp

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/audit-logs/{auditLogId}` | Detail audit event | `audit.read` | Tidak ada body | AuditLogDetail | Load event; redact secrets and credentials recursively. Audit read itself may be audited. |

**Applicable shared forms**

- `F-AUDIT-EXPORT`

**Inherited page rules**

- Audit append-only
- Sensitive resource may remain masked
- Export requires reason

#### `/dashboard/admin-system/keamanan-audit/exports/baru`

- **File:** `src/app/dashboard/admin-system/keamanan-audit/exports/baru/page.tsx`
- **Resource:** `AuditLog`
- **Page type:** `create`
- **Purpose:** Request audit export

**Flow**

1. Load reference data and eligible relationships.
2. Validate the form locally and on the server.
3. Create the resource or draft in one transaction.
4. Redirect to the canonical detail/edit route returned by the API.

**Displayed sections**

- Actor
- Assignment
- Action
- Entity
- Before/after diff
- Metadata
- IP/device
- Timestamp

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `POST` | `/audit-exports` | Minta export audit | `audit.export` | {"filters":{},"format":"CSV\|JSON","reason":"string"} | 202 ExportJobResponse | Create async export job, apply same scope/redaction, encrypt output, short TTL. Requires ExportJob model/job store; every download audited. |

**Applicable shared forms**

- `F-AUDIT-EXPORT`

**Inherited page rules**

- Audit append-only
- Sensitive resource may remain masked
- Export requires reason

#### `/dashboard/admin-system/keamanan-audit/exports/[jobId]`

- **File:** `src/app/dashboard/admin-system/keamanan-audit/exports/[jobId]/page.tsx`
- **Resource:** `AuditLog`
- **Page type:** `detail`
- **Purpose:** Export job status

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Actor
- Assignment
- Action
- Entity
- Before/after diff
- Metadata
- IP/device
- Timestamp

**API mapping**

No direct API operation.

**Applicable shared forms**

- `F-AUDIT-EXPORT`

**Inherited page rules**

- Audit append-only
- Sensitive resource may remain masked
- Export requires reason

#### `/dashboard/admin-system/konfigurasi-sistem/[settingKey]`

- **File:** `src/app/dashboard/admin-system/konfigurasi-sistem/[settingKey]/page.tsx`
- **Resource:** `SystemSetting`
- **Page type:** `detail-edit`
- **Purpose:** Edit one setting with confirmation

**Flow**

1. Load current data and concurrency metadata.
2. Permit editing only when the server reports the resource as editable.
3. Submit validated changes and refresh dependent views.

**Displayed sections**

- Key
- Current masked value
- Description
- Secret flag
- Last update

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/system/settings/{key}` | Detail setting | `system.setting.read` | Tidak ada body | SystemSettingResponse | Load by key with redaction. No secret plaintext. |
| `PUT` | `/system/settings/{key}` | Upsert setting | `system.setting.manage` | {"value":{},"description":"...","isSecret":false} | SystemSettingResponse | Validate key schema; encrypt/store secret reference if secret; invalidate cache. Audit before/after with redaction. |

**Applicable shared forms**

- `F-SYSTEM-SETTING`

**Inherited page rules**

- Secret encrypted and masked
- Critical settings require confirmation and audit

### 5.3 Executive

#### `/dashboard/executive/pusat-komando/direktif/baru`

- **File:** `src/app/dashboard/executive/pusat-komando/direktif/baru/page.tsx`
- **Resource:** `Directive`
- **Page type:** `create`
- **Purpose:** Create directive draft

**Flow**

1. Load reference data and eligible relationships.
2. Validate the form locally and on the server.
3. Create the resource or draft in one transaction.
4. Redirect to the canonical detail/edit route returned by the API.

**Displayed sections**

- Command identity
- Current version
- Classification
- Target areas
- Recipients
- Tracking
- Derived UUK/STR and tasks

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/administrative-areas/tree` | Cascading tree wilayah | `area.read` | Query: rootId?,maxDepth=3,levels?,includeBoundaryStatus=true | AdministrativeAreaTreeResponse | Fetch closure descendants; annotate boundary availability and childCount. Payload depth capped. |
| `GET` | `/positions` | Daftar seat/jabatan | `position.read` | Query: page,limit,search,code,roleCode,unitId,reportsToPositionId,isActive | Paged<PositionSummary> | Filter Position and join role/unit/current occupant. Apply org scope. |
| `GET` | `/organization-units` | Daftar unit organisasi | `organization.read` | Query: page,limit,search,type,parentId,isActive,branchType? | Paged<OrganizationUnitSummary> | Apply organization scope via OrganizationUnitClosure; optional direct children by parentId. Default deletedAt IS NULL. |
| `POST` | `/directives` | Buat directive dan versi awal | `directive.create` | {"ownerUnitId":"uuid","version":{"commandNumber":"...","classification":"RAHASIA","commandSource":"...","commandIssuer":"...","commandDate":"ISO","dueDate":"ISO","strategicIssue":"...","commandDescription":"...","targetAreaIds":["uuid"],"recipients":[{"targetUnitId":"uuid"}]}} | 201 DirectiveDetail | Transaction create root+version1+targets+recipients draft; validate clearance and recipient target exactly-one. Executive/authorized issuer only; commandNumber SHALL remain identical across revisions by service invariant until moved to Directive root. |

**Applicable shared forms**

- `F-DIRECTIVE`

**Inherited page rules**

- Published version immutable
- Target area and recipient validation required

#### `/dashboard/executive/pusat-komando/direktif/[directiveId]`

- **File:** `src/app/dashboard/executive/pusat-komando/direktif/[directiveId]/page.tsx`
- **Resource:** `Directive`
- **Page type:** `detail`
- **Purpose:** Directive current version and tracking

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Command identity
- Current version
- Classification
- Target areas
- Recipients
- Tracking
- Derived UUK/STR and tasks

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/directives/{directiveId}` | Detail directive current version | `directive.read` | Query: include=recipients,targets,versions,tracking | DirectiveDetail | Load root, current version and relations under security filter. Classified inaccessible resource returns 404. |
| `GET` | `/directives/{directiveId}/versions` | Riwayat versi directive | `directive.read` | Query: page,limit | Paged<DirectiveVersionSummary> | Order versionNumber desc. Published versions immutable. |

**Applicable shared forms**

- `F-DIRECTIVE`

**Inherited page rules**

- Published version immutable
- Target area and recipient validation required

#### `/dashboard/executive/pusat-komando/direktif/[directiveId]/edit`

- **File:** `src/app/dashboard/executive/pusat-komando/direktif/[directiveId]/edit/page.tsx`
- **Resource:** `Directive`
- **Page type:** `edit`
- **Purpose:** Edit draft/create revision

**Flow**

1. Load the editable draft and ETag/version token.
2. Submit only permitted fields with If-Match.
3. Handle 409 conflicts without overwriting newer data.

**Displayed sections**

- Command identity
- Current version
- Classification
- Target areas
- Recipients
- Tracking
- Derived UUK/STR and tasks

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/directives/{directiveId}` | Detail directive current version | `directive.read` | Query: include=recipients,targets,versions,tracking | DirectiveDetail | Load root, current version and relations under security filter. Classified inaccessible resource returns 404. |
| `GET` | `/directives/{directiveId}/versions` | Riwayat versi directive | `directive.read` | Query: page,limit | Paged<DirectiveVersionSummary> | Order versionNumber desc. Published versions immutable. |
| `PATCH` | `/directive-versions/{versionId}` | Edit versi draft | `directive.update` | {"dueDate?":"ISO","strategicIssue?":"...","commandDescription?":"..."} | DirectiveVersionDetail | Only current version while Directive.status=DRAFT. Use If-Match/updated token; published version 409. |
| `PUT` | `/directive-versions/{versionId}/target-areas` | Ganti target area draft | `directive.update` | {"areaIds":["uuid"],"primaryAreaId":"uuid optional"} | List<AreaSummary> | Validate target areas within issuer scope and no redundant descendants unless intentional. Draft only. |
| `PUT` | `/directive-versions/{versionId}/recipients` | Ganti penerima draft | `directive.update` | {"recipients":[{"targetUnitId":"uuid"},{"targetPositionId":"uuid"}]} | List<DirectiveRecipientResponse> | Validate exactly one target per recipient, clearance, command chain and target area overlap. Draft only; no duplicate target. |
| `POST` | `/directive-versions/{versionId}/publish` | Publish directive | `directive.publish` | {"confirmation":"PUBLISH","note":"string optional"} | DirectiveDetail | Validate mandatory fields, at least one target/recipient, clearance; set status PUBLISHED; freeze version; create audit. Idempotency-Key; cannot unpublish. |
| `POST` | `/directive-versions/{versionId}/distribute` | Distribusikan directive | `directive.distribute` | {"sendNotifications":true,"scheduledAt":"ISO optional"} | DistributionActionResponse | Create/send recipient deliveries, set status DISTRIBUTED; enqueue notifications/read tracking. Only published current version; retry safe via idempotency. |

**Applicable shared forms**

- `F-DIRECTIVE`

**Inherited page rules**

- Published version immutable
- Target area and recipient validation required

#### `/dashboard/executive/pusat-komando/direktif/[directiveId]/versions/[versionId]`

- **File:** `src/app/dashboard/executive/pusat-komando/direktif/[directiveId]/versions/[versionId]/page.tsx`
- **Resource:** `Directive`
- **Page type:** `version-detail`
- **Purpose:** Immutable version detail

**Flow**

1. Load the exact historical version by path parameter.
2. Render it read-only with change reason, creator, timestamp, and source links.
3. Provide navigation to adjacent versions and the root resource.

**Displayed sections**

- Command identity
- Current version
- Classification
- Target areas
- Recipients
- Tracking
- Derived UUK/STR and tasks

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/directives/{directiveId}` | Detail directive current version | `directive.read` | Query: include=recipients,targets,versions,tracking | DirectiveDetail | Load root, current version and relations under security filter. Classified inaccessible resource returns 404. |
| `GET` | `/directives/{directiveId}/versions` | Riwayat versi directive | `directive.read` | Query: page,limit | Paged<DirectiveVersionSummary> | Order versionNumber desc. Published versions immutable. |
| `GET` | `/directive-versions/{versionId}` | Detail versi directive | `directive.read` | Tidak ada body | DirectiveVersionDetail | Read exact immutable snapshot. Security based on directive scope/classification. |

**Applicable shared forms**

- `F-DIRECTIVE`

**Inherited page rules**

- Published version immutable
- Target area and recipient validation required

#### `/dashboard/executive/pusat-komando/direktif/[directiveId]/tracking`

- **File:** `src/app/dashboard/executive/pusat-komando/direktif/[directiveId]/tracking/page.tsx`
- **Resource:** `Directive`
- **Page type:** `tracking`
- **Purpose:** Recipient acknowledgement and task fulfillment

**Flow**

1. Load workflow/recipient timeline and current state.
2. Render timestamps, actor/target, failures, retries, and next step.
3. Keep the page read-only except for explicit retry/cancel actions.

**Displayed sections**

- Command identity
- Current version
- Classification
- Target areas
- Recipients
- Tracking
- Derived UUK/STR and tasks

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/directives/{directiveId}` | Detail directive current version | `directive.read` | Query: include=recipients,targets,versions,tracking | DirectiveDetail | Load root, current version and relations under security filter. Classified inaccessible resource returns 404. |
| `GET` | `/directives/{directiveId}/versions` | Riwayat versi directive | `directive.read` | Query: page,limit | Paged<DirectiveVersionSummary> | Order versionNumber desc. Published versions immutable. |
| `GET` | `/directives/{directiveId}/tracking` | Tracking pelaksanaan direktif | `directive.track` | Query: areaId?,unitId?,includeTasks=true | DirectiveTrackingResponse | Aggregate recipient status, descendant tasks, assignments, progress and linked Baket by area/unit. Counts must use same scoped filter as detail. |

**Applicable shared forms**

- `F-DIRECTIVE`

**Inherited page rules**

- Published version immutable
- Target area and recipient validation required

#### `/dashboard/executive/pusat-komando/direktif-strategis/[directiveId]/edit`

- **File:** `src/app/dashboard/executive/pusat-komando/direktif-strategis/[directiveId]/edit/page.tsx`
- **Resource:** `Directive`
- **Page type:** `wizard`
- **Purpose:** Directive builder/revision

**Flow**

1. Load reference data and permitted selectable resources.
2. Persist a draft before advancing beyond the first meaningful step.
3. Validate each step on the client for usability and again on the server for authority.
4. Submit the final immutable version using an explicit action endpoint.
5. Redirect to the canonical detail or tracking route.

**Displayed sections**

- Command identity
- Current version
- Classification
- Target areas
- Recipients
- Tracking
- Derived UUK/STR and tasks

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/directives/{directiveId}` | Detail directive current version | `directive.read` | Query: include=recipients,targets,versions,tracking | DirectiveDetail | Load root, current version and relations under security filter. Classified inaccessible resource returns 404. |
| `GET` | `/directives/{directiveId}/versions` | Riwayat versi directive | `directive.read` | Query: page,limit | Paged<DirectiveVersionSummary> | Order versionNumber desc. Published versions immutable. |
| `PATCH` | `/directive-versions/{versionId}` | Edit versi draft | `directive.update` | {"dueDate?":"ISO","strategicIssue?":"...","commandDescription?":"..."} | DirectiveVersionDetail | Only current version while Directive.status=DRAFT. Use If-Match/updated token; published version 409. |
| `PUT` | `/directive-versions/{versionId}/target-areas` | Ganti target area draft | `directive.update` | {"areaIds":["uuid"],"primaryAreaId":"uuid optional"} | List<AreaSummary> | Validate target areas within issuer scope and no redundant descendants unless intentional. Draft only. |
| `PUT` | `/directive-versions/{versionId}/recipients` | Ganti penerima draft | `directive.update` | {"recipients":[{"targetUnitId":"uuid"},{"targetPositionId":"uuid"}]} | List<DirectiveRecipientResponse> | Validate exactly one target per recipient, clearance, command chain and target area overlap. Draft only; no duplicate target. |
| `POST` | `/directive-versions/{versionId}/publish` | Publish directive | `directive.publish` | {"confirmation":"PUBLISH","note":"string optional"} | DirectiveDetail | Validate mandatory fields, at least one target/recipient, clearance; set status PUBLISHED; freeze version; create audit. Idempotency-Key; cannot unpublish. |
| `POST` | `/directive-versions/{versionId}/distribute` | Distribusikan directive | `directive.distribute` | {"sendNotifications":true,"scheduledAt":"ISO optional"} | DistributionActionResponse | Create/send recipient deliveries, set status DISTRIBUTED; enqueue notifications/read tracking. Only published current version; retry safe via idempotency. |

**Applicable shared forms**

- `F-DIRECTIVE`

**Inherited page rules**

- Prefer merge with directive list as create route; avoid duplicated business logic

**Route notes**

- Prefer redirecting create/edit to the canonical direktif route to avoid duplicate implementations.

#### `/dashboard/executive/pusat-komando/operasi-darurat/[incidentId]`

- **File:** `src/app/dashboard/executive/pusat-komando/operasi-darurat/[incidentId]/page.tsx`
- **Resource:** `EmergencyIncident`
- **Page type:** `detail-action`
- **Purpose:** Emergency incident command detail

**Flow**

1. Load detail, timeline, related records, and available actions.
2. Render actions only from the server-provided capability set.
3. Execute explicit actions and refresh the authoritative detail.

**Displayed sections**

- Situation
- Severity
- Status
- Location map
- Reporter
- Action taken
- Needs
- Timeline
- Attachments

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/emergency-incidents/{incidentId}` | Detail insiden | `emergency.read` | Query: include=attachments,alerts,timeline | EmergencyIncidentDetail | Load scoped incident. Sensitive coordinates only to authorized command. |
| `POST` | `/emergency-incidents/{incidentId}/acknowledge` | Acknowledge insiden | `emergency.manage` | {"note":"string optional"} | EmergencyIncidentDetail | NEW→ACKNOWLEDGED. Authorized command/picket. |
| `POST` | `/emergency-incidents/{incidentId}/verify` | Verifikasi cepat | `emergency.verify` | {"note":"string","verifiedSeverity":"CRITICAL"} | EmergencyIncidentDetail | ACKNOWLEDGED/NEW→VERIFIED; record verifier in audit (schema may add field). Fast verification does not replace later formal report. |
| `POST` | `/emergency-incidents/{incidentId}/start-response` | Mulai penanganan | `emergency.manage` | {"actionPlan":"string optional"} | EmergencyIncidentDetail | VERIFIED/ACKNOWLEDGED→IN_PROGRESS. Notify involved positions. |
| `POST` | `/emergency-incidents/{incidentId}/mark-controlled` | Tandai situasi terkendali | `emergency.manage` | {"note":"string"} | EmergencyIncidentDetail | IN_PROGRESS→CONTROLLED. Reason/note required. |
| `POST` | `/emergency-incidents/{incidentId}/resolve` | Selesaikan insiden | `emergency.manage` | {"resolution":"string","resolvedAt":"ISO optional"} | EmergencyIncidentDetail | CONTROLLED/IN_PROGRESS→RESOLVED; set resolvedAt. Open critical alerts must be resolved/linked. |

**Applicable shared forms**

- `F-EMERGENCY-ACTION`

**Inherited page rules**

- Command chain only
- Critical actions audited

#### `/dashboard/executive/persetujuan-eksekutif/[stepId]`

- **File:** `src/app/dashboard/executive/persetujuan-eksekutif/[stepId]/page.tsx`
- **Resource:** `ProductApprovalStep`
- **Page type:** `detail-action`
- **Purpose:** Executive decision workspace

**Flow**

1. Load detail, timeline, related records, and available actions.
2. Render actions only from the server-provided capability set.
3. Execute explicit actions and refresh the authoritative detail.

**Displayed sections**

- Target product version
- Traceability
- Previous decisions
- Current step
- Deadline
- Decision form

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/approval-steps/{stepId}` | Detail approval step | `approval.read` | Tidak ada body | ApprovalStepDetail | Authorize target occupant, creator chain, prior approvers or executive read. Decision notes redacted if policy. |
| `POST` | `/approval-steps/{stepId}/approve` | Approve step | `approval.decide` | {"note":"string optional","confirmation":"APPROVE"} | ApprovalWorkflowDetail | Lock workflow; verify step ACTIVE and caller occupies targetPosition; persist decision/decider/time; activate next step or complete; update ProductStatus. One decision only; idempotency. |
| `POST` | `/approval-steps/{stepId}/request-revision` | Kembalikan produk untuk revisi | `approval.decide` | {"note":"string","requiredChanges":["..."]} | ApprovalWorkflowDetail | Set step/workflow NEEDS_REVISION; product NEEDS_REVISION; notify OIM; do not mutate version. Note mandatory. |
| `POST` | `/approval-steps/{stepId}/reject` | Tolak produk | `approval.decide` | {"note":"string","confirmation":"REJECT"} | ApprovalWorkflowDetail | Set step REJECTED/workflow CANCELLED or terminal policy; product NEEDS_REVISION/ARCHIVED per rule. Elevated permission; reason mandatory. |
| `POST` | `/approval-steps/{stepId}/request-clarification` | Minta klarifikasi tanpa final decision | `approval.decide` | {"note":"string","dueAt":"ISO optional"} | ApprovalWorkflowDetail | Record decision REQUEST_CLARIFICATION or dedicated event; keep step ACTIVE; notify creator. Schema may need clarification event history to avoid overwriting. |

**Applicable shared forms**

- `F-APPROVAL-DECISION`

**Inherited page rules**

- Only ACTIVE step
- Decision immutable
- Reason required for revision/reject

#### `/dashboard/executive/produk-intelijen/[productId]`

- **File:** `src/app/dashboard/executive/produk-intelijen/[productId]/page.tsx`
- **Resource:** `IntelligenceProduct`
- **Page type:** `detail`
- **Purpose:** Formal product detail

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Product identity
- Type/template
- Current version
- Structured content
- Sources
- Approval workflow
- Distribution

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/products/{productId}` | Detail produk current version | `product.read` | Query: include=versions,sources,approval,distribution,attachments | IntelligenceProductDetail | Load scoped product. Clearance and need-to-know. |
| `GET` | `/products/{productId}/versions` | Riwayat versi produk | `product.read` | Query: page,limit | Paged<ProductVersionSummary> | Order desc. Submitted/approved versions immutable. |
| `GET` | `/products/{productId}/timeline` | Timeline produk | `product.read` | Tidak ada body | TimelineResponse | Merge versions, workflow steps, decisions, distributions, audit. Scoped. |
| `GET` | `/products/{productId}/traceability` | Traceability produk | `product.read` | Tidak ada body | ProductTraceabilityResponse | Graph product→sources→Baket→messages plus approval/distribution. Redacted by access. |

**Applicable shared forms**

- `F-PRODUCT-DISTRIBUTION`

**Inherited page rules**

- Executive normally sees approved/formal products, not raw WhatsApp

#### `/dashboard/executive/produk-intelijen/[productId]/versions/[versionId]`

- **File:** `src/app/dashboard/executive/produk-intelijen/[productId]/versions/[versionId]/page.tsx`
- **Resource:** `IntelligenceProduct`
- **Page type:** `version-detail`
- **Purpose:** Product version

**Flow**

1. Load the exact historical version by path parameter.
2. Render it read-only with change reason, creator, timestamp, and source links.
3. Provide navigation to adjacent versions and the root resource.

**Displayed sections**

- Product identity
- Type/template
- Current version
- Structured content
- Sources
- Approval workflow
- Distribution

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/products/{productId}` | Detail produk current version | `product.read` | Query: include=versions,sources,approval,distribution,attachments | IntelligenceProductDetail | Load scoped product. Clearance and need-to-know. |
| `GET` | `/products/{productId}/versions` | Riwayat versi produk | `product.read` | Query: page,limit | Paged<ProductVersionSummary> | Order desc. Submitted/approved versions immutable. |
| `GET` | `/products/{productId}/timeline` | Timeline produk | `product.read` | Tidak ada body | TimelineResponse | Merge versions, workflow steps, decisions, distributions, audit. Scoped. |
| `GET` | `/products/{productId}/traceability` | Traceability produk | `product.read` | Tidak ada body | ProductTraceabilityResponse | Graph product→sources→Baket→messages plus approval/distribution. Redacted by access. |
| `GET` | `/product-versions/{versionId}` | Detail versi produk | `product.read` | Tidak ada body | ProductVersionDetail | Load exact version and source references. Scoped. |

**Applicable shared forms**

- `F-PRODUCT-DISTRIBUTION`

**Inherited page rules**

- Executive normally sees approved/formal products, not raw WhatsApp

#### `/dashboard/executive/produk-intelijen/[productId]/distribution`

- **File:** `src/app/dashboard/executive/produk-intelijen/[productId]/distribution/page.tsx`
- **Resource:** `IntelligenceProduct`
- **Page type:** `action-page`
- **Purpose:** Controlled distribution

**Flow**

1. Load the resource and available actions.
2. Display a focused form for one explicit business action.
3. Require confirmation/reason where applicable.
4. Execute the action and redirect to the canonical detail.

**Displayed sections**

- Product identity
- Type/template
- Current version
- Structured content
- Sources
- Approval workflow
- Distribution

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/products/{productId}` | Detail produk current version | `product.read` | Query: include=versions,sources,approval,distribution,attachments | IntelligenceProductDetail | Load scoped product. Clearance and need-to-know. |
| `GET` | `/products/{productId}/versions` | Riwayat versi produk | `product.read` | Query: page,limit | Paged<ProductVersionSummary> | Order desc. Submitted/approved versions immutable. |
| `GET` | `/products/{productId}/timeline` | Timeline produk | `product.read` | Tidak ada body | TimelineResponse | Merge versions, workflow steps, decisions, distributions, audit. Scoped. |
| `GET` | `/products/{productId}/traceability` | Traceability produk | `product.read` | Tidak ada body | ProductTraceabilityResponse | Graph product→sources→Baket→messages plus approval/distribution. Redacted by access. |
| `GET` | `/products/{productId}/distribution-summary` | Ringkasan distribusi produk | `distribution.read` | Tidak ada body | DistributionSummaryResponse | Aggregate queued/sent/delivered/read/failed/revoked and recipient categories. Respect visibility. |
| `POST` | `/product-versions/{versionId}/distributions` | Distribusikan produk ke satu atau banyak target | `distribution.create` | {"targets":[{"targetUnitId":"uuid"},{"targetPositionId":"uuid"},{"targetUserProfileId":"uuid"}],"classification":"RAHASIA","message":"string optional"} | 201 List<ProductDistributionDetail> | Validate product APPROVED_EXECUTIVE, exactly-one target each, recipient clearance/need-to-know, no duplicates; create queued rows and enqueue delivery. Executive/authorized distributor; Idempotency-Key. |

**Applicable shared forms**

- `F-PRODUCT-DISTRIBUTION`

**Inherited page rules**

- Executive normally sees approved/formal products, not raw WhatsApp

#### `/dashboard/executive/situasi-nasional/peringatan-dini/[alertId]`

- **File:** `src/app/dashboard/executive/situasi-nasional/peringatan-dini/[alertId]/page.tsx`
- **Resource:** `Alert`
- **Page type:** `detail-action`
- **Purpose:** Alert detail and action

**Flow**

1. Load detail, timeline, related records, and available actions.
2. Render actions only from the server-provided capability set.
3. Execute explicit actions and refresh the authoritative detail.

**Displayed sections**

- Severity
- Status
- Source
- Area/location
- Assigned position
- Timeline
- Resolution

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/alerts/{alertId}` | Detail alert | `alert.read` | Tidak ada body | AlertDetail | Load scoped alert and source summaries. Source detail separate authorization. |
| `POST` | `/alerts/{alertId}/acknowledge` | Acknowledge alert | `alert.execute` | {"note":"string optional"} | AlertDetail | NEW→ACKNOWLEDGED; set acknowledgedAt. Assigned/command position. |
| `POST` | `/alerts/{alertId}/assign` | Assign alert | `alert.assign` | {"positionId":"uuid","note":"string optional"} | AlertDetail | Validate position active and area/branch overlap; set ASSIGNED. Notify occupant. |
| `POST` | `/alerts/{alertId}/start` | Mulai tindak lanjut alert | `alert.execute` | Tidak ada body | AlertDetail | ACKNOWLEDGED/ASSIGNED→IN_PROGRESS. Occupant only. |
| `POST` | `/alerts/{alertId}/resolve` | Selesaikan alert | `alert.execute` | {"resolution":"string"} | AlertDetail | IN_PROGRESS/ACKNOWLEDGED→RESOLVED; set resolvedAt. Resolution mandatory. |

**Applicable shared forms**

- `F-ALERT-ACTION`

**Inherited page rules**

- Executive actions may be restricted to command-level alerts

#### `/dashboard/executive/situasi-strategis/peringatan-dini/[alertId]`

- **File:** `src/app/dashboard/executive/situasi-strategis/peringatan-dini/[alertId]/page.tsx`
- **Resource:** `Alert`
- **Page type:** `detail`
- **Purpose:** Strategic alert history

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Severity
- Status
- Source
- Area/location
- Assigned position
- Timeline
- Resolution

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/alerts/{alertId}` | Detail alert | `alert.read` | Tidak ada body | AlertDetail | Load scoped alert and source summaries. Source detail separate authorization. |
| `POST` | `/alerts/{alertId}/acknowledge` | Acknowledge alert | `alert.execute` | {"note":"string optional"} | AlertDetail | NEW→ACKNOWLEDGED; set acknowledgedAt. Assigned/command position. |
| `POST` | `/alerts/{alertId}/assign` | Assign alert | `alert.assign` | {"positionId":"uuid","note":"string optional"} | AlertDetail | Validate position active and area/branch overlap; set ASSIGNED. Notify occupant. |
| `POST` | `/alerts/{alertId}/start` | Mulai tindak lanjut alert | `alert.execute` | Tidak ada body | AlertDetail | ACKNOWLEDGED/ASSIGNED→IN_PROGRESS. Occupant only. |
| `POST` | `/alerts/{alertId}/resolve` | Selesaikan alert | `alert.execute` | {"resolution":"string"} | AlertDetail | IN_PROGRESS/ACKNOWLEDGED→RESOLVED; set resolvedAt. Resolution mandatory. |

**Inherited page rules**

- Recommended shared component with national warning page using strategic preset

### 5.4 Regional Commander

#### `/dashboard/regional-commander/direktif-penjabaran-uuk-str/baru`

- **File:** `src/app/dashboard/regional-commander/direktif-penjabaran-uuk-str/baru/page.tsx`
- **Resource:** `UukStr`
- **Page type:** `create`
- **Purpose:** Create UUK/STR from directive version

**Flow**

1. Load reference data and eligible relationships.
2. Validate the form locally and on the server.
3. Create the resource or draft in one transaction.
4. Redirect to the canonical detail/edit route returned by the API.

**Displayed sections**

- Directive source
- Current version
- Mandatory sections
- Items
- Status
- Task references

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/directives` | Daftar direktif | `directive.read` | Query: page,limit,status,ownerUnitId,areaId,classification,from,to,search,assignedToMe | Paged<DirectiveSummary> | Join current version; apply recipient/unit/position, org/area scope and clearance filters. Only current version fields in summary. |
| `POST` | `/uuk-strs` | Buat UUK/STR versi awal | `uuk.create` | {"directiveVersionId":"uuid","ownerUnitId":"uuid","title":"...","sections":[{"sectionType":"BASIS_BACKGROUND","title":"...","items":[{"itemCode":"1","content":"...","orderNumber":1}]}]} | 201 UukStrDetail | Create root/version1/9 sections/items transactionally; validate directive current/published as policy. All mandatory section types required before publish. |

**Applicable shared forms**

- `F-UUK-STR`

**Inherited page rules**

- Mandatory sections before publish
- Published version immutable

#### `/dashboard/regional-commander/direktif-penjabaran-uuk-str/[uukStrId]`

- **File:** `src/app/dashboard/regional-commander/direktif-penjabaran-uuk-str/[uukStrId]/page.tsx`
- **Resource:** `UukStr`
- **Page type:** `detail`
- **Purpose:** UUK/STR current version

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Directive source
- Current version
- Mandatory sections
- Items
- Status
- Task references

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/uuk-strs/{uukStrId}` | Detail UUK/STR | `uuk.read` | Query: include=versions,sections,tasks | UukStrDetail | Load current version and scoped relations. No access beyond directive scope. |
| `GET` | `/uuk-strs/{uukStrId}/versions` | Riwayat versi UUK/STR | `uuk.read` | Query: page,limit | Paged<UukStrVersionSummary> | Order version desc. Immutable after publish. |

**Applicable shared forms**

- `F-UUK-STR`

**Inherited page rules**

- Mandatory sections before publish
- Published version immutable

#### `/dashboard/regional-commander/direktif-penjabaran-uuk-str/[uukStrId]/edit`

- **File:** `src/app/dashboard/regional-commander/direktif-penjabaran-uuk-str/[uukStrId]/edit/page.tsx`
- **Resource:** `UukStr`
- **Page type:** `wizard`
- **Purpose:** Edit draft/create revision

**Flow**

1. Load reference data and permitted selectable resources.
2. Persist a draft before advancing beyond the first meaningful step.
3. Validate each step on the client for usability and again on the server for authority.
4. Submit the final immutable version using an explicit action endpoint.
5. Redirect to the canonical detail or tracking route.

**Displayed sections**

- Directive source
- Current version
- Mandatory sections
- Items
- Status
- Task references

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/uuk-strs/{uukStrId}` | Detail UUK/STR | `uuk.read` | Query: include=versions,sections,tasks | UukStrDetail | Load current version and scoped relations. No access beyond directive scope. |
| `GET` | `/uuk-strs/{uukStrId}/versions` | Riwayat versi UUK/STR | `uuk.read` | Query: page,limit | Paged<UukStrVersionSummary> | Order version desc. Immutable after publish. |
| `PATCH` | `/uuk-str-versions/{versionId}` | Edit judul versi draft | `uuk.update` | {"title":"...","changeReason?":"..."} | UukStrVersionDetail | Current DRAFT only. Sections use dedicated PUT. |
| `PUT` | `/uuk-str-versions/{versionId}/sections` | Ganti seluruh section draft | `uuk.update` | {"sections":[{"sectionType":"...","title":"...","orderNumber":1,"items":[...]}]} | UukStrVersionDetail | Validate unique sectionType/order and required nine sections. Atomic replace; draft only. |
| `POST` | `/uuk-str-versions/{versionId}/publish` | Publish UUK/STR | `uuk.publish` | {"confirmation":"PUBLISH"} | UukStrDetail | Validate completeness; set status PUBLISHED; freeze version; notify relevant chain. Idempotency-Key. |

**Applicable shared forms**

- `F-UUK-STR`

**Inherited page rules**

- Mandatory sections before publish
- Published version immutable

#### `/dashboard/regional-commander/direktif-penjabaran-uuk-str/[uukStrId]/versions/[versionId]`

- **File:** `src/app/dashboard/regional-commander/direktif-penjabaran-uuk-str/[uukStrId]/versions/[versionId]/page.tsx`
- **Resource:** `UukStr`
- **Page type:** `version-detail`
- **Purpose:** Immutable version

**Flow**

1. Load the exact historical version by path parameter.
2. Render it read-only with change reason, creator, timestamp, and source links.
3. Provide navigation to adjacent versions and the root resource.

**Displayed sections**

- Directive source
- Current version
- Mandatory sections
- Items
- Status
- Task references

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/uuk-strs/{uukStrId}` | Detail UUK/STR | `uuk.read` | Query: include=versions,sections,tasks | UukStrDetail | Load current version and scoped relations. No access beyond directive scope. |
| `GET` | `/uuk-strs/{uukStrId}/versions` | Riwayat versi UUK/STR | `uuk.read` | Query: page,limit | Paged<UukStrVersionSummary> | Order version desc. Immutable after publish. |
| `GET` | `/uuk-str-versions/{versionId}` | Detail versi UUK/STR | `uuk.read` | Tidak ada body | UukStrVersionDetail | Load exact version with ordered sections/items. Scoped. |

**Applicable shared forms**

- `F-UUK-STR`

**Inherited page rules**

- Mandatory sections before publish
- Published version immutable

#### `/dashboard/regional-commander/jawaban-lapangan/[baketId]`

- **File:** `src/app/dashboard/regional-commander/jawaban-lapangan/[baketId]/page.tsx`
- **Resource:** `Baket`
- **Page type:** `detail`
- **Purpose:** Field answer summary and traceability

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Current version
- 5W+1H content
- Event time/location
- Sources
- Attachments
- Coverage checks
- Timeline
- Revision requests

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/bakets/{baketId}` | Detail Baket current version | `baket.read` | Query: include=versions,sources,attachments,revisionRequests,verification | BaketDetail | Load root/current version/traceability under access context. Verified data read-only for lower unit. |
| `GET` | `/bakets/{baketId}/timeline` | Timeline Baket | `baket.read` | Tidak ada body | TimelineResponse | Merge versions, status events, revision requests, verification, audit events sorted time. Field-level redaction. |
| `GET` | `/bakets/{baketId}/traceability` | Traceability sumber-ke-produk | `baket.read` | Tidak ada body | BaketTraceabilityResponse | Graph source messages→versions→verification→analysis→products→approvals/distributions. Only nodes caller can access; report redacted node counts if policy allows. |

**Inherited page rules**

- Do not expose raw WhatsApp unless specifically authorized

#### `/dashboard/regional-commander/monitoring-tugas/[taskId]`

- **File:** `src/app/dashboard/regional-commander/monitoring-tugas/[taskId]/page.tsx`
- **Resource:** `Task`
- **Page type:** `detail`
- **Purpose:** Task detail and progress

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Task identity
- Directive/UUK source
- Target areas
- Priority
- Due date
- Assignments
- Progress
- Outputs

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/tasks/{taskId}` | Detail tugas | `task.read` | Query: include=assignments,targetAreas,attachments,parent,children | TaskDetail | Load scoped task and relations. Classified 404 masking. |
| `GET` | `/tasks/{taskId}/assignments` | Daftar assignment tugas | `task.read` | Query: status?,page,limit | Paged<TaskAssignmentDetail> | Query by taskId with scoped visibility. Managers see subordinates; assignee sees own. |
| `GET` | `/tasks/{taskId}/progress-summary` | Ringkasan progress | `task.read` | Query: groupBy=unit\|area\|position | TaskProgressSummaryResponse | Aggregate assignment statuses, overdue, latest progress by group. Same security filter as task list. |

**Inherited page rules**

- Regional Commander monitors; OIM/Field Coordinator executes assignment

#### `/dashboard/regional-commander/monitoring-tugas/[taskId]/cascade`

- **File:** `src/app/dashboard/regional-commander/monitoring-tugas/[taskId]/cascade/page.tsx`
- **Resource:** `Task`
- **Page type:** `tree-detail`
- **Purpose:** Task cascade

**Flow**

1. Load the selected root task and its full cascade.
2. Display parent/child assignments, progress, due dates, and outputs.
3. Navigate to canonical task or Baket details.

**Displayed sections**

- Task identity
- Directive/UUK source
- Target areas
- Priority
- Due date
- Assignments
- Progress
- Outputs

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/tasks/{taskId}` | Detail tugas | `task.read` | Query: include=assignments,targetAreas,attachments,parent,children | TaskDetail | Load scoped task and relations. Classified 404 masking. |
| `GET` | `/tasks/{taskId}/assignments` | Daftar assignment tugas | `task.read` | Query: status?,page,limit | Paged<TaskAssignmentDetail> | Query by taskId with scoped visibility. Managers see subordinates; assignee sees own. |
| `GET` | `/tasks/{taskId}/progress-summary` | Ringkasan progress | `task.read` | Query: groupBy=unit\|area\|position | TaskProgressSummaryResponse | Aggregate assignment statuses, overdue, latest progress by group. Same security filter as task list. |
| `GET` | `/tasks/{taskId}/cascade` | Visualisasi cascade tugas | `task.read` | Query: includeAssignments=true,maxDepth=10 | TaskCascadeResponse | Recursive CTE task hierarchy plus assignments. Scoped and depth-capped. |

**Inherited page rules**

- Regional Commander monitors; OIM/Field Coordinator executes assignment

#### `/dashboard/regional-commander/persetujuan-regional/[stepId]`

- **File:** `src/app/dashboard/regional-commander/persetujuan-regional/[stepId]/page.tsx`
- **Resource:** `ProductApprovalStep`
- **Page type:** `detail-action`
- **Purpose:** Regional decision workspace

**Flow**

1. Load detail, timeline, related records, and available actions.
2. Render actions only from the server-provided capability set.
3. Execute explicit actions and refresh the authoritative detail.

**Displayed sections**

- Target product version
- Traceability
- Previous decisions
- Current step
- Deadline
- Decision form

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/approval-steps/{stepId}` | Detail approval step | `approval.read` | Tidak ada body | ApprovalStepDetail | Authorize target occupant, creator chain, prior approvers or executive read. Decision notes redacted if policy. |
| `POST` | `/approval-steps/{stepId}/approve` | Approve step | `approval.decide` | {"note":"string optional","confirmation":"APPROVE"} | ApprovalWorkflowDetail | Lock workflow; verify step ACTIVE and caller occupies targetPosition; persist decision/decider/time; activate next step or complete; update ProductStatus. One decision only; idempotency. |
| `POST` | `/approval-steps/{stepId}/request-revision` | Kembalikan produk untuk revisi | `approval.decide` | {"note":"string","requiredChanges":["..."]} | ApprovalWorkflowDetail | Set step/workflow NEEDS_REVISION; product NEEDS_REVISION; notify OIM; do not mutate version. Note mandatory. |
| `POST` | `/approval-steps/{stepId}/reject` | Tolak produk | `approval.decide` | {"note":"string","confirmation":"REJECT"} | ApprovalWorkflowDetail | Set step REJECTED/workflow CANCELLED or terminal policy; product NEEDS_REVISION/ARCHIVED per rule. Elevated permission; reason mandatory. |
| `POST` | `/approval-steps/{stepId}/request-clarification` | Minta klarifikasi tanpa final decision | `approval.decide` | {"note":"string","dueAt":"ISO optional"} | ApprovalWorkflowDetail | Record decision REQUEST_CLARIFICATION or dedicated event; keep step ACTIVE; notify creator. Schema may need clarification event history to avoid overwriting. |

**Applicable shared forms**

- `F-APPROVAL-DECISION`

**Inherited page rules**

- Target position must match DIREKTUR_WILAYAH or KABINDA snapshot

#### `/dashboard/regional-commander/laporan-intelijen/analisis/[caseId]`

- **File:** `src/app/dashboard/regional-commander/laporan-intelijen/analisis/[caseId]/page.tsx`
- **Resource:** `AnalysisCase / Verification`
- **Page type:** `detail`
- **Purpose:** Validated analysis

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Case metadata
- Verified sources
- Current version
- Entities
- Relationships
- Graph
- Traceability

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/analysis-cases/{caseId}` | Detail analysis case | `analysis.read` | Query: include=sources,versions,graphSummary | AnalysisCaseDetail | Load scoped case. Clearance from highest source classification. |
| `GET` | `/analysis-cases/{caseId}/versions` | Riwayat analysis versions | `analysis.read` | Query: page,limit | Paged<AnalysisVersionSummary> | Order version desc. Validated versions immutable. |
| `GET` | `/analysis-cases/{caseId}/traceability` | Traceability analysis | `analysis.read` | Tidak ada body | AnalysisTraceabilityResponse | Return verification→Baket→messages and downstream product links. Redact inaccessible source nodes. |

**Inherited page rules**

- Source identities masked by need-to-know

#### `/dashboard/regional-commander/laporan-intelijen/verifikasi/[verificationId]`

- **File:** `src/app/dashboard/regional-commander/laporan-intelijen/verifikasi/[verificationId]/page.tsx`
- **Resource:** `AnalysisCase / Verification`
- **Page type:** `detail`
- **Purpose:** Verification summary

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Case metadata
- Verified sources
- Current version
- Entities
- Relationships
- Graph
- Traceability

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/verifications/{verificationId}` | Detail verification | `verification.read` | Query: include=checks,crossReferences,baket | VerificationDetail | Load scoped verification. Source identity redaction as needed. |
| `GET` | `/verifications/{verificationId}/score` | Ringkasan Neraca Penilaian | `verification.read` | Tidak ada body | VerificationScoreResponse | Return A-F,1-6, matrix label and interpretation from controlled reference mapping. Interpretation is descriptive, not auto intelligence conclusion. |

**Inherited page rules**

- Source identities masked by need-to-know

#### `/dashboard/regional-commander/laporan-produk-intelijen/[productId]`

- **File:** `src/app/dashboard/regional-commander/laporan-produk-intelijen/[productId]/page.tsx`
- **Resource:** `IntelligenceProduct`
- **Page type:** `detail`
- **Purpose:** Regional formal product

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Product identity
- Type/template
- Current version
- Structured content
- Sources
- Approval workflow
- Distribution

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/products/{productId}` | Detail produk current version | `product.read` | Query: include=versions,sources,approval,distribution,attachments | IntelligenceProductDetail | Load scoped product. Clearance and need-to-know. |
| `GET` | `/products/{productId}/versions` | Riwayat versi produk | `product.read` | Query: page,limit | Paged<ProductVersionSummary> | Order desc. Submitted/approved versions immutable. |
| `GET` | `/products/{productId}/timeline` | Timeline produk | `product.read` | Tidak ada body | TimelineResponse | Merge versions, workflow steps, decisions, distributions, audit. Scoped. |
| `GET` | `/products/{productId}/traceability` | Traceability produk | `product.read` | Tidak ada body | ProductTraceabilityResponse | Graph product→sources→Baket→messages plus approval/distribution. Redacted by access. |

**Inherited page rules**

- Formal products only

#### `/dashboard/regional-commander/laporan-produk-intelijen/[productId]/versions/[versionId]`

- **File:** `src/app/dashboard/regional-commander/laporan-produk-intelijen/[productId]/versions/[versionId]/page.tsx`
- **Resource:** `IntelligenceProduct`
- **Page type:** `version-detail`
- **Purpose:** Product version

**Flow**

1. Load the exact historical version by path parameter.
2. Render it read-only with change reason, creator, timestamp, and source links.
3. Provide navigation to adjacent versions and the root resource.

**Displayed sections**

- Product identity
- Type/template
- Current version
- Structured content
- Sources
- Approval workflow
- Distribution

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/products/{productId}` | Detail produk current version | `product.read` | Query: include=versions,sources,approval,distribution,attachments | IntelligenceProductDetail | Load scoped product. Clearance and need-to-know. |
| `GET` | `/products/{productId}/versions` | Riwayat versi produk | `product.read` | Query: page,limit | Paged<ProductVersionSummary> | Order desc. Submitted/approved versions immutable. |
| `GET` | `/products/{productId}/timeline` | Timeline produk | `product.read` | Tidak ada body | TimelineResponse | Merge versions, workflow steps, decisions, distributions, audit. Scoped. |
| `GET` | `/products/{productId}/traceability` | Traceability produk | `product.read` | Tidak ada body | ProductTraceabilityResponse | Graph product→sources→Baket→messages plus approval/distribution. Redacted by access. |
| `GET` | `/product-versions/{versionId}` | Detail versi produk | `product.read` | Tidak ada body | ProductVersionDetail | Load exact version and source references. Scoped. |

**Inherited page rules**

- Formal products only

#### `/dashboard/regional-commander/personel-jaring/personel/[assignmentId]`

- **File:** `src/app/dashboard/regional-commander/personel-jaring/personel/[assignmentId]/page.tsx`
- **Resource:** `PositionAssignment / Jaring`
- **Page type:** `detail`
- **Purpose:** Personnel assignment and workload

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Seat identity
- Role
- Organization unit
- Reports-to
- Current occupant
- Subordinates
- Area policy

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/position-assignments/{assignmentId}` | Detail assignment | `assignment.read` | Query: include=areaScopes,user,position | PositionAssignmentDetail | Load scoped assignment. 404 if inaccessible. |
| `GET` | `/position-assignments/{assignmentId}/area-scopes` | Ambil scope assignment | `area.scope.read` | Query: activeOnly=true,expand=false | List<PositionAreaScopeResponse> | Read scopes and optional descendants. No out-of-scope leakage. |
| `GET` | `/personnel-location-pings/{assignmentId}/latest` | Lokasi terbaru bawahan | `location.read` | Tidak ada body | PersonnelLocationPingResponse | Verify direct command chain, permission, retention and stealth policy; latest index query. Every access audited. |
| `GET` | `/personnel-location-pings/{assignmentId}/history` | Riwayat lokasi bawahan | `location.read-history` | Query: from,to,cursor,limit<=1000 | CursorPage<PersonnelLocationPingResponse> | Range query by assignment/capturedAt. Strict purpose/reason header may be required; retention cap. |

**Inherited page rules**

- Regional aggregated view

#### `/dashboard/regional-commander/personel-jaring/jaring/[jaringId]`

- **File:** `src/app/dashboard/regional-commander/personel-jaring/jaring/[jaringId]/page.tsx`
- **Resource:** `PositionAssignment / Jaring`
- **Page type:** `detail`
- **Purpose:** Jaring summary and caretaker history

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Seat identity
- Role
- Organization unit
- Reports-to
- Current occupant
- Subordinates
- Area policy

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/jaring/{jaringId}` | Detail Jaring | `jaring.read` | Query: include=caretakers,coverages,stats | JaringDetail | Scoped by caretaker/command chain/area. Sensitive identity redacted based on permission. |
| `GET` | `/jaring/{jaringId}/area-coverages` | Coverage Jaring | `jaring.read` | Query: activeOnly=true,expand=false | List<JaringAreaCoverageResponse> | Read coverages. Sensitive scope visibility restricted. |
| `GET` | `/jaring/{jaringId}/caretakers` | Riwayat caretaker | `jaring.read` | Query: activeOnly=false | List<JaringCaretakerAssignmentResponse> | Order validFrom desc. Scoped. |
| `GET` | `/jaring/{jaringId}/messages` | Pesan WhatsApp milik Jaring | `whatsapp.read` | Query: cursor,limit,status,from,to | CursorPage<WhatsAppMessageSummary> | Filter jaringId and scope; order receivedAt desc. Raw payload not included. |
| `GET` | `/jaring/{jaringId}/bakets` | Baket terkait Jaring | `baket.read` | Query: page,limit,status | Paged<BaketSummary> | Query primaryJaringId or source messages linked to Jaring. Need-to-know applies. |

**Inherited page rules**

- Regional aggregated view

#### `/dashboard/regional-commander/peta-peringatan-dini/alert/[alertId]`

- **File:** `src/app/dashboard/regional-commander/peta-peringatan-dini/alert/[alertId]/page.tsx`
- **Resource:** `Alert / EmergencyIncident`
- **Page type:** `detail-action`
- **Purpose:** Deep-link alert from map

**Flow**

1. Load detail, timeline, related records, and available actions.
2. Render actions only from the server-provided capability set.
3. Execute explicit actions and refresh the authoritative detail.

**Displayed sections**

- Situation
- Severity
- Status
- Location map
- Reporter
- Action taken
- Needs
- Timeline
- Attachments

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/alerts/{alertId}` | Detail alert | `alert.read` | Tidak ada body | AlertDetail | Load scoped alert and source summaries. Source detail separate authorization. |
| `POST` | `/alerts/{alertId}/acknowledge` | Acknowledge alert | `alert.execute` | {"note":"string optional"} | AlertDetail | NEW→ACKNOWLEDGED; set acknowledgedAt. Assigned/command position. |
| `POST` | `/alerts/{alertId}/assign` | Assign alert | `alert.assign` | {"positionId":"uuid","note":"string optional"} | AlertDetail | Validate position active and area/branch overlap; set ASSIGNED. Notify occupant. |
| `POST` | `/alerts/{alertId}/start` | Mulai tindak lanjut alert | `alert.execute` | Tidak ada body | AlertDetail | ACKNOWLEDGED/ASSIGNED→IN_PROGRESS. Occupant only. |
| `POST` | `/alerts/{alertId}/resolve` | Selesaikan alert | `alert.execute` | {"resolution":"string"} | AlertDetail | IN_PROGRESS/ACKNOWLEDGED→RESOLVED; set resolvedAt. Resolution mandatory. |

**Applicable shared forms**

- `F-ALERT-ACTION`

**Inherited page rules**

- Current alert/emergency list may be client-transformed; dedicated map endpoints are optional

**Route notes**

- Map may open a drawer first, but the canonical detail URL must remain available.

#### `/dashboard/regional-commander/peta-peringatan-dini/darurat/[incidentId]`

- **File:** `src/app/dashboard/regional-commander/peta-peringatan-dini/darurat/[incidentId]/page.tsx`
- **Resource:** `Alert / EmergencyIncident`
- **Page type:** `detail-action`
- **Purpose:** Deep-link emergency from map

**Flow**

1. Load detail, timeline, related records, and available actions.
2. Render actions only from the server-provided capability set.
3. Execute explicit actions and refresh the authoritative detail.

**Displayed sections**

- Situation
- Severity
- Status
- Location map
- Reporter
- Action taken
- Needs
- Timeline
- Attachments

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/emergency-incidents/{incidentId}` | Detail insiden | `emergency.read` | Query: include=attachments,alerts,timeline | EmergencyIncidentDetail | Load scoped incident. Sensitive coordinates only to authorized command. |
| `POST` | `/emergency-incidents/{incidentId}/acknowledge` | Acknowledge insiden | `emergency.manage` | {"note":"string optional"} | EmergencyIncidentDetail | NEW→ACKNOWLEDGED. Authorized command/picket. |
| `POST` | `/emergency-incidents/{incidentId}/verify` | Verifikasi cepat | `emergency.verify` | {"note":"string","verifiedSeverity":"CRITICAL"} | EmergencyIncidentDetail | ACKNOWLEDGED/NEW→VERIFIED; record verifier in audit (schema may add field). Fast verification does not replace later formal report. |
| `POST` | `/emergency-incidents/{incidentId}/start-response` | Mulai penanganan | `emergency.manage` | {"actionPlan":"string optional"} | EmergencyIncidentDetail | VERIFIED/ACKNOWLEDGED→IN_PROGRESS. Notify involved positions. |
| `POST` | `/emergency-incidents/{incidentId}/mark-controlled` | Tandai situasi terkendali | `emergency.manage` | {"note":"string"} | EmergencyIncidentDetail | IN_PROGRESS→CONTROLLED. Reason/note required. |
| `POST` | `/emergency-incidents/{incidentId}/resolve` | Selesaikan insiden | `emergency.manage` | {"resolution":"string","resolvedAt":"ISO optional"} | EmergencyIncidentDetail | CONTROLLED/IN_PROGRESS→RESOLVED; set resolvedAt. Open critical alerts must be resolved/linked. |

**Applicable shared forms**

- `F-ALERT-ACTION`

**Inherited page rules**

- Current alert/emergency list may be client-transformed; dedicated map endpoints are optional

**Route notes**

- Map may open a drawer first, but the canonical detail URL must remain available.

### 5.5 Operational Intelligence Manager

#### `/dashboard/oim/laporan-masuk/[baketId]`

- **File:** `src/app/dashboard/oim/laporan-masuk/[baketId]/page.tsx`
- **Resource:** `Baket`
- **Page type:** `detail`
- **Purpose:** Incoming Baket detail and traceability

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Current version
- 5W+1H content
- Event time/location
- Sources
- Attachments
- Coverage checks
- Timeline
- Revision requests

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/bakets/{baketId}` | Detail Baket current version | `baket.read` | Query: include=versions,sources,attachments,revisionRequests,verification | BaketDetail | Load root/current version/traceability under access context. Verified data read-only for lower unit. |
| `GET` | `/bakets/{baketId}/timeline` | Timeline Baket | `baket.read` | Tidak ada body | TimelineResponse | Merge versions, status events, revision requests, verification, audit events sorted time. Field-level redaction. |
| `GET` | `/bakets/{baketId}/traceability` | Traceability sumber-ke-produk | `baket.read` | Tidak ada body | BaketTraceabilityResponse | Graph source messages→versions→verification→analysis→products→approvals/distributions. Only nodes caller can access; report redacted node counts if policy allows. |

**Applicable shared forms**

- `F-VERIFICATION-CREATE`

**Inherited page rules**

- This page receives Baket, not raw WhatsApp

#### `/dashboard/oim/laporan-masuk/[baketId]/versions/[versionId]`

- **File:** `src/app/dashboard/oim/laporan-masuk/[baketId]/versions/[versionId]/page.tsx`
- **Resource:** `Baket`
- **Page type:** `version-detail`
- **Purpose:** Baket version

**Flow**

1. Load the exact historical version by path parameter.
2. Render it read-only with change reason, creator, timestamp, and source links.
3. Provide navigation to adjacent versions and the root resource.

**Displayed sections**

- Current version
- 5W+1H content
- Event time/location
- Sources
- Attachments
- Coverage checks
- Timeline
- Revision requests

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/bakets/{baketId}` | Detail Baket current version | `baket.read` | Query: include=versions,sources,attachments,revisionRequests,verification | BaketDetail | Load root/current version/traceability under access context. Verified data read-only for lower unit. |
| `GET` | `/bakets/{baketId}/timeline` | Timeline Baket | `baket.read` | Tidak ada body | TimelineResponse | Merge versions, status events, revision requests, verification, audit events sorted time. Field-level redaction. |
| `GET` | `/bakets/{baketId}/traceability` | Traceability sumber-ke-produk | `baket.read` | Tidak ada body | BaketTraceabilityResponse | Graph source messages→versions→verification→analysis→products→approvals/distributions. Only nodes caller can access; report redacted node counts if policy allows. |
| `GET` | `/baket-versions/{versionId}` | Detail versi Baket | `baket.read` | Tidak ada body | BaketVersionDetail | Read exact snapshot with area breadcrumb. Scoped. |

**Applicable shared forms**

- `F-VERIFICATION-CREATE`

**Inherited page rules**

- This page receives Baket, not raw WhatsApp

#### `/dashboard/oim/verifikasi-neraca-penilaian/[verificationId]`

- **File:** `src/app/dashboard/oim/verifikasi-neraca-penilaian/[verificationId]/page.tsx`
- **Resource:** `BaketVerification`
- **Page type:** `workflow`
- **Purpose:** Checklist, cross-reference, A-F / 1-6, decision

**Flow**

1. Load the workflow record and related immutable source version.
2. Render checklist, evidence, scoring, timeline, and available actions.
3. Validate preconditions and require reasons for negative decisions.
4. Execute the action in a transaction and refresh all dependent queues.

**Displayed sections**

- Current version
- 5W+1H content
- Event time/location
- Sources
- Attachments
- Coverage checks
- Timeline
- Revision requests

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/verifications/{verificationId}` | Detail verification | `verification.read` | Query: include=checks,crossReferences,baket | VerificationDetail | Load scoped verification. Source identity redaction as needed. |
| `GET` | `/verifications/{verificationId}/score` | Ringkasan Neraca Penilaian | `verification.read` | Tidak ada body | VerificationScoreResponse | Return A-F,1-6, matrix label and interpretation from controlled reference mapping. Interpretation is descriptive, not auto intelligence conclusion. |
| `POST` | `/verifications/{verificationId}/start` | Mulai verification | `verification.update` | Tidak ada body | VerificationDetail | DRAFT→IN_PROGRESS; startedAt if absent. Verifier assignment only or delegated OIM. |
| `PATCH` | `/verifications/{verificationId}` | Edit draft/in-progress verification | `verification.update` | {"sourceReliability?":"A","informationCredibility?":"ONE","summary?":"..."} | VerificationDetail | Update score/summary only before completed. A-F/1-6 only OIM. |
| `PUT` | `/verifications/{verificationId}/checks` | Ganti verification checklist | `verification.update` | {"checks":[{"code":"SOURCE_IDENTITY","label":"...","status":"PASS","note":"..."}]} | List<VerificationCheckResponse> | Validate required check codes; atomic upsert/replace. IN_PROGRESS only. |
| `PUT` | `/verifications/{verificationId}/cross-references` | Ganti cross references | `verification.update` | {"references":[{"relatedBaketId":"uuid optional","externalRef":"string optional","description":"..."}]} | List<VerificationCrossReferenceResponse> | Each item requires relatedBaketId or externalRef; validate access. IN_PROGRESS only. |
| `POST` | `/verifications/{verificationId}/complete` | Selesaikan verification valid | `verification.complete` | {"decision":"VERIFIED","summary":"..."} | VerificationDetail | Validate all mandatory checks, sourceReliability and informationCredibility; set VERIFIED/completedAt; Baket VERIFIED; notify/create analysis eligibility. Immutable after complete; idempotency. |
| `POST` | `/verifications/{verificationId}/needs-development` | Kembalikan untuk pengembangan | `verification.complete` | {"reason":"...","requiredInformation":"...","dueDate":"ISO optional"} | VerificationDetail | Set NEEDS_DEVELOPMENT/completedAt; create BaketRevisionRequest; set Baket NEEDS_DEVELOPMENT; notify Field Officer. Transactional. |
| `POST` | `/verifications/{verificationId}/reject` | Tolak Baket | `verification.complete` | {"reason":"string"} | VerificationDetail | Set REJECTED/completedAt and Baket REJECTED. Requires explicit reason and elevated permission. |

**Applicable shared forms**

- `F-VERIFICATION`

**Inherited page rules**

- Only OIM assigns A-F/1-6
- One canonical verification per BaketVersion

#### `/dashboard/oim/analisis-intelijen/baru`

- **File:** `src/app/dashboard/oim/analisis-intelijen/baru/page.tsx`
- **Resource:** `AnalysisCase`
- **Page type:** `create`
- **Purpose:** Create analysis case

**Flow**

1. Load reference data and eligible relationships.
2. Validate the form locally and on the server.
3. Create the resource or draft in one transaction.
4. Redirect to the canonical detail/edit route returned by the API.

**Displayed sections**

- Case metadata
- Verified sources
- Current version
- Entities
- Relationships
- Graph
- Traceability

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/verifications` | Daftar verification | `verification.read` | Query: page,limit,status,verifiedByAssignmentId,baketId,areaId,from,to,reliability,credibility | Paged<VerificationSummary> | Join BaketVersion/Baket current context; OIM branch/area scope. Only OIM and authorized leaders. |
| `POST` | `/analysis-cases` | Buat analysis case | `analysis.create` | {"ownerUnitId":"uuid","title":"...","periodStart":"ISO optional","periodEnd":"ISO optional","verificationIds":["uuid"]} | 201 AnalysisCaseDetail | Validate all verifications VERIFIED and accessible; create case/version1 optional. At least one source recommended/required by policy. |

**Applicable shared forms**

- `F-ANALYSIS-CASE`
- `F-ANALYSIS-VERSION`

**Inherited page rules**

- Sources must be VERIFIED
- AI draft requires human validation

#### `/dashboard/oim/analisis-intelijen/[caseId]`

- **File:** `src/app/dashboard/oim/analisis-intelijen/[caseId]/page.tsx`
- **Resource:** `AnalysisCase`
- **Page type:** `detail`
- **Purpose:** Analysis case and traceability

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Case metadata
- Verified sources
- Current version
- Entities
- Relationships
- Graph
- Traceability

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/analysis-cases/{caseId}` | Detail analysis case | `analysis.read` | Query: include=sources,versions,graphSummary | AnalysisCaseDetail | Load scoped case. Clearance from highest source classification. |
| `GET` | `/analysis-cases/{caseId}/versions` | Riwayat analysis versions | `analysis.read` | Query: page,limit | Paged<AnalysisVersionSummary> | Order version desc. Validated versions immutable. |
| `GET` | `/analysis-cases/{caseId}/traceability` | Traceability analysis | `analysis.read` | Tidak ada body | AnalysisTraceabilityResponse | Return verification→Baket→messages and downstream product links. Redact inaccessible source nodes. |

**Applicable shared forms**

- `F-ANALYSIS-CASE`
- `F-ANALYSIS-VERSION`

**Inherited page rules**

- Sources must be VERIFIED
- AI draft requires human validation

#### `/dashboard/oim/analisis-intelijen/[caseId]/edit`

- **File:** `src/app/dashboard/oim/analisis-intelijen/[caseId]/edit/page.tsx`
- **Resource:** `AnalysisCase`
- **Page type:** `workspace`
- **Purpose:** Edit current draft version

**Flow**

1. Load the root resource, active version, traceability, and permitted sources.
2. Keep editable content separate from immutable historical versions.
3. Persist draft changes through version-specific endpoints.
4. Validate or finalize using explicit action endpoints.

**Displayed sections**

- Case metadata
- Verified sources
- Current version
- Entities
- Relationships
- Graph
- Traceability

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/analysis-cases/{caseId}` | Detail analysis case | `analysis.read` | Query: include=sources,versions,graphSummary | AnalysisCaseDetail | Load scoped case. Clearance from highest source classification. |
| `GET` | `/analysis-cases/{caseId}/versions` | Riwayat analysis versions | `analysis.read` | Query: page,limit | Paged<AnalysisVersionSummary> | Order version desc. Validated versions immutable. |
| `GET` | `/analysis-cases/{caseId}/traceability` | Traceability analysis | `analysis.read` | Tidak ada body | AnalysisTraceabilityResponse | Return verification→Baket→messages and downstream product links. Redact inaccessible source nodes. |
| `PATCH` | `/analysis-versions/{versionId}` | Edit versi analisis belum tervalidasi | `analysis.update` | {"indications?":"...","analysis?":"...","impact?":"...","efforts?":"...","recommendations?":"...","aiDraft?":{}} | AnalysisVersionDetail | Only current unvalidated version. validatedAt not patchable. |
| `PUT` | `/analysis-versions/{versionId}/entities` | Ganti entities | `analysis.update` | {"entities":[{"clientKey":"e1","entityType":"PERSON","name":"...","normalizedName":"...","metadata":{}}]} | List<AnalysisEntityResponse> | Atomic replace/upsert with client keys for relationship mapping. Unvalidated version only. |
| `PUT` | `/analysis-versions/{versionId}/relationships` | Ganti relationships | `analysis.update` | {"relationships":[{"fromEntityId":"uuid","toEntityId":"uuid","relationshipType":"...","description":"...","confidence":80}]} | List<AnalysisRelationshipResponse> | Validate both entities belong to same version; confidence 0..100. Unvalidated only. |
| `POST` | `/analysis-versions/{versionId}/validate` | Human validation analisis | `analysis.validate` | {"decision":"VALIDATE","note":"string optional"} | AnalysisVersionDetail | Ensure completeness/source traceability; set validatedBy/At and case VALIDATED. Validator may be distinct from creator per policy. |

**Applicable shared forms**

- `F-ANALYSIS-CASE`
- `F-ANALYSIS-VERSION`

**Inherited page rules**

- Sources must be VERIFIED
- AI draft requires human validation

#### `/dashboard/oim/analisis-intelijen/[caseId]/versions/[versionId]`

- **File:** `src/app/dashboard/oim/analisis-intelijen/[caseId]/versions/[versionId]/page.tsx`
- **Resource:** `AnalysisCase`
- **Page type:** `version-detail`
- **Purpose:** Analysis version

**Flow**

1. Load the exact historical version by path parameter.
2. Render it read-only with change reason, creator, timestamp, and source links.
3. Provide navigation to adjacent versions and the root resource.

**Displayed sections**

- Case metadata
- Verified sources
- Current version
- Entities
- Relationships
- Graph
- Traceability

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/analysis-cases/{caseId}` | Detail analysis case | `analysis.read` | Query: include=sources,versions,graphSummary | AnalysisCaseDetail | Load scoped case. Clearance from highest source classification. |
| `GET` | `/analysis-cases/{caseId}/versions` | Riwayat analysis versions | `analysis.read` | Query: page,limit | Paged<AnalysisVersionSummary> | Order version desc. Validated versions immutable. |
| `GET` | `/analysis-cases/{caseId}/traceability` | Traceability analysis | `analysis.read` | Tidak ada body | AnalysisTraceabilityResponse | Return verification→Baket→messages and downstream product links. Redact inaccessible source nodes. |
| `GET` | `/analysis-versions/{versionId}` | Detail versi analisis | `analysis.read` | Query: include=entities,relationships | AnalysisVersionDetail | Load exact version. Scoped. |

**Applicable shared forms**

- `F-ANALYSIS-CASE`
- `F-ANALYSIS-VERSION`

**Inherited page rules**

- Sources must be VERIFIED
- AI draft requires human validation

#### `/dashboard/oim/direktif-tugas/baru`

- **File:** `src/app/dashboard/oim/direktif-tugas/baru/page.tsx`
- **Resource:** `Task`
- **Page type:** `create`
- **Purpose:** Create task from directive/UUK

**Flow**

1. Load reference data and eligible relationships.
2. Validate the form locally and on the server.
3. Create the resource or draft in one transaction.
4. Redirect to the canonical detail/edit route returned by the API.

**Displayed sections**

- Task identity
- Directive/UUK source
- Target areas
- Priority
- Due date
- Assignments
- Progress
- Outputs

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/directives` | Daftar direktif | `directive.read` | Query: page,limit,status,ownerUnitId,areaId,classification,from,to,search,assignedToMe | Paged<DirectiveSummary> | Join current version; apply recipient/unit/position, org/area scope and clearance filters. Only current version fields in summary. |
| `GET` | `/uuk-strs` | Daftar UUK/STR | `uuk.read` | Query: page,limit,status,ownerUnitId,directiveId,search | Paged<UukStrSummary> | Join current version and directive security scope. Clearance inherited from directive. |
| `GET` | `/administrative-areas/tree` | Cascading tree wilayah | `area.read` | Query: rootId?,maxDepth=3,levels?,includeBoundaryStatus=true | AdministrativeAreaTreeResponse | Fetch closure descendants; annotate boundary availability and childCount. Payload depth capped. |
| `POST` | `/tasks` | Buat tugas | `task.create` | {"parentTaskId":"uuid optional","directiveVersionId":"uuid optional","uukStrVersionId":"uuid optional","ownerUnitId":"uuid","title":"...","description":"...","classification":"TERBATAS","priority":"HIGH","dueDate":"ISO","targetAreaIds":["uuid"],"attachmentFileIds":[]} | 201 TaskDetail | Validate creator can task downward; source consistency; target areas subset of parent; dueDate <= parent dueDate. At least one source or explicit standalone reason. |

**Applicable shared forms**

- `F-TASK`
- `F-TASK-ASSIGNMENT`

**Inherited page rules**

- OIM assigns Field Coordinator, not Field Officer directly

#### `/dashboard/oim/direktif-tugas/[taskId]`

- **File:** `src/app/dashboard/oim/direktif-tugas/[taskId]/page.tsx`
- **Resource:** `Task`
- **Page type:** `detail`
- **Purpose:** Task detail

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Task identity
- Directive/UUK source
- Target areas
- Priority
- Due date
- Assignments
- Progress
- Outputs

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/tasks/{taskId}` | Detail tugas | `task.read` | Query: include=assignments,targetAreas,attachments,parent,children | TaskDetail | Load scoped task and relations. Classified 404 masking. |
| `GET` | `/tasks/{taskId}/assignments` | Daftar assignment tugas | `task.read` | Query: status?,page,limit | Paged<TaskAssignmentDetail> | Query by taskId with scoped visibility. Managers see subordinates; assignee sees own. |
| `GET` | `/tasks/{taskId}/progress-summary` | Ringkasan progress | `task.read` | Query: groupBy=unit\|area\|position | TaskProgressSummaryResponse | Aggregate assignment statuses, overdue, latest progress by group. Same security filter as task list. |

**Applicable shared forms**

- `F-TASK`
- `F-TASK-ASSIGNMENT`

**Inherited page rules**

- OIM assigns Field Coordinator, not Field Officer directly

#### `/dashboard/oim/direktif-tugas/[taskId]/edit`

- **File:** `src/app/dashboard/oim/direktif-tugas/[taskId]/edit/page.tsx`
- **Resource:** `Task`
- **Page type:** `edit`
- **Purpose:** Edit draft task

**Flow**

1. Load the editable draft and ETag/version token.
2. Submit only permitted fields with If-Match.
3. Handle 409 conflicts without overwriting newer data.

**Displayed sections**

- Task identity
- Directive/UUK source
- Target areas
- Priority
- Due date
- Assignments
- Progress
- Outputs

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/tasks/{taskId}` | Detail tugas | `task.read` | Query: include=assignments,targetAreas,attachments,parent,children | TaskDetail | Load scoped task and relations. Classified 404 masking. |
| `GET` | `/tasks/{taskId}/assignments` | Daftar assignment tugas | `task.read` | Query: status?,page,limit | Paged<TaskAssignmentDetail> | Query by taskId with scoped visibility. Managers see subordinates; assignee sees own. |
| `GET` | `/tasks/{taskId}/progress-summary` | Ringkasan progress | `task.read` | Query: groupBy=unit\|area\|position | TaskProgressSummaryResponse | Aggregate assignment statuses, overdue, latest progress by group. Same security filter as task list. |
| `PATCH` | `/tasks/{taskId}` | Edit tugas draft | `task.update` | {"title?":"...","description?":"...","priority?":"URGENT","dueDate?":"ISO"} | TaskDetail | Only DRAFT and creator/owner authorized. Status not patchable. |
| `PUT` | `/tasks/{taskId}/target-areas` | Ganti target area tugas | `task.update` | {"areaIds":["uuid"]} | List<AreaSummary> | Validate scope and parent subset. Only before assignment or with controlled change version/audit. |

**Applicable shared forms**

- `F-TASK`
- `F-TASK-ASSIGNMENT`

**Inherited page rules**

- OIM assigns Field Coordinator, not Field Officer directly

#### `/dashboard/oim/direktif-tugas/[taskId]/penugasan`

- **File:** `src/app/dashboard/oim/direktif-tugas/[taskId]/penugasan/page.tsx`
- **Resource:** `Task`
- **Page type:** `assignment-builder`
- **Purpose:** Assign Field Coordinator

**Flow**

1. Load the task plus eligible subordinate assignments and workload.
2. Filter candidates by command chain, active assignment, area coverage, and availability.
3. Submit assignments atomically.
4. Refresh task cascade, workload, and notification data.

**Displayed sections**

- Task identity
- Directive/UUK source
- Target areas
- Priority
- Due date
- Assignments
- Progress
- Outputs

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/tasks/{taskId}` | Detail tugas | `task.read` | Query: include=assignments,targetAreas,attachments,parent,children | TaskDetail | Load scoped task and relations. Classified 404 masking. |
| `GET` | `/tasks/{taskId}/assignments` | Daftar assignment tugas | `task.read` | Query: status?,page,limit | Paged<TaskAssignmentDetail> | Query by taskId with scoped visibility. Managers see subordinates; assignee sees own. |
| `GET` | `/tasks/{taskId}/progress-summary` | Ringkasan progress | `task.read` | Query: groupBy=unit\|area\|position | TaskProgressSummaryResponse | Aggregate assignment statuses, overdue, latest progress by group. Same security filter as task list. |
| `GET` | `/position-assignments` | Daftar assignment | `assignment.read` | Query: page,limit,userProfileId,positionId,unitId,isActive,validAt | Paged<PositionAssignmentDetail> | Filter assignment and joins. Scoped by organization chain. |
| `POST` | `/tasks/{taskId}/assignments` | Assign tugas ke personel | `task.assign` | {"assignments":[{"assigneeAssignmentId":"uuid","dueDate":"ISO","assignmentNote":"..."}]} | 201 List<TaskAssignmentDetail> | Validate direct/subordinate chain, active assignment, area overlap, clearance, workload policy; create assignment and notifications. No self-assign unless allowed; duplicate active assignment conflict. |

**Applicable shared forms**

- `F-TASK`
- `F-TASK-ASSIGNMENT`

**Inherited page rules**

- OIM assigns Field Coordinator, not Field Officer directly

#### `/dashboard/oim/produk-intelijen/buat-produk/[productId]/edit`

- **File:** `src/app/dashboard/oim/produk-intelijen/buat-produk/[productId]/edit/page.tsx`
- **Resource:** `IntelligenceProduct`
- **Page type:** `dynamic-form`
- **Purpose:** Continue editing product draft

**Flow**

1. Load the active template and reference sources.
2. Generate form controls from the template schema.
3. Autosave only editable drafts and use optimistic concurrency.
4. Validate the complete content against the template before submission.
5. Submit the exact version and redirect to workflow tracking.

**Displayed sections**

- Product identity
- Type/template
- Current version
- Structured content
- Sources
- Approval workflow
- Distribution

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/products/{productId}` | Detail produk current version | `product.read` | Query: include=versions,sources,approval,distribution,attachments | IntelligenceProductDetail | Load scoped product. Clearance and need-to-know. |
| `GET` | `/products/{productId}/versions` | Riwayat versi produk | `product.read` | Query: page,limit | Paged<ProductVersionSummary> | Order desc. Submitted/approved versions immutable. |
| `GET` | `/products/{productId}/timeline` | Timeline produk | `product.read` | Tidak ada body | TimelineResponse | Merge versions, workflow steps, decisions, distributions, audit. Scoped. |
| `GET` | `/products/{productId}/traceability` | Traceability produk | `product.read` | Tidak ada body | ProductTraceabilityResponse | Graph product→sources→Baket→messages plus approval/distribution. Redacted by access. |
| `PATCH` | `/product-versions/{versionId}` | Edit product version draft | `product.update` | {"routingTo?":"...","routingFrom?":"...","routingCc?":"...","subject?":"...","content?":{}} | ProductVersionDetail | Current version and product DRAFT/NEEDS_REVISION only; validate template. No status patch. |
| `PUT` | `/product-versions/{versionId}/source-verifications` | Ganti source verifications | `product.update` | {"verificationIds":["uuid"]} | List<VerificationSummary> | Validate VERIFIED and accessible; preserve traceability. Draft only. |
| `PUT` | `/product-versions/{versionId}/source-analyses` | Ganti source analyses | `product.update` | {"analysisVersionIds":["uuid"]} | List<AnalysisVersionSummary> | Validate human-validated analysis. Draft only. |
| `PUT` | `/product-versions/{versionId}/attachments` | Ganti lampiran | `product.update` | {"attachments":[{"fileId":"uuid","caption":"..."}]} | List<FileAssetResponse> | Validate clean files and classification handling. Draft only. |
| `POST` | `/product-versions/{versionId}/validate` | Validasi kesiapan submit | `product.update` | Tidak ada body | ProductValidationResponse | Check template, sources, classification, routing metadata, period, traceability. Returns warnings/errors; no state change. |

**Applicable shared forms**

- `F-PRODUCT`

**Inherited page rules**

- Form generated from active template
- No PDF requirement

#### `/dashboard/oim/produk-intelijen/daftar-produk/[productId]`

- **File:** `src/app/dashboard/oim/produk-intelijen/daftar-produk/[productId]/page.tsx`
- **Resource:** `IntelligenceProduct`
- **Page type:** `detail`
- **Purpose:** Product detail and timeline

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Product identity
- Type/template
- Current version
- Structured content
- Sources
- Approval workflow
- Distribution

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/products/{productId}` | Detail produk current version | `product.read` | Query: include=versions,sources,approval,distribution,attachments | IntelligenceProductDetail | Load scoped product. Clearance and need-to-know. |
| `GET` | `/products/{productId}/versions` | Riwayat versi produk | `product.read` | Query: page,limit | Paged<ProductVersionSummary> | Order desc. Submitted/approved versions immutable. |
| `GET` | `/products/{productId}/timeline` | Timeline produk | `product.read` | Tidak ada body | TimelineResponse | Merge versions, workflow steps, decisions, distributions, audit. Scoped. |
| `GET` | `/products/{productId}/traceability` | Traceability produk | `product.read` | Tidak ada body | ProductTraceabilityResponse | Graph product→sources→Baket→messages plus approval/distribution. Redacted by access. |

**Applicable shared forms**

- `F-PRODUCT-REVISION`

**Inherited page rules**

- Submitted/approved versions immutable

#### `/dashboard/oim/produk-intelijen/daftar-produk/[productId]/edit`

- **File:** `src/app/dashboard/oim/produk-intelijen/daftar-produk/[productId]/edit/page.tsx`
- **Resource:** `IntelligenceProduct`
- **Page type:** `dynamic-form`
- **Purpose:** Edit draft/new version

**Flow**

1. Load the active template and reference sources.
2. Generate form controls from the template schema.
3. Autosave only editable drafts and use optimistic concurrency.
4. Validate the complete content against the template before submission.
5. Submit the exact version and redirect to workflow tracking.

**Displayed sections**

- Product identity
- Type/template
- Current version
- Structured content
- Sources
- Approval workflow
- Distribution

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/products/{productId}` | Detail produk current version | `product.read` | Query: include=versions,sources,approval,distribution,attachments | IntelligenceProductDetail | Load scoped product. Clearance and need-to-know. |
| `GET` | `/products/{productId}/versions` | Riwayat versi produk | `product.read` | Query: page,limit | Paged<ProductVersionSummary> | Order desc. Submitted/approved versions immutable. |
| `GET` | `/products/{productId}/timeline` | Timeline produk | `product.read` | Tidak ada body | TimelineResponse | Merge versions, workflow steps, decisions, distributions, audit. Scoped. |
| `GET` | `/products/{productId}/traceability` | Traceability produk | `product.read` | Tidak ada body | ProductTraceabilityResponse | Graph product→sources→Baket→messages plus approval/distribution. Redacted by access. |
| `PATCH` | `/product-versions/{versionId}` | Edit product version draft | `product.update` | {"routingTo?":"...","routingFrom?":"...","routingCc?":"...","subject?":"...","content?":{}} | ProductVersionDetail | Current version and product DRAFT/NEEDS_REVISION only; validate template. No status patch. |
| `PUT` | `/product-versions/{versionId}/source-verifications` | Ganti source verifications | `product.update` | {"verificationIds":["uuid"]} | List<VerificationSummary> | Validate VERIFIED and accessible; preserve traceability. Draft only. |
| `PUT` | `/product-versions/{versionId}/source-analyses` | Ganti source analyses | `product.update` | {"analysisVersionIds":["uuid"]} | List<AnalysisVersionSummary> | Validate human-validated analysis. Draft only. |
| `PUT` | `/product-versions/{versionId}/attachments` | Ganti lampiran | `product.update` | {"attachments":[{"fileId":"uuid","caption":"..."}]} | List<FileAssetResponse> | Validate clean files and classification handling. Draft only. |
| `POST` | `/product-versions/{versionId}/validate` | Validasi kesiapan submit | `product.update` | Tidak ada body | ProductValidationResponse | Check template, sources, classification, routing metadata, period, traceability. Returns warnings/errors; no state change. |

**Applicable shared forms**

- `F-PRODUCT-REVISION`

**Inherited page rules**

- Submitted/approved versions immutable

#### `/dashboard/oim/produk-intelijen/daftar-produk/[productId]/versions/[versionId]`

- **File:** `src/app/dashboard/oim/produk-intelijen/daftar-produk/[productId]/versions/[versionId]/page.tsx`
- **Resource:** `IntelligenceProduct`
- **Page type:** `version-detail`
- **Purpose:** Immutable product version

**Flow**

1. Load the exact historical version by path parameter.
2. Render it read-only with change reason, creator, timestamp, and source links.
3. Provide navigation to adjacent versions and the root resource.

**Displayed sections**

- Product identity
- Type/template
- Current version
- Structured content
- Sources
- Approval workflow
- Distribution

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/products/{productId}` | Detail produk current version | `product.read` | Query: include=versions,sources,approval,distribution,attachments | IntelligenceProductDetail | Load scoped product. Clearance and need-to-know. |
| `GET` | `/products/{productId}/versions` | Riwayat versi produk | `product.read` | Query: page,limit | Paged<ProductVersionSummary> | Order desc. Submitted/approved versions immutable. |
| `GET` | `/products/{productId}/timeline` | Timeline produk | `product.read` | Tidak ada body | TimelineResponse | Merge versions, workflow steps, decisions, distributions, audit. Scoped. |
| `GET` | `/products/{productId}/traceability` | Traceability produk | `product.read` | Tidak ada body | ProductTraceabilityResponse | Graph product→sources→Baket→messages plus approval/distribution. Redacted by access. |
| `GET` | `/product-versions/{versionId}` | Detail versi produk | `product.read` | Tidak ada body | ProductVersionDetail | Load exact version and source references. Scoped. |

**Applicable shared forms**

- `F-PRODUCT-REVISION`

**Inherited page rules**

- Submitted/approved versions immutable

#### `/dashboard/oim/pengajuan-persetujuan/[productId]`

- **File:** `src/app/dashboard/oim/pengajuan-persetujuan/[productId]/page.tsx`
- **Resource:** `IntelligenceProduct / ApprovalWorkflow`
- **Page type:** `review-submit`
- **Purpose:** Pre-submit validation and workflow preview

**Flow**

1. Load the current draft version, completeness result, source links, and available actions.
2. Display blocking errors separately from warnings requiring confirmation.
3. Submit with Idempotency-Key and If-Match.
4. Redirect to the submitted detail/timeline and invalidate receiving queues.

**Displayed sections**

- Product identity
- Type/template
- Current version
- Structured content
- Sources
- Approval workflow
- Distribution

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/products/{productId}` | Detail produk current version | `product.read` | Query: include=versions,sources,approval,distribution,attachments | IntelligenceProductDetail | Load scoped product. Clearance and need-to-know. |
| `GET` | `/products/{productId}/versions` | Riwayat versi produk | `product.read` | Query: page,limit | Paged<ProductVersionSummary> | Order desc. Submitted/approved versions immutable. |
| `GET` | `/products/{productId}/timeline` | Timeline produk | `product.read` | Tidak ada body | TimelineResponse | Merge versions, workflow steps, decisions, distributions, audit. Scoped. |
| `GET` | `/products/{productId}/traceability` | Traceability produk | `product.read` | Tidak ada body | ProductTraceabilityResponse | Graph product→sources→Baket→messages plus approval/distribution. Redacted by access. |
| `POST` | `/product-versions/{versionId}/validate` | Validasi kesiapan submit | `product.update` | Tidak ada body | ProductValidationResponse | Check template, sources, classification, routing metadata, period, traceability. Returns warnings/errors; no state change. |
| `POST` | `/products/{productId}/submit` | Submit ke approval regional | `product.submit` | {"versionId":"uuid","confirmation":"SUBMIT"} | ApprovalWorkflowDetail | Validate current version; resolve routeType from creator branch; create approval workflow/steps Regional→Executive; set UNDER_REGIONAL_REVIEW. OIM only; idempotency. |

**Applicable shared forms**

- `F-PRODUCT-SUBMIT`

**Inherited page rules**

- Submit exact immutable product version

#### `/dashboard/oim/pengajuan-persetujuan/workflow/[workflowId]`

- **File:** `src/app/dashboard/oim/pengajuan-persetujuan/workflow/[workflowId]/page.tsx`
- **Resource:** `IntelligenceProduct / ApprovalWorkflow`
- **Page type:** `tracking`
- **Purpose:** Approval timeline

**Flow**

1. Load workflow/recipient timeline and current state.
2. Render timestamps, actor/target, failures, retries, and next step.
3. Keep the page read-only except for explicit retry/cancel actions.

**Displayed sections**

- Product identity
- Type/template
- Current version
- Structured content
- Sources
- Approval workflow
- Distribution

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/approval-workflows/{workflowId}` | Detail workflow approval | `approval.read` | Query: include=steps,product | ApprovalWorkflowDetail | Load workflow and ordered steps. Scoped. |
| `GET` | `/approval-workflows/{workflowId}/timeline` | Timeline approval | `approval.read` | Tidak ada body | TimelineResponse | Return step activations, decisions, revision cycles and notifications. Immutable history. |

**Applicable shared forms**

- `F-PRODUCT-SUBMIT`

**Inherited page rules**

- Submit exact immutable product version

#### `/dashboard/oim/monitoring-lapangan/tugas/[taskId]`

- **File:** `src/app/dashboard/oim/monitoring-lapangan/tugas/[taskId]/page.tsx`
- **Resource:** `Task / Personnel / Baket`
- **Page type:** `detail`
- **Purpose:** Task drill-down

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Task identity
- Directive/UUK source
- Target areas
- Priority
- Due date
- Assignments
- Progress
- Outputs

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/tasks/{taskId}` | Detail tugas | `task.read` | Query: include=assignments,targetAreas,attachments,parent,children | TaskDetail | Load scoped task and relations. Classified 404 masking. |
| `GET` | `/tasks/{taskId}/assignments` | Daftar assignment tugas | `task.read` | Query: status?,page,limit | Paged<TaskAssignmentDetail> | Query by taskId with scoped visibility. Managers see subordinates; assignee sees own. |
| `GET` | `/tasks/{taskId}/progress-summary` | Ringkasan progress | `task.read` | Query: groupBy=unit\|area\|position | TaskProgressSummaryResponse | Aggregate assignment statuses, overdue, latest progress by group. Same security filter as task list. |

**Inherited page rules**

- Managerial direct command chain only

#### `/dashboard/oim/monitoring-lapangan/baket/[baketId]`

- **File:** `src/app/dashboard/oim/monitoring-lapangan/baket/[baketId]/page.tsx`
- **Resource:** `Task / Personnel / Baket`
- **Page type:** `detail`
- **Purpose:** Report drill-down

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Task identity
- Directive/UUK source
- Target areas
- Priority
- Due date
- Assignments
- Progress
- Outputs

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/bakets/{baketId}` | Detail Baket current version | `baket.read` | Query: include=versions,sources,attachments,revisionRequests,verification | BaketDetail | Load root/current version/traceability under access context. Verified data read-only for lower unit. |
| `GET` | `/bakets/{baketId}/timeline` | Timeline Baket | `baket.read` | Tidak ada body | TimelineResponse | Merge versions, status events, revision requests, verification, audit events sorted time. Field-level redaction. |
| `GET` | `/bakets/{baketId}/traceability` | Traceability sumber-ke-produk | `baket.read` | Tidak ada body | BaketTraceabilityResponse | Graph source messages→versions→verification→analysis→products→approvals/distributions. Only nodes caller can access; report redacted node counts if policy allows. |

**Inherited page rules**

- Managerial direct command chain only

#### `/dashboard/oim/monitoring-lapangan/personel/[assignmentId]`

- **File:** `src/app/dashboard/oim/monitoring-lapangan/personel/[assignmentId]/page.tsx`
- **Resource:** `Task / Personnel / Baket`
- **Page type:** `detail`
- **Purpose:** Personnel drill-down

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Task identity
- Directive/UUK source
- Target areas
- Priority
- Due date
- Assignments
- Progress
- Outputs

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/position-assignments/{assignmentId}` | Detail assignment | `assignment.read` | Query: include=areaScopes,user,position | PositionAssignmentDetail | Load scoped assignment. 404 if inaccessible. |
| `GET` | `/position-assignments/{assignmentId}/area-scopes` | Ambil scope assignment | `area.scope.read` | Query: activeOnly=true,expand=false | List<PositionAreaScopeResponse> | Read scopes and optional descendants. No out-of-scope leakage. |
| `GET` | `/personnel-location-pings/{assignmentId}/latest` | Lokasi terbaru bawahan | `location.read` | Tidak ada body | PersonnelLocationPingResponse | Verify direct command chain, permission, retention and stealth policy; latest index query. Every access audited. |
| `GET` | `/personnel-location-pings/{assignmentId}/history` | Riwayat lokasi bawahan | `location.read-history` | Query: from,to,cursor,limit<=1000 | CursorPage<PersonnelLocationPingResponse> | Range query by assignment/capturedAt. Strict purpose/reason header may be required; retention cap. |

**Inherited page rules**

- Managerial direct command chain only

#### `/dashboard/oim/peta-situasi/baket/[baketId]`

- **File:** `src/app/dashboard/oim/peta-situasi/baket/[baketId]/page.tsx`
- **Resource:** `Baket / Alert`
- **Page type:** `detail`
- **Purpose:** Deep-link report from map

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Current version
- 5W+1H content
- Event time/location
- Sources
- Attachments
- Coverage checks
- Timeline
- Revision requests

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/bakets/{baketId}` | Detail Baket current version | `baket.read` | Query: include=versions,sources,attachments,revisionRequests,verification | BaketDetail | Load root/current version/traceability under access context. Verified data read-only for lower unit. |
| `GET` | `/bakets/{baketId}/timeline` | Timeline Baket | `baket.read` | Tidak ada body | TimelineResponse | Merge versions, status events, revision requests, verification, audit events sorted time. Field-level redaction. |
| `GET` | `/bakets/{baketId}/traceability` | Traceability sumber-ke-produk | `baket.read` | Tidak ada body | BaketTraceabilityResponse | Graph source messages→versions→verification→analysis→products→approvals/distributions. Only nodes caller can access; report redacted node counts if policy allows. |

**Inherited page rules**

- Source identity masked according to clearance

#### `/dashboard/oim/peta-situasi/alert/[alertId]`

- **File:** `src/app/dashboard/oim/peta-situasi/alert/[alertId]/page.tsx`
- **Resource:** `Baket / Alert`
- **Page type:** `detail`
- **Purpose:** Deep-link alert from map

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Current version
- 5W+1H content
- Event time/location
- Sources
- Attachments
- Coverage checks
- Timeline
- Revision requests

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/alerts/{alertId}` | Detail alert | `alert.read` | Tidak ada body | AlertDetail | Load scoped alert and source summaries. Source detail separate authorization. |
| `POST` | `/alerts/{alertId}/acknowledge` | Acknowledge alert | `alert.execute` | {"note":"string optional"} | AlertDetail | NEW→ACKNOWLEDGED; set acknowledgedAt. Assigned/command position. |
| `POST` | `/alerts/{alertId}/assign` | Assign alert | `alert.assign` | {"positionId":"uuid","note":"string optional"} | AlertDetail | Validate position active and area/branch overlap; set ASSIGNED. Notify occupant. |
| `POST` | `/alerts/{alertId}/start` | Mulai tindak lanjut alert | `alert.execute` | Tidak ada body | AlertDetail | ACKNOWLEDGED/ASSIGNED→IN_PROGRESS. Occupant only. |
| `POST` | `/alerts/{alertId}/resolve` | Selesaikan alert | `alert.execute` | {"resolution":"string"} | AlertDetail | IN_PROGRESS/ACKNOWLEDGED→RESOLVED; set resolvedAt. Resolution mandatory. |

**Inherited page rules**

- Source identity masked according to clearance

### 5.6 Field Coordinator

#### `/dashboard/field-coordinator/tugas-lapangan/tugas-diterima/[assignmentId]`

- **File:** `src/app/dashboard/field-coordinator/tugas-lapangan/tugas-diterima/[assignmentId]/page.tsx`
- **Resource:** `TaskAssignment`
- **Page type:** `detail-action`
- **Purpose:** Read/ack/start received assignment

**Flow**

1. Load detail, timeline, related records, and available actions.
2. Render actions only from the server-provided capability set.
3. Execute explicit actions and refresh the authoritative detail.

**Displayed sections**

- Task identity
- Directive/UUK source
- Target areas
- Priority
- Due date
- Assignments
- Progress
- Outputs

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/task-assignments/{assignmentId}` | Detail task assignment | `task.read` | Query: include=progress,bakets | TaskAssignmentDetail | Authorize assignee/assigner/command chain. 404 if inaccessible. |
| `POST` | `/task-assignments/{assignmentId}/mark-read` | Tandai tugas dibaca | `task.execute` | Tidak ada body | TaskAssignmentDetail | Set readAt once; SENT→READ. Assignee only; idempotent. |
| `POST` | `/task-assignments/{assignmentId}/acknowledge` | Terima tugas | `task.execute` | {"note":"string optional"} | TaskAssignmentDetail | Set acknowledgedAt; status READ/SENT→ACKNOWLEDGED. Assignee only. |
| `POST` | `/task-assignments/{assignmentId}/start` | Mulai pengerjaan | `task.execute` | Tidak ada body | TaskAssignmentDetail | Set startedAt; status ACKNOWLEDGED→IN_PROGRESS; update parent task aggregate. Must acknowledge first unless policy auto-ack. |
| `POST` | `/task-assignments/{assignmentId}/progress` | Tambah progress log | `task.execute` | {"progressPercent":60,"note":"...","status":"IN_PROGRESS"} | 201 TaskProgressLogResponse | Insert append-only progress log; update assignment status/timestamps if valid transition. Percent 0..100; cannot decrease without correction reason. |
| `POST` | `/task-assignments/{assignmentId}/complete` | Selesaikan assignment | `task.execute` | {"note":"...","completionEvidenceFileIds":[]} | TaskAssignmentDetail | Validate required outputs/Baket as task policy; set COMPLETED/100%; recalc task completion. Cannot complete cancelled/reassigned. |
| `POST` | `/task-assignments/{assignmentId}/reassign` | Alihkan assignment | `task.reassign` | {"newAssigneeAssignmentId":"uuid","reason":"string","dueDate":"ISO optional"} | 201 TaskAssignmentDetail | Transaction mark old REASSIGNED, create new linked reassignedFromId, copy task, notify both. Validate chain/scope; idempotency. |

**Applicable shared forms**

- `F-TASK-START`

**Inherited page rules**

- Only own assignments

#### `/dashboard/field-coordinator/tugas-lapangan/penugasan-tim/[taskId]`

- **File:** `src/app/dashboard/field-coordinator/tugas-lapangan/penugasan-tim/[taskId]/page.tsx`
- **Resource:** `Task`
- **Page type:** `assignment-builder`
- **Purpose:** Assign team

**Flow**

1. Load the task plus eligible subordinate assignments and workload.
2. Filter candidates by command chain, active assignment, area coverage, and availability.
3. Submit assignments atomically.
4. Refresh task cascade, workload, and notification data.

**Displayed sections**

- Task identity
- Directive/UUK source
- Target areas
- Priority
- Due date
- Assignments
- Progress
- Outputs

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/tasks/{taskId}` | Detail tugas | `task.read` | Query: include=assignments,targetAreas,attachments,parent,children | TaskDetail | Load scoped task and relations. Classified 404 masking. |
| `GET` | `/tasks/{taskId}/assignments` | Daftar assignment tugas | `task.read` | Query: status?,page,limit | Paged<TaskAssignmentDetail> | Query by taskId with scoped visibility. Managers see subordinates; assignee sees own. |
| `GET` | `/tasks/{taskId}/progress-summary` | Ringkasan progress | `task.read` | Query: groupBy=unit\|area\|position | TaskProgressSummaryResponse | Aggregate assignment statuses, overdue, latest progress by group. Same security filter as task list. |
| `GET` | `/position-assignments` | Daftar assignment | `assignment.read` | Query: page,limit,userProfileId,positionId,unitId,isActive,validAt | Paged<PositionAssignmentDetail> | Filter assignment and joins. Scoped by organization chain. |
| `POST` | `/tasks/{taskId}/assignments` | Assign tugas ke personel | `task.assign` | {"assignments":[{"assigneeAssignmentId":"uuid","dueDate":"ISO","assignmentNote":"..."}]} | 201 List<TaskAssignmentDetail> | Validate direct/subordinate chain, active assignment, area overlap, clearance, workload policy; create assignment and notifications. No self-assign unless allowed; duplicate active assignment conflict. |

**Applicable shared forms**

- `F-TASK-ASSIGNMENT`
- `F-TASK-REASSIGN`

**Inherited page rules**

- One action may create multiple assignments atomically

#### `/dashboard/field-coordinator/tugas-operasional/[taskId]`

- **File:** `src/app/dashboard/field-coordinator/tugas-operasional/[taskId]/page.tsx`
- **Resource:** `Task`
- **Page type:** `detail`
- **Purpose:** Operational task board detail

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Task identity
- Directive/UUK source
- Target areas
- Priority
- Due date
- Assignments
- Progress
- Outputs

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/tasks/{taskId}` | Detail tugas | `task.read` | Query: include=assignments,targetAreas,attachments,parent,children | TaskDetail | Load scoped task and relations. Classified 404 masking. |
| `GET` | `/tasks/{taskId}/assignments` | Daftar assignment tugas | `task.read` | Query: status?,page,limit | Paged<TaskAssignmentDetail> | Query by taskId with scoped visibility. Managers see subordinates; assignee sees own. |
| `GET` | `/tasks/{taskId}/progress-summary` | Ringkasan progress | `task.read` | Query: groupBy=unit\|area\|position | TaskProgressSummaryResponse | Aggregate assignment statuses, overdue, latest progress by group. Same security filter as task list. |

**Applicable shared forms**

- `F-TASK-REASSIGN`

**Inherited page rules**

- Drag-and-drop must call explicit action, not local status mutation

#### `/dashboard/field-coordinator/tugas-operasional/[taskId]/assignments/[assignmentId]`

- **File:** `src/app/dashboard/field-coordinator/tugas-operasional/[taskId]/assignments/[assignmentId]/page.tsx`
- **Resource:** `Task`
- **Page type:** `detail-action`
- **Purpose:** Assignment progress and reassignment

**Flow**

1. Load detail, timeline, related records, and available actions.
2. Render actions only from the server-provided capability set.
3. Execute explicit actions and refresh the authoritative detail.

**Displayed sections**

- Task identity
- Directive/UUK source
- Target areas
- Priority
- Due date
- Assignments
- Progress
- Outputs

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/task-assignments/{assignmentId}` | Detail task assignment | `task.read` | Query: include=progress,bakets | TaskAssignmentDetail | Authorize assignee/assigner/command chain. 404 if inaccessible. |
| `POST` | `/task-assignments/{assignmentId}/mark-read` | Tandai tugas dibaca | `task.execute` | Tidak ada body | TaskAssignmentDetail | Set readAt once; SENT→READ. Assignee only; idempotent. |
| `POST` | `/task-assignments/{assignmentId}/acknowledge` | Terima tugas | `task.execute` | {"note":"string optional"} | TaskAssignmentDetail | Set acknowledgedAt; status READ/SENT→ACKNOWLEDGED. Assignee only. |
| `POST` | `/task-assignments/{assignmentId}/start` | Mulai pengerjaan | `task.execute` | Tidak ada body | TaskAssignmentDetail | Set startedAt; status ACKNOWLEDGED→IN_PROGRESS; update parent task aggregate. Must acknowledge first unless policy auto-ack. |
| `POST` | `/task-assignments/{assignmentId}/progress` | Tambah progress log | `task.execute` | {"progressPercent":60,"note":"...","status":"IN_PROGRESS"} | 201 TaskProgressLogResponse | Insert append-only progress log; update assignment status/timestamps if valid transition. Percent 0..100; cannot decrease without correction reason. |
| `POST` | `/task-assignments/{assignmentId}/complete` | Selesaikan assignment | `task.execute` | {"note":"...","completionEvidenceFileIds":[]} | TaskAssignmentDetail | Validate required outputs/Baket as task policy; set COMPLETED/100%; recalc task completion. Cannot complete cancelled/reassigned. |
| `POST` | `/task-assignments/{assignmentId}/reassign` | Alihkan assignment | `task.reassign` | {"newAssigneeAssignmentId":"uuid","reason":"string","dueDate":"ISO optional"} | 201 TaskAssignmentDetail | Transaction mark old REASSIGNED, create new linked reassignedFromId, copy task, notify both. Validate chain/scope; idempotency. |

**Applicable shared forms**

- `F-TASK-REASSIGN`

**Inherited page rules**

- Drag-and-drop must call explicit action, not local status mutation

#### `/dashboard/field-coordinator/monitoring-tugas/[taskId]`

- **File:** `src/app/dashboard/field-coordinator/monitoring-tugas/[taskId]/page.tsx`
- **Resource:** `Task`
- **Page type:** `detail`
- **Purpose:** Task monitoring drill-down

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Task identity
- Directive/UUK source
- Target areas
- Priority
- Due date
- Assignments
- Progress
- Outputs

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/tasks/{taskId}` | Detail tugas | `task.read` | Query: include=assignments,targetAreas,attachments,parent,children | TaskDetail | Load scoped task and relations. Classified 404 masking. |
| `GET` | `/tasks/{taskId}/assignments` | Daftar assignment tugas | `task.read` | Query: status?,page,limit | Paged<TaskAssignmentDetail> | Query by taskId with scoped visibility. Managers see subordinates; assignee sees own. |
| `GET` | `/tasks/{taskId}/progress-summary` | Ringkasan progress | `task.read` | Query: groupBy=unit\|area\|position | TaskProgressSummaryResponse | Aggregate assignment statuses, overdue, latest progress by group. Same security filter as task list. |

**Applicable shared forms**

- `F-TASK-REASSIGN`

**Inherited page rules**

- No status patch; use action endpoints

#### `/dashboard/field-coordinator/penugasan-field-officer/[taskId]`

- **File:** `src/app/dashboard/field-coordinator/penugasan-field-officer/[taskId]/page.tsx`
- **Resource:** `Task`
- **Page type:** `assignment-builder`
- **Purpose:** Assign Field Officer

**Flow**

1. Load the task plus eligible subordinate assignments and workload.
2. Filter candidates by command chain, active assignment, area coverage, and availability.
3. Submit assignments atomically.
4. Refresh task cascade, workload, and notification data.

**Displayed sections**

- Task identity
- Directive/UUK source
- Target areas
- Priority
- Due date
- Assignments
- Progress
- Outputs

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/tasks/{taskId}` | Detail tugas | `task.read` | Query: include=assignments,targetAreas,attachments,parent,children | TaskDetail | Load scoped task and relations. Classified 404 masking. |
| `GET` | `/tasks/{taskId}/assignments` | Daftar assignment tugas | `task.read` | Query: status?,page,limit | Paged<TaskAssignmentDetail> | Query by taskId with scoped visibility. Managers see subordinates; assignee sees own. |
| `GET` | `/tasks/{taskId}/progress-summary` | Ringkasan progress | `task.read` | Query: groupBy=unit\|area\|position | TaskProgressSummaryResponse | Aggregate assignment statuses, overdue, latest progress by group. Same security filter as task list. |
| `GET` | `/position-assignments` | Daftar assignment | `assignment.read` | Query: page,limit,userProfileId,positionId,unitId,isActive,validAt | Paged<PositionAssignmentDetail> | Filter assignment and joins. Scoped by organization chain. |
| `POST` | `/tasks/{taskId}/assignments` | Assign tugas ke personel | `task.assign` | {"assignments":[{"assigneeAssignmentId":"uuid","dueDate":"ISO","assignmentNote":"..."}]} | 201 List<TaskAssignmentDetail> | Validate direct/subordinate chain, active assignment, area overlap, clearance, workload policy; create assignment and notifications. No self-assign unless allowed; duplicate active assignment conflict. |

**Applicable shared forms**

- `F-TASK-ASSIGNMENT`

**Inherited page rules**

- Assignee must be subordinate Field Officer and cover target area

#### `/dashboard/field-coordinator/laporan-lapangan/[baketId]`

- **File:** `src/app/dashboard/field-coordinator/laporan-lapangan/[baketId]/page.tsx`
- **Resource:** `Baket`
- **Page type:** `detail`
- **Purpose:** Subordinate Baket summary

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Current version
- 5W+1H content
- Event time/location
- Sources
- Attachments
- Coverage checks
- Timeline
- Revision requests

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/bakets/{baketId}` | Detail Baket current version | `baket.read` | Query: include=versions,sources,attachments,revisionRequests,verification | BaketDetail | Load root/current version/traceability under access context. Verified data read-only for lower unit. |
| `GET` | `/bakets/{baketId}/timeline` | Timeline Baket | `baket.read` | Tidak ada body | TimelineResponse | Merge versions, status events, revision requests, verification, audit events sorted time. Field-level redaction. |
| `GET` | `/bakets/{baketId}/traceability` | Traceability sumber-ke-produk | `baket.read` | Tidak ada body | BaketTraceabilityResponse | Graph source messages→versions→verification→analysis→products→approvals/distributions. Only nodes caller can access; report redacted node counts if policy allows. |

**Inherited page rules**

- Field Coordinator does not assign A-F/1-6

#### `/dashboard/field-coordinator/personel-lapangan/[assignmentId]`

- **File:** `src/app/dashboard/field-coordinator/personel-lapangan/[assignmentId]/page.tsx`
- **Resource:** `PositionAssignment`
- **Page type:** `detail`
- **Purpose:** Personnel, location, workload

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Seat identity
- Role
- Organization unit
- Reports-to
- Current occupant
- Subordinates
- Area policy

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/position-assignments/{assignmentId}` | Detail assignment | `assignment.read` | Query: include=areaScopes,user,position | PositionAssignmentDetail | Load scoped assignment. 404 if inaccessible. |
| `GET` | `/position-assignments/{assignmentId}/area-scopes` | Ambil scope assignment | `area.scope.read` | Query: activeOnly=true,expand=false | List<PositionAreaScopeResponse> | Read scopes and optional descendants. No out-of-scope leakage. |
| `GET` | `/personnel-location-pings/{assignmentId}/latest` | Lokasi terbaru bawahan | `location.read` | Tidak ada body | PersonnelLocationPingResponse | Verify direct command chain, permission, retention and stealth policy; latest index query. Every access audited. |
| `GET` | `/personnel-location-pings/{assignmentId}/history` | Riwayat lokasi bawahan | `location.read-history` | Query: from,to,cursor,limit<=1000 | CursorPage<PersonnelLocationPingResponse> | Range query by assignment/capturedAt. Strict purpose/reason header may be required; retention cap. |

**Inherited page rules**

- Location access audited
- Stale location clearly marked

#### `/dashboard/field-coordinator/personel-jaring/personel/[assignmentId]`

- **File:** `src/app/dashboard/field-coordinator/personel-jaring/personel/[assignmentId]/page.tsx`
- **Resource:** `PositionAssignment / Jaring`
- **Page type:** `detail`
- **Purpose:** Personnel detail

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Seat identity
- Role
- Organization unit
- Reports-to
- Current occupant
- Subordinates
- Area policy

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/position-assignments/{assignmentId}` | Detail assignment | `assignment.read` | Query: include=areaScopes,user,position | PositionAssignmentDetail | Load scoped assignment. 404 if inaccessible. |
| `GET` | `/position-assignments/{assignmentId}/area-scopes` | Ambil scope assignment | `area.scope.read` | Query: activeOnly=true,expand=false | List<PositionAreaScopeResponse> | Read scopes and optional descendants. No out-of-scope leakage. |
| `GET` | `/personnel-location-pings/{assignmentId}/latest` | Lokasi terbaru bawahan | `location.read` | Tidak ada body | PersonnelLocationPingResponse | Verify direct command chain, permission, retention and stealth policy; latest index query. Every access audited. |
| `GET` | `/personnel-location-pings/{assignmentId}/history` | Riwayat lokasi bawahan | `location.read-history` | Query: from,to,cursor,limit<=1000 | CursorPage<PersonnelLocationPingResponse> | Range query by assignment/capturedAt. Strict purpose/reason header may be required; retention cap. |

**Applicable shared forms**

- `F-JARING-TRANSFER`
- `F-JARING-COVERAGE`

**Inherited page rules**

- Only Jaring and personnel inside command chain

#### `/dashboard/field-coordinator/personel-jaring/jaring/[jaringId]`

- **File:** `src/app/dashboard/field-coordinator/personel-jaring/jaring/[jaringId]/page.tsx`
- **Resource:** `PositionAssignment / Jaring`
- **Page type:** `detail-edit`
- **Purpose:** Jaring and coverage

**Flow**

1. Load current data and concurrency metadata.
2. Permit editing only when the server reports the resource as editable.
3. Submit validated changes and refresh dependent views.

**Displayed sections**

- Seat identity
- Role
- Organization unit
- Reports-to
- Current occupant
- Subordinates
- Area policy

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/jaring/{jaringId}` | Detail Jaring | `jaring.read` | Query: include=caretakers,coverages,stats | JaringDetail | Scoped by caretaker/command chain/area. Sensitive identity redacted based on permission. |
| `GET` | `/jaring/{jaringId}/area-coverages` | Coverage Jaring | `jaring.read` | Query: activeOnly=true,expand=false | List<JaringAreaCoverageResponse> | Read coverages. Sensitive scope visibility restricted. |
| `GET` | `/jaring/{jaringId}/caretakers` | Riwayat caretaker | `jaring.read` | Query: activeOnly=false | List<JaringCaretakerAssignmentResponse> | Order validFrom desc. Scoped. |
| `GET` | `/jaring/{jaringId}/messages` | Pesan WhatsApp milik Jaring | `whatsapp.read` | Query: cursor,limit,status,from,to | CursorPage<WhatsAppMessageSummary> | Filter jaringId and scope; order receivedAt desc. Raw payload not included. |
| `GET` | `/jaring/{jaringId}/bakets` | Baket terkait Jaring | `baket.read` | Query: page,limit,status | Paged<BaketSummary> | Query primaryJaringId or source messages linked to Jaring. Need-to-know applies. |

**Applicable shared forms**

- `F-JARING-TRANSFER`
- `F-JARING-COVERAGE`

**Inherited page rules**

- Only Jaring and personnel inside command chain

#### `/dashboard/field-coordinator/personel-jaring/jaring/[jaringId]/transfer`

- **File:** `src/app/dashboard/field-coordinator/personel-jaring/jaring/[jaringId]/transfer/page.tsx`
- **Resource:** `PositionAssignment / Jaring`
- **Page type:** `action-page`
- **Purpose:** Caretaker transfer

**Flow**

1. Load the resource and available actions.
2. Display a focused form for one explicit business action.
3. Require confirmation/reason where applicable.
4. Execute the action and redirect to the canonical detail.

**Displayed sections**

- Seat identity
- Role
- Organization unit
- Reports-to
- Current occupant
- Subordinates
- Area policy

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/jaring/{jaringId}` | Detail Jaring | `jaring.read` | Query: include=caretakers,coverages,stats | JaringDetail | Scoped by caretaker/command chain/area. Sensitive identity redacted based on permission. |
| `GET` | `/jaring/{jaringId}/area-coverages` | Coverage Jaring | `jaring.read` | Query: activeOnly=true,expand=false | List<JaringAreaCoverageResponse> | Read coverages. Sensitive scope visibility restricted. |
| `GET` | `/jaring/{jaringId}/caretakers` | Riwayat caretaker | `jaring.read` | Query: activeOnly=false | List<JaringCaretakerAssignmentResponse> | Order validFrom desc. Scoped. |
| `GET` | `/jaring/{jaringId}/messages` | Pesan WhatsApp milik Jaring | `whatsapp.read` | Query: cursor,limit,status,from,to | CursorPage<WhatsAppMessageSummary> | Filter jaringId and scope; order receivedAt desc. Raw payload not included. |
| `GET` | `/jaring/{jaringId}/bakets` | Baket terkait Jaring | `baket.read` | Query: page,limit,status | Paged<BaketSummary> | Query primaryJaringId or source messages linked to Jaring. Need-to-know applies. |
| `POST` | `/jaring/{jaringId}/caretaker-transfer` | Transfer pengelola Field Officer | `jaring.transfer` | {"newFieldOfficerAssignmentId":"uuid","effectiveAt":"ISO","reason":"string"} | 201 JaringCaretakerAssignmentResponse | Transaction close old caretaker and create new; validate role, area overlap and command branch. Exactly one active caretaker. |

**Applicable shared forms**

- `F-JARING-TRANSFER`
- `F-JARING-COVERAGE`

**Inherited page rules**

- Only Jaring and personnel inside command chain

#### `/dashboard/field-coordinator/laporan-darurat/[incidentId]`

- **File:** `src/app/dashboard/field-coordinator/laporan-darurat/[incidentId]/page.tsx`
- **Resource:** `EmergencyIncident`
- **Page type:** `detail-action`
- **Purpose:** Emergency response

**Flow**

1. Load detail, timeline, related records, and available actions.
2. Render actions only from the server-provided capability set.
3. Execute explicit actions and refresh the authoritative detail.

**Displayed sections**

- Situation
- Severity
- Status
- Location map
- Reporter
- Action taken
- Needs
- Timeline
- Attachments

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/emergency-incidents/{incidentId}` | Detail insiden | `emergency.read` | Query: include=attachments,alerts,timeline | EmergencyIncidentDetail | Load scoped incident. Sensitive coordinates only to authorized command. |
| `POST` | `/emergency-incidents/{incidentId}/acknowledge` | Acknowledge insiden | `emergency.manage` | {"note":"string optional"} | EmergencyIncidentDetail | NEW→ACKNOWLEDGED. Authorized command/picket. |
| `POST` | `/emergency-incidents/{incidentId}/verify` | Verifikasi cepat | `emergency.verify` | {"note":"string","verifiedSeverity":"CRITICAL"} | EmergencyIncidentDetail | ACKNOWLEDGED/NEW→VERIFIED; record verifier in audit (schema may add field). Fast verification does not replace later formal report. |
| `POST` | `/emergency-incidents/{incidentId}/start-response` | Mulai penanganan | `emergency.manage` | {"actionPlan":"string optional"} | EmergencyIncidentDetail | VERIFIED/ACKNOWLEDGED→IN_PROGRESS. Notify involved positions. |
| `POST` | `/emergency-incidents/{incidentId}/mark-controlled` | Tandai situasi terkendali | `emergency.manage` | {"note":"string"} | EmergencyIncidentDetail | IN_PROGRESS→CONTROLLED. Reason/note required. |
| `POST` | `/emergency-incidents/{incidentId}/resolve` | Selesaikan insiden | `emergency.manage` | {"resolution":"string","resolvedAt":"ISO optional"} | EmergencyIncidentDetail | CONTROLLED/IN_PROGRESS→RESOLVED; set resolvedAt. Open critical alerts must be resolved/linked. |

**Applicable shared forms**

- `F-EMERGENCY-ACTION`

**Inherited page rules**

- Direct command chain only

#### `/dashboard/field-coordinator/peta-lapangan/tugas/[taskId]`

- **File:** `src/app/dashboard/field-coordinator/peta-lapangan/tugas/[taskId]/page.tsx`
- **Resource:** `Task / Baket / Personnel / Emergency`
- **Page type:** `detail`
- **Purpose:** Task deep-link

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Task identity
- Directive/UUK source
- Target areas
- Priority
- Due date
- Assignments
- Progress
- Outputs

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/tasks/{taskId}` | Detail tugas | `task.read` | Query: include=assignments,targetAreas,attachments,parent,children | TaskDetail | Load scoped task and relations. Classified 404 masking. |
| `GET` | `/tasks/{taskId}/assignments` | Daftar assignment tugas | `task.read` | Query: status?,page,limit | Paged<TaskAssignmentDetail> | Query by taskId with scoped visibility. Managers see subordinates; assignee sees own. |
| `GET` | `/tasks/{taskId}/progress-summary` | Ringkasan progress | `task.read` | Query: groupBy=unit\|area\|position | TaskProgressSummaryResponse | Aggregate assignment statuses, overdue, latest progress by group. Same security filter as task list. |

**Inherited page rules**

- Task-target map requires GAP-MAP-001 or client transform from tasks

#### `/dashboard/field-coordinator/peta-lapangan/baket/[baketId]`

- **File:** `src/app/dashboard/field-coordinator/peta-lapangan/baket/[baketId]/page.tsx`
- **Resource:** `Task / Baket / Personnel / Emergency`
- **Page type:** `detail`
- **Purpose:** Report deep-link

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Task identity
- Directive/UUK source
- Target areas
- Priority
- Due date
- Assignments
- Progress
- Outputs

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/bakets/{baketId}` | Detail Baket current version | `baket.read` | Query: include=versions,sources,attachments,revisionRequests,verification | BaketDetail | Load root/current version/traceability under access context. Verified data read-only for lower unit. |
| `GET` | `/bakets/{baketId}/timeline` | Timeline Baket | `baket.read` | Tidak ada body | TimelineResponse | Merge versions, status events, revision requests, verification, audit events sorted time. Field-level redaction. |
| `GET` | `/bakets/{baketId}/traceability` | Traceability sumber-ke-produk | `baket.read` | Tidak ada body | BaketTraceabilityResponse | Graph source messages→versions→verification→analysis→products→approvals/distributions. Only nodes caller can access; report redacted node counts if policy allows. |

**Inherited page rules**

- Task-target map requires GAP-MAP-001 or client transform from tasks

#### `/dashboard/field-coordinator/peta-lapangan/personel/[assignmentId]`

- **File:** `src/app/dashboard/field-coordinator/peta-lapangan/personel/[assignmentId]/page.tsx`
- **Resource:** `Task / Baket / Personnel / Emergency`
- **Page type:** `detail`
- **Purpose:** Personnel deep-link

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Task identity
- Directive/UUK source
- Target areas
- Priority
- Due date
- Assignments
- Progress
- Outputs

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/position-assignments/{assignmentId}` | Detail assignment | `assignment.read` | Query: include=areaScopes,user,position | PositionAssignmentDetail | Load scoped assignment. 404 if inaccessible. |
| `GET` | `/position-assignments/{assignmentId}/area-scopes` | Ambil scope assignment | `area.scope.read` | Query: activeOnly=true,expand=false | List<PositionAreaScopeResponse> | Read scopes and optional descendants. No out-of-scope leakage. |
| `GET` | `/personnel-location-pings/{assignmentId}/latest` | Lokasi terbaru bawahan | `location.read` | Tidak ada body | PersonnelLocationPingResponse | Verify direct command chain, permission, retention and stealth policy; latest index query. Every access audited. |
| `GET` | `/personnel-location-pings/{assignmentId}/history` | Riwayat lokasi bawahan | `location.read-history` | Query: from,to,cursor,limit<=1000 | CursorPage<PersonnelLocationPingResponse> | Range query by assignment/capturedAt. Strict purpose/reason header may be required; retention cap. |

**Inherited page rules**

- Task-target map requires GAP-MAP-001 or client transform from tasks

#### `/dashboard/field-coordinator/peta-lapangan/darurat/[incidentId]`

- **File:** `src/app/dashboard/field-coordinator/peta-lapangan/darurat/[incidentId]/page.tsx`
- **Resource:** `Task / Baket / Personnel / Emergency`
- **Page type:** `detail-action`
- **Purpose:** Emergency deep-link

**Flow**

1. Load detail, timeline, related records, and available actions.
2. Render actions only from the server-provided capability set.
3. Execute explicit actions and refresh the authoritative detail.

**Displayed sections**

- Task identity
- Directive/UUK source
- Target areas
- Priority
- Due date
- Assignments
- Progress
- Outputs

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/emergency-incidents/{incidentId}` | Detail insiden | `emergency.read` | Query: include=attachments,alerts,timeline | EmergencyIncidentDetail | Load scoped incident. Sensitive coordinates only to authorized command. |
| `POST` | `/emergency-incidents/{incidentId}/acknowledge` | Acknowledge insiden | `emergency.manage` | {"note":"string optional"} | EmergencyIncidentDetail | NEW→ACKNOWLEDGED. Authorized command/picket. |
| `POST` | `/emergency-incidents/{incidentId}/verify` | Verifikasi cepat | `emergency.verify` | {"note":"string","verifiedSeverity":"CRITICAL"} | EmergencyIncidentDetail | ACKNOWLEDGED/NEW→VERIFIED; record verifier in audit (schema may add field). Fast verification does not replace later formal report. |
| `POST` | `/emergency-incidents/{incidentId}/start-response` | Mulai penanganan | `emergency.manage` | {"actionPlan":"string optional"} | EmergencyIncidentDetail | VERIFIED/ACKNOWLEDGED→IN_PROGRESS. Notify involved positions. |
| `POST` | `/emergency-incidents/{incidentId}/mark-controlled` | Tandai situasi terkendali | `emergency.manage` | {"note":"string"} | EmergencyIncidentDetail | IN_PROGRESS→CONTROLLED. Reason/note required. |
| `POST` | `/emergency-incidents/{incidentId}/resolve` | Selesaikan insiden | `emergency.manage` | {"resolution":"string","resolvedAt":"ISO optional"} | EmergencyIncidentDetail | CONTROLLED/IN_PROGRESS→RESOLVED; set resolvedAt. Open critical alerts must be resolved/linked. |

**Inherited page rules**

- Task-target map requires GAP-MAP-001 or client transform from tasks

### 5.7 Field Officer

#### `/dashboard/field-officer/kotak-masuk-jaring/[messageId]`

- **File:** `src/app/dashboard/field-officer/kotak-masuk-jaring/[messageId]/page.tsx`
- **Resource:** `WhatsAppMessage`
- **Page type:** `detail-action`
- **Purpose:** Raw message, media, location, validation

**Flow**

1. Load detail, timeline, related records, and available actions.
2. Render actions only from the server-provided capability set.
3. Execute explicit actions and refresh the authoritative detail.

**Displayed sections**

- Immutable raw message
- Sender/Jaring
- Media
- Coordinates
- Resolved area
- Validation issues
- Routing history

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/whatsapp-messages/{messageId}` | Detail pesan WhatsApp | `whatsapp.read` | Query: include=media,routingLogs,rawPayload(false) | WhatsAppMessageDetail | Authorize via routed Field Officer, caretaker, command chain; fetch media and area breadcrumb. rawPayload requires whatsapp.raw.read and audit. |
| `GET` | `/whatsapp-messages/{messageId}/routing-logs` | Riwayat routing | `whatsapp.read` | Tidak ada body | List<WhatsAppRoutingLogResponse> | Query messageId order createdAt. Append-only. |
| `POST` | `/whatsapp-messages/{messageId}/validate` | Validasi format laporan | `whatsapp.validate` | {"forceRevalidate":false} | WhatsAppValidationResponse | Check title, photo media, GPS pair, content; persist summary/issues per final schema; set validationStatus. One message may have multiple issues; endpoint should return all. |
| `POST` | `/whatsapp-messages/{messageId}/resolve-area` | Resolve GPS ke area | `whatsapp.resolve` | {"force":false} | CoordinateResolutionResponse | Use locationPoint or lat/lng; ST_Covers active boundaries; update resolvedAreaId/method/confidence/time. Do not discard original coordinates. |
| `POST` | `/whatsapp-messages/{messageId}/mark-duplicate` | Tandai duplikat | `whatsapp.moderate` | {"canonicalMessageId":"uuid","reason":"string"} | WhatsAppMessageDetail | Set DUPLICATE and record canonical reference in metadata/routing note. Canonical must be accessible and not self. |
| `POST` | `/whatsapp-messages/{messageId}/mark-spam` | Tandai spam | `whatsapp.moderate` | {"reason":"string"} | WhatsAppMessageDetail | Set SPAM and routing log; no delete. Cannot mark linked processed Baket as spam without supervisor review. |
| `POST` | `/whatsapp-messages/{messageId}/create-baket` | Buat Baket dari pesan | `baket.create` | {"title":"... optional","taskAssignmentId":"uuid optional","additionalMessageIds":[]} | 201 BaketDetail | Validate caller Field Officer is routed caretaker; create Baket/version1/source links; copy original content/GPS/area; do not mutate message. Idempotency prevents duplicate Baket for same request. |

**Applicable shared forms**

- `F-WHATSAPP-VALIDATE`
- `F-WHATSAPP-DUPLICATE`

**Inherited page rules**

- Raw message immutable
- Only routed messages visible

#### `/dashboard/field-officer/buat-baket/[baketId]/edit`

- **File:** `src/app/dashboard/field-officer/buat-baket/[baketId]/edit/page.tsx`
- **Resource:** `Baket`
- **Page type:** `wizard`
- **Purpose:** Continue editing draft Baket

**Flow**

1. Load reference data and permitted selectable resources.
2. Persist a draft before advancing beyond the first meaningful step.
3. Validate each step on the client for usability and again on the server for authority.
4. Submit the final immutable version using an explicit action endpoint.
5. Redirect to the canonical detail or tracking route.

**Displayed sections**

- Current version
- 5W+1H content
- Event time/location
- Sources
- Attachments
- Coverage checks
- Timeline
- Revision requests

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/bakets/{baketId}` | Detail Baket current version | `baket.read` | Query: include=versions,sources,attachments,revisionRequests,verification | BaketDetail | Load root/current version/traceability under access context. Verified data read-only for lower unit. |
| `GET` | `/bakets/{baketId}/timeline` | Timeline Baket | `baket.read` | Tidak ada body | TimelineResponse | Merge versions, status events, revision requests, verification, audit events sorted time. Field-level redaction. |
| `GET` | `/bakets/{baketId}/traceability` | Traceability sumber-ke-produk | `baket.read` | Tidak ada body | BaketTraceabilityResponse | Graph source messages→versions→verification→analysis→products→approvals/distributions. Only nodes caller can access; report redacted node counts if policy allows. |
| `PATCH` | `/baket-versions/{versionId}` | Edit versi draft | `baket.update` | {"title?":"...","originalContent?":"...","normalizedContent?":"...","eventTime?":"ISO","latitude?":0,"longitude?":0,"urgency?":"HIGH","fieldOfficerNote?":"..."} | BaketVersionDetail | Only current version while Baket DRAFT/NEEDS_DEVELOPMENT and not submitted. Coordinates must be pair; any change reruns resolution. |
| `PUT` | `/bakets/{baketId}/source-messages` | Ganti/tambah sumber pesan draft | `baket.update` | {"messageIds":["uuid"]} | List<WhatsAppMessageSummary> | Validate caller access to messages; replace links only before submit. At least one source if no task assignment. |
| `PUT` | `/bakets/{baketId}/attachments` | Ganti lampiran draft | `baket.update` | {"attachments":[{"fileId":"uuid","caption":"..."}]} | List<FileAssetResponse> | Validate clean files and ownership; replace links. Evidence preserved after submit. |
| `POST` | `/baket-versions/{versionId}/resolve-area` | Resolve ulang area Baket | `baket.update` | {"force":false} | CoordinateResolutionResponse | ST_Covers coordinate; update eventAreaId/method/confidence/time. Cannot alter submitted version except system correction policy creates new version. |
| `POST` | `/baket-versions/{versionId}/validate-coverage` | Validasi coverage berlapis | `baket.update` | {"scopeTypes":["JARING","FIELD_OFFICER","FIELD_COORDINATOR","ORGANIZATION_UNIT"]} | CoverageValidationResponse | Compare eventArea against active coverages via closure; return per-layer detail and persist summary. Out-of-scope does not auto-reject. |

**Applicable shared forms**

- `F-BAKET-DRAFT`
- `F-MANUAL-AREA-OVERRIDE`

**Inherited page rules**

- No A-F/1-6 fields
- Original WhatsApp immutable
- Draft autosave allowed

#### `/dashboard/field-officer/kirim-baket/[baketId]`

- **File:** `src/app/dashboard/field-officer/kirim-baket/[baketId]/page.tsx`
- **Resource:** `Baket`
- **Page type:** `review-submit`
- **Purpose:** Completeness and submission review

**Flow**

1. Load the current draft version, completeness result, source links, and available actions.
2. Display blocking errors separately from warnings requiring confirmation.
3. Submit with Idempotency-Key and If-Match.
4. Redirect to the submitted detail/timeline and invalidate receiving queues.

**Displayed sections**

- Current version
- 5W+1H content
- Event time/location
- Sources
- Attachments
- Coverage checks
- Timeline
- Revision requests

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/bakets/{baketId}` | Detail Baket current version | `baket.read` | Query: include=versions,sources,attachments,revisionRequests,verification | BaketDetail | Load root/current version/traceability under access context. Verified data read-only for lower unit. |
| `GET` | `/bakets/{baketId}/timeline` | Timeline Baket | `baket.read` | Tidak ada body | TimelineResponse | Merge versions, status events, revision requests, verification, audit events sorted time. Field-level redaction. |
| `GET` | `/bakets/{baketId}/traceability` | Traceability sumber-ke-produk | `baket.read` | Tidak ada body | BaketTraceabilityResponse | Graph source messages→versions→verification→analysis→products→approvals/distributions. Only nodes caller can access; report redacted node counts if policy allows. |
| `GET` | `/bakets/{baketId}/revision-requests` | Daftar permintaan revisi | `baket.read` | Query: status? | List<BaketRevisionRequestResponse> | Query by baketId order createdAt desc. Scoped. |
| `POST` | `/bakets/{baketId}/submit` | Kirim Baket ke OIM | `baket.submit` | {"confirmation":"SUBMIT"} | BaketDetail | Validate current version completeness, source/task, coordinates/area warning, attachments policy; set SENT_TO_OIM; resolve target OIM from reporting branch; notify. Field Officer only; idempotency. |
| `POST` | `/bakets/{baketId}/resubmit` | Kirim ulang setelah revisi | `baket.submit` | {"versionId":"uuid","revisionRequestId":"uuid"} | BaketDetail | Ensure new version resolves open request; set RESUBMITTED/request IN_PROGRESS→RESUBMITTED and Baket SENT_TO_OIM. Version must be newer than requested-against. |

**Applicable shared forms**

- `F-BAKET-SUBMIT`

**Inherited page rules**

- Idempotency-Key and If-Match
- Target OIM resolved by reporting branch

#### `/dashboard/field-officer/laporan-saya/[baketId]`

- **File:** `src/app/dashboard/field-officer/laporan-saya/[baketId]/page.tsx`
- **Resource:** `Baket`
- **Page type:** `detail`
- **Purpose:** Own Baket and timeline

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Current version
- 5W+1H content
- Event time/location
- Sources
- Attachments
- Coverage checks
- Timeline
- Revision requests

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/bakets/{baketId}` | Detail Baket current version | `baket.read` | Query: include=versions,sources,attachments,revisionRequests,verification | BaketDetail | Load root/current version/traceability under access context. Verified data read-only for lower unit. |
| `GET` | `/bakets/{baketId}/timeline` | Timeline Baket | `baket.read` | Tidak ada body | TimelineResponse | Merge versions, status events, revision requests, verification, audit events sorted time. Field-level redaction. |
| `GET` | `/bakets/{baketId}/traceability` | Traceability sumber-ke-produk | `baket.read` | Tidak ada body | BaketTraceabilityResponse | Graph source messages→versions→verification→analysis→products→approvals/distributions. Only nodes caller can access; report redacted node counts if policy allows. |

**Applicable shared forms**

- `F-BAKET-REVISION`

**Inherited page rules**

- Only own Baket

#### `/dashboard/field-officer/laporan-saya/[baketId]/revisi`

- **File:** `src/app/dashboard/field-officer/laporan-saya/[baketId]/revisi/page.tsx`
- **Resource:** `Baket`
- **Page type:** `wizard`
- **Purpose:** Create revision version

**Flow**

1. Load reference data and permitted selectable resources.
2. Persist a draft before advancing beyond the first meaningful step.
3. Validate each step on the client for usability and again on the server for authority.
4. Submit the final immutable version using an explicit action endpoint.
5. Redirect to the canonical detail or tracking route.

**Displayed sections**

- Current version
- 5W+1H content
- Event time/location
- Sources
- Attachments
- Coverage checks
- Timeline
- Revision requests

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/bakets/{baketId}` | Detail Baket current version | `baket.read` | Query: include=versions,sources,attachments,revisionRequests,verification | BaketDetail | Load root/current version/traceability under access context. Verified data read-only for lower unit. |
| `GET` | `/bakets/{baketId}/timeline` | Timeline Baket | `baket.read` | Tidak ada body | TimelineResponse | Merge versions, status events, revision requests, verification, audit events sorted time. Field-level redaction. |
| `GET` | `/bakets/{baketId}/traceability` | Traceability sumber-ke-produk | `baket.read` | Tidak ada body | BaketTraceabilityResponse | Graph source messages→versions→verification→analysis→products→approvals/distributions. Only nodes caller can access; report redacted node counts if policy allows. |
| `GET` | `/bakets/{baketId}/revision-requests` | Daftar permintaan revisi | `baket.read` | Query: status? | List<BaketRevisionRequestResponse> | Query by baketId order createdAt desc. Scoped. |
| `POST` | `/bakets/{baketId}/versions` | Buat versi revisi Baket | `baket.update` | {"basedOnVersionId":"uuid","revisionReason":"string","patch":{"title":"...","originalContent":"...","normalizedContent":"...","eventTime":"ISO","latitude":0,"longitude":0,"fieldOfficerNote":"..."}} | 201 BaketVersionDetail | Clone prior, apply correction, resolve area/coverage, increment current version. Allowed owner Field Officer only when DRAFT or NEEDS_DEVELOPMENT. |
| `POST` | `/bakets/{baketId}/resubmit` | Kirim ulang setelah revisi | `baket.submit` | {"versionId":"uuid","revisionRequestId":"uuid"} | BaketDetail | Ensure new version resolves open request; set RESUBMITTED/request IN_PROGRESS→RESUBMITTED and Baket SENT_TO_OIM. Version must be newer than requested-against. |

**Applicable shared forms**

- `F-BAKET-REVISION`

**Inherited page rules**

- Only own Baket

#### `/dashboard/field-officer/laporan-saya/[baketId]/versions/[versionId]`

- **File:** `src/app/dashboard/field-officer/laporan-saya/[baketId]/versions/[versionId]/page.tsx`
- **Resource:** `Baket`
- **Page type:** `version-detail`
- **Purpose:** Version detail

**Flow**

1. Load the exact historical version by path parameter.
2. Render it read-only with change reason, creator, timestamp, and source links.
3. Provide navigation to adjacent versions and the root resource.

**Displayed sections**

- Current version
- 5W+1H content
- Event time/location
- Sources
- Attachments
- Coverage checks
- Timeline
- Revision requests

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/bakets/{baketId}` | Detail Baket current version | `baket.read` | Query: include=versions,sources,attachments,revisionRequests,verification | BaketDetail | Load root/current version/traceability under access context. Verified data read-only for lower unit. |
| `GET` | `/bakets/{baketId}/timeline` | Timeline Baket | `baket.read` | Tidak ada body | TimelineResponse | Merge versions, status events, revision requests, verification, audit events sorted time. Field-level redaction. |
| `GET` | `/bakets/{baketId}/traceability` | Traceability sumber-ke-produk | `baket.read` | Tidak ada body | BaketTraceabilityResponse | Graph source messages→versions→verification→analysis→products→approvals/distributions. Only nodes caller can access; report redacted node counts if policy allows. |
| `GET` | `/baket-versions/{versionId}` | Detail versi Baket | `baket.read` | Tidak ada body | BaketVersionDetail | Read exact snapshot with area breadcrumb. Scoped. |

**Applicable shared forms**

- `F-BAKET-REVISION`

**Inherited page rules**

- Only own Baket

#### `/dashboard/field-officer/tugas-saya/[assignmentId]`

- **File:** `src/app/dashboard/field-officer/tugas-saya/[assignmentId]/page.tsx`
- **Resource:** `TaskAssignment`
- **Page type:** `detail-action`
- **Purpose:** Task detail, progress, completion

**Flow**

1. Load detail, timeline, related records, and available actions.
2. Render actions only from the server-provided capability set.
3. Execute explicit actions and refresh the authoritative detail.

**Displayed sections**

- Task identity
- Directive/UUK source
- Target areas
- Priority
- Due date
- Assignments
- Progress
- Outputs

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/task-assignments/{assignmentId}` | Detail task assignment | `task.read` | Query: include=progress,bakets | TaskAssignmentDetail | Authorize assignee/assigner/command chain. 404 if inaccessible. |
| `POST` | `/task-assignments/{assignmentId}/mark-read` | Tandai tugas dibaca | `task.execute` | Tidak ada body | TaskAssignmentDetail | Set readAt once; SENT→READ. Assignee only; idempotent. |
| `POST` | `/task-assignments/{assignmentId}/acknowledge` | Terima tugas | `task.execute` | {"note":"string optional"} | TaskAssignmentDetail | Set acknowledgedAt; status READ/SENT→ACKNOWLEDGED. Assignee only. |
| `POST` | `/task-assignments/{assignmentId}/start` | Mulai pengerjaan | `task.execute` | Tidak ada body | TaskAssignmentDetail | Set startedAt; status ACKNOWLEDGED→IN_PROGRESS; update parent task aggregate. Must acknowledge first unless policy auto-ack. |
| `POST` | `/task-assignments/{assignmentId}/progress` | Tambah progress log | `task.execute` | {"progressPercent":60,"note":"...","status":"IN_PROGRESS"} | 201 TaskProgressLogResponse | Insert append-only progress log; update assignment status/timestamps if valid transition. Percent 0..100; cannot decrease without correction reason. |
| `POST` | `/task-assignments/{assignmentId}/complete` | Selesaikan assignment | `task.execute` | {"note":"...","completionEvidenceFileIds":[]} | TaskAssignmentDetail | Validate required outputs/Baket as task policy; set COMPLETED/100%; recalc task completion. Cannot complete cancelled/reassigned. |
| `POST` | `/task-assignments/{assignmentId}/reassign` | Alihkan assignment | `task.reassign` | {"newAssigneeAssignmentId":"uuid","reason":"string","dueDate":"ISO optional"} | 201 TaskAssignmentDetail | Transaction mark old REASSIGNED, create new linked reassignedFromId, copy task, notify both. Validate chain/scope; idempotency. |

**Applicable shared forms**

- `F-TASK-PROGRESS`
- `F-TASK-COMPLETE`

**Inherited page rules**

- Complete may require evidence/Baket

#### `/dashboard/field-officer/jaring-binaan/baru`

- **File:** `src/app/dashboard/field-officer/jaring-binaan/baru/page.tsx`
- **Resource:** `Jaring`
- **Page type:** `create`
- **Purpose:** Register Jaring if permitted

**Flow**

1. Load reference data and eligible relationships.
2. Validate the form locally and on the server.
3. Create the resource or draft in one transaction.
4. Redirect to the canonical detail/edit route returned by the API.

**Displayed sections**

- Code and alias
- Masked WhatsApp
- Status
- Active caretaker
- Coverage
- Message history
- Related Baket

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/administrative-areas/tree` | Cascading tree wilayah | `area.read` | Query: rootId?,maxDepth=3,levels?,includeBoundaryStatus=true | AdministrativeAreaTreeResponse | Fetch closure descendants; annotate boundary availability and childCount. Payload depth capped. |
| `POST` | `/jaring` | Daftarkan Jaring | `jaring.create` | {"code":"...","aliasName":"...","whatsappNumber":"628...","notes":"...","caretakerAssignmentId":"uuid","areaCoverages":[{"areaId":"uuid","isPrimary":true}]} | 201 JaringDetail | Normalize phone; validate unique active number; validate caretaker is active FIELD_OFFICER and coverage subset; transaction create all. Jaring has no auth account. |

**Applicable shared forms**

- `F-JARING`
- `F-JARING-COVERAGE`

**Inherited page rules**

- Field Officer manages assigned Jaring only

#### `/dashboard/field-officer/jaring-binaan/[jaringId]`

- **File:** `src/app/dashboard/field-officer/jaring-binaan/[jaringId]/page.tsx`
- **Resource:** `Jaring`
- **Page type:** `detail`
- **Purpose:** Jaring, coverage, messages

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Code and alias
- Masked WhatsApp
- Status
- Active caretaker
- Coverage
- Message history
- Related Baket

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/jaring/{jaringId}` | Detail Jaring | `jaring.read` | Query: include=caretakers,coverages,stats | JaringDetail | Scoped by caretaker/command chain/area. Sensitive identity redacted based on permission. |
| `GET` | `/jaring/{jaringId}/area-coverages` | Coverage Jaring | `jaring.read` | Query: activeOnly=true,expand=false | List<JaringAreaCoverageResponse> | Read coverages. Sensitive scope visibility restricted. |
| `GET` | `/jaring/{jaringId}/caretakers` | Riwayat caretaker | `jaring.read` | Query: activeOnly=false | List<JaringCaretakerAssignmentResponse> | Order validFrom desc. Scoped. |
| `GET` | `/jaring/{jaringId}/messages` | Pesan WhatsApp milik Jaring | `whatsapp.read` | Query: cursor,limit,status,from,to | CursorPage<WhatsAppMessageSummary> | Filter jaringId and scope; order receivedAt desc. Raw payload not included. |
| `GET` | `/jaring/{jaringId}/bakets` | Baket terkait Jaring | `baket.read` | Query: page,limit,status | Paged<BaketSummary> | Query primaryJaringId or source messages linked to Jaring. Need-to-know applies. |

**Applicable shared forms**

- `F-JARING`
- `F-JARING-COVERAGE`

**Inherited page rules**

- Field Officer manages assigned Jaring only

#### `/dashboard/field-officer/jaring-binaan/[jaringId]/edit`

- **File:** `src/app/dashboard/field-officer/jaring-binaan/[jaringId]/edit/page.tsx`
- **Resource:** `Jaring`
- **Page type:** `edit`
- **Purpose:** Edit permitted Jaring fields

**Flow**

1. Load the editable draft and ETag/version token.
2. Submit only permitted fields with If-Match.
3. Handle 409 conflicts without overwriting newer data.

**Displayed sections**

- Code and alias
- Masked WhatsApp
- Status
- Active caretaker
- Coverage
- Message history
- Related Baket

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/jaring/{jaringId}` | Detail Jaring | `jaring.read` | Query: include=caretakers,coverages,stats | JaringDetail | Scoped by caretaker/command chain/area. Sensitive identity redacted based on permission. |
| `GET` | `/jaring/{jaringId}/area-coverages` | Coverage Jaring | `jaring.read` | Query: activeOnly=true,expand=false | List<JaringAreaCoverageResponse> | Read coverages. Sensitive scope visibility restricted. |
| `GET` | `/jaring/{jaringId}/caretakers` | Riwayat caretaker | `jaring.read` | Query: activeOnly=false | List<JaringCaretakerAssignmentResponse> | Order validFrom desc. Scoped. |
| `GET` | `/jaring/{jaringId}/messages` | Pesan WhatsApp milik Jaring | `whatsapp.read` | Query: cursor,limit,status,from,to | CursorPage<WhatsAppMessageSummary> | Filter jaringId and scope; order receivedAt desc. Raw payload not included. |
| `GET` | `/jaring/{jaringId}/bakets` | Baket terkait Jaring | `baket.read` | Query: page,limit,status | Paged<BaketSummary> | Query primaryJaringId or source messages linked to Jaring. Need-to-know applies. |
| `PATCH` | `/jaring/{jaringId}` | Ubah metadata Jaring | `jaring.update` | {"aliasName?":"...","notes?":"...","whatsappNumber?":"628..."} | JaringDetail | Normalize/validate phone; mutable while not ARCHIVED. Caretaker/coverage/status not changed here. |
| `PUT` | `/jaring/{jaringId}/area-coverages` | Ganti coverage Jaring | `jaring.coverage.manage` | {"areas":[{"areaId":"uuid","isPrimary":true}],"effectiveAt":"ISO","reason":"string"} | List<JaringAreaCoverageResponse> | Validate local levels and subset of caretaker assignment scope; close/insert transaction. At least one primary area. |

**Applicable shared forms**

- `F-JARING`
- `F-JARING-COVERAGE`

**Inherited page rules**

- Field Officer manages assigned Jaring only

#### `/dashboard/field-officer/laporan-darurat/[incidentId]`

- **File:** `src/app/dashboard/field-officer/laporan-darurat/[incidentId]/page.tsx`
- **Resource:** `EmergencyIncident`
- **Page type:** `detail`
- **Purpose:** Submitted emergency report status

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Situation
- Severity
- Status
- Location map
- Reporter
- Action taken
- Needs
- Timeline
- Attachments

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/emergency-incidents/{incidentId}` | Detail insiden | `emergency.read` | Query: include=attachments,alerts,timeline | EmergencyIncidentDetail | Load scoped incident. Sensitive coordinates only to authorized command. |
| `POST` | `/emergency-incidents/{incidentId}/acknowledge` | Acknowledge insiden | `emergency.manage` | {"note":"string optional"} | EmergencyIncidentDetail | NEW→ACKNOWLEDGED. Authorized command/picket. |
| `POST` | `/emergency-incidents/{incidentId}/verify` | Verifikasi cepat | `emergency.verify` | {"note":"string","verifiedSeverity":"CRITICAL"} | EmergencyIncidentDetail | ACKNOWLEDGED/NEW→VERIFIED; record verifier in audit (schema may add field). Fast verification does not replace later formal report. |
| `POST` | `/emergency-incidents/{incidentId}/start-response` | Mulai penanganan | `emergency.manage` | {"actionPlan":"string optional"} | EmergencyIncidentDetail | VERIFIED/ACKNOWLEDGED→IN_PROGRESS. Notify involved positions. |
| `POST` | `/emergency-incidents/{incidentId}/mark-controlled` | Tandai situasi terkendali | `emergency.manage` | {"note":"string"} | EmergencyIncidentDetail | IN_PROGRESS→CONTROLLED. Reason/note required. |
| `POST` | `/emergency-incidents/{incidentId}/resolve` | Selesaikan insiden | `emergency.manage` | {"resolution":"string","resolvedAt":"ISO optional"} | EmergencyIncidentDetail | CONTROLLED/IN_PROGRESS→RESOLVED; set resolvedAt. Open critical alerts must be resolved/linked. |

**Applicable shared forms**

- `F-EMERGENCY-CREATE`

**Inherited page rules**

- Must work without GPS
- Idempotency-Key
- One-task-per-screen mobile

#### `/dashboard/field-officer/peta-tugas/tugas/[assignmentId]`

- **File:** `src/app/dashboard/field-officer/peta-tugas/tugas/[assignmentId]/page.tsx`
- **Resource:** `TaskAssignment / Baket`
- **Page type:** `detail-action`
- **Purpose:** Task deep-link

**Flow**

1. Load detail, timeline, related records, and available actions.
2. Render actions only from the server-provided capability set.
3. Execute explicit actions and refresh the authoritative detail.

**Displayed sections**

- Task identity
- Directive/UUK source
- Target areas
- Priority
- Due date
- Assignments
- Progress
- Outputs

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/task-assignments/{assignmentId}` | Detail task assignment | `task.read` | Query: include=progress,bakets | TaskAssignmentDetail | Authorize assignee/assigner/command chain. 404 if inaccessible. |
| `POST` | `/task-assignments/{assignmentId}/mark-read` | Tandai tugas dibaca | `task.execute` | Tidak ada body | TaskAssignmentDetail | Set readAt once; SENT→READ. Assignee only; idempotent. |
| `POST` | `/task-assignments/{assignmentId}/acknowledge` | Terima tugas | `task.execute` | {"note":"string optional"} | TaskAssignmentDetail | Set acknowledgedAt; status READ/SENT→ACKNOWLEDGED. Assignee only. |
| `POST` | `/task-assignments/{assignmentId}/start` | Mulai pengerjaan | `task.execute` | Tidak ada body | TaskAssignmentDetail | Set startedAt; status ACKNOWLEDGED→IN_PROGRESS; update parent task aggregate. Must acknowledge first unless policy auto-ack. |
| `POST` | `/task-assignments/{assignmentId}/progress` | Tambah progress log | `task.execute` | {"progressPercent":60,"note":"...","status":"IN_PROGRESS"} | 201 TaskProgressLogResponse | Insert append-only progress log; update assignment status/timestamps if valid transition. Percent 0..100; cannot decrease without correction reason. |
| `POST` | `/task-assignments/{assignmentId}/complete` | Selesaikan assignment | `task.execute` | {"note":"...","completionEvidenceFileIds":[]} | TaskAssignmentDetail | Validate required outputs/Baket as task policy; set COMPLETED/100%; recalc task completion. Cannot complete cancelled/reassigned. |
| `POST` | `/task-assignments/{assignmentId}/reassign` | Alihkan assignment | `task.reassign` | {"newAssigneeAssignmentId":"uuid","reason":"string","dueDate":"ISO optional"} | 201 TaskAssignmentDetail | Transaction mark old REASSIGNED, create new linked reassignedFromId, copy task, notify both. Validate chain/scope; idempotency. |

**Inherited page rules**

- Task-target GeoJSON requires GAP-MAP-001 or client-derived centroids

#### `/dashboard/field-officer/peta-tugas/baket/[baketId]`

- **File:** `src/app/dashboard/field-officer/peta-tugas/baket/[baketId]/page.tsx`
- **Resource:** `TaskAssignment / Baket`
- **Page type:** `detail`
- **Purpose:** Own report deep-link

**Flow**

1. Load the resource by dynamic path parameter.
2. Apply backend authorization and masked not-found behavior.
3. Render related records, timeline, and server-calculated available actions.

**Displayed sections**

- Task identity
- Directive/UUK source
- Target areas
- Priority
- Due date
- Assignments
- Progress
- Outputs

**API mapping**

| Method | Path | Purpose | Permission | Request/query contract | Response | Query/business logic |
|---|---|---|---|---|---|---|
| `GET` | `/bakets/{baketId}` | Detail Baket current version | `baket.read` | Query: include=versions,sources,attachments,revisionRequests,verification | BaketDetail | Load root/current version/traceability under access context. Verified data read-only for lower unit. |
| `GET` | `/bakets/{baketId}/timeline` | Timeline Baket | `baket.read` | Tidak ada body | TimelineResponse | Merge versions, status events, revision requests, verification, audit events sorted time. Field-level redaction. |
| `GET` | `/bakets/{baketId}/traceability` | Traceability sumber-ke-produk | `baket.read` | Tidak ada body | BaketTraceabilityResponse | Graph source messages→versions→verification→analysis→products→approvals/distributions. Only nodes caller can access; report redacted node counts if policy allows. |

**Inherited page rules**

- Task-target GeoJSON requires GAP-MAP-001 or client-derived centroids

## 6. Form and Payload Catalog

Path parameters identify the selected resource. Filters belong in URL search params. Mutation data belongs in JSON request bodies. File contents use the presign/complete upload flow and domain payloads carry only `fileId` references.

### `F-PROFILE-METADATA`

**Endpoint:** `PATCH /api/v1/user-profiles/{userProfileId}`

**Body**

```json
{
  "fullName": "string",
  "phone": "string|null",
  "username": "string|null"
}
```

**Rules**

- Self-service fields only; role, clearance, assignment are excluded.

### `F-USER-PROVISION`

**Endpoint:** `POST /api/v1/user-profiles/provision`

**Body**

```json
{
  "name": "string",
  "email": "string",
  "authRole": "field_officer",
  "username": "string|null",
  "fullName": "string",
  "phone": "string|null",
  "clearanceLevel": "TERBATAS",
  "positionId": "uuid",
  "areaScopeIds": [
    "uuid"
  ],
  "isPrimary": true
}
```

**Rules**

- Atomic Better Auth user + profile + primary assignment + area scopes.
- Profile remains PENDING until activation checks pass.

### `F-USER-METADATA`

**Endpoint:** `PATCH /api/v1/user-profiles/{userProfileId}`

**Body**

```json
{
  "fullName": "string",
  "phone": "string|null",
  "clearanceLevel": "RAHASIA"
}
```

**Rules**

- Clearance update requires privileged permission and audit.

### `F-USER-LOCK`

**Endpoint:** `POST /api/v1/user-profiles/{userProfileId}/lock`

**Body**

```json
{
  "reason": "string",
  "lockedUntil": "ISO-8601|null"
}
```

**Rules**

- Revoke sessions after lock.

### `F-PRIMARY-ASSIGNMENT`

**Endpoint:** `POST /api/v1/user-profiles/{userProfileId}/change-primary-assignment`

**Body**

```json
{
  "positionId": "uuid",
  "validFrom": "ISO-8601",
  "areaScopeIds": [
    "uuid"
  ],
  "reason": "string"
}
```

**Rules**

- Close old assignment, create new assignment, sync auth role, revoke sessions.

### `F-INTEGRATION-CHANNEL`

**Endpoint:** `POST /api/v1/integration-channels or PATCH /api/v1/integration-channels/{channelId}`

**Body**

```json
{
  "code": "WA_MAIN",
  "name": "WA Center Utama",
  "channelType": "WHATSAPP",
  "config": {
    "provider": "string",
    "secretRef": "string"
  }
}
```

**Rules**

- Never return secrets in response.

### `F-WEBHOOK-RETRY`

**Endpoint:** `POST /api/v1/webhook-events/{eventId}/retry`

**Body**

```json
{
  "reason": "string"
}
```

**Rules**

- Idempotency-Key required.

### `F-POSITION`

**Endpoint:** `POST /api/v1/positions`

**Body**

```json
{
  "code": "KORWIL",
  "title": "Korwil Pekanbaru",
  "roleId": "uuid",
  "organizationUnitId": "uuid",
  "reportsToPositionId": "uuid|null"
}
```

**Rules**

- Validate position-role mapping and branch.

### `F-REPORTING-LINE`

**Endpoint:** `POST /api/v1/positions/{positionId}/change-reporting-line`

**Body**

```json
{
  "reportsToPositionId": "uuid|null",
  "effectiveAt": "ISO-8601",
  "reason": "string"
}
```

**Rules**

- Prevent cycles; preserve audit history.

### `F-AUDIT-EXPORT`

**Endpoint:** `POST /api/v1/audit-exports`

**Body**

```json
{
  "filters": {
    "action": "string|null",
    "entityType": "string|null",
    "from": "ISO",
    "to": "ISO"
  },
  "format": "CSV",
  "reason": "string"
}
```

**Rules**

- Returns 202 job reference.

### `F-SYSTEM-SETTING`

**Endpoint:** `PUT /api/v1/system/settings/{key}`

**Body**

```json
{
  "value": "JSON",
  "description": "string|null",
  "isSecret": false
}
```

**Rules**

- If secret, display only masked status after save.

### `F-PRODUCT-TYPE`

**Endpoint:** `POST /api/v1/product-types`

**Body**

```json
{
  "code": "LAPIN",
  "name": "Laporan Intelijen",
  "formatNo": "string|null",
  "description": "string|null"
}
```

### `F-PRODUCT-TEMPLATE`

**Endpoint:** `POST /api/v1/product-types/{productTypeId}/templates`

**Body**

```json
{
  "name": "Template v1",
  "sections": [
    {
      "code": "INDICATIONS",
      "title": "Indikasi",
      "orderNumber": 1,
      "isRepeatable": false,
      "fields": [
        {
          "code": "content",
          "label": "Isi",
          "dataType": "RICH_TEXT",
          "isRequired": true,
          "orderNumber": 1,
          "validation": {}
        }
      ]
    }
  ]
}
```

**Rules**

- Activate only after validation.

### `F-POSITION-AREA-POLICY`

**Endpoint:** `PUT /api/v1/position-area-policies/{policyId}`

**Body**

```json
{
  "scopeMode": "EXPLICIT",
  "minimumAreas": 1,
  "maximumAreas": 5,
  "isActive": true
}
```

### `F-ORGANIZATION-UNIT`

**Endpoint:** `POST /api/v1/organization-units`

**Body**

```json
{
  "code": "BINDA-RIAU",
  "name": "Binda Riau",
  "type": "BINDA",
  "parentId": "uuid|null"
}
```

**Rules**

- Create closure self-link and ancestor links.

### `F-UNIT-COVERAGE`

**Endpoint:** `PUT /api/v1/organization-units/{unitId}/area-coverages`

**Body**

```json
{
  "areas": [
    {
      "areaId": "uuid",
      "isPrimary": true,
      "validFrom": "ISO",
      "validUntil": null
    }
  ]
}
```

**Rules**

- Replace active coverage transactionally.

### `F-ADMIN-AREA`

**Endpoint:** `POST /api/v1/administrative-areas`

**Body**

```json
{
  "code": "11.05.07.2002",
  "officialCode": "11.05.07.2002",
  "name": "Alue Bagok",
  "level": "VILLAGE",
  "parentId": "uuid"
}
```

**Rules**

- Validate allowed parent level.

### `F-BOUNDARY-VERSION`

**Endpoint:** `POST /api/v1/administrative-areas/{areaId}/boundaries`

**Body**

```json
{
  "geoJson": {
    "type": "MultiPolygon",
    "coordinates": []
  },
  "dataSourceId": "uuid|null",
  "qualityStatus": "VERIFIED",
  "effectiveFrom": "ISO",
  "simplificationToleranceMeters": 0
}
```

**Rules**

- Validate SRID, geometry, parent containment, sibling overlap.

### `F-AREA-IMPORT`

**Endpoint:** `POST /api/v1/administrative-area-imports`

**Body**

```json
{
  "fileId": "uuid",
  "mode": "UPSERT",
  "includeBoundaries": true,
  "dryRun": true
}
```

**Rules**

- Returns 202 jobId; run dry-run before commit.

### `F-ROLE-PERMISSIONS`

**Endpoint:** `PUT /api/v1/roles/{roleId}/permissions`

**Body**

```json
{
  "permissionIds": [
    "uuid"
  ],
  "changeReason": "string"
}
```

**Rules**

- Full replacement; use If-Match.

### `F-DIRECTIVE`

**Endpoint:** `POST /api/v1/directives`

**Body**

```json
{
  "ownerUnitId": "uuid",
  "version": {
    "commandNumber": "string",
    "classification": "RAHASIA",
    "commandSource": "string",
    "commandIssuer": "string",
    "commandDate": "ISO",
    "dueDate": "ISO|null",
    "strategicIssue": "string|null",
    "commandDescription": "string"
  },
  "targetAreaIds": [
    "uuid"
  ],
  "recipientTargets": [
    {
      "targetPositionId": "uuid"
    }
  ]
}
```

**Rules**

- Exactly one recipient target per row.
- Publish and distribute are separate actions.

### `F-UUK-STR`

**Endpoint:** `POST /api/v1/uuk-strs or PUT /api/v1/uuk-str-versions/{versionId}/sections`

**Body**

```json
{
  "directiveVersionId": "uuid",
  "ownerUnitId": "uuid",
  "title": "string",
  "sections": [
    {
      "sectionType": "BASIS_BACKGROUND",
      "title": "string",
      "orderNumber": 1,
      "items": [
        {
          "itemCode": "1.1",
          "content": "string",
          "orderNumber": 1
        }
      ]
    }
  ]
}
```

**Rules**

- Mandatory sections before publish.

### `F-TASK`

**Endpoint:** `POST /api/v1/tasks`

**Body**

```json
{
  "parentTaskId": "uuid|null",
  "directiveVersionId": "uuid|null",
  "uukStrVersionId": "uuid|null",
  "ownerUnitId": "uuid",
  "title": "string",
  "description": "string",
  "classification": "TERBATAS",
  "priority": "HIGH",
  "dueDate": "ISO|null",
  "targetAreaIds": [
    "uuid"
  ]
}
```

**Rules**

- Due date cannot exceed parent task/directive due date.

### `F-TASK-ASSIGNMENT`

**Endpoint:** `POST /api/v1/tasks/{taskId}/assignments`

**Body**

```json
{
  "assignments": [
    {
      "assigneeAssignmentId": "uuid",
      "dueDate": "ISO|null",
      "assignmentNote": "string|null"
    }
  ]
}
```

**Rules**

- Assignee must be subordinate and area-compatible.

### `F-TASK-START`

**Endpoint:** `POST /api/v1/task-assignments/{assignmentId}/start`

**Body**

```json
{
  "note": "string|null"
}
```

**Rules**

- ACKNOWLEDGED -> IN_PROGRESS.

### `F-TASK-PROGRESS`

**Endpoint:** `POST /api/v1/task-assignments/{assignmentId}/progress`

**Body**

```json
{
  "progressPercent": 50,
  "note": "string",
  "attachmentFileIds": [
    "uuid"
  ]
}
```

**Rules**

- Append-only progress log.

### `F-TASK-COMPLETE`

**Endpoint:** `POST /api/v1/task-assignments/{assignmentId}/complete`

**Body**

```json
{
  "note": "string",
  "relatedBaketIds": [
    "uuid"
  ]
}
```

**Rules**

- May require evidence according to task policy.

### `F-TASK-REASSIGN`

**Endpoint:** `POST /api/v1/task-assignments/{assignmentId}/reassign`

**Body**

```json
{
  "newAssigneeAssignmentId": "uuid",
  "reason": "string",
  "dueDate": "ISO|null"
}
```

**Rules**

- Close old assignment and create linked replacement.

### `F-JARING`

**Endpoint:** `POST /api/v1/jaring`

**Body**

```json
{
  "code": "JR-0001",
  "aliasName": "string|null",
  "whatsappNumber": "628123456789",
  "notes": "string|null",
  "areaCoverages": [
    {
      "areaId": "uuid",
      "isPrimary": true
    }
  ]
}
```

**Rules**

- Normalize number before uniqueness check.

### `F-JARING-TRANSFER`

**Endpoint:** `POST /api/v1/jaring/{jaringId}/caretaker-transfer`

**Body**

```json
{
  "newFieldOfficerAssignmentId": "uuid",
  "effectiveAt": "ISO",
  "transferReason": "string"
}
```

**Rules**

- Exactly one active caretaker.

### `F-JARING-COVERAGE`

**Endpoint:** `PUT /api/v1/jaring/{jaringId}/area-coverages`

**Body**

```json
{
  "areas": [
    {
      "areaId": "uuid",
      "isPrimary": true,
      "validFrom": "ISO",
      "validUntil": null
    }
  ]
}
```

**Rules**

- Replace active coverages transactionally.

### `F-WHATSAPP-VALIDATE`

**Endpoint:** `POST /api/v1/whatsapp-messages/{messageId}/validate`

**Body**

```json
{
  "decision": "VALID",
  "issueCodes": [],
  "note": "string|null"
}
```

**Rules**

- Supports multiple issue codes after schema hardening.

### `F-WHATSAPP-DUPLICATE`

**Endpoint:** `POST /api/v1/whatsapp-messages/{messageId}/mark-duplicate`

**Body**

```json
{
  "duplicateOfMessageId": "uuid",
  "reason": "string"
}
```

### `F-BAKET-DRAFT`

**Endpoint:** `POST /api/v1/bakets and PATCH /api/v1/baket-versions/{versionId}`

**Body**

```json
{
  "taskAssignmentId": "uuid|null",
  "primaryJaringId": "uuid|null",
  "title": "string",
  "originalContent": "string",
  "normalizedContent": "string|null",
  "eventTime": "ISO|null",
  "latitude": -6.2,
  "longitude": 106.8,
  "gpsAccuracyMeters": 10.0,
  "coordinateSource": "DEVICE_GPS",
  "urgency": "HIGH",
  "fieldOfficerNote": "string|null"
}
```

**Rules**

- Coordinates stored and resolved to eventAreaId.

### `F-MANUAL-AREA-OVERRIDE`

**Endpoint:** `POST /api/v1/baket-versions/{versionId}/manual-area-override`

**Body**

```json
{
  "areaId": "uuid",
  "reason": "string"
}
```

**Rules**

- Audit original and overridden area.

### `F-BAKET-SUBMIT`

**Endpoint:** `POST /api/v1/bakets/{baketId}/submit or /resubmit`

**Body**

```json
{
  "confirmation": "SUBMIT",
  "note": "string|null"
}
```

**Rules**

- Idempotency-Key and If-Match required.

### `F-BAKET-REVISION`

**Endpoint:** `POST /api/v1/bakets/{baketId}/versions`

**Body**

```json
{
  "basedOnVersionId": "uuid",
  "revisionReason": "string",
  "changes": {
    "title": "string|null",
    "content": "string|null"
  }
}
```

**Rules**

- Resolve revision request after creating new version.

### `F-VERIFICATION-CREATE`

**Endpoint:** `POST /api/v1/baket-versions/{versionId}/verification`

**Body**

```json
{
  "note": "string|null"
}
```

**Rules**

- Only one canonical verification per BaketVersion.

### `F-VERIFICATION`

**Endpoint:** `PATCH /api/v1/verifications/{verificationId}`

**Body**

```json
{
  "sourceReliability": "A",
  "informationCredibility": "TWO",
  "summary": "string"
}
```

**Rules**

- Checklist and cross references use separate PUT endpoints.

### `F-ANALYSIS-CASE`

**Endpoint:** `POST /api/v1/analysis-cases`

**Body**

```json
{
  "ownerUnitId": "uuid",
  "title": "string",
  "periodStart": "ISO|null",
  "periodEnd": "ISO|null",
  "verificationIds": [
    "uuid"
  ]
}
```

**Rules**

- All sources must be VERIFIED and readable by caller.

### `F-ANALYSIS-VERSION`

**Endpoint:** `PATCH /api/v1/analysis-versions/{versionId}`

**Body**

```json
{
  "indications": "string|null",
  "analysis": "string|null",
  "impact": "string|null",
  "efforts": "string|null",
  "recommendations": "string|null",
  "aiDraft": "JSON|null"
}
```

**Rules**

- Validated version immutable.

### `F-PRODUCT`

**Endpoint:** `POST /api/v1/products and PATCH /api/v1/product-versions/{versionId}`

**Body**

```json
{
  "productTypeId": "uuid",
  "ownerUnitId": "uuid",
  "classification": "RAHASIA",
  "productNumber": "string",
  "title": "string",
  "periodStart": "ISO|null",
  "periodEnd": "ISO|null",
  "templateId": "uuid",
  "content": {
    "fieldCode": "value"
  }
}
```

**Rules**

- Content validated against active template.

### `F-PRODUCT-REVISION`

**Endpoint:** `POST /api/v1/products/{productId}/versions`

**Body**

```json
{
  "basedOnVersionId": "uuid",
  "templateId": "uuid",
  "changeReason": "string",
  "content": {
    "fieldCode": "value"
  }
}
```

### `F-PRODUCT-SUBMIT`

**Endpoint:** `POST /api/v1/products/{productId}/submit`

**Body**

```json
{
  "versionId": "uuid",
  "confirmation": "SUBMIT"
}
```

**Rules**

- Creates approval workflow snapshot.

### `F-APPROVAL-DECISION`

**Endpoint:** `POST /api/v1/approval-steps/{stepId}/{approve|request-revision|reject|request-clarification}`

**Body**

```json
{
  "note": "string",
  "requiredChanges": [
    "string"
  ]
}
```

**Rules**

- Required changes mandatory for revision; note mandatory for reject.

### `F-PRODUCT-DISTRIBUTION`

**Endpoint:** `POST /api/v1/product-versions/{versionId}/distributions`

**Body**

```json
{
  "targets": [
    {
      "targetUnitId": "uuid|null",
      "targetPositionId": "uuid|null",
      "targetUserProfileId": "uuid|null"
    }
  ],
  "classification": "RAHASIA",
  "message": "string|null"
}
```

**Rules**

- Exactly one target field per target row.

### `F-EMERGENCY-CREATE`

**Endpoint:** `POST /api/v1/emergency-incidents`

**Body**

```json
{
  "title": "string",
  "severity": "CRITICAL",
  "latitude": -6.2,
  "longitude": 106.8,
  "situation": "string",
  "actionTaken": "string|null",
  "needs": "string|null",
  "attachmentFileIds": [
    "uuid"
  ]
}
```

**Rules**

- Coordinates optional; Idempotency-Key required.

### `F-EMERGENCY-ACTION`

**Endpoint:** `POST /api/v1/emergency-incidents/{incidentId}/{acknowledge|verify|start-response|mark-controlled|resolve}`

**Body**

```json
{
  "note": "string",
  "actionPlan": "string|null",
  "resolution": "string|null"
}
```

**Rules**

- Body varies by action; state transition validated.

### `F-ALERT-ACTION`

**Endpoint:** `POST /api/v1/alerts/{alertId}/{acknowledge|assign|start|resolve}`

**Body**

```json
{
  "note": "string|null",
  "assignedPositionId": "uuid|null",
  "resolution": "string|null"
}
```

**Rules**

- Body varies by action.

## 7. Cross-Page Query and Authorization Rules

### 7.1 Effective Access Filter

Every sensitive query must apply:

```text
valid Better Auth session
AND active UserProfile
AND active primary PositionAssignment
AND matching auth/domain role
AND required permission
AND organization scope
AND administrative area scope
AND clearance >= resource classification
AND resource membership / workflow target
```

### 7.2 Area Filter

`areaId` with `includeDescendants=true` uses `AdministrativeAreaClosure`. The same area selection must drive tables, charts, KPIs, facets, and map layers.

### 7.3 Workflow State

The frontend must not send arbitrary status updates. It must call explicit actions such as submit, acknowledge, verify, approve, request revision, distribute, resolve, or cancel.

### 7.4 Concurrency

- Editable drafts send `If-Match`.
- Conflicting updates return `409 VERSION_CONFLICT`.
- Submitted/published/approved versions are read-only.

### 7.5 Sensitive Not Found

A sensitive resource outside the caller's scope should normally return masked `404 NOT_FOUND`, not a response that reveals the resource exists.

## 8. Frontend State Requirements

| State | Required behavior |
|---|---|
| Loading | Route/module skeleton through `loading.tsx`. |
| Empty | Explain whether the module has no records. |
| No filter results | Preserve filters and provide reset action. |
| Partial dashboard error | Keep successful widgets visible and retry failed widgets. |
| Form validation | Focus the first invalid field and preserve entered values. |
| Version conflict | Offer reload/compare; never overwrite silently. |
| Outside scope | Mask sensitive resource and provide safe navigation. |
| Map no coordinates | Show unlocated count and a list fallback. |
| Stale location | Show captured timestamp and accuracy. |
| Offline/degraded integration | Show dependency and last-success timestamp. |

## 9. API Contract Gaps and Recommended Additions

These are optional optimization endpoints identified by the frontend page model. Existing contracted APIs remain the fallback.

| ID | Proposed endpoint | Need | Fallback |
|---|---|---|---|
| GAP-COMP-001 | `GET /api/v1/dashboard/briefing` | Executive briefing composition | Parallel calls to products, alerts, directives, and dashboard trends |
| GAP-MAP-001 | `GET /api/v1/map/tasks` | Task targets/centroids as GeoJSON | Bounded task list transformed on client |
| GAP-MAP-002 | `GET /api/v1/map/alerts` | Server-clustered alert GeoJSON | Scoped alert list transformed on client |
| GAP-MAP-003 | `GET /api/v1/map/emergencies` | Server-clustered emergency GeoJSON | Scoped emergency list transformed on client |
| GAP-UI-001 | `availableActions` in list/detail DTOs | Avoid duplicate state/permission logic | Frontend derives only temporary display, backend still authoritative |
| GAP-UI-002 | `facets` in list responses | Accurate scoped filter counts | Separate aggregate requests |

## 10. OpenAPI Alignment Result

- Contracted API references in this document: **848**
- Unique non-contracted references: **0**

- All generated page references resolve to the current OpenAPI contract.

## 11. Acceptance Criteria

- **AC-FE-001:** Every menu page documents purpose, data, filters, APIs, actions, rules, and flow.
- **AC-FE-002:** Every operational record has a canonical dynamic detail route.
- **AC-FE-003:** Every create/edit/revision workflow has a documented route and body contract.
- **AC-FE-004:** Every historical version route is read-only.
- **AC-FE-005:** Every workflow action uses an explicit backend action endpoint.
- **AC-FE-006:** Every map-selected record can be opened through a canonical URL.
- **AC-FE-007:** Role routes reuse shared domain feature modules.
- **AC-FE-008:** URL search params are the source of truth for list, analytics, and map filters.
- **AC-FE-009:** Backend authorization remains authoritative for direct URL access.
- **AC-FE-010:** Map, forms, and other interactive widgets use isolated Client Component boundaries.
- **AC-FE-011:** Every meaningful route boundary provides loading, error, and safe not-found behavior.
- **AC-FE-012:** The API implementation adds `availableActions` and applied-scope metadata before frontend workflow buttons are finalized.