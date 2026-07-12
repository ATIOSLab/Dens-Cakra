# DENS CAKRA Frontend Visual Page Blueprint

| Field | Value |
|---|---|
| Version | v1.0 |
| Date | 11 July 2026 |
| Status | Draft for UI Implementation |
| Scope | Visual composition for every menu page and its dynamic child routes |
| Baseline | API Contract, Master Route/API Manifest, App Router tree, and Global UI Rules |

## Revision History

| Version | Date | Description |
|---|---|---|
| v1.0 | 11 July 2026 | Complete visual blueprint: grids, cards, tables, charts, maps, forms, detail routes, filters, actions, and API sources. |

## 1. How to Read This Document

Setiap menu dijelaskan sebagai susunan visual yang harus tampil, bukan hanya nama halaman. Untuk setiap halaman ditentukan:

- Tujuan halaman.
- Susunan grid desktop.
- Jenis komponen: KPI card, table, chart, map, queue, form, timeline, atau detail panel.
- Data/kolom yang terlihat.
- Filter URL.
- API yang menjadi sumber data.
- Action endpoint.
- Child route untuk detail/create/edit/version/action.

## 2. Global Grid Rules

```text
Desktop: 12 columns, gap 16 px
Tablet : 8 columns
Mobile : 1 column
```

Rules:

- Satu viewport hanya memiliki satu panel utama yang paling dominan.
- KPI maksimal empat card per row.
- Map utama memakai 8–9 kolom; queue/detail memakai 3–4 kolom.
- Detail standar memakai 8 kolom konten + 4 kolom metadata/action.
- Queue-detail memakai 4 kolom queue + 8 kolom detail.
- Wizard memakai 8 kolom form + 4 kolom validation/review rail.
- Semua filter disimpan pada URL search params.
- Semua action workflow mengikuti `availableActions` dari server.

## 3. Standard Visual Patterns

### 3.1 Dashboard

```text
Row 1: [KPI][KPI][KPI][KPI]
Row 2: [Primary map/chart 8 col][Priority queue 4 col]
Row 3: [Trend/activity 8 col][Breakdown 4 col]
Row 4: [Recent items / quick actions 12 col]
```

### 3.2 List + Detail

```text
Header + Filter Bar
[List/Table 5 col][Selected Detail 7 col]
Pagination / Timeline
```

### 3.3 Queue + Workflow

```text
[Queue 4 col][Evidence/Content 5 col][Decision 3 col]
[Workflow Timeline 12 col]
```

### 3.4 Map Workspace

```text
Filter / Layer Toolbar
[Map 9 col][Selected Feature 3 col]
Legend / Scope / Last Refresh / Unlocated List
```

### 3.5 Wizard/Form

```text
Stepper
[Form 8 col][Validation / Review 4 col]
Sticky Save / Next / Submit
```

## 4. Page-by-Page Blueprint

# Global

## `/dashboard` — Role Dashboard Redirect

**Page type:** `redirect`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Workspace Resolver | Full-page system state | `12/12` | Memeriksa session, role, primary assignment, dan mengarahkan user ke dashboard role. | Loading indicator, Role mismatch error, Missing assignment guidance |

### Filters / URL Params

- No page-level filters.

### Data APIs

- `GET /api/v1/me`
- `GET /api/v1/me/authorization-context`

### Actions

- `Redirect ke workspace berdasarkan business role dan primary assignment`

## `/dashboard/notifications` — Notifications

**Page type:** `list`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Notification Summary | 3 KPI cards | `12/12` | Menampilkan unread, critical, dan hari ini. | Unread count, Critical count, Today count |
| Notification Filters | Filter bar | `12/12` | Memfilter notification. | Unread only, Type, Date |
| Notification Feed | Chronological card list | `8/12` | Daftar notification dengan icon, type, title, message, time, read state. | Type, Title, Message, Timestamp, Read state, Deep link |
| Notification Context | Sticky side card | `4/12` | Ringkasan notification terpilih dan resource tujuan. | Resource type, Resource ID, Action |

### Filters / URL Params

- `unreadOnly`
- `type`
- `cursor`
- `limit`

### Data APIs

- `GET /api/v1/notifications`
- `GET /api/v1/notifications/unread-count`

### Actions

- `POST /api/v1/notifications/{notificationId}/read`
- `POST /api/v1/notifications/read-all`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/notifications` | `list` | Notification | 8-column main content + 4-column sticky metadata/actions | Notification detail, Resource link, Read state | — |

## `/dashboard/profil` — Profile & Security

**Page type:** `detail`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Identity Header | Profile summary card | `12/12` | Identitas user dan status akses. | Name, Email, Phone, Business role, Status |
| Position & Scope | Two-column metadata cards | `8/12` | Jabatan, unit, clearance, dan area scope. | Position, Unit, Clearance, Area scopes |
| Security | Security action card | `4/12` | Session aktif dan tindakan keamanan. | Active sessions, Last login, Password status |
| Assignment History | Timeline | `12/12` | Riwayat jabatan dan masa berlaku. | Position, Unit, Valid from, Valid until |

### Filters / URL Params

- No page-level filters.

### Data APIs

- `GET /api/v1/me`
- `GET /api/v1/me/authorization-context`
- `GET /api/v1/me/area-scopes`

### Actions

- `POST /api/v1/me/revoke-other-sessions`
- `Better Auth password/session actions`

### Form Contracts

- `F-PROFILE-METADATA`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/profil` | `detail` | UserProfile | 8-column main content + 4-column sticky metadata/actions | Identity header, Auth/domain role status, Primary assignment, Clearance, Area scope, Assignment timeline, Security actions | — |
| `/dashboard/profil/keamanan` | `action-page` | UserProfile | 7-column evidence/detail + 5-column sticky action panel | Identity header, Auth/domain role status, Primary assignment, Clearance, Area scope, Assignment timeline, Security actions | — |

# Admin System

## `/dashboard/admin-system` — System Dashboard

**Page type:** `dashboard`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| System KPI | 4 KPI cards | `12/12` | Ringkasan kesehatan sistem. | Readiness, WA health, Active users, Security alerts |
| Integration Health | Status cards + line chart | `8/12` | Health channel dan tren webhook. | Channel status, Success rate, Latency, Last heartbeat |
| Provisioning Queue | Priority queue card | `4/12` | User pending, locked, dan assignment kosong. | Pending users, Locked users, Missing assignment |
| Audit Activity | Activity timeline | `12/12` | Tindakan keamanan dan administrasi terbaru. | Action, Actor, Entity, Timestamp |
| Quick Access | 6 quick-access cards | `12/12` | Shortcut ke modul admin. | Users, Roles, Organization, Integration, Audit, Settings |

### Filters / URL Params

- `from`
- `to`
- `channelId`
- `severity`

### Data APIs

- `GET /api/v1/system/diagnostics`
- `GET /api/v1/health/ready`
- `GET /api/v1/integration-channels`
- `GET /api/v1/audit-logs`

### Actions

- `Open integration detail`
- `Open audit investigation`

## `/dashboard/admin-system/integrasi-wa-center` — WA Center Integration

**Page type:** `master-detail`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Integration KPI | 4 KPI cards | `12/12` | Status operasional WA Center. | Active channels, Success rate, Failed events, Queue depth |
| Channel Health | Line/area chart | `8/12` | Tren success/failure dan latency per waktu. | Success, Failure, Latency |
| Channel Status | Status card stack | `4/12` | Status tiap channel. | Name, Provider, Status, Last health |
| Channel Table | Data table | `12/12` | Daftar channel. | Code, Name, Type, Status, Last test, Updated at |
| Webhook Events | Data table + detail drawer | `12/12` | Riwayat webhook immutable. | External event ID, Channel, Received at, Success, Error, Retry count |

### Filters / URL Params

- `status`
- `channelType`
- `success`
- `from`
- `to`
- `page`
- `limit`

### Data APIs

- `GET /api/v1/integration-channels`
- `GET /api/v1/integration-channels/{channelId}`
- `GET /api/v1/integration-channels/{channelId}/webhook-events`
- `GET /api/v1/whatsapp-inbox/summary`

### Actions

- `POST /api/v1/integration-channels`
- `PATCH /api/v1/integration-channels/{channelId}`
- `POST /api/v1/integration-channels/{channelId}/activate`
- `POST /api/v1/integration-channels/{channelId}/deactivate`
- `POST /api/v1/integration-channels/{channelId}/test`
- `POST /api/v1/webhook-events/{eventId}/retry`

### Form Contracts

- `F-INTEGRATION-CHANNEL`
- `F-WEBHOOK-RETRY`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/admin-system/integrasi-wa-center/baru` | `create` | IntegrationChannel | 8-column form + 4-column sticky validation/metadata rail | Channel summary, Health metrics, Masked config, Webhook table, Error timeline, Actions | `POST /api/v1/integration-channels` |
| `/dashboard/admin-system/integrasi-wa-center/[channelId]` | `detail` | IntegrationChannel | 8-column main content + 4-column sticky metadata/actions | Channel summary, Health metrics, Masked config, Webhook table, Error timeline, Actions | `GET /api/v1/integration-channels/{channelId}`<br>`GET /api/v1/integration-channels/{channelId}/webhook-events` |
| `/dashboard/admin-system/integrasi-wa-center/[channelId]/edit` | `edit` | IntegrationChannel | 8-column form + 4-column sticky validation/metadata rail | Channel summary, Health metrics, Masked config, Webhook table, Error timeline, Actions | `GET /api/v1/integration-channels/{channelId}`<br>`GET /api/v1/integration-channels/{channelId}/webhook-events`<br>`PATCH /api/v1/integration-channels/{channelId}` |
| `/dashboard/admin-system/integrasi-wa-center/[channelId]/webhooks/[eventId]` | `detail` | IntegrationChannel | 8-column main content + 4-column sticky metadata/actions | Channel summary, Health metrics, Masked config, Webhook table, Error timeline, Actions | `GET /api/v1/integration-channels/{channelId}`<br>`GET /api/v1/integration-channels/{channelId}/webhook-events`<br>`GET /api/v1/webhook-events/{eventId}`<br>`POST /api/v1/webhook-events/{eventId}/retry` |

## `/dashboard/admin-system/jabatan-reporting-line` — Position & Reporting Line

**Page type:** `tree-table`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Position Summary | 4 KPI cards | `12/12` | Ringkasan seat dan occupancy. | Total positions, Occupied, Vacant, Invalid reporting line |
| Organization/Position Tree | Expandable tree | `4/12` | Navigasi unit dan posisi. | Unit, Position, Role |
| Position Table | Data table | `8/12` | Data jabatan dan reporting line. | Seat code, Title, Position code, Role, Unit, Occupant, Reports to, Status |
| Reporting Chain | Vertical hierarchy card | `12/12` | Atasan dan bawahan posisi terpilih. | Ancestors, Selected position, Subordinates |

### Filters / URL Params

- `unitId`
- `positionCode`
- `roleCode`
- `isActive`
- `q`
- `page`
- `limit`

### Data APIs

- `GET /api/v1/positions`
- `GET /api/v1/positions/{positionId}`
- `GET /api/v1/positions/{positionId}/subordinates`
- `GET /api/v1/positions/{positionId}/reporting-chain`
- `GET /api/v1/position-assignments`

### Actions

- `POST /api/v1/positions`
- `PATCH /api/v1/positions/{positionId}`
- `POST /api/v1/positions/{positionId}/change-reporting-line`

### Form Contracts

- `F-POSITION`
- `F-REPORTING-LINE`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/admin-system/jabatan-reporting-line/baru` | `create` | Position | 8-column form + 4-column sticky validation/metadata rail | Seat summary, Organization path, Occupant, Reports-to chain, Subordinates, Area policy, Actions | `GET /api/v1/roles`<br>`GET /api/v1/organization-units`<br>`GET /api/v1/positions`<br>`POST /api/v1/positions` |
| `/dashboard/admin-system/jabatan-reporting-line/[positionId]` | `detail` | Position | 8-column main content + 4-column sticky metadata/actions | Seat summary, Organization path, Occupant, Reports-to chain, Subordinates, Area policy, Actions | `GET /api/v1/positions/{positionId}` |
| `/dashboard/admin-system/jabatan-reporting-line/[positionId]/edit` | `edit` | Position | 8-column form + 4-column sticky validation/metadata rail | Seat summary, Organization path, Occupant, Reports-to chain, Subordinates, Area policy, Actions | `GET /api/v1/positions/{positionId}`<br>`PATCH /api/v1/positions/{positionId}` |
| `/dashboard/admin-system/jabatan-reporting-line/[positionId]/reporting-line` | `action-page` | Position | 7-column evidence/detail + 5-column sticky action panel | Seat summary, Organization path, Occupant, Reports-to chain, Subordinates, Area policy, Actions | `GET /api/v1/positions/{positionId}`<br>`GET /api/v1/positions/{positionId}/reporting-chain`<br>`POST /api/v1/positions/{positionId}/change-reporting-line` |

## `/dashboard/admin-system/keamanan-audit` — Security & Audit

**Page type:** `investigation`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Security KPI | 4 KPI cards | `12/12` | Ringkasan aktivitas keamanan. | Login failures, Locked accounts, Privilege changes, Exports |
| Audit Trend | Stacked area chart | `8/12` | Tren action berdasarkan kategori. | Auth, User, Task, Baket, Product, Export |
| Anomaly Queue | Priority list | `4/12` | Event yang perlu investigasi. | Severity, Action, Actor, Age |
| Audit Log | Data table | `12/12` | Event append-only. | Timestamp, Actor, Assignment, Action, Entity, IP, Result |
| Event Detail | Side drawer | `Overlay` | Before/after diff dan metadata. | Before, After, Request ID, Device, Reason |

### Filters / URL Params

- `actorUserProfileId`
- `actorAssignmentId`
- `action`
- `entityType`
- `entityId`
- `from`
- `to`
- `page`
- `limit`

### Data APIs

- `GET /api/v1/audit-logs`
- `GET /api/v1/audit-logs/{auditLogId}`
- `GET /api/v1/entities/{entityType}/{entityId}/audit-trail`

### Actions

- `POST /api/v1/audit-exports`
- `Open related entity if authorized`

### Form Contracts

- `F-AUDIT-EXPORT`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/admin-system/keamanan-audit/[auditLogId]` | `detail` | AuditLog | 8-column main content + 4-column sticky metadata/actions | Event header, Actor/device, Entity, Before/after diff, Request metadata, Related audit chain | `GET /api/v1/audit-logs/{auditLogId}` |
| `/dashboard/admin-system/keamanan-audit/exports/baru` | `create` | AuditLog | 8-column form + 4-column sticky validation/metadata rail | Event header, Actor/device, Entity, Before/after diff, Request metadata, Related audit chain | `POST /api/v1/audit-exports` |
| `/dashboard/admin-system/keamanan-audit/exports/[jobId]` | `detail` | AuditLog | 8-column main content + 4-column sticky metadata/actions | Event header, Actor/device, Entity, Before/after diff, Request metadata, Related audit chain | — |

## `/dashboard/admin-system/konfigurasi-sistem` — System Configuration

**Page type:** `settings`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Setting Navigation | Vertical category navigation | `3/12` | Kelompok konfigurasi. | General, Security, Integration, Retention, Notification |
| Setting Sections | Form cards | `9/12` | Konfigurasi per kelompok. | Key, Value, Description, Secret flag, Last updated |
| Diagnostics | Status panel | `12/12` | Validasi efek konfigurasi dan dependency. | Service readiness, Database, PostGIS, Integration |

### Filters / URL Params

- `group`
- `q`
- `isSecret`

### Data APIs

- `GET /api/v1/system/settings`
- `GET /api/v1/system/settings/{key}`
- `GET /api/v1/system/diagnostics`

### Actions

- `PUT /api/v1/system/settings/{key}`

### Form Contracts

- `F-SYSTEM-SETTING`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/admin-system/konfigurasi-sistem/[settingKey]` | `detail-edit` | SystemSetting | 8-column form + 4-column sticky validation/metadata rail | Setting identity, Current value/masked secret, Description, Validation, Change confirmation | `GET /api/v1/system/settings/{key}`<br>`PUT /api/v1/system/settings/{key}` |

## `/dashboard/admin-system/master-data` — Reference & Master Data

**Page type:** `tabs`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Master Tabs | Tab navigation | `12/12` | Memilih jenis master data. | Product types, Templates, Area policies, Enums |
| Product Type Table | Data table | `12/12` | Daftar tipe produk. | Code, Name, Active template, Status |
| Template Cards | Card grid | `12/12` | Template dan versi. | Template name, Version, Sections, Active |
| Area Policy Table | Data table | `12/12` | Policy wilayah per position. | Position code, Scope mode, Minimum, Maximum, Active |

### Filters / URL Params

- `tab`
- `isActive`
- `q`
- `page`
- `limit`

### Data APIs

- `GET /api/v1/reference-data/enums`
- `GET /api/v1/product-types`
- `GET /api/v1/position-area-policies`

### Actions

- `POST /api/v1/product-types`
- `PATCH /api/v1/product-types/{productTypeId}`
- `POST /api/v1/product-types/{productTypeId}/templates`
- `POST /api/v1/product-templates/{templateId}/activate`
- `PUT /api/v1/position-area-policies/{policyId}`

### Form Contracts

- `F-PRODUCT-TYPE`
- `F-PRODUCT-TEMPLATE`
- `F-POSITION-AREA-POLICY`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/admin-system/master-data/product-types/baru` | `create` | Reference Data | 8-column form + 4-column sticky validation/metadata rail | Resource header, Main content, Metadata, Related records, Timeline, Available actions | `POST /api/v1/product-types` |
| `/dashboard/admin-system/master-data/product-types/[productTypeId]` | `detail` | Reference Data | 8-column main content + 4-column sticky metadata/actions | Resource header, Main content, Metadata, Related records, Timeline, Available actions | `GET /api/v1/product-types`<br>`GET /api/v1/product-types/{productTypeId}/templates` |
| `/dashboard/admin-system/master-data/product-types/[productTypeId]/templates/baru` | `create` | Reference Data | 8-column form + 4-column sticky validation/metadata rail | Resource header, Main content, Metadata, Related records, Timeline, Available actions | `GET /api/v1/product-types`<br>`GET /api/v1/product-types/{productTypeId}/templates` |
| `/dashboard/admin-system/master-data/product-types/[productTypeId]/templates/[templateId]` | `detail-edit` | Reference Data | 8-column form + 4-column sticky validation/metadata rail | Resource header, Main content, Metadata, Related records, Timeline, Available actions | `GET /api/v1/product-templates/{templateId}`<br>`POST /api/v1/product-templates/{templateId}/validate-content` |
| `/dashboard/admin-system/master-data/position-area-policies/[policyId]` | `detail-edit` | Reference Data | 8-column form + 4-column sticky validation/metadata rail | Resource header, Main content, Metadata, Related records, Timeline, Available actions | `GET /api/v1/position-area-policies`<br>`PUT /api/v1/position-area-policies/{policyId}` |

## `/dashboard/admin-system/organisasi-wilayah` — Organization & Administrative Area

**Page type:** `split-tree-map`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Scope Summary | 4 KPI cards | `12/12` | Ringkasan struktur dan data boundary. | Organization units, Administrative areas, Missing boundaries, Invalid boundaries |
| Organization Tree | Expandable tree | `4/12` | Hierarki organisasi. | Unit code, Name, Type, Status |
| Area Tree | Expandable tree | `4/12` | Hierarki wilayah administratif. | Code, Name, Level, Boundary status |
| Boundary Map | mapcn map | `8/12` | Visualisasi polygon dan coverage. | Selected boundary, Parent boundary, Coverage overlay |
| Selected Detail | Metadata card | `4/12` | Detail unit/wilayah terpilih. | Path, Coverage, Centroid, Data source, Quality |
| Import Jobs | Data table | `12/12` | Riwayat import wilayah/boundary. | Job ID, Mode, Status, Rows, Errors, Created at |

### Filters / URL Params

- `tab`
- `parentId`
- `level`
- `unitType`
- `q`
- `bbox`
- `zoom`
- `isActive`

### Data APIs

- `GET /api/v1/organization-units`
- `GET /api/v1/organization-units/{unitId}/tree`
- `GET /api/v1/administrative-areas/tree`
- `GET /api/v1/administrative-areas/boundaries`
- `GET /api/v1/administrative-area-imports/{jobId}`

### Actions

- `POST /api/v1/organization-units`
- `PATCH /api/v1/organization-units/{unitId}`
- `POST /api/v1/organization-units/{unitId}/move`
- `PUT /api/v1/organization-units/{unitId}/area-coverages`
- `POST /api/v1/administrative-areas`
- `PATCH /api/v1/administrative-areas/{areaId}`
- `POST /api/v1/administrative-areas/{areaId}/move`
- `POST /api/v1/administrative-areas/{areaId}/boundaries`
- `POST /api/v1/administrative-area-imports`

### Form Contracts

- `F-ORGANIZATION-UNIT`
- `F-UNIT-COVERAGE`
- `F-ADMIN-AREA`
- `F-BOUNDARY-VERSION`
- `F-AREA-IMPORT`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/admin-system/organisasi-wilayah/organisasi/baru` | `create` | OrganizationUnit + AdministrativeArea | 8-column form + 4-column sticky validation/metadata rail | Unit summary, Hierarchy breadcrumb, Children, Positions, Area coverage, Audit/history | `GET /api/v1/organization-units`<br>`POST /api/v1/organization-units` |
| `/dashboard/admin-system/organisasi-wilayah/organisasi/[unitId]` | `detail` | OrganizationUnit + AdministrativeArea | 8-column main content + 4-column sticky metadata/actions | Unit summary, Hierarchy breadcrumb, Children, Positions, Area coverage, Audit/history | `GET /api/v1/organization-units/{unitId}`<br>`GET /api/v1/organization-units/{unitId}/area-coverages` |
| `/dashboard/admin-system/organisasi-wilayah/organisasi/[unitId]/edit` | `edit` | OrganizationUnit + AdministrativeArea | 8-column form + 4-column sticky validation/metadata rail | Unit summary, Hierarchy breadcrumb, Children, Positions, Area coverage, Audit/history | `GET /api/v1/organization-units/{unitId}`<br>`GET /api/v1/organization-units/{unitId}/area-coverages`<br>`PATCH /api/v1/organization-units/{unitId}`<br>`POST /api/v1/organization-units/{unitId}/move` |
| `/dashboard/admin-system/organisasi-wilayah/wilayah/baru` | `create` | OrganizationUnit + AdministrativeArea | 8-column form + 4-column sticky validation/metadata rail | Unit summary, Hierarchy breadcrumb, Children, Positions, Area coverage, Audit/history | `GET /api/v1/administrative-areas/tree`<br>`POST /api/v1/administrative-areas` |
| `/dashboard/admin-system/organisasi-wilayah/wilayah/[areaId]` | `detail` | OrganizationUnit + AdministrativeArea | 8-column main content + 4-column sticky metadata/actions | Unit summary, Hierarchy breadcrumb, Children, Positions, Area coverage, Audit/history | `GET /api/v1/administrative-areas/{areaId}`<br>`GET /api/v1/administrative-areas/{areaId}/ancestors`<br>`GET /api/v1/administrative-areas/{areaId}/children` |
| `/dashboard/admin-system/organisasi-wilayah/wilayah/[areaId]/edit` | `edit` | OrganizationUnit + AdministrativeArea | 8-column form + 4-column sticky validation/metadata rail | Unit summary, Hierarchy breadcrumb, Children, Positions, Area coverage, Audit/history | `GET /api/v1/administrative-areas/{areaId}`<br>`GET /api/v1/administrative-areas/{areaId}/ancestors`<br>`GET /api/v1/administrative-areas/{areaId}/children`<br>`PATCH /api/v1/administrative-areas/{areaId}`<br>`POST /api/v1/administrative-areas/{areaId}/move` |
| `/dashboard/admin-system/organisasi-wilayah/wilayah/[areaId]/boundary` | `map-editor` | OrganizationUnit + AdministrativeArea | 8-column map editor + 4-column geometry/source validation | Unit summary, Hierarchy breadcrumb, Children, Positions, Area coverage, Audit/history | `GET /api/v1/administrative-areas/{areaId}`<br>`GET /api/v1/administrative-areas/{areaId}/ancestors`<br>`GET /api/v1/administrative-areas/{areaId}/children`<br>`GET /api/v1/administrative-areas/{areaId}/boundary`<br>`POST /api/v1/administrative-areas/{areaId}/boundaries` |
| `/dashboard/admin-system/organisasi-wilayah/imports/baru` | `create` | OrganizationUnit + AdministrativeArea | 8-column form + 4-column sticky validation/metadata rail | Unit summary, Hierarchy breadcrumb, Children, Positions, Area coverage, Audit/history | `POST /api/v1/files/presign`<br>`POST /api/v1/files/complete`<br>`POST /api/v1/administrative-area-imports` |
| `/dashboard/admin-system/organisasi-wilayah/imports/[jobId]` | `detail` | OrganizationUnit + AdministrativeArea | 8-column main content + 4-column sticky metadata/actions | Unit summary, Hierarchy breadcrumb, Children, Positions, Area coverage, Audit/history | `GET /api/v1/administrative-area-imports/{jobId}` |

## `/dashboard/admin-system/pengguna` — User Provisioning

**Page type:** `master-detail`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| User KPI | 4 KPI cards | `12/12` | Ringkasan lifecycle user. | Active, Pending, Suspended, Locked |
| User Filters | Filter bar | `12/12` | Pencarian dan filter user. | Search, Status, Role, Position, Unit, Area |
| User Table | Data table | `7/12` | Daftar user. | Name, Email, Auth role, Position, Unit, Status, Last login |
| Selected User | Sticky detail card | `5/12` | Profil, assignment, scope, dan action. | Identity, Role match, Primary assignment, Area scope, Clearance |
| Assignment Timeline | Timeline | `12/12` | Riwayat assignment. | Position, Unit, Effective dates, Reason |

### Filters / URL Params

- `q`
- `status`
- `roleCode`
- `positionCode`
- `unitId`
- `areaId`
- `page`
- `limit`

### Data APIs

- `GET /api/v1/user-profiles`
- `GET /api/v1/user-profiles/{userProfileId}`
- `GET /api/v1/user-profiles/{userProfileId}/assignments`

### Actions

- `POST /api/v1/user-profiles/provision`
- `PATCH /api/v1/user-profiles/{userProfileId}`
- `POST /api/v1/user-profiles/{userProfileId}/activate`
- `POST /api/v1/user-profiles/{userProfileId}/suspend`
- `POST /api/v1/user-profiles/{userProfileId}/lock`
- `POST /api/v1/user-profiles/{userProfileId}/unlock`
- `POST /api/v1/user-profiles/{userProfileId}/change-primary-assignment`
- `POST /api/v1/user-profiles/{userProfileId}/archive`

### Form Contracts

- `F-USER-PROVISION`
- `F-USER-METADATA`
- `F-USER-LOCK`
- `F-PRIMARY-ASSIGNMENT`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/admin-system/pengguna/baru` | `create` | UserProfile | 8-column form + 4-column sticky validation/metadata rail | Identity header, Auth/domain role status, Primary assignment, Clearance, Area scope, Assignment timeline, Security actions | — |
| `/dashboard/admin-system/pengguna/[userProfileId]` | `detail` | UserProfile | 8-column main content + 4-column sticky metadata/actions | Identity header, Auth/domain role status, Primary assignment, Clearance, Area scope, Assignment timeline, Security actions | `GET /api/v1/user-profiles/{userProfileId}` |
| `/dashboard/admin-system/pengguna/[userProfileId]/edit` | `edit` | UserProfile | 8-column form + 4-column sticky validation/metadata rail | Identity header, Auth/domain role status, Primary assignment, Clearance, Area scope, Assignment timeline, Security actions | `GET /api/v1/user-profiles/{userProfileId}`<br>`PATCH /api/v1/user-profiles/{userProfileId}` |
| `/dashboard/admin-system/pengguna/[userProfileId]/assignments` | `history` | UserProfile | 8-column read-only content + 4-column version/timeline metadata | Identity header, Auth/domain role status, Primary assignment, Clearance, Area scope, Assignment timeline, Security actions | `GET /api/v1/user-profiles/{userProfileId}`<br>`GET /api/v1/user-profiles/{userProfileId}/assignments` |
| `/dashboard/admin-system/pengguna/[userProfileId]/assignments/baru` | `create` | UserProfile | 8-column form + 4-column sticky validation/metadata rail | Identity header, Auth/domain role status, Primary assignment, Clearance, Area scope, Assignment timeline, Security actions | `GET /api/v1/user-profiles/{userProfileId}`<br>`GET /api/v1/positions`<br>`POST /api/v1/position-assignments` |

## `/dashboard/admin-system/role-hak-akses` — Roles & Permissions

**Page type:** `matrix`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Role Selector | Role cards/tabs | `12/12` | Memilih role bisnis. | Role code, Role name, User count |
| Permission Matrix | Sticky matrix table | `9/12` | Permission per module/action. | Module, Read, Create, Update, Action, Export |
| Impact Preview | Sticky side card | `3/12` | Dampak perubahan permission. | Affected users, Affected routes, Risk |
| Area Policy | Policy form card | `12/12` | Scope policy role/position. | Scope mode, Minimum areas, Maximum areas |

### Filters / URL Params

- `roleId`
- `module`
- `q`

### Data APIs

- `GET /api/v1/roles`
- `GET /api/v1/roles/{roleId}`
- `GET /api/v1/permissions`
- `GET /api/v1/position-area-policies`

### Actions

- `PUT /api/v1/roles/{roleId}/permissions`
- `PUT /api/v1/position-area-policies/{policyId}`

### Form Contracts

- `F-ROLE-PERMISSIONS`
- `F-POSITION-AREA-POLICY`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/admin-system/role-hak-akses/[roleId]` | `detail-edit` | Role | 8-column form + 4-column sticky validation/metadata rail | Role summary, Permission matrix, Area policy, Impact preview, Audit history | `GET /api/v1/roles/{roleId}`<br>`GET /api/v1/permissions`<br>`PUT /api/v1/roles/{roleId}/permissions` |

# Executive

## `/dashboard/executive` — Executive Dashboard

**Page type:** `dashboard`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| National KPI | 4 KPI cards | `12/12` | Situasi nasional utama. | Critical alerts, Pending approvals, Active directives, Approved products |
| National Map | mapcn risk map | `8/12` | Sebaran risiko dan laporan formal. | Risk choropleth, Alert clusters, Emergency |
| Executive Priority | Priority queue | `4/12` | Persetujuan dan alert kritis. | Type, Title, Area, Age, Deadline |
| Strategic Trends | Multi-series line chart | `8/12` | Perubahan risiko dan volume produk. | Risk index, Verified reports, Approved products |
| Regional Exceptions | Ranked table | `4/12` | Wilayah dengan anomali/penurunan. | Region, Metric, Delta, Severity |
| Briefing Feed | Editorial cards | `12/12` | Highlight produk dan keputusan. | Title, Product type, Region, Approved at |

### Filters / URL Params

- `areaId`
- `from`
- `to`
- `classificationMax`

### Data APIs

- `GET /api/v1/dashboard/overview`
- `GET /api/v1/dashboard/kpis`
- `GET /api/v1/dashboard/trends`
- `GET /api/v1/alerts/summary`
- `GET /api/v1/approval-inbox`
- `GET /api/v1/map/area-summary`

### Actions

- `Open critical alert`
- `Open approval`
- `Create strategic directive`

## `/dashboard/executive/kinerja-evaluasi` — National Performance & Evaluation

**Page type:** `analytics`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Performance KPI | 4 KPI cards | `12/12` | Kinerja nasional. | Directive fulfillment, Task completion, Verification quality, Approval SLA |
| Performance Trend | Line chart | `8/12` | Kinerja per periode. | Completion rate, On-time rate, Revision rate |
| Status Distribution | Stacked bar chart | `4/12` | Distribusi workflow. | Completed, In progress, Overdue |
| Area Comparison | Horizontal bar chart | `6/12` | Perbandingan wilayah. | Region, Score |
| Unit Comparison | Radar/grouped bar | `6/12` | Perbandingan unit. | Unit, Task, Baket, Product |
| Evaluation Table | Data table | `12/12` | Detail KPI per wilayah/unit. | Region, Directive, Task, Verification, Product, Score, Trend |

### Filters / URL Params

- `areaId`
- `unitId`
- `from`
- `to`
- `groupBy`
- `compareWithPrevious`

### Data APIs

- `GET /api/v1/dashboard/kpis`
- `GET /api/v1/dashboard/task-performance`
- `GET /api/v1/dashboard/directive-progress`
- `GET /api/v1/dashboard/verification-quality`
- `GET /api/v1/dashboard/product-status`
- `GET /api/v1/dashboard/area-breakdown`

### Actions

- `Drill down to region/unit`
- `Export via controlled report flow`

## `/dashboard/executive/laporan-briefing` — Executive Briefing

**Page type:** `composition`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Lead Brief | Large editorial card | `8/12` | Ringkasan situasi utama. | Headline, Executive summary, Area, Period |
| Critical Alerts | Priority card | `4/12` | Alert yang membutuhkan perhatian. | Severity, Title, Area, Age |
| Approved Products | Product highlight cards | `6/12` | Produk terbaru. | Type, Title, Region, Approved at |
| Directive Progress | Progress cards + bar | `6/12` | Status direktif strategis. | Directive, Progress, Due date |
| National Trend | Line/area chart | `12/12` | Tren isu dan risiko. | Period, Risk, Alerts, Products |

### Filters / URL Params

- `areaId`
- `from`
- `to`
- `classification`
- `productTypeId`

### Data APIs

- `GET /api/v1/products`
- `GET /api/v1/alerts`
- `GET /api/v1/directives`
- `GET /api/v1/dashboard/trends`
- `GET /api/v1/dashboard/area-breakdown`

### Actions

- `Open product`
- `Open alert`
- `Open directive`

## `/dashboard/executive/monitoring-nasional` — National Monitoring

**Page type:** `analytics-map`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Monitoring KPI | 4 KPI cards | `12/12` | Status nasional real-time. | Open alerts, Active tasks, Emergency incidents, Incoming verified reports |
| National Map | mapcn choropleth + clusters | `8/12` | Monitoring geografis. | Area risk, Alerts, Emergencies, Reports |
| Regional Ranking | Ranked list | `4/12` | Wilayah berdasarkan metric terpilih. | Rank, Region, Value, Trend |
| Trend | Line chart | `8/12` | Perubahan metric. | Time, Metric |
| Task/Incident Breakdown | Stacked bar/donut | `4/12` | Distribusi status. | Status, Count |
| Regional Table | Data table | `12/12` | Detail per wilayah. | Region, Alerts, Emergencies, Tasks, Reports, Risk |

### Filters / URL Params

- `areaId`
- `from`
- `to`
- `metric`
- `childLevel`
- `status`
- `urgency`

### Data APIs

- `GET /api/v1/map/area-summary`
- `GET /api/v1/map/heatmap`
- `GET /api/v1/dashboard/area-breakdown`
- `GET /api/v1/dashboard/task-performance`
- `GET /api/v1/emergency-incidents`

### Actions

- `Select region`
- `Open regional detail`

## `/dashboard/executive/persetujuan` — Approval Summary

**Page type:** `landing`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Approval KPI | 4 KPI cards | `12/12` | Ringkasan persetujuan. | Pending, Due today, Overdue, Approved this period |
| Approval Pipeline | Horizontal step funnel | `8/12` | Distribusi tahapan approval. | Submitted, Regional, Executive, Approved |
| SLA Risk | Priority queue | `4/12` | Step mendekati/terlewat SLA. | Product, Step, Deadline, Age |
| Recent Decisions | Activity table | `12/12` | Keputusan terbaru. | Product, Decision, Actor, Time |

### Filters / URL Params

- `routeType`
- `status`
- `from`
- `to`

### Data APIs

- `GET /api/v1/approval-inbox`
- `GET /api/v1/dashboard/product-status`

### Actions

- `Open executive approval inbox`

## `/dashboard/executive/persetujuan-eksekutif` — Executive Approval Inbox

**Page type:** `queue-detail`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Approval Queue | Queue list | `4/12` | Step aktif untuk Executive. | Product, Type, Region, Classification, Deadline |
| Product Review | Document detail | `5/12` | Isi versi produk dan traceability. | Title, Content, Sources, Regional decision |
| Decision Panel | Sticky workflow card | `3/12` | Approve/revision/reject/clarification. | Available actions, Note, Required changes |
| Workflow Timeline | Timeline | `12/12` | Riwayat approval. | Step, Position, Decision, Timestamp |

### Filters / URL Params

- `status`
- `productTypeId`
- `classification`
- `from`
- `to`
- `page`
- `limit`

### Data APIs

- `GET /api/v1/approval-inbox`
- `GET /api/v1/approval-steps/{stepId}`
- `GET /api/v1/products/{productId}`
- `GET /api/v1/products/{productId}/traceability`
- `GET /api/v1/approval-workflows/{workflowId}/timeline`

### Actions

- `POST /api/v1/approval-steps/{stepId}/approve`
- `POST /api/v1/approval-steps/{stepId}/request-revision`
- `POST /api/v1/approval-steps/{stepId}/reject`
- `POST /api/v1/approval-steps/{stepId}/request-clarification`

### Form Contracts

- `F-APPROVAL-DECISION`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/executive/persetujuan-eksekutif/[stepId]` | `detail-action` | ProductApprovalStep | 7-column evidence/detail + 5-column sticky action panel | Product version preview, Traceability, Previous decisions, Current step, Decision form, Workflow timeline | `GET /api/v1/approval-steps/{stepId}`<br>`POST /api/v1/approval-steps/{stepId}/approve`<br>`POST /api/v1/approval-steps/{stepId}/request-revision`<br>`POST /api/v1/approval-steps/{stepId}/reject`<br>`POST /api/v1/approval-steps/{stepId}/request-clarification` |

## `/dashboard/executive/produk-intelijen` — Approved Intelligence Products

**Page type:** `catalog`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Product KPI | 4 KPI cards | `12/12` | Ringkasan produk formal. | Approved, Distributed, Unread distribution, Product types |
| Product Filters | Filter bar | `12/12` | Filter katalog. | Search, Type, Region, Classification, Period |
| Product Catalog | Table/card toggle | `12/12` | Daftar produk. | Number, Title, Type, Region, Period, Classification, Status |
| Distribution Summary | Donut + table | `12/12` | Status distribusi produk terpilih. | Targets, Sent, Read, Revoked |

### Filters / URL Params

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

### Data APIs

- `GET /api/v1/products`
- `GET /api/v1/products/{productId}`
- `GET /api/v1/products/{productId}/timeline`
- `GET /api/v1/products/{productId}/distribution-summary`

### Actions

- `Open detail`
- `Distribute approved product if permitted`
- `Archive if permitted`

### Form Contracts

- `F-PRODUCT-DISTRIBUTION`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/executive/produk-intelijen/[productId]` | `detail` | IntelligenceProduct | 8-column main content + 4-column sticky metadata/actions | Product header, Type/template, Structured content, Sources, Approval timeline, Distribution, Version history | `GET /api/v1/products/{productId}`<br>`GET /api/v1/products/{productId}/versions`<br>`GET /api/v1/products/{productId}/timeline`<br>`GET /api/v1/products/{productId}/traceability` |
| `/dashboard/executive/produk-intelijen/[productId]/versions/[versionId]` | `version-detail` | IntelligenceProduct | 8-column read-only content + 4-column version/timeline metadata | Product header, Type/template, Structured content, Sources, Approval timeline, Distribution, Version history | `GET /api/v1/products/{productId}`<br>`GET /api/v1/products/{productId}/versions`<br>`GET /api/v1/products/{productId}/timeline`<br>`GET /api/v1/products/{productId}/traceability`<br>`GET /api/v1/product-versions/{versionId}` |
| `/dashboard/executive/produk-intelijen/[productId]/distribution` | `action-page` | IntelligenceProduct | 7-column evidence/detail + 5-column sticky action panel | Product header, Type/template, Structured content, Sources, Approval timeline, Distribution, Version history | `GET /api/v1/products/{productId}`<br>`GET /api/v1/products/{productId}/versions`<br>`GET /api/v1/products/{productId}/timeline`<br>`GET /api/v1/products/{productId}/traceability`<br>`GET /api/v1/products/{productId}/distribution-summary`<br>`POST /api/v1/product-versions/{versionId}/distributions` |

## `/dashboard/executive/pusat-komando` — Command Center

**Page type:** `landing`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Command KPI | 4 KPI cards | `12/12` | Status komando. | Active directives, Critical emergencies, Pending approvals, Overdue tasks |
| Active Directives | Command cards | `7/12` | Direktif utama dan progress. | Command number, Issue, Progress, Due date |
| Emergency Panel | Critical queue | `5/12` | Insiden darurat. | Severity, Area, Status, Age |
| National Command Map | mapcn map | `12/12` | Overlay direktif, emergency, warning. | Area, Layer, Selected incident |
| Quick Actions | Action cards | `12/12` | Create directive dan buka operasi darurat. | Create directive, Emergency operations |

### Filters / URL Params

- `areaId`
- `from`
- `to`

### Data APIs

- `GET /api/v1/dashboard/overview`
- `GET /api/v1/dashboard/directive-progress`
- `GET /api/v1/emergency-incidents`
- `GET /api/v1/alerts/summary`

### Actions

- `Create directive`
- `Open emergency operations`

## `/dashboard/executive/pusat-komando/direktif` — Strategic Directives

**Page type:** `list-detail`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Directive KPI | 4 KPI cards | `12/12` | Ringkasan direktif. | Draft, Published, Overdue, Completed |
| Directive Table | Data table | `5/12` | Daftar direktif. | Command number, Issue, Classification, Status, Due date, Progress |
| Directive Preview | Detail panel | `7/12` | Current version, targets, recipients. | Description, Target areas, Recipients, Version |
| Tracking | Progress/timeline | `12/12` | Acknowledgement dan fulfillment. | Recipient, Read, Tasks, Progress |

### Filters / URL Params

- `q`
- `status`
- `classification`
- `areaId`
- `from`
- `to`
- `page`
- `limit`

### Data APIs

- `GET /api/v1/directives`
- `GET /api/v1/directives/{directiveId}`
- `GET /api/v1/directives/{directiveId}/versions`
- `GET /api/v1/directives/{directiveId}/tracking`

### Actions

- `POST /api/v1/directives`
- `POST /api/v1/directives/{directiveId}/versions`
- `POST /api/v1/directive-versions/{versionId}/publish`
- `POST /api/v1/directive-versions/{versionId}/distribute`

### Form Contracts

- `F-DIRECTIVE`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/executive/pusat-komando/direktif/baru` | `create` | Directive | 8-column form + 4-column sticky validation/metadata rail | Directive header, Current version, Targets, Recipients, Tracking, Derived UUK/STR, Tasks, Version timeline | `GET /api/v1/administrative-areas/tree`<br>`GET /api/v1/positions`<br>`GET /api/v1/organization-units`<br>`POST /api/v1/directives` |
| `/dashboard/executive/pusat-komando/direktif/[directiveId]` | `detail` | Directive | 8-column main content + 4-column sticky metadata/actions | Directive header, Current version, Targets, Recipients, Tracking, Derived UUK/STR, Tasks, Version timeline | `GET /api/v1/directives/{directiveId}`<br>`GET /api/v1/directives/{directiveId}/versions` |
| `/dashboard/executive/pusat-komando/direktif/[directiveId]/edit` | `edit` | Directive | 8-column form + 4-column sticky validation/metadata rail | Directive header, Current version, Targets, Recipients, Tracking, Derived UUK/STR, Tasks, Version timeline | `GET /api/v1/directives/{directiveId}`<br>`GET /api/v1/directives/{directiveId}/versions`<br>`PATCH /api/v1/directive-versions/{versionId}`<br>`PUT /api/v1/directive-versions/{versionId}/target-areas`<br>`PUT /api/v1/directive-versions/{versionId}/recipients`<br>`POST /api/v1/directive-versions/{versionId}/publish`<br>+ 1 more |
| `/dashboard/executive/pusat-komando/direktif/[directiveId]/versions/[versionId]` | `version-detail` | Directive | 8-column read-only content + 4-column version/timeline metadata | Directive header, Current version, Targets, Recipients, Tracking, Derived UUK/STR, Tasks, Version timeline | `GET /api/v1/directives/{directiveId}`<br>`GET /api/v1/directives/{directiveId}/versions`<br>`GET /api/v1/directive-versions/{versionId}` |
| `/dashboard/executive/pusat-komando/direktif/[directiveId]/tracking` | `tracking` | Directive | 8-column read-only content + 4-column version/timeline metadata | Directive header, Current version, Targets, Recipients, Tracking, Derived UUK/STR, Tasks, Version timeline | `GET /api/v1/directives/{directiveId}`<br>`GET /api/v1/directives/{directiveId}/versions`<br>`GET /api/v1/directives/{directiveId}/tracking` |

## `/dashboard/executive/pusat-komando/direktif-strategis` — Directive Builder

**Page type:** `wizard`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Wizard Stepper | 5-step horizontal stepper | `12/12` | Status proses pembuatan direktif. | Identity, Content, Area, Recipients, Review |
| Directive Form | Form sections | `8/12` | Input direktif. | Command number, Issuer, Date, Due date, Classification, Description |
| Review Rail | Sticky completeness card | `4/12` | Validasi, target, dan recipient summary. | Errors, Warnings, Target count, Recipient count |

### Filters / URL Params

- No page-level filters.

### Data APIs

- `GET /api/v1/reference-data/enums`
- `GET /api/v1/administrative-areas/tree`
- `GET /api/v1/positions`
- `GET /api/v1/organization-units`

### Actions

- `POST /api/v1/directives`
- `POST /api/v1/directive-versions/{versionId}/publish`
- `POST /api/v1/directive-versions/{versionId}/distribute`

### Form Contracts

- `F-DIRECTIVE`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/executive/pusat-komando/direktif-strategis/[directiveId]/edit` | `wizard` | Directive | Stepper/section navigation + main form + validation rail | Directive header, Current version, Targets, Recipients, Tracking, Derived UUK/STR, Tasks, Version timeline | `GET /api/v1/directives/{directiveId}`<br>`GET /api/v1/directives/{directiveId}/versions`<br>`PATCH /api/v1/directive-versions/{versionId}`<br>`PUT /api/v1/directive-versions/{versionId}/target-areas`<br>`PUT /api/v1/directive-versions/{versionId}/recipients`<br>`POST /api/v1/directive-versions/{versionId}/publish`<br>+ 1 more |

## `/dashboard/executive/pusat-komando/operasi-darurat` — Emergency Operations

**Page type:** `map-command`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Emergency KPI | 4 KPI cards | `12/12` | Status operasi darurat. | Critical open, Acknowledged, In response, Resolved today |
| Emergency Map | mapcn command map | `9/12` | Insiden dan response units. | Incident points, Severity, Response status |
| Critical Queue | Priority queue | `3/12` | Insiden prioritas. | Severity, Area, Age, Owner |
| Incident Timeline | Bottom timeline panel | `8/12` | Perkembangan insiden terpilih. | Action, Actor, Timestamp |
| Command Actions | Sticky action card | `4/12` | Acknowledge, verify, start, control, resolve. | Action plan, Note, Resolution |

### Filters / URL Params

- `status`
- `severity`
- `areaId`
- `from`
- `to`
- `bbox`
- `zoom`

### Data APIs

- `GET /api/v1/emergency-incidents`
- `GET /api/v1/alerts`
- `GET /api/v1/map/reports`

### Actions

- `POST /api/v1/emergency-incidents/{incidentId}/acknowledge`
- `POST /api/v1/emergency-incidents/{incidentId}/verify`
- `POST /api/v1/emergency-incidents/{incidentId}/start-response`
- `POST /api/v1/emergency-incidents/{incidentId}/mark-controlled`
- `POST /api/v1/emergency-incidents/{incidentId}/resolve`

### Form Contracts

- `F-EMERGENCY-ACTION`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/executive/pusat-komando/operasi-darurat/[incidentId]` | `detail-action` | EmergencyIncident | 7-column evidence/detail + 5-column sticky action panel | Critical header, Situation, Location map, Reporter, Needs, Timeline, Attachments, Response actions | `GET /api/v1/emergency-incidents/{incidentId}`<br>`POST /api/v1/emergency-incidents/{incidentId}/acknowledge`<br>`POST /api/v1/emergency-incidents/{incidentId}/verify`<br>`POST /api/v1/emergency-incidents/{incidentId}/start-response`<br>`POST /api/v1/emergency-incidents/{incidentId}/mark-controlled`<br>`POST /api/v1/emergency-incidents/{incidentId}/resolve` |

## `/dashboard/executive/situasi-nasional` — National Situation

**Page type:** `landing`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Situation KPI | 4 KPI cards | `12/12` | Snapshot nasional. | Risk level, Critical alerts, Emergencies, New reports |
| Risk Map Preview | mapcn map | `8/12` | Peta situasi nasional. | Risk choropleth, Alert cluster |
| Warning List | Priority queue | `4/12` | Peringatan aktif. | Severity, Title, Area, Age |
| Short-term Trend | Line chart | `8/12` | 24 jam/7 hari. | Alerts, Reports, Emergencies |
| Area Breakdown | Ranked list | `4/12` | Top area risiko. | Area, Risk, Delta |

### Filters / URL Params

- `areaId`
- `from`
- `to`

### Data APIs

- `GET /api/v1/dashboard/overview`
- `GET /api/v1/dashboard/trends`
- `GET /api/v1/alerts/summary`
- `GET /api/v1/map/area-summary`

### Actions

- `Open warning`
- `Open risk map`

## `/dashboard/executive/situasi-nasional/peringatan-dini` — National Early Warning

**Page type:** `alert-queue`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Alert KPI | 4 KPI cards | `12/12` | Ringkasan alert. | New, Critical, In progress, Overdue |
| Alert Queue | Severity-sorted table | `5/12` | Daftar alert. | Severity, Title, Area, Source, Owner, Age, Status |
| Alert Detail | Detail + mini map | `7/12` | Konteks alert terpilih. | Summary, Source, Area, Timeline, Map |
| Action Panel | Sticky decision card | `4/12` | Acknowledge/assign/start/resolve. | Assignee, Note, Resolution |

### Filters / URL Params

- `status`
- `severity`
- `areaId`
- `from`
- `to`
- `page`
- `limit`

### Data APIs

- `GET /api/v1/alerts`
- `GET /api/v1/alerts/summary`
- `GET /api/v1/alerts/{alertId}`

### Actions

- `POST /api/v1/alerts/{alertId}/acknowledge`
- `POST /api/v1/alerts/{alertId}/assign`
- `POST /api/v1/alerts/{alertId}/start`
- `POST /api/v1/alerts/{alertId}/resolve`

### Form Contracts

- `F-ALERT-ACTION`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/executive/situasi-nasional/peringatan-dini/[alertId]` | `detail-action` | Alert | 7-column evidence/detail + 5-column sticky action panel | Alert header, Source, Severity/status, Location map, Assigned position, Timeline, Resolution actions | `GET /api/v1/alerts/{alertId}`<br>`POST /api/v1/alerts/{alertId}/acknowledge`<br>`POST /api/v1/alerts/{alertId}/assign`<br>`POST /api/v1/alerts/{alertId}/start`<br>`POST /api/v1/alerts/{alertId}/resolve` |

## `/dashboard/executive/situasi-nasional/peta-kerawanan` — National Risk Map

**Page type:** `map`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Map Filter | Floating filter bar | `12/12` | Area, waktu, metric, layer. | Area, Period, Metric, Severity, View mode |
| Risk Map | Full-height mapcn map | `9/12` | Choropleth, cluster, heatmap. | Boundary, Risk metric, Reports, Alerts |
| Area Summary | Right drawer | `3/12` | KPI dan trend area terpilih. | Risk, Alerts, Reports, Trend |
| Legend & Scope | Floating controls | `Overlay` | Legend, active scope, last refresh. | Legend, Scope, Refresh time |

### Filters / URL Params

- `bbox`
- `zoom`
- `areaId`
- `from`
- `to`
- `metric`
- `status`
- `urgency`
- `viewMode`

### Data APIs

- `GET /api/v1/administrative-areas/boundaries`
- `GET /api/v1/map/clusters`
- `GET /api/v1/map/heatmap`
- `GET /api/v1/map/area-summary`

### Actions

- `Click region to drill down`
- `Switch cluster/heatmap/choropleth`

## `/dashboard/executive/situasi-strategis` — Strategic Situation

**Page type:** `analytics`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Strategic KPI | 4 KPI cards | `12/12` | Indikator 30/60/90 hari. | Risk movement, Recurring issues, Formal analyses, Approved products |
| Risk Trend | Multi-series line chart | `8/12` | Perubahan strategis. | Risk index, Alert recurrence, Product volume |
| Issue Portfolio | Bubble/treemap chart | `4/12` | Isu berdasarkan dampak dan tren. | Issue, Impact, Frequency |
| Area Comparison | Grouped bar chart | `6/12` | Perbandingan wilayah. | Area, Current, Previous |
| Formal Findings | Card/list | `6/12` | Analisis dan produk relevan. | Title, Type, Period, Classification |

### Filters / URL Params

- `areaId`
- `from`
- `to`
- `interval`
- `productTypeId`
- `classification`

### Data APIs

- `GET /api/v1/dashboard/trends`
- `GET /api/v1/dashboard/area-breakdown`
- `GET /api/v1/products`
- `GET /api/v1/analysis-cases`

### Actions

- `Open analysis/product`

## `/dashboard/executive/situasi-strategis/peringatan-dini` — Strategic Warning Analysis

**Page type:** `analytics-alerts`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Trend KPI | 4 KPI cards | `12/12` | Alert strategis. | Recurring alerts, Escalating areas, Resolved rate, Average duration |
| Alert Trend | Line/stacked area chart | `8/12` | Tren severity/status. | Critical, High, Resolved |
| Recurring Area | Heat-ranked list | `4/12` | Area berulang. | Area, Count, Delta |
| Severity Movement | Sankey/stacked bar | `6/12` | Perubahan severity. | From, To, Count |
| Related Intelligence | Table | `6/12` | Produk/analisis terkait. | Title, Type, Period, Status |

### Filters / URL Params

- `areaId`
- `from`
- `to`
- `interval`
- `severity`
- `status`

### Data APIs

- `GET /api/v1/alerts`
- `GET /api/v1/dashboard/trends`
- `GET /api/v1/dashboard/area-breakdown`

### Actions

- `Open alert history`
- `Open related product`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/executive/situasi-strategis/peringatan-dini/[alertId]` | `detail` | Alert | 8-column main content + 4-column sticky metadata/actions | Alert header, Source, Severity/status, Location map, Assigned position, Timeline, Resolution actions | `GET /api/v1/alerts/{alertId}`<br>`POST /api/v1/alerts/{alertId}/acknowledge`<br>`POST /api/v1/alerts/{alertId}/assign`<br>`POST /api/v1/alerts/{alertId}/start`<br>`POST /api/v1/alerts/{alertId}/resolve` |

## `/dashboard/executive/situasi-strategis/peta-kerawanan` — Strategic Risk Trend Map

**Page type:** `map-analytics`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Comparison Toolbar | Filter/compare bar | `12/12` | Periode saat ini vs pembanding. | Area, Metric, Current period, Compare period |
| Strategic Choropleth | mapcn map | `8/12` | Perubahan risiko per area. | Current value, Previous value, Delta |
| Trend Drawer | Metric panel | `4/12` | Trend dan produk area terpilih. | Delta, Trend, Findings |
| Comparison Table | Data table | `12/12` | Perbandingan area. | Area, Current, Previous, Delta, Rank |

### Filters / URL Params

- `bbox`
- `zoom`
- `areaId`
- `from`
- `to`
- `compareFrom`
- `compareTo`
- `metric`

### Data APIs

- `GET /api/v1/administrative-areas/boundaries`
- `GET /api/v1/map/heatmap`
- `GET /api/v1/dashboard/area-breakdown`

### Actions

- `Compare periods`
- `Drill to area`

# Regional Commander

## `/dashboard/regional-commander` — Regional Command Dashboard

**Page type:** `dashboard`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Regional KPI | 4 KPI cards | `12/12` | Situasi wilayah. | Regional risk, Pending approvals, Task completion, Critical warnings |
| Regional Map | mapcn map | `8/12` | Warnings, reports, emergency. | Risk, Alerts, Reports, Emergency |
| Priority Queue | Queue card | `4/12` | Approval dan alert. | Type, Title, Age, Deadline |
| Directive Progress | Progress chart | `8/12` | Direktif/UUK/task. | Directive, UUK, Tasks |
| Product Pipeline | Funnel card | `4/12` | Produk regional. | Draft, Review, Approved |

### Filters / URL Params

- `areaId`
- `from`
- `to`

### Data APIs

- `GET /api/v1/dashboard/overview`
- `GET /api/v1/dashboard/kpis`
- `GET /api/v1/dashboard/directive-progress`
- `GET /api/v1/approval-inbox`
- `GET /api/v1/alerts/summary`
- `GET /api/v1/map/area-summary`

### Actions

- `Open UUK/STR`
- `Open approval`
- `Open warning`

## `/dashboard/regional-commander/direktif-penjabaran-uuk-str` — UUK/STR Elaboration

**Page type:** `wizard-list`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Directive Source | Source list | `3/12` | Direktif yang perlu dijabarkan. | Command number, Issue, Due date |
| UUK/STR Editor | Wizard/form | `6/12` | Sections dan items. | Basis, Questions, Targets, Instructions |
| Completeness Rail | Sticky validation card | `3/12` | Mandatory sections dan publish action. | Missing sections, Warnings, Publish |
| Version Timeline | Timeline | `12/12` | Riwayat versi. | Version, Status, Created by, Time |

### Filters / URL Params

- `directiveVersionId`
- `status`
- `from`
- `to`
- `page`
- `limit`

### Data APIs

- `GET /api/v1/directives`
- `GET /api/v1/uuk-strs`
- `GET /api/v1/uuk-strs/{uukStrId}`
- `GET /api/v1/uuk-strs/{uukStrId}/versions`

### Actions

- `POST /api/v1/uuk-strs`
- `POST /api/v1/uuk-strs/{uukStrId}/versions`
- `PATCH /api/v1/uuk-str-versions/{versionId}`
- `PUT /api/v1/uuk-str-versions/{versionId}/sections`
- `POST /api/v1/uuk-str-versions/{versionId}/publish`
- `POST /api/v1/uuk-strs/{uukStrId}/cancel`

### Form Contracts

- `F-UUK-STR`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/regional-commander/direktif-penjabaran-uuk-str/baru` | `create` | UukStr | 8-column form + 4-column sticky validation/metadata rail | Directive source, Current version, Section navigator, Section content, Completeness, Task references, Version history | `GET /api/v1/directives`<br>`POST /api/v1/uuk-strs` |
| `/dashboard/regional-commander/direktif-penjabaran-uuk-str/[uukStrId]` | `detail` | UukStr | 8-column main content + 4-column sticky metadata/actions | Directive source, Current version, Section navigator, Section content, Completeness, Task references, Version history | `GET /api/v1/uuk-strs/{uukStrId}`<br>`GET /api/v1/uuk-strs/{uukStrId}/versions` |
| `/dashboard/regional-commander/direktif-penjabaran-uuk-str/[uukStrId]/edit` | `wizard` | UukStr | Stepper/section navigation + main form + validation rail | Directive source, Current version, Section navigator, Section content, Completeness, Task references, Version history | `GET /api/v1/uuk-strs/{uukStrId}`<br>`GET /api/v1/uuk-strs/{uukStrId}/versions`<br>`PATCH /api/v1/uuk-str-versions/{versionId}`<br>`PUT /api/v1/uuk-str-versions/{versionId}/sections`<br>`POST /api/v1/uuk-str-versions/{versionId}/publish` |
| `/dashboard/regional-commander/direktif-penjabaran-uuk-str/[uukStrId]/versions/[versionId]` | `version-detail` | UukStr | 8-column read-only content + 4-column version/timeline metadata | Directive source, Current version, Section navigator, Section content, Completeness, Task references, Version history | `GET /api/v1/uuk-strs/{uukStrId}`<br>`GET /api/v1/uuk-strs/{uukStrId}/versions`<br>`GET /api/v1/uuk-str-versions/{versionId}` |

## `/dashboard/regional-commander/jawaban-lapangan` — Field Answers

**Page type:** `list-detail`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Output KPI | 4 KPI cards | `12/12` | Jawaban task. | Tasks answered, Verified reports, Late outputs, Open gaps |
| Output Table | Data table | `5/12` | Task output/Baket. | Task, Area, Baket, Verification, Timeliness, Status |
| Output Detail | Detail panel | `7/12` | Summary dan traceability. | Task context, Baket summary, Verification, Timeline |

### Filters / URL Params

- `directiveId`
- `taskId`
- `status`
- `areaId`
- `from`
- `to`
- `page`
- `limit`

### Data APIs

- `GET /api/v1/tasks`
- `GET /api/v1/tasks/{taskId}/progress-summary`
- `GET /api/v1/bakets`
- `GET /api/v1/bakets/{baketId}/traceability`

### Actions

- `Open formal finding`
- `Open task cascade`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/regional-commander/jawaban-lapangan/[baketId]` | `detail` | Baket | 8-column main content + 4-column sticky metadata/actions | Baket header, Current version, 5W+1H, Source messages, Location map, Coverage checks, Attachments, Timeline, Revision requests | `GET /api/v1/bakets/{baketId}`<br>`GET /api/v1/bakets/{baketId}/timeline`<br>`GET /api/v1/bakets/{baketId}/traceability` |

## `/dashboard/regional-commander/komando-regional` — Regional Command Center

**Page type:** `command-board`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Command KPI | 4 KPI cards | `12/12` | Komando regional. | Active directives, Published UUK, Active tasks, Emergencies |
| Active Directives | Command cards | `7/12` | Direktif dan progress. | Directive, UUK status, Task progress |
| Emergency Queue | Critical list | `5/12` | Insiden wilayah. | Severity, Area, Status, Age |
| Regional Command Map | mapcn map | `12/12` | Scope komando. | Directive target, Task, Emergency, Warning |

### Filters / URL Params

- `areaId`
- `from`
- `to`
- `status`

### Data APIs

- `GET /api/v1/directives`
- `GET /api/v1/uuk-strs`
- `GET /api/v1/tasks`
- `GET /api/v1/emergency-incidents`
- `GET /api/v1/map/area-summary`

### Actions

- `Create UUK/STR`
- `Open emergency`
- `Track directive`

## `/dashboard/regional-commander/kpi-evaluasi` — Regional KPI & Evaluation

**Page type:** `analytics`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| KPI Row | 4 KPI cards | `12/12` | Kinerja regional. | Task completion, Directive progress, Verification quality, Product approval |
| Trend | Line chart | `8/12` | Periode berjalan. | Completion, On-time, Revision |
| Status Mix | Donut chart | `4/12` | Distribusi status. | Status, Count |
| Area Comparison | Horizontal bar | `6/12` | Per kecamatan/kabupaten. | Area, Score |
| Unit Comparison | Grouped bar | `6/12` | Per unit. | Unit, Task, Baket, Product |
| KPI Table | Data table | `12/12` | Detail evaluasi. | Area/unit, Metrics, Score, Trend |

### Filters / URL Params

- `areaId`
- `unitId`
- `from`
- `to`
- `groupBy`
- `compareWithPrevious`

### Data APIs

- `GET /api/v1/dashboard/kpis`
- `GET /api/v1/dashboard/task-performance`
- `GET /api/v1/dashboard/directive-progress`
- `GET /api/v1/dashboard/verification-quality`
- `GET /api/v1/dashboard/product-status`
- `GET /api/v1/dashboard/area-breakdown`

### Actions

- `Drill to unit/area`

## `/dashboard/regional-commander/laporan-intelijen` — Regional Intelligence Findings

**Page type:** `catalog`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Finding KPI | 4 KPI cards | `12/12` | Temuan intelijen. | Verified, Analyzed, High confidence, New this period |
| Finding Filters | Filter bar | `12/12` | Area, period, status. | Search, Area, Period, Status |
| Findings Catalog | Card/table grid | `12/12` | Verification/analysis formal. | Title, Type, Area, Period, Score/confidence |
| Traceability Preview | Drawer | `Overlay` | Source chain yang diizinkan. | Verification, Analysis, Product links |

### Filters / URL Params

- `q`
- `areaId`
- `from`
- `to`
- `status`
- `page`
- `limit`

### Data APIs

- `GET /api/v1/verifications`
- `GET /api/v1/analysis-cases`
- `GET /api/v1/analysis-cases/{caseId}/traceability`

### Actions

- `Open analysis`
- `Open verification summary`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/regional-commander/laporan-intelijen/analisis/[caseId]` | `detail` | AnalysisCase / Verification | 8-column main content + 4-column sticky metadata/actions | Case header, Verified sources, Analysis sections, Entities, Relationships, Graph, Traceability, Version history | `GET /api/v1/analysis-cases/{caseId}`<br>`GET /api/v1/analysis-cases/{caseId}/versions`<br>`GET /api/v1/analysis-cases/{caseId}/traceability` |
| `/dashboard/regional-commander/laporan-intelijen/verifikasi/[verificationId]` | `detail` | AnalysisCase / Verification | 8-column main content + 4-column sticky metadata/actions | Case header, Verified sources, Analysis sections, Entities, Relationships, Graph, Traceability, Version history | `GET /api/v1/verifications/{verificationId}`<br>`GET /api/v1/verifications/{verificationId}/score` |

## `/dashboard/regional-commander/laporan-produk-intelijen` — Regional Intelligence Products

**Page type:** `catalog`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Product KPI | 4 KPI cards | `12/12` | Produk regional. | Draft, Regional review, Approved, Distributed |
| Product Catalog | Data table/card grid | `12/12` | Produk formal. | Number, Title, Type, Version, Classification, Status |
| Approval/Distribution | Timeline + summary | `12/12` | Status approval dan distribusi. | Steps, Decision, Targets, Read status |

### Filters / URL Params

- `q`
- `status`
- `productTypeId`
- `classification`
- `areaId`
- `from`
- `to`
- `page`
- `limit`

### Data APIs

- `GET /api/v1/products`
- `GET /api/v1/products/{productId}`
- `GET /api/v1/products/{productId}/timeline`
- `GET /api/v1/products/{productId}/distribution-summary`

### Actions

- `Open product`
- `Open approval`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/regional-commander/laporan-produk-intelijen/[productId]` | `detail` | IntelligenceProduct | 8-column main content + 4-column sticky metadata/actions | Product header, Type/template, Structured content, Sources, Approval timeline, Distribution, Version history | `GET /api/v1/products/{productId}`<br>`GET /api/v1/products/{productId}/versions`<br>`GET /api/v1/products/{productId}/timeline`<br>`GET /api/v1/products/{productId}/traceability` |
| `/dashboard/regional-commander/laporan-produk-intelijen/[productId]/versions/[versionId]` | `version-detail` | IntelligenceProduct | 8-column read-only content + 4-column version/timeline metadata | Product header, Type/template, Structured content, Sources, Approval timeline, Distribution, Version history | `GET /api/v1/products/{productId}`<br>`GET /api/v1/products/{productId}/versions`<br>`GET /api/v1/products/{productId}/timeline`<br>`GET /api/v1/products/{productId}/traceability`<br>`GET /api/v1/product-versions/{versionId}` |

## `/dashboard/regional-commander/monitoring-tugas` — Regional Task Monitoring

**Page type:** `analytics-tree`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Task KPI | 4 KPI cards | `12/12` | Progress regional. | Active, Overdue, Completed, Outputs |
| Directive-to-Task Tree | Tree table | `8/12` | Cascade task. | Directive, Task, Assignment, Progress |
| Status Chart | Donut/stacked bar | `4/12` | Distribusi status. | Status, Count |
| Area/Unit Breakdown | Bar chart | `6/12` | Kinerja per area/unit. | Area/unit, Completion |
| Task Detail Table | Data table | `12/12` | Task dan outputs. | Task, Owner, Area, Due, Progress, Baket |

### Filters / URL Params

- `directiveId`
- `status`
- `areaId`
- `unitId`
- `from`
- `to`

### Data APIs

- `GET /api/v1/tasks`
- `GET /api/v1/tasks/{taskId}/cascade`
- `GET /api/v1/tasks/{taskId}/progress-summary`
- `GET /api/v1/dashboard/task-performance`

### Actions

- `Open task cascade`
- `Open output`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/regional-commander/monitoring-tugas/[taskId]` | `detail` | Task | 8-column main content + 4-column sticky metadata/actions | Task header, Source directive/UUK, Target areas, Assignments, Progress, Evidence, Related Baket, Timeline | `GET /api/v1/tasks/{taskId}`<br>`GET /api/v1/tasks/{taskId}/assignments`<br>`GET /api/v1/tasks/{taskId}/progress-summary` |
| `/dashboard/regional-commander/monitoring-tugas/[taskId]/cascade` | `tree-detail` | Task | 8-column main content + 4-column sticky metadata/actions | Task header, Source directive/UUK, Target areas, Assignments, Progress, Evidence, Related Baket, Timeline | `GET /api/v1/tasks/{taskId}`<br>`GET /api/v1/tasks/{taskId}/assignments`<br>`GET /api/v1/tasks/{taskId}/progress-summary`<br>`GET /api/v1/tasks/{taskId}/cascade` |

## `/dashboard/regional-commander/persetujuan-regional` — Regional Approval

**Page type:** `queue-detail`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Approval Queue | Queue list | `4/12` | Step regional aktif. | Product, Type, Classification, Deadline |
| Product Review | Document detail | `5/12` | Versi produk dan sources. | Content, Sources, Traceability |
| Decision Panel | Sticky workflow card | `3/12` | Approve/revision/reject/clarification. | Decision, Note, Required changes |
| Timeline | Approval timeline | `12/12` | Riwayat workflow. | Step, Actor, Decision, Time |

### Filters / URL Params

- `status`
- `productTypeId`
- `classification`
- `from`
- `to`
- `page`
- `limit`

### Data APIs

- `GET /api/v1/approval-inbox`
- `GET /api/v1/approval-steps/{stepId}`
- `GET /api/v1/products/{productId}`
- `GET /api/v1/products/{productId}/traceability`

### Actions

- `POST /api/v1/approval-steps/{stepId}/approve`
- `POST /api/v1/approval-steps/{stepId}/request-revision`
- `POST /api/v1/approval-steps/{stepId}/reject`
- `POST /api/v1/approval-steps/{stepId}/request-clarification`

### Form Contracts

- `F-APPROVAL-DECISION`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/regional-commander/persetujuan-regional/[stepId]` | `detail-action` | ProductApprovalStep | 7-column evidence/detail + 5-column sticky action panel | Product version preview, Traceability, Previous decisions, Current step, Decision form, Workflow timeline | `GET /api/v1/approval-steps/{stepId}`<br>`POST /api/v1/approval-steps/{stepId}/approve`<br>`POST /api/v1/approval-steps/{stepId}/request-revision`<br>`POST /api/v1/approval-steps/{stepId}/reject`<br>`POST /api/v1/approval-steps/{stepId}/request-clarification` |

## `/dashboard/regional-commander/personel-jaring` — Regional Personnel & Jaring

**Page type:** `tabs`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Regional Resource KPI | 4 KPI cards | `12/12` | Personel dan Jaring. | Personnel, Vacant positions, Active Jaring, Coverage gaps |
| Personnel Table | Data table | `6/12` | Personel per unit. | Name, Position, Unit, Area, Tasks |
| Jaring Table | Data table | `6/12` | Jaring agregat. | Code, Caretaker, Area, Status, Last activity |
| Coverage Breakdown | Map/bar chart | `12/12` | Coverage dan gap. | Area, Personnel, Jaring, Gap |

### Filters / URL Params

- `tab`
- `q`
- `status`
- `areaId`
- `unitId`
- `positionCode`
- `page`
- `limit`

### Data APIs

- `GET /api/v1/position-assignments`
- `GET /api/v1/jaring`
- `GET /api/v1/jaring/{jaringId}/caretakers`
- `GET /api/v1/dashboard/task-performance`

### Actions

- `Open detail`
- `No direct caretaker mutation unless permission`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/regional-commander/personel-jaring/personel/[assignmentId]` | `detail` | PositionAssignment / Jaring | 8-column main content + 4-column sticky metadata/actions | Seat summary, Organization path, Occupant, Reports-to chain, Subordinates, Area policy, Actions | `GET /api/v1/position-assignments/{assignmentId}`<br>`GET /api/v1/position-assignments/{assignmentId}/area-scopes`<br>`GET /api/v1/personnel-location-pings/{assignmentId}/latest`<br>`GET /api/v1/personnel-location-pings/{assignmentId}/history` |
| `/dashboard/regional-commander/personel-jaring/jaring/[jaringId]` | `detail` | PositionAssignment / Jaring | 8-column main content + 4-column sticky metadata/actions | Seat summary, Organization path, Occupant, Reports-to chain, Subordinates, Area policy, Actions | `GET /api/v1/jaring/{jaringId}`<br>`GET /api/v1/jaring/{jaringId}/area-coverages`<br>`GET /api/v1/jaring/{jaringId}/caretakers`<br>`GET /api/v1/jaring/{jaringId}/messages`<br>`GET /api/v1/jaring/{jaringId}/bakets` |

## `/dashboard/regional-commander/peta-peringatan-dini` — Regional Early Warning Map

**Page type:** `map`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Warning KPI | 4 KPI cards | `12/12` | Status peringatan regional. | Critical alerts, Emergency, High reports, Resolved |
| Early Warning Map | mapcn map | `9/12` | Alert, emergency, report cluster, heatmap. | Alert, Emergency, Reports, Boundary |
| Warning Queue | Right queue | `3/12` | Alert prioritas. | Severity, Title, Area, Age |
| Area Summary | Bottom metrics | `12/12` | KPI area terpilih. | Risk, Alerts, Reports, Trend |

### Filters / URL Params

- `bbox`
- `zoom`
- `areaId`
- `from`
- `to`
- `severity`
- `status`
- `urgency`
- `layers`

### Data APIs

- `GET /api/v1/alerts`
- `GET /api/v1/emergency-incidents`
- `GET /api/v1/map/clusters`
- `GET /api/v1/map/heatmap`
- `GET /api/v1/administrative-areas/boundaries`
- `GET /api/v1/map/area-summary`

### Actions

- `Open alert`
- `Acknowledge/assign if permitted`
- `Drill area`

### Form Contracts

- `F-ALERT-ACTION`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/regional-commander/peta-peringatan-dini/alert/[alertId]` | `detail-action` | Alert / EmergencyIncident | 7-column evidence/detail + 5-column sticky action panel | Critical header, Situation, Location map, Reporter, Needs, Timeline, Attachments, Response actions | `GET /api/v1/alerts/{alertId}`<br>`POST /api/v1/alerts/{alertId}/acknowledge`<br>`POST /api/v1/alerts/{alertId}/assign`<br>`POST /api/v1/alerts/{alertId}/start`<br>`POST /api/v1/alerts/{alertId}/resolve` |
| `/dashboard/regional-commander/peta-peringatan-dini/darurat/[incidentId]` | `detail-action` | Alert / EmergencyIncident | 7-column evidence/detail + 5-column sticky action panel | Critical header, Situation, Location map, Reporter, Needs, Timeline, Attachments, Response actions | `GET /api/v1/emergency-incidents/{incidentId}`<br>`POST /api/v1/emergency-incidents/{incidentId}/acknowledge`<br>`POST /api/v1/emergency-incidents/{incidentId}/verify`<br>`POST /api/v1/emergency-incidents/{incidentId}/start-response`<br>`POST /api/v1/emergency-incidents/{incidentId}/mark-controlled`<br>`POST /api/v1/emergency-incidents/{incidentId}/resolve` |

# Operational Intelligence Manager

## `/dashboard/oim` — OIM Dashboard

**Page type:** `dashboard`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| OIM KPI | 4 KPI cards | `12/12` | Pipeline intelijen. | Incoming Baket, Verification queue, Needs development, Product drafts |
| Verification Pipeline | Funnel/stacked bar | `8/12` | Baket ke verification ke product. | Incoming, Under verification, Verified, Analyzed, Product |
| Priority Baket | Queue card | `4/12` | Baket prioritas. | Urgency, Title, Area, Age |
| Field Map | mapcn preview | `8/12` | Baket, task, emergency. | Reports, Tasks, Emergency |
| Work Queue | Action cards | `4/12` | Shortcut verification/analysis/product. | Verify, Analyze, Build product |

### Filters / URL Params

- `areaId`
- `from`
- `to`

### Data APIs

- `GET /api/v1/dashboard/overview`
- `GET /api/v1/dashboard/verification-quality`
- `GET /api/v1/bakets`
- `GET /api/v1/verifications`
- `GET /api/v1/products`

### Actions

- `Open verification`
- `Create analysis`
- `Create product`

## `/dashboard/oim/analisis-intelijen` — Intelligence Analysis

**Page type:** `workspace`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Case List | Searchable list | `3/12` | Kasus analisis. | Title, Period, Status, Source count |
| Analysis Editor | Structured editor | `6/12` | Indications, analysis, impact, efforts, recommendations. | Sections, Draft version |
| Source/Entity Rail | Tabs | `3/12` | Verified sources, entities, relationships. | Sources, Entities, Links |
| Graph View | Network graph | `12/12` | Relasi entity. | Nodes, Edges, Confidence |
| Validation Panel | Sticky action bar | `12/12` | Human validation dan completeness. | Warnings, Validate |

### Filters / URL Params

- `q`
- `status`
- `ownerUnitId`
- `from`
- `to`
- `page`
- `limit`

### Data APIs

- `GET /api/v1/analysis-cases`
- `GET /api/v1/analysis-cases/{caseId}`
- `GET /api/v1/analysis-cases/{caseId}/graph`
- `GET /api/v1/analysis-cases/{caseId}/traceability`

### Actions

- `POST /api/v1/analysis-cases`
- `PUT /api/v1/analysis-cases/{caseId}/sources`
- `POST /api/v1/analysis-cases/{caseId}/versions`
- `PATCH /api/v1/analysis-versions/{versionId}`
- `PUT /api/v1/analysis-versions/{versionId}/entities`
- `PUT /api/v1/analysis-versions/{versionId}/relationships`
- `POST /api/v1/analysis-versions/{versionId}/validate`

### Form Contracts

- `F-ANALYSIS-CASE`
- `F-ANALYSIS-VERSION`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/oim/analisis-intelijen/baru` | `create` | AnalysisCase | 8-column form + 4-column sticky validation/metadata rail | Case header, Verified sources, Analysis sections, Entities, Relationships, Graph, Traceability, Version history | `GET /api/v1/verifications`<br>`POST /api/v1/analysis-cases` |
| `/dashboard/oim/analisis-intelijen/[caseId]` | `detail` | AnalysisCase | 8-column main content + 4-column sticky metadata/actions | Case header, Verified sources, Analysis sections, Entities, Relationships, Graph, Traceability, Version history | `GET /api/v1/analysis-cases/{caseId}`<br>`GET /api/v1/analysis-cases/{caseId}/versions`<br>`GET /api/v1/analysis-cases/{caseId}/traceability` |
| `/dashboard/oim/analisis-intelijen/[caseId]/edit` | `workspace` | AnalysisCase | 8-column main content + 4-column sticky metadata/actions | Case header, Verified sources, Analysis sections, Entities, Relationships, Graph, Traceability, Version history | `GET /api/v1/analysis-cases/{caseId}`<br>`GET /api/v1/analysis-cases/{caseId}/versions`<br>`GET /api/v1/analysis-cases/{caseId}/traceability`<br>`PATCH /api/v1/analysis-versions/{versionId}`<br>`PUT /api/v1/analysis-versions/{versionId}/entities`<br>`PUT /api/v1/analysis-versions/{versionId}/relationships`<br>+ 1 more |
| `/dashboard/oim/analisis-intelijen/[caseId]/versions/[versionId]` | `version-detail` | AnalysisCase | 8-column read-only content + 4-column version/timeline metadata | Case header, Verified sources, Analysis sections, Entities, Relationships, Graph, Traceability, Version history | `GET /api/v1/analysis-cases/{caseId}`<br>`GET /api/v1/analysis-cases/{caseId}/versions`<br>`GET /api/v1/analysis-cases/{caseId}/traceability`<br>`GET /api/v1/analysis-versions/{versionId}` |

## `/dashboard/oim/direktif-tugas` — Directive & Tasking

**Page type:** `list-builder`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Source Directive/UUK | Source selector | `4/12` | Memilih sumber task. | Directive, UUK/STR version |
| Task Table | Data table | `8/12` | Task yang sudah dibuat. | Title, Source, Priority, Area, Assignee, Status |
| Task Builder | Form panel | `8/12` | Membuat task. | Title, Description, Priority, Due date, Target areas |
| Assignment Rail | Sticky candidate panel | `4/12` | Field Coordinator eligible. | Name, Branch, Coverage, Workload |

### Filters / URL Params

- `directiveId`
- `uukStrVersionId`
- `status`
- `priority`
- `areaId`
- `from`
- `to`

### Data APIs

- `GET /api/v1/directives`
- `GET /api/v1/uuk-strs`
- `GET /api/v1/tasks`
- `GET /api/v1/position-assignments`

### Actions

- `POST /api/v1/tasks`
- `POST /api/v1/tasks/{taskId}/assignments`
- `PUT /api/v1/tasks/{taskId}/target-areas`
- `POST /api/v1/tasks/{taskId}/cancel`

### Form Contracts

- `F-TASK`
- `F-TASK-ASSIGNMENT`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/oim/direktif-tugas/baru` | `create` | Task | 8-column form + 4-column sticky validation/metadata rail | Task header, Source directive/UUK, Target areas, Assignments, Progress, Evidence, Related Baket, Timeline | `GET /api/v1/directives`<br>`GET /api/v1/uuk-strs`<br>`GET /api/v1/administrative-areas/tree`<br>`POST /api/v1/tasks` |
| `/dashboard/oim/direktif-tugas/[taskId]` | `detail` | Task | 8-column main content + 4-column sticky metadata/actions | Task header, Source directive/UUK, Target areas, Assignments, Progress, Evidence, Related Baket, Timeline | `GET /api/v1/tasks/{taskId}`<br>`GET /api/v1/tasks/{taskId}/assignments`<br>`GET /api/v1/tasks/{taskId}/progress-summary` |
| `/dashboard/oim/direktif-tugas/[taskId]/edit` | `edit` | Task | 8-column form + 4-column sticky validation/metadata rail | Task header, Source directive/UUK, Target areas, Assignments, Progress, Evidence, Related Baket, Timeline | `GET /api/v1/tasks/{taskId}`<br>`GET /api/v1/tasks/{taskId}/assignments`<br>`GET /api/v1/tasks/{taskId}/progress-summary`<br>`PATCH /api/v1/tasks/{taskId}`<br>`PUT /api/v1/tasks/{taskId}/target-areas` |
| `/dashboard/oim/direktif-tugas/[taskId]/penugasan` | `assignment-builder` | Task | 8-column main content + 4-column sticky metadata/actions | Task header, Source directive/UUK, Target areas, Assignments, Progress, Evidence, Related Baket, Timeline | `GET /api/v1/tasks/{taskId}`<br>`GET /api/v1/tasks/{taskId}/assignments`<br>`GET /api/v1/tasks/{taskId}/progress-summary`<br>`GET /api/v1/position-assignments`<br>`POST /api/v1/tasks/{taskId}/assignments` |

## `/dashboard/oim/laporan-masuk` — Incoming Baket

**Page type:** `queue-detail`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Incoming KPI | 4 KPI cards | `12/12` | Baket queue. | New, Urgent, Needs development, Under verification |
| Baket Queue | Queue table | `4/12` | Daftar Baket masuk. | Title, Officer, Area, Urgency, Submitted at |
| Baket Detail | Detail workspace | `8/12` | Current version, source, map, traceability. | 5W+1H, Sources, Location, Coverage, Attachments |
| Create Verification | Action card | `4/12` | Membuat canonical verification. | Version ID, Note |

### Filters / URL Params

- `status=SENT_TO_OIM,UNDER_VERIFICATION,NEEDS_DEVELOPMENT`
- `areaId`
- `urgency`
- `from`
- `to`
- `page`
- `limit`

### Data APIs

- `GET /api/v1/bakets`
- `GET /api/v1/bakets/{baketId}`
- `GET /api/v1/bakets/{baketId}/traceability`

### Actions

- `POST /api/v1/baket-versions/{versionId}/verification`

### Form Contracts

- `F-VERIFICATION-CREATE`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/oim/laporan-masuk/[baketId]` | `detail` | Baket | 8-column main content + 4-column sticky metadata/actions | Baket header, Current version, 5W+1H, Source messages, Location map, Coverage checks, Attachments, Timeline, Revision requests | `GET /api/v1/bakets/{baketId}`<br>`GET /api/v1/bakets/{baketId}/timeline`<br>`GET /api/v1/bakets/{baketId}/traceability` |
| `/dashboard/oim/laporan-masuk/[baketId]/versions/[versionId]` | `version-detail` | Baket | 8-column read-only content + 4-column version/timeline metadata | Baket header, Current version, 5W+1H, Source messages, Location map, Coverage checks, Attachments, Timeline, Revision requests | `GET /api/v1/bakets/{baketId}`<br>`GET /api/v1/bakets/{baketId}/timeline`<br>`GET /api/v1/bakets/{baketId}/traceability`<br>`GET /api/v1/baket-versions/{versionId}` |

## `/dashboard/oim/monitoring-lapangan` — Field Monitoring

**Page type:** `analytics-map`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Monitoring KPI | 4 KPI cards | `12/12` | Kinerja lapangan. | Active tasks, Overdue, Incoming Baket, Emergencies |
| Field Map | mapcn map | `8/12` | Task, personel, Baket, emergency. | Tasks, Personnel, Reports, Emergency |
| Workload/Status | Bar + donut | `4/12` | Beban dan status. | Officer workload, Task status |
| Monitoring Table | Data table | `12/12` | Detail task/report/personel. | Type, Title, Owner, Area, Status, Updated |

### Filters / URL Params

- `areaId`
- `unitId`
- `from`
- `to`
- `status`
- `priority`
- `bbox`
- `zoom`

### Data APIs

- `GET /api/v1/dashboard/task-performance`
- `GET /api/v1/tasks`
- `GET /api/v1/bakets`
- `GET /api/v1/personnel-location-map`
- `GET /api/v1/emergency-incidents`

### Actions

- `Open task/report/emergency`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/oim/monitoring-lapangan/tugas/[taskId]` | `detail` | Task / Personnel / Baket | 8-column main content + 4-column sticky metadata/actions | Task header, Source directive/UUK, Target areas, Assignments, Progress, Evidence, Related Baket, Timeline | `GET /api/v1/tasks/{taskId}`<br>`GET /api/v1/tasks/{taskId}/assignments`<br>`GET /api/v1/tasks/{taskId}/progress-summary` |
| `/dashboard/oim/monitoring-lapangan/baket/[baketId]` | `detail` | Task / Personnel / Baket | 8-column main content + 4-column sticky metadata/actions | Task header, Source directive/UUK, Target areas, Assignments, Progress, Evidence, Related Baket, Timeline | `GET /api/v1/bakets/{baketId}`<br>`GET /api/v1/bakets/{baketId}/timeline`<br>`GET /api/v1/bakets/{baketId}/traceability` |
| `/dashboard/oim/monitoring-lapangan/personel/[assignmentId]` | `detail` | Task / Personnel / Baket | 8-column main content + 4-column sticky metadata/actions | Task header, Source directive/UUK, Target areas, Assignments, Progress, Evidence, Related Baket, Timeline | `GET /api/v1/position-assignments/{assignmentId}`<br>`GET /api/v1/position-assignments/{assignmentId}/area-scopes`<br>`GET /api/v1/personnel-location-pings/{assignmentId}/latest`<br>`GET /api/v1/personnel-location-pings/{assignmentId}/history` |

## `/dashboard/oim/pengajuan-persetujuan` — Submission & Approval Tracking

**Page type:** `queue`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Submission KPI | 4 KPI cards | `12/12` | Produk siap dan workflow. | Ready, Validation errors, Regional review, Executive review |
| Product Queue | Data table | `5/12` | Produk draft/submitted. | Title, Type, Version, Classification, Status |
| Validation/Workflow | Detail panel | `7/12` | Completeness, workflow preview, timeline. | Validation, Route type, Approval steps |
| Submit Action | Sticky action card | `4/12` | Validate dan submit. | Version, Confirmation |

### Filters / URL Params

- `status`
- `productTypeId`
- `classification`
- `from`
- `to`
- `page`
- `limit`

### Data APIs

- `GET /api/v1/products`
- `GET /api/v1/approval-workflows/{workflowId}`
- `GET /api/v1/approval-workflows/{workflowId}/timeline`

### Actions

- `POST /api/v1/product-versions/{versionId}/validate`
- `POST /api/v1/products/{productId}/submit`

### Form Contracts

- `F-PRODUCT-SUBMIT`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/oim/pengajuan-persetujuan/[productId]` | `review-submit` | IntelligenceProduct / ApprovalWorkflow | 7-column evidence/detail + 5-column sticky action panel | Product header, Type/template, Structured content, Sources, Approval timeline, Distribution, Version history | `GET /api/v1/products/{productId}`<br>`GET /api/v1/products/{productId}/versions`<br>`GET /api/v1/products/{productId}/timeline`<br>`GET /api/v1/products/{productId}/traceability`<br>`POST /api/v1/product-versions/{versionId}/validate`<br>`POST /api/v1/products/{productId}/submit` |
| `/dashboard/oim/pengajuan-persetujuan/workflow/[workflowId]` | `tracking` | IntelligenceProduct / ApprovalWorkflow | 8-column read-only content + 4-column version/timeline metadata | Product header, Type/template, Structured content, Sources, Approval timeline, Distribution, Version history | `GET /api/v1/approval-workflows/{workflowId}`<br>`GET /api/v1/approval-workflows/{workflowId}/timeline` |

## `/dashboard/oim/peta-situasi` — OIM Situation Map

**Page type:** `map`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Map Toolbar | Filter/layer toolbar | `12/12` | Status, urgency, period, layer. | Area, Period, Status, Urgency, View mode |
| Situation Map | mapcn map | `9/12` | Verified reports, incoming Baket, alert, heatmap. | Report clusters, Heatmap, Alerts, Boundary |
| Selected Detail | Right drawer | `3/12` | Summary score dan traceability. | Title, Status, A-F/1-6 summary, Area |

### Filters / URL Params

- `bbox`
- `zoom`
- `areaId`
- `from`
- `to`
- `status`
- `urgency`
- `viewMode`

### Data APIs

- `GET /api/v1/map/reports`
- `GET /api/v1/map/clusters`
- `GET /api/v1/map/heatmap`
- `GET /api/v1/administrative-areas/boundaries`
- `GET /api/v1/alerts`

### Actions

- `Open Baket/verification`
- `Create analysis from selected items`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/oim/peta-situasi/baket/[baketId]` | `detail` | Baket / Alert | 8-column main content + 4-column sticky metadata/actions | Baket header, Current version, 5W+1H, Source messages, Location map, Coverage checks, Attachments, Timeline, Revision requests | `GET /api/v1/bakets/{baketId}`<br>`GET /api/v1/bakets/{baketId}/timeline`<br>`GET /api/v1/bakets/{baketId}/traceability` |
| `/dashboard/oim/peta-situasi/alert/[alertId]` | `detail` | Baket / Alert | 8-column main content + 4-column sticky metadata/actions | Baket header, Current version, 5W+1H, Source messages, Location map, Coverage checks, Attachments, Timeline, Revision requests | `GET /api/v1/alerts/{alertId}`<br>`POST /api/v1/alerts/{alertId}/acknowledge`<br>`POST /api/v1/alerts/{alertId}/assign`<br>`POST /api/v1/alerts/{alertId}/start`<br>`POST /api/v1/alerts/{alertId}/resolve` |

## `/dashboard/oim/produk-intelijen` — Intelligence Products Workspace

**Page type:** `landing`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Product KPI | 4 KPI cards | `12/12` | Workspace produk. | Draft, Needs revision, Submitted, Approved |
| Template Shortcuts | Quick action cards | `6/12` | Membuat produk berdasarkan tipe. | Product type, Active template |
| Recent Products | Table | `6/12` | Produk terbaru. | Title, Type, Status, Updated |
| Pipeline | Funnel chart | `12/12` | Draft ke approval. | Draft, Ready, Regional, Executive, Approved |

### Filters / URL Params

- `status`
- `productTypeId`

### Data APIs

- `GET /api/v1/products`
- `GET /api/v1/product-types`

### Actions

- `Create product`
- `Open product list`

## `/dashboard/oim/produk-intelijen/buat-produk` — Product Builder

**Page type:** `dynamic-form`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Product Header | Identity form card | `12/12` | Tipe, template, nomor, klasifikasi. | Product type, Template, Number, Title, Period |
| Section Navigation | Vertical section list | `3/12` | Navigasi field template. | Sections, Completion |
| Dynamic Form | Generated form | `6/12` | Isi template. | Dynamic fields, Validation |
| Source Rail | Selectable source panel | `3/12` | Verification, analysis, attachment. | Verification sources, Analysis sources, Files |
| Validation/Save Bar | Sticky footer | `12/12` | Save draft, validate, review. | Errors, Warnings, Actions |

### Filters / URL Params

- No page-level filters.

### Data APIs

- `GET /api/v1/product-types`
- `GET /api/v1/product-types/{productTypeId}/templates`
- `GET /api/v1/product-templates/{templateId}`
- `GET /api/v1/verifications`
- `GET /api/v1/analysis-cases`

### Actions

- `POST /api/v1/products`
- `PATCH /api/v1/product-versions/{versionId}`
- `PUT /api/v1/product-versions/{versionId}/source-verifications`
- `PUT /api/v1/product-versions/{versionId}/source-analyses`
- `PUT /api/v1/product-versions/{versionId}/attachments`
- `POST /api/v1/product-versions/{versionId}/validate`

### Form Contracts

- `F-PRODUCT`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/oim/produk-intelijen/buat-produk/[productId]/edit` | `dynamic-form` | IntelligenceProduct | Stepper/section navigation + main form + validation rail | Product header, Type/template, Structured content, Sources, Approval timeline, Distribution, Version history | `GET /api/v1/products/{productId}`<br>`GET /api/v1/products/{productId}/versions`<br>`GET /api/v1/products/{productId}/timeline`<br>`GET /api/v1/products/{productId}/traceability`<br>`PATCH /api/v1/product-versions/{versionId}`<br>`PUT /api/v1/product-versions/{versionId}/source-verifications`<br>+ 3 more |

## `/dashboard/oim/produk-intelijen/daftar-produk` — Product List

**Page type:** `list-detail`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Product KPI | 4 KPI cards | `12/12` | Status produk. | Draft, Needs revision, Submitted, Approved |
| Product Table | Data table | `5/12` | Daftar produk. | Number, Title, Type, Version, Classification, Status |
| Product Detail | Detail panel | `7/12` | Content preview, sources, workflow. | Content, Sources, Timeline, Available actions |

### Filters / URL Params

- `q`
- `status`
- `productTypeId`
- `classification`
- `areaId`
- `from`
- `to`
- `page`
- `limit`

### Data APIs

- `GET /api/v1/products`
- `GET /api/v1/products/{productId}`
- `GET /api/v1/products/{productId}/versions`
- `GET /api/v1/products/{productId}/timeline`

### Actions

- `Create revision`
- `Validate`
- `Submit`
- `Archive`

### Form Contracts

- `F-PRODUCT-REVISION`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/oim/produk-intelijen/daftar-produk/[productId]` | `detail` | IntelligenceProduct | 8-column main content + 4-column sticky metadata/actions | Product header, Type/template, Structured content, Sources, Approval timeline, Distribution, Version history | `GET /api/v1/products/{productId}`<br>`GET /api/v1/products/{productId}/versions`<br>`GET /api/v1/products/{productId}/timeline`<br>`GET /api/v1/products/{productId}/traceability` |
| `/dashboard/oim/produk-intelijen/daftar-produk/[productId]/edit` | `dynamic-form` | IntelligenceProduct | Stepper/section navigation + main form + validation rail | Product header, Type/template, Structured content, Sources, Approval timeline, Distribution, Version history | `GET /api/v1/products/{productId}`<br>`GET /api/v1/products/{productId}/versions`<br>`GET /api/v1/products/{productId}/timeline`<br>`GET /api/v1/products/{productId}/traceability`<br>`PATCH /api/v1/product-versions/{versionId}`<br>`PUT /api/v1/product-versions/{versionId}/source-verifications`<br>+ 3 more |
| `/dashboard/oim/produk-intelijen/daftar-produk/[productId]/versions/[versionId]` | `version-detail` | IntelligenceProduct | 8-column read-only content + 4-column version/timeline metadata | Product header, Type/template, Structured content, Sources, Approval timeline, Distribution, Version history | `GET /api/v1/products/{productId}`<br>`GET /api/v1/products/{productId}/versions`<br>`GET /api/v1/products/{productId}/timeline`<br>`GET /api/v1/products/{productId}/traceability`<br>`GET /api/v1/product-versions/{versionId}` |

## `/dashboard/oim/verifikasi-neraca-penilaian` — Verification & Assessment Balance

**Page type:** `workspace`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Verification Queue | Queue list | `3/12` | Baket yang perlu diverifikasi. | Title, Urgency, Area, Age |
| Evidence Panel | Source detail | `5/12` | Baket, WhatsApp/media, map, cross refs. | Baket version, Sources, Location, Attachments |
| Assessment Panel | Sticky workflow form | `4/12` | Checklist, A–F, 1–6, summary, decision. | Checks, Cross references, Reliability, Credibility, Decision |
| Score Interpretation | Matrix card | `12/12` | Interpretasi kombinasi nilai. | A-F, 1-6, Meaning |

### Filters / URL Params

- `status`
- `areaId`
- `verifiedByMe`
- `from`
- `to`
- `page`
- `limit`

### Data APIs

- `GET /api/v1/verifications`
- `GET /api/v1/verifications/{verificationId}`
- `GET /api/v1/verifications/{verificationId}/score`

### Actions

- `POST /api/v1/verifications/{verificationId}/start`
- `PATCH /api/v1/verifications/{verificationId}`
- `PUT /api/v1/verifications/{verificationId}/checks`
- `PUT /api/v1/verifications/{verificationId}/cross-references`
- `POST /api/v1/verifications/{verificationId}/complete`
- `POST /api/v1/verifications/{verificationId}/needs-development`
- `POST /api/v1/verifications/{verificationId}/reject`

### Form Contracts

- `F-VERIFICATION`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/oim/verifikasi-neraca-penilaian/[verificationId]` | `workflow` | BaketVerification | 7-column evidence/detail + 5-column sticky action panel | Baket header, Current version, 5W+1H, Source messages, Location map, Coverage checks, Attachments, Timeline, Revision requests | `GET /api/v1/verifications/{verificationId}`<br>`GET /api/v1/verifications/{verificationId}/score`<br>`POST /api/v1/verifications/{verificationId}/start`<br>`PATCH /api/v1/verifications/{verificationId}`<br>`PUT /api/v1/verifications/{verificationId}/checks`<br>`PUT /api/v1/verifications/{verificationId}/cross-references`<br>+ 3 more |

# Field Coordinator

## `/dashboard/field-coordinator` — Field Coordination Dashboard

**Page type:** `dashboard`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Operational KPI | 4 KPI cards | `12/12` | Status kerja lapangan. | Tasks received, In progress, Overdue, Emergencies |
| Field Map | mapcn operations map | `8/12` | Personel, task, Baket, emergency. | Personnel, Tasks, Reports, Emergency |
| Team Workload | Bar/list card | `4/12` | Beban Field Officer. | Officer, Active tasks, Overdue, Availability |
| Recent Reports | Table | `8/12` | Baket terbaru bawahan. | Title, Officer, Area, Urgency, Status |
| Quick Assignment | Action cards | `4/12` | Penugasan dan monitoring. | Assign officer, Open task board, Emergency |

### Filters / URL Params

- `areaId`
- `from`
- `to`

### Data APIs

- `GET /api/v1/dashboard/overview`
- `GET /api/v1/dashboard/task-performance`
- `GET /api/v1/tasks`
- `GET /api/v1/personnel-location-map`
- `GET /api/v1/emergency-incidents`

### Actions

- `Acknowledge task`
- `Assign Field Officer`
- `Open emergency`

## `/dashboard/field-coordinator/laporan-darurat` — Field Emergency Monitor

**Page type:** `queue-map`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Emergency KPI | 4 KPI cards | `12/12` | Status darurat dalam scope. | New, Critical, In response, Resolved |
| Incident Queue | Queue table | `4/12` | Insiden darurat. | Severity, Reporter, Area, Status, Age |
| Emergency Map | mapcn map | `8/12` | Lokasi insiden. | Incident, Reporter latest point, Area boundary |
| Incident Detail | Timeline + action card | `12/12` | Perkembangan dan action response. | Situation, Needs, Timeline, Available actions |

### Filters / URL Params

- `status`
- `severity`
- `areaId`
- `from`
- `to`
- `bbox`
- `zoom`

### Data APIs

- `GET /api/v1/emergency-incidents`
- `GET /api/v1/emergency-incidents/{incidentId}`
- `GET /api/v1/alerts`

### Actions

- `POST /api/v1/emergency-incidents/{incidentId}/acknowledge`
- `POST /api/v1/emergency-incidents/{incidentId}/verify`
- `POST /api/v1/emergency-incidents/{incidentId}/start-response`
- `POST /api/v1/emergency-incidents/{incidentId}/mark-controlled`
- `POST /api/v1/emergency-incidents/{incidentId}/resolve`

### Form Contracts

- `F-EMERGENCY-ACTION`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/field-coordinator/laporan-darurat/[incidentId]` | `detail-action` | EmergencyIncident | 7-column evidence/detail + 5-column sticky action panel | Critical header, Situation, Location map, Reporter, Needs, Timeline, Attachments, Response actions | `GET /api/v1/emergency-incidents/{incidentId}`<br>`POST /api/v1/emergency-incidents/{incidentId}/acknowledge`<br>`POST /api/v1/emergency-incidents/{incidentId}/verify`<br>`POST /api/v1/emergency-incidents/{incidentId}/start-response`<br>`POST /api/v1/emergency-incidents/{incidentId}/mark-controlled`<br>`POST /api/v1/emergency-incidents/{incidentId}/resolve` |

## `/dashboard/field-coordinator/laporan-lapangan` — Field Reports

**Page type:** `list-detail`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Report KPI | 4 KPI cards | `12/12` | Ringkasan Baket bawahan. | Submitted, Needs development, Verified, Urgent |
| Report Table | Data table | `5/12` | Daftar Baket. | Title, Officer, Task, Area, Urgency, Status, Submitted at |
| Report Preview | Detail panel | `7/12` | Ringkasan Baket terpilih. | Current version, 5W+1H, Location, Coverage, Timeline |

### Filters / URL Params

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

### Data APIs

- `GET /api/v1/bakets`
- `GET /api/v1/bakets/{baketId}`
- `GET /api/v1/bakets/{baketId}/timeline`

### Actions

- `Open detail`
- `Open source task`
- `No formal verification action`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/field-coordinator/laporan-lapangan/[baketId]` | `detail` | Baket | 8-column main content + 4-column sticky metadata/actions | Baket header, Current version, 5W+1H, Source messages, Location map, Coverage checks, Attachments, Timeline, Revision requests | `GET /api/v1/bakets/{baketId}`<br>`GET /api/v1/bakets/{baketId}/timeline`<br>`GET /api/v1/bakets/{baketId}/traceability` |

## `/dashboard/field-coordinator/monitoring-tugas` — Task Monitoring

**Page type:** `analytics-table`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Task KPI | 4 KPI cards | `12/12` | Kinerja task. | Assigned, In progress, Overdue, Completed |
| Progress Trend | Line chart | `8/12` | Progress penyelesaian. | Completion, Overdue, Baket output |
| Status Distribution | Donut chart | `4/12` | Distribusi status. | Status, Count |
| Task Tree/Table | Tree table | `12/12` | Task dan assignment. | Task, Officer, Area, Progress, Due date, Status |

### Filters / URL Params

- `status`
- `priority`
- `areaId`
- `assigneeAssignmentId`
- `from`
- `to`
- `groupBy`

### Data APIs

- `GET /api/v1/tasks`
- `GET /api/v1/tasks/{taskId}/cascade`
- `GET /api/v1/tasks/{taskId}/progress-summary`
- `GET /api/v1/dashboard/task-performance`

### Actions

- `Open assignment`
- `Reassign if permitted`
- `Escalate emergency operationally`

### Form Contracts

- `F-TASK-REASSIGN`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/field-coordinator/monitoring-tugas/[taskId]` | `detail` | Task | 8-column main content + 4-column sticky metadata/actions | Task header, Source directive/UUK, Target areas, Assignments, Progress, Evidence, Related Baket, Timeline | `GET /api/v1/tasks/{taskId}`<br>`GET /api/v1/tasks/{taskId}/assignments`<br>`GET /api/v1/tasks/{taskId}/progress-summary` |

## `/dashboard/field-coordinator/penugasan-field-officer` — Assign Field Officer

**Page type:** `assignment-builder`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Task Context | Summary card | `5/12` | Task yang akan ditugaskan. | Title, Target area, Priority, Due date, Instructions |
| Eligible Officers | Selectable table/card grid | `7/12` | Field Officer yang memenuhi syarat. | Name, Position, Coverage, Active workload, Availability |
| Coverage Map | Mini map | `5/12` | Task area dan scope officer terpilih. | Task boundary, Officer coverage |
| Assignment Review | Sticky form card | `7/12` | Due date, note, dan selected officers. | Assignees, Due date, Assignment note |

### Filters / URL Params

- `taskId`
- `areaId`
- `availability`
- `q`

### Data APIs

- `GET /api/v1/tasks/{taskId}`
- `GET /api/v1/position-assignments`
- `GET /api/v1/positions/{positionId}/subordinates`
- `GET /api/v1/dashboard/task-performance`

### Actions

- `POST /api/v1/tasks/{taskId}/assignments`

### Form Contracts

- `F-TASK-ASSIGNMENT`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/field-coordinator/penugasan-field-officer/[taskId]` | `assignment-builder` | Task | 8-column main content + 4-column sticky metadata/actions | Task header, Source directive/UUK, Target areas, Assignments, Progress, Evidence, Related Baket, Timeline | `GET /api/v1/tasks/{taskId}`<br>`GET /api/v1/tasks/{taskId}/assignments`<br>`GET /api/v1/tasks/{taskId}/progress-summary`<br>`GET /api/v1/position-assignments`<br>`POST /api/v1/tasks/{taskId}/assignments` |

## `/dashboard/field-coordinator/personel-jaring` — Personnel & Jaring

**Page type:** `tabs`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Tabs & KPI | Tabs + 4 KPI cards | `12/12` | Personel dan Jaring. | Active personnel, Available, Active Jaring, Coverage gaps |
| Personnel Table | Data table | `12/12` | Personel dalam command chain. | Name, Position, Area, Tasks, Availability, Last location |
| Jaring Table | Data table | `12/12` | Jaring dan caretaker. | Code, Alias, Caretaker, Area, Status, Last message |
| Relationship Detail | Side drawer | `Overlay` | Caretaker history dan coverage. | Caretaker timeline, Coverage, Message count |

### Filters / URL Params

- `tab`
- `q`
- `status`
- `areaId`
- `positionCode`
- `page`
- `limit`

### Data APIs

- `GET /api/v1/position-assignments`
- `GET /api/v1/jaring`
- `GET /api/v1/jaring/{jaringId}/caretakers`
- `GET /api/v1/jaring/{jaringId}/area-coverages`

### Actions

- `Transfer caretaker`
- `Update Jaring coverage`
- `Open personnel`

### Form Contracts

- `F-JARING-TRANSFER`
- `F-JARING-COVERAGE`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/field-coordinator/personel-jaring/personel/[assignmentId]` | `detail` | PositionAssignment / Jaring | 8-column main content + 4-column sticky metadata/actions | Seat summary, Organization path, Occupant, Reports-to chain, Subordinates, Area policy, Actions | `GET /api/v1/position-assignments/{assignmentId}`<br>`GET /api/v1/position-assignments/{assignmentId}/area-scopes`<br>`GET /api/v1/personnel-location-pings/{assignmentId}/latest`<br>`GET /api/v1/personnel-location-pings/{assignmentId}/history` |
| `/dashboard/field-coordinator/personel-jaring/jaring/[jaringId]` | `detail-edit` | PositionAssignment / Jaring | 8-column form + 4-column sticky validation/metadata rail | Seat summary, Organization path, Occupant, Reports-to chain, Subordinates, Area policy, Actions | `GET /api/v1/jaring/{jaringId}`<br>`GET /api/v1/jaring/{jaringId}/area-coverages`<br>`GET /api/v1/jaring/{jaringId}/caretakers`<br>`GET /api/v1/jaring/{jaringId}/messages`<br>`GET /api/v1/jaring/{jaringId}/bakets` |
| `/dashboard/field-coordinator/personel-jaring/jaring/[jaringId]/transfer` | `action-page` | PositionAssignment / Jaring | 7-column evidence/detail + 5-column sticky action panel | Seat summary, Organization path, Occupant, Reports-to chain, Subordinates, Area policy, Actions | `GET /api/v1/jaring/{jaringId}`<br>`GET /api/v1/jaring/{jaringId}/area-coverages`<br>`GET /api/v1/jaring/{jaringId}/caretakers`<br>`GET /api/v1/jaring/{jaringId}/messages`<br>`GET /api/v1/jaring/{jaringId}/bakets`<br>`POST /api/v1/jaring/{jaringId}/caretaker-transfer` |

## `/dashboard/field-coordinator/personel-lapangan` — Field Personnel

**Page type:** `directory-map`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Personnel KPI | 4 KPI cards | `12/12` | Status personel. | Active, Available, On task, Stale location |
| Personnel Directory | Card/table list | `5/12` | Daftar personel. | Name, Position, Availability, Active tasks, Last location |
| Location Map | mapcn map | `7/12` | Lokasi terakhir personel. | Point, Captured at, Accuracy |
| Workload Detail | Bar chart + table | `12/12` | Beban kerja personel. | Officer, Tasks, Overdue, Reports |

### Filters / URL Params

- `q`
- `areaId`
- `status`
- `hasActiveTask`
- `capturedAfter`

### Data APIs

- `GET /api/v1/position-assignments`
- `GET /api/v1/personnel-location-map`
- `GET /api/v1/dashboard/task-performance`

### Actions

- `Open personnel detail`
- `Open assignment form`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/field-coordinator/personel-lapangan/[assignmentId]` | `detail` | PositionAssignment | 8-column main content + 4-column sticky metadata/actions | Seat summary, Organization path, Occupant, Reports-to chain, Subordinates, Area policy, Actions | `GET /api/v1/position-assignments/{assignmentId}`<br>`GET /api/v1/position-assignments/{assignmentId}/area-scopes`<br>`GET /api/v1/personnel-location-pings/{assignmentId}/latest`<br>`GET /api/v1/personnel-location-pings/{assignmentId}/history` |

## `/dashboard/field-coordinator/peta-lapangan` — Field Operations Map

**Page type:** `map`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Layer Toolbar | Floating toolbar | `12/12` | Filter layer lapangan. | Personnel, Tasks, Reports, Emergencies, Boundary |
| Field Operations Map | Full-height mapcn map | `9/12` | Peta operasional. | Clusters, Personnel, Task target, Emergency |
| Selected Feature | Right drawer | `3/12` | Detail ringkas fitur terpilih. | Type, Title, Status, Area, Timestamp |
| Unlocated/Offline | Bottom list | `12/12` | Data tanpa koordinat atau stale. | Resource, Reason, Last update |

### Filters / URL Params

- `bbox`
- `zoom`
- `areaId`
- `from`
- `to`
- `layers`
- `status`
- `urgency`
- `capturedAfter`

### Data APIs

- `GET /api/v1/personnel-location-map`
- `GET /api/v1/map/reports`
- `GET /api/v1/map/clusters`
- `GET /api/v1/administrative-areas/boundaries`
- `GET /api/v1/emergency-incidents`

### Actions

- `Select personnel`
- `Select report`
- `Drill area`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/field-coordinator/peta-lapangan/tugas/[taskId]` | `detail` | Task / Baket / Personnel / Emergency | 8-column main content + 4-column sticky metadata/actions | Task header, Source directive/UUK, Target areas, Assignments, Progress, Evidence, Related Baket, Timeline | `GET /api/v1/tasks/{taskId}`<br>`GET /api/v1/tasks/{taskId}/assignments`<br>`GET /api/v1/tasks/{taskId}/progress-summary` |
| `/dashboard/field-coordinator/peta-lapangan/baket/[baketId]` | `detail` | Task / Baket / Personnel / Emergency | 8-column main content + 4-column sticky metadata/actions | Task header, Source directive/UUK, Target areas, Assignments, Progress, Evidence, Related Baket, Timeline | `GET /api/v1/bakets/{baketId}`<br>`GET /api/v1/bakets/{baketId}/timeline`<br>`GET /api/v1/bakets/{baketId}/traceability` |
| `/dashboard/field-coordinator/peta-lapangan/personel/[assignmentId]` | `detail` | Task / Baket / Personnel / Emergency | 8-column main content + 4-column sticky metadata/actions | Task header, Source directive/UUK, Target areas, Assignments, Progress, Evidence, Related Baket, Timeline | `GET /api/v1/position-assignments/{assignmentId}`<br>`GET /api/v1/position-assignments/{assignmentId}/area-scopes`<br>`GET /api/v1/personnel-location-pings/{assignmentId}/latest`<br>`GET /api/v1/personnel-location-pings/{assignmentId}/history` |
| `/dashboard/field-coordinator/peta-lapangan/darurat/[incidentId]` | `detail-action` | Task / Baket / Personnel / Emergency | 7-column evidence/detail + 5-column sticky action panel | Task header, Source directive/UUK, Target areas, Assignments, Progress, Evidence, Related Baket, Timeline | `GET /api/v1/emergency-incidents/{incidentId}`<br>`POST /api/v1/emergency-incidents/{incidentId}/acknowledge`<br>`POST /api/v1/emergency-incidents/{incidentId}/verify`<br>`POST /api/v1/emergency-incidents/{incidentId}/start-response`<br>`POST /api/v1/emergency-incidents/{incidentId}/mark-controlled`<br>`POST /api/v1/emergency-incidents/{incidentId}/resolve` |

## `/dashboard/field-coordinator/tugas-lapangan` — Field Task Workspace

**Page type:** `landing`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Task Workspace KPI | 4 KPI cards | `12/12` | Ringkasan tugas. | Unread, Acknowledged, In progress, Overdue |
| Received Tasks | Priority list | `6/12` | Tugas dari OIM. | Title, Priority, Area, Due date, Status |
| Team Assignment | Action card grid | `6/12` | Task yang perlu dicascade. | Task, Assigned count, Coverage |
| Operational Board Preview | Mini kanban | `12/12` | Status pelaksanaan. | Assigned, In progress, Blocked, Completed |

### Filters / URL Params

- `status`
- `priority`
- `areaId`

### Data APIs

- `GET /api/v1/tasks`
- `GET /api/v1/dashboard/task-performance`

### Actions

- `Open received task`
- `Open team assignment`

## `/dashboard/field-coordinator/tugas-lapangan/tugas-diterima` — Received Tasks

**Page type:** `inbox`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Inbox KPI | 3 KPI cards | `12/12` | Unread, due soon, overdue. | Unread, Due soon, Overdue |
| Task Inbox | Inbox table/card list | `12/12` | Tugas diterima. | Title, Source, Priority, Area, Due date, Read, Status |
| Task Preview | Drawer/detail | `Overlay` | Instruksi, source, target area, action. | Description, Directive/UUK, Target area, Available actions |

### Filters / URL Params

- `status`
- `priority`
- `areaId`
- `from`
- `to`
- `page`
- `limit`

### Data APIs

- `GET /api/v1/tasks`
- `GET /api/v1/task-assignments/{assignmentId}`

### Actions

- `POST /api/v1/task-assignments/{assignmentId}/mark-read`
- `POST /api/v1/task-assignments/{assignmentId}/acknowledge`
- `POST /api/v1/task-assignments/{assignmentId}/start`

### Form Contracts

- `F-TASK-START`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/field-coordinator/tugas-lapangan/tugas-diterima/[assignmentId]` | `detail-action` | TaskAssignment | 7-column evidence/detail + 5-column sticky action panel | Task header, Source directive/UUK, Target areas, Assignments, Progress, Evidence, Related Baket, Timeline | `GET /api/v1/task-assignments/{assignmentId}`<br>`POST /api/v1/task-assignments/{assignmentId}/mark-read`<br>`POST /api/v1/task-assignments/{assignmentId}/acknowledge`<br>`POST /api/v1/task-assignments/{assignmentId}/start`<br>`POST /api/v1/task-assignments/{assignmentId}/progress`<br>`POST /api/v1/task-assignments/{assignmentId}/complete`<br>+ 1 more |

## `/dashboard/field-coordinator/tugas-lapangan/penugasan-tim` — Team Assignment

**Page type:** `assignment-builder`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Task Selector | Task list | `4/12` | Memilih task yang akan dicascade. | Task, Priority, Area, Due date |
| Team Candidates | Selectable table | `8/12` | Field Officer eligible. | Officer, Coverage, Workload, Availability |
| Assignment Summary | Sticky review bar | `12/12` | Selected team dan due date. | Selected count, Area coverage, Due date, Note |

### Filters / URL Params

- `taskId`
- `areaId`
- `q`

### Data APIs

- `GET /api/v1/tasks/{taskId}`
- `GET /api/v1/positions/{positionId}/subordinates`
- `GET /api/v1/position-assignments`
- `GET /api/v1/tasks/{taskId}/assignments`

### Actions

- `POST /api/v1/tasks/{taskId}/assignments`
- `POST /api/v1/task-assignments/{assignmentId}/reassign`

### Form Contracts

- `F-TASK-ASSIGNMENT`
- `F-TASK-REASSIGN`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/field-coordinator/tugas-lapangan/penugasan-tim/[taskId]` | `assignment-builder` | Task | 8-column main content + 4-column sticky metadata/actions | Task header, Source directive/UUK, Target areas, Assignments, Progress, Evidence, Related Baket, Timeline | `GET /api/v1/tasks/{taskId}`<br>`GET /api/v1/tasks/{taskId}/assignments`<br>`GET /api/v1/tasks/{taskId}/progress-summary`<br>`GET /api/v1/position-assignments`<br>`POST /api/v1/tasks/{taskId}/assignments` |

## `/dashboard/field-coordinator/tugas-operasional` — Operational Task Board

**Page type:** `kanban`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Board Filters | Filter bar | `12/12` | Status, priority, area, officer. | Status, Priority, Area, Officer |
| Operational Kanban | Horizontal kanban | `12/12` | Assignment per status. | Assigned, Read, Acknowledged, In progress, Overdue, Completed |
| Task Card | Kanban card | `Within columns` | Informasi inti task. | Title, Officer, Area, Progress, Due date |
| Assignment Drawer | Detail/action drawer | `Overlay` | Progress, evidence, reassign. | Timeline, Evidence, Related Baket, Available actions |

### Filters / URL Params

- `status`
- `priority`
- `areaId`
- `assigneeAssignmentId`
- `from`
- `to`

### Data APIs

- `GET /api/v1/tasks`
- `GET /api/v1/tasks/{taskId}/assignments`
- `GET /api/v1/tasks/{taskId}/progress-summary`

### Actions

- `Open task`
- `Reassign`
- `Cancel child task if permitted`

### Form Contracts

- `F-TASK-REASSIGN`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/field-coordinator/tugas-operasional/[taskId]` | `detail` | Task | 8-column main content + 4-column sticky metadata/actions | Task header, Source directive/UUK, Target areas, Assignments, Progress, Evidence, Related Baket, Timeline | `GET /api/v1/tasks/{taskId}`<br>`GET /api/v1/tasks/{taskId}/assignments`<br>`GET /api/v1/tasks/{taskId}/progress-summary` |
| `/dashboard/field-coordinator/tugas-operasional/[taskId]/assignments/[assignmentId]` | `detail-action` | Task | 7-column evidence/detail + 5-column sticky action panel | Task header, Source directive/UUK, Target areas, Assignments, Progress, Evidence, Related Baket, Timeline | `GET /api/v1/task-assignments/{assignmentId}`<br>`POST /api/v1/task-assignments/{assignmentId}/mark-read`<br>`POST /api/v1/task-assignments/{assignmentId}/acknowledge`<br>`POST /api/v1/task-assignments/{assignmentId}/start`<br>`POST /api/v1/task-assignments/{assignmentId}/progress`<br>`POST /api/v1/task-assignments/{assignmentId}/complete`<br>+ 1 more |

# Field Officer

## `/dashboard/field-officer` — Field Officer Dashboard

**Page type:** `dashboard`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| My KPI | 4 KPI cards | `12/12` | Ringkasan kerja pribadi. | My tasks, Jaring inbox, Draft Baket, Revision requests |
| Primary Task | Large action card | `8/12` | Tugas paling prioritas. | Title, Priority, Area, Due date, Progress |
| Emergency Shortcut | Critical action card | `4/12` | Akses laporan darurat. | Send emergency |
| Task Map | mapcn preview | `8/12` | Target tugas dan laporan sendiri. | Task targets, My reports |
| Recent Activity | Timeline/list | `4/12` | Aktivitas terbaru. | Task update, Message, Baket status |

### Filters / URL Params

- `from`
- `to`

### Data APIs

- `GET /api/v1/dashboard/overview`
- `GET /api/v1/tasks`
- `GET /api/v1/whatsapp-inbox/summary`
- `GET /api/v1/bakets`
- `GET /api/v1/emergency-incidents`

### Actions

- `Open task`
- `Create Baket`
- `Send emergency report`

## `/dashboard/field-officer/buat-baket` — Create Baket

**Page type:** `wizard`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Baket Stepper | Wizard stepper | `12/12` | Source → Facts → Location → Attachments → Review. | Current step, Completion |
| Source Selection | Selectable cards/table | `8/12` | Task dan WhatsApp source. | Task, Message, Jaring |
| Form Panel | Form card | `8/12` | 5W+1H dan metadata. | Title, Content, Event time, Urgency, Note |
| Location Map | mapcn pin editor | `8/12` | Koordinat, resolved area, manual override. | Latitude, Longitude, Accuracy, Area |
| Validation Rail | Sticky completeness card | `4/12` | Error, warning, coverage. | Required fields, Coverage status, Attachments |

### Filters / URL Params

- No page-level filters.

### Data APIs

- `GET /api/v1/tasks`
- `GET /api/v1/whatsapp-messages`
- `GET /api/v1/administrative-areas/tree`
- `GET /api/v1/reference-data/enums`

### Actions

- `POST /api/v1/bakets`
- `PATCH /api/v1/baket-versions/{versionId}`
- `PUT /api/v1/bakets/{baketId}/source-messages`
- `PUT /api/v1/bakets/{baketId}/attachments`
- `POST /api/v1/baket-versions/{versionId}/resolve-area`
- `POST /api/v1/baket-versions/{versionId}/manual-area-override`
- `POST /api/v1/baket-versions/{versionId}/validate-coverage`

### Form Contracts

- `F-BAKET-DRAFT`
- `F-MANUAL-AREA-OVERRIDE`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/field-officer/buat-baket/[baketId]/edit` | `wizard` | Baket | Stepper/section navigation + main form + validation rail | Baket header, Current version, 5W+1H, Source messages, Location map, Coverage checks, Attachments, Timeline, Revision requests | `GET /api/v1/bakets/{baketId}`<br>`GET /api/v1/bakets/{baketId}/timeline`<br>`GET /api/v1/bakets/{baketId}/traceability`<br>`PATCH /api/v1/baket-versions/{versionId}`<br>`PUT /api/v1/bakets/{baketId}/source-messages`<br>`PUT /api/v1/bakets/{baketId}/attachments`<br>+ 2 more |

## `/dashboard/field-officer/jaring-binaan` — Managed Jaring

**Page type:** `list-detail`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Jaring KPI | 4 KPI cards | `12/12` | Jaring aktif dan activity. | Active, Inactive, Messages this period, Coverage gaps |
| Jaring Table | Data table | `5/12` | Daftar Jaring. | Code, Alias, Masked WhatsApp, Status, Primary area, Last message |
| Jaring Detail | Detail card | `7/12` | Caretaker, coverage, messages, Baket. | Identity, Coverage, Messages, Related Baket |

### Filters / URL Params

- `q`
- `status`
- `areaId`
- `page`
- `limit`

### Data APIs

- `GET /api/v1/jaring`
- `GET /api/v1/jaring/{jaringId}`
- `GET /api/v1/jaring/{jaringId}/messages`
- `GET /api/v1/jaring/{jaringId}/bakets`

### Actions

- `POST /api/v1/jaring`
- `PATCH /api/v1/jaring/{jaringId}`
- `POST /api/v1/jaring/{jaringId}/activate`
- `POST /api/v1/jaring/{jaringId}/deactivate`
- `PUT /api/v1/jaring/{jaringId}/area-coverages`

### Form Contracts

- `F-JARING`
- `F-JARING-COVERAGE`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/field-officer/jaring-binaan/baru` | `create` | Jaring | 8-column form + 4-column sticky validation/metadata rail | Jaring identity, Masked WhatsApp, Caretaker, Coverage, Message history, Related Baket, Status actions | `GET /api/v1/administrative-areas/tree`<br>`POST /api/v1/jaring` |
| `/dashboard/field-officer/jaring-binaan/[jaringId]` | `detail` | Jaring | 8-column main content + 4-column sticky metadata/actions | Jaring identity, Masked WhatsApp, Caretaker, Coverage, Message history, Related Baket, Status actions | `GET /api/v1/jaring/{jaringId}`<br>`GET /api/v1/jaring/{jaringId}/area-coverages`<br>`GET /api/v1/jaring/{jaringId}/caretakers`<br>`GET /api/v1/jaring/{jaringId}/messages`<br>`GET /api/v1/jaring/{jaringId}/bakets` |
| `/dashboard/field-officer/jaring-binaan/[jaringId]/edit` | `edit` | Jaring | 8-column form + 4-column sticky validation/metadata rail | Jaring identity, Masked WhatsApp, Caretaker, Coverage, Message history, Related Baket, Status actions | `GET /api/v1/jaring/{jaringId}`<br>`GET /api/v1/jaring/{jaringId}/area-coverages`<br>`GET /api/v1/jaring/{jaringId}/caretakers`<br>`GET /api/v1/jaring/{jaringId}/messages`<br>`GET /api/v1/jaring/{jaringId}/bakets`<br>`PATCH /api/v1/jaring/{jaringId}`<br>+ 1 more |

## `/dashboard/field-officer/kirim-baket` — Submit Baket

**Page type:** `review-submit`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Draft Queue | Selectable list | `4/12` | Baket siap review. | Title, Completeness, Area, Updated at |
| Baket Preview | Read-only review | `5/12` | Isi lengkap Baket. | 5W+1H, Sources, Attachments, Location |
| Submit Panel | Sticky completeness card | `3/12` | Blocking errors, warnings, confirmation. | Errors, Warnings, Target OIM, Submit |

### Filters / URL Params

- `status=DRAFT,READY_TO_SEND`
- `q`
- `areaId`

### Data APIs

- `GET /api/v1/bakets`
- `GET /api/v1/bakets/{baketId}`
- `GET /api/v1/bakets/{baketId}/revision-requests`

### Actions

- `POST /api/v1/bakets/{baketId}/submit`
- `POST /api/v1/bakets/{baketId}/resubmit`

### Form Contracts

- `F-BAKET-SUBMIT`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/field-officer/kirim-baket/[baketId]` | `review-submit` | Baket | 7-column evidence/detail + 5-column sticky action panel | Baket header, Current version, 5W+1H, Source messages, Location map, Coverage checks, Attachments, Timeline, Revision requests | `GET /api/v1/bakets/{baketId}`<br>`GET /api/v1/bakets/{baketId}/timeline`<br>`GET /api/v1/bakets/{baketId}/traceability`<br>`GET /api/v1/bakets/{baketId}/revision-requests`<br>`POST /api/v1/bakets/{baketId}/submit`<br>`POST /api/v1/bakets/{baketId}/resubmit` |

## `/dashboard/field-officer/kotak-masuk-jaring` — Jaring Inbox

**Page type:** `inbox-detail`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Inbox KPI | 4 KPI cards | `12/12` | Message status. | Unread, Needs validation, Missing GPS, Duplicates |
| Message Inbox | Inbox list | `4/12` | Pesan routed ke user. | Jaring, Preview, Received at, GPS, Validation |
| Message Detail | Immutable detail | `5/12` | Raw content, media, coordinate, area. | Content, Media, Coordinates, Resolved area |
| Validation Actions | Sticky action card | `3/12` | Validate, duplicate, spam, create Baket. | Decision, Issues, Note |

### Filters / URL Params

- `status`
- `validationStatus`
- `hasGps`
- `jaringId`
- `from`
- `to`
- `cursor`
- `limit`

### Data APIs

- `GET /api/v1/whatsapp-messages`
- `GET /api/v1/whatsapp-messages/{messageId}`
- `GET /api/v1/whatsapp-messages/{messageId}/routing-logs`

### Actions

- `POST /api/v1/whatsapp-messages/{messageId}/validate`
- `POST /api/v1/whatsapp-messages/{messageId}/resolve-area`
- `POST /api/v1/whatsapp-messages/{messageId}/mark-spam`
- `POST /api/v1/whatsapp-messages/{messageId}/mark-duplicate`
- `POST /api/v1/whatsapp-messages/{messageId}/create-baket`

### Form Contracts

- `F-WHATSAPP-VALIDATE`
- `F-WHATSAPP-DUPLICATE`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/field-officer/kotak-masuk-jaring/[messageId]` | `detail-action` | WhatsAppMessage | 7-column evidence/detail + 5-column sticky action panel | Immutable message, Media gallery, Coordinates/map, Resolved area, Validation issues, Routing history, Create-Baket action | `GET /api/v1/whatsapp-messages/{messageId}`<br>`GET /api/v1/whatsapp-messages/{messageId}/routing-logs`<br>`POST /api/v1/whatsapp-messages/{messageId}/validate`<br>`POST /api/v1/whatsapp-messages/{messageId}/resolve-area`<br>`POST /api/v1/whatsapp-messages/{messageId}/mark-duplicate`<br>`POST /api/v1/whatsapp-messages/{messageId}/mark-spam`<br>+ 1 more |

## `/dashboard/field-officer/laporan-darurat` — Emergency Report

**Page type:** `quick-form`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Emergency Header | Critical status banner | `12/12` | Menegaskan fungsi darurat. | GPS status, Network status |
| Emergency Form | Single-column form | `8/12` | Situation, severity, action, need. | Title, Severity, Situation, Action taken, Needs |
| Location & Attachment | Map/attachment card | `4/12` | GPS optional dan evidence. | Latitude, Longitude, Accuracy, Attachments |
| Submit Confirmation | Sticky action bar | `12/12` | Kirim laporan darurat. | Idempotency, Confirmation |

### Filters / URL Params

- No page-level filters.

### Data APIs

- `GET /api/v1/me`
- `GET /api/v1/personnel-location-pings/me/latest`

### Actions

- `POST /api/v1/emergency-incidents`

### Form Contracts

- `F-EMERGENCY-CREATE`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/field-officer/laporan-darurat/[incidentId]` | `detail` | EmergencyIncident | 8-column main content + 4-column sticky metadata/actions | Critical header, Situation, Location map, Reporter, Needs, Timeline, Attachments, Response actions | `GET /api/v1/emergency-incidents/{incidentId}`<br>`POST /api/v1/emergency-incidents/{incidentId}/acknowledge`<br>`POST /api/v1/emergency-incidents/{incidentId}/verify`<br>`POST /api/v1/emergency-incidents/{incidentId}/start-response`<br>`POST /api/v1/emergency-incidents/{incidentId}/mark-controlled`<br>`POST /api/v1/emergency-incidents/{incidentId}/resolve` |

## `/dashboard/field-officer/laporan-saya` — My Baket

**Page type:** `list-detail`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| My Report KPI | 4 KPI cards | `12/12` | Status Baket. | Draft, Submitted, Needs revision, Verified |
| My Report Table | Data table | `5/12` | Daftar Baket pribadi. | Title, Task, Area, Urgency, Status, Updated at |
| Report Detail | Detail panel | `7/12` | Version, timeline, revision request. | Current version, Location, Timeline, Revision |

### Filters / URL Params

- `q`
- `status`
- `areaId`
- `from`
- `to`
- `page`
- `limit`

### Data APIs

- `GET /api/v1/bakets`
- `GET /api/v1/bakets/{baketId}`
- `GET /api/v1/bakets/{baketId}/timeline`
- `GET /api/v1/bakets/{baketId}/revision-requests`

### Actions

- `Create revision version`
- `Resolve revision request`
- `Resubmit`

### Form Contracts

- `F-BAKET-REVISION`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/field-officer/laporan-saya/[baketId]` | `detail` | Baket | 8-column main content + 4-column sticky metadata/actions | Baket header, Current version, 5W+1H, Source messages, Location map, Coverage checks, Attachments, Timeline, Revision requests | `GET /api/v1/bakets/{baketId}`<br>`GET /api/v1/bakets/{baketId}/timeline`<br>`GET /api/v1/bakets/{baketId}/traceability` |
| `/dashboard/field-officer/laporan-saya/[baketId]/revisi` | `wizard` | Baket | Stepper/section navigation + main form + validation rail | Baket header, Current version, 5W+1H, Source messages, Location map, Coverage checks, Attachments, Timeline, Revision requests | `GET /api/v1/bakets/{baketId}`<br>`GET /api/v1/bakets/{baketId}/timeline`<br>`GET /api/v1/bakets/{baketId}/traceability`<br>`GET /api/v1/bakets/{baketId}/revision-requests`<br>`POST /api/v1/bakets/{baketId}/versions`<br>`POST /api/v1/bakets/{baketId}/resubmit` |
| `/dashboard/field-officer/laporan-saya/[baketId]/versions/[versionId]` | `version-detail` | Baket | 8-column read-only content + 4-column version/timeline metadata | Baket header, Current version, 5W+1H, Source messages, Location map, Coverage checks, Attachments, Timeline, Revision requests | `GET /api/v1/bakets/{baketId}`<br>`GET /api/v1/bakets/{baketId}/timeline`<br>`GET /api/v1/bakets/{baketId}/traceability`<br>`GET /api/v1/baket-versions/{versionId}` |

## `/dashboard/field-officer/peta-tugas` — My Task Map

**Page type:** `map`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Map Filter | Floating filter bar | `12/12` | Task/status/period. | Task status, Area, Period |
| My Task Map | mapcn map | `9/12` | Target tugas, laporan, lokasi sendiri. | Task targets, My Baket, My location |
| Task Drawer | Right drawer | `3/12` | Detail task terpilih. | Title, Priority, Due date, Progress, Actions |

### Filters / URL Params

- `bbox`
- `zoom`
- `areaId`
- `status`
- `from`
- `to`

### Data APIs

- `GET /api/v1/tasks`
- `GET /api/v1/map/reports`
- `GET /api/v1/personnel-location-pings/me/latest`
- `GET /api/v1/administrative-areas/boundaries`

### Actions

- `Open task`
- `Start task`
- `Create Baket at selected task`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/field-officer/peta-tugas/tugas/[assignmentId]` | `detail-action` | TaskAssignment / Baket | 7-column evidence/detail + 5-column sticky action panel | Task header, Source directive/UUK, Target areas, Assignments, Progress, Evidence, Related Baket, Timeline | `GET /api/v1/task-assignments/{assignmentId}`<br>`POST /api/v1/task-assignments/{assignmentId}/mark-read`<br>`POST /api/v1/task-assignments/{assignmentId}/acknowledge`<br>`POST /api/v1/task-assignments/{assignmentId}/start`<br>`POST /api/v1/task-assignments/{assignmentId}/progress`<br>`POST /api/v1/task-assignments/{assignmentId}/complete`<br>+ 1 more |
| `/dashboard/field-officer/peta-tugas/baket/[baketId]` | `detail` | TaskAssignment / Baket | 8-column main content + 4-column sticky metadata/actions | Task header, Source directive/UUK, Target areas, Assignments, Progress, Evidence, Related Baket, Timeline | `GET /api/v1/bakets/{baketId}`<br>`GET /api/v1/bakets/{baketId}/timeline`<br>`GET /api/v1/bakets/{baketId}/traceability` |

## `/dashboard/field-officer/tugas-saya` — My Tasks

**Page type:** `inbox-kanban`

### Visual Composition

| Section | Component | Grid | What is shown | Visible fields/data |
|---|---|---:|---|---|
| Task KPI | 4 KPI cards | `12/12` | Status tugas pribadi. | Unread, Acknowledged, In progress, Overdue |
| Status Tabs | Tabs/segmented control | `12/12` | Memilih status. | All, Unread, In progress, Completed |
| Task Cards | Card list / mini kanban | `12/12` | Tugas pribadi. | Title, Priority, Area, Due date, Progress, Status |
| Task Detail | Drawer/detail route | `Overlay` | Instruksi, evidence, progress action. | Source, Description, Timeline, Related Baket |

### Filters / URL Params

- `status`
- `priority`
- `areaId`
- `from`
- `to`
- `page`
- `limit`

### Data APIs

- `GET /api/v1/tasks`
- `GET /api/v1/task-assignments/{assignmentId}`

### Actions

- `POST /api/v1/task-assignments/{assignmentId}/mark-read`
- `POST /api/v1/task-assignments/{assignmentId}/acknowledge`
- `POST /api/v1/task-assignments/{assignmentId}/start`
- `POST /api/v1/task-assignments/{assignmentId}/progress`
- `POST /api/v1/task-assignments/{assignmentId}/complete`

### Form Contracts

- `F-TASK-PROGRESS`
- `F-TASK-COMPLETE`

### Child Detail/Create/Edit Routes

| Route | Page type | Resource | Required visual layout | Main sections | API |
|---|---|---|---|---|---|
| `/dashboard/field-officer/tugas-saya/[assignmentId]` | `detail-action` | TaskAssignment | 7-column evidence/detail + 5-column sticky action panel | Task header, Source directive/UUK, Target areas, Assignments, Progress, Evidence, Related Baket, Timeline | `GET /api/v1/task-assignments/{assignmentId}`<br>`POST /api/v1/task-assignments/{assignmentId}/mark-read`<br>`POST /api/v1/task-assignments/{assignmentId}/acknowledge`<br>`POST /api/v1/task-assignments/{assignmentId}/start`<br>`POST /api/v1/task-assignments/{assignmentId}/progress`<br>`POST /api/v1/task-assignments/{assignmentId}/complete`<br>+ 1 more |

## 5. Chart Selection Rules

| Question | Recommended chart |
|---|---|
| Perubahan dari waktu ke waktu | Line/area chart |
| Distribusi status | Donut only for ≤6 statuses; otherwise horizontal bar |
| Perbandingan area/unit | Horizontal bar |
| Workflow pipeline | Funnel or horizontal stage bar |
| Current vs previous period | Grouped bar or delta table |
| Geographic intensity | Choropleth or heatmap |
| Hierarchy/cascade | Tree table, not pie chart |
| Entity relationship | Network graph |
| Operational event sequence | Timeline |

Rules:

- Jangan menggunakan pie/donut untuk terlalu banyak kategori.
- Setiap chart memiliki table fallback.
- Tooltip menampilkan nilai, label, periode, dan unit.
- Chart color mengikuti semantic state tetapi tidak menjadi satu-satunya penanda.

## 6. Table Rules

- Identity column selalu berada paling kiri.
- Status, due date, dan action tetap terlihat bila relevan.
- Header sticky untuk table panjang.
- Desktop boleh memakai detail drawer; mobile menggunakan route detail.
- Administrative table memakai page pagination; operational feed memakai cursor.
- Bulk action hanya muncul untuk action yang benar-benar mendukung multi-record.

## 7. Card Rules

- KPI card: satu metric, satu trend, satu konteks.
- Priority card: maksimal tujuh item dan link `Lihat semua`.
- Quick access card: icon, title, satu baris deskripsi.
- Workflow card: sticky, jelas membedakan review dan irreversible action.
- Map popup: ringkas; detail lengkap tetap melalui route.

## 8. Detail Route Rules

Setiap resource penting memiliki canonical detail URL. Popup atau drawer hanya presentation state.

```text
List/map selection
→ [resourceId] route
→ server authorization
→ detail + timeline + traceability
→ availableActions
→ explicit action endpoint
```

Historical version selalu read-only. Draft saja yang mempunyai route `/edit`. Revision membuat version baru, bukan mengubah versi submitted/published/approved.

## 9. Acceptance Criteria

- **AC-VIS-001:** Setiap menu memiliki komposisi grid yang terdokumentasi.
- **AC-VIS-002:** Setiap data utama ditampilkan sebagai card, table, chart, map, form, atau timeline yang sesuai.
- **AC-VIS-003:** Setiap visual terhubung ke API sumber yang telah dipetakan.
- **AC-VIS-004:** Setiap list/map memiliki canonical detail route.
- **AC-VIS-005:** Setiap form memiliki create/edit/revision route sesuai lifecycle resource.
- **AC-VIS-006:** Tabel, chart, KPI, dan map pada satu halaman memakai filter context yang sama.
- **AC-VIS-007:** Semua halaman memiliki loading, empty, error, no-result, and responsive states.
- **AC-VIS-008:** Map menyediakan legend, scope, last refresh, popup, detail path, dan list fallback.