# DENS CAKRA Frontend Page-to-API Matrix

| Field | Value |
|---|---|
| Document | Frontend Page-to-API Matrix & Interaction Specification |
| Product | DENS CAKRA |
| Version | v1.0 |
| Date | 11 July 2026 |
| Author | Product Architect Pro — System Analyst + UI/UX |
| Status | Draft for Frontend/API Alignment |
| Baseline | DENS CAKRA API Contract v1.0 and supplied Next.js route tree |

## Revision History

| Version | Date | Description |
|---|---|---|
| v1.0 | 11 July 2026 | Initial complete mapping of navigation pages, displayed data, filters, actions, forms, payloads, and map behavior. |

## 1. Executive Decision

The supplied route tree can be retained. Each page SHALL use one of the standard page archetypes defined below. Business state transitions SHALL remain on action endpoints. Frontend visibility SHALL use permissions and `availableActions`, while backend authorization remains authoritative.

### 1.1 Page Archetypes

| Archetype | Use | Required UI states |
|---|---|---|
| Dashboard | KPI and role summary | loading skeleton, partial-widget error, stale-data indicator, empty period |
| List / Queue | Searchable operational records | loading, empty, no-filter-result, pagination, bulk-selection limits |
| Master-detail | Table/list plus side panel | selected-row state, not-found, masked resource |
| Workflow workspace | Review plus action panel | read-only submitted state, validation errors, conflict state |
| Dynamic form | Template-driven input | draft, autosave, dirty, validating, error, success |
| Map workspace | Spatial layers and selected feature drawer | loading tiles, no coordinates, truncated data, offline/error |
| Tree / hierarchy | Organization and area management | cycle error, invalid parent, lazy-loaded children |

## 2. Global Frontend Contract

### 2.1 Application Bootstrap

1. Validate Better Auth session.
2. Call `GET /api/v1/me?include=primaryAssignment,unit,areaScopes`.
3. Call `GET /api/v1/me/authorization-context`.
4. Call `GET /api/v1/reference-data/enums` and cache it.
5. Call `GET /api/v1/notifications/unread-count`.
6. Build sidebar from a static route manifest filtered by effective permissions.
7. Redirect `/dashboard` to the role workspace.

### 2.2 Standard URL Query State

All list, analytics, and map filters SHALL be stored in URL search params so refresh/back/share preserve the current view.

```text
?q=&page=1&limit=20&sortBy=createdAt&sortOrder=desc
&areaId=&includeDescendants=true&unitId=&status=&priority=
&classification=&severity=&from=&to=&view=table
```

### 2.3 Standard List Response Extension

Each list response SHOULD include `facets` and each resource SHOULD include server-calculated actions.

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "availableActions": [
        "READ",
        "SUBMIT"
      ]
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100
    },
    "facets": {
      "status": [
        {
          "value": "DRAFT",
          "count": 12
        }
      ]
    },
    "appliedScope": {
      "areaIds": [
        "uuid"
      ],
      "unitIds": [
        "uuid"
      ]
    }
  }
}
```

### 2.4 Shared File Upload Flow

1. `POST /api/v1/files/presign` with file name, MIME type, size, and checksum.
2. Upload directly to object storage.
3. `POST /api/v1/files/complete`.
4. Put returned `fileId` into the domain form payload.
5. Display scan/processing state before allowing submit.

## 3. Map Architecture with mapcn

mapcn SHALL be used as the presentation component layer. PostGIS and DENS CAKRA APIs remain the spatial source of truth.

### 3.1 Component Assignment

| Need | Frontend component pattern | API |
|---|---|---|
| Base map and dark/light style | Controlled `Map` | Basemap provider/style configuration |
| Zoom, compass, locate, fullscreen | `MapControls` | Browser geolocation for self-location only |
| Administrative boundaries | `MapGeoJSON` | `GET /administrative-areas/boundaries` |
| Report clusters | `MapClusterLayer` or server cluster GeoJSON | `GET /map/clusters` |
| Report points | GeoJSON point layer; DOM marker only for selected/small set | `GET /map/reports` |
| Selected report details | `MapPopup` plus side drawer | Domain detail endpoint |
| Manual pin correction | Draggable marker | resolve/override action endpoint |
| Personnel | GeoJSON/cluster layer | `GET /personnel-location-map` |

### 3.2 Map Loading Rules

- `viewport` and `onViewportChange` SHALL control map state.
- Debounce map movement 300–500 ms before requesting the next viewport.
- Send `bbox=minLng,minLat,maxLng,maxLat` and `zoom`.
- At low zoom or large counts, call `/map/clusters`.
- At high zoom and safe result counts, call `/map/reports`.
- Load administrative boundaries independently and cache by area/version.
- Clicking a cluster zooms in; clicking a point opens a popup then lazily loads the full domain detail.
- Map color SHALL not be the only status cue; use icon/shape/label and an accessible legend.

### 3.3 Map Report Query

```http
GET /api/v1/map/reports?bbox=100.0,-1.5,103.0,2.0&zoom=12
&areaId={areaId}&from={ISO}&to={ISO}&status={status}&urgency={urgency}
```

The server SHALL intersect the viewport with the caller's organization scope, area scope, clearance, and resource membership. The client never expands scope.

## 4. Page-to-API Matrix

### 4.1 Global Pages

#### `/dashboard` — Role Dashboard Redirect

**Page type:** `redirect`

**Displayed data**

- Loading state
- Access error state

**Filters / URL params**

- None; use resource ID or bootstrap context.

**Load APIs**

- `GET /api/v1/me`
- `GET /api/v1/me/authorization-context`

**Actions**

- `Redirect ke workspace berdasarkan business role dan primary assignment`

**Forms**

- No direct mutation form.

**Rules**

- Jangan menentukan workspace hanya dari URL
- Role Better Auth harus cocok dengan domain role

#### `/dashboard/notifications` — Notifications

**Page type:** `list`

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

**Load APIs**

- `GET /api/v1/notifications`
- `GET /api/v1/notifications/unread-count`

**Actions**

- `POST /api/v1/notifications/{notificationId}/read`
- `POST /api/v1/notifications/read-all`

**Forms**

- No direct mutation form.

**Rules**

- Deep-link tetap diotorisasi ulang
- Mark read idempotent

#### `/dashboard/profil` — Profile & Security

**Page type:** `detail`

**Displayed data**

- Profile
- Business role
- Position
- Unit
- Clearance
- Area scopes
- Active sessions summary

**Filters / URL params**

- None; use resource ID or bootstrap context.

**Load APIs**

- `GET /api/v1/me`
- `GET /api/v1/me/authorization-context`
- `GET /api/v1/me/area-scopes`

**Actions**

- `POST /api/v1/me/revoke-other-sessions`
- `Better Auth password/session actions`

**Forms**

- `F-PROFILE-METADATA`

**Rules**

- Tidak boleh mengubah role/position sendiri
- Security actions perlu confirmation

### 4.2 Admin System

#### `/dashboard/admin-system` — System Dashboard

**Page type:** `dashboard`

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

**Load APIs**

- `GET /api/v1/system/diagnostics`
- `GET /api/v1/health/ready`
- `GET /api/v1/integration-channels`
- `GET /api/v1/audit-logs`

**Actions**

- `Open integration detail`
- `Open audit investigation`

**Forms**

- No direct mutation form.

**Rules**

- Admin Sistem tidak otomatis dapat membaca isi intelijen

#### `/dashboard/admin-system/integrasi-wa-center` — WA Center Integration

**Page type:** `master-detail`

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

**Load APIs**

- `GET /api/v1/integration-channels`
- `GET /api/v1/integration-channels/{channelId}`
- `GET /api/v1/integration-channels/{channelId}/webhook-events`
- `GET /api/v1/whatsapp-inbox/summary`

**Actions**

- `POST /api/v1/integration-channels`
- `PATCH /api/v1/integration-channels/{channelId}`
- `POST /api/v1/integration-channels/{channelId}/activate`
- `POST /api/v1/integration-channels/{channelId}/deactivate`
- `POST /api/v1/integration-channels/{channelId}/test`
- `POST /api/v1/webhook-events/{eventId}/retry`

**Forms**

- `F-INTEGRATION-CHANNEL`
- `F-WEBHOOK-RETRY`

**Rules**

- Secret tidak ditampilkan kembali
- Retry idempotent
- Payload webhook read-only

#### `/dashboard/admin-system/jabatan-reporting-line` — Position & Reporting Line

**Page type:** `tree-table`

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

**Load APIs**

- `GET /api/v1/positions`
- `GET /api/v1/positions/{positionId}`
- `GET /api/v1/positions/{positionId}/subordinates`
- `GET /api/v1/positions/{positionId}/reporting-chain`
- `GET /api/v1/position-assignments`

**Actions**

- `POST /api/v1/positions`
- `PATCH /api/v1/positions/{positionId}`
- `POST /api/v1/positions/{positionId}/change-reporting-line`

**Forms**

- `F-POSITION`
- `F-REPORTING-LINE`

**Rules**

- Role-position mapping wajib valid
- KORWIL Directorate melapor ke KASUBDIT; KORWIL Binda ke KABAGOPS

#### `/dashboard/admin-system/keamanan-audit` — Security & Audit

**Page type:** `investigation`

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

**Load APIs**

- `GET /api/v1/audit-logs`
- `GET /api/v1/audit-logs/{auditLogId}`
- `GET /api/v1/entities/{entityType}/{entityId}/audit-trail`

**Actions**

- `POST /api/v1/audit-exports`
- `Open related entity if authorized`

**Forms**

- `F-AUDIT-EXPORT`

**Rules**

- Audit append-only
- Sensitive resource may remain masked
- Export requires reason

#### `/dashboard/admin-system/konfigurasi-sistem` — System Configuration

**Page type:** `settings`

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

**Load APIs**

- `GET /api/v1/system/settings`
- `GET /api/v1/system/settings/{key}`
- `GET /api/v1/system/diagnostics`

**Actions**

- `PUT /api/v1/system/settings/{key}`

**Forms**

- `F-SYSTEM-SETTING`

**Rules**

- Secret encrypted and masked
- Critical settings require confirmation and audit

#### `/dashboard/admin-system/master-data` — Reference & Master Data

**Page type:** `tabs`

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

**Load APIs**

- `GET /api/v1/reference-data/enums`
- `GET /api/v1/product-types`
- `GET /api/v1/position-area-policies`

**Actions**

- `POST /api/v1/product-types`
- `PATCH /api/v1/product-types/{productTypeId}`
- `POST /api/v1/product-types/{productTypeId}/templates`
- `POST /api/v1/product-templates/{templateId}/activate`
- `PUT /api/v1/position-area-policies/{policyId}`

**Forms**

- `F-PRODUCT-TYPE`
- `F-PRODUCT-TEMPLATE`
- `F-POSITION-AREA-POLICY`

**Rules**

- Template aktif tidak diedit; buat versi baru

#### `/dashboard/admin-system/organisasi-wilayah` — Organization & Administrative Area

**Page type:** `split-tree-map`

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

**Load APIs**

- `GET /api/v1/organization-units`
- `GET /api/v1/organization-units/{unitId}/tree`
- `GET /api/v1/administrative-areas/tree`
- `GET /api/v1/administrative-areas/boundaries`
- `GET /api/v1/administrative-area-imports/{jobId}`

**Actions**

- `POST /api/v1/organization-units`
- `PATCH /api/v1/organization-units/{unitId}`
- `POST /api/v1/organization-units/{unitId}/move`
- `PUT /api/v1/organization-units/{unitId}/area-coverages`
- `POST /api/v1/administrative-areas`
- `PATCH /api/v1/administrative-areas/{areaId}`
- `POST /api/v1/administrative-areas/{areaId}/move`
- `POST /api/v1/administrative-areas/{areaId}/boundaries`
- `POST /api/v1/administrative-area-imports`

**Forms**

- `F-ORGANIZATION-UNIT`
- `F-UNIT-COVERAGE`
- `F-ADMIN-AREA`
- `F-BOUNDARY-VERSION`
- `F-AREA-IMPORT`

**Rules**

- Move hierarchy transactional
- Boundary validation before activation
- Prevent cycles

**Map mode:** `boundary-editor`

#### `/dashboard/admin-system/pengguna` — User Provisioning

**Page type:** `master-detail`

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

**Load APIs**

- `GET /api/v1/user-profiles`
- `GET /api/v1/user-profiles/{userProfileId}`
- `GET /api/v1/user-profiles/{userProfileId}/assignments`

**Actions**

- `POST /api/v1/user-profiles/provision`
- `PATCH /api/v1/user-profiles/{userProfileId}`
- `POST /api/v1/user-profiles/{userProfileId}/activate`
- `POST /api/v1/user-profiles/{userProfileId}/suspend`
- `POST /api/v1/user-profiles/{userProfileId}/lock`
- `POST /api/v1/user-profiles/{userProfileId}/unlock`
- `POST /api/v1/user-profiles/{userProfileId}/change-primary-assignment`
- `POST /api/v1/user-profiles/{userProfileId}/archive`

**Forms**

- `F-USER-PROVISION`
- `F-USER-METADATA`
- `F-USER-LOCK`
- `F-PRIMARY-ASSIGNMENT`

**Rules**

- Provisioning atomik
- Role auth dan domain harus sinkron
- Tidak ada hard delete

#### `/dashboard/admin-system/role-hak-akses` — Roles & Permissions

**Page type:** `matrix`

**Displayed data**

- Role-permission matrix
- Permission catalog
- Position area policy
- Impact preview

**Filters / URL params**

- `roleId`
- `module`
- `q`

**Load APIs**

- `GET /api/v1/roles`
- `GET /api/v1/roles/{roleId}`
- `GET /api/v1/permissions`
- `GET /api/v1/position-area-policies`

**Actions**

- `PUT /api/v1/roles/{roleId}/permissions`
- `PUT /api/v1/position-area-policies/{policyId}`

**Forms**

- `F-ROLE-PERMISSIONS`
- `F-POSITION-AREA-POLICY`

**Rules**

- Separation of duties
- Admin access does not imply intelligence content access

### 4.3 Executive

#### `/dashboard/executive` — Executive Dashboard

**Page type:** `dashboard`

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

**Load APIs**

- `GET /api/v1/dashboard/overview`
- `GET /api/v1/dashboard/kpis`
- `GET /api/v1/dashboard/trends`
- `GET /api/v1/alerts/summary`
- `GET /api/v1/approval-inbox`
- `GET /api/v1/map/area-summary`

**Actions**

- `Open critical alert`
- `Open approval`
- `Create strategic directive`

**Forms**

- No direct mutation form.

**Rules**

- All widgets use one filter context

#### `/dashboard/executive/kinerja-evaluasi` — National Performance & Evaluation

**Page type:** `analytics`

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

**Load APIs**

- `GET /api/v1/dashboard/kpis`
- `GET /api/v1/dashboard/task-performance`
- `GET /api/v1/dashboard/directive-progress`
- `GET /api/v1/dashboard/verification-quality`
- `GET /api/v1/dashboard/product-status`
- `GET /api/v1/dashboard/area-breakdown`

**Actions**

- `Drill down to region/unit`
- `Export via controlled report flow`

**Forms**

- No direct mutation form.

**Rules**

- Metrics calculated from immutable workflow events

#### `/dashboard/executive/laporan-briefing` — Executive Briefing

**Page type:** `composition`

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

**Load APIs**

- `GET /api/v1/products`
- `GET /api/v1/alerts`
- `GET /api/v1/directives`
- `GET /api/v1/dashboard/trends`
- `GET /api/v1/dashboard/area-breakdown`

**Actions**

- `Open product`
- `Open alert`
- `Open directive`

**Forms**

- No direct mutation form.

**Rules**

- Use parallel existing APIs initially
- Recommended composition endpoint GAP-COMP-001

#### `/dashboard/executive/monitoring-nasional` — National Monitoring

**Page type:** `analytics-map`

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

**Load APIs**

- `GET /api/v1/map/area-summary`
- `GET /api/v1/map/heatmap`
- `GET /api/v1/dashboard/area-breakdown`
- `GET /api/v1/dashboard/task-performance`
- `GET /api/v1/emergency-incidents`

**Actions**

- `Select region`
- `Open regional detail`

**Forms**

- No direct mutation form.

**Rules**

- No raw source identity at executive aggregation

**Map mode:** `national-choropleth`

#### `/dashboard/executive/persetujuan` — Approval Summary

**Page type:** `landing`

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

**Load APIs**

- `GET /api/v1/approval-inbox`
- `GET /api/v1/dashboard/product-status`

**Actions**

- `Open executive approval inbox`

**Forms**

- No direct mutation form.

**Rules**

- Summary only; decision is performed on detail page

#### `/dashboard/executive/persetujuan-eksekutif` — Executive Approval Inbox

**Page type:** `queue-detail`

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

**Load APIs**

- `GET /api/v1/approval-inbox`
- `GET /api/v1/approval-steps/{stepId}`
- `GET /api/v1/products/{productId}`
- `GET /api/v1/products/{productId}/traceability`
- `GET /api/v1/approval-workflows/{workflowId}/timeline`

**Actions**

- `POST /api/v1/approval-steps/{stepId}/approve`
- `POST /api/v1/approval-steps/{stepId}/request-revision`
- `POST /api/v1/approval-steps/{stepId}/reject`
- `POST /api/v1/approval-steps/{stepId}/request-clarification`

**Forms**

- `F-APPROVAL-DECISION`

**Rules**

- Only ACTIVE step
- Decision immutable
- Reason required for revision/reject

#### `/dashboard/executive/produk-intelijen` — Approved Intelligence Products

**Page type:** `catalog`

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

**Load APIs**

- `GET /api/v1/products`
- `GET /api/v1/products/{productId}`
- `GET /api/v1/products/{productId}/timeline`
- `GET /api/v1/products/{productId}/distribution-summary`

**Actions**

- `Open detail`
- `Distribute approved product if permitted`
- `Archive if permitted`

**Forms**

- `F-PRODUCT-DISTRIBUTION`

**Rules**

- Executive normally sees approved/formal products, not raw WhatsApp

#### `/dashboard/executive/pusat-komando` — Command Center

**Page type:** `landing`

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

**Load APIs**

- `GET /api/v1/dashboard/overview`
- `GET /api/v1/dashboard/directive-progress`
- `GET /api/v1/emergency-incidents`
- `GET /api/v1/alerts/summary`

**Actions**

- `Create directive`
- `Open emergency operations`

**Forms**

- No direct mutation form.

**Rules**

- Landing page only

#### `/dashboard/executive/pusat-komando/direktif` — Strategic Directives

**Page type:** `list-detail`

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

**Load APIs**

- `GET /api/v1/directives`
- `GET /api/v1/directives/{directiveId}`
- `GET /api/v1/directives/{directiveId}/versions`
- `GET /api/v1/directives/{directiveId}/tracking`

**Actions**

- `POST /api/v1/directives`
- `POST /api/v1/directives/{directiveId}/versions`
- `POST /api/v1/directives/{directiveId}/publish`
- `POST /api/v1/directives/{directiveId}/distribute`

**Forms**

- `F-DIRECTIVE`

**Rules**

- Published version immutable
- Target area and recipient validation required

#### `/dashboard/executive/pusat-komando/direktif-strategis` — Directive Builder

**Page type:** `wizard`

**Displayed data**

- Step 1 identity
- Step 2 content
- Step 3 target areas
- Step 4 recipients
- Step 5 review

**Filters / URL params**

- None; use resource ID or bootstrap context.

**Load APIs**

- `GET /api/v1/reference-data/enums`
- `GET /api/v1/administrative-areas/tree`
- `GET /api/v1/positions`
- `GET /api/v1/organization-units`

**Actions**

- `POST /api/v1/directives`
- `POST /api/v1/directives/{directiveId}/publish`
- `POST /api/v1/directives/{directiveId}/distribute`

**Forms**

- `F-DIRECTIVE`

**Rules**

- Prefer merge with directive list as create route; avoid duplicated business logic

#### `/dashboard/executive/pusat-komando/operasi-darurat` — Emergency Operations

**Page type:** `map-command`

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

**Load APIs**

- `GET /api/v1/emergency-incidents`
- `GET /api/v1/alerts`
- `GET /api/v1/map/reports`

**Actions**

- `POST /api/v1/emergency-incidents/{incidentId}/acknowledge`
- `POST /api/v1/emergency-incidents/{incidentId}/verify`
- `POST /api/v1/emergency-incidents/{incidentId}/start-response`
- `POST /api/v1/emergency-incidents/{incidentId}/mark-controlled`
- `POST /api/v1/emergency-incidents/{incidentId}/resolve`

**Forms**

- `F-EMERGENCY-ACTION`

**Rules**

- Command chain only
- Critical actions audited

**Map mode:** `emergency-command`

#### `/dashboard/executive/situasi-nasional` — National Situation

**Page type:** `landing`

**Displayed data**

- National situation scorecards
- Risk map preview
- Warning list
- Trend snapshot

**Filters / URL params**

- `areaId`
- `from`
- `to`

**Load APIs**

- `GET /api/v1/dashboard/overview`
- `GET /api/v1/dashboard/trends`
- `GET /api/v1/alerts/summary`
- `GET /api/v1/map/area-summary`

**Actions**

- `Open warning`
- `Open risk map`

**Forms**

- No direct mutation form.

**Rules**

- Real-time operational horizon

#### `/dashboard/executive/situasi-nasional/peringatan-dini` — National Early Warning

**Page type:** `alert-queue`

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

**Load APIs**

- `GET /api/v1/alerts`
- `GET /api/v1/alerts/summary`
- `GET /api/v1/alerts/{alertId}`

**Actions**

- `POST /api/v1/alerts/{alertId}/acknowledge`
- `POST /api/v1/alerts/{alertId}/assign`
- `POST /api/v1/alerts/{alertId}/start`
- `POST /api/v1/alerts/{alertId}/resolve`

**Forms**

- `F-ALERT-ACTION`

**Rules**

- Executive actions may be restricted to command-level alerts

#### `/dashboard/executive/situasi-nasional/peta-kerawanan` — National Risk Map

**Page type:** `map`

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

**Load APIs**

- `GET /api/v1/administrative-areas/boundaries`
- `GET /api/v1/map/clusters`
- `GET /api/v1/map/heatmap`
- `GET /api/v1/map/area-summary`

**Actions**

- `Click region to drill down`
- `Switch cluster/heatmap/choropleth`

**Forms**

- No direct mutation form.

**Rules**

- Use aggregate properties; suppress small-cell sensitive data

**Map mode:** `risk-choropleth`

#### `/dashboard/executive/situasi-strategis` — Strategic Situation

**Page type:** `analytics`

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

**Load APIs**

- `GET /api/v1/dashboard/trends`
- `GET /api/v1/dashboard/area-breakdown`
- `GET /api/v1/products`
- `GET /api/v1/analysis-cases`

**Actions**

- `Open analysis/product`

**Forms**

- No direct mutation form.

**Rules**

- Strategic horizon; do not duplicate real-time national page

#### `/dashboard/executive/situasi-strategis/peringatan-dini` — Strategic Warning Analysis

**Page type:** `analytics-alerts`

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

**Load APIs**

- `GET /api/v1/alerts`
- `GET /api/v1/dashboard/trends`
- `GET /api/v1/dashboard/area-breakdown`

**Actions**

- `Open alert history`
- `Open related product`

**Forms**

- No direct mutation form.

**Rules**

- Recommended shared component with national warning page using strategic preset

#### `/dashboard/executive/situasi-strategis/peta-kerawanan` — Strategic Risk Trend Map

**Page type:** `map-analytics`

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

**Load APIs**

- `GET /api/v1/administrative-areas/boundaries`
- `GET /api/v1/map/heatmap`
- `GET /api/v1/dashboard/area-breakdown`

**Actions**

- `Compare periods`
- `Drill to area`

**Forms**

- No direct mutation form.

**Rules**

- Current API can compose; compare-period endpoint optional

**Map mode:** `strategic-choropleth`

### 4.4 Regional Commander

#### `/dashboard/regional-commander` — Regional Command Dashboard

**Page type:** `dashboard`

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

**Load APIs**

- `GET /api/v1/dashboard/overview`
- `GET /api/v1/dashboard/kpis`
- `GET /api/v1/dashboard/directive-progress`
- `GET /api/v1/approval-inbox`
- `GET /api/v1/alerts/summary`
- `GET /api/v1/map/area-summary`

**Actions**

- `Open UUK/STR`
- `Open approval`
- `Open warning`

**Forms**

- No direct mutation form.

**Rules**

- Scope by Directorate/Binda branch and area

#### `/dashboard/regional-commander/direktif-penjabaran-uuk-str` — UUK/STR Elaboration

**Page type:** `wizard-list`

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

**Load APIs**

- `GET /api/v1/directives`
- `GET /api/v1/uuk-strs`
- `GET /api/v1/uuk-strs/{uukStrId}`
- `GET /api/v1/uuk-strs/{uukStrId}/versions`

**Actions**

- `POST /api/v1/uuk-strs`
- `POST /api/v1/uuk-strs/{uukStrId}/versions`
- `PATCH /api/v1/uuk-str-versions/{versionId}`
- `PUT /api/v1/uuk-str-versions/{versionId}/sections`
- `POST /api/v1/uuk-str-versions/{versionId}/publish`
- `POST /api/v1/uuk-strs/{uukStrId}/cancel`

**Forms**

- `F-UUK-STR`

**Rules**

- Mandatory sections before publish
- Published version immutable

#### `/dashboard/regional-commander/jawaban-lapangan` — Field Answers

**Page type:** `list-detail`

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

**Load APIs**

- `GET /api/v1/tasks`
- `GET /api/v1/tasks/{taskId}/progress-summary`
- `GET /api/v1/bakets`
- `GET /api/v1/bakets/{baketId}/traceability`

**Actions**

- `Open formal finding`
- `Open task cascade`

**Forms**

- No direct mutation form.

**Rules**

- Do not expose raw WhatsApp unless specifically authorized

#### `/dashboard/regional-commander/komando-regional` — Regional Command Center

**Page type:** `command-board`

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

**Load APIs**

- `GET /api/v1/directives`
- `GET /api/v1/uuk-strs`
- `GET /api/v1/tasks`
- `GET /api/v1/emergency-incidents`
- `GET /api/v1/map/area-summary`

**Actions**

- `Create UUK/STR`
- `Open emergency`
- `Track directive`

**Forms**

- No direct mutation form.

**Rules**

- Regional Commander elaborates directive; OIM performs tasking

#### `/dashboard/regional-commander/kpi-evaluasi` — Regional KPI & Evaluation

**Page type:** `analytics`

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

**Load APIs**

- `GET /api/v1/dashboard/kpis`
- `GET /api/v1/dashboard/task-performance`
- `GET /api/v1/dashboard/directive-progress`
- `GET /api/v1/dashboard/verification-quality`
- `GET /api/v1/dashboard/product-status`
- `GET /api/v1/dashboard/area-breakdown`

**Actions**

- `Drill to unit/area`

**Forms**

- No direct mutation form.

**Rules**

- No ranking based on unverified raw data

#### `/dashboard/regional-commander/laporan-intelijen` — Regional Intelligence Findings

**Page type:** `catalog`

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

**Load APIs**

- `GET /api/v1/verifications`
- `GET /api/v1/analysis-cases`
- `GET /api/v1/analysis-cases/{caseId}/traceability`

**Actions**

- `Open analysis`
- `Open verification summary`

**Forms**

- No direct mutation form.

**Rules**

- Source identities masked by need-to-know

#### `/dashboard/regional-commander/laporan-produk-intelijen` — Regional Intelligence Products

**Page type:** `catalog`

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

**Load APIs**

- `GET /api/v1/products`
- `GET /api/v1/products/{productId}`
- `GET /api/v1/products/{productId}/timeline`
- `GET /api/v1/products/{productId}/distribution-summary`

**Actions**

- `Open product`
- `Open approval`

**Forms**

- No direct mutation form.

**Rules**

- Formal products only

#### `/dashboard/regional-commander/monitoring-tugas` — Regional Task Monitoring

**Page type:** `analytics-tree`

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

**Load APIs**

- `GET /api/v1/tasks`
- `GET /api/v1/tasks/{taskId}/cascade`
- `GET /api/v1/tasks/{taskId}/progress-summary`
- `GET /api/v1/dashboard/task-performance`

**Actions**

- `Open task cascade`
- `Open output`

**Forms**

- No direct mutation form.

**Rules**

- Regional Commander monitors; OIM/Field Coordinator executes assignment

#### `/dashboard/regional-commander/persetujuan-regional` — Regional Approval

**Page type:** `queue-detail`

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

**Load APIs**

- `GET /api/v1/approval-inbox`
- `GET /api/v1/approval-steps/{stepId}`
- `GET /api/v1/products/{productId}`
- `GET /api/v1/products/{productId}/traceability`

**Actions**

- `POST /api/v1/approval-steps/{stepId}/approve`
- `POST /api/v1/approval-steps/{stepId}/request-revision`
- `POST /api/v1/approval-steps/{stepId}/reject`
- `POST /api/v1/approval-steps/{stepId}/request-clarification`

**Forms**

- `F-APPROVAL-DECISION`

**Rules**

- Target position must match DIREKTUR_WILAYAH or KABINDA snapshot

#### `/dashboard/regional-commander/personel-jaring` — Regional Personnel & Jaring

**Page type:** `tabs`

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

**Load APIs**

- `GET /api/v1/position-assignments`
- `GET /api/v1/jaring`
- `GET /api/v1/jaring/{jaringId}/caretakers`
- `GET /api/v1/dashboard/task-performance`

**Actions**

- `Open detail`
- `No direct caretaker mutation unless permission`

**Forms**

- No direct mutation form.

**Rules**

- Regional aggregated view

#### `/dashboard/regional-commander/peta-peringatan-dini` — Regional Early Warning Map

**Page type:** `map`

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

**Load APIs**

- `GET /api/v1/alerts`
- `GET /api/v1/emergency-incidents`
- `GET /api/v1/map/clusters`
- `GET /api/v1/map/heatmap`
- `GET /api/v1/administrative-areas/boundaries`
- `GET /api/v1/map/area-summary`

**Actions**

- `Open alert`
- `Acknowledge/assign if permitted`
- `Drill area`

**Forms**

- `F-ALERT-ACTION`

**Rules**

- Current alert/emergency list may be client-transformed; dedicated map endpoints are optional

**Map mode:** `regional-warning`

### 4.5 Operational Intelligence Manager

#### `/dashboard/oim` — OIM Dashboard

**Page type:** `dashboard`

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

**Load APIs**

- `GET /api/v1/dashboard/overview`
- `GET /api/v1/dashboard/verification-quality`
- `GET /api/v1/bakets`
- `GET /api/v1/verifications`
- `GET /api/v1/products`

**Actions**

- `Open verification`
- `Create analysis`
- `Create product`

**Forms**

- No direct mutation form.

**Rules**

- OIM sees own branch and scope

#### `/dashboard/oim/analisis-intelijen` — Intelligence Analysis

**Page type:** `workspace`

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

**Load APIs**

- `GET /api/v1/analysis-cases`
- `GET /api/v1/analysis-cases/{caseId}`
- `GET /api/v1/analysis-cases/{caseId}/graph`
- `GET /api/v1/analysis-cases/{caseId}/traceability`

**Actions**

- `POST /api/v1/analysis-cases`
- `PUT /api/v1/analysis-cases/{caseId}/sources`
- `POST /api/v1/analysis-cases/{caseId}/versions`
- `PATCH /api/v1/analysis-versions/{versionId}`
- `PUT /api/v1/analysis-versions/{versionId}/entities`
- `PUT /api/v1/analysis-versions/{versionId}/relationships`
- `POST /api/v1/analysis-versions/{versionId}/validate`

**Forms**

- `F-ANALYSIS-CASE`
- `F-ANALYSIS-VERSION`

**Rules**

- Sources must be VERIFIED
- AI draft requires human validation

#### `/dashboard/oim/direktif-tugas` — Directive & Tasking

**Page type:** `list-builder`

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

**Load APIs**

- `GET /api/v1/directives`
- `GET /api/v1/uuk-strs`
- `GET /api/v1/tasks`
- `GET /api/v1/position-assignments`

**Actions**

- `POST /api/v1/tasks`
- `POST /api/v1/tasks/{taskId}/assignments`
- `PUT /api/v1/tasks/{taskId}/target-areas`
- `POST /api/v1/tasks/{taskId}/cancel`

**Forms**

- `F-TASK`
- `F-TASK-ASSIGNMENT`

**Rules**

- OIM assigns Field Coordinator, not Field Officer directly

#### `/dashboard/oim/laporan-masuk` — Incoming Baket

**Page type:** `queue-detail`

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

**Load APIs**

- `GET /api/v1/bakets`
- `GET /api/v1/bakets/{baketId}`
- `GET /api/v1/bakets/{baketId}/traceability`

**Actions**

- `POST /api/v1/baket-versions/{versionId}/verification`

**Forms**

- `F-VERIFICATION-CREATE`

**Rules**

- This page receives Baket, not raw WhatsApp

#### `/dashboard/oim/monitoring-lapangan` — Field Monitoring

**Page type:** `analytics-map`

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

**Load APIs**

- `GET /api/v1/dashboard/task-performance`
- `GET /api/v1/tasks`
- `GET /api/v1/bakets`
- `GET /api/v1/personnel-location-map`
- `GET /api/v1/emergency-incidents`

**Actions**

- `Open task/report/emergency`

**Forms**

- No direct mutation form.

**Rules**

- Managerial direct command chain only

**Map mode:** `oim-monitoring`

#### `/dashboard/oim/pengajuan-persetujuan` — Submission & Approval Tracking

**Page type:** `queue`

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

**Load APIs**

- `GET /api/v1/products`
- `GET /api/v1/approval-workflows/{workflowId}`
- `GET /api/v1/approval-workflows/{workflowId}/timeline`

**Actions**

- `POST /api/v1/product-versions/{versionId}/validate`
- `POST /api/v1/products/{productId}/submit`

**Forms**

- `F-PRODUCT-SUBMIT`

**Rules**

- Submit exact immutable product version

#### `/dashboard/oim/peta-situasi` — OIM Situation Map

**Page type:** `map`

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

**Load APIs**

- `GET /api/v1/map/reports`
- `GET /api/v1/map/clusters`
- `GET /api/v1/map/heatmap`
- `GET /api/v1/administrative-areas/boundaries`
- `GET /api/v1/alerts`

**Actions**

- `Open Baket/verification`
- `Create analysis from selected items`

**Forms**

- No direct mutation form.

**Rules**

- Source identity masked according to clearance

**Map mode:** `oim-situation`

#### `/dashboard/oim/produk-intelijen` — Intelligence Products Workspace

**Page type:** `landing`

**Displayed data**

- Draft count
- Needs revision
- Submitted
- Approved
- Template shortcuts

**Filters / URL params**

- `status`
- `productTypeId`

**Load APIs**

- `GET /api/v1/products`
- `GET /api/v1/product-types`

**Actions**

- `Create product`
- `Open product list`

**Forms**

- No direct mutation form.

**Rules**

- Parent navigation

#### `/dashboard/oim/produk-intelijen/buat-produk` — Product Builder

**Page type:** `dynamic-form`

**Displayed data**

- Product type
- Template sections
- Source verifications
- Source analyses
- Attachments
- Validation panel

**Filters / URL params**

- None; use resource ID or bootstrap context.

**Load APIs**

- `GET /api/v1/product-types`
- `GET /api/v1/product-types/{productTypeId}/templates`
- `GET /api/v1/product-templates/{templateId}`
- `GET /api/v1/verifications`
- `GET /api/v1/analysis-cases`

**Actions**

- `POST /api/v1/products`
- `PATCH /api/v1/product-versions/{versionId}`
- `PUT /api/v1/product-versions/{versionId}/source-verifications`
- `PUT /api/v1/product-versions/{versionId}/source-analyses`
- `PUT /api/v1/product-versions/{versionId}/attachments`
- `POST /api/v1/product-versions/{versionId}/validate`

**Forms**

- `F-PRODUCT`

**Rules**

- Form generated from active template
- No PDF requirement

#### `/dashboard/oim/produk-intelijen/daftar-produk` — Product List

**Page type:** `list-detail`

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

**Load APIs**

- `GET /api/v1/products`
- `GET /api/v1/products/{productId}`
- `GET /api/v1/products/{productId}/versions`
- `GET /api/v1/products/{productId}/timeline`

**Actions**

- `Create revision`
- `Validate`
- `Submit`
- `Archive`

**Forms**

- `F-PRODUCT-REVISION`

**Rules**

- Submitted/approved versions immutable

#### `/dashboard/oim/verifikasi-neraca-penilaian` — Verification & Assessment Balance

**Page type:** `workspace`

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

**Load APIs**

- `GET /api/v1/verifications`
- `GET /api/v1/verifications/{verificationId}`
- `GET /api/v1/verifications/{verificationId}/score`

**Actions**

- `POST /api/v1/verifications/{verificationId}/start`
- `PATCH /api/v1/verifications/{verificationId}`
- `PUT /api/v1/verifications/{verificationId}/checks`
- `PUT /api/v1/verifications/{verificationId}/cross-references`
- `POST /api/v1/verifications/{verificationId}/complete`
- `POST /api/v1/verifications/{verificationId}/needs-development`
- `POST /api/v1/verifications/{verificationId}/reject`

**Forms**

- `F-VERIFICATION`

**Rules**

- Only OIM assigns A-F/1-6
- One canonical verification per BaketVersion

### 4.6 Field Coordinator

#### `/dashboard/field-coordinator` — Field Coordination Dashboard

**Page type:** `dashboard`

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

**Load APIs**

- `GET /api/v1/dashboard/overview`
- `GET /api/v1/dashboard/task-performance`
- `GET /api/v1/tasks`
- `GET /api/v1/personnel-location-map`
- `GET /api/v1/emergency-incidents`

**Actions**

- `Acknowledge task`
- `Assign Field Officer`
- `Open emergency`

**Forms**

- No direct mutation form.

**Rules**

- Only own command branch and area scope

#### `/dashboard/field-coordinator/laporan-darurat` — Field Emergency Monitor

**Page type:** `queue-map`

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

**Load APIs**

- `GET /api/v1/emergency-incidents`
- `GET /api/v1/emergency-incidents/{incidentId}`
- `GET /api/v1/alerts`

**Actions**

- `POST /api/v1/emergency-incidents/{incidentId}/acknowledge`
- `POST /api/v1/emergency-incidents/{incidentId}/verify`
- `POST /api/v1/emergency-incidents/{incidentId}/start-response`
- `POST /api/v1/emergency-incidents/{incidentId}/mark-controlled`
- `POST /api/v1/emergency-incidents/{incidentId}/resolve`

**Forms**

- `F-EMERGENCY-ACTION`

**Rules**

- Direct command chain only

**Map mode:** `emergency-field`

#### `/dashboard/field-coordinator/laporan-lapangan` — Field Reports

**Page type:** `list-detail`

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

**Load APIs**

- `GET /api/v1/bakets`
- `GET /api/v1/bakets/{baketId}`
- `GET /api/v1/bakets/{baketId}/timeline`

**Actions**

- `Open detail`
- `Open source task`
- `No formal verification action`

**Forms**

- No direct mutation form.

**Rules**

- Field Coordinator does not assign A-F/1-6

#### `/dashboard/field-coordinator/monitoring-tugas` — Task Monitoring

**Page type:** `analytics-table`

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

**Load APIs**

- `GET /api/v1/tasks`
- `GET /api/v1/tasks/{taskId}/cascade`
- `GET /api/v1/tasks/{taskId}/progress-summary`
- `GET /api/v1/dashboard/task-performance`

**Actions**

- `Open assignment`
- `Reassign if permitted`
- `Escalate emergency operationally`

**Forms**

- `F-TASK-REASSIGN`

**Rules**

- No status patch; use action endpoints

#### `/dashboard/field-coordinator/penugasan-field-officer` — Assign Field Officer

**Page type:** `assignment-builder`

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

**Load APIs**

- `GET /api/v1/tasks/{taskId}`
- `GET /api/v1/position-assignments`
- `GET /api/v1/positions/{positionId}/subordinates`
- `GET /api/v1/dashboard/task-performance`

**Actions**

- `POST /api/v1/tasks/{taskId}/assignments`

**Forms**

- `F-TASK-ASSIGNMENT`

**Rules**

- Assignee must be subordinate Field Officer and cover target area

#### `/dashboard/field-coordinator/personel-jaring` — Personnel & Jaring

**Page type:** `tabs`

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

**Load APIs**

- `GET /api/v1/position-assignments`
- `GET /api/v1/jaring`
- `GET /api/v1/jaring/{jaringId}/caretakers`
- `GET /api/v1/jaring/{jaringId}/area-coverages`

**Actions**

- `Transfer caretaker`
- `Update Jaring coverage`
- `Open personnel`

**Forms**

- `F-JARING-TRANSFER`
- `F-JARING-COVERAGE`

**Rules**

- Only Jaring and personnel inside command chain

#### `/dashboard/field-coordinator/personel-lapangan` — Field Personnel

**Page type:** `directory-map`

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

**Load APIs**

- `GET /api/v1/position-assignments`
- `GET /api/v1/personnel-location-map`
- `GET /api/v1/dashboard/task-performance`

**Actions**

- `Open personnel detail`
- `Open assignment form`

**Forms**

- No direct mutation form.

**Rules**

- Location access audited
- Stale location clearly marked

#### `/dashboard/field-coordinator/peta-lapangan` — Field Operations Map

**Page type:** `map`

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

**Load APIs**

- `GET /api/v1/personnel-location-map`
- `GET /api/v1/map/reports`
- `GET /api/v1/map/clusters`
- `GET /api/v1/administrative-areas/boundaries`
- `GET /api/v1/emergency-incidents`

**Actions**

- `Select personnel`
- `Select report`
- `Drill area`

**Forms**

- No direct mutation form.

**Rules**

- Task-target map requires GAP-MAP-001 or client transform from tasks

**Map mode:** `field-operations`

#### `/dashboard/field-coordinator/tugas-lapangan` — Field Task Workspace

**Page type:** `landing`

**Displayed data**

- Received tasks
- Team assignments
- Operational board
- Overdue alerts

**Filters / URL params**

- `status`
- `priority`
- `areaId`

**Load APIs**

- `GET /api/v1/tasks`
- `GET /api/v1/dashboard/task-performance`

**Actions**

- `Open received task`
- `Open team assignment`

**Forms**

- No direct mutation form.

**Rules**

- Parent navigation page

#### `/dashboard/field-coordinator/tugas-lapangan/tugas-diterima` — Received Tasks

**Page type:** `inbox`

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

**Load APIs**

- `GET /api/v1/tasks`
- `GET /api/v1/task-assignments/{assignmentId}`

**Actions**

- `POST /api/v1/task-assignments/{assignmentId}/mark-read`
- `POST /api/v1/task-assignments/{assignmentId}/acknowledge`
- `POST /api/v1/task-assignments/{assignmentId}/start`

**Forms**

- `F-TASK-START`

**Rules**

- Only own assignments

#### `/dashboard/field-coordinator/tugas-lapangan/penugasan-tim` — Team Assignment

**Page type:** `assignment-builder`

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

**Load APIs**

- `GET /api/v1/tasks/{taskId}`
- `GET /api/v1/positions/{positionId}/subordinates`
- `GET /api/v1/position-assignments`
- `GET /api/v1/tasks/{taskId}/assignments`

**Actions**

- `POST /api/v1/tasks/{taskId}/assignments`
- `POST /api/v1/task-assignments/{assignmentId}/reassign`

**Forms**

- `F-TASK-ASSIGNMENT`
- `F-TASK-REASSIGN`

**Rules**

- One action may create multiple assignments atomically

#### `/dashboard/field-coordinator/tugas-operasional` — Operational Task Board

**Page type:** `kanban`

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

**Load APIs**

- `GET /api/v1/tasks`
- `GET /api/v1/tasks/{taskId}/assignments`
- `GET /api/v1/tasks/{taskId}/progress-summary`

**Actions**

- `Open task`
- `Reassign`
- `Cancel child task if permitted`

**Forms**

- `F-TASK-REASSIGN`

**Rules**

- Drag-and-drop must call explicit action, not local status mutation

### 4.7 Field Officer

#### `/dashboard/field-officer` — Field Officer Dashboard

**Page type:** `dashboard`

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

**Load APIs**

- `GET /api/v1/dashboard/overview`
- `GET /api/v1/tasks`
- `GET /api/v1/whatsapp-inbox/summary`
- `GET /api/v1/bakets`
- `GET /api/v1/emergency-incidents`

**Actions**

- `Open task`
- `Create Baket`
- `Send emergency report`

**Forms**

- No direct mutation form.

**Rules**

- Only own assignment and Jaring

#### `/dashboard/field-officer/buat-baket` — Create Baket

**Page type:** `wizard`

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

- None; use resource ID or bootstrap context.

**Load APIs**

- `GET /api/v1/tasks`
- `GET /api/v1/whatsapp-messages`
- `GET /api/v1/administrative-areas/tree`
- `GET /api/v1/reference-data/enums`

**Actions**

- `POST /api/v1/bakets`
- `PATCH /api/v1/baket-versions/{versionId}`
- `PUT /api/v1/bakets/{baketId}/source-messages`
- `PUT /api/v1/bakets/{baketId}/attachments`
- `POST /api/v1/baket-versions/{versionId}/resolve-area`
- `POST /api/v1/baket-versions/{versionId}/manual-area-override`
- `POST /api/v1/baket-versions/{versionId}/validate-coverage`

**Forms**

- `F-BAKET-DRAFT`
- `F-MANUAL-AREA-OVERRIDE`

**Rules**

- No A-F/1-6 fields
- Original WhatsApp immutable
- Draft autosave allowed

#### `/dashboard/field-officer/jaring-binaan` — Managed Jaring

**Page type:** `list-detail`

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

**Load APIs**

- `GET /api/v1/jaring`
- `GET /api/v1/jaring/{jaringId}`
- `GET /api/v1/jaring/{jaringId}/messages`
- `GET /api/v1/jaring/{jaringId}/bakets`

**Actions**

- `POST /api/v1/jaring`
- `PATCH /api/v1/jaring/{jaringId}`
- `POST /api/v1/jaring/{jaringId}/activate`
- `POST /api/v1/jaring/{jaringId}/deactivate`
- `PUT /api/v1/jaring/{jaringId}/area-coverages`

**Forms**

- `F-JARING`
- `F-JARING-COVERAGE`

**Rules**

- Field Officer manages assigned Jaring only

#### `/dashboard/field-officer/kirim-baket` — Submit Baket

**Page type:** `review-submit`

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

**Load APIs**

- `GET /api/v1/bakets`
- `GET /api/v1/bakets/{baketId}`
- `GET /api/v1/bakets/{baketId}/revision-requests`

**Actions**

- `POST /api/v1/bakets/{baketId}/submit`
- `POST /api/v1/bakets/{baketId}/resubmit`

**Forms**

- `F-BAKET-SUBMIT`

**Rules**

- Idempotency-Key and If-Match
- Target OIM resolved by reporting branch

#### `/dashboard/field-officer/kotak-masuk-jaring` — Jaring Inbox

**Page type:** `inbox-detail`

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

**Load APIs**

- `GET /api/v1/whatsapp-messages`
- `GET /api/v1/whatsapp-messages/{messageId}`
- `GET /api/v1/whatsapp-messages/{messageId}/routing-logs`

**Actions**

- `POST /api/v1/whatsapp-messages/{messageId}/validate`
- `POST /api/v1/whatsapp-messages/{messageId}/resolve-area`
- `POST /api/v1/whatsapp-messages/{messageId}/mark-spam`
- `POST /api/v1/whatsapp-messages/{messageId}/mark-duplicate`
- `POST /api/v1/whatsapp-messages/{messageId}/create-baket`

**Forms**

- `F-WHATSAPP-VALIDATE`
- `F-WHATSAPP-DUPLICATE`

**Rules**

- Raw message immutable
- Only routed messages visible

#### `/dashboard/field-officer/laporan-darurat` — Emergency Report

**Page type:** `quick-form`

**Displayed data**

- Large severity selector
- Situation
- Action taken
- Needs
- GPS status
- Attachments
- Send confirmation

**Filters / URL params**

- None; use resource ID or bootstrap context.

**Load APIs**

- `GET /api/v1/me`
- `GET /api/v1/personnel-location-pings/me/latest`

**Actions**

- `POST /api/v1/emergency-incidents`

**Forms**

- `F-EMERGENCY-CREATE`

**Rules**

- Must work without GPS
- Idempotency-Key
- One-task-per-screen mobile

#### `/dashboard/field-officer/laporan-saya` — My Baket

**Page type:** `list-detail`

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

**Load APIs**

- `GET /api/v1/bakets`
- `GET /api/v1/bakets/{baketId}`
- `GET /api/v1/bakets/{baketId}/timeline`
- `GET /api/v1/bakets/{baketId}/revision-requests`

**Actions**

- `Create revision version`
- `Resolve revision request`
- `Resubmit`

**Forms**

- `F-BAKET-REVISION`

**Rules**

- Only own Baket

#### `/dashboard/field-officer/peta-tugas` — My Task Map

**Page type:** `map`

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

**Load APIs**

- `GET /api/v1/tasks`
- `GET /api/v1/map/reports`
- `GET /api/v1/personnel-location-pings/me/latest`
- `GET /api/v1/administrative-areas/boundaries`

**Actions**

- `Open task`
- `Start task`
- `Create Baket at selected task`

**Forms**

- No direct mutation form.

**Rules**

- Task-target GeoJSON requires GAP-MAP-001 or client-derived centroids

**Map mode:** `my-task-map`

#### `/dashboard/field-officer/tugas-saya` — My Tasks

**Page type:** `inbox-kanban`

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

**Load APIs**

- `GET /api/v1/tasks`
- `GET /api/v1/task-assignments/{assignmentId}`

**Actions**

- `POST /api/v1/task-assignments/{assignmentId}/mark-read`
- `POST /api/v1/task-assignments/{assignmentId}/acknowledge`
- `POST /api/v1/task-assignments/{assignmentId}/start`
- `POST /api/v1/task-assignments/{assignmentId}/progress`
- `POST /api/v1/task-assignments/{assignmentId}/complete`

**Forms**

- `F-TASK-PROGRESS`
- `F-TASK-COMPLETE`

**Rules**

- Complete may require evidence/Baket

## 5. Form and Payload Catalog

The following forms are shared across pages. Path IDs are supplied by the selected resource, while query params belong in the URL and mutation data belongs in JSON request bodies.

### F-PROFILE-METADATA

**Endpoint:** `PATCH /api/v1/user-profiles/{userProfileId}`

**Request body**

```json
{
  "fullName": "string",
  "phone": "string|null",
  "username": "string|null"
}
```

**Rules**

- Self-service fields only; role, clearance, assignment are excluded.

### F-USER-PROVISION

**Endpoint:** `POST /api/v1/user-profiles/provision`

**Request body**

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

### F-USER-METADATA

**Endpoint:** `PATCH /api/v1/user-profiles/{userProfileId}`

**Request body**

```json
{
  "fullName": "string",
  "phone": "string|null",
  "clearanceLevel": "RAHASIA"
}
```

**Rules**

- Clearance update requires privileged permission and audit.

### F-USER-LOCK

**Endpoint:** `POST /api/v1/user-profiles/{userProfileId}/lock`

**Request body**

```json
{
  "reason": "string",
  "lockedUntil": "ISO-8601|null"
}
```

**Rules**

- Revoke sessions after lock.

### F-PRIMARY-ASSIGNMENT

**Endpoint:** `POST /api/v1/user-profiles/{userProfileId}/change-primary-assignment`

**Request body**

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

### F-INTEGRATION-CHANNEL

**Endpoint:** `POST /api/v1/integration-channels or PATCH /api/v1/integration-channels/{channelId}`

**Request body**

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

### F-WEBHOOK-RETRY

**Endpoint:** `POST /api/v1/webhook-events/{eventId}/retry`

**Request body**

```json
{
  "reason": "string"
}
```

**Rules**

- Idempotency-Key required.

### F-POSITION

**Endpoint:** `POST /api/v1/positions`

**Request body**

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

### F-REPORTING-LINE

**Endpoint:** `POST /api/v1/positions/{positionId}/change-reporting-line`

**Request body**

```json
{
  "reportsToPositionId": "uuid|null",
  "effectiveAt": "ISO-8601",
  "reason": "string"
}
```

**Rules**

- Prevent cycles; preserve audit history.

### F-AUDIT-EXPORT

**Endpoint:** `POST /api/v1/audit-exports`

**Request body**

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

### F-SYSTEM-SETTING

**Endpoint:** `PUT /api/v1/system/settings/{key}`

**Request body**

```json
{
  "value": "JSON",
  "description": "string|null",
  "isSecret": false
}
```

**Rules**

- If secret, display only masked status after save.

### F-PRODUCT-TYPE

**Endpoint:** `POST /api/v1/product-types`

**Request body**

```json
{
  "code": "LAPIN",
  "name": "Laporan Intelijen",
  "formatNo": "string|null",
  "description": "string|null"
}
```

### F-PRODUCT-TEMPLATE

**Endpoint:** `POST /api/v1/product-types/{productTypeId}/templates`

**Request body**

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

### F-POSITION-AREA-POLICY

**Endpoint:** `PUT /api/v1/position-area-policies/{policyId}`

**Request body**

```json
{
  "scopeMode": "EXPLICIT",
  "minimumAreas": 1,
  "maximumAreas": 5,
  "isActive": true
}
```

### F-ORGANIZATION-UNIT

**Endpoint:** `POST /api/v1/organization-units`

**Request body**

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

### F-UNIT-COVERAGE

**Endpoint:** `PUT /api/v1/organization-units/{unitId}/area-coverages`

**Request body**

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

### F-ADMIN-AREA

**Endpoint:** `POST /api/v1/administrative-areas`

**Request body**

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

### F-BOUNDARY-VERSION

**Endpoint:** `POST /api/v1/administrative-areas/{areaId}/boundaries`

**Request body**

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

### F-AREA-IMPORT

**Endpoint:** `POST /api/v1/administrative-area-imports`

**Request body**

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

### F-ROLE-PERMISSIONS

**Endpoint:** `PUT /api/v1/roles/{roleId}/permissions`

**Request body**

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

### F-DIRECTIVE

**Endpoint:** `POST /api/v1/directives`

**Request body**

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

### F-UUK-STR

**Endpoint:** `POST /api/v1/uuk-strs or PUT /api/v1/uuk-str-versions/{versionId}/sections`

**Request body**

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

### F-TASK

**Endpoint:** `POST /api/v1/tasks`

**Request body**

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

### F-TASK-ASSIGNMENT

**Endpoint:** `POST /api/v1/tasks/{taskId}/assignments`

**Request body**

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

### F-TASK-START

**Endpoint:** `POST /api/v1/task-assignments/{assignmentId}/start`

**Request body**

```json
{
  "note": "string|null"
}
```

**Rules**

- ACKNOWLEDGED -> IN_PROGRESS.

### F-TASK-PROGRESS

**Endpoint:** `POST /api/v1/task-assignments/{assignmentId}/progress`

**Request body**

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

### F-TASK-COMPLETE

**Endpoint:** `POST /api/v1/task-assignments/{assignmentId}/complete`

**Request body**

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

### F-TASK-REASSIGN

**Endpoint:** `POST /api/v1/task-assignments/{assignmentId}/reassign`

**Request body**

```json
{
  "newAssigneeAssignmentId": "uuid",
  "reason": "string",
  "dueDate": "ISO|null"
}
```

**Rules**

- Close old assignment and create linked replacement.

### F-JARING

**Endpoint:** `POST /api/v1/jaring`

**Request body**

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

### F-JARING-TRANSFER

**Endpoint:** `POST /api/v1/jaring/{jaringId}/caretaker-transfer`

**Request body**

```json
{
  "newFieldOfficerAssignmentId": "uuid",
  "effectiveAt": "ISO",
  "transferReason": "string"
}
```

**Rules**

- Exactly one active caretaker.

### F-JARING-COVERAGE

**Endpoint:** `PUT /api/v1/jaring/{jaringId}/area-coverages`

**Request body**

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

### F-WHATSAPP-VALIDATE

**Endpoint:** `POST /api/v1/whatsapp-messages/{messageId}/validate`

**Request body**

```json
{
  "decision": "VALID",
  "issueCodes": [],
  "note": "string|null"
}
```

**Rules**

- Supports multiple issue codes after schema hardening.

### F-WHATSAPP-DUPLICATE

**Endpoint:** `POST /api/v1/whatsapp-messages/{messageId}/mark-duplicate`

**Request body**

```json
{
  "duplicateOfMessageId": "uuid",
  "reason": "string"
}
```

### F-BAKET-DRAFT

**Endpoint:** `POST /api/v1/bakets and PATCH /api/v1/baket-versions/{versionId}`

**Request body**

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

### F-MANUAL-AREA-OVERRIDE

**Endpoint:** `POST /api/v1/baket-versions/{versionId}/manual-area-override`

**Request body**

```json
{
  "areaId": "uuid",
  "reason": "string"
}
```

**Rules**

- Audit original and overridden area.

### F-BAKET-SUBMIT

**Endpoint:** `POST /api/v1/bakets/{baketId}/submit or /resubmit`

**Request body**

```json
{
  "confirmation": "SUBMIT",
  "note": "string|null"
}
```

**Rules**

- Idempotency-Key and If-Match required.

### F-BAKET-REVISION

**Endpoint:** `POST /api/v1/bakets/{baketId}/versions`

**Request body**

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

### F-VERIFICATION-CREATE

**Endpoint:** `POST /api/v1/baket-versions/{versionId}/verification`

**Request body**

```json
{
  "note": "string|null"
}
```

**Rules**

- Only one canonical verification per BaketVersion.

### F-VERIFICATION

**Endpoint:** `PATCH /api/v1/verifications/{verificationId}`

**Request body**

```json
{
  "sourceReliability": "A",
  "informationCredibility": "TWO",
  "summary": "string"
}
```

**Rules**

- Checklist and cross references use separate PUT endpoints.

### F-ANALYSIS-CASE

**Endpoint:** `POST /api/v1/analysis-cases`

**Request body**

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

### F-ANALYSIS-VERSION

**Endpoint:** `PATCH /api/v1/analysis-versions/{versionId}`

**Request body**

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

### F-PRODUCT

**Endpoint:** `POST /api/v1/products and PATCH /api/v1/product-versions/{versionId}`

**Request body**

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

### F-PRODUCT-REVISION

**Endpoint:** `POST /api/v1/products/{productId}/versions`

**Request body**

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

### F-PRODUCT-SUBMIT

**Endpoint:** `POST /api/v1/products/{productId}/submit`

**Request body**

```json
{
  "versionId": "uuid",
  "confirmation": "SUBMIT"
}
```

**Rules**

- Creates approval workflow snapshot.

### F-APPROVAL-DECISION

**Endpoint:** `POST /api/v1/approval-steps/{stepId}/{approve|request-revision|reject|request-clarification}`

**Request body**

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

### F-PRODUCT-DISTRIBUTION

**Endpoint:** `POST /api/v1/product-versions/{versionId}/distributions`

**Request body**

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

### F-EMERGENCY-CREATE

**Endpoint:** `POST /api/v1/emergency-incidents`

**Request body**

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

### F-EMERGENCY-ACTION

**Endpoint:** `POST /api/v1/emergency-incidents/{incidentId}/{acknowledge|verify|start-response|mark-controlled|resolve}`

**Request body**

```json
{
  "note": "string",
  "actionPlan": "string|null",
  "resolution": "string|null"
}
```

**Rules**

- Body varies by action; state transition validated.

### F-ALERT-ACTION

**Endpoint:** `POST /api/v1/alerts/{alertId}/{acknowledge|assign|start|resolve}`

**Request body**

```json
{
  "note": "string|null",
  "assignedPositionId": "uuid|null",
  "resolution": "string|null"
}
```

**Rules**

- Body varies by action.

## 6. Cross-Page Interaction Rules

### 6.1 List to Detail

- Clicking a row opens a route or detail drawer.
- The detail API returns `availableActions`.
- Returning to the list preserves URL filters and scroll position.

### 6.2 Mutation

1. Open confirmation/form.
2. Client validation provides immediate feedback.
3. Send JSON body to explicit action endpoint.
4. Server validates permission, state, scope, and concurrency.
5. On success invalidate list, detail, dashboard, badge, and map queries affected by the action.

### 6.3 Optimistic Concurrency

- Editable drafts SHALL send `If-Match`.
- A stale update returns `409 VERSION_CONFLICT`.
- The frontend displays compare/reload options; it SHALL not silently overwrite.

### 6.4 Empty and Error States

| State | Required behavior |
|---|---|
| No data | Explain whether no data exists or filters exclude it. |
| Outside scope | Use masked not-found behavior for sensitive resources. |
| Map has no coordinates | Show unlocated count and list fallback. |
| Partial widget failure | Keep successful widgets visible and show retry for failed widget. |
| Integration degraded | Show stale timestamp and dependency status. |
| Validation failure | Focus first invalid field and preserve entered values. |

## 7. API Coverage Gaps Identified from the Current Menu Tree

The current API contract covers the domain workflows. The following are optional composition/spatial endpoints to reduce frontend over-fetching; they do not change core business rules.

| Gap ID | Recommended endpoint | Used by | Reason |
|---|---|---|---|
| GAP-COMP-001 | `GET /api/v1/dashboard/briefing` | Executive briefing | One scoped snapshot instead of five parallel calls. |
| GAP-MAP-001 | `GET /api/v1/map/tasks` | Field task maps | Return task targets/centroids as GeoJSON. |
| GAP-MAP-002 | `GET /api/v1/map/alerts` | Warning maps | Return alerts as scoped GeoJSON. |
| GAP-MAP-003 | `GET /api/v1/map/emergencies` | Emergency maps | Return emergency incidents as scoped GeoJSON. |
| GAP-UI-001 | Add `availableActions` to detail/list DTOs | All workflow pages | Prevent duplicated state/permission logic in frontend. |
| GAP-UI-002 | Add `facets` to list responses | All filterable lists | Accurate filter counts under the same security scope. |

Until these endpoints are added, the frontend may compose existing APIs only when result sizes are bounded and all data is already server-scoped.

## 8. Menu Rationalization Rules

- Executive `situasi-nasional` is real-time operational monitoring; `situasi-strategis` is longer-horizon trend and formal analysis.
- Executive `persetujuan` is a summary landing page; `persetujuan-eksekutif` is the actionable inbox.
- Executive `direktif` is list/tracking; `direktif-strategis` is the create/edit wizard. They should reuse one directive feature module.
- Field Coordinator `tugas-diterima`, `penugasan-tim`, and `tugas-operasional` are three views of the same Task/TaskAssignment domain, not separate stores.
- OIM `laporan-masuk` contains Baket from Field Officer, not raw WhatsApp.
- Regional Commander `jawaban-lapangan` shows task outputs and formal summaries; raw source identity remains restricted.

## 9. Acceptance Criteria

- **AC-FE-001:** Every menu route SHALL declare required permission and supported actions.
- **AC-FE-002:** Every list filter SHALL map to a documented query parameter.
- **AC-FE-003:** Every mutation SHALL map to a documented body schema and explicit action endpoint.
- **AC-FE-004:** Every workflow detail SHALL use server-calculated `availableActions`.
- **AC-FE-005:** All map queries SHALL send viewport and SHALL remain constrained by server scope.
- **AC-FE-006:** Parent area filters SHALL include descendants consistently across tables, charts, and maps.
- **AC-FE-007:** Raw WhatsApp and submitted/approved versions SHALL never be edited by frontend.
- **AC-FE-008:** All forms SHALL implement default, loading, error, disabled, success, and conflict states.
- **AC-FE-009:** Map controls, popups, keyboard focus, legends, and non-color cues SHALL meet WCAG AA.
- **AC-FE-010:** The same URL filter state SHALL drive table, KPI, chart, and map requests on a page.