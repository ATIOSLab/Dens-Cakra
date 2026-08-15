# DENS CAKRA - Dokumentasi Seluruh Controller API

> Snapshot source code per 7 Agustus 2026. Dokumen ini dihasilkan dari `apps/be/src/modules/**/*.controller.ts`, DTO, dan return path service yang aktif pada working tree saat audit.

## Ringkasan audit

- **26 file controller**
- **28 class controller**
- **351 endpoint HTTP**
- Method: **GET 167**, **POST 138**, **PATCH 25**, **PUT 19**, **DELETE 2**
- **347 endpoint** memakai `@ApiContract`; 4 route infrastruktur/akses tidak memakainya.
- **299 schema request/query terkait** didokumentasikan pada katalog schema.

Yang dihitung sebagai endpoint adalah setiap handler controller yang memakai decorator `@Get`, `@Post`, `@Put`, `@Patch`, `@Delete`, `@Head`, `@Options`, atau `@All`. Route Better Auth di `/api/auth/*` tidak masuk hitungan karena dipasang langsung sebagai Express handler di `main.ts`, bukan controller NestJS.

## Konvensi URL, request, dan response

- Prefix global adalah `/api` dan URI version default adalah `v1`, sehingga route normal menjadi `/api/v1/...`.
- `StorageTransportController` bersifat version-neutral, sehingga route-nya berada di `/api/storage/...`.
- Validation global memakai `whitelist: true`, `transform: true`, dan `forbidNonWhitelisted: true`. Field body/query di luar schema DTO ditolak.
- Endpoint berlabel `idempotent` membutuhkan header `Idempotency-Key`.
- `CurrentAccessContext`, `CurrentUser`, `Req`, dan `Res` adalah nilai yang disuntikkan server/transport; bukan field JSON body.
- Kolom response `data` di bawah diturunkan dari return controller dan service. Label seperti `record`, `aggregate row`, atau `Service.method result` adalah kontrak struktural source, bukan contoh data live database.

### Success envelope

Kecuali response `204` atau byte stream, `ApiResponseInterceptor` membungkus hasil menjadi:

```json
{
  "success": true,
  "data": {},
  "message": "opsional",
  "meta": { "pagination": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 } },
  "requestId": "request-id",
  "timestamp": "2026-08-07T00:00:00.000Z"
}
```

### Error envelope

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Pesan error",
    "fields": [{ "field": "fieldName", "code": "VALIDATION_CODE", "message": "Pesan validasi" }],
    "details": {}
  },
  "requestId": "request-id",
  "timestamp": "2026-08-07T00:00:00.000Z"
}
```

## Daftar controller

| # | Controller | File | Base route | Endpoint |
|---:|---|---|---|---:|
| 1 | [AccessController](#1-accesscontroller) | `apps/be/src/modules/access/access.controller.ts` | `/api/v1/access` | 2 |
| 2 | [AnalysisController](#2-analysiscontroller) | `apps/be/src/modules/analysis/analysis.controller.ts` | `/api/v1` | 17 |
| 3 | [AreaController](#3-areacontroller) | `apps/be/src/modules/areas/area.controller.ts` | `/api/v1` | 19 |
| 4 | [AuditController](#4-auditcontroller) | `apps/be/src/modules/audit/audit.controller.ts` | `/api/v1` | 4 |
| 5 | [BaketController](#5-baketcontroller) | `apps/be/src/modules/baket/baket.controller.ts` | `/api/v1` | 31 |
| 6 | [DirectiveController](#6-directivecontroller) | `apps/be/src/modules/directives/directive.controller.ts` | `/api/v1` | 16 |
| 7 | [ExecutiveDashboardController](#7-executivedashboardcontroller) | `apps/be/src/modules/executive-dashboard/executive-dashboard.controller.ts` | `/api/v1/dashboard/executive` | 2 |
| 8 | [ExecutivePersonnelController](#8-executivepersonnelcontroller) | `apps/be/src/modules/executive-personnel/executive-personnel.controller.ts` | `/api/v1/executive/personnel` | 3 |
| 9 | [FieldCoordinatorPersonnelController](#9-fieldcoordinatorpersonnelcontroller) | `apps/be/src/modules/executive-personnel/executive-personnel.controller.ts` | `/api/v1/field-coordinator/personnel` | 4 |
| 10 | [RegionalCommanderPersonnelController](#10-regionalcommanderpersonnelcontroller) | `apps/be/src/modules/executive-personnel/executive-personnel.controller.ts` | `/api/v1/regional-commander/personnel` | 4 |
| 11 | [FileController](#11-filecontroller) | `apps/be/src/modules/files/file.controller.ts` | `/api/v1/files` | 5 |
| 12 | [HealthController](#12-healthcontroller) | `apps/be/src/modules/health/health.controller.ts` | `/api/v1/health` | 2 |
| 13 | [IdentityController](#13-identitycontroller) | `apps/be/src/modules/identity/identity.controller.ts` | `/api/v1/me` | 7 |
| 14 | [StorageTransportController](#14-storagetransportcontroller) | `apps/be/src/modules/infrastructure/storage-transport.controller.ts` | `/api/storage` | 2 |
| 15 | [IntegrationController](#15-integrationcontroller) | `apps/be/src/modules/integrations/integration.controller.ts` | `/api/v1` | 14 |
| 16 | [IntelligenceProductsController](#16-intelligenceproductscontroller) | `apps/be/src/modules/intelligence-products/intelligence-products.controller.ts` | `/api/v1` | 88 |
| 17 | [JaringController](#17-jaringcontroller) | `apps/be/src/modules/jaring/jaring.controller.ts` | `/api/v1/jaring` | 32 |
| 18 | [MapMarkersController](#18-mapmarkerscontroller) | `apps/be/src/modules/map-markers/map-markers.controller.ts` | `/api/v1/map` | 1 |
| 19 | [NotificationController](#19-notificationcontroller) | `apps/be/src/modules/notifications/notification.controller.ts` | `/api/v1/notifications` | 4 |
| 20 | [OrganizationController](#20-organizationcontroller) | `apps/be/src/modules/organization/organization.controller.ts` | `/api/v1/organization-units` | 13 |
| 21 | [PositionController](#21-positioncontroller) | `apps/be/src/modules/positions/position.controller.ts` | `/api/v1` | 16 |
| 22 | [RbacController](#22-rbaccontroller) | `apps/be/src/modules/rbac/rbac.controller.ts` | `/api/v1` | 4 |
| 23 | [SecurityController](#23-securitycontroller) | `apps/be/src/modules/system/security.controller.ts` | `/api/v1/system/security` | 2 |
| 24 | [SystemController](#24-systemcontroller) | `apps/be/src/modules/system/system.controller.ts` | `/api/v1` | 5 |
| 25 | [TaskController](#25-taskcontroller) | `apps/be/src/modules/tasks/task.controller.ts` | `/api/v1` | 19 |
| 26 | [UserProfileController](#26-userprofilecontroller) | `apps/be/src/modules/users/user-profile.controller.ts` | `/api/v1/user-profiles` | 12 |
| 27 | [UukController](#27-uukcontroller) | `apps/be/src/modules/uuk/uuk.controller.ts` | `/api/v1` | 10 |
| 28 | [WhatsAppController](#28-whatsappcontroller) | `apps/be/src/modules/whatsapp/whatsapp.controller.ts` | `/api/v1` | 13 |

## Inventaris lengkap endpoint

### 1. AccessController

- File: `apps/be/src/modules/access/access.controller.ts`
- Base route: `/api/v1/access`
- Guard class: tidak ada guard class-level
- Swagger: termasuk dalam pemindaian Swagger.

| No. | Method | Endpoint | Contract dan handler | Akses | Payload request | Payload response |
|---:|---|---|---|---|---|---|
| 1 | **GET** | `/api/v1/access/roles` | tanpa `ApiContract`<br>getRolesCatalog<br>handler: `getRolesCatalog` | `public-internal` | Tidak ada payload request. | `200` `ApiSuccess<T>`<br>data: `{ roles: SYSTEM_ROLE_CATALOG }` |
| 2 | **GET** | `/api/v1/access/me` | tanpa `ApiContract`<br>getMyAccess<br>handler: `getMyAccess` | `authenticated`<br>guards: `SessionGuard`, `DomainAccessGuard` | Tidak ada payload request. | `200` `ApiSuccess<T>`<br>data: `{ user: value; availableRoles: Array<object>; authorizationContext: value }` |

### 2. AnalysisController

- File: `apps/be/src/modules/analysis/analysis.controller.ts`
- Base route: `/api/v1`
- Guard class: `SessionGuard`, `DomainAccessGuard`
- Swagger: termasuk dalam pemindaian Swagger.

| No. | Method | Endpoint | Contract dan handler | Akses | Payload request | Payload response |
|---:|---|---|---|---|---|---|
| 3 | **GET** | `/api/v1/analysis-cases` | `API-ANL-001`<br>Daftar analysis case<br>handler: `list` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [AnalysisQuery](#schema-analysisquery) | `200` `ApiSuccess<T>`<br>data: `{ items: value; pagination: { page: query.page; limit: query.limit; total: value; totalPages: Math.ceil result } }` |
| 4 | **POST** | `/api/v1/analysis-cases` | `API-ANL-002`<br>Buat analysis case<br>handler: `create` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Header: `Idempotency-Key: string`<br>Body: [CreateAnalysisCaseDto](#schema-createanalysiscasedto) | `201` `ApiSuccess<T>`<br>data: `analysisCase record; include: ownerAssignment, createdByAssignment, sources, versions` |
| 5 | **GET** | `/api/v1/analysis-cases/:caseId` | `API-ANL-003`<br>Detail analysis case<br>handler: `get` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `caseId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `analysisCase record; include: ownerAssignment, createdByAssignment, sources, versions` |
| 6 | **POST** | `/api/v1/analysis-cases/:caseId/finalize` | `API-ANL-017`<br>Finalkan analysis dan kunci versi aktif<br>handler: `finalize` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `caseId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [FinalizeAnalysisDto](#schema-finalizeanalysisdto) | `201` `ApiSuccess<T>`<br>data: `analysisCase record; include: ownerAssignment, createdByAssignment, sources, versions` |
| 7 | **POST** | `/api/v1/analysis-cases/:caseId/submit-review` | `API-ANL-016`<br>Kirim analysis ke review manusia<br>handler: `submitReview` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `caseId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [SubmitAnalysisReviewDto](#schema-submitanalysisreviewdto) | `201` `ApiSuccess<T>`<br>data: `analysisCase record; include: ownerAssignment, createdByAssignment, sources, versions` |
| 8 | **PATCH** | `/api/v1/analysis-cases/:caseId` | `API-ANL-004`<br>Edit analysis case<br>handler: `update` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `caseId: string; pipe: ParseUUIDPipe`<br>Body: [UpdateAnalysisCaseDto](#schema-updateanalysiscasedto) | `200` `ApiSuccess<T>`<br>data: `analysisCase record; include: ownerAssignment, createdByAssignment, sources, versions` |
| 9 | **PUT** | `/api/v1/analysis-cases/:caseId/sources` | `API-ANL-005`<br>Ganti sumber verification<br>handler: `replaceSources` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `caseId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ReplaceSourcesDto](#schema-replacesourcesdto) | `200` `ApiSuccess<T>`<br>data: `(await this.caseDetail(caseId)).sources` |
| 10 | **GET** | `/api/v1/analysis-cases/:caseId/versions` | `API-ANL-006`<br>Riwayat analysis versions<br>handler: `versions` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `caseId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `Array<analysisVersion record; include: createdByAssignment, validatedByAssignment, entities, relationships>` |
| 11 | **POST** | `/api/v1/analysis-cases/:caseId/versions` | `API-ANL-007`<br>Buat versi analysis<br>handler: `createVersion` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `caseId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [CreateAnalysisVersionDto](#schema-createanalysisversiondto) | `201` `ApiSuccess<T>`<br>data: `analysisVersion record; include: analysisCase, createdByAssignment, validatedByAssignment, entities, relationships` |
| 12 | **GET** | `/api/v1/analysis-versions/:versionId` | `API-ANL-008`<br>Detail analysis version<br>handler: `getVersion` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `versionId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `analysisVersion record; include: analysisCase, createdByAssignment, validatedByAssignment, entities, relationships` |
| 13 | **PATCH** | `/api/v1/analysis-versions/:versionId` | `API-ANL-009`<br>Edit analysis version<br>handler: `updateVersion` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `versionId: string; pipe: ParseUUIDPipe`<br>Body: [UpdateAnalysisVersionDto](#schema-updateanalysisversiondto) | `200` `ApiSuccess<T>`<br>data: `analysisVersion record; include: analysisCase, createdByAssignment, validatedByAssignment, entities, relationships` |
| 14 | **PUT** | `/api/v1/analysis-versions/:versionId/entities` | `API-ANL-010`<br>Ganti entities<br>handler: `replaceEntities` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `versionId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ReplaceEntitiesDto](#schema-replaceentitiesdto) | `200` `ApiSuccess<T>`<br>data: `(await this.versionDetail(versionId)).entities` |
| 15 | **PUT** | `/api/v1/analysis-versions/:versionId/relationships` | `API-ANL-011`<br>Ganti relationships<br>handler: `replaceRelationships` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `versionId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ReplaceRelationshipsDto](#schema-replacerelationshipsdto) | `200` `ApiSuccess<T>`<br>data: `(await this.versionDetail(versionId)).relationships` |
| 16 | **POST** | `/api/v1/analysis-versions/:versionId/validate` | `API-ANL-012`<br>Validate analysis<br>handler: `validateVersion` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `versionId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ValidateAnalysisDto](#schema-validateanalysisdto) | `201` `ApiSuccess<T>`<br>data: `analysisVersion record; include: analysisCase, createdByAssignment, validatedByAssignment, entities, relationships` |
| 17 | **GET** | `/api/v1/analysis-cases/:caseId/graph` | `API-ANL-013`<br>Graph analysis<br>handler: `graph` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `caseId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `{ caseId: value; versionId: currentVersion?.id ?? null; nodes: currentVersion?.entities ?? []; edges: currentVersion?.relationships ?? [] }` |
| 18 | **GET** | `/api/v1/analysis-cases/:caseId/traceability` | `API-ANL-014`<br>Traceability analysis<br>handler: `traceability` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `caseId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `{ caseId: value; sources: analysisCase.sources; versions: analysisCase.versions; products: Array<productSourceAnalysis record; include: productVersion> }` |
| 19 | **POST** | `/api/v1/analysis-cases/:caseId/archive` | `API-ANL-015`<br>Archive analysis<br>handler: `archive` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `caseId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ArchiveAnalysisDto](#schema-archiveanalysisdto) | `201` `ApiSuccess<T>`<br>data: `analysisCase record; include: ownerAssignment, createdByAssignment, sources, versions` |

### 3. AreaController

- File: `apps/be/src/modules/areas/area.controller.ts`
- Base route: `/api/v1`
- Guard class: `SessionGuard`, `DomainAccessGuard`
- Swagger: termasuk dalam pemindaian Swagger.

| No. | Method | Endpoint | Contract dan handler | Akses | Payload request | Payload response |
|---:|---|---|---|---|---|---|
| 20 | **GET** | `/api/v1/administrative-areas` | `API-AREA-001`<br>Daftar/filter wilayah<br>handler: `list` | `authenticated`<br>roles: `admin_system`, `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [AreaListQueryDto](#schema-arealistquerydto) | `200` `ApiSuccess<T>`<br>data: `r.items` |
| 21 | **POST** | `/api/v1/administrative-areas` | `API-AREA-011`<br>Buat wilayah manual<br>handler: `create` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Header: `Idempotency-Key: string`<br>Body: [CreateAreaDto](#schema-createareadto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 22 | **GET** | `/api/v1/administrative-areas/tree` | `API-AREA-002`<br>Cascading tree wilayah<br>handler: `tree` | `authenticated`<br>roles: `admin_system`, `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [AreaTreeQueryDto](#schema-areatreequerydto) | `200` `ApiSuccess<T>`<br>data: `object` |
| 23 | **GET** | `/api/v1/administrative-areas/scoped-tree` | `API-AREA-016`<br>Cascading tree wilayah sesuai scope pengguna<br>handler: `scopedTree` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Tidak ada payload request. | `200` `ApiSuccess<T>`<br>data: `loader result \| cached \| object` |
| 24 | **GET** | `/api/v1/administrative-areas/search` | `API-AREA-007`<br>Search wilayah berdasarkan nama/kode<br>handler: `search` | `authenticated`<br>roles: `admin_system`, `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [AreaSearchQueryDto](#schema-areasearchquerydto) | `200` `ApiSuccess<T>`<br>data: `Array<administrativeArea record; include: parent>` |
| 25 | **GET** | `/api/v1/administrative-areas/boundaries` | `API-AREA-009`<br>Boundary berdasarkan viewport<br>handler: `viewport` | `authenticated`<br>roles: `admin_system`, `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [ViewportBoundaryQueryDto](#schema-viewportboundaryquerydto) | `200` `ApiSuccess<T>`<br>data: `object` |
| 26 | **POST** | `/api/v1/administrative-areas/resolve-coordinate` | `API-AREA-010`<br>Resolve koordinat ke wilayah paling spesifik<br>handler: `resolve` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard` | Body: [ResolveCoordinateDto](#schema-resolvecoordinatedto) | `201` `ApiSuccess<T>`<br>data: `{ point: object; resolvedArea: object; ancestors: object; method: object; confidence: object; boundaryId: object; warnings: object }` |
| 27 | **GET** | `/api/v1/administrative-areas/:areaId` | `API-AREA-003`<br>Detail wilayah<br>handler: `detail` | `authenticated`<br>roles: `admin_system`, `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `areaId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `administrativeArea record; include: parent, children, boundaries, _count` |
| 28 | **PATCH** | `/api/v1/administrative-areas/:areaId` | `API-AREA-012`<br>Ubah wilayah administratif<br>handler: `update` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `areaId: string; pipe: ParseUUIDPipe`<br>Body: [UpdateAreaDto](#schema-updateareadto) | `200` `ApiSuccess<T>`<br>data: `administrativeArea record; include: parent, children, boundaries, _count` |
| 29 | **GET** | `/api/v1/administrative-areas/:areaId/children` | `API-AREA-004`<br>Anak wilayah untuk cascading filter<br>handler: `children` | `authenticated`<br>roles: `admin_system`, `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `areaId: string; pipe: ParseUUIDPipe`<br>Query: [AreaHierarchyQueryDto](#schema-areahierarchyquerydto) | `200` `ApiSuccess<T>`<br>data: `Array<administrativeArea record>` |
| 30 | **GET** | `/api/v1/administrative-areas/:areaId/ancestors` | `API-AREA-005`<br>Breadcrumb administratif<br>handler: `ancestors` | `authenticated`<br>roles: `admin_system`, `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `areaId: string; pipe: ParseUUIDPipe`<br>Query: [AreaHierarchyQueryDto](#schema-areahierarchyquerydto) | `200` `ApiSuccess<T>`<br>data: `Array<administrativeAreaClosure record>` |
| 31 | **GET** | `/api/v1/administrative-areas/:areaId/descendants` | `API-AREA-006`<br>Turunan wilayah<br>handler: `descendants` | `authenticated`<br>roles: `admin_system`, `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `areaId: string; pipe: ParseUUIDPipe`<br>Query: [AreaHierarchyQueryDto](#schema-areahierarchyquerydto) | `200` `ApiSuccess<T>`<br>data: `Array<administrativeAreaClosure record>` |
| 32 | **GET** | `/api/v1/administrative-areas/:areaId/boundary` | `API-AREA-008`<br>Ambil boundary GeoJSON<br>handler: `boundary` | `authenticated`<br>roles: `admin_system`, `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `areaId: string; pipe: ParseUUIDPipe`<br>Query: [BoundaryQueryDto](#schema-boundaryquerydto) | `200` `ApiSuccess<T>`<br>data: `object` |
| 33 | **POST** | `/api/v1/administrative-areas/:areaId/move` | `API-AREA-013`<br>Pindahkan wilayah<br>handler: `move` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `areaId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [MoveAreaDto](#schema-moveareadto) | `201` `ApiSuccess<T>`<br>data: `administrativeArea record; include: parent, children, boundaries, _count` |
| 34 | **POST** | `/api/v1/administrative-areas/:areaId/boundaries` | `API-AREA-014`<br>Tambah boundary version<br>handler: `createBoundary` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `areaId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [CreateBoundaryDto](#schema-createboundarydto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 35 | **POST** | `/api/v1/administrative-area-boundaries/:boundaryId/activate` | `API-AREA-015`<br>Aktifkan boundary version<br>handler: `activate` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `boundaryId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [BoundaryActionDto](#schema-boundaryactiondto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 36 | **POST** | `/api/v1/administrative-area-boundaries/:boundaryId/invalidate` | `API-AREA-016`<br>Tandai boundary invalid<br>handler: `invalidate` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `boundaryId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [BoundaryActionDto](#schema-boundaryactiondto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 37 | **POST** | `/api/v1/administrative-area-imports` | `API-AREA-017`<br>Import dataset wilayah/boundary<br>handler: `createImport` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Header: `Idempotency-Key: string`<br>Body: [CreateAreaImportDto](#schema-createareaimportdto) | `201` `ApiSuccess<T>`<br>data: `object`<br>Catatan: metadata ApiContract mendokumentasikan status 202. |
| 38 | **GET** | `/api/v1/administrative-area-imports/:jobId` | `API-AREA-018`<br>Status import<br>handler: `importJob` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `jobId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `asyncJob record` |

### 4. AuditController

- File: `apps/be/src/modules/audit/audit.controller.ts`
- Base route: `/api/v1`
- Guard class: `SessionGuard`, `DomainAccessGuard`
- Swagger: termasuk dalam pemindaian Swagger.

| No. | Method | Endpoint | Contract dan handler | Akses | Payload request | Payload response |
|---:|---|---|---|---|---|---|
| 39 | **GET** | `/api/v1/audit-logs` | `API-AUD-001`<br>Panel pencarian dan ringkasan audit forensik<br>handler: `list` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [AuditQueryDto](#schema-auditquerydto) | `200` `ApiSuccess<T>`<br>data: `{ items: Array<object>; pagination: { page: query.page; limit: query.limit; total: value; totalPages: Math.max result }; summary: { total: value; incidents: incidentCount; anomalies: anomalyCount; denied: outcomes.find((entry) => entry.outcome === 'DENIED')?._count._all ?? 0; failures: outcomes.find((entry) => entry.outcome === 'FAILURE')?._count._all ?? 0; averageRiskScore: Math.round result }; facets: { categories: object; severities: object; outcomes: object; actions: object; entityTypes: object; sources: object; devices: object; actors: Array<object> } }` |
| 40 | **GET** | `/api/v1/audit-logs/:auditLogId` | `API-AUD-002`<br>Detail audit event forensik<br>handler: `detail` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `auditLogId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `{ ...item; beforeData: object; afterData: object; metadata: object }` |
| 41 | **GET** | `/api/v1/entities/:entityType/:entityId/audit-trail` | `API-AUD-003`<br>Audit trail resource<br>handler: `trail` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `entityType: string`, `entityId: string`<br>Query: [AuditTrailQueryDto](#schema-audittrailquerydto) | `200` `ApiSuccess<T>`<br>data: `Array<object>` |
| 42 | **POST** | `/api/v1/audit-exports` | `API-AUD-004`<br>Minta export audit<br>handler: `export` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Header: `Idempotency-Key: string`<br>Body: [AuditExportDto](#schema-auditexportdto) | `201` `ApiSuccess<T>`<br>data: `asyncJob record`<br>Catatan: metadata ApiContract mendokumentasikan status 202. |

### 5. BaketController

- File: `apps/be/src/modules/baket/baket.controller.ts`
- Base route: `/api/v1`
- Guard class: `SessionGuard`, `DomainAccessGuard`
- Swagger: termasuk dalam pemindaian Swagger.

| No. | Method | Endpoint | Contract dan handler | Akses | Payload request | Payload response |
|---:|---|---|---|---|---|---|
| 43 | **GET** | `/api/v1/bakets` | `API-BAK-001`<br>Daftar Baket<br>handler: `list` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [BaketQuery](#schema-baketquery) | `200` `ApiSuccess<T>`<br>data: `{ items: object; pagination: object }` |
| 44 | **POST** | `/api/v1/bakets` | `API-BAK-002`<br>Buat Baket manual/from task<br>handler: `create` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Header: `Idempotency-Key: string`<br>Body: [CreateBaketDto](#schema-createbaketdto) | `201` `ApiSuccess<T>`<br>data: `{ ...baket; versions: object }` |
| 45 | **GET** | `/api/v1/bakets/:baketId` | `API-BAK-003`<br>Detail Baket current version<br>handler: `get` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `baketId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `{ ...baket; versions: object }` |
| 46 | **PATCH** | `/api/v1/bakets/:baketId` | `API-BAK-003B`<br>Ubah metadata kategori Baket draft<br>handler: `updateMetadata` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `baketId: string; pipe: ParseUUIDPipe`<br>Body: [UpdateBaketMetadataDto](#schema-updatebaketmetadatadto) | `200` `ApiSuccess<T>`<br>data: `{ ...baket; versions: object }` |
| 47 | **GET** | `/api/v1/bakets/:baketId/versions` | `API-BAK-004`<br>Riwayat versi Baket<br>handler: `versions` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `baketId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `Array<object>` |
| 48 | **POST** | `/api/v1/bakets/:baketId/versions` | `API-BAK-005`<br>Buat versi revisi Baket<br>handler: `createVersion` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `baketId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [CreateBaketRevisionDto](#schema-createbaketrevisiondto) | `201` `ApiSuccess<T>`<br>data: `{ ...version; ...this.versionDisplayFields(version) }` |
| 49 | **GET** | `/api/v1/baket-versions/:versionId` | `API-BAK-006`<br>Detail versi Baket<br>handler: `getVersion` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `versionId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `{ ...version; ...this.versionDisplayFields(version) }` |
| 50 | **PATCH** | `/api/v1/baket-versions/:versionId` | `API-BAK-007`<br>Edit versi draft<br>handler: `updateVersion` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `versionId: string; pipe: ParseUUIDPipe`<br>Body: [BaketPatchDto](#schema-baketpatchdto) | `200` `ApiSuccess<T>`<br>data: `{ ...version; ...this.versionDisplayFields(version) }` |
| 51 | **PUT** | `/api/v1/bakets/:baketId/source-messages` | `API-BAK-008`<br>Ganti/tambah sumber pesan draft<br>handler: `replaceMessages` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `baketId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ReplaceMessagesDto](#schema-replacemessagesdto) | `200` `ApiSuccess<T>`<br>data: `Array<object>` |
| 52 | **PUT** | `/api/v1/bakets/:baketId/attachments` | `API-BAK-009`<br>Ganti lampiran draft<br>handler: `replaceAttachments` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `baketId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ReplaceAttachmentsDto](#schema-replaceattachmentsdto) | `200` `ApiSuccess<T>`<br>data: `(await this.baketQuery.baketVersionDetail(version.id)).attachments` |
| 53 | **POST** | `/api/v1/baket-versions/:versionId/resolve-area` | `API-BAK-010`<br>Resolve ulang area Baket<br>handler: `resolveArea` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `versionId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ResolveAreaDto](#schema-resolveareadto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 54 | **POST** | `/api/v1/baket-versions/:versionId/manual-area-override` | `API-BAK-011`<br>Override area hasil spatial<br>handler: `manualAreaOverride` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `versionId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ManualAreaOverrideDto](#schema-manualareaoverridedto) | `201` `ApiSuccess<T>`<br>data: `{ ...version; ...this.versionDisplayFields(version) }` |
| 55 | **POST** | `/api/v1/baket-versions/:versionId/validate-coverage` | `API-BAK-012`<br>Validasi coverage berlapis<br>handler: `validateCoverage` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `versionId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ValidateCoverageDto](#schema-validatecoveragedto) | `201` `ApiSuccess<T>`<br>data: `{ summaryStatus: result.coverageValidationStatus; checkedAt: result.coverageValidatedAt; checks: result.coverageChecks }` |
| 56 | **POST** | `/api/v1/bakets/:baketId/submit` | `API-BAK-013`<br>Kirim Baket ke OIM<br>handler: `submit` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `baketId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ConfirmationDto](#schema-confirmationdto) | `201` `ApiSuccess<T>`<br>data: `{ ...baket; versions: object }` |
| 57 | **POST** | `/api/v1/bakets/:baketId/resubmit` | `API-BAK-014`<br>Kirim ulang setelah revisi<br>handler: `resubmit` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `baketId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ResubmitDto](#schema-resubmitdto) | `201` `ApiSuccess<T>`<br>data: `{ ...baket; versions: object }` |
| 58 | **GET** | `/api/v1/bakets/:baketId/revision-requests` | `API-BAK-015`<br>Daftar permintaan revisi<br>handler: `revisionRequests` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `baketId: string; pipe: ParseUUIDPipe`<br>Query: [RevisionRequestQuery](#schema-revisionrequestquery) | `200` `ApiSuccess<T>`<br>data: `Array<baketRevisionRequest record; include: requestedAgainstVersion, resolvedByVersion, requestedByAssignment>` |
| 59 | **POST** | `/api/v1/bakets/:baketId/revision-requests` | `API-BAK-016`<br>Minta pengembangan/revisi<br>handler: `createRevisionRequest` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `baketId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [CreateRevisionRequestDto](#schema-createrevisionrequestdto) | `201` `ApiSuccess<T>`<br>data: `baketRevisionRequest record; include: requestedAgainstVersion, resolvedByVersion, requestedByAssignment` |
| 60 | **POST** | `/api/v1/baket-revision-requests/:requestId/resolve` | `API-BAK-017`<br>Tutup permintaan revisi<br>handler: `resolveRevisionRequest` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `requestId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ResolveRevisionRequestDto](#schema-resolverevisionrequestdto) | `201` `ApiSuccess<T>`<br>data: `baketRevisionRequest record; include: requestedAgainstVersion, resolvedByVersion, requestedByAssignment` |
| 61 | **POST** | `/api/v1/baket-revision-requests/:requestId/cancel` | `API-BAK-018`<br>Batalkan permintaan revisi<br>handler: `cancelRevisionRequest` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `requestId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [CancelRevisionRequestDto](#schema-cancelrevisionrequestdto) | `201` `ApiSuccess<T>`<br>data: `baketRevisionRequest record; include: requestedAgainstVersion, resolvedByVersion, requestedByAssignment` |
| 62 | **GET** | `/api/v1/bakets/:baketId/timeline` | `API-BAK-019`<br>Timeline Baket<br>handler: `timeline` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `baketId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `{ baketId: value; events: object }` |
| 63 | **GET** | `/api/v1/bakets/:baketId/traceability` | `API-BAK-020`<br>Traceability sumber-ke-produk<br>handler: `traceability` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `baketId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `{ baketId: value; versionIds: object; sourceMessages: object; verifications: object; analyses: object; products: object }` |
| 64 | **GET** | `/api/v1/verifications` | `API-VER-001`<br>Daftar verification<br>handler: `listVerifications` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [VerificationQuery](#schema-verificationquery) | `200` `ApiSuccess<T>`<br>data: `Array<baketVerification record; include: baketVersion, verifiedByAssignment>` |
| 65 | **POST** | `/api/v1/baket-versions/:versionId/verification` | `API-VER-002`<br>Buat canonical verification<br>handler: `createVerification` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `versionId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [CreateVerificationDto](#schema-createverificationdto) | `201` `ApiSuccess<T>`<br>data: `result.detail` |
| 66 | **GET** | `/api/v1/verifications/:verificationId` | `API-VER-003`<br>Detail verification<br>handler: `getVerification` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `verificationId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `object` |
| 67 | **POST** | `/api/v1/verifications/:verificationId/start` | `API-VER-004`<br>Mulai verification<br>handler: `startVerification` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `verificationId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string` | `201` `ApiSuccess<T>`<br>data: `object` |
| 68 | **PATCH** | `/api/v1/verifications/:verificationId` | `API-VER-005`<br>Edit draft/in-progress verification<br>handler: `updateVerification` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `verificationId: string; pipe: ParseUUIDPipe`<br>Body: [UpdateVerificationDto](#schema-updateverificationdto) | `200` `ApiSuccess<T>`<br>data: `object` |
| 69 | **PUT** | `/api/v1/verifications/:verificationId/cross-references` | `API-VER-007`<br>Ganti cross references<br>handler: `replaceCrossReferences` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `verificationId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ReplaceCrossReferencesDto](#schema-replacecrossreferencesdto) | `200` `ApiSuccess<T>`<br>data: `object` |
| 70 | **POST** | `/api/v1/verifications/:verificationId/complete` | `API-VER-008`<br>Selesaikan verification valid<br>handler: `completeVerification` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `verificationId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [CompleteVerificationDto](#schema-completeverificationdto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 71 | **POST** | `/api/v1/verifications/:verificationId/needs-development` | `API-VER-009`<br>Kembalikan untuk pengembangan<br>handler: `needsDevelopment` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `verificationId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [NeedsDevelopmentDto](#schema-needsdevelopmentdto) | `201` `ApiSuccess<T>`<br>data: `result.detail` |
| 72 | **POST** | `/api/v1/verifications/:verificationId/reject` | `API-VER-010`<br>Tolak Baket<br>handler: `rejectVerification` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `verificationId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [RejectVerificationDto](#schema-rejectverificationdto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 73 | **GET** | `/api/v1/verifications/:verificationId/score` | `API-VER-011`<br>Ringkasan Neraca Penilaian<br>handler: `verificationScore` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `verificationId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `{ verificationId: value; sourceReliability: object; informationCredibility: object; matrixLabel: object; interpretation: object }` |

### 6. DirectiveController

- File: `apps/be/src/modules/directives/directive.controller.ts`
- Base route: `/api/v1`
- Guard class: `SessionGuard`, `DomainAccessGuard`
- Swagger: termasuk dalam pemindaian Swagger.

| No. | Method | Endpoint | Contract dan handler | Akses | Payload request | Payload response |
|---:|---|---|---|---|---|---|
| 74 | **POST** | `/api/v1/directives/ai-recommendation` | `API-DIR-AI-001`<br>Generate rekomendasi AI untuk Direktif Strategis<br>handler: `generateAiRecommendation` | `authenticated`<br>roles: `executive`<br>guards: `SessionGuard`, `DomainAccessGuard` | Body: [GenerateDirectiveAiDto](#schema-generatedirectiveaidto) | `201` `ApiSuccess<T>`<br>data: `{ sections: object } \| { title: object; commandNarrative: object; sections: object } \| { title: object; commandNarrative: object; sections: object }` |
| 75 | **GET** | `/api/v1/directives` | `API-DIR-001`<br>Daftar direktif<br>handler: `list` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [DirectiveQuery](#schema-directivequery) | `200` `ApiSuccess<T>`<br>data: `Array<directive record> \| directives.slice result \| object \| { items: directives.slice result \| object; pagination: { page: query.page; limit: query.limit; total: value; totalPages: Math.max result }; summary: { total: value; published: (statusCount.get(DirectiveStatus.PUBLISHED) ?? 0) + (statusCount.get(DirectiveStatus.DISTRIBUTED) ?? 0) + (statusCount.get(DirectiveStatus.COMPLETED) ?? 0); draft: statusCount.get(DirectiveStatus.DRAFT) ?? 0 } }` |
| 76 | **POST** | `/api/v1/directives` | `API-DIR-002`<br>Buat directive dan versi awal<br>handler: `create` | `authenticated`<br>roles: `executive`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Header: `Idempotency-Key: string`<br>Body: [CreateDirectiveDto](#schema-createdirectivedto) | `201` `ApiSuccess<T>`<br>data: `directive record; include: ownerAssignment, createdByAssignment, versions` |
| 77 | **GET** | `/api/v1/directives/:directiveId` | `API-DIR-003`<br>Detail directive current version<br>handler: `get` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `directiveId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `directive record; include: ownerAssignment, createdByAssignment, versions` |
| 78 | **GET** | `/api/v1/directives/:directiveId/versions` | `API-DIR-004`<br>Riwayat versi directive<br>handler: `versions` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `directiveId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `Array<directiveVersion record; include: createdByAssignment, targetAreas, recipients>` |
| 79 | **POST** | `/api/v1/directives/:directiveId/versions` | `API-DIR-005`<br>Buat versi revisi<br>handler: `createVersion` | `authenticated`<br>roles: `executive`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `directiveId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [CreateDirectiveRevisionDto](#schema-createdirectiverevisiondto) | `201` `ApiSuccess<T>`<br>data: `directiveVersion record; include: directive, createdByAssignment, targetAreas, recipients, tasks, uukStrs` |
| 80 | **GET** | `/api/v1/directive-versions/:versionId` | `API-DIR-006`<br>Detail versi directive<br>handler: `getVersion` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `versionId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `directiveVersion record; include: directive, createdByAssignment, targetAreas, recipients, tasks, uukStrs` |
| 81 | **PATCH** | `/api/v1/directive-versions/:versionId` | `API-DIR-007`<br>Edit versi draft<br>handler: `updateVersion` | `authenticated`<br>roles: `executive`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `versionId: string; pipe: ParseUUIDPipe`<br>Body: [UpdateDirectiveVersionDto](#schema-updatedirectiveversiondto) | `200` `ApiSuccess<T>`<br>data: `directiveVersion record; include: directive, createdByAssignment, targetAreas, recipients, tasks, uukStrs` |
| 82 | **PUT** | `/api/v1/directive-versions/:versionId/target-areas` | `API-DIR-008`<br>Ganti target area draft<br>handler: `replaceAreas` | `authenticated`<br>roles: `executive`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `versionId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ReplaceAreasDto](#schema-replaceareasdto) | `200` `ApiSuccess<T>`<br>data: `(await this.versionDetail(versionId, context)).targetAreas` |
| 83 | **PUT** | `/api/v1/directive-versions/:versionId/recipients` | `API-DIR-009`<br>Ganti penerima draft<br>handler: `replaceRecipients` | `authenticated`<br>roles: `executive`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `versionId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ReplaceRecipientsDto](#schema-replacerecipientsdto) | `200` `ApiSuccess<T>`<br>data: `(await this.versionDetail(versionId, context)).recipients` |
| 84 | **POST** | `/api/v1/directive-versions/:versionId/publish` | `API-DIR-010`<br>Publish directive<br>handler: `publish` | `authenticated`<br>roles: `executive`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `versionId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [PublishDirectiveDto](#schema-publishdirectivedto) | `201` `ApiSuccess<T>`<br>data: `directive record; include: ownerAssignment, createdByAssignment, versions` |
| 85 | **POST** | `/api/v1/directive-versions/:versionId/distribute` | `API-DIR-011`<br>Distribusikan directive<br>handler: `distribute` | `authenticated`<br>roles: `executive`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `versionId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [DistributeDirectiveDto](#schema-distributedirectivedto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 86 | **POST** | `/api/v1/directive-versions/:versionId/mark-read` | `API-DIR-012A`<br>Tandai directive dibaca penerima<br>handler: `markRead` | `authenticated`<br>roles: `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `versionId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string` | `201` `ApiSuccess<T>`<br>data: `directiveRecipient record; include: targetAssignment` |
| 87 | **POST** | `/api/v1/directive-recipients/:recipientId/acknowledge` | `API-DIR-012`<br>Acknowledgement penerima<br>handler: `acknowledge` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `recipientId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [OptionalNoteDto](#schema-optionalnotedto) | `201` `ApiSuccess<T>`<br>data: `directiveRecipient record; include: targetAssignment` |
| 88 | **GET** | `/api/v1/directives/:directiveId/tracking` | `API-DIR-013`<br>Tracking pelaksanaan direktif<br>handler: `tracking` | `authenticated`<br>roles: `executive`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `directiveId: string; pipe: ParseUUIDPipe`<br>Query: areaId: string, unitId: string, includeTasks: unknown | `200` `ApiSuccess<T>`<br>data: `{ directiveId: value; versionId: version.id; recipientSummary: { total: version.recipients.length; acknowledged: version.recipients.filter( (recipient) => recipient.status === RecipientStatus.ACKNOWLEDGED, ).length; read: version.recipients.filter( (recipient) => recipient.status === RecipientStatus.READ, ).length; delivered: version.recipients.filter( (recipient) => recipient.status === RecipientStatus.DELIVERED, ).length; failed: version.recipients.filter( (recipient) => recipient.status === RecipientStatus.FAILED, ).length }; taskSummary: { total: mappedTasks.length; assigned: mappedTasks.filter( (task) => task.status === TaskStatus.ASSIGNED, ).length; inProgress: mappedTasks.filter( (task) => task.status === TaskStatus.IN_PROGRESS, ).length; completed: mappedTasks.filter( (task) => task.status === TaskStatus.COMPLETED, ).length; cancelled: mappedTasks.filter( (task) => task.status === TaskStatus.CANCELLED, ).length }; stageSummary: { regional: { totalRecipients: object; readCount: object; acknowledgedCount: object; forwardedCount: object; failedCount: object }; oim: { totalForwardedRegionalStr: object; readCount: object; taskCount: object; forwardedToFieldCoordinatorCount: object }; fieldCoordinator: { totalAssignments: object; readCount: object; acknowledgedCount: object; distributedCount: object }; korwil: summarizeAssignments result }; baketCount: number; targetAreas: Array<object>; routingHierarchy: Array<object>; regionalChains: Array<object>; tasks: object \| undefined; unlinkedTasks: object \| undefined }` |
| 89 | **POST** | `/api/v1/directives/:directiveId/cancel` | `API-DIR-014`<br>Batalkan directive<br>handler: `cancel` | `authenticated`<br>roles: `executive`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `directiveId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [RequiredReasonDto](#schema-requiredreasondto) | `201` `ApiSuccess<T>`<br>data: `object \| directive record; include: ownerAssignment, createdByAssignment, versions` |

### 7. ExecutiveDashboardController

- File: `apps/be/src/modules/executive-dashboard/executive-dashboard.controller.ts`
- Base route: `/api/v1/dashboard/executive`
- Guard class: `SessionGuard`, `DomainAccessGuard`
- Swagger: termasuk dalam pemindaian Swagger.

| No. | Method | Endpoint | Contract dan handler | Akses | Payload request | Payload response |
|---:|---|---|---|---|---|---|
| 90 | **GET** | `/api/v1/dashboard/executive` | `API-EXECUTIVE-DASHBOARD-001`<br>Ringkasan eksekutif dan operasional berbasis scope<br>handler: `dashboard` | `authenticated`<br>roles: `...DASHBOARD_ROLES`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [ExecutiveDashboardQueryDto](#schema-executivedashboardquerydto) | `200` `ApiSuccess<T>`<br>data: `loader result \| cached \| object` |
| 91 | **GET** | `/api/v1/dashboard/executive/filters` | `API-EXECUTIVE-DASHBOARD-002`<br>Pilihan filter dashboard sesuai scope pengguna<br>handler: `filters` | `authenticated`<br>roles: `...DASHBOARD_ROLES`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [ExecutiveDashboardFilterQueryDto](#schema-executivedashboardfilterquerydto) | `200` `ApiSuccess<T>`<br>data: `{ scope: object; categories: value; productTypes: value; areaTree: value; fieldOfficers: Array<object>; jaring: { items: Array<object>; total: totalJaring; truncated: totalJaring > jaring.length }; options: { urgency: Array<object>; reportStatus: Object.values result; completeness: Array<object>; verificationStatus: Array<object>; workflowStatus: Object.values result; validationStatus: Object.values result; coordinateSource: Array<object>; locationSuitability: Array<object>; source: Array<object> }; unavailableFilters: Array<{ key: object; label: object; reason: object }> }` |

### 8. ExecutivePersonnelController

- File: `apps/be/src/modules/executive-personnel/executive-personnel.controller.ts`
- Base route: `/api/v1/executive/personnel`
- Guard class: `SessionGuard`, `DomainAccessGuard`
- Swagger: termasuk dalam pemindaian Swagger.

| No. | Method | Endpoint | Contract dan handler | Akses | Payload request | Payload response |
|---:|---|---|---|---|---|---|
| 92 | **GET** | `/api/v1/executive/personnel` | `API-EXECUTIVE-PERSONNEL-001`<br>Daftar personel nasional untuk role eksekutif<br>handler: `list` | `authenticated`<br>roles: `executive`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [ExecutivePersonnelListQuery](#schema-executivepersonnellistquery) | `200` `ApiSuccess<T>`<br>data: `result.items` |
| 93 | **GET** | `/api/v1/executive/personnel/map` | `API-EXECUTIVE-PERSONNEL-002`<br>Peta nasional lokasi petugas organik<br>handler: `map` | `authenticated`<br>roles: `executive`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [ExecutivePersonnelMapQuery](#schema-executivepersonnelmapquery) | `200` `ApiSuccess<T>`<br>data: `Array<object>` |
| 94 | **GET** | `/api/v1/executive/personnel/:userProfileId` | `API-EXECUTIVE-PERSONNEL-003`<br>Detail personel untuk dashboard eksekutif<br>handler: `detail` | `authenticated`<br>roles: `executive`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `userProfileId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `{ profile: { id: profile.id; username: profile.username; fullName: profile.fullName ?? profile.authUser.name; email: profile.authUser.email; phone: profile.phone; status: profile.status; isActive: profile.isActive; lastLoginAt: profile.lastLoginAt; operationalLockedAt: profile.operationalLockedAt; operationalLockReason: profile.operationalLockReason; authRole: profile.authUser.role; authBanned: profile.authUser.banned; authBanReason: profile.authUser.banReason; authBanExpires: profile.authUser.banExpires; createdAt: profile.createdAt; updatedAt: profile.updatedAt }; currentAssignment: object \| null; assignments: Array<object>; activityLogs: Array<object>; reports: Array<object>; jaring: value; summary: { jaringCount: jaring.length; baketCount: value; assignmentCount: profile.operationalAssignments.length; activeAreaCount: currentAssignment?.areaScopes.filter((scope) => !scope.validUntil) .length ?? 0 }; kpi: { status: string; metrics: Array<unknown>; note: string } }` |

### 9. FieldCoordinatorPersonnelController

- File: `apps/be/src/modules/executive-personnel/executive-personnel.controller.ts`
- Base route: `/api/v1/field-coordinator/personnel`
- Guard class: `SessionGuard`, `DomainAccessGuard`
- Swagger: termasuk dalam pemindaian Swagger.

| No. | Method | Endpoint | Contract dan handler | Akses | Payload request | Payload response |
|---:|---|---|---|---|---|---|
| 95 | **GET** | `/api/v1/field-coordinator/personnel` | `API-FIELD-COORDINATOR-PERSONNEL-001`<br>Daftar petugas wilayah dalam hierarki Koordinator Wilayah (Korwil)<br>handler: `list` | `authenticated`<br>roles: `field_coordinator`, `regional_commander`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [ExecutivePersonnelListQuery](#schema-executivepersonnellistquery) | `200` `ApiSuccess<T>`<br>data: `result.items` |
| 96 | **GET** | `/api/v1/field-coordinator/personnel/map` | `API-FIELD-COORDINATOR-PERSONNEL-002`<br>Peta petugas wilayah dalam hierarki Koordinator Wilayah (Korwil)<br>handler: `map` | `authenticated`<br>roles: `field_coordinator`, `regional_commander`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [ExecutivePersonnelMapQuery](#schema-executivepersonnelmapquery) | `200` `ApiSuccess<T>`<br>data: `{ type: object; features: object; meta: object }` |
| 97 | **GET** | `/api/v1/field-coordinator/personnel/area-filters` | `API-FIELD-COORDINATOR-PERSONNEL-003`<br>Filter wilayah bertingkat sesuai scope Koordinator Wilayah (Korwil)<br>handler: `areaFilters` | `authenticated`<br>roles: `field_coordinator`, `regional_commander`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [FieldCoordinatorPersonnelAreaFilterQuery](#schema-fieldcoordinatorpersonnelareafilterquery) | `200` `ApiSuccess<T>`<br>data: `{ provinces: Array<unknown>; regencies: value; districts: value }` |
| 98 | **GET** | `/api/v1/field-coordinator/personnel/:assignmentId` | `API-FIELD-COORDINATOR-PERSONNEL-004`<br>Detail petugas wilayah dalam hierarki Koordinator Wilayah (Korwil)<br>handler: `detail` | `authenticated`<br>roles: `field_coordinator`, `regional_commander`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `assignmentId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `{ profile: object; currentAssignment: object; assignments: object; activityLogs: object; reports: object; jaring: value; summary: object; kpi: object }` |

### 10. RegionalCommanderPersonnelController

- File: `apps/be/src/modules/executive-personnel/executive-personnel.controller.ts`
- Base route: `/api/v1/regional-commander/personnel`
- Guard class: `SessionGuard`, `DomainAccessGuard`
- Swagger: termasuk dalam pemindaian Swagger.

| No. | Method | Endpoint | Contract dan handler | Akses | Payload request | Payload response |
|---:|---|---|---|---|---|---|
| 99 | **GET** | `/api/v1/regional-commander/personnel` | `API-REGIONAL-COMMANDER-PERSONNEL-001`<br>Daftar petugas wilayah dalam hierarki Kepala BIN Daerah (Kabinda)<br>handler: `list` | `authenticated`<br>roles: `regional_commander`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [ExecutivePersonnelListQuery](#schema-executivepersonnellistquery) | `200` `ApiSuccess<T>`<br>data: `result.items` |
| 100 | **GET** | `/api/v1/regional-commander/personnel/map` | `API-REGIONAL-COMMANDER-PERSONNEL-002`<br>Peta petugas wilayah dalam hierarki Kepala BIN Daerah (Kabinda)<br>handler: `map` | `authenticated`<br>roles: `regional_commander`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [ExecutivePersonnelMapQuery](#schema-executivepersonnelmapquery) | `200` `ApiSuccess<T>`<br>data: `object` |
| 101 | **GET** | `/api/v1/regional-commander/personnel/area-filters` | `API-REGIONAL-COMMANDER-PERSONNEL-003`<br>Filter wilayah bertingkat sesuai scope Kepala BIN Daerah (Kabinda)<br>handler: `areaFilters` | `authenticated`<br>roles: `regional_commander`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [FieldCoordinatorPersonnelAreaFilterQuery](#schema-fieldcoordinatorpersonnelareafilterquery) | `200` `ApiSuccess<T>`<br>data: `{ provinces: object; regencies: value; districts: value }` |
| 102 | **GET** | `/api/v1/regional-commander/personnel/:assignmentId` | `API-REGIONAL-COMMANDER-PERSONNEL-004`<br>Detail petugas wilayah dalam hierarki Kepala BIN Daerah (Kabinda)<br>handler: `detail` | `authenticated`<br>roles: `regional_commander`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `assignmentId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `{ profile: object; currentAssignment: object; assignments: object; activityLogs: object; reports: object; jaring: value; summary: object; kpi: object }` |

### 11. FileController

- File: `apps/be/src/modules/files/file.controller.ts`
- Base route: `/api/v1/files`
- Guard class: `SessionGuard`, `DomainAccessGuard`
- Swagger: termasuk dalam pemindaian Swagger.

| No. | Method | Endpoint | Contract dan handler | Akses | Payload request | Payload response |
|---:|---|---|---|---|---|---|
| 103 | **POST** | `/api/v1/files/presign` | `API-FILE-001`<br>Minta signed upload URL<br>handler: `presign` | `authenticated`<br>roles: `admin_system`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Header: `Idempotency-Key: string`<br>Body: [PresignFileDto](#schema-presignfiledto) | `201` `ApiSuccess<T>`<br>data: `{ uploadToken: object; storageKey: object; uploadUrl: string; method: string; headers: { Content-Type: string }; expiresAt: Date }` |
| 104 | **POST** | `/api/v1/files/complete` | `API-FILE-002`<br>Konfirmasi upload selesai<br>handler: `complete` | `authenticated`<br>roles: `admin_system`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Header: `Idempotency-Key: string`<br>Body: [CompleteFileDto](#schema-completefiledto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 105 | **GET** | `/api/v1/files/:fileId` | `API-FILE-003`<br>Metadata file<br>handler: `metadata` | `authenticated`<br>roles: `admin_system`, `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `fileId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `fileAsset record; select: id, originalName, mimeType, fileType, sizeBytes, checksumSha256, lifecycleStatus, scanResult, scannedAt, quarantineReason, retentionUntil, createdAt` |
| 106 | **GET** | `/api/v1/files/:fileId/access-url` | `API-FILE-004`<br>Signed download/view URL<br>handler: `access` | `authenticated`<br>roles: `admin_system`, `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `fileId: string; pipe: ParseUUIDPipe`<br>Query: [FileAccessQueryDto](#schema-fileaccessquerydto) | `200` `ApiSuccess<T>`<br>data: `{ url: string; expiresAt: Date; disposition: value; originalName: file.originalName; mimeType: file.mimeType; sizeBytes: file.sizeBytes.toString result; checksumSha256: file.checksumSha256 }` |
| 107 | **DELETE** | `/api/v1/files/:fileId` | `API-FILE-005`<br>Soft delete file tidak terpakai<br>handler: `remove` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `fileId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string` | `204` tanpa response body. |

### 12. HealthController

- File: `apps/be/src/modules/health/health.controller.ts`
- Base route: `/api/v1/health`
- Guard class: tidak ada guard class-level
- Swagger: termasuk dalam pemindaian Swagger.

| No. | Method | Endpoint | Contract dan handler | Akses | Payload request | Payload response |
|---:|---|---|---|---|---|---|
| 108 | **GET** | `/api/v1/health/live` | `API-SYS-005`<br>Liveness probe<br>handler: `getLiveness` | `public-internal` | Tidak ada payload request. | `200` `ApiSuccess<T>`<br>data: `{ status: string; service: string }` |
| 109 | **GET** | `/api/v1/health/ready` | `API-SYS-006`<br>Readiness probe<br>handler: `getReadiness` | `public-internal` | Tidak ada payload request. | `200` `ApiSuccess<T>`<br>data: `{ status: string; checks: { } }` |

### 13. IdentityController

- File: `apps/be/src/modules/identity/identity.controller.ts`
- Base route: `/api/v1/me`
- Guard class: `SessionGuard`, `DomainAccessGuard`
- Swagger: termasuk dalam pemindaian Swagger.

| No. | Method | Endpoint | Contract dan handler | Akses | Payload request | Payload response |
|---:|---|---|---|---|---|---|
| 110 | **GET** | `/api/v1/me` | `API-CTX-001`<br>Ambil identitas dan profil pengguna aktif<br>handler: `getMe` | `authenticated`<br>guards: `SessionGuard`, `DomainAccessGuard` | Tidak ada payload request. | `200` `ApiSuccess<T>`<br>data: `{ user: { id: user.id; name: user.name; email: user.email; emailVerified: user.emailVerified; image: user.image; authRole: user.role }; profile: user.profile; primaryAssignment: { id: context.primaryAssignmentId; positionId: context.positionId; positionCode: context.positionCode; positionTitle: context.positionTitle }; role: context.roleCode; unit: { id: context.organizationUnitId; name: context.organizationUnitName; type: context.organizationUnitType }; branch: context.commandRouteType; primaryAreas: Array<object> }` |
| 111 | **GET** | `/api/v1/me/authorization-context` | `API-CTX-002`<br>Ambil konteks authorization efektif<br>handler: `getAuthorizationContext` | `authenticated`<br>guards: `SessionGuard`, `DomainAccessGuard` | Tidak ada payload request. | `200` `ApiSuccess<T>`<br>data: `context` |
| 112 | **GET** | `/api/v1/me/area-scopes` | `API-CTX-003`<br>Ambil wilayah yang dapat diakses pengguna<br>handler: `getAreaScopes` | `authenticated`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [AreaScopeQueryDto](#schema-areascopequerydto) | `200` `ApiSuccess<T>`<br>data: `Array<object> \| Array<unknown> \| this.prisma.$queryRaw result` |
| 113 | **POST** | `/api/v1/me/revoke-other-sessions` | `API-CTX-004`<br>Cabut semua session lain<br>handler: `revokeOtherSessions` | `authenticated`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Header: `Idempotency-Key: string`<br>Body: [RevokeOtherSessionsDto](#schema-revokeothersessionsdto)<br>Transport: `request object (AuthenticatedRequest)` | `201` `ApiSuccess<T>`<br>data: `{ revoked: boolean }` |
| 114 | **POST** | `/api/v1/me/session-network` | `API-CTX-005`<br>Simpan public IP dan kota untuk sesi login aktif<br>handler: `updateSessionNetwork` | `authenticated`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Header: `Idempotency-Key: string`<br>Body: [UpdateSessionNetworkDto](#schema-updatesessionnetworkdto)<br>Transport: `request object (AuthenticatedRequest)` | `201` `ApiSuccess<T>`<br>data: `{ ipAddress: normalizeIpAddress result; locationLabel: location.label; city: location.city }` |
| 115 | **POST** | `/api/v1/me/session-heartbeat` | `API-CTX-006`<br>Perbarui aktivitas sesi dashboard<br>handler: `recordSessionHeartbeat` | `authenticated`<br>guards: `SessionGuard`, `DomainAccessGuard` | Transport: `request object (AuthenticatedRequest)` | `201` `ApiSuccess<T>`<br>data: `{ lastSeenAt: Date }` |
| 116 | **POST** | `/api/v1/me/session-inactive` | `API-CTX-007`<br>Tandai sesi dashboard tidak aktif saat tab ditutup<br>handler: `markSessionInactive` | `authenticated`<br>guards: `SessionGuard`, `DomainAccessGuard` | Transport: `request object (AuthenticatedRequest)` | `201` `ApiSuccess<T>`<br>data: `{ inactive: boolean }` |

### 14. StorageTransportController

- File: `apps/be/src/modules/infrastructure/storage-transport.controller.ts`
- Base route: `/api/storage`
- Guard class: tidak ada guard class-level
- Swagger: dikecualikan melalui `@ApiExcludeController`, tetapi tetap didokumentasikan karena merupakan route controller aktif.

| No. | Method | Endpoint | Contract dan handler | Akses | Payload request | Payload response |
|---:|---|---|---|---|---|---|
| 117 | **PUT** | `/api/storage/uploads/:token` | tanpa `ApiContract`<br>upload<br>handler: `upload` | `public-internal` | Path: `token: string`<br>Body: Buffer | `204` tanpa response body. |
| 118 | **GET** | `/api/storage/files/:token` | tanpa `ApiContract`<br>download<br>handler: `download` | `public-internal` | Path: `token: string`<br>Transport: `request object (Request)`, `response object (Response)` | `200` raw byte stream; dapat menjadi `206` untuk range dan `416` untuk range tidak valid. |

### 15. IntegrationController

- File: `apps/be/src/modules/integrations/integration.controller.ts`
- Base route: `/api/v1`
- Guard class: `SessionGuard`, `DomainAccessGuard`
- Swagger: termasuk dalam pemindaian Swagger.

| No. | Method | Endpoint | Contract dan handler | Akses | Payload request | Payload response |
|---:|---|---|---|---|---|---|
| 119 | **GET** | `/api/v1/integration-channels` | `API-INT-001`<br>Daftar channel integrasi<br>handler: `list` | `authenticated`<br>roles: `admin_system`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [IntegrationQuery](#schema-integrationquery) | `200` `ApiSuccess<T>`<br>data: `Array<object>` |
| 120 | **GET** | `/api/v1/integration-channels/whatsapp-control` | `API-INT-011`<br>Ringkasan kontrol WhatsApp<br>handler: `whatsappControl` | `authenticated`<br>roles: `admin_system`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Tidak ada payload request. | `200` `ApiSuccess<T>`<br>data: `Array<object>` |
| 121 | **POST** | `/api/v1/integration-channels` | `API-INT-002`<br>Buat channel<br>handler: `create` | `authenticated`<br>roles: `admin_system`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Header: `Idempotency-Key: string`<br>Body: [CreateIntegrationDto](#schema-createintegrationdto) | `201` `ApiSuccess<T>`<br>data: `{ ...channel; config: object }` |
| 122 | **GET** | `/api/v1/integration-channels/:channelId` | `API-INT-003`<br>Detail channel<br>handler: `detail` | `authenticated`<br>roles: `admin_system`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `channelId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `{ ...channel; config: object }` |
| 123 | **PATCH** | `/api/v1/integration-channels/:channelId` | `API-INT-004`<br>Ubah channel<br>handler: `update` | `authenticated`<br>roles: `admin_system`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `channelId: string; pipe: ParseUUIDPipe`<br>Body: [UpdateIntegrationDto](#schema-updateintegrationdto) | `200` `ApiSuccess<T>`<br>data: `{ ...channel; config: object }` |
| 124 | **PATCH** | `/api/v1/integration-channels/whatsapp-control/:channelId` | `API-INT-012`<br>Ubah bot dan nomor pengirim WhatsApp<br>handler: `updateWhatsappControl` | `authenticated`<br>roles: `admin_system`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `channelId: string; pipe: ParseUUIDPipe`<br>Body: [UpdateWhatsappControlDto](#schema-updatewhatsappcontroldto) | `200` `ApiSuccess<T>`<br>data: `object` |
| 125 | **POST** | `/api/v1/integration-channels/whatsapp-control/:channelId/request-qr` | `API-INT-013`<br>Minta QR atau pairing code WhatsApp baru<br>handler: `requestWhatsappQr` | `authenticated`<br>roles: `admin_system`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `channelId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string` | `201` `ApiSuccess<T>`<br>data: `object` |
| 126 | **POST** | `/api/v1/integration-channels/:channelId/activate` | `API-INT-005`<br>Aktifkan channel<br>handler: `activate` | `authenticated`<br>roles: `admin_system`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `channelId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ReasonDto](#schema-reasondto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 127 | **POST** | `/api/v1/integration-channels/:channelId/deactivate` | `API-INT-006`<br>Nonaktifkan channel<br>handler: `deactivate` | `authenticated`<br>roles: `admin_system`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `channelId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ReasonDto](#schema-reasondto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 128 | **POST** | `/api/v1/integration-channels/:channelId/test` | `API-INT-007`<br>Tes koneksi<br>handler: `test` | `authenticated`<br>roles: `admin_system`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `channelId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [TestIntegrationDto](#schema-testintegrationdto) | `201` `ApiSuccess<T>`<br>data: `object \| { channelId: channel.id; mode: body.mode; healthy: channel.status === IntegrationStatus.ACTIVE; testedAt: Date }` |
| 129 | **GET** | `/api/v1/integration-channels/:channelId/webhook-events` | `API-INT-008`<br>Daftar webhook event<br>handler: `events` | `authenticated`<br>roles: `admin_system`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `channelId: string; pipe: ParseUUIDPipe`<br>Query: [WebhookQuery](#schema-webhookquery) | `200` `ApiSuccess<T>`<br>data: `Array<integrationWebhookEvent record; select: id, channelId, externalEventId, eventType, receivedAt, processedAt, success, errorMessage>` |
| 130 | **GET** | `/api/v1/webhook-events/:eventId` | `API-INT-009`<br>Detail webhook event<br>handler: `event` | `authenticated`<br>roles: `admin_system`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `eventId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `integrationWebhookEvent record; select: id, channelId, externalEventId, eventType, receivedAt, processedAt, success, errorMessage` |
| 131 | **POST** | `/api/v1/webhook-events/:eventId/retry` | `API-INT-010`<br>Retry event gagal<br>handler: `retry` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `eventId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ReasonDto](#schema-reasondto) | `201` `ApiSuccess<T>`<br>data: `asyncJob record`<br>Catatan: metadata ApiContract mendokumentasikan status 202. |
| 132 | **DELETE** | `/api/v1/integration-channels/:channelId` | `API-INT-014`<br>Hapus channel<br>handler: `remove` | `authenticated`<br>roles: `admin_system`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `channelId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `{ success: boolean; message: string }` |

### 16. IntelligenceProductsController

- File: `apps/be/src/modules/intelligence-products/intelligence-products.controller.ts`
- Base route: `/api/v1`
- Guard class: `SessionGuard`, `DomainAccessGuard`
- Swagger: termasuk dalam pemindaian Swagger.

| No. | Method | Endpoint | Contract dan handler | Akses | Payload request | Payload response |
|---:|---|---|---|---|---|---|
| 133 | **GET** | `/api/v1/product-types` | `API-TPL-001`<br>Daftar jenis produk intelijen<br>handler: `listProductTypes` | `authenticated`<br>roles: `admin_system`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [ProductTypeQuery](#schema-producttypequery) | `200` `ApiSuccess<T>`<br>data: `Array<productTypeDefinition record; include: templates>` |
| 134 | **POST** | `/api/v1/product-types` | `API-TPL-002`<br>Buat jenis produk<br>handler: `createProductType` | `authenticated`<br>roles: `admin_system`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Header: `Idempotency-Key: string`<br>Body: [CreateProductTypeDto](#schema-createproducttypedto) | `201` `ApiSuccess<T>`<br>data: `productTypeDefinition record` |
| 135 | **PATCH** | `/api/v1/product-types/:productTypeId` | `API-TPL-003`<br>Ubah metadata jenis produk<br>handler: `updateProductType` | `authenticated`<br>roles: `admin_system`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `productTypeId: string; pipe: ParseUUIDPipe`<br>Body: [UpdateProductTypeDto](#schema-updateproducttypedto) | `200` `ApiSuccess<T>`<br>data: `productTypeDefinition record` |
| 136 | **GET** | `/api/v1/product-types/:productTypeId/templates` | `API-TPL-004`<br>Daftar versi template<br>handler: `listTemplates` | `authenticated`<br>roles: `admin_system`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `productTypeId: string; pipe: ParseUUIDPipe`<br>Query: [ProductTemplateListQuery](#schema-producttemplatelistquery) | `200` `ApiSuccess<T>`<br>data: `Array<productTemplate record; include: sections>` |
| 137 | **POST** | `/api/v1/product-types/:productTypeId/templates` | `API-TPL-005`<br>Buat template version<br>handler: `createTemplate` | `authenticated`<br>roles: `admin_system`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `productTypeId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [CreateProductTemplateDto](#schema-createproducttemplatedto) | `201` `ApiSuccess<T>`<br>data: `productTemplate record; include: productType, sections` |
| 138 | **GET** | `/api/v1/product-templates/:templateId` | `API-TPL-006`<br>Detail template<br>handler: `getTemplate` | `authenticated`<br>roles: `admin_system`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `templateId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `productTemplate record; include: productType, sections` |
| 139 | **POST** | `/api/v1/product-templates/:templateId/activate` | `API-TPL-007`<br>Aktifkan template<br>handler: `activateTemplate` | `authenticated`<br>roles: `admin_system`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `templateId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ActivateTemplateDto](#schema-activatetemplatedto) | `201` `ApiSuccess<T>`<br>data: `productTemplate record; include: productType, sections` |
| 140 | **POST** | `/api/v1/product-templates/:templateId/validate-content` | `API-TPL-008`<br>Validasi payload produk terhadap template<br>handler: `validateTemplate` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `templateId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ValidateTemplateContentDto](#schema-validatetemplatecontentdto) | `201` `ApiSuccess<T>`<br>data: `{ valid: result.valid; errors: result.errors; warnings: result.warnings }` |
| 141 | **GET** | `/api/v1/products` | `API-PRD-001`<br>Daftar produk intelijen<br>handler: `listProducts` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [ProductQuery](#schema-productquery) | `200` `ApiSuccess<T>`<br>data: `result.items` |
| 142 | **POST** | `/api/v1/products` | `API-PRD-002`<br>Buat produk dan versi awal<br>handler: `createProduct` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Header: `Idempotency-Key: string`<br>Body: [CreateProductDto](#schema-createproductdto) | `201` `ApiSuccess<T>`<br>data: `intelligenceProduct record; include: productType, ownerAssignment, createdByAssignment, versions` |
| 143 | **PATCH** | `/api/v1/products/:productId` | `API-PRD-021`<br>Koreksi metadata produk draft<br>handler: `updateProduct` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `productId: string; pipe: ParseUUIDPipe`<br>Body: [UpdateProductDto](#schema-updateproductdto) | `200` `ApiSuccess<T>`<br>data: `intelligenceProduct record; include: productType, ownerAssignment, createdByAssignment, versions` |
| 144 | **GET** | `/api/v1/products/:productId` | `API-PRD-003`<br>Detail produk current version<br>handler: `getProduct` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `productId: string; pipe: ParseUUIDPipe`<br>Query: [ApprovalWorkflowQuery](#schema-approvalworkflowquery) | `200` `ApiSuccess<T>`<br>data: `{ ...product; versions: product.versions.slice result } \| object` |
| 145 | **GET** | `/api/v1/products/:productId/versions` | `API-PRD-004`<br>Riwayat versi produk<br>handler: `productVersions` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `productId: string; pipe: ParseUUIDPipe`<br>Query: [ProductVersionListQuery](#schema-productversionlistquery) | `200` `ApiSuccess<T>`<br>data: `{ items: value; pagination: object }` |
| 146 | **POST** | `/api/v1/products/:productId/versions` | `API-PRD-005`<br>Buat versi revisi produk<br>handler: `createProductVersion` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `productId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [CreateProductRevisionDto](#schema-createproductrevisiondto) | `201` `ApiSuccess<T>`<br>data: `productVersion record; include: product, template, createdByAssignment, sourceVerifications, sourceAnalyses, attachments, approvalWorkflow, distributions` |
| 147 | **GET** | `/api/v1/product-versions/:versionId` | `API-PRD-006`<br>Detail versi produk<br>handler: `getProductVersion` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `versionId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `productVersion record; include: product, template, createdByAssignment, sourceVerifications, sourceAnalyses, attachments, approvalWorkflow, distributions` |
| 148 | **PATCH** | `/api/v1/product-versions/:versionId` | `API-PRD-007`<br>Edit product version draft<br>handler: `updateProductVersion` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `versionId: string; pipe: ParseUUIDPipe`<br>Body: [UpdateProductVersionDto](#schema-updateproductversiondto) | `200` `ApiSuccess<T>`<br>data: `productVersion record; include: product, template, createdByAssignment, sourceVerifications, sourceAnalyses, attachments, approvalWorkflow, distributions` |
| 149 | **PUT** | `/api/v1/product-versions/:versionId/source-verifications` | `API-PRD-008`<br>Ganti source verifications<br>handler: `replaceVerifications` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `versionId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ReplaceSourceVerificationsDto](#schema-replacesourceverificationsdto) | `200` `ApiSuccess<T>`<br>data: `(await this.productVersionDetail(versionId)).sourceVerifications` |
| 150 | **PUT** | `/api/v1/product-versions/:versionId/source-analyses` | `API-PRD-009`<br>Ganti source analyses<br>handler: `replaceAnalyses` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `versionId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ReplaceSourceAnalysesDto](#schema-replacesourceanalysesdto) | `200` `ApiSuccess<T>`<br>data: `(await this.productVersionDetail(versionId)).sourceAnalyses` |
| 151 | **PUT** | `/api/v1/product-versions/:versionId/attachments` | `API-PRD-010`<br>Ganti lampiran<br>handler: `replaceAttachments` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `versionId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ReplaceProductAttachmentsDto](#schema-replaceproductattachmentsdto) | `200` `ApiSuccess<T>`<br>data: `(await this.productVersionDetail(versionId)).attachments` |
| 152 | **POST** | `/api/v1/product-versions/:versionId/validate` | `API-PRD-011`<br>Validasi kesiapan submit<br>handler: `validateProductVersion` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `versionId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string` | `201` `ApiSuccess<T>`<br>data: `{ valid: object; errors: object; warnings: object; versionId: value; productId: object }` |
| 153 | **POST** | `/api/v1/products/:productId/submit` | `API-PRD-012`<br>Submit ke approval regional<br>handler: `submitProduct` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `productId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [SubmitProductDto](#schema-submitproductdto) | `201` `ApiSuccess<T>`<br>data: `productApprovalWorkflow record; include: productVersion, steps, events` |
| 154 | **GET** | `/api/v1/products/:productId/traceability` | `API-PRD-013`<br>Traceability produk<br>handler: `traceability` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `productId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `{ productId: value; versions: detail.versions; sources: detail.versions.flatMap result; approval: Array<object>; distributions: detail.versions.flatMap result }` |
| 155 | **GET** | `/api/v1/products/:productId/timeline` | `API-PRD-014`<br>Timeline produk<br>handler: `timeline` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `productId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `{ productId: value; events: [ ...detail.versions.map((version) => ({ type: 'VERSION', at: version.createdAt, payload: version, })), ...detail.versions.flatMap((version) => version.approvalWorkflow ? version.approvalWorkflow.events.map((event) => ({ type: 'APPROVAL_EVENT', at: event.createdAt, payload: event, })) : [], ), ...detail.versions.flatMap((version) => version.distributions.map((distribution) => ({ type: 'DISTRIBUTION', at: distribution.sentAt ?? distribution.deliveredAt ?? distribution.readAt ?? version.createdAt, payload: distribution, })), ), ...audit.map((entry) => ({ type: 'AUDIT', at: entry.createdAt, payload: entry, })), ].sort result }` |
| 156 | **POST** | `/api/v1/products/:productId/archive` | `API-PRD-015`<br>Arsipkan produk<br>handler: `archiveProduct` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `productId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ArchiveProductDto](#schema-archiveproductdto) | `201` `ApiSuccess<T>`<br>data: `intelligenceProduct record; include: productType, ownerAssignment, createdByAssignment, versions` |
| 157 | **GET** | `/api/v1/approval-inbox` | `API-APR-001`<br>Inbox approval pengguna<br>handler: `approvalInbox` | `authenticated`<br>roles: `regional_commander`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [ApprovalInboxQuery](#schema-approvalinboxquery) | `200` `ApiSuccess<T>`<br>data: `{ items: value; pagination: object }` |
| 158 | **POST** | `/api/v1/product-versions/:versionId/approval-workflow` | `API-APR-002`<br>Buat ulang workflow jika belum ada<br>handler: `createApprovalWorkflow` | `authenticated`<br>roles: `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `versionId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [CreateApprovalWorkflowDto](#schema-createapprovalworkflowdto) | `201` `ApiSuccess<T>`<br>data: `productApprovalWorkflow record; include: productVersion, steps, events` |
| 159 | **GET** | `/api/v1/approval-workflows/:workflowId` | `API-APR-003`<br>Detail workflow approval<br>handler: `getWorkflow` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `workflowId: string; pipe: ParseUUIDPipe`<br>Query: [ApprovalWorkflowQuery](#schema-approvalworkflowquery) | `200` `ApiSuccess<T>`<br>data: `productApprovalWorkflow record; include: productVersion, steps, events` |
| 160 | **GET** | `/api/v1/approval-steps/:stepId` | `API-APR-004`<br>Detail approval step<br>handler: `getStep` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `stepId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `productApprovalStep record; include: workflow, targetAssignment, decidedByAssignment, events` |
| 161 | **POST** | `/api/v1/approval-steps/:stepId/approve` | `API-APR-005`<br>Approve step<br>handler: `approveStep` | `authenticated`<br>roles: `regional_commander`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `stepId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [DecisionNoteDto](#schema-decisionnotedto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 162 | **POST** | `/api/v1/approval-steps/:stepId/request-revision` | `API-APR-006`<br>Kembalikan produk untuk revisi<br>handler: `requestRevision` | `authenticated`<br>roles: `regional_commander`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `stepId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [RequestRevisionDto](#schema-requestrevisiondto) | `201` `ApiSuccess<T>`<br>data: `productApprovalWorkflow record; include: productVersion, steps, events` |
| 163 | **POST** | `/api/v1/approval-steps/:stepId/reject` | `API-APR-007`<br>Tolak produk<br>handler: `rejectStep` | `authenticated`<br>roles: `regional_commander`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `stepId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [RejectApprovalDto](#schema-rejectapprovaldto) | `201` `ApiSuccess<T>`<br>data: `productApprovalWorkflow record; include: productVersion, steps, events` |
| 164 | **POST** | `/api/v1/approval-steps/:stepId/request-clarification` | `API-APR-008`<br>Minta klarifikasi tanpa final decision<br>handler: `requestClarification` | `authenticated`<br>roles: `regional_commander`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `stepId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ClarificationDto](#schema-clarificationdto) | `201` `ApiSuccess<T>`<br>data: `productApprovalWorkflow record; include: productVersion, steps, events` |
| 165 | **POST** | `/api/v1/approval-workflows/:workflowId/cancel` | `API-APR-009`<br>Batalkan workflow<br>handler: `cancelWorkflow` | `authenticated`<br>roles: `regional_commander`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `workflowId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [CancelWorkflowDto](#schema-cancelworkflowdto) | `201` `ApiSuccess<T>`<br>data: `productApprovalWorkflow record; include: productVersion, steps, events` |
| 166 | **GET** | `/api/v1/approval-workflows/:workflowId/timeline` | `API-APR-010`<br>Timeline approval<br>handler: `workflowTimeline` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `workflowId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `{ workflowId: value; events: [ ...workflow.events.map((event) => ({ type: 'WORKFLOW_EVENT', at: event.createdAt, payload: event, })), ...workflow.steps.flatMap((step: any) => { const items: any[] = []; if (step.activatedAt) { items.push({ type: 'STEP_ACTIVATED', at: step.activatedAt, payload: step, }); } if (step.decidedAt) { items.push({ type: 'STEP_DECIDED', at: step.decidedAt, payload: step, }); } return items; }), ].sort result }` |
| 167 | **GET** | `/api/v1/distributions` | `API-DST-001`<br>Daftar distribusi<br>handler: `listDistributions` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [DistributionQuery](#schema-distributionquery) | `200` `ApiSuccess<T>`<br>data: `result.items` |
| 168 | **POST** | `/api/v1/product-versions/:versionId/distributions` | `API-DST-002`<br>Distribusikan produk ke satu atau banyak target<br>handler: `createDistributions` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `versionId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [CreateDistributionDto](#schema-createdistributiondto) | `201` `ApiSuccess<T>`<br>data: `Promise.all result` |
| 169 | **GET** | `/api/v1/distributions/:distributionId` | `API-DST-003`<br>Detail distribusi<br>handler: `getDistribution` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `distributionId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `productDistribution record; include: productVersion, sentByAssignment, targetAssignment, targetUser` |
| 170 | **POST** | `/api/v1/distributions/:distributionId/mark-delivered` | `API-DST-004`<br>Callback delivery berhasil<br>handler: `markDelivered` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `distributionId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [MarkDeliveredDto](#schema-markdelivereddto) | `201` `ApiSuccess<T>`<br>data: `productDistribution record; include: productVersion, sentByAssignment, targetAssignment, targetUser` |
| 171 | **POST** | `/api/v1/distributions/:distributionId/mark-read` | `API-DST-005`<br>Tandai dibaca penerima<br>handler: `markRead` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `distributionId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string` | `201` `ApiSuccess<T>`<br>data: `productDistribution record; include: productVersion, sentByAssignment, targetAssignment, targetUser` |
| 172 | **POST** | `/api/v1/distributions/:distributionId/retry` | `API-DST-006`<br>Retry distribusi gagal<br>handler: `retryDistribution` | `authenticated`<br>roles: `executive`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `distributionId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [RetryDistributionDto](#schema-retrydistributiondto) | `201` `ApiSuccess<T>`<br>data: `productDistribution record; include: productVersion, sentByAssignment, targetAssignment, targetUser` |
| 173 | **POST** | `/api/v1/distributions/:distributionId/revoke` | `API-DST-007`<br>Cabut akses distribusi<br>handler: `revokeDistribution` | `authenticated`<br>roles: `executive`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `distributionId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [RevokeDistributionDto](#schema-revokedistributiondto) | `201` `ApiSuccess<T>`<br>data: `productDistribution record; include: productVersion, sentByAssignment, targetAssignment, targetUser` |
| 174 | **GET** | `/api/v1/products/:productId/distribution-summary` | `API-DST-008`<br>Ringkasan distribusi produk<br>handler: `distributionSummary` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `productId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `{ productId: value; statuses: Record<string, unknown>; total: object }` |
| 175 | **GET** | `/api/v1/dashboard/overview` | `API-DASH-001`<br>Overview dashboard sesuai role<br>handler: `dashboardOverview` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [DashboardQuery](#schema-dashboardquery) | `200` `ApiSuccess<T>`<br>data: `{ filters: query; cards: { bakets: value; tasks: value; directives: value; products: value; alerts: value; emergencies: value } }` |
| 176 | **GET** | `/api/v1/dashboard/field-intelligence` | `API-DASH-FIELD-INTELLIGENCE-001`<br>Panel komando BAKET dan aktivitas Jaring sesuai scope role<br>handler: `dashboardFieldIntelligence` | `authenticated`<br>roles: `executive`, `regional_commander`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [FieldIntelligenceDashboardQuery](#schema-fieldintelligencedashboardquery) | `200` `ApiSuccess<T>`<br>data: `{ generatedAt: new Date().toISOString result; period: { preset: query.period; from: period.from?.toISOString() ?? null; to: period.to.toISOString result; interval: object }; scope: { role: context.authRole; positionTitle: context.positionTitle; organizationUnit: { id: object; name: object }; areas: context.areaScopes; nationalAccess: context.authRole === SYSTEM_ROLES.EXECUTIVE; includesUnverifiedJaring: boolean }; summary: { totalJaring: baseItems.length; approvedJaring: registrationStatuses.APPROVED ?? 0; pendingJaring: registrationStatuses.PENDING ?? 0; rejectedJaring: registrationStatuses.REJECTED ?? 0; reportingJaring: baseItems.filter( (item) => item.activity.periodReports > 0, ).length; silentJaring: baseItems.length - reportingJaring; reportingCoverage: object; totalReports: object; reportsInPeriod: object; verifiedReports: periodStatusCounts.VERIFIED ?? 0; unverifiedReports: reportsInPeriod - (periodStatusCounts.VERIFIED ?? 0); averageReportsPerActiveJaring: object }; reportPipeline: object; registrationStatuses: object; activityStatuses: object; trend: Array<object>; recentReports: Array<object>; filters: { areas: [...areaOptions.values()].sort result }; map: { jaring: filteredItems.flatMap result; baket: effectivePeriodReports.flatMap result }; jaring: { items: Array<object>; pagination: object } }` |
| 177 | **GET** | `/api/v1/dashboard/kpis` | `API-DASH-002`<br>KPI operasional<br>handler: `dashboardKpis` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [DashboardQuery](#schema-dashboardquery) | `200` `ApiSuccess<T>`<br>data: `{ completionRate: number \| Math.round result; verificationStatuses: Record<string, unknown>; approvalBacklog: value; taskStatuses: Record<string, unknown> }` |
| 178 | **GET** | `/api/v1/dashboard/kpi-engine` | `API-DASH-KPI-ENGINE-001`<br>KPI kualitas HUMINT berjenjang dalam scope komando<br>handler: `dashboardKpiEngine` | `authenticated`<br>roles: `executive`, `regional_commander`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [DashboardQuery](#schema-dashboardquery) | `200` `ApiSuccess<T>`<br>data: `{ period: { from: from.toISOString result; to: to.toISOString result; days: Math.max result }; hierarchy: Array<string>; indicatorDefinitions: Array<{ code: object; name: object; evidence: object }>; summary: scoreFor result; units: [...unitGroups.values()] .map((group) => ({ id: group.unit.id, code: group.unit.code, name: group.unit.name, type: group.unit.type, personnelCount: group.assignmentIds.length, ...scoreFor(group.assignmentIds), })) .sort result; personnel: assignments .filter((assignment) => assignment.id !== context.primaryAssignmentId) .map((assignment) => ({ id: assignment.id, name: assignment.userProfile.fullName ?? assignment.userProfile.username ?? 'Personel tanpa nama', position: assignment.position.title, positionCode: assignment.position.code, unit: assignment.position.organizationUnit, areas: assignment.areaScopes.map((scopeItem) => scopeItem.area), ...scoreFor([assignment.id]), })) .sort result; recommendations: Array<object> }` |
| 179 | **GET** | `/api/v1/dashboard/trends` | `API-DASH-003`<br>Tren laporan/alert/status<br>handler: `dashboardTrends` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [DashboardTrendQuery](#schema-dashboardtrendquery) | `200` `ApiSuccess<T>`<br>data: `{ metric: query.metric; interval: query.interval; series: Array<object> }` |
| 180 | **GET** | `/api/v1/dashboard/area-breakdown` | `API-DASH-004`<br>Agregasi per wilayah<br>handler: `dashboardAreaBreakdown` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [DashboardAreaBreakdownQuery](#schema-dashboardareabreakdownquery) | `200` `ApiSuccess<T>`<br>data: `{ metric: query.metric; items: grouped.slice result } \| { metric: query.metric; items: Array<object> }` |
| 181 | **GET** | `/api/v1/dashboard/task-performance` | `API-DASH-005`<br>Kinerja tugas<br>handler: `dashboardTaskPerformance` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [DashboardTaskPerformanceQuery](#schema-dashboardtaskperformancequery) | `200` `ApiSuccess<T>`<br>data: `{ groupBy: query.groupBy; items: Array<object> }` |
| 182 | **GET** | `/api/v1/dashboard/directive-progress` | `API-DASH-006`<br>Progress direktif<br>handler: `dashboardDirectiveProgress` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [DashboardDirectiveProgressQuery](#schema-dashboarddirectiveprogressquery) | `200` `ApiSuccess<T>`<br>data: `{ items: Promise.all result }` |
| 183 | **GET** | `/api/v1/dashboard/verification-quality` | `API-DASH-007`<br>Kualitas verification<br>handler: `dashboardVerificationQuality` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [DashboardVerificationQualityQuery](#schema-dashboardverificationqualityquery) | `200` `ApiSuccess<T>`<br>data: `{ reliabilityDistribution: Record<string, unknown>; credibilityDistribution: Record<string, unknown>; needsDevelopmentRate: number \| Math.round result; averageTurnaroundHours: number \| Math.round result }` |
| 184 | **GET** | `/api/v1/dashboard/product-status` | `API-DASH-008`<br>Pipeline produk<br>handler: `dashboardProductStatus` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [DashboardQuery](#schema-dashboardquery) | `200` `ApiSuccess<T>`<br>data: `{ statuses: Record<string, unknown>; activeApprovalAging: Array<object> }` |
| 185 | **GET** | `/api/v1/dashboard/briefing` | `API-DASH-009`<br>Briefing dashboard lintas modul<br>handler: `dashboardBriefing` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [DashboardQuery](#schema-dashboardquery) | `200` `ApiSuccess<T>`<br>data: `loader result \| cached \| object` |
| 186 | **GET** | `/api/v1/field-officer/dashboard` | `API-FIELD-OFFICER-DASHBOARD-001`<br>Data beranda dan dashboard operasional Petugas Wilayah (Gaswil)<br>handler: `fieldOfficerDashboard` | `authenticated`<br>roles: `field_officer`, `field_coordinator`, `executive`, `regional_commander`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Tidak ada payload request. | `200` `ApiSuccess<T>`<br>data: `loader result \| cached \| object` |
| 187 | **GET** | `/api/v1/field-officer/workspace-summary` | `API-FIELD-OFFICER-WORKSPACE-SUMMARY-001`<br>Ringkasan data beranda dan workspace Petugas Wilayah (Gaswil)<br>handler: `fieldOfficerWorkspaceSummary` | `authenticated`<br>roles: `field_officer`, `field_coordinator`, `executive`, `regional_commander`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Tidak ada payload request. | `200` `ApiSuccess<T>`<br>data: `loader result \| cached \| object` |
| 188 | **GET** | `/api/v1/map/reports` | `API-MAP-001`<br>Marker laporan pada viewport<br>handler: `mapReports` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [MapReportQuery](#schema-mapreportquery) | `200` `ApiSuccess<T>`<br>data: `{ type: string; features: Array<object> }` |
| 189 | **GET** | `/api/v1/map/boundaries` | `API-MAP-008`<br>Boundary aktif sesuai zoom dan scope<br>handler: `mapBoundaries` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [MapReportQuery](#schema-mapreportquery) | `200` `ApiSuccess<T>`<br>data: `loader result \| cached \| object` |
| 190 | **GET** | `/api/v1/map/clusters` | `API-MAP-002`<br>Cluster laporan<br>handler: `mapClusters` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [MapReportQuery](#schema-mapreportquery) | `200` `ApiSuccess<T>`<br>data: `{ type: string; features: Array<object> }` |
| 191 | **GET** | `/api/v1/map/heatmap` | `API-MAP-003`<br>Heatmap laporan<br>handler: `mapHeatmap` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [MapHeatmapQuery](#schema-mapheatmapquery) | `200` `ApiSuccess<T>`<br>data: `{ metric: query.metric ?? 'count'; points: Array<object> }` |
| 192 | **GET** | `/api/v1/map/area-summary` | `API-MAP-004`<br>Summary area terpilih<br>handler: `mapAreaSummary` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [MapAreaSummaryQuery](#schema-mapareasummaryquery) | `200` `ApiSuccess<T>`<br>data: `{ areaId: query.areaId; boundary: value; kpis: { personnel: personnelAssignments.length; units: new Set( personnelAssignments.map( (assignment) => assignment.branch, ), ).size; alerts: value; emergencies: value; bakets: value } }` |
| 193 | **GET** | `/api/v1/map/tasks` | `API-MAP-005`<br>Marker tugas pada viewport<br>handler: `mapTasks` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [MapReportQuery](#schema-mapreportquery) | `200` `ApiSuccess<T>`<br>data: `{ type: string; unlocatedCount: tasks.length - located.length; features: Array<object> }` |
| 194 | **GET** | `/api/v1/map/alerts` | `API-MAP-006`<br>Marker alert pada viewport<br>handler: `mapAlerts` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [MapReportQuery](#schema-mapreportquery) | `200` `ApiSuccess<T>`<br>data: `{ type: string; nextCursor: alerts.nextCursor; unlocatedCount: alerts.items.length - located.length; features: Array<object> }` |
| 195 | **GET** | `/api/v1/map/emergencies` | `API-MAP-007`<br>Marker insiden darurat pada viewport<br>handler: `mapEmergencies` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [MapReportQuery](#schema-mapreportquery) | `200` `ApiSuccess<T>`<br>data: `{ type: string; nextCursor: incidents.nextCursor; unlocatedCount: incidents.items.length - located.length; features: Array<object> }` |
| 196 | **GET** | `/api/v1/emergency-incidents` | `API-EMG-001`<br>Daftar insiden darurat<br>handler: `emergencies` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [EmergencyQuery](#schema-emergencyquery) | `200` `ApiSuccess<T>`<br>data: `{ items: object; nextCursor: object }` |
| 197 | **POST** | `/api/v1/emergency-incidents` | `API-EMG-002`<br>Buat laporan cepat<br>handler: `createEmergency` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Header: `Idempotency-Key: string`<br>Body: [CreateEmergencyIncidentDto](#schema-createemergencyincidentdto) | `201` `ApiSuccess<T>`<br>data: `emergencyIncident record; include: area, reportedByAssignment, ...(withRelations.includes('attachments') ? { attachments: { include: { file: true } } } : {}), ...(withRelations.includes('alerts') ? { alerts: true } : {})` |
| 198 | **GET** | `/api/v1/emergency-incidents/:incidentId` | `API-EMG-003`<br>Detail insiden<br>handler: `getEmergency` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `incidentId: string; pipe: ParseUUIDPipe`<br>Query: [ApprovalWorkflowQuery](#schema-approvalworkflowquery) | `200` `ApiSuccess<T>`<br>data: `emergencyIncident record; include: area, reportedByAssignment, ...(withRelations.includes('attachments') ? { attachments: { include: { file: true } } } : {}), ...(withRelations.includes('alerts') ? { alerts: true } : {})` |
| 199 | **PATCH** | `/api/v1/emergency-incidents/:incidentId` | `API-EMG-004`<br>Update fakta operasional<br>handler: `updateEmergency` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `incidentId: string; pipe: ParseUUIDPipe`<br>Body: [UpdateEmergencyIncidentDto](#schema-updateemergencyincidentdto) | `200` `ApiSuccess<T>`<br>data: `emergencyIncident record; include: area, reportedByAssignment, ...(withRelations.includes('attachments') ? { attachments: { include: { file: true } } } : {}), ...(withRelations.includes('alerts') ? { alerts: true } : {})` |
| 200 | **POST** | `/api/v1/emergency-incidents/:incidentId/acknowledge` | `API-EMG-005`<br>Acknowledge insiden<br>handler: `acknowledgeEmergency` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `incidentId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [DecisionNoteDto](#schema-decisionnotedto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 201 | **POST** | `/api/v1/emergency-incidents/:incidentId/verify` | `API-EMG-006`<br>Verifikasi cepat<br>handler: `verifyEmergency` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `incidentId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [VerifyEmergencyIncidentDto](#schema-verifyemergencyincidentdto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 202 | **POST** | `/api/v1/emergency-incidents/:incidentId/start-response` | `API-EMG-007`<br>Mulai penanganan<br>handler: `startEmergencyResponse` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `incidentId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [StartResponseDto](#schema-startresponsedto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 203 | **POST** | `/api/v1/emergency-incidents/:incidentId/mark-controlled` | `API-EMG-008`<br>Tandai situasi terkendali<br>handler: `markEmergencyControlled` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `incidentId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [MarkControlledDto](#schema-markcontrolleddto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 204 | **POST** | `/api/v1/emergency-incidents/:incidentId/resolve` | `API-EMG-009`<br>Selesaikan insiden<br>handler: `resolveEmergency` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `incidentId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ResolveEmergencyIncidentDto](#schema-resolveemergencyincidentdto) | `201` `ApiSuccess<T>`<br>data: `emergencyIncident record; include: area, reportedByAssignment, ...(withRelations.includes('attachments') ? { attachments: { include: { file: true } } } : {}), ...(withRelations.includes('alerts') ? { alerts: true } : {})` |
| 205 | **POST** | `/api/v1/emergency-incidents/:incidentId/cancel` | `API-EMG-010`<br>Batalkan false alarm/duplicate<br>handler: `cancelEmergency` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `incidentId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [CancelEmergencyIncidentDto](#schema-cancelemergencyincidentdto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 206 | **GET** | `/api/v1/alerts` | `API-ALT-001`<br>Daftar alert<br>handler: `alerts` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [AlertQuery](#schema-alertquery) | `200` `ApiSuccess<T>`<br>data: `{ items: object; nextCursor: object }` |
| 207 | **POST** | `/api/v1/alerts` | `API-ALT-002`<br>Buat alert manual/system<br>handler: `createAlert` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Header: `Idempotency-Key: string`<br>Body: [CreateAlertDto](#schema-createalertdto) | `201` `ApiSuccess<T>`<br>data: `alert record; include: area, sourceBaket, sourceIncident, assignedAssignment` |
| 208 | **GET** | `/api/v1/alerts/:alertId` | `API-ALT-003`<br>Detail alert<br>handler: `getAlert` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `alertId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `alert record; include: area, sourceBaket, sourceIncident, assignedAssignment` |
| 209 | **PATCH** | `/api/v1/alerts/:alertId` | `API-ALT-004`<br>Edit alert sebelum resolved<br>handler: `updateAlert` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `alertId: string; pipe: ParseUUIDPipe`<br>Body: [UpdateAlertDto](#schema-updatealertdto) | `200` `ApiSuccess<T>`<br>data: `alert record; include: area, sourceBaket, sourceIncident, assignedAssignment` |
| 210 | **POST** | `/api/v1/alerts/:alertId/acknowledge` | `API-ALT-005`<br>Acknowledge alert<br>handler: `acknowledgeAlert` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `alertId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [DecisionNoteDto](#schema-decisionnotedto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 211 | **POST** | `/api/v1/alerts/:alertId/assign` | `API-ALT-006`<br>Assign alert<br>handler: `assignAlert` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `alertId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [AssignAlertDto](#schema-assignalertdto) | `201` `ApiSuccess<T>`<br>data: `alert record; include: area, sourceBaket, sourceIncident, assignedAssignment` |
| 212 | **POST** | `/api/v1/alerts/:alertId/start` | `API-ALT-007`<br>Mulai tindak lanjut alert<br>handler: `startAlert` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `alertId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string` | `201` `ApiSuccess<T>`<br>data: `object` |
| 213 | **POST** | `/api/v1/alerts/:alertId/resolve` | `API-ALT-008`<br>Selesaikan alert<br>handler: `resolveAlert` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `alertId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ResolveAlertDto](#schema-resolvealertdto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 214 | **POST** | `/api/v1/alerts/:alertId/cancel` | `API-ALT-009`<br>Batalkan alert<br>handler: `cancelAlert` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `alertId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [CancelAlertDto](#schema-cancelalertdto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 215 | **GET** | `/api/v1/alerts/summary` | `API-ALT-010`<br>Ringkasan alert<br>handler: `alertSummary` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [AlertSummaryQuery](#schema-alertsummaryquery) | `200` `ApiSuccess<T>`<br>data: `{ items: Array<object> }` |
| 216 | **POST** | `/api/v1/personnel-location-pings` | `API-LOC-001`<br>Kirim ping lokasi personel<br>handler: `createLocationPing` | `authenticated`<br>roles: `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Header: `Idempotency-Key: string`<br>Body: [CreateLocationPingDto](#schema-createlocationpingdto) | `201` `ApiSuccess<T>`<br>data: `personnelLocationPing record` |
| 217 | **GET** | `/api/v1/personnel-location-pings/me/latest` | `API-LOC-002`<br>Lokasi terbaru diri sendiri<br>handler: `myLatestLocation` | `authenticated`<br>roles: `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Tidak ada payload request. | `200` `ApiSuccess<T>`<br>data: `personnelLocationPing record \| null` |
| 218 | **GET** | `/api/v1/personnel-location-pings/:assignmentId/latest` | `API-LOC-003`<br>Lokasi terbaru bawahan<br>handler: `latestLocation` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `assignmentId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `personnelLocationPing record \| null` |
| 219 | **GET** | `/api/v1/personnel-location-pings/:assignmentId/history` | `API-LOC-004`<br>Riwayat lokasi bawahan<br>handler: `locationHistory` | `authenticated`<br>roles: `regional_commander`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `assignmentId: string; pipe: ParseUUIDPipe`<br>Query: [LocationHistoryQuery](#schema-locationhistoryquery) | `200` `ApiSuccess<T>`<br>data: `{ items: object; nextCursor: object }` |
| 220 | **GET** | `/api/v1/personnel-location-map` | `API-LOC-005`<br>Peta lokasi personel terbaru<br>handler: `locationMap` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [PersonnelLocationMapQuery](#schema-personnellocationmapquery) | `200` `ApiSuccess<T>`<br>data: `{ type: string; features: Array<object> }` |

### 17. JaringController

- File: `apps/be/src/modules/jaring/jaring.controller.ts`
- Base route: `/api/v1/jaring`
- Guard class: `SessionGuard`, `DomainAccessGuard`
- Swagger: termasuk dalam pemindaian Swagger.

| No. | Method | Endpoint | Contract dan handler | Akses | Payload request | Payload response |
|---:|---|---|---|---|---|---|
| 221 | **GET** | `/api/v1/jaring` | `API-JAR-001`<br>Daftar Jaring<br>handler: `list` | `authenticated`<br>roles: `regional_commander`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [JaringQuery](#schema-jaringquery) | `200` `ApiSuccess<T>`<br>data: `Array<object> \| { items: Array<object>; pagination: { page: query.page ?? 1; limit: query.limit; total: value; totalPages: Math.max result }; summary: { total: object; pending: registrationCounts.get(JaringRegistrationStatus.PENDING) ?? 0; approved: registrationCounts.get(JaringRegistrationStatus.APPROVED) ?? 0; rejected: registrationCounts.get(JaringRegistrationStatus.REJECTED) ?? 0 } }` |
| 222 | **POST** | `/api/v1/jaring` | `API-JAR-002`<br>Buat Jaring<br>handler: `create` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Header: `Idempotency-Key: string`<br>Body: [CreateJaringDto](#schema-createjaringdto) | `201` `ApiSuccess<T>`<br>data: `{ ...item; lastReportAt: value; status: object }` |
| 223 | **GET** | `/api/v1/jaring/occupations` | `API-JAR-OCCUPATION-001`<br>Daftar pekerjaan Jaring<br>handler: `listOccupations` | `authenticated`<br>roles: `admin_system`, `field_officer`, `operational_intelligence_manager`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [JaringOccupationQuery](#schema-jaringoccupationquery) | `200` `ApiSuccess<T>`<br>data: `loader result \| cached \| object` |
| 224 | **POST** | `/api/v1/jaring/occupations` | `API-JAR-OCCUPATION-002`<br>Buat pekerjaan Jaring<br>handler: `createOccupation` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Header: `Idempotency-Key: string`<br>Body: [CreateJaringOccupationDto](#schema-createjaringoccupationdto) | `201` `ApiSuccess<T>`<br>data: `jaringOccupation record` |
| 225 | **PATCH** | `/api/v1/jaring/occupations/:occupationId` | `API-JAR-OCCUPATION-003`<br>Ubah pekerjaan Jaring<br>handler: `updateOccupation` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `occupationId: string; pipe: ParseUUIDPipe`<br>Body: [UpdateJaringOccupationDto](#schema-updatejaringoccupationdto) | `200` `ApiSuccess<T>`<br>data: `jaringOccupation record; include: _count` |
| 226 | **GET** | `/api/v1/jaring/report-categories` | `API-REPORT-CATEGORY-001`<br>Daftar kategori laporan<br>handler: `listReportCategories` | `authenticated`<br>roles: `admin_system`, `field_officer`, `operational_intelligence_manager`, `field_coordinator`, `regional_commander`, `executive`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [ReportCategoryQuery](#schema-reportcategoryquery) | `200` `ApiSuccess<T>`<br>data: `loader result \| cached \| object` |
| 227 | **POST** | `/api/v1/jaring/report-categories` | `API-REPORT-CATEGORY-002`<br>Buat kategori laporan<br>handler: `createReportCategory` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Header: `Idempotency-Key: string`<br>Body: [CreateReportCategoryDto](#schema-createreportcategorydto) | `201` `ApiSuccess<T>`<br>data: `reportCategory record` |
| 228 | **PATCH** | `/api/v1/jaring/report-categories/:categoryId` | `API-REPORT-CATEGORY-003`<br>Ubah kategori laporan<br>handler: `updateReportCategory` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `categoryId: string; pipe: ParseUUIDPipe`<br>Body: [UpdateReportCategoryDto](#schema-updatereportcategorydto) | `200` `ApiSuccess<T>`<br>data: `reportCategory record; include: _count` |
| 229 | **GET** | `/api/v1/jaring/reports` | `API-JAR-015-ALL`<br>Daftar semua laporan Jaring<br>handler: `allReports` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [JaringReportQuery](#schema-jaringreportquery) | `200` `ApiSuccess<T>`<br>data: `{ items: Array<object>; pagination: { page: query.page ?? 1; limit: query.limit ?? 20; total: value; totalPages: Math.max result }; facets: { status: Record<string, unknown> }; summary: value }` |
| 230 | **GET** | `/api/v1/jaring/coaching-reports` | `API-JAR-COACHING-REPORT-ALL`<br>Daftar semua laporan pembinaan Jaring<br>handler: `allCoachingReports` | `authenticated`<br>roles: `regional_commander`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [JaringCoachingReportQuery](#schema-jaringcoachingreportquery) | `200` `ApiSuccess<T>`<br>data: `{ items: Array<object>; pagination: { page: query.page ?? 1; limit: query.limit ?? 20; total: value; totalPages: Math.max result }; summary: { total: value; uniqueJaringCount: groupedJaring.length; thisMonthCount: value } }` |
| 231 | **GET** | `/api/v1/jaring/:jaringId` | `API-JAR-003`<br>Detail Jaring<br>handler: `get` | `authenticated`<br>roles: `regional_commander`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `jaringId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `{ ...item; lastReportAt: value; status: object }` |
| 232 | **POST** | `/api/v1/jaring/:jaringId/approve-registration` | `API-JAR-APPROVAL-001`<br>Setujui registrasi Jaring<br>handler: `approveRegistration` | `authenticated`<br>roles: `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `jaringId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string` | `201` `ApiSuccess<T>`<br>data: `{ ...item; lastReportAt: value; status: object }` |
| 233 | **POST** | `/api/v1/jaring/:jaringId/reject-registration` | `API-JAR-APPROVAL-002`<br>Tolak registrasi Jaring<br>handler: `rejectRegistration` | `authenticated`<br>roles: `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `jaringId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [RejectJaringDto](#schema-rejectjaringdto) | `201` `ApiSuccess<T>`<br>data: `{ ...item; lastReportAt: value; status: object }` |
| 234 | **PATCH** | `/api/v1/jaring/:jaringId` | `API-JAR-004`<br>Ubah Jaring<br>handler: `update` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `jaringId: string; pipe: ParseUUIDPipe`<br>Body: [UpdateJaringDto](#schema-updatejaringdto) | `200` `ApiSuccess<T>`<br>data: `{ ...item; lastReportAt: value; status: object }` |
| 235 | **POST** | `/api/v1/jaring/:jaringId/activate` | `API-JAR-005`<br>Aktifkan Jaring<br>handler: `activate` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `jaringId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ReasonDto](#schema-reasondto) | `201` `ApiSuccess<T>`<br>data: `void` |
| 236 | **POST** | `/api/v1/jaring/:jaringId/deactivate` | `API-JAR-006`<br>Nonaktifkan Jaring<br>handler: `deactivate` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `jaringId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ReasonDto](#schema-reasondto) | `201` `ApiSuccess<T>`<br>data: `void` |
| 237 | **POST** | `/api/v1/jaring/:jaringId/delete` | `API-JAR-007`<br>Soft delete Jaring<br>handler: `softDelete` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `jaringId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ReasonDto](#schema-reasondto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 238 | **GET** | `/api/v1/jaring/:jaringId/caretakers` | `API-JAR-008`<br>Riwayat caretaker<br>handler: `caretakers` | `authenticated`<br>roles: `regional_commander`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `jaringId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `Array<jaringCaretakerAssignment record; include: fieldOfficerAssignment>` |
| 239 | **POST** | `/api/v1/jaring/:jaringId/caretaker-transfer` | `API-JAR-009`<br>Transfer caretaker<br>handler: `transfer` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `jaringId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [TransferDto](#schema-transferdto) | `201` `ApiSuccess<T>`<br>data: `{ ...item; lastReportAt: value; status: object }` |
| 240 | **GET** | `/api/v1/jaring/:jaringId/area-coverages` | `API-JAR-010`<br>Coverage wilayah Jaring<br>handler: `coverages` | `authenticated`<br>roles: `regional_commander`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `jaringId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `Array<jaringAreaCoverage record; include: area>` |
| 241 | **PUT** | `/api/v1/jaring/:jaringId/area-coverages` | `API-JAR-011`<br>Ganti coverage wilayah Jaring<br>handler: `coverage` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `jaringId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [CoverageDto](#schema-coveragedto) | `200` `ApiSuccess<T>`<br>data: `Array<jaringAreaCoverage record; include: area>` |
| 242 | **GET** | `/api/v1/jaring/:jaringId/messages` | `API-JAR-012`<br>Pesan Jaring<br>handler: `messages` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `jaringId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `Array<whatsAppMessage record; include: category, resolvedArea, validationIssues, media>` |
| 243 | **GET** | `/api/v1/jaring/:jaringId/coaching-reports` | `API-JAR-COACHING-REPORT-001`<br>Daftar laporan pembinaan Jaring<br>handler: `coachingReports` | `authenticated`<br>roles: `regional_commander`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `jaringId: string; pipe: ParseUUIDPipe`<br>Query: [JaringCoachingReportQuery](#schema-jaringcoachingreportquery) | `200` `ApiSuccess<T>`<br>data: `{ items: Array<object>; pagination: { page: query.page ?? 1; limit: query.limit ?? 20; total: value; totalPages: Math.max result }; summary: { total: value; uniqueJaringCount: groupedJaring.length; thisMonthCount: value } }` |
| 244 | **POST** | `/api/v1/jaring/:jaringId/coaching-reports` | `API-JAR-COACHING-REPORT-002`<br>Buat laporan pembinaan Jaring<br>handler: `createCoachingReport` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `jaringId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [CreateJaringCoachingReportDto](#schema-createjaringcoachingreportdto) | `201` `ApiSuccess<T>`<br>data: `{ id: object; jaringId: object; title: object; content: object; reportedAt: object; createdAt: object; updatedAt: object; jaringCode: object; jaringAlias: object; jaringName: object; jaringWhatsAppNumber: object; jaringProfilePhotoFileId: object; assignedArea: object; areaCoverages: object; fieldOfficer: object }` |
| 245 | **GET** | `/api/v1/jaring/:jaringId/coaching-reports/:reportId` | `API-JAR-COACHING-REPORT-003`<br>Detail laporan pembinaan Jaring<br>handler: `coachingReportDetail` | `authenticated`<br>roles: `regional_commander`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `jaringId: string; pipe: ParseUUIDPipe`, `reportId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `{ id: object; jaringId: object; title: object; content: object; reportedAt: object; createdAt: object; updatedAt: object; jaringCode: object; jaringAlias: object; jaringName: object; jaringWhatsAppNumber: object; jaringProfilePhotoFileId: object; assignedArea: object; areaCoverages: object; fieldOfficer: object }` |
| 246 | **GET** | `/api/v1/jaring/:jaringId/reports` | `API-JAR-015`<br>Daftar laporan yang dibuat Jaring<br>handler: `reports` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `jaringId: string; pipe: ParseUUIDPipe`<br>Query: [JaringReportQuery](#schema-jaringreportquery) | `200` `ApiSuccess<T>`<br>data: `{ items: Array<object>; pagination: { page: query.page ?? 1; limit: query.limit ?? 20; total: value; totalPages: Math.max result }; facets: { status: Record<string, unknown> } }` |
| 247 | **GET** | `/api/v1/jaring/reports/:reportSessionId` | `API-JAR-016`<br>Detail laporan Jaring<br>handler: `reportDetail` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `reportSessionId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `{ id: object; reportSessionId: object; jaringId: object; jaringAlias: object; jaringFullName: object; jaringCode: object; jaringWhatsAppNumber: object; jaringProfilePhotoFileId: object; gaswilName: object; gaswilAssignmentId: object; gaswilUserProfileId: object; placementArea: object; referenceNumber: object; currentReportVersion: object; reportVersions: object; status: object; currentState: object; verificationStatus: object; displayStatus: object; completenessStatus: object; completenessIssues: object; canFillMetadata: object; displayTitle: object; content: object; normalizedContent: object; reportedAt: object; messages: object; startedAt: object; lastActivityAt: object; expiresAt: object; submittedAt: object; closedAt: object; readAt: object; isRead: object; fieldOfficerReadAt: object; isReadByFieldOfficer: object; createdAt: object; updatedAt: object; timezone: object; location: object; reportCategory: object; urgency: object; locationSuitabilityStatus: object; fieldOfficerNote: object; resolvedArea: object; media: object; submittedMessage: object; baket: object; counts: object }` |
| 248 | **PATCH** | `/api/v1/jaring/reports/:reportSessionId/read` | `API-JAR-016B`<br>Tandai laporan Jaring sebagai sudah dibaca Petugas Wilayah (Gaswil)<br>handler: `markReportAsRead` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `reportSessionId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `{ id: object; reportSessionId: object; jaringId: object; jaringAlias: object; jaringFullName: object; jaringCode: object; jaringWhatsAppNumber: object; jaringProfilePhotoFileId: object; gaswilName: object; gaswilAssignmentId: object; gaswilUserProfileId: object; placementArea: object; referenceNumber: object; currentReportVersion: object; reportVersions: object; status: object; currentState: object; verificationStatus: object; displayStatus: object; completenessStatus: object; completenessIssues: object; canFillMetadata: object; displayTitle: object; content: object; normalizedContent: object; reportedAt: object; messages: object; startedAt: object; lastActivityAt: object; expiresAt: object; submittedAt: object; closedAt: object; readAt: object; isRead: object; fieldOfficerReadAt: object; isReadByFieldOfficer: object; createdAt: object; updatedAt: object; timezone: object; location: object; reportCategory: object; urgency: object; locationSuitabilityStatus: object; fieldOfficerNote: object; resolvedArea: object; media: object; submittedMessage: object; baket: object; counts: object }` |
| 249 | **POST** | `/api/v1/jaring/reports/:reportSessionId/verify` | `API-JAR-017`<br>Verifikasi laporan Jaring oleh Petugas Wilayah (Gaswil)<br>handler: `verifyReport` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `reportSessionId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [VerifyJaringReportDto](#schema-verifyjaringreportdto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 250 | **PATCH** | `/api/v1/jaring/reports/:reportSessionId/metadata` | `API-JAR-018`<br>Ubah kategori, urgency, dan isian laporan Jaring<br>handler: `updateReportMetadata` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `reportSessionId: string; pipe: ParseUUIDPipe`<br>Body: [UpdateJaringReportMetadataDto](#schema-updatejaringreportmetadatadto) | `200` `ApiSuccess<T>`<br>data: `object` |
| 251 | **GET** | `/api/v1/jaring/reports/:reportSessionId/history` | `API-JAR-019`<br>Riwayat perubahan laporan Jaring<br>handler: `reportHistory` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `reportSessionId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `{ reportSessionId: id; events: [ ...reportHistory.map((item) => ({ id: item.id, source: 'report_history', action: item.action, previousState: item.previousState, newState: item.newState, externalMessageId: item.externalMessageId, metadata: item.metadata, createdAt: item.createdAt, })), ...auditHistory.map((item) => ({ id: item.id, source: 'audit_log', action: item.action, actorUserProfileId: item.actorUserProfileId, actorAssignmentId: item.actorAssignmentId, beforeData: item.beforeData, afterData: item.afterData, metadata: item.metadata, createdAt: item.createdAt, })), ].sort result }` |
| 252 | **GET** | `/api/v1/jaring/:jaringId/bakets` | `API-JAR-013`<br>Baket Jaring<br>handler: `bakets` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `jaringId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `Array<baket record; include: versions>` |

### 18. MapMarkersController

- File: `apps/be/src/modules/map-markers/map-markers.controller.ts`
- Base route: `/api/v1/map`
- Guard class: `SessionGuard`, `DomainAccessGuard`
- Swagger: termasuk dalam pemindaian Swagger.

| No. | Method | Endpoint | Contract dan handler | Akses | Payload request | Payload response |
|---:|---|---|---|---|---|---|
| 253 | **GET** | `/api/v1/map/markers` | `API-MAP-MARKERS-001`<br>Marker GeoJSON Laporan Jaring, BAKET, dan lokasi personel sesuai scope<br>handler: `list` | `authenticated`<br>roles: `executive`, `regional_commander`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [MapMarkersQuery](#schema-mapmarkersquery) | `200` `ApiSuccess<T>`<br>data: `{ type: string; features: Array<...reportResult.features \| ...baketResult.features \| ...agentResult.features>; meta: { counts: { total: object; report: object; baket: object; agent: object; totalReports: object; totalBakets: object; mappableReports: object; mappableBakets: object; unlocatedReport: object; unlocatedBaket: object; unlocatedAgent: object; activeAgents: object; lastKnownAgents: object; byBaketCategory: object; byBaketStatus: object }; facets: { markerTypes: object; categories: value; baketStatuses: object; urgencies: object; agentStates: object; administrativeLevels: object; areas: object }; freshness: { activeWithinMinutes: object; lastKnownWithinHours: object; generatedAt: object }; summary: { reports: object; bakets: object; visible: object }; unlocatedItems: reportResult.unlocatedItems ?? []; security: { stealthLocationsExcluded: object } } }` |

### 19. NotificationController

- File: `apps/be/src/modules/notifications/notification.controller.ts`
- Base route: `/api/v1/notifications`
- Guard class: `SessionGuard`, `DomainAccessGuard`
- Swagger: termasuk dalam pemindaian Swagger.

| No. | Method | Endpoint | Contract dan handler | Akses | Payload request | Payload response |
|---:|---|---|---|---|---|---|
| 254 | **GET** | `/api/v1/notifications` | `API-NOT-001`<br>Notifikasi pengguna<br>handler: `list` | `authenticated`<br>roles: `admin_system`, `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [NotificationQuery](#schema-notificationquery) | `200` `ApiSuccess<T>`<br>data: `Array<notification record>` |
| 255 | **GET** | `/api/v1/notifications/unread-count` | `API-NOT-002`<br>Jumlah unread<br>handler: `unread` | `authenticated`<br>roles: `admin_system`, `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Tidak ada payload request. | `200` `ApiSuccess<T>`<br>data: `{ count: number }` |
| 256 | **POST** | `/api/v1/notifications/:notificationId/read` | `API-NOT-003`<br>Tandai satu notifikasi dibaca<br>handler: `read` | `authenticated`<br>roles: `admin_system`, `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `notificationId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string` | `201` `ApiSuccess<T>`<br>data: `notification record` |
| 257 | **POST** | `/api/v1/notifications/read-all` | `API-NOT-004`<br>Tandai semua dibaca<br>handler: `readAll` | `authenticated`<br>roles: `admin_system`, `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Header: `Idempotency-Key: string`<br>Body: [ReadAllDto](#schema-readalldto) | `201` `ApiSuccess<T>`<br>data: `{ affectedCount: result.count }` |

### 20. OrganizationController

- File: `apps/be/src/modules/organization/organization.controller.ts`
- Base route: `/api/v1/organization-units`
- Guard class: `SessionGuard`, `DomainAccessGuard`
- Swagger: termasuk dalam pemindaian Swagger.

| No. | Method | Endpoint | Contract dan handler | Akses | Payload request | Payload response |
|---:|---|---|---|---|---|---|
| 258 | **GET** | `/api/v1/organization-units` | `API-ORG-001`<br>Daftar unit organisasi<br>handler: `list` | `authenticated`<br>roles: `admin_system`, `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [OrganizationListQueryDto](#schema-organizationlistquerydto) | `200` `ApiSuccess<T>`<br>data: `result.items` |
| 259 | **POST** | `/api/v1/organization-units` | `API-ORG-002`<br>Buat unit organisasi<br>handler: `create` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Header: `Idempotency-Key: string`<br>Body: [CreateOrganizationUnitDto](#schema-createorganizationunitdto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 260 | **GET** | `/api/v1/organization-units/regional-masters` | `API-ORG-011`<br>Ringkasan master wilayah Binda dan Direktorat<br>handler: `regionalMasters` | `authenticated`<br>roles: `admin_system`, `executive`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [RegionalMasterQueryDto](#schema-regionalmasterquerydto) | `200` `ApiSuccess<T>`<br>data: `{ totals: { provinceCount: provincesWithMasters.length; bindaCount: bindaUnits.length; directorateCount: directorateUnits.length; coveredProvinceCount: provincesWithMasters.filter( (item) => item.binda \|\| item.directorates.length, ).length }; deputyOptions: deputyUnits; provinces: Array<object> }` |
| 261 | **POST** | `/api/v1/organization-units/regional-masters/binda` | `API-ORG-012`<br>Daftarkan Binda per provinsi<br>handler: `createBindaMaster` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Header: `Idempotency-Key: string`<br>Body: [CreateBindaMasterDto](#schema-createbindamasterdto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 262 | **POST** | `/api/v1/organization-units/regional-masters/directorates` | `API-ORG-013`<br>Daftarkan Direktorat wilayah multi provinsi<br>handler: `createDirectorateMaster` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Header: `Idempotency-Key: string`<br>Body: [CreateDirectorateMasterDto](#schema-createdirectoratemasterdto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 263 | **GET** | `/api/v1/organization-units/:unitId` | `API-ORG-003`<br>Detail unit<br>handler: `detail` | `authenticated`<br>roles: `admin_system`, `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `unitId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `organizationUnit record; include: parent, children, positions, areaCoverages` |
| 264 | **PATCH** | `/api/v1/organization-units/:unitId` | `API-ORG-004`<br>Ubah metadata unit<br>handler: `update` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `unitId: string; pipe: ParseUUIDPipe`<br>Body: [UpdateOrganizationUnitDto](#schema-updateorganizationunitdto) | `200` `ApiSuccess<T>`<br>data: `organizationUnit record; include: parent, children, positions, areaCoverages` |
| 265 | **POST** | `/api/v1/organization-units/:unitId/move` | `API-ORG-005`<br>Pindahkan unit dalam hierarchy<br>handler: `move` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `unitId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [MoveOrganizationUnitDto](#schema-moveorganizationunitdto) | `201` `ApiSuccess<T>`<br>data: `organizationUnit record; include: parent, children, positions, areaCoverages` |
| 266 | **GET** | `/api/v1/organization-units/:unitId/ancestors` | `API-ORG-006`<br>Ambil rantai atasan unit<br>handler: `ancestors` | `authenticated`<br>roles: `admin_system`, `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `unitId: string; pipe: ParseUUIDPipe`<br>Query: [OrganizationHierarchyQueryDto](#schema-organizationhierarchyquerydto) | `200` `ApiSuccess<T>`<br>data: `Array<organizationUnitClosure record>` |
| 267 | **GET** | `/api/v1/organization-units/:unitId/descendants` | `API-ORG-007`<br>Ambil unit turunan<br>handler: `descendants` | `authenticated`<br>roles: `admin_system`, `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `unitId: string; pipe: ParseUUIDPipe`<br>Query: [OrganizationHierarchyQueryDto](#schema-organizationhierarchyquerydto) | `200` `ApiSuccess<T>`<br>data: `Array<organizationUnitClosure record>` |
| 268 | **GET** | `/api/v1/organization-units/:unitId/tree` | `API-ORG-008`<br>Ambil subtree organisasi<br>handler: `tree` | `authenticated`<br>roles: `admin_system`, `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `unitId: string; pipe: ParseUUIDPipe`<br>Query: [OrganizationTreeQueryDto](#schema-organizationtreequerydto) | `200` `ApiSuccess<T>`<br>data: `nodes.get(id) ?? null` |
| 269 | **GET** | `/api/v1/organization-units/:unitId/area-coverages` | `API-ORG-009`<br>Coverage wilayah unit<br>handler: `coverages` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `unitId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `Array<organizationAreaCoverage record; include: area>` |
| 270 | **PUT** | `/api/v1/organization-units/:unitId/area-coverages` | `API-ORG-010`<br>Ganti coverage wilayah unit<br>handler: `replaceCoverages` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `unitId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ReplaceOrganizationCoverageDto](#schema-replaceorganizationcoveragedto) | `200` `ApiSuccess<T>`<br>data: `Array<organizationAreaCoverage record; include: area>` |

### 21. PositionController

- File: `apps/be/src/modules/positions/position.controller.ts`
- Base route: `/api/v1`
- Guard class: `SessionGuard`, `DomainAccessGuard`
- Swagger: termasuk dalam pemindaian Swagger.

| No. | Method | Endpoint | Contract dan handler | Akses | Payload request | Payload response |
|---:|---|---|---|---|---|---|
| 271 | **GET** | `/api/v1/command-network` | `API-POS-COMMAND-001`<br>Personel, organisasi, wilayah, dan Jaring dalam hierarki komando<br>handler: `commandNetwork` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Tidak ada payload request. | `200` `ApiSuccess<T>`<br>data: `{ command: object; positions: value; assignments: value; jaring: value }` |
| 272 | **GET** | `/api/v1/positions` | `API-POS-001`<br>Daftar seat/jabatan<br>handler: `list` | `authenticated`<br>roles: `admin_system`, `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [PositionListQueryDto](#schema-positionlistquerydto) | `200` `ApiSuccess<T>`<br>data: `r.items` |
| 273 | **POST** | `/api/v1/positions` | `API-POS-002`<br>Buat seat/jabatan<br>handler: `create` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Header: `Idempotency-Key: string`<br>Body: [CreatePositionDto](#schema-createpositiondto) | `201` `ApiSuccess<T>`<br>data: `position record; include: role, organizationUnit, reportsTo, subordinates, areaCoverages, assignments` |
| 274 | **GET** | `/api/v1/positions/:positionId` | `API-POS-003`<br>Detail position<br>handler: `detail` | `authenticated`<br>roles: `admin_system`, `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `positionId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `position record; include: role, organizationUnit, reportsTo, subordinates, areaCoverages, assignments` |
| 275 | **PATCH** | `/api/v1/positions/:positionId` | `API-POS-004`<br>Ubah title/status position<br>handler: `update` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `positionId: string; pipe: ParseUUIDPipe`<br>Body: [UpdatePositionDto](#schema-updatepositiondto) | `200` `ApiSuccess<T>`<br>data: `position record; include: role, organizationUnit, reportsTo, subordinates, areaCoverages, assignments` |
| 276 | **POST** | `/api/v1/positions/:positionId/change-reporting-line` | `API-POS-005`<br>Ubah atasan jabatan<br>handler: `reporting` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `positionId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ChangeReportingLineDto](#schema-changereportinglinedto) | `201` `ApiSuccess<T>`<br>data: `position record; include: role, organizationUnit, reportsTo, subordinates, areaCoverages, assignments` |
| 277 | **GET** | `/api/v1/positions/:positionId/subordinates` | `API-POS-006`<br>Daftar bawahan langsung/berjenjang<br>handler: `subordinates` | `authenticated`<br>roles: `admin_system`, `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `positionId: string; pipe: ParseUUIDPipe`<br>Query: [SubordinateQueryDto](#schema-subordinatequerydto) | `200` `ApiSuccess<T>`<br>data: `Array<position record; include: role, organizationUnit> \| this.prisma.$queryRaw result` |
| 278 | **GET** | `/api/v1/positions/:positionId/reporting-chain` | `API-POS-007`<br>Rantai komando position<br>handler: `chain` | `authenticated`<br>roles: `admin_system`, `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `positionId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `this.prisma.$queryRaw result` |
| 279 | **GET** | `/api/v1/position-assignments` | `API-ASG-001`<br>Daftar assignment<br>handler: `assignments` | `authenticated`<br>roles: `admin_system`, `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [AssignmentListQueryDto](#schema-assignmentlistquerydto) | `200` `ApiSuccess<T>`<br>data: `r.items` |
| 280 | **POST** | `/api/v1/position-assignments` | `API-ASG-002`<br>Buat assignment non-mutasi<br>handler: `createAssignment` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Header: `Idempotency-Key: string`<br>Body: [CreatePositionAssignmentDto](#schema-createpositionassignmentdto) | `201` `ApiSuccess<T>`<br>data: `userSeatAssignment record; include: userProfile, position, areaScopes` |
| 281 | **GET** | `/api/v1/position-assignments/:assignmentId` | `API-ASG-003`<br>Detail assignment<br>handler: `assignment` | `authenticated`<br>roles: `admin_system`, `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `assignmentId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `userSeatAssignment record; include: userProfile, position, areaScopes` |
| 282 | **POST** | `/api/v1/position-assignments/:assignmentId/close` | `API-ASG-004`<br>Tutup assignment<br>handler: `close` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `assignmentId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [CloseAssignmentDto](#schema-closeassignmentdto) | `201` `ApiSuccess<T>`<br>data: `userSeatAssignment record; include: userProfile, position, areaScopes` |
| 283 | **POST** | `/api/v1/position-assignments/:assignmentId/set-primary` | `API-ASG-005`<br>Jadikan assignment utama<br>handler: `primary` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `assignmentId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ReasonDto](#schema-reasondto) | `201` `ApiSuccess<T>`<br>data: `userSeatAssignment record; include: userProfile, position, areaScopes` |
| 284 | **GET** | `/api/v1/position-assignments/:assignmentId/area-scopes` | `API-ASG-006`<br>Ambil cakupan wilayah assignment<br>handler: `scopes` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `assignmentId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `Array<UserAreaScope record; include: area>` |
| 285 | **PUT** | `/api/v1/position-assignments/:assignmentId/area-scopes` | `API-ASG-007`<br>Ganti cakupan wilayah assignment<br>handler: `replaceScopes` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `assignmentId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ReplaceAssignmentScopesDto](#schema-replaceassignmentscopesdto) | `200` `ApiSuccess<T>`<br>data: `Array<UserAreaScope record; include: area>` |
| 286 | **POST** | `/api/v1/position-assignments/:assignmentId/area-scopes/validate` | `API-ASG-008`<br>Preview validasi cakupan wilayah<br>handler: `validateScopes` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `assignmentId: string; pipe: ParseUUIDPipe`<br>Body: [ValidateAssignmentScopesDto](#schema-validateassignmentscopesdto) | `201` `ApiSuccess<T>`<br>data: `{ valid: object; violations: object; warnings: object }` |

### 22. RbacController

- File: `apps/be/src/modules/rbac/rbac.controller.ts`
- Base route: `/api/v1`
- Guard class: `SessionGuard`, `DomainAccessGuard`
- Swagger: termasuk dalam pemindaian Swagger.

| No. | Method | Endpoint | Contract dan handler | Akses | Payload request | Payload response |
|---:|---|---|---|---|---|---|
| 287 | **GET** | `/api/v1/roles` | `API-RBAC-001`<br>Daftar role domain<br>handler: `roles` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [RoleListQueryDto](#schema-rolelistquerydto) | `200` `ApiSuccess<T>`<br>data: `Array<role record; include: _count>` |
| 288 | **GET** | `/api/v1/roles/:roleId` | `API-RBAC-002`<br>Detail role domain<br>handler: `role` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `roleId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `role record; include: _count` |
| 289 | **GET** | `/api/v1/position-area-policies` | `API-RBAC-003`<br>Daftar kebijakan level wilayah per posisi<br>handler: `policies` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [AreaPolicyQueryDto](#schema-areapolicyquerydto) | `200` `ApiSuccess<T>`<br>data: `Array<roleAreaPolicy record>` |
| 290 | **PUT** | `/api/v1/position-area-policies/:policyId` | `API-RBAC-004`<br>Ubah policy area posisi<br>handler: `updatePolicy` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `policyId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [UpdateAreaPolicyDto](#schema-updateareapolicydto) | `200` `ApiSuccess<T>`<br>data: `roleAreaPolicy record` |

### 23. SecurityController

- File: `apps/be/src/modules/system/security.controller.ts`
- Base route: `/api/v1/system/security`
- Guard class: `SessionGuard`, `DomainAccessGuard`
- Swagger: termasuk dalam pemindaian Swagger.

| No. | Method | Endpoint | Contract dan handler | Akses | Payload request | Payload response |
|---:|---|---|---|---|---|---|
| 291 | **GET** | `/api/v1/system/security/sessions` | `API-SYS-020`<br>Daftar sesi login<br>handler: `listSessions` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [SecuritySessionQuery](#schema-securitysessionquery)<br>Transport: `request object (AuthenticatedRequest)` | `200` `ApiSuccess<T>`<br>data: `Array<object>` |
| 292 | **POST** | `/api/v1/system/security/sessions/:sessionId/revoke` | `API-SYS-021`<br>Cabut sesi login<br>handler: `revokeSession` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `sessionId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Transport: `request object (AuthenticatedRequest)` | `201` `ApiSuccess<T>`<br>data: `{ status: boolean } \| { status: boolean; revokedCurrentSession: request.authSession?.id === session.id }` |

### 24. SystemController

- File: `apps/be/src/modules/system/system.controller.ts`
- Base route: `/api/v1`
- Guard class: `SessionGuard`, `DomainAccessGuard`
- Swagger: termasuk dalam pemindaian Swagger.

| No. | Method | Endpoint | Contract dan handler | Akses | Payload request | Payload response |
|---:|---|---|---|---|---|---|
| 293 | **GET** | `/api/v1/reference-data/enums` | `API-SYS-001`<br>Enum/reference untuk UI<br>handler: `enums` | `authenticated`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [EnumQuery](#schema-enumquery) | `200` `ApiSuccess<T>`<br>data: `Record<string, unknown>` |
| 294 | **GET** | `/api/v1/system/settings` | `API-SYS-002`<br>Daftar settings<br>handler: `settings` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [SettingQuery](#schema-settingquery) | `200` `ApiSuccess<T>`<br>data: `Array<object>` |
| 295 | **GET** | `/api/v1/system/settings/:key` | `API-SYS-003`<br>Detail setting<br>handler: `setting` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `key: string` | `200` `ApiSuccess<T>`<br>data: `{ ...i; value: { redacted: boolean } \| i.value }` |
| 296 | **PUT** | `/api/v1/system/settings/:key` | `API-SYS-004`<br>Upsert setting<br>handler: `upsert` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `key: string`<br>Header: `Idempotency-Key: string`<br>Body: [UpsertSettingDto](#schema-upsertsettingdto) | `200` `ApiSuccess<T>`<br>data: `{ ...item; value: { redacted: boolean } \| item.value }` |
| 297 | **GET** | `/api/v1/system/diagnostics` | `API-SYS-007`<br>Diagnostics administratif<br>handler: `diagnostics` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard` | Tidak ada payload request. | `200` `ApiSuccess<T>`<br>data: `{ database: { version: databaseVersion[0]?.version; migrations: Number result }; jobs: { deadLetter: deadJobs }; integrations: { failedWebhooks: value } }` |

### 25. TaskController

- File: `apps/be/src/modules/tasks/task.controller.ts`
- Base route: `/api/v1`
- Guard class: `SessionGuard`, `DomainAccessGuard`
- Swagger: termasuk dalam pemindaian Swagger.

| No. | Method | Endpoint | Contract dan handler | Akses | Payload request | Payload response |
|---:|---|---|---|---|---|---|
| 298 | **GET** | `/api/v1/tasks` | `API-TASK-001`<br>Daftar tugas<br>handler: `list` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [TaskQuery](#schema-taskquery) | `200` `ApiSuccess<T>`<br>data: `tasks.slice result \| { items: tasks.slice result; pagination: { page: query.page; limit: query.limit; total: tasks.length; totalPages: Math.max result }; summary: { total: tasks.length; completed: statusCount.get(TaskStatus.COMPLETED) ?? 0; inProgress: (statusCount.get(TaskStatus.ASSIGNED) ?? 0) + (statusCount.get(TaskStatus.IN_PROGRESS) ?? 0); completionRate: object } } \| Array<task record> \| { items: tasks.slice result; pagination: { page: query.page; limit: query.limit; total: value; totalPages: Math.max result }; summary: { total: value; completed: statusCount.get(TaskStatus.COMPLETED) ?? 0; inProgress: (statusCount.get(TaskStatus.ASSIGNED) ?? 0) + (statusCount.get(TaskStatus.IN_PROGRESS) ?? 0); completionRate: object } }` |
| 299 | **POST** | `/api/v1/tasks` | `API-TASK-002`<br>Buat tugas<br>handler: `create` | `authenticated`<br>roles: `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Header: `Idempotency-Key: string`<br>Body: [CreateTaskDto](#schema-createtaskdto) | `201` `ApiSuccess<T>`<br>data: `task record` |
| 300 | **POST** | `/api/v1/tasks/:taskId/child-tasks` | `API-TASK-003`<br>Buat child task<br>handler: `child` | `authenticated`<br>roles: `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `taskId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [CreateTaskDto](#schema-createtaskdto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 301 | **GET** | `/api/v1/tasks/:taskId` | `API-TASK-004`<br>Detail tugas<br>handler: `get` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `taskId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `task record` |
| 302 | **PATCH** | `/api/v1/tasks/:taskId` | `API-TASK-005`<br>Ubah draft tugas<br>handler: `update` | `authenticated`<br>roles: `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `taskId: string; pipe: ParseUUIDPipe`<br>Body: [UpdateTaskDto](#schema-updatetaskdto) | `200` `ApiSuccess<T>`<br>data: `task record` |
| 303 | **PUT** | `/api/v1/tasks/:taskId/target-areas` | `API-TASK-006`<br>Ganti target area tugas<br>handler: `targets` | `authenticated`<br>roles: `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `taskId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [TargetAreasDto](#schema-targetareasdto) | `200` `ApiSuccess<T>`<br>data: `(await this.taskDetail(taskId, context)).targetAreas` |
| 304 | **POST** | `/api/v1/tasks/:taskId/assignments` | `API-TASK-007`<br>Assign tugas<br>handler: `assign` | `authenticated`<br>roles: `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `taskId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [AssignTaskDto](#schema-assigntaskdto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 305 | **GET** | `/api/v1/tasks/:taskId/assignments` | `API-TASK-008`<br>Daftar assignment tugas<br>handler: `assignments` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `taskId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `Array<taskAssignment record; include: assigner, assignee, progressLogs, reassignedFrom, reassignedTo>` |
| 306 | **GET** | `/api/v1/task-assignments/:assignmentId` | `API-TASK-009`<br>Detail task assignment<br>handler: `assignment` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `assignmentId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `taskAssignment record` |
| 307 | **POST** | `/api/v1/task-assignments/:assignmentId/mark-read` | `API-TASK-010`<br>Tandai tugas dibaca<br>handler: `read` | `authenticated`<br>roles: `regional_commander`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `assignmentId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string` | `201` `ApiSuccess<T>`<br>data: `object` |
| 308 | **POST** | `/api/v1/task-assignments/:assignmentId/acknowledge` | `API-TASK-011`<br>Acknowledge tugas<br>handler: `acknowledge` | `authenticated`<br>roles: `regional_commander`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `assignmentId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [NoteDto](#schema-notedto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 309 | **POST** | `/api/v1/task-assignments/:assignmentId/start` | `API-TASK-012`<br>Mulai tugas<br>handler: `start` | `authenticated`<br>roles: `regional_commander`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `assignmentId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [NoteDto](#schema-notedto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 310 | **POST** | `/api/v1/task-assignments/:assignmentId/progress` | `API-TASK-013`<br>Update progres tugas<br>handler: `progress` | `authenticated`<br>roles: `regional_commander`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `assignmentId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ProgressDto](#schema-progressdto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 311 | **POST** | `/api/v1/task-assignments/:assignmentId/complete` | `API-TASK-014`<br>Selesaikan tugas<br>handler: `complete` | `authenticated`<br>roles: `regional_commander`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `assignmentId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [NoteDto](#schema-notedto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 312 | **POST** | `/api/v1/task-assignments/:assignmentId/jaring-instructions` | `API-TASK-019`<br>Forward instruksi Petugas Wilayah (Gaswil) ke Jaring<br>handler: `forwardJaringInstruction` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `assignmentId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ForwardJaringInstructionDto](#schema-forwardjaringinstructiondto) | `201` `ApiSuccess<T>`<br>data: `{ id: event.id; assignmentId: assignment.id; taskId: assignment.taskId; status: event.status; instruction: body.instruction.trim result; recipientCount: jaring.length; recipients: Array<object>; createdAt: event.createdAt }` |
| 313 | **POST** | `/api/v1/task-assignments/:assignmentId/reassign` | `API-TASK-015`<br>Alihkan assignment<br>handler: `reassign` | `authenticated`<br>roles: `regional_commander`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `assignmentId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ReassignDto](#schema-reassigndto) | `201` `ApiSuccess<T>`<br>data: `object` |
| 314 | **POST** | `/api/v1/tasks/:taskId/cancel` | `API-TASK-016`<br>Batalkan tugas<br>handler: `cancel` | `authenticated`<br>roles: `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `taskId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ReasonDto](#schema-reasondto) | `201` `ApiSuccess<T>`<br>data: `task record` |
| 315 | **GET** | `/api/v1/tasks/:taskId/cascade` | `API-TASK-017`<br>Hierarki cascade tugas<br>handler: `cascade` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `taskId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `this.prisma.$queryRaw result` |
| 316 | **GET** | `/api/v1/tasks/:taskId/progress-summary` | `API-TASK-018`<br>Ringkasan progres tugas<br>handler: `summary` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `taskId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `{ taskId: value; statuses: Record<string, unknown>; total: object }` |

### 26. UserProfileController

- File: `apps/be/src/modules/users/user-profile.controller.ts`
- Base route: `/api/v1/user-profiles`
- Guard class: `SessionGuard`, `DomainAccessGuard`
- Swagger: termasuk dalam pemindaian Swagger.

| No. | Method | Endpoint | Contract dan handler | Akses | Payload request | Payload response |
|---:|---|---|---|---|---|---|
| 317 | **GET** | `/api/v1/user-profiles` | `API-USR-001`<br>Daftar user profile<br>handler: `list` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [UserProfileListQueryDto](#schema-userprofilelistquerydto) | `200` `ApiSuccess<T>`<br>data: `result.items` |
| 318 | **POST** | `/api/v1/user-profiles/provision` | `API-USR-002`<br>Provision akun, profile, role, dan cakupan wilayah<br>handler: `provision` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Header: `Idempotency-Key: string`<br>Body: [ProvisionUserDto](#schema-provisionuserdto) | `201` `ApiSuccess<T>`<br>data: `{ userProfile: object; generatedTempPassword: null }` |
| 319 | **GET** | `/api/v1/user-profiles/:userProfileId` | `API-USR-003`<br>Detail user profile<br>handler: `detail` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `userProfileId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `client.userProfile.findFirstOrThrow result` |
| 320 | **PATCH** | `/api/v1/user-profiles/:userProfileId` | `API-USR-004`<br>Ubah metadata profile<br>handler: `update` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `userProfileId: string; pipe: ParseUUIDPipe`<br>Body: [UpdateUserProfileDto](#schema-updateuserprofiledto) | `200` `ApiSuccess<T>`<br>data: `client.userProfile.findFirstOrThrow result` |
| 321 | **POST** | `/api/v1/user-profiles/:userProfileId/reset-password` | `API-USR-004-RESET-PASSWORD`<br>Reset password akun pengguna<br>handler: `resetPassword` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `userProfileId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ResetUserPasswordDto](#schema-resetuserpassworddto) | `201` `ApiSuccess<T>`<br>data: `{ userProfile: object; revokedSessionCount: result.revokedSessionCount }` |
| 322 | **POST** | `/api/v1/user-profiles/:userProfileId/activate` | `API-USR-005`<br>Aktifkan profile setelah provisioning<br>handler: `activate` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `userProfileId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ReasonDto](#schema-reasondto) | `201` `ApiSuccess<T>`<br>data: `client.userProfile.findFirstOrThrow result` |
| 323 | **POST** | `/api/v1/user-profiles/:userProfileId/suspend` | `API-USR-006`<br>Suspend akses operasional<br>handler: `suspend` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `userProfileId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [SuspendUserDto](#schema-suspenduserdto) | `201` `ApiSuccess<T>`<br>data: `client.userProfile.findFirstOrThrow result` |
| 324 | **POST** | `/api/v1/user-profiles/:userProfileId/archive` | `API-USR-007`<br>Arsipkan personel<br>handler: `archive` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `userProfileId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ArchiveUserDto](#schema-archiveuserdto) | `201` `ApiSuccess<T>`<br>data: `{ id: value; status: UserProfileStatus.ARCHIVED; effectiveAt: Date }` |
| 325 | **POST** | `/api/v1/user-profiles/:userProfileId/lock` | `API-USR-008`<br>Operational security lock<br>handler: `lock` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `userProfileId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [LockUserDto](#schema-lockuserdto) | `201` `ApiSuccess<T>`<br>data: `client.userProfile.findFirstOrThrow result` |
| 326 | **POST** | `/api/v1/user-profiles/:userProfileId/unlock` | `API-USR-009`<br>Lepas operational lock<br>handler: `unlock` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `userProfileId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ReasonDto](#schema-reasondto) | `201` `ApiSuccess<T>`<br>data: `client.userProfile.findFirstOrThrow result` |
| 327 | **POST** | `/api/v1/user-profiles/:userProfileId/change-primary-assignment` | `API-USR-010`<br>Mutasi assignment utama<br>handler: `transfer` | `authenticated`<br>roles: `admin_system`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `userProfileId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ChangePrimaryAssignmentDto](#schema-changeprimaryassignmentdto) | `201` `ApiSuccess<T>`<br>data: `userOperationalAssignment record; include: role, areaScopes` |
| 328 | **GET** | `/api/v1/user-profiles/:userProfileId/assignments` | `API-USR-011`<br>Riwayat assignment pengguna<br>handler: `assignments` | `authenticated`<br>roles: `admin_system`, `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`, `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `userProfileId: string; pipe: ParseUUIDPipe`<br>Query: [AssignmentHistoryQueryDto](#schema-assignmenthistoryquerydto) | `200` `ApiSuccess<T>`<br>data: `Array<userOperationalAssignment record; include: role, areaScopes>` |

### 27. UukController

- File: `apps/be/src/modules/uuk/uuk.controller.ts`
- Base route: `/api/v1`
- Guard class: `SessionGuard`, `DomainAccessGuard`
- Swagger: termasuk dalam pemindaian Swagger.

| No. | Method | Endpoint | Contract dan handler | Akses | Payload request | Payload response |
|---:|---|---|---|---|---|---|
| 329 | **GET** | `/api/v1/uuk-strs` | `API-UUK-001`<br>Daftar UUK/STR<br>handler: `list` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [UukQuery](#schema-uukquery) | `200` `ApiSuccess<T>`<br>data: `Array<uukStr record> \| { items: Array<uukStr record>; pagination: { page: query.page; limit: query.limit; total: object; totalPages: Math.max result } }` |
| 330 | **POST** | `/api/v1/uuk-strs` | `API-UUK-002`<br>Buat UUK/STR versi awal<br>handler: `create` | `authenticated`<br>roles: `regional_commander`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Header: `Idempotency-Key: string`<br>Body: [CreateUukDto](#schema-createuukdto) | `201` `ApiSuccess<T>`<br>data: `uukStr record; include: ownerAssignment, directiveVersion, createdByAssignment, versions` |
| 331 | **GET** | `/api/v1/uuk-strs/:uukStrId` | `API-UUK-003`<br>Detail UUK/STR<br>handler: `get` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `uukStrId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `uukStr record; include: ownerAssignment, directiveVersion, createdByAssignment, versions` |
| 332 | **GET** | `/api/v1/uuk-strs/:uukStrId/versions` | `API-UUK-004`<br>Riwayat versi UUK/STR<br>handler: `versions` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `uukStrId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `Array<uukStrVersion record; include: createdByAssignment, sections>` |
| 333 | **POST** | `/api/v1/uuk-strs/:uukStrId/versions` | `API-UUK-005`<br>Buat revisi UUK/STR<br>handler: `createVersion` | `authenticated`<br>roles: `regional_commander`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `uukStrId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [CreateUukRevisionDto](#schema-createuukrevisiondto) | `201` `ApiSuccess<T>`<br>data: `void` |
| 334 | **GET** | `/api/v1/uuk-str-versions/:versionId` | `API-UUK-006`<br>Detail versi UUK/STR<br>handler: `getVersion` | `authenticated`<br>roles: `executive`, `regional_commander`, `operational_intelligence_manager`, `field_coordinator`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `versionId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `uukStrVersion record; include: uukStr, createdByAssignment, sections, tasks` |
| 335 | **PATCH** | `/api/v1/uuk-str-versions/:versionId` | `API-UUK-007`<br>Edit judul versi draft<br>handler: `updateVersion` | `authenticated`<br>roles: `regional_commander`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `versionId: string; pipe: ParseUUIDPipe`<br>Body: [UpdateUukVersionDto](#schema-updateuukversiondto) | `200` `ApiSuccess<T>`<br>data: `void` |
| 336 | **PUT** | `/api/v1/uuk-str-versions/:versionId/sections` | `API-UUK-008`<br>Ganti seluruh section draft<br>handler: `replaceSections` | `authenticated`<br>roles: `regional_commander`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `versionId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ReplaceSectionsDto](#schema-replacesectionsdto) | `200` `ApiSuccess<T>`<br>data: `void` |
| 337 | **POST** | `/api/v1/uuk-str-versions/:versionId/publish` | `API-UUK-009`<br>Publish UUK/STR<br>handler: `publish` | `authenticated`<br>roles: `regional_commander`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `versionId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [PublishDto](#schema-publishdto) | `201` `ApiSuccess<T>`<br>data: `uukStr record; include: ownerAssignment, directiveVersion, createdByAssignment, versions` |
| 338 | **POST** | `/api/v1/uuk-strs/:uukStrId/cancel` | `API-UUK-010`<br>Batalkan UUK/STR<br>handler: `cancel` | `authenticated`<br>roles: `regional_commander`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `uukStrId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [CancelDto](#schema-canceldto) | `201` `ApiSuccess<T>`<br>data: `object \| uukStr record; include: ownerAssignment, directiveVersion, createdByAssignment, versions` |

### 28. WhatsAppController

- File: `apps/be/src/modules/whatsapp/whatsapp.controller.ts`
- Base route: `/api/v1`
- Guard class: tidak ada guard class-level
- Swagger: termasuk dalam pemindaian Swagger.

| No. | Method | Endpoint | Contract dan handler | Akses | Payload request | Payload response |
|---:|---|---|---|---|---|---|
| 339 | **POST** | `/api/v1/webhooks/whatsapp/:channelCode` | `API-WA-001`<br>Webhook WhatsApp<br>handler: `webhook` | `public-signed` | Path: `channelCode: string`<br>Header: `x-webhook-signature: string \| undefined`<br>Body: [WebhookDto](#schema-webhookdto) | `202` `ApiSuccess<T>`<br>data: `{ eventId: existing.id; duplicate: boolean } \| { eventId: event.id; accepted: boolean }` |
| 340 | **GET** | `/api/v1/whatsapp-messages` | `API-WA-002`<br>Daftar pesan WhatsApp<br>handler: `list` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Query: [MessageQuery](#schema-messagequery) | `200` `ApiSuccess<T>`<br>data: `Array<whatsAppMessage record; include: jaring, category, convertedBaket, resolvedArea, validationIssues, media, reportAmendments>` |
| 341 | **GET** | `/api/v1/whatsapp-messages/:messageId` | `API-WA-003`<br>Detail pesan WhatsApp<br>handler: `get` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `messageId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `whatsAppMessage record; include: integrationChannel, jaring, category, convertedBaket, resolvedArea, media, reportAmendments, validationIssues, routingLogs` |
| 342 | **POST** | `/api/v1/whatsapp-messages/:messageId/link-jaring` | `API-WA-004`<br>Hubungkan pesan ke Jaring<br>handler: `link` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `messageId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [LinkDto](#schema-linkdto) | `201` `ApiSuccess<T>`<br>data: `whatsAppMessage record; include: integrationChannel, jaring, category, convertedBaket, resolvedArea, media, reportAmendments, validationIssues, routingLogs` |
| 343 | **PATCH** | `/api/v1/whatsapp-messages/:messageId/category` | `API-WA-004B`<br>Assign kategori laporan WhatsApp<br>handler: `assignCategory` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `messageId: string; pipe: ParseUUIDPipe`<br>Body: [AssignCategoryDto](#schema-assigncategorydto) | `200` `ApiSuccess<T>`<br>data: `whatsAppMessage record; include: integrationChannel, jaring, category, convertedBaket, resolvedArea, media, reportAmendments, validationIssues, routingLogs` |
| 344 | **POST** | `/api/v1/whatsapp-messages/:messageId/validate` | `API-WA-005`<br>Validasi format pesan<br>handler: `validate` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `messageId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string` | `201` `ApiSuccess<T>`<br>data: `whatsAppMessage record; include: integrationChannel, jaring, category, convertedBaket, resolvedArea, media, reportAmendments, validationIssues, routingLogs` |
| 345 | **POST** | `/api/v1/whatsapp-messages/:messageId/resolve-area` | `API-WA-006`<br>Resolve area pesan<br>handler: `resolve` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `messageId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ResolveDto](#schema-resolvedto) | `201` `ApiSuccess<T>`<br>data: `whatsAppMessage record; include: integrationChannel, jaring, category, convertedBaket, resolvedArea, media, reportAmendments, validationIssues, routingLogs` |
| 346 | **POST** | `/api/v1/whatsapp-messages/:messageId/route` | `API-WA-007`<br>Route pesan ke Petugas Wilayah (Gaswil)<br>handler: `route` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `messageId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string` | `201` `ApiSuccess<T>`<br>data: `whatsAppMessage record; include: integrationChannel, jaring, category, convertedBaket, resolvedArea, media, reportAmendments, validationIssues, routingLogs` |
| 347 | **POST** | `/api/v1/whatsapp-messages/:messageId/mark-spam` | `API-WA-008`<br>Tandai spam<br>handler: `spam` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `messageId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [ReasonDto](#schema-reasondto) | `201` `ApiSuccess<T>`<br>data: `whatsAppMessage record; include: integrationChannel, jaring, category, convertedBaket, resolvedArea, media, reportAmendments, validationIssues, routingLogs` |
| 348 | **POST** | `/api/v1/whatsapp-messages/:messageId/mark-duplicate` | `API-WA-009`<br>Tandai duplikat<br>handler: `duplicate` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `messageId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [DuplicateDto](#schema-duplicatedto) | `201` `ApiSuccess<T>`<br>data: `whatsAppMessage record; include: integrationChannel, jaring, category, convertedBaket, resolvedArea, media, reportAmendments, validationIssues, routingLogs` |
| 349 | **GET** | `/api/v1/whatsapp-messages/:messageId/routing-logs` | `API-WA-010`<br>Routing logs pesan<br>handler: `logs` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Path: `messageId: string; pipe: ParseUUIDPipe` | `200` `ApiSuccess<T>`<br>data: `Array<whatsAppRoutingLog record>` |
| 350 | **POST** | `/api/v1/whatsapp-messages/:messageId/create-baket` | `API-WA-011`<br>Buat Baket dari pesan<br>handler: `createBaket` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard`<br>idempotent | Path: `messageId: string; pipe: ParseUUIDPipe`<br>Header: `Idempotency-Key: string`<br>Body: [CreateBaketFromMessageDto](#schema-createbaketfrommessagedto) | `201` `ApiSuccess<T>`<br>data: `tx.baket.findUniqueOrThrow result \| object` |
| 351 | **GET** | `/api/v1/whatsapp-inbox/summary` | `API-WA-012`<br>Ringkasan inbox WhatsApp<br>handler: `summary` | `authenticated`<br>roles: `field_officer`<br>guards: `SessionGuard`, `DomainAccessGuard` | Tidak ada payload request. | `200` `ApiSuccess<T>`<br>data: `{ statuses: Record<string, unknown>; total: object }` |

## Katalog schema payload request dan query

Schema di bawah hanya mencakup type/class yang benar-benar dipakai oleh parameter `@Body()` atau `@Query()` pada controller. Tanda wajib mengikuti kombinasi property TypeScript, `@IsOptional()`, dan default value. DTO turunan tetap menampilkan relasi `Mewarisi` agar field induk tidak diduplikasi.

#### Schema: ActivateTemplateDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `reason` | string | Ya | - | `IsString()` |

#### Schema: AdministrativeLevel

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type AdministrativeLevel = (typeof AdministrativeLevel)[keyof typeof AdministrativeLevel];
```

#### Schema: AgentLocationState

Sumber: `apps/be/src/modules/map-markers/map-markers.dto.ts`

Enum: `active`, `last_known`

#### Schema: AlertQuery

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `cursor` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `limit` | inferred | Tidak | `20` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(100)` |
| `status` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `severity` | [AlertSeverity](#schema-alertseverity) | Tidak | - | `IsOptional()`, `IsEnum(AlertSeverity)` |
| `areaId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `assignedAssignmentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `sourceBaketId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `sourceIncidentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `from` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `to` | string | Tidak | - | `IsOptional()`, `IsDateString()` |

#### Schema: AlertSeverity

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type AlertSeverity = (typeof AlertSeverity)[keyof typeof AlertSeverity];
```

#### Schema: AlertSummaryQuery

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `areaId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `from` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `to` | string | Tidak | - | `IsOptional()`, `IsDateString()` |

#### Schema: AnalysisEntityDto

Sumber: `apps/be/src/modules/analysis/analysis.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `entityType` | [IntelEntityType](#schema-intelentitytype) | Ya | - | `IsEnum(IntelEntityType)` |
| `name` | string | Ya | - | `IsString()`, `MaxLength(250)` |
| `normalizedName` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(250)` |
| `metadata` | Record<string, unknown> | Tidak | - | `IsOptional()` |

#### Schema: AnalysisQuery

Sumber: `apps/be/src/modules/analysis/analysis.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `page` | inferred | Tidak | `1` | `IsOptional()`, `IsInt()`, `Min(1)` |
| `limit` | inferred | Tidak | `20` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(100)` |
| `status` | [AnalysisStatus](#schema-analysisstatus) | Tidak | - | `IsOptional()`, `IsEnum(AnalysisStatus)` |
| `ownerAssignmentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `search` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `sortBy` | [AnalysisSortField](#schema-analysissortfield) | Tidak | - | `IsOptional()`, `IsEnum(AnalysisSortField)` |
| `sortOrder` | [SortOrder](#schema-sortorder) | Tidak | - | `IsOptional()`, `IsEnum(SortOrder)` |

#### Schema: AnalysisRelationshipDto

Sumber: `apps/be/src/modules/analysis/analysis.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `fromEntityId` | string | Ya | - | `IsUUID()` |
| `toEntityId` | string | Ya | - | `IsUUID()` |
| `relationshipType` | string | Ya | - | `IsString()`, `MaxLength(120)` |
| `description` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `confidence` | number | Tidak | - | `IsOptional()`, `IsNumber()`, `Min(0)`, `Max(100)` |

#### Schema: AnalysisSortField

Sumber: `apps/be/src/modules/analysis/analysis.dto.ts`

Enum: `updatedAt`

#### Schema: AnalysisStatus

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type AnalysisStatus = (typeof AnalysisStatus)[keyof typeof AnalysisStatus];
```

#### Schema: ApprovalInboxQuery

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `page` | inferred | Tidak | `1` | `IsOptional()`, `IsInt()`, `Min(1)` |
| `limit` | inferred | Tidak | `20` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(100)` |
| `stage` | [ApprovalStage](#schema-approvalstage) | Tidak | - | `IsOptional()`, `IsEnum(ApprovalStage)` |
| `status` | [ApprovalStepStatus](#schema-approvalstepstatus) | Tidak | - | `IsOptional()`, `IsEnum(ApprovalStepStatus)` |
| `routeType` | [CommandRouteType](#schema-commandroutetype) | Tidak | - | `IsOptional()`, `IsEnum(CommandRouteType)` |
| `areaId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `from` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `to` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `search` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `productTypeId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `classification` | [Classification](#schema-classification) | Tidak | - | `IsOptional()`, `IsEnum(Classification)` |
| `ownerAssignmentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `periodFrom` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `periodTo` | string | Tidak | - | `IsOptional()`, `IsDateString()` |

#### Schema: ApprovalStage

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type ApprovalStage = (typeof ApprovalStage)[keyof typeof ApprovalStage];
```

#### Schema: ApprovalStepStatus

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type ApprovalStepStatus = (typeof ApprovalStepStatus)[keyof typeof ApprovalStepStatus];
```

#### Schema: ApprovalWorkflowQuery

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `include` | string | Tidak | - | `IsOptional()`, `IsString()` |

#### Schema: ArchiveAnalysisDto

Sumber: `apps/be/src/modules/analysis/analysis.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `reason` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(1000)` |

#### Schema: ArchiveProductDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `reason` | string | Ya | - | `IsString()` |

#### Schema: ArchiveUserDto

Sumber: `apps/be/src/modules/users/dto/user-profile.dto.ts`

Mewarisi: [ReasonDto](#schema-reasondto)

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `effectiveAt` | string | Ya | - | `IsDateString()` |

#### Schema: AreaHierarchyQueryDto

Sumber: `apps/be/src/modules/areas/dto/area.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `level` | [AdministrativeLevel](#schema-administrativelevel) | Tidak | - | `IsOptional()`, `IsEnum(AdministrativeLevel)` |
| `maxDepth` | number | Tidak | - | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(20)` |
| `includeSelf` | inferred | Tidak | `false` | `IsOptional()`, `IsBoolean()` |
| `page` | inferred | Tidak | `1` | `IsOptional()`, `IsInt()`, `Min(1)` |
| `limit` | inferred | Tidak | `100` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(1000)` |

#### Schema: AreaListQueryDto

Sumber: `apps/be/src/modules/areas/dto/area.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `page` | inferred | Tidak | `1` | `IsOptional()`, `IsInt()`, `Min(1)` |
| `limit` | inferred | Tidak | `20` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(1000)` |
| `search` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(100)` |
| `level` | [AdministrativeLevel](#schema-administrativelevel) | Tidak | - | `IsOptional()`, `IsEnum(AdministrativeLevel)` |
| `parentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `isActive` | boolean | Tidak | - | `IsOptional()`, `IsBoolean()` |

#### Schema: AreaPolicyQueryDto

Sumber: `apps/be/src/modules/rbac/dto/rbac.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `roleCode` | [RoleCode](#schema-rolecode) | Tidak | - | `IsOptional()`, `IsEnum(RoleCode)` |
| `branch` | [CommandRouteType](#schema-commandroutetype) | Tidak | - | `IsOptional()`, `IsEnum(CommandRouteType)` |
| `isActive` | boolean | Tidak | - | `IsOptional()`, `IsBoolean()` |

#### Schema: AreaScopeMode

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type AreaScopeMode = (typeof AreaScopeMode)[keyof typeof AreaScopeMode];
```

#### Schema: AreaScopeQueryDto

Sumber: `apps/be/src/modules/identity/dto/identity.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `includeDescendants` | inferred | Tidak | `false` | `IsOptional()`, `Transform(({ value }) => value === true \|\| value === 'true')`, `IsBoolean()` |
| `level` | [AdministrativeLevel](#schema-administrativelevel) | Tidak | - | `IsOptional()`, `IsEnum(AdministrativeLevel)` |

#### Schema: AreaSearchQueryDto

Sumber: `apps/be/src/modules/areas/dto/area.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `q` | string | Ya | - | `IsString()`, `MinLength(2)`, `MaxLength(100)` |
| `level` | [AdministrativeLevel](#schema-administrativelevel) | Tidak | - | `IsOptional()`, `IsEnum(AdministrativeLevel)` |
| `parentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `limit` | inferred | Tidak | `20` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(50)` |

#### Schema: AreaTreeQueryDto

Sumber: `apps/be/src/modules/areas/dto/area.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `rootId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `maxDepth` | inferred | Tidak | `3` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(10)` |

#### Schema: AssignAlertDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `positionId` | string | Ya | - | `IsUUID()` |
| `note` | string | Tidak | - | `IsOptional()`, `IsString()` |

#### Schema: AssignCategoryDto

Sumber: `apps/be/src/modules/whatsapp/whatsapp.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `categoryId` | string | Ya | - | `IsUUID()` |

#### Schema: AssignmentHistoryQueryDto

Sumber: `apps/be/src/modules/users/dto/user-profile.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `activeOnly` | inferred | Tidak | `false` | `IsOptional()`, `IsBoolean()` |

#### Schema: AssignmentItem

Sumber: `apps/be/src/modules/tasks/task.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `assigneeAssignmentId` | string | Ya | - | `IsUUID()` |
| `dueDate` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `assignmentNote` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(2000)` |

#### Schema: AssignmentListQueryDto

Sumber: `apps/be/src/modules/positions/dto/position.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `page` | inferred | Tidak | `1` | `IsOptional()`, `IsInt()`, `Min(1)` |
| `limit` | inferred | Tidak | `20` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(100)` |
| `userProfileId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `positionId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `positionIds` | string[] | Tidak | - | `Transform(({ value }) => { if (Array.isArray(value)) { return value; } return value ? [value] : undefined; })`, `IsOptional()`, `IsArray()`, `IsUUID(undefined, { each: true })` |
| `unitId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `roleCode` | [RoleCode](#schema-rolecode) | Tidak | - | `IsOptional()`, `IsEnum(RoleCode)` |
| `positionCode` | [PositionCode](#schema-positioncode) | Tidak | - | `IsOptional()`, `IsEnum(PositionCode)` |
| `isActive` | boolean | Tidak | - | `IsOptional()`, `IsBoolean()` |
| `validAt` | string | Tidak | - | `IsOptional()`, `IsDateString()` |

#### Schema: AssignmentScopeAreaDto

Sumber: `apps/be/src/modules/positions/dto/position.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `areaId` | string | Ya | - | `IsUUID()` |
| `isPrimary` | boolean | Ya | - | `IsBoolean()` |

#### Schema: AssignTaskDto

Sumber: `apps/be/src/modules/tasks/task.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `assignments` | [AssignmentItem](#schema-assignmentitem)[] | Ya | - | `IsArray()`, `ArrayMinSize(1)`, `ValidateNested({ each: true })` |

#### Schema: AuditExportDto

Sumber: `apps/be/src/modules/audit/audit.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `filters` | Record<string, unknown> | Tidak | - | `IsOptional()` |
| `format` | 'CSV' \| 'JSON' | Ya | - | `IsIn(['CSV', 'JSON'])` |
| `reason` | string | Ya | - | `IsString()`, `MinLength(2)`, `MaxLength(1000)` |

#### Schema: AuditQueryDto

Sumber: `apps/be/src/modules/audit/audit.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `page` | inferred | Tidak | `1` | `IsOptional()`, `IsInt()`, `Min(1)` |
| `limit` | inferred | Tidak | `25` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(100)` |
| `search` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(200)` |
| `actorUserProfileId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `actorAssignmentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `action` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(120)` |
| `category` | string | Tidak | - | `IsOptional()`, `IsIn(AUDIT_CATEGORIES)` |
| `severity` | string | Tidak | - | `IsOptional()`, `IsIn(AUDIT_SEVERITIES)` |
| `outcome` | string | Tidak | - | `IsOptional()`, `IsIn(AUDIT_OUTCOMES)` |
| `entityType` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(120)` |
| `entityId` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(120)` |
| `from` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `to` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `ipAddress` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(64)` |
| `requestId` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(120)` |
| `sessionId` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(255)` |
| `httpMethod` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(12)` |
| `requestPath` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(500)` |
| `deviceType` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(40)` |
| `browser` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(80)` |
| `operatingSystem` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(80)` |
| `source` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(80)` |
| `isAnomaly` | boolean | Tidak | - | `IsOptional()`, `Transform(optionalBoolean)`, `IsBoolean()` |
| `isIncident` | boolean | Tidak | - | `IsOptional()`, `Transform(optionalBoolean)`, `IsBoolean()` |
| `sortBy` | 'createdAt' \| 'riskScore' \| 'durationMs' | Tidak | `'createdAt'` | `IsOptional()`, `IsIn(['createdAt', 'riskScore', 'durationMs'])` |
| `sortOrder` | 'asc' \| 'desc' | Tidak | `'desc'` | `IsOptional()`, `IsIn(['asc', 'desc'])` |

#### Schema: AuditTrailQueryDto

Sumber: `apps/be/src/modules/audit/audit.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `limit` | inferred | Tidak | `50` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(100)` |

#### Schema: BaketAttachmentDto

Sumber: `apps/be/src/modules/baket/baket.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `fileId` | string | Ya | - | `IsUUID()` |
| `caption` | string | Tidak | - | `IsOptional()`, `IsString()` |

#### Schema: BaketPatchDto

Sumber: `apps/be/src/modules/baket/baket.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `originalContent` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `normalizedContent` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `latitude` | number | Tidak | - | `IsOptional()`, `IsNumber()`, `Min(-90)`, `Max(90)` |
| `longitude` | number | Tidak | - | `IsOptional()`, `IsNumber()`, `Min(-180)`, `Max(180)` |
| `urgency` | [PriorityLevel](#schema-prioritylevel) | Tidak | - | `IsOptional()`, `IsEnum(PriorityLevel)` |
| `fieldOfficerNote` | string | Tidak | - | `IsOptional()`, `IsString()` |

#### Schema: BaketQuery

Sumber: `apps/be/src/modules/baket/baket.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `page` | inferred | Tidak | `1` | `IsOptional()`, `IsInt()`, `Min(1)` |
| `limit` | inferred | Tidak | `20` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(100)` |
| `status` | [BaketStatus](#schema-baketstatus) | Tidak | - | `IsOptional()`, `IsEnum(BaketStatus)` |
| `statuses` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `urgency` | [PriorityLevel](#schema-prioritylevel) | Tidak | - | `IsOptional()`, `IsEnum(PriorityLevel)` |
| `createdByAssignmentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `taskAssignmentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `jaringId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `categoryId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `areaId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `from` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `to` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `search` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `coverageStatus` | [CoverageValidationStatus](#schema-coveragevalidationstatus) | Tidak | - | `IsOptional()`, `IsEnum(CoverageValidationStatus)` |
| `sortBy` | [BaketSortField](#schema-baketsortfield) | Tidak | - | `IsOptional()`, `IsEnum(BaketSortField)` |
| `sortOrder` | [SortOrder](#schema-sortorder) | Tidak | - | `IsOptional()`, `IsEnum(SortOrder)` |

#### Schema: BaketSortField

Sumber: `apps/be/src/modules/baket/baket.dto.ts`

Enum: `updatedAt`

#### Schema: BaketStatus

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type BaketStatus = (typeof BaketStatus)[keyof typeof BaketStatus];
```

#### Schema: BaketVersionPayloadDto

Sumber: `apps/be/src/modules/baket/baket.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `originalContent` | string | Ya | - | `IsString()` |
| `normalizedContent` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `latitude` | number | Tidak | - | `IsOptional()`, `IsNumber()`, `Min(-90)`, `Max(90)` |
| `longitude` | number | Tidak | - | `IsOptional()`, `IsNumber()`, `Min(-180)`, `Max(180)` |
| `urgency` | [PriorityLevel](#schema-prioritylevel) | Tidak | - | `IsOptional()`, `IsEnum(PriorityLevel)` |
| `fieldOfficerNote` | string | Tidak | - | `IsOptional()`, `IsString()` |

#### Schema: BoundaryActionDto

Sumber: `apps/be/src/modules/areas/dto/area.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `reason` | string | Ya | - | `IsString()`, `MinLength(2)`, `MaxLength(1000)` |
| `effectiveFrom` | string | Tidak | - | `IsOptional()`, `IsDateString()` |

#### Schema: BoundaryQualityStatus

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type BoundaryQualityStatus = (typeof BoundaryQualityStatus)[keyof typeof BoundaryQualityStatus];
```

#### Schema: BoundaryQueryDto

Sumber: `apps/be/src/modules/areas/dto/area.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `simplifyMeters` | inferred | Tidak | `0` | `IsOptional()`, `IsNumber()`, `Min(0)` |

#### Schema: CancelAlertDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `reason` | string | Ya | - | `IsString()` |

#### Schema: CancelDto

Sumber: `apps/be/src/modules/uuk/uuk.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `reason` | string | Ya | - | `IsString()`, `MinLength(2)`, `MaxLength(2000)` |

#### Schema: CancelEmergencyIncidentDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `reason` | string | Ya | - | `IsString()` |

#### Schema: CancelRevisionRequestDto

Sumber: `apps/be/src/modules/baket/baket.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `reason` | string | Ya | - | `IsString()`, `MinLength(2)` |

#### Schema: CancelWorkflowDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `reason` | string | Ya | - | `IsString()` |

#### Schema: ChangePrimaryAssignmentDto

Sumber: `apps/be/src/modules/users/dto/user-profile.dto.ts`

Mewarisi: [ReasonDto](#schema-reasondto)

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `roleCode` | [RoleCode](#schema-rolecode) | Ya | - | `IsEnum(RoleCode)` |
| `branch` | [CommandRouteType](#schema-commandroutetype) | Ya | - | `IsEnum(CommandRouteType)` |
| `areaScopeIds` | string[] | Tidak | - | `IsOptional()`, `IsArray()`, `ArrayMinSize(1)`, `IsUUID('all', { each: true })` |
| `effectiveAt` | string | Ya | - | `IsDateString()` |

#### Schema: ChangeReportingLineDto

Sumber: `apps/be/src/modules/positions/dto/position.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `reportsToPositionId` | string | Ya | - | `IsUUID()` |
| `reason` | string | Ya | - | `IsString()`, `MinLength(2)`, `MaxLength(1000)` |

#### Schema: ClarificationDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `note` | string | Ya | - | `IsString()` |
| `dueAt` | string | Tidak | - | `IsOptional()`, `IsDateString()` |

#### Schema: Classification

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type Classification = (typeof Classification)[keyof typeof Classification];
```

#### Schema: CloseAssignmentDto

Sumber: `apps/be/src/modules/positions/dto/position.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `validUntil` | string | Ya | - | `IsDateString()` |
| `reason` | string | Ya | - | `IsString()`, `MinLength(2)`, `MaxLength(1000)` |

#### Schema: CommandRouteType

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type CommandRouteType = (typeof CommandRouteType)[keyof typeof CommandRouteType];
```

#### Schema: CompleteFileDto

Sumber: `apps/be/src/modules/files/dto/file.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `uploadToken` | string | Ya | - | `IsString()` |
| `storageKey` | string | Ya | - | `IsString()`, `MaxLength(500)` |

#### Schema: CompleteVerificationDto

Sumber: `apps/be/src/modules/baket/baket.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `decision` | string | Ya | - | `IsString()` |
| `summary` | string | Tidak | - | `IsOptional()`, `IsString()` |

#### Schema: ConfirmationDto

Sumber: `apps/be/src/modules/baket/baket.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `confirmation` | string | Ya | - | `IsString()` |

#### Schema: CoordinateSource

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type CoordinateSource = (typeof CoordinateSource)[keyof typeof CoordinateSource];
```

#### Schema: CoverageAreaDto

Sumber: `apps/be/src/modules/organization/dto/organization.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `areaId` | string | Ya | - | `IsUUID()` |
| `isPrimary` | boolean | Ya | - | `IsBoolean()` |

#### Schema: CoverageDto

Sumber: `apps/be/src/modules/jaring/jaring.dto.ts`

Mewarisi: [ReasonDto](#schema-reasondto)

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `areas` | [CoverageItem](#schema-coverageitem)[] | Ya | - | `IsArray()`, `ArrayMinSize(1)`, `ValidateNested({ each: true })` |

#### Schema: CoverageItem

Sumber: `apps/be/src/modules/jaring/jaring.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `areaId` | string | Ya | - | `IsUUID()` |
| `isPrimary` | boolean | Ya | - | `IsBoolean()` |

#### Schema: CoverageScopeType

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type CoverageScopeType = (typeof CoverageScopeType)[keyof typeof CoverageScopeType];
```

#### Schema: CoverageValidationStatus

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type CoverageValidationStatus = (typeof CoverageValidationStatus)[keyof typeof CoverageValidationStatus];
```

#### Schema: CreateAlertDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `title` | string | Ya | - | `IsString()`, `MaxLength(300)` |
| `description` | string | Ya | - | `IsString()` |
| `severity` | [AlertSeverity](#schema-alertseverity) | Ya | - | `IsEnum(AlertSeverity)` |
| `areaId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `latitude` | number | Tidak | - | `IsOptional()` |
| `longitude` | number | Tidak | - | `IsOptional()` |
| `sourceBaketId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `sourceIncidentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `assignedAssignmentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |

#### Schema: CreateAnalysisCaseDto

Sumber: `apps/be/src/modules/analysis/analysis.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `ownerAssignmentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `title` | string | Ya | - | `IsString()`, `MaxLength(300)` |
| `periodStart` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `periodEnd` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `verificationIds` | string[] | Tidak | - | `IsOptional()`, `IsArray()`, `IsUUID('4', { each: true })` |

#### Schema: CreateAnalysisVersionDto

Sumber: `apps/be/src/modules/analysis/analysis.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `basedOnVersionId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `indications` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `analysis` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `impact` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `efforts` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `recommendations` | string | Tidak | - | `IsOptional()`, `IsString()` |

#### Schema: CreateApprovalWorkflowDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `routeType` | [CommandRouteType](#schema-commandroutetype) | Ya | - | `IsEnum(CommandRouteType)` |
| `regionalTargetAssignmentId` | string | Ya | - | `IsUUID()` |
| `regionalTargetPositionId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `executiveTargetAssignmentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |

#### Schema: CreateAreaDto

Sumber: `apps/be/src/modules/areas/dto/area.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `code` | string | Ya | - | `IsString()`, `MaxLength(50)` |
| `officialCode` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(30)` |
| `name` | string | Ya | - | `IsString()`, `MaxLength(180)` |
| `level` | [AdministrativeLevel](#schema-administrativelevel) | Ya | - | `IsEnum(AdministrativeLevel)` |
| `parentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `centroidLatitude` | number | Tidak | - | `IsOptional()`, `IsNumber()`, `Min(-90)`, `Max(90)` |
| `centroidLongitude` | number | Tidak | - | `IsOptional()`, `IsNumber()`, `Min(-180)`, `Max(180)` |

#### Schema: CreateAreaImportDto

Sumber: `apps/be/src/modules/areas/dto/area.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `fileId` | string | Ya | - | `IsUUID()` |
| `name` | string | Ya | - | `IsString()`, `MaxLength(200)` |
| `sourceType` | string | Ya | - | `IsString()`, `MaxLength(80)` |
| `referenceUrl` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(500)` |
| `versionLabel` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(100)` |
| `effectiveDate` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `mode` | 'VALIDATE' \| 'UPSERT' | Ya | - | `IsIn(['VALIDATE', 'UPSERT'])` |

#### Schema: CreateBaketDto

Sumber: `apps/be/src/modules/baket/baket.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `reportCategoryId` | string | Ya | - | `IsUUID()` |
| `taskAssignmentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `primaryJaringId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `sourceMessageIds` | string[] | Tidak | - | `IsOptional()`, `IsArray()`, `IsUUID('4', { each: true })` |
| `version` | [BaketVersionPayloadDto](#schema-baketversionpayloaddto) | Ya | - | `ValidateNested()` |
| `attachments` | [BaketAttachmentDto](#schema-baketattachmentdto)[] | Tidak | - | `IsOptional()`, `IsArray()`, `ValidateNested({ each: true })` |

#### Schema: CreateBaketFromMessageDto

Sumber: `apps/be/src/modules/whatsapp/whatsapp.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `categoryId` | string | Ya | - | `IsUUID()` |
| `urgency` | [PriorityLevel](#schema-prioritylevel) | Ya | - | `IsEnum(PriorityLevel)` |
| `normalizedContent` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `fieldOfficerNote` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(3000)` |
| `taskAssignmentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |

#### Schema: CreateBaketRevisionDto

Sumber: `apps/be/src/modules/baket/baket.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `basedOnVersionId` | string | Ya | - | `IsUUID()` |
| `revisionReason` | string | Ya | - | `IsString()`, `MinLength(2)`, `MaxLength(2000)` |
| `patch` | [BaketPatchDto](#schema-baketpatchdto) | Ya | - | `ValidateNested()` |

#### Schema: CreateBindaMasterDto

Sumber: `apps/be/src/modules/organization/dto/organization.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `code` | string | Ya | - | `IsString()`, `MinLength(2)`, `MaxLength(80)` |
| `name` | string | Ya | - | `IsString()`, `MinLength(2)`, `MaxLength(180)` |
| `provinceAreaId` | string | Ya | - | `IsUUID()` |
| `parentUnitId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |

#### Schema: CreateBoundaryDto

Sumber: `apps/be/src/modules/areas/dto/area.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `geoJson` | Record<string, unknown> | Ya | - | `IsObject()` |
| `dataSourceId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `qualityStatus` | [BoundaryQualityStatus](#schema-boundaryqualitystatus) | Ya | - | `IsEnum(BoundaryQualityStatus)` |
| `effectiveFrom` | string | Ya | - | `IsDateString()` |

#### Schema: CreateDirectiveDto

Sumber: `apps/be/src/modules/directives/directive.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `ownerAssignmentId` | string | Ya | - | `IsUUID()` |
| `version` | [DirectiveVersionCreateDto](#schema-directiveversioncreatedto) | Ya | - | `ValidateNested()` |

#### Schema: CreateDirectiveRevisionDto

Sumber: `apps/be/src/modules/directives/directive.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `basedOnVersionId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `changeReason` | string | Ya | - | `IsString()`, `MinLength(2)`, `MaxLength(2000)` |
| `patch` | [DirectiveRevisionPatchDto](#schema-directiverevisionpatchdto) | Ya | - | `ValidateNested()` |

#### Schema: CreateDirectorateMasterDto

Sumber: `apps/be/src/modules/organization/dto/organization.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `code` | string | Ya | - | `IsString()`, `MinLength(2)`, `MaxLength(80)` |
| `name` | string | Ya | - | `IsString()`, `MinLength(2)`, `MaxLength(180)` |
| `profileCode` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(80)` |
| `provinceAreaIds` | string[] | Ya | - | `IsArray()`, `ArrayMinSize(1)`, `ArrayUnique()`, `IsUUID(undefined, { each: true })` |
| `primaryProvinceAreaId` | string | Ya | - | `IsUUID()` |
| `parentUnitId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |

#### Schema: CreateDistributionDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `targets` | [DistributionTargetDto](#schema-distributiontargetdto)[] | Ya | - | `IsArray()`, `ArrayMinSize(1)`, `ValidateNested({ each: true })` |
| `message` | string | Tidak | - | `IsOptional()`, `IsString()` |

#### Schema: CreateEmergencyIncidentDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `title` | string | Ya | - | `IsString()`, `MaxLength(300)` |
| `severity` | [AlertSeverity](#schema-alertseverity) | Ya | - | `IsEnum(AlertSeverity)` |
| `latitude` | number | Ya | - | - |
| `longitude` | number | Ya | - | - |
| `situation` | string | Ya | - | `IsString()` |
| `actionTaken` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `needs` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `attachmentFileIds` | string[] | Tidak | - | `IsOptional()`, `IsArray()`, `IsUUID('4', { each: true })` |

#### Schema: CreateIntegrationDto

Sumber: `apps/be/src/modules/integrations/integration.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `code` | string | Ya | - | `IsString()`, `MaxLength(80)` |
| `name` | string | Ya | - | `IsString()`, `MaxLength(180)` |
| `channelType` | string | Ya | - | `IsString()`, `MaxLength(80)` |
| `config` | Record<string, unknown> | Ya | - | `IsObject()` |
| `status` | [IntegrationStatus](#schema-integrationstatus) | Ya | - | `IsEnum(IntegrationStatus)` |

#### Schema: CreateJaringCoachingReportDto

Sumber: `apps/be/src/modules/jaring/jaring.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `title` | string | Ya | - | `IsString()`, `IsNotEmpty()`, `MaxLength(300)` |
| `content` | string | Ya | - | `IsString()`, `IsNotEmpty()`, `MaxLength(10000)` |
| `reportedAt` | string | Ya | - | `IsDateString( {}, { message: 'Tanggal dan waktu laporan pembinaan harus valid.' }, )` |

#### Schema: CreateJaringDto

Sumber: `apps/be/src/modules/jaring/jaring.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `aliasName` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(150)` |
| `whatsappNumber` | string | Ya | - | `IsString()`, `Matches(/^\d+$/, { message: 'Nomor WhatsApp hanya boleh berisi angka.' })`, `MaxLength(30)` |
| `fullName` | string | Ya | - | `IsString()`, `IsNotEmpty()`, `MaxLength(180)` |
| `nationalIdNumber` | string | Tidak | - | `IsOptional()`, `IsString()`, `Matches(/^\d{16}$/, { message: 'NIK harus terdiri dari tepat 16 digit angka.', })` |
| `address` | string | Ya | - | `IsString()`, `IsNotEmpty()`, `MaxLength(1000)` |
| `birthPlace` | string | Ya | - | `IsString()`, `IsNotEmpty()`, `MaxLength(120)` |
| `birthDate` | string | Ya | - | `IsDateString( {}, { message: 'Tanggal lahir harus berupa tanggal yang valid.' }, )` |
| `gender` | [JaringGender](#schema-jaringgender) | Ya | - | `IsEnum(JaringGender)` |
| `occupationId` | string | Ya | - | `IsUUID()` |
| `profilePhotoFileId` | string | Ya | - | `IsUUID(undefined, { message: 'Foto Jaring wajib diunggah.' })` |
| `workplace` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(180)` |
| `jobTitle` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(150)` |
| `joinedAt` | string | Ya | - | `IsDateString( {}, { message: 'Tanggal bergabung harus berupa tanggal yang valid.' }, )` |
| `organizationName` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(180)` |
| `politicalAffiliation` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(180)` |
| `fieldOfficerAssignmentId` | string | Ya | - | `IsUUID()` |
| `areaIds` | string[] | Ya | - | `IsArray()`, `ArrayMinSize(1)`, `ArrayMaxSize(1, { message: 'Satu Jaring hanya boleh memiliki satu Kelurahan/Desa cakupan.', })`, `IsUUID(undefined, { each: true })` |
| `notes` | string | Ya | - | `IsString()`, `IsNotEmpty()`, `MaxLength(3000)` |

#### Schema: CreateJaringOccupationDto

Sumber: `apps/be/src/modules/jaring/jaring.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `code` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(80)` |
| `name` | string | Ya | - | `IsString()`, `MinLength(2)`, `MaxLength(150)` |
| `description` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(1000)` |

#### Schema: CreateLocationPingDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `operationalAssignmentId` | string | Ya | - | `IsUUID()` |
| `latitude` | number | Ya | - | `IsNumber()` |
| `longitude` | number | Ya | - | `IsNumber()` |
| `gpsAccuracyMeters` | number | Tidak | - | `IsOptional()`, `IsNumber()` |
| `coordinateSource` | string | Ya | - | `IsString()` |
| `capturedAt` | string | Ya | - | `IsDateString()` |
| `isStealth` | boolean | Tidak | - | `IsOptional()`, `IsBoolean()` |

#### Schema: CreateOrganizationUnitDto

Sumber: `apps/be/src/modules/organization/dto/organization.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `code` | string | Ya | - | `IsString()`, `MinLength(2)`, `MaxLength(80)` |
| `name` | string | Ya | - | `IsString()`, `MinLength(2)`, `MaxLength(180)` |
| `type` | [OrganizationType](#schema-organizationtype) | Ya | - | `IsEnum(OrganizationType)` |
| `parentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |

#### Schema: CreatePositionAssignmentDto

Sumber: `apps/be/src/modules/positions/dto/position.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `userProfileId` | string | Ya | - | `IsUUID()` |
| `positionId` | string | Ya | - | `IsUUID()` |
| `isPrimary` | boolean | Ya | - | `IsBoolean()` |
| `validFrom` | string | Ya | - | `IsDateString()` |
| `validUntil` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `areaScopeIds` | string[] | Tidak | - | `IsOptional()`, `IsArray()`, `ArrayMinSize(1)`, `IsUUID(undefined, { each: true })` |

#### Schema: CreatePositionDto

Sumber: `apps/be/src/modules/positions/dto/position.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `seatCode` | string | Ya | - | `IsString()`, `MinLength(2)`, `MaxLength(100)` |
| `code` | [PositionCode](#schema-positioncode) | Ya | - | `IsEnum(PositionCode)` |
| `title` | string | Ya | - | `IsString()`, `MinLength(2)`, `MaxLength(180)` |
| `roleId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `roleCode` | [RoleCode](#schema-rolecode) | Tidak | - | `IsOptional()`, `IsEnum(RoleCode)` |
| `branch` | [CommandRouteType](#schema-commandroutetype) | Tidak | - | `IsOptional()`, `IsEnum(CommandRouteType)` |
| `organizationUnitId` | string | Ya | - | `IsUUID()` |
| `reportsToPositionId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `areaScopeIds` | string[] | Ya | - | `IsArray()`, `ArrayMinSize(1)`, `IsUUID(undefined, { each: true })` |
| `primaryAreaId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |

#### Schema: CreateProductDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `productTypeId` | string | Ya | - | `IsUUID()` |
| `ownerAssignmentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `productNumber` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(150)` |
| `classification` | [Classification](#schema-classification) | Ya | - | `IsEnum(Classification)` |
| `title` | string | Ya | - | `IsString()`, `MaxLength(300)` |
| `periodStart` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `periodEnd` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `version` | [ProductVersionPayloadDto](#schema-productversionpayloaddto) | Ya | - | `ValidateNested()` |

#### Schema: CreateProductRevisionDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `basedOnVersionId` | string | Ya | - | `IsUUID()` |
| `changeReason` | string | Ya | - | `IsString()` |
| `patch` | [ProductVersionPayloadDto](#schema-productversionpayloaddto) | Ya | - | `ValidateNested()` |

#### Schema: CreateProductTemplateDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `name` | string | Ya | - | `IsString()`, `MaxLength(180)` |
| `sections` | [ProductTemplateSectionDto](#schema-producttemplatesectiondto)[] | Ya | - | `IsArray()`, `ArrayMinSize(1)`, `ValidateNested({ each: true })` |
| `activate` | boolean | Tidak | - | `IsOptional()`, `IsBoolean()` |

#### Schema: CreateProductTypeDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `code` | string | Ya | - | `IsString()`, `MaxLength(80)` |
| `name` | string | Ya | - | `IsString()`, `MaxLength(180)` |
| `formatNo` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(30)` |
| `numberCode` | string | Ya | - | `IsString()`, `MaxLength(20)` |
| `description` | string | Tidak | - | `IsOptional()`, `IsString()` |

#### Schema: CreateReportCategoryDto

Sumber: `apps/be/src/modules/jaring/jaring.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `code` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(80)` |
| `name` | string | Ya | - | `IsString()`, `MinLength(2)`, `MaxLength(120)` |
| `description` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(1000)` |

#### Schema: CreateRevisionRequestDto

Sumber: `apps/be/src/modules/baket/baket.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `requestedAgainstVersionId` | string | Ya | - | `IsUUID()` |
| `reason` | string | Ya | - | `IsString()`, `MinLength(2)` |
| `requiredInformation` | string | Ya | - | `IsString()`, `MinLength(2)` |
| `dueDate` | string | Tidak | - | `IsOptional()`, `IsDateString()` |

#### Schema: CreateTaskDto

Sumber: `apps/be/src/modules/tasks/task.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `parentTaskId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `directiveVersionId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `uukStrVersionId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `ownerAssignmentId` | string | Ya | - | `IsUUID()` |
| `title` | string | Ya | - | `IsString()`, `MaxLength(300)` |
| `description` | string | Ya | - | `IsString()`, `MaxLength(10000)` |
| `priority` | [PriorityLevel](#schema-prioritylevel) | Ya | - | `IsEnum(PriorityLevel)` |
| `dueDate` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `targetAreaIds` | string[] | Ya | - | `IsArray()`, `ArrayMinSize(1)`, `IsUUID(undefined, { each: true })` |

#### Schema: CreateUukDto

Sumber: `apps/be/src/modules/uuk/uuk.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `directiveVersionId` | string | Ya | - | `IsUUID()` |
| `ownerAssignmentId` | string | Ya | - | `IsUUID()` |
| `title` | string | Ya | - | `IsString()`, `MaxLength(300)` |
| `sections` | [SectionDto](#schema-sectiondto)[] | Ya | - | `IsArray()`, `ArrayMinSize(1)`, `ValidateNested({ each: true })` |

#### Schema: CreateUukRevisionDto

Sumber: `apps/be/src/modules/uuk/uuk.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `basedOnVersionId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `title` | string | Ya | - | `IsString()`, `MaxLength(300)` |
| `changeReason` | string | Ya | - | `IsString()`, `MinLength(2)`, `MaxLength(2000)` |
| `sections` | [SectionDto](#schema-sectiondto)[] | Ya | - | `IsArray()`, `ArrayMinSize(1)`, `ValidateNested({ each: true })` |

#### Schema: CreateVerificationDto

Sumber: `apps/be/src/modules/baket/baket.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `summary` | string | Tidak | - | `IsOptional()`, `IsString()` |

#### Schema: CrossReferenceDto

Sumber: `apps/be/src/modules/baket/baket.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `relatedBaketId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `externalRef` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `description` | string | Tidak | - | `IsOptional()`, `IsString()` |

#### Schema: DashboardAreaBreakdownQuery

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

Mewarisi: [DashboardQuery](#schema-dashboardquery)

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `metric` | string | Ya | - | `IsString()` |
| `areaId` | string | Ya | - | `IsUUID()` |
| `childLevel` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `limit` | inferred | Tidak | `100` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(1000)` |

#### Schema: DashboardDirectiveProgressQuery

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

Mewarisi: [DashboardQuery](#schema-dashboardquery)

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `directiveId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `unitId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |

#### Schema: DashboardQuery

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `areaId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `from` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `to` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `ownerAssignmentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |

#### Schema: DashboardTaskPerformanceQuery

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

Mewarisi: [DashboardQuery](#schema-dashboardquery)

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `unitId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `groupBy` | string | Ya | - | `IsString()` |

#### Schema: DashboardTrendQuery

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

Mewarisi: [DashboardQuery](#schema-dashboardquery)

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `metric` | string | Ya | - | `IsString()` |
| `interval` | string | Ya | - | `IsString()` |
| `groupBy` | string | Tidak | - | `IsOptional()`, `IsString()` |

#### Schema: DashboardVerificationQualityQuery

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

Mewarisi: [DashboardQuery](#schema-dashboardquery)

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `unitId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |

#### Schema: DecisionNoteDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `note` | string | Tidak | - | `IsOptional()`, `IsString()` |

#### Schema: DirectiveAiScope

Sumber: `apps/be/src/modules/directives/directive.dto.ts`

Enum: `full`, `eei`, `collection`, `recommendation`, `polish`

#### Schema: DirectiveQuery

Sumber: `apps/be/src/modules/directives/directive.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `page` | inferred | Tidak | `1` | `IsOptional()`, `IsInt()`, `Min(1)` |
| `limit` | inferred | Tidak | `20` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(100)` |
| `status` | [DirectiveStatus](#schema-directivestatus) | Tidak | - | `IsOptional()`, `IsEnum(DirectiveStatus)` |
| `ownerAssignmentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `areaId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `from` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `to` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `deadlineFrom` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `deadlineTo` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `search` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `classification` | [Classification](#schema-classification) | Tidak | - | `IsOptional()`, `IsEnum(Classification)` |
| `urgency` | [PriorityLevel](#schema-prioritylevel) | Tidak | - | `IsOptional()`, `IsEnum(PriorityLevel)` |
| `recipientBranch` | [CommandRouteType](#schema-commandroutetype) | Tidak | - | `IsOptional()`, `IsEnum(CommandRouteType)` |
| `assignedToMe` | boolean | Tidak | - | `IsOptional()`, `IsBoolean()` |
| `sortBy` | [DirectiveSortField](#schema-directivesortfield) | Tidak | - | `IsOptional()`, `IsEnum(DirectiveSortField)` |
| `sortOrder` | [SortOrder](#schema-sortorder) | Tidak | - | `IsOptional()`, `IsEnum(SortOrder)` |
| `paginated` | boolean | Tidak | - | `IsOptional()`, `IsBoolean()` |

#### Schema: DirectiveRevisionPatchDto

Sumber: `apps/be/src/modules/directives/directive.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `urgency` | [PriorityLevel](#schema-prioritylevel) | Tidak | - | `IsOptional()`, `IsEnum(PriorityLevel)` |
| `dueDate` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `strategicIssue` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `commandDescription` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `targetAreaIds` | string[] | Tidak | - | `IsOptional()`, `IsArray()`, `ArrayMinSize(1)`, `IsUUID(undefined, { each: true })` |
| `recipients` | [VersionRecipientDto](#schema-versionrecipientdto)[] | Tidak | - | `IsOptional()`, `IsArray()`, `ArrayMinSize(1)`, `ValidateNested({ each: true })` |

#### Schema: DirectiveSortField

Sumber: `apps/be/src/modules/directives/directive.dto.ts`

Enum: `updatedAt`, `dueDate`, `effectiveDeadline`

#### Schema: DirectiveStatus

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type DirectiveStatus = (typeof DirectiveStatus)[keyof typeof DirectiveStatus];
```

#### Schema: DirectiveVersionCreateDto

Sumber: `apps/be/src/modules/directives/directive.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `commandNumber` | string | Ya | - | `IsString()`, `MinLength(3)`, `MaxLength(120)` |
| `classification` | [Classification](#schema-classification) | Ya | - | `IsEnum(Classification)` |
| `urgency` | [PriorityLevel](#schema-prioritylevel) | Tidak | - | `IsOptional()`, `IsEnum(PriorityLevel)` |
| `commandSource` | string | Ya | - | `IsString()`, `MaxLength(250)` |
| `commandIssuer` | string | Ya | - | `IsString()`, `MaxLength(250)` |
| `commandDate` | string | Ya | - | `IsDateString()` |
| `dueDate` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `strategicIssue` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `commandDescription` | string | Ya | - | `IsString()` |
| `targetAreaIds` | string[] | Ya | - | `IsArray()`, `ArrayMinSize(1)`, `IsUUID(undefined, { each: true })` |
| `recipients` | [VersionRecipientDto](#schema-versionrecipientdto)[] | Ya | - | `IsArray()`, `ArrayMinSize(1)`, `ValidateNested({ each: true })` |

#### Schema: DistributeDirectiveDto

Sumber: `apps/be/src/modules/directives/directive.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `sendNotifications` | boolean | Ya | - | `IsBoolean()` |
| `scheduledAt` | string | Tidak | - | `IsOptional()`, `IsDateString()` |

#### Schema: DistributionQuery

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `page` | inferred | Tidak | `1` | `IsOptional()`, `IsInt()`, `Min(1)` |
| `limit` | inferred | Tidak | `20` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(100)` |
| `productId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `status` | [DistributionStatus](#schema-distributionstatus) | Tidak | - | `IsOptional()`, `IsEnum(DistributionStatus)` |
| `targetAssignmentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `targetUserProfileId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `from` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `to` | string | Tidak | - | `IsOptional()`, `IsDateString()` |

#### Schema: DistributionStatus

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type DistributionStatus = (typeof DistributionStatus)[keyof typeof DistributionStatus];
```

#### Schema: DistributionTargetDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `targetAssignmentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `targetUserProfileId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |

#### Schema: DuplicateDto

Sumber: `apps/be/src/modules/whatsapp/whatsapp.dto.ts`

Mewarisi: [ReasonDto](#schema-reasondto)

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `duplicateOfMessageId` | string | Ya | - | `IsUUID()` |

#### Schema: EmergencyQuery

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `cursor` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `limit` | inferred | Tidak | `20` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(100)` |
| `status` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `severity` | [AlertSeverity](#schema-alertseverity) | Tidak | - | `IsOptional()`, `IsEnum(AlertSeverity)` |
| `areaId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `from` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `to` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `reportedByAssignmentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |

#### Schema: EnumQuery

Sumber: `apps/be/src/modules/system/system.controller.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `names` | string | Tidak | - | `IsOptional()`, `IsString()` |

#### Schema: ExecutiveDashboardFilterQueryDto

Sumber: `apps/be/src/modules/executive-dashboard/executive-dashboard.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `search` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `areaId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `limit` | inferred | Tidak | `100` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(200)` |

#### Schema: ExecutiveDashboardPeriod

Sumber: `apps/be/src/modules/executive-dashboard/executive-dashboard.dto.ts`

Enum: `TODAY`, `LAST_7_DAYS`, `LAST_30_DAYS`, `CURRENT_MONTH`, `CURRENT_YEAR`, `CUSTOM`

#### Schema: ExecutiveDashboardQueryDto

Sumber: `apps/be/src/modules/executive-dashboard/executive-dashboard.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `period` | [ExecutiveDashboardPeriod](#schema-executivedashboardperiod) | Tidak | `ExecutiveDashboardPeriod.LAST_30_DAYS` | `IsOptional()`, `IsEnum(ExecutiveDashboardPeriod)` |
| `from` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `to` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `timezone` | inferred | Tidak | `'Asia/Jakarta'` | `IsOptional()`, `IsIn(['Asia/Jakarta'])` |
| `areaId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `categoryId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `productTypeId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `jaringId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `fieldOfficerAssignmentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `urgency` | [PriorityLevel](#schema-prioritylevel) | Tidak | - | `IsOptional()`, `IsEnum(PriorityLevel)` |
| `reportStatus` | [WhatsAppReportSessionStatus](#schema-whatsappreportsessionstatus) | Tidak | - | `IsOptional()`, `IsEnum(WhatsAppReportSessionStatus)` |
| `workflowStatus` | [BaketStatus](#schema-baketstatus) | Tidak | - | `IsOptional()`, `IsEnum(BaketStatus)` |
| `validationStatus` | [VerificationStatus](#schema-verificationstatus) | Tidak | - | `IsOptional()`, `IsEnum(VerificationStatus)` |
| `coordinateSource` | [CoordinateSource](#schema-coordinatesource) | Tidak | - | `IsOptional()`, `IsEnum(CoordinateSource)` |
| `source` | 'WHATSAPP' | Tidak | - | `IsOptional()`, `IsIn(['WHATSAPP'])` |
| `completeness` | 'COMPLETE' \| 'INCOMPLETE' | Tidak | - | `IsOptional()`, `IsIn(['COMPLETE', 'INCOMPLETE'])` |
| `verificationStatus` | 'WAITING' \| 'NEEDS_REVIEW' \| 'VERIFIED' | Tidak | - | `IsOptional()`, `IsIn(['WAITING', 'NEEDS_REVIEW', 'VERIFIED'])` |
| `hasAttachment` | 'true' \| 'false' | Tidak | - | `IsOptional()`, `IsIn(['true', 'false'])` |
| `locationSuitability` | 'WITHIN_SCOPE' \| 'OUTSIDE_SCOPE' \| 'BORDER_AMBIGUOUS' \| 'NOT_CHECKED' | Tidak | - | `IsOptional()`, `IsIn(['WITHIN_SCOPE', 'OUTSIDE_SCOPE', 'BORDER_AMBIGUOUS', 'NOT_CHECKED'])` |

#### Schema: ExecutivePersonnelListQuery

Sumber: `apps/be/src/modules/executive-personnel/executive-personnel.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `page` | inferred | Tidak | `1` | `IsOptional()`, `IsInt()`, `Min(1)` |
| `limit` | inferred | Tidak | `20` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(100)` |
| `search` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `status` | [UserProfileStatus](#schema-userprofilestatus) | Tidak | - | `IsOptional()`, `IsEnum(UserProfileStatus)` |
| `roleCode` | [RoleCode](#schema-rolecode) | Tidak | - | `IsOptional()`, `IsEnum(RoleCode)` |
| `unitId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `provinceId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `regencyId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `districtId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |

#### Schema: ExecutivePersonnelMapQuery

Sumber: `apps/be/src/modules/executive-personnel/executive-personnel.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `search` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `activeWithinMinutes` | inferred | Tidak | `30` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(1440)` |
| `recentWithinHours` | inferred | Tidak | `24` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(168)` |
| `unitId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `provinceId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `regencyId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `districtId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |

#### Schema: FieldCoordinatorPersonnelAreaFilterQuery

Sumber: `apps/be/src/modules/executive-personnel/executive-personnel.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `provinceId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `regencyId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |

#### Schema: FieldIntelligenceDashboardQuery

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

Mewarisi: [DashboardQuery](#schema-dashboardquery)

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `page` | inferred | Tidak | `1` | `IsOptional()`, `IsInt()`, `Min(1)` |
| `limit` | inferred | Tidak | `12` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(50)` |
| `search` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(120)` |
| `jaringStatus` | [JaringStatus](#schema-jaringstatus) | Tidak | - | `IsOptional()`, `IsEnum(JaringStatus)` |
| `registrationStatus` | [JaringRegistrationStatus](#schema-jaringregistrationstatus) | Tidak | - | `IsOptional()`, `IsEnum(JaringRegistrationStatus)` |
| `baketStatus` | [BaketStatus](#schema-baketstatus) | Tidak | - | `IsOptional()`, `IsEnum(BaketStatus)` |
| `urgency` | [PriorityLevel](#schema-prioritylevel) | Tidak | - | `IsOptional()`, `IsEnum(PriorityLevel)` |
| `activity` | [JaringActivityLevel](#schema-jaringactivitylevel) | Tidak | - | `IsOptional()`, `IsEnum(JaringActivityLevel)` |
| `period` | [FieldIntelligencePeriod](#schema-fieldintelligenceperiod) | Tidak | `FieldIntelligencePeriod.DAYS_30` | `IsOptional()`, `IsEnum(FieldIntelligencePeriod)` |

#### Schema: FieldIntelligencePeriod

Sumber: `apps/be/src/modules/intelligence-products/field-intelligence.util.ts`

Enum: `7d`, `30d`, `90d`, `all`

#### Schema: FileAccessQueryDto

Sumber: `apps/be/src/modules/files/dto/file.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `disposition` | 'inline' \| 'attachment' | Tidak | `'inline'` | `IsOptional()`, `IsIn(['inline', 'attachment'])` |
| `ttlSeconds` | inferred | Tidak | `300` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(300)` |

#### Schema: FileType

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type FileType = (typeof FileType)[keyof typeof FileType];
```

#### Schema: FinalizeAnalysisDto

Sumber: `apps/be/src/modules/analysis/analysis.dto.ts`

Mewarisi: [CreateAnalysisVersionDto](#schema-createanalysisversiondto)

Tidak mendeklarasikan field tambahan pada class/interface ini.

#### Schema: ForwardJaringInstructionDto

Sumber: `apps/be/src/modules/tasks/task.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `instruction` | string | Ya | - | `IsString()`, `MinLength(2)`, `MaxLength(5000)` |
| `jaringIds` | string[] | Tidak | - | `IsOptional()`, `IsArray()`, `IsUUID(undefined, { each: true })` |

#### Schema: GenerateDirectiveAiDto

Sumber: `apps/be/src/modules/directives/directive.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `scope` | [DirectiveAiScope](#schema-directiveaiscope) | Ya | - | `IsEnum(DirectiveAiScope)` |
| `strategicIssue` | string | Ya | - | `IsString()`, `MinLength(3)`, `MaxLength(10000)` |
| `title` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(500)` |
| `commandNarrative` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(20000)` |
| `sections` | Record<string, string> | Tidak | - | `IsOptional()`, `IsObject()` |
| `context` | Record<string, unknown> | Tidak | - | `IsOptional()`, `IsObject()` |

#### Schema: InformationCredibility

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type InformationCredibility = (typeof InformationCredibility)[keyof typeof InformationCredibility];
```

#### Schema: IntegrationQuery

Sumber: `apps/be/src/modules/integrations/integration.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `status` | [IntegrationStatus](#schema-integrationstatus) | Tidak | - | `IsOptional()`, `IsEnum(IntegrationStatus)` |
| `channelType` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(80)` |

#### Schema: IntegrationStatus

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type IntegrationStatus = (typeof IntegrationStatus)[keyof typeof IntegrationStatus];
```

#### Schema: IntelEntityType

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type IntelEntityType = (typeof IntelEntityType)[keyof typeof IntelEntityType];
```

#### Schema: JaringActivityLevel

Sumber: `apps/be/src/modules/intelligence-products/field-intelligence.util.ts`

Enum: `VERY_ACTIVE`, `ACTIVE`, `DORMANT`, `NEVER_REPORTED`

#### Schema: JaringCoachingReportQuery

Sumber: `apps/be/src/modules/jaring/jaring.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `page` | inferred | Tidak | `1` | `IsOptional()`, `IsInt()`, `Min(1)` |
| `limit` | inferred | Tidak | `20` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(100)` |
| `search` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(200)` |
| `jaringId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `areaId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `from` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `to` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `sortBy` | 'reportedAt' \| 'createdAt' \| 'updatedAt' \| 'title' | Tidak | - | `IsOptional()`, `IsIn(['reportedAt', 'createdAt', 'updatedAt', 'title'])` |
| `sortOrder` | 'asc' \| 'desc' | Tidak | - | `IsOptional()`, `IsIn(['asc', 'desc'])` |

#### Schema: JaringGender

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type JaringGender = (typeof JaringGender)[keyof typeof JaringGender];
```

#### Schema: JaringOccupationQuery

Sumber: `apps/be/src/modules/jaring/jaring.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `limit` | inferred | Tidak | `100` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(200)` |
| `search` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `includeInactive` | inferred | Tidak | `false` | `IsOptional()`, `IsBoolean()` |

#### Schema: JaringQuery

Sumber: `apps/be/src/modules/jaring/jaring.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `page` | inferred | Tidak | `1` | `IsOptional()`, `IsInt()`, `Min(1)` |
| `limit` | inferred | Tidak | `20` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(100)` |
| `search` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `status` | [JaringStatus](#schema-jaringstatus) | Tidak | - | `IsOptional()`, `IsString()` |
| `registrationStatus` | [JaringRegistrationStatus](#schema-jaringregistrationstatus) | Tidak | - | `IsOptional()`, `IsEnum(JaringRegistrationStatus)` |
| `areaId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `occupationId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `fieldOfficerAssignmentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `paginated` | boolean | Tidak | - | `IsOptional()`, `IsBoolean()` |

#### Schema: JaringRegistrationStatus

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type JaringRegistrationStatus = (typeof JaringRegistrationStatus)[keyof typeof JaringRegistrationStatus];
```

#### Schema: JaringReportQuery

Sumber: `apps/be/src/modules/jaring/jaring.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `page` | inferred | Tidak | `1` | `IsOptional()`, `IsInt()`, `Min(1)` |
| `limit` | inferred | Tidak | `20` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(100)` |
| `status` | [WhatsAppReportSessionStatus](#schema-whatsappreportsessionstatus) | Tidak | - | `IsOptional()`, `IsEnum(WhatsAppReportSessionStatus)` |
| `jaringId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `fieldOfficerAssignmentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `registrationStatus` | [JaringRegistrationStatus](#schema-jaringregistrationstatus) | Tidak | - | `IsOptional()`, `IsEnum(JaringRegistrationStatus)` |
| `from` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `to` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `search` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(200)` |
| `categoryId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `areaId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `jaringAreaId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `workflowStatus` | [BaketStatus](#schema-baketstatus) | Tidak | - | `IsOptional()`, `IsEnum(BaketStatus)` |
| `coordinateSource` | [CoordinateSource](#schema-coordinatesource) | Tidak | - | `IsOptional()`, `IsEnum(CoordinateSource)` |
| `urgency` | [PriorityLevel](#schema-prioritylevel) | Tidak | - | `IsOptional()`, `IsEnum(PriorityLevel)` |
| `verificationStatus` | string | Tidak | - | `IsOptional()`, `IsIn([ 'IN_PROGRESS_BY_JARING', 'NOT_SUBMITTED', 'WAITING_FIELD_OFFICER_VERIFICATION', 'NEEDS_FIELD_OFFICER_REVIEW', 'VERIFIED_BY_FIELD_OFFICER', 'METADATA_RECORDED', 'UNVERIFIED', 'WAITING', 'NEEDS_REVIEW', 'VERIFIED', ])` |
| `completeness` | 'COMPLETE' \| 'INCOMPLETE' | Tidak | - | `IsOptional()`, `IsIn(['COMPLETE', 'INCOMPLETE'])` |
| `hasAttachment` | 'true' \| 'false' | Tidak | - | `IsOptional()`, `IsIn(['true', 'false'])` |
| `locationSuitability` | 'WITHIN_SCOPE' \| 'OUTSIDE_SCOPE' \| 'BORDER_AMBIGUOUS' \| 'NOT_DETERMINED' | Tidak | - | `IsOptional()`, `IsIn(['WITHIN_SCOPE', 'OUTSIDE_SCOPE', 'BORDER_AMBIGUOUS', 'NOT_DETERMINED'])` |
| `sortBy` | 'reportedAt' \| 'createdAt' \| 'updatedAt' \| 'referenceNumber' | Tidak | - | `IsOptional()`, `IsIn(['reportedAt', 'createdAt', 'updatedAt', 'referenceNumber'])` |
| `sortOrder` | 'asc' \| 'desc' | Tidak | - | `IsOptional()`, `IsIn(['asc', 'desc'])` |
| `stage` | 'ALL' \| 'JARING_REPORT' \| 'DRAFT_BAKET' \| 'VALIDATED_BAKET' | Tidak | - | `IsOptional()`, `IsIn(['ALL', 'JARING_REPORT', 'DRAFT_BAKET', 'VALIDATED_BAKET'])` |

#### Schema: JaringStatus

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type JaringStatus = (typeof JaringStatus)[keyof typeof JaringStatus];
```

#### Schema: LinkDto

Sumber: `apps/be/src/modules/whatsapp/whatsapp.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `jaringId` | string | Ya | - | `IsUUID()` |

#### Schema: LocationHistoryQuery

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `from` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `to` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `cursor` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `limit` | inferred | Tidak | `100` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(1000)` |

#### Schema: LockUserDto

Sumber: `apps/be/src/modules/users/dto/user-profile.dto.ts`

Mewarisi: [ReasonDto](#schema-reasondto)

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `lockedUntil` | string | Tidak | - | `IsOptional()`, `IsDateString()` |

#### Schema: ManualAreaOverrideDto

Sumber: `apps/be/src/modules/baket/baket.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `eventAreaId` | string | Ya | - | `IsUUID()` |
| `reason` | string | Ya | - | `IsString()`, `MinLength(2)`, `MaxLength(2000)` |

#### Schema: MapAreaSummaryQuery

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `areaId` | string | Ya | - | `IsUUID()` |
| `from` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `to` | string | Tidak | - | `IsOptional()`, `IsDateString()` |

#### Schema: MapHeatmapQuery

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

Mewarisi: [MapReportQuery](#schema-mapreportquery)

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `metric` | string | Tidak | - | `IsOptional()`, `IsString()` |

#### Schema: MapMarkersQuery

Sumber: `apps/be/src/modules/map-markers/map-markers.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `types` | [MapMarkerType](#schema-mapmarkertype)[] | Tidak | `[MapMarkerType.BAKET, MapMarkerType.AGENT]` | `IsOptional()`, `List()`, `IsEnum(MapMarkerType, { each: true })` |
| `bbox` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `areaIds` | string[] | Tidak | - | `IsOptional()`, `List()`, `IsUUID('4', { each: true })` |
| `areaCodes` | string[] | Tidak | - | `IsOptional()`, `List()`, `IsString({ each: true })` |
| `areaLevels` | [AdministrativeLevel](#schema-administrativelevel)[] | Tidak | - | `IsOptional()`, `List()`, `IsEnum(AdministrativeLevel, { each: true })` |
| `categoryIds` | string[] | Tidak | - | `IsOptional()`, `List()`, `IsUUID('4', { each: true })` |
| `categoryCodes` | string[] | Tidak | - | `IsOptional()`, `List()`, `IsString({ each: true })` |
| `jaringIds` | string[] | Tidak | - | `IsOptional()`, `List()`, `IsUUID('4', { each: true })` |
| `fieldOfficerAssignmentIds` | string[] | Tidak | - | `IsOptional()`, `List()`, `IsUUID('4', { each: true })` |
| `reportValidity` | [ReportValidityFilter](#schema-reportvalidityfilter)[] | Tidak | - | `IsOptional()`, `List()`, `IsEnum(ReportValidityFilter, { each: true })` |
| `completeness` | [ReportCompletenessFilter](#schema-reportcompletenessfilter)[] | Tidak | - | `IsOptional()`, `List()`, `IsEnum(ReportCompletenessFilter, { each: true })` |
| `hasCoordinates` | boolean | Tidak | - | `IsOptional()`, `BooleanValue()`, `IsBoolean()` |
| `hasAttachments` | boolean | Tidak | - | `IsOptional()`, `BooleanValue()`, `IsBoolean()` |
| `coordinateSources` | [CoordinateSource](#schema-coordinatesource)[] | Tidak | - | `IsOptional()`, `List()`, `IsEnum(CoordinateSource, { each: true })` |
| `locationSuitability` | [ReportLocationSuitabilityFilter](#schema-reportlocationsuitabilityfilter)[] | Tidak | - | `IsOptional()`, `List()`, `IsEnum(ReportLocationSuitabilityFilter, { each: true })` |
| `baketStatuses` | [BaketStatus](#schema-baketstatus)[] | Tidak | - | `IsOptional()`, `List()`, `IsEnum(BaketStatus, { each: true })` |
| `urgencies` | [PriorityLevel](#schema-prioritylevel)[] | Tidak | - | `IsOptional()`, `List()`, `IsEnum(PriorityLevel, { each: true })` |
| `agentStates` | [AgentLocationState](#schema-agentlocationstate)[] | Tidak | - | `IsOptional()`, `List()`, `IsEnum(AgentLocationState, { each: true })` |
| `unitIds` | string[] | Tidak | - | `IsOptional()`, `List()`, `IsUUID('4', { each: true })` |
| `assignmentIds` | string[] | Tidak | - | `IsOptional()`, `List()`, `IsUUID('4', { each: true })` |
| `from` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `to` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `q` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `activeWithinMinutes` | inferred | Tidak | `15` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(1440)` |
| `lastKnownWithinHours` | inferred | Tidak | `168` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(2160)` |
| `limitPerType` | inferred | Tidak | `1000` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(5000)` |
| `includeAreaHierarchy` | inferred | Tidak | `true` | `IsOptional()`, `BooleanValue()`, `IsBoolean()` |

#### Schema: MapMarkerType

Sumber: `apps/be/src/modules/map-markers/map-markers.dto.ts`

Enum: `report`, `baket`, `agent`

#### Schema: MapReportQuery

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

Mewarisi: [DashboardQuery](#schema-dashboardquery)

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `bbox` | string | Ya | - | `IsString()` |
| `zoom` | number | Ya | - | `IsInt()` |
| `status` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `urgency` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `limit` | inferred | Tidak | `500` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(5000)` |

#### Schema: MarkControlledDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `note` | string | Ya | - | `IsString()` |

#### Schema: MarkDeliveredDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `deliveredAt` | string | Ya | - | `IsDateString()` |
| `providerReceipt` | string | Tidak | - | `IsOptional()`, `IsString()` |

#### Schema: MessageQuery

Sumber: `apps/be/src/modules/whatsapp/whatsapp.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `limit` | inferred | Tidak | `50` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(100)` |
| `status` | [WhatsAppMessageStatus](#schema-whatsappmessagestatus) | Tidak | - | `IsOptional()`, `IsString()` |
| `jaringId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |

#### Schema: MoveAreaDto

Sumber: `apps/be/src/modules/areas/dto/area.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `newParentId` | string | Ya | - | `IsUUID()` |
| `reason` | string | Ya | - | `IsString()`, `MinLength(2)`, `MaxLength(1000)` |

#### Schema: MoveOrganizationUnitDto

Sumber: `apps/be/src/modules/organization/dto/organization.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `newParentId` | string | Ya | - | `IsUUID()` |
| `reason` | string | Ya | - | `IsString()`, `MinLength(2)`, `MaxLength(1000)` |

#### Schema: NeedsDevelopmentDto

Sumber: `apps/be/src/modules/baket/baket.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `reason` | string | Ya | - | `IsString()`, `MinLength(2)` |
| `requiredInformation` | string | Ya | - | `IsString()`, `MinLength(2)` |
| `dueDate` | string | Tidak | - | `IsOptional()`, `IsDateString()` |

#### Schema: NoteDto

Sumber: `apps/be/src/modules/tasks/task.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `note` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(3000)` |

#### Schema: NotificationQuery

Sumber: `apps/be/src/modules/notifications/notification.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `limit` | inferred | Tidak | `20` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(100)` |
| `type` | [NotificationType](#schema-notificationtype) | Tidak | - | `IsOptional()`, `IsEnum(NotificationType)` |
| `unreadOnly` | inferred | Tidak | `false` | `IsOptional()` |
| `from` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `to` | string | Tidak | - | `IsOptional()`, `IsDateString()` |

#### Schema: NotificationType

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
```

#### Schema: OptionalNoteDto

Sumber: `apps/be/src/modules/directives/directive.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `note` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(1000)` |

#### Schema: OrganizationHierarchyQueryDto

Sumber: `apps/be/src/modules/organization/dto/organization.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `includeSelf` | inferred | Tidak | `false` | `IsOptional()`, `IsBoolean()` |
| `depth` | number | Tidak | - | `IsOptional()`, `IsInt()`, `Min(0)`, `Max(20)` |
| `type` | [OrganizationType](#schema-organizationtype) | Tidak | - | `IsOptional()`, `IsEnum(OrganizationType)` |

#### Schema: OrganizationListQueryDto

Sumber: `apps/be/src/modules/organization/dto/organization.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `page` | inferred | Tidak | `1` | `IsOptional()`, `IsInt()`, `Min(1)` |
| `limit` | inferred | Tidak | `20` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(100)` |
| `search` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(100)` |
| `type` | [OrganizationType](#schema-organizationtype) | Tidak | - | `IsOptional()`, `IsEnum(OrganizationType)` |
| `parentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `isActive` | boolean | Tidak | - | `IsOptional()`, `IsBoolean()` |

#### Schema: OrganizationTreeQueryDto

Sumber: `apps/be/src/modules/organization/dto/organization.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `maxDepth` | inferred | Tidak | `5` | `IsOptional()`, `IsInt()`, `Min(0)`, `Max(10)` |
| `includePositions` | inferred | Tidak | `false` | `IsOptional()`, `IsBoolean()` |

#### Schema: OrganizationType

Sumber: `apps/be/src/common/constants/legacy-operational-code.ts`

```ts
type OrganizationType = (typeof OrganizationType)[keyof typeof OrganizationType];
```

#### Schema: PersonnelAssignmentHistoryDto

Sumber: `apps/be/src/modules/users/dto/user-profile.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `name` | string | Ya | - | `IsString()`, `MinLength(2)`, `MaxLength(180)` |
| `unit` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(180)` |
| `location` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(180)` |
| `period` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(120)` |
| `description` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(1000)` |

#### Schema: PersonnelGender

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type PersonnelGender = (typeof PersonnelGender)[keyof typeof PersonnelGender];
```

#### Schema: PersonnelLocationMapQuery

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `areaId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `unitId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `capturedAfter` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `includeStealth` | inferred | Tidak | `false` | `IsOptional()`, `IsBoolean()` |

#### Schema: PersonnelMaritalStatus

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type PersonnelMaritalStatus = (typeof PersonnelMaritalStatus)[keyof typeof PersonnelMaritalStatus];
```

#### Schema: PersonnelPositionHistoryDto

Sumber: `apps/be/src/modules/users/dto/user-profile.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `title` | string | Ya | - | `IsString()`, `MinLength(2)`, `MaxLength(180)` |
| `organizationUnit` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(180)` |
| `area` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(180)` |
| `startedAt` | string | Ya | - | `IsDateString()` |
| `endedAt` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `status` | string | Ya | - | `IsString()`, `MaxLength(30)` |

#### Schema: PersonnelStatus

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type PersonnelStatus = (typeof PersonnelStatus)[keyof typeof PersonnelStatus];
```

#### Schema: PositionCode

Sumber: `apps/be/src/common/constants/legacy-operational-code.ts`

```ts
type PositionCode = (typeof PositionCode)[keyof typeof PositionCode];
```

#### Schema: PositionListQueryDto

Sumber: `apps/be/src/modules/positions/dto/position.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `page` | inferred | Tidak | `1` | `IsOptional()`, `IsInt()`, `Min(1)` |
| `limit` | inferred | Tidak | `20` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(100)` |
| `search` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(100)` |
| `code` | [PositionCode](#schema-positioncode) | Tidak | - | `IsOptional()`, `IsEnum(PositionCode)` |
| `roleCode` | [RoleCode](#schema-rolecode) | Tidak | - | `IsOptional()`, `IsEnum(RoleCode)` |
| `unitId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `reportsToPositionId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `isActive` | boolean | Tidak | - | `IsOptional()`, `IsBoolean()` |
| `availableOnly` | boolean | Tidak | - | `IsOptional()`, `IsBoolean()` |

#### Schema: PresignFileDto

Sumber: `apps/be/src/modules/files/dto/file.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `originalName` | string | Ya | - | `IsString()`, `MaxLength(255)` |
| `mimeType` | string | Ya | - | `IsString()`, `MaxLength(120)` |
| `fileType` | [FileType](#schema-filetype) | Ya | - | `IsEnum(FileType)` |
| `sizeBytes` | number | Ya | - | `IsInt()`, `Min(1)` |
| `checksumSha256` | string | Ya | - | `IsString()`, `MinLength(64)`, `MaxLength(64)` |
| `context` | string | Ya | - | `IsString()`, `MaxLength(80)` |

#### Schema: PriorityLevel

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type PriorityLevel = (typeof PriorityLevel)[keyof typeof PriorityLevel];
```

#### Schema: ProductQuery

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `page` | inferred | Tidak | `1` | `IsOptional()`, `IsInt()`, `Min(1)` |
| `limit` | inferred | Tidak | `20` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(100)` |
| `status` | [ProductStatus](#schema-productstatus) | Tidak | - | `IsOptional()`, `IsEnum(ProductStatus)` |
| `classification` | [Classification](#schema-classification) | Tidak | - | `IsOptional()`, `IsEnum(Classification)` |
| `productTypeId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `ownerAssignmentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `areaId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `periodFrom` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `periodTo` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `search` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `createdByAssignmentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `sortBy` | [ProductSortField](#schema-productsortfield) | Tidak | - | `IsOptional()`, `IsEnum(ProductSortField)` |
| `sortOrder` | [SortOrder](#schema-sortorder) | Tidak | - | `IsOptional()`, `IsEnum(SortOrder)` |

#### Schema: ProductSortField

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

Enum: `updatedAt`, `periodStart`

#### Schema: ProductStatus

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];
```

#### Schema: ProductTemplateFieldDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `code` | string | Ya | - | `IsString()`, `MaxLength(100)` |
| `label` | string | Ya | - | `IsString()`, `MaxLength(200)` |
| `dataType` | string | Ya | - | `IsString()`, `MaxLength(50)` |
| `isRequired` | boolean | Ya | - | `IsBoolean()` |
| `orderNumber` | number | Ya | - | `IsInt()`, `Min(1)` |
| `validation` | Record<string, unknown> | Tidak | - | `IsOptional()`, `IsObject()` |

#### Schema: ProductTemplateListQuery

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `activeOnly` | inferred | Tidak | `false` | `IsOptional()` |

#### Schema: ProductTemplateSectionDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `code` | string | Ya | - | `IsString()`, `MaxLength(100)` |
| `title` | string | Ya | - | `IsString()`, `MaxLength(200)` |
| `orderNumber` | number | Ya | - | `IsInt()`, `Min(1)` |
| `isRepeatable` | boolean | Ya | - | `IsBoolean()` |
| `fields` | [ProductTemplateFieldDto](#schema-producttemplatefielddto)[] | Ya | - | `IsArray()`, `ArrayMinSize(1)`, `ValidateNested({ each: true })` |

#### Schema: ProductTypeQuery

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `isActive` | boolean | Tidak | - | `IsOptional()` |

#### Schema: ProductVersionAttachmentDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `fileId` | string | Ya | - | `IsUUID()` |
| `caption` | string | Tidak | - | `IsOptional()`, `IsString()` |

#### Schema: ProductVersionListQuery

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `page` | inferred | Tidak | `1` | `IsOptional()`, `IsInt()`, `Min(1)` |
| `limit` | inferred | Tidak | `20` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(100)` |

#### Schema: ProductVersionPayloadDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `templateId` | string | Ya | - | `IsUUID()` |
| `routingTo` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `routingFrom` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `routingCc` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `subject` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(500)` |
| `content` | Record<string, unknown> | Ya | - | `IsObject()` |
| `sourceVerificationIds` | string[] | Tidak | - | `IsOptional()`, `IsArray()`, `IsUUID('4', { each: true })` |
| `sourceAnalysisVersionIds` | string[] | Tidak | - | `IsOptional()`, `IsArray()`, `IsUUID('4', { each: true })` |
| `attachmentFileIds` | [ProductVersionAttachmentDto](#schema-productversionattachmentdto)[] | Tidak | - | `IsOptional()`, `IsArray()`, `ValidateNested({ each: true })` |

#### Schema: ProgressDto

Sumber: `apps/be/src/modules/tasks/task.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `progressPercent` | number | Ya | - | `IsInt()`, `Min(0)`, `Max(100)` |
| `note` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(3000)` |

#### Schema: ProvisionAssignmentDto

Sumber: `apps/be/src/modules/users/dto/user-profile.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `branch` | [CommandRouteType](#schema-commandroutetype) | Ya | - | `IsEnum(CommandRouteType)` |
| `validFrom` | string | Ya | - | `IsDateString()` |

#### Schema: ProvisionAuthDto

Sumber: `apps/be/src/modules/users/dto/user-profile.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `name` | string | Tidak | - | `IsOptional()`, `IsString()`, `MinLength(2)`, `MaxLength(180)` |
| `email` | string | Tidak | - | `IsOptional()`, `IsEmail()`, `MaxLength(250)` |
| `password` | string | Ya | - | `IsString()`, `MinLength(8)`, `MaxLength(128)` |
| `role` | string | Ya | - | `IsString()`, `MaxLength(80)` |

#### Schema: ProvisionProfileDto

Sumber: `apps/be/src/modules/users/dto/user-profile.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `username` | string | Ya | - | `IsString()`, `MinLength(2)`, `MaxLength(100)` |
| `fullName` | string | Tidak | - | `IsOptional()`, `IsString()`, `MinLength(2)`, `MaxLength(180)` |
| `phone` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(30)` |
| `nationalIdNumber` | string | Tidak | - | `IsOptional()`, `IsString()`, `Matches(/^\d{16}$/, { message: 'nationalIdNumber must contain exactly 16 digits', })` |
| `birthPlace` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(120)` |
| `birthDate` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `gender` | [PersonnelGender](#schema-personnelgender) | Tidak | - | `IsOptional()`, `IsEnum(PersonnelGender)` |
| `religion` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(80)` |
| `maritalStatus` | [PersonnelMaritalStatus](#schema-personnelmaritalstatus) | Tidak | - | `IsOptional()`, `IsEnum(PersonnelMaritalStatus)` |
| `bloodType` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(5)` |
| `personnelNumber` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(80)` |
| `rankGrade` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(120)` |
| `personnelStatus` | [PersonnelStatus](#schema-personnelstatus) | Tidak | - | `IsOptional()`, `IsEnum(PersonnelStatus)` |
| `joinedAt` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `lastEducation` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(120)` |
| `educationInstitution` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(180)` |
| `educationMajor` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(150)` |
| `graduationYear` | number | Tidak | - | `IsOptional()`, `IsInt()`, `Min(1900)`, `Max(2100)` |
| `positionHistory` | [PersonnelPositionHistoryDto](#schema-personnelpositionhistorydto)[] | Tidak | - | `IsOptional()`, `IsArray()`, `ValidateNested({ each: true })` |
| `assignmentHistory` | [PersonnelAssignmentHistoryDto](#schema-personnelassignmenthistorydto)[] | Tidak | - | `IsOptional()`, `IsArray()`, `ValidateNested({ each: true })` |
| `competencies` | string[] | Tidak | - | `IsOptional()`, `IsArray()`, `IsString({ each: true })`, `MaxLength(80, { each: true })` |

#### Schema: ProvisionUserDto

Sumber: `apps/be/src/modules/users/dto/user-profile.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `auth` | [ProvisionAuthDto](#schema-provisionauthdto) | Ya | - | `ValidateNested()` |
| `profile` | [ProvisionProfileDto](#schema-provisionprofiledto) | Ya | - | `ValidateNested()` |
| `assignment` | [ProvisionAssignmentDto](#schema-provisionassignmentdto) | Ya | - | `ValidateNested()` |
| `areaScopeIds` | string[] | Ya | - | `IsArray()`, `ArrayMinSize(1)`, `IsUUID('all', { each: true })` |

#### Schema: PublishDirectiveDto

Sumber: `apps/be/src/modules/directives/directive.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `confirmation` | string | Ya | - | `IsString()` |
| `note` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(1000)` |

#### Schema: PublishDto

Sumber: `apps/be/src/modules/uuk/uuk.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `confirmation` | string | Ya | - | `IsString()` |

#### Schema: ReadAllDto

Sumber: `apps/be/src/modules/notifications/notification.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `before` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `types` | [NotificationType](#schema-notificationtype)[] | Tidak | - | `IsOptional()`, `IsArray()`, `IsEnum(NotificationType, { each: true })` |

#### Schema: ReasonDto

Sumber: `apps/be/src/modules/whatsapp/whatsapp.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `reason` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(1000)` |

#### Schema: ReassignDto

Sumber: `apps/be/src/modules/tasks/task.dto.ts`

Mewarisi: [ReasonDto](#schema-reasondto)

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `assigneeAssignmentId` | string | Ya | - | `IsUUID()` |
| `dueDate` | string | Tidak | - | `IsOptional()`, `IsDateString()` |

#### Schema: RegionalMasterQueryDto

Sumber: `apps/be/src/modules/organization/dto/organization.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `provinceAreaId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |

#### Schema: RejectApprovalDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `note` | string | Ya | - | `IsString()` |
| `confirmation` | string | Ya | - | `IsString()` |

#### Schema: RejectJaringDto

Sumber: `apps/be/src/modules/jaring/jaring.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `reason` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(1000)` |

#### Schema: RejectVerificationDto

Sumber: `apps/be/src/modules/baket/baket.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `reason` | string | Ya | - | `IsString()`, `MinLength(2)` |

#### Schema: ReplaceAreasDto

Sumber: `apps/be/src/modules/directives/directive.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `areaIds` | string[] | Ya | - | `IsArray()`, `ArrayMinSize(1)`, `IsUUID(undefined, { each: true })` |
| `primaryAreaId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |

#### Schema: ReplaceAssignmentScopesDto

Sumber: `apps/be/src/modules/positions/dto/position.dto.ts`

Mewarisi: [ReasonDto](#schema-reasondto)

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `areas` | [AssignmentScopeAreaDto](#schema-assignmentscopeareadto)[] | Ya | - | `IsArray()`, `ArrayMinSize(1)`, `ValidateNested({ each: true })` |
| `effectiveAt` | string | Ya | - | `IsDateString()` |

#### Schema: ReplaceAttachmentsDto

Sumber: `apps/be/src/modules/baket/baket.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `attachments` | [BaketAttachmentDto](#schema-baketattachmentdto)[] | Ya | - | `IsArray()`, `ValidateNested({ each: true })` |

#### Schema: ReplaceCrossReferencesDto

Sumber: `apps/be/src/modules/baket/baket.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `references` | [CrossReferenceDto](#schema-crossreferencedto)[] | Ya | - | `IsArray()`, `ValidateNested({ each: true })` |

#### Schema: ReplaceEntitiesDto

Sumber: `apps/be/src/modules/analysis/analysis.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `entities` | [AnalysisEntityDto](#schema-analysisentitydto)[] | Ya | - | `IsArray()`, `ValidateNested({ each: true })` |

#### Schema: ReplaceMessagesDto

Sumber: `apps/be/src/modules/baket/baket.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `messageIds` | string[] | Ya | - | `IsArray()`, `ArrayMinSize(1)`, `IsUUID('4', { each: true })` |

#### Schema: ReplaceOrganizationCoverageDto

Sumber: `apps/be/src/modules/organization/dto/organization.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `areas` | [CoverageAreaDto](#schema-coverageareadto)[] | Ya | - | `IsArray()`, `ArrayMinSize(1)`, `ValidateNested({ each: true })` |
| `reason` | string | Ya | - | `IsString()`, `MinLength(2)`, `MaxLength(1000)` |

#### Schema: ReplaceProductAttachmentsDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `attachments` | [ProductVersionAttachmentDto](#schema-productversionattachmentdto)[] | Ya | - | `IsArray()`, `ValidateNested({ each: true })` |

#### Schema: ReplaceRecipientsDto

Sumber: `apps/be/src/modules/directives/directive.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `recipients` | [VersionRecipientDto](#schema-versionrecipientdto)[] | Ya | - | `IsArray()`, `ArrayMinSize(1)`, `ValidateNested({ each: true })` |

#### Schema: ReplaceRelationshipsDto

Sumber: `apps/be/src/modules/analysis/analysis.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `relationships` | [AnalysisRelationshipDto](#schema-analysisrelationshipdto)[] | Ya | - | `IsArray()`, `ValidateNested({ each: true })` |

#### Schema: ReplaceSectionsDto

Sumber: `apps/be/src/modules/uuk/uuk.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `sections` | [SectionDto](#schema-sectiondto)[] | Ya | - | `IsArray()`, `ArrayMinSize(1)`, `ValidateNested({ each: true })` |

#### Schema: ReplaceSourceAnalysesDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `analysisVersionIds` | string[] | Ya | - | `IsArray()`, `ArrayMinSize(1)`, `IsUUID('4', { each: true })` |

#### Schema: ReplaceSourcesDto

Sumber: `apps/be/src/modules/analysis/analysis.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `verificationIds` | string[] | Ya | - | `IsArray()`, `ArrayMinSize(1)`, `IsUUID('4', { each: true })` |

#### Schema: ReplaceSourceVerificationsDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `verificationIds` | string[] | Ya | - | `IsArray()`, `ArrayMinSize(1)`, `IsUUID('4', { each: true })` |

#### Schema: ReportCategoryQuery

Sumber: `apps/be/src/modules/jaring/jaring.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `limit` | inferred | Tidak | `100` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(200)` |
| `search` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `includeInactive` | inferred | Tidak | `false` | `IsOptional()`, `IsBoolean()` |

#### Schema: ReportCompletenessFilter

Sumber: `apps/be/src/modules/map-markers/map-markers.dto.ts`

Enum: `COMPLETE`, `INCOMPLETE`

#### Schema: ReportLocationSuitabilityFilter

Sumber: `apps/be/src/modules/map-markers/map-markers.dto.ts`

Enum: `WITHIN_SCOPE`, `OUTSIDE_SCOPE`, `BORDER_AMBIGUOUS`, `NOT_DETERMINED`

#### Schema: ReportValidityFilter

Sumber: `apps/be/src/modules/map-markers/map-markers.dto.ts`

Enum: `VALID`, `NEEDS_REVIEW`, `WAITING`

#### Schema: RequestRevisionDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `note` | string | Ya | - | `IsString()` |
| `requiredChanges` | string[] | Ya | - | `IsArray()`, `ArrayMinSize(1)`, `IsString({ each: true })` |

#### Schema: RequiredReasonDto

Sumber: `apps/be/src/modules/directives/directive.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `reason` | string | Ya | - | `IsString()`, `MinLength(2)`, `MaxLength(2000)` |

#### Schema: ResetUserPasswordDto

Sumber: `apps/be/src/modules/users/dto/user-profile.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `password` | string | Ya | - | `IsString()`, `MinLength(8)`, `MaxLength(128)` |
| `reason` | string | Tidak | - | `IsOptional()`, `IsString()`, `MinLength(2)`, `MaxLength(1000)` |
| `revokeSessions` | inferred | Tidak | `true` | `IsOptional()`, `IsBoolean()` |

#### Schema: ResolveAlertDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `resolution` | string | Ya | - | `IsString()` |

#### Schema: ResolveAreaDto

Sumber: `apps/be/src/modules/baket/baket.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `force` | boolean | Ya | - | `IsBoolean()` |

#### Schema: ResolveCoordinateDto

Sumber: `apps/be/src/modules/areas/dto/area.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `latitude` | number | Ya | - | `IsNumber()`, `Min(-90)`, `Max(90)` |
| `longitude` | number | Ya | - | `IsNumber()`, `Min(-180)`, `Max(180)` |
| `levels` | [AdministrativeLevel](#schema-administrativelevel)[] | Tidak | - | `IsOptional()`, `IsArray()`, `ArrayMinSize(1)`, `IsEnum(AdministrativeLevel, { each: true })` |
| `effectiveAt` | string | Tidak | - | `IsOptional()`, `IsDateString()` |

#### Schema: ResolveDto

Sumber: `apps/be/src/modules/whatsapp/whatsapp.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `areaId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `reason` | string | Tidak | - | `IsOptional()`, `IsString()` |

#### Schema: ResolveEmergencyIncidentDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `resolution` | string | Ya | - | `IsString()` |
| `resolvedAt` | string | Tidak | - | `IsOptional()`, `IsDateString()` |

#### Schema: ResolveRevisionRequestDto

Sumber: `apps/be/src/modules/baket/baket.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `resolvedByVersionId` | string | Ya | - | `IsUUID()` |
| `note` | string | Tidak | - | `IsOptional()`, `IsString()` |

#### Schema: ResubmitDto

Sumber: `apps/be/src/modules/baket/baket.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `versionId` | string | Ya | - | `IsUUID()` |
| `revisionRequestId` | string | Ya | - | `IsUUID()` |

#### Schema: RetryDistributionDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `reason` | string | Ya | - | `IsString()` |

#### Schema: RevisionRequestQuery

Sumber: `apps/be/src/modules/baket/baket.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `status` | [RevisionRequestStatus](#schema-revisionrequeststatus) | Tidak | - | `IsOptional()`, `IsEnum(RevisionRequestStatus)` |

#### Schema: RevisionRequestStatus

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type RevisionRequestStatus = (typeof RevisionRequestStatus)[keyof typeof RevisionRequestStatus];
```

#### Schema: RevokeDistributionDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `reason` | string | Ya | - | `IsString()` |

#### Schema: RevokeOtherSessionsDto

Sumber: `apps/be/src/modules/identity/dto/identity.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `reason` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(500)` |

#### Schema: RoleCode

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type RoleCode = (typeof RoleCode)[keyof typeof RoleCode];
```

#### Schema: RoleListQueryDto

Sumber: `apps/be/src/modules/rbac/dto/rbac.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `isActive` | boolean | Tidak | - | `IsOptional()`, `IsBoolean()` |

#### Schema: SectionDto

Sumber: `apps/be/src/modules/uuk/uuk.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `sectionType` | [UukStrSectionType](#schema-uukstrsectiontype) | Ya | - | `IsEnum(UukStrSectionType)` |
| `title` | string | Ya | - | `IsString()`, `MaxLength(250)` |
| `orderNumber` | number | Ya | - | `IsInt()`, `Min(1)` |
| `items` | [SectionItemDto](#schema-sectionitemdto)[] | Ya | - | `IsArray()`, `ArrayMinSize(1)`, `ValidateNested({ each: true })` |

#### Schema: SectionItemDto

Sumber: `apps/be/src/modules/uuk/uuk.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `itemCode` | string | Ya | - | `IsString()`, `MaxLength(30)` |
| `content` | string | Ya | - | `IsString()` |
| `orderNumber` | number | Ya | - | `IsInt()`, `Min(1)` |

#### Schema: SecuritySessionQuery

Sumber: `apps/be/src/modules/system/security.controller.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `limit` | inferred | Tidak | `50` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(100)` |
| `search` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `activeOnly` | inferred | Tidak | `true` | `Transform(({ value }) => value === undefined ? true : value === 'false' \|\| value === false ? false : Boolean(value), )`, `IsOptional()`, `IsBoolean()` |

#### Schema: SettingQuery

Sumber: `apps/be/src/modules/system/system.controller.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `search` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(100)` |
| `includeSecrets` | inferred | Tidak | `false` | `IsOptional()`, `IsBoolean()` |

#### Schema: SortOrder

Sumber: `apps/be/src/generated/prisma/internal/prismaNamespaceBrowser.ts`

```ts
type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];
```

#### Schema: SourceReliability

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type SourceReliability = (typeof SourceReliability)[keyof typeof SourceReliability];
```

#### Schema: StartResponseDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `actionPlan` | string | Tidak | - | `IsOptional()`, `IsString()` |

#### Schema: SubmitAnalysisReviewDto

Sumber: `apps/be/src/modules/analysis/analysis.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `note` | string | Tidak | - | `IsOptional()`, `IsString()` |

#### Schema: SubmitProductDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `versionId` | string | Ya | - | `IsUUID()` |
| `confirmation` | string | Ya | - | `IsString()` |

#### Schema: SubordinateQueryDto

Sumber: `apps/be/src/modules/positions/dto/position.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `recursive` | inferred | Tidak | `false` | `IsOptional()`, `IsBoolean()` |
| `depth` | number | Tidak | - | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(20)` |

#### Schema: SuspendUserDto

Sumber: `apps/be/src/modules/users/dto/user-profile.dto.ts`

Mewarisi: [ReasonDto](#schema-reasondto)

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `until` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `revokeSessions` | inferred | Tidak | `true` | `IsOptional()`, `IsBoolean()` |

#### Schema: TargetAreasDto

Sumber: `apps/be/src/modules/tasks/task.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `areaIds` | string[] | Ya | - | `IsArray()`, `ArrayMinSize(1)`, `IsUUID(undefined, { each: true })` |
| `primaryAreaId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |

#### Schema: TaskAssignmentStatus

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type TaskAssignmentStatus = (typeof TaskAssignmentStatus)[keyof typeof TaskAssignmentStatus];
```

#### Schema: TaskQuery

Sumber: `apps/be/src/modules/tasks/task.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `page` | inferred | Tidak | `1` | `IsOptional()`, `IsInt()`, `Min(1)` |
| `limit` | inferred | Tidak | `20` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(100)` |
| `status` | [TaskStatus](#schema-taskstatus) | Tidak | - | `IsOptional()`, `IsEnum(TaskStatus)` |
| `priority` | [PriorityLevel](#schema-prioritylevel) | Tidak | - | `IsOptional()`, `IsEnum(PriorityLevel)` |
| `search` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(200)` |
| `classification` | [Classification](#schema-classification) | Tidak | - | `IsOptional()`, `IsEnum(Classification)` |
| `sourceUrgency` | [PriorityLevel](#schema-prioritylevel) | Tidak | - | `IsOptional()`, `IsEnum(PriorityLevel)` |
| `ownerAssignmentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `assigneeAssignmentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `relatedAssignmentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `assignmentStatus` | [TaskAssignmentStatus](#schema-taskassignmentstatus) | Tidak | - | `IsOptional()`, `IsEnum(TaskAssignmentStatus)` |
| `areaId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `dueBefore` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `dueAfter` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `effectiveDueBefore` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `effectiveDueAfter` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `parentTaskId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `directiveId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `uukStrId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `overdue` | boolean | Tidak | - | `IsOptional()`, `IsBoolean()` |
| `sortBy` | [TaskSortField](#schema-tasksortfield) | Tidak | - | `IsOptional()`, `IsEnum(TaskSortField)` |
| `sortOrder` | [SortOrder](#schema-sortorder) | Tidak | - | `IsOptional()`, `IsEnum(SortOrder)` |
| `paginated` | boolean | Tidak | - | `IsOptional()`, `IsBoolean()` |

#### Schema: TaskSortField

Sumber: `apps/be/src/modules/tasks/task.dto.ts`

Enum: `dueDate`, `effectiveDueDate`, `createdAt`, `updatedAt`

#### Schema: TaskStatus

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];
```

#### Schema: TestIntegrationDto

Sumber: `apps/be/src/modules/integrations/integration.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `mode` | 'HEALTH' \| 'SEND_TEST' | Ya | - | `IsIn(['HEALTH', 'SEND_TEST'])` |
| `target` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(200)` |

#### Schema: TransferDto

Sumber: `apps/be/src/modules/jaring/jaring.dto.ts`

Mewarisi: [ReasonDto](#schema-reasondto)

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `fieldOfficerAssignmentId` | string | Ya | - | `IsUUID()` |

#### Schema: UpdateAlertDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `title` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(300)` |
| `description` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `severity` | [AlertSeverity](#schema-alertseverity) | Tidak | - | `IsOptional()`, `IsEnum(AlertSeverity)` |

#### Schema: UpdateAnalysisCaseDto

Sumber: `apps/be/src/modules/analysis/analysis.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `title` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(300)` |
| `periodStart` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `periodEnd` | string | Tidak | - | `IsOptional()`, `IsDateString()` |

#### Schema: UpdateAnalysisVersionDto

Sumber: `apps/be/src/modules/analysis/analysis.dto.ts`

Mewarisi: [CreateAnalysisVersionDto](#schema-createanalysisversiondto)

Tidak mendeklarasikan field tambahan pada class/interface ini.

#### Schema: UpdateAreaDto

Sumber: `apps/be/src/modules/areas/dto/area.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `name` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(180)` |
| `officialCode` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(30)` |
| `isActive` | boolean | Tidak | - | `IsOptional()`, `IsBoolean()` |
| `centroidLatitude` | number | Tidak | - | `IsOptional()`, `IsNumber()`, `Min(-90)`, `Max(90)` |
| `centroidLongitude` | number | Tidak | - | `IsOptional()`, `IsNumber()`, `Min(-180)`, `Max(180)` |

#### Schema: UpdateAreaPolicyDto

Sumber: `apps/be/src/modules/rbac/dto/rbac.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `scopeMode` | [AreaScopeMode](#schema-areascopemode) | Ya | - | `IsEnum(AreaScopeMode)` |
| `minimumAreas` | number | Ya | - | `IsInt()`, `Min(0)` |
| `maximumAreas` | number | Tidak | - | `IsOptional()`, `IsInt()`, `Min(0)`, `Max(10000)` |
| `isActive` | boolean | Ya | - | `IsBoolean()` |

#### Schema: UpdateBaketMetadataDto

Sumber: `apps/be/src/modules/baket/baket.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `reportCategoryId` | string | Ya | - | `IsUUID()` |
| `taskAssignmentId` | string \| null | Tidak | - | `IsOptional()`, `IsUUID()` |

#### Schema: UpdateDirectiveVersionDto

Sumber: `apps/be/src/modules/directives/directive.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `urgency` | [PriorityLevel](#schema-prioritylevel) | Tidak | - | `IsOptional()`, `IsEnum(PriorityLevel)` |
| `dueDate` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `strategicIssue` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `commandDescription` | string | Tidak | - | `IsOptional()`, `IsString()` |

#### Schema: UpdateEmergencyIncidentDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `situation` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `actionTaken` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `needs` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `severity` | [AlertSeverity](#schema-alertseverity) | Tidak | - | `IsOptional()`, `IsEnum(AlertSeverity)` |

#### Schema: UpdateIntegrationDto

Sumber: `apps/be/src/modules/integrations/integration.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `name` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(180)` |
| `configPatch` | Record<string, unknown> | Tidak | - | `IsOptional()`, `IsObject()` |

#### Schema: UpdateJaringDto

Sumber: `apps/be/src/modules/jaring/jaring.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `aliasName` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(150)` |
| `whatsappNumber` | string | Tidak | - | `IsOptional()`, `IsString()`, `Matches(/^\d+$/, { message: 'Nomor WhatsApp hanya boleh berisi angka.' })`, `MaxLength(30)` |
| `fullName` | string | Tidak | - | `IsOptional()`, `IsString()`, `IsNotEmpty()`, `MaxLength(180)` |
| `nationalIdNumber` | string | Tidak | - | `IsOptional()`, `IsString()`, `Matches(/^$\|^\d{16}$/, { message: 'NIK harus kosong atau terdiri dari tepat 16 digit angka.', })` |
| `address` | string | Tidak | - | `IsOptional()`, `IsString()`, `IsNotEmpty()`, `MaxLength(1000)` |
| `birthPlace` | string | Tidak | - | `IsOptional()`, `IsString()`, `IsNotEmpty()`, `MaxLength(120)` |
| `birthDate` | string | Tidak | - | `IsOptional()`, `IsDateString( {}, { message: 'Tanggal lahir harus berupa tanggal yang valid.' }, )` |
| `gender` | [JaringGender](#schema-jaringgender) | Tidak | - | `IsOptional()`, `IsEnum(JaringGender)` |
| `occupationId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `profilePhotoFileId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `workplace` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(180)` |
| `jobTitle` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(150)` |
| `joinedAt` | string | Tidak | - | `IsOptional()`, `IsDateString( {}, { message: 'Tanggal bergabung harus berupa tanggal yang valid.' }, )` |
| `organizationName` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(180)` |
| `politicalAffiliation` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(180)` |
| `areaIds` | string[] | Tidak | - | `IsOptional()`, `IsArray()`, `ArrayMinSize(1)`, `ArrayMaxSize(1, { message: 'Satu Jaring hanya boleh memiliki satu Kelurahan/Desa cakupan.', })`, `IsUUID(undefined, { each: true })` |
| `notes` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(3000)` |

#### Schema: UpdateJaringOccupationDto

Sumber: `apps/be/src/modules/jaring/jaring.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `code` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(80)` |
| `name` | string | Tidak | - | `IsOptional()`, `IsString()`, `MinLength(2)`, `MaxLength(150)` |
| `description` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(1000)` |
| `isActive` | boolean | Tidak | - | `IsOptional()`, `IsBoolean()` |

#### Schema: UpdateJaringReportMetadataDto

Sumber: `apps/be/src/modules/jaring/jaring.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `categoryId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `urgency` | [PriorityLevel](#schema-prioritylevel) | Tidak | - | `IsOptional()`, `IsEnum(PriorityLevel)` |
| `content` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `normalizedContent` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `fieldOfficerNote` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(3000)` |
| `taskAssignmentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |

#### Schema: UpdateOrganizationUnitDto

Sumber: `apps/be/src/modules/organization/dto/organization.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `name` | string | Tidak | - | `IsOptional()`, `IsString()`, `MinLength(2)`, `MaxLength(180)` |
| `isActive` | boolean | Tidak | - | `IsOptional()`, `IsBoolean()` |

#### Schema: UpdatePositionDto

Sumber: `apps/be/src/modules/positions/dto/position.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `title` | string | Tidak | - | `IsOptional()`, `IsString()`, `MinLength(2)`, `MaxLength(180)` |
| `isActive` | boolean | Tidak | - | `IsOptional()`, `IsBoolean()` |

#### Schema: UpdateProductDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `title` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(300)` |
| `periodStart` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `periodEnd` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `classification` | [Classification](#schema-classification) | Tidak | - | `IsOptional()`, `IsEnum(Classification)` |
| `productNumber` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(150)` |
| `changeReason` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(2000)` |

#### Schema: UpdateProductTypeDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `name` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(180)` |
| `formatNo` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(30)` |
| `numberCode` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(20)` |
| `description` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `isActive` | boolean | Tidak | - | `IsOptional()`, `IsBoolean()` |

#### Schema: UpdateProductVersionDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `routingTo` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `routingFrom` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `routingCc` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `subject` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(500)` |
| `content` | Record<string, unknown> | Tidak | - | `IsOptional()`, `IsObject()` |

#### Schema: UpdateReportCategoryDto

Sumber: `apps/be/src/modules/jaring/jaring.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `code` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(80)` |
| `name` | string | Tidak | - | `IsOptional()`, `IsString()`, `MinLength(2)`, `MaxLength(120)` |
| `description` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(1000)` |
| `isActive` | boolean | Tidak | - | `IsOptional()`, `IsBoolean()` |

#### Schema: UpdateSessionNetworkDto

Sumber: `apps/be/src/modules/identity/dto/identity.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `ipAddress` | string | Ya | - | `IsString()`, `IsIP()`, `MaxLength(64)` |

#### Schema: UpdateTaskDto

Sumber: `apps/be/src/modules/tasks/task.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `title` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(300)` |
| `description` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(10000)` |
| `priority` | [PriorityLevel](#schema-prioritylevel) | Tidak | - | `IsOptional()`, `IsEnum(PriorityLevel)` |
| `dueDate` | string | Tidak | - | `IsOptional()`, `IsDateString()` |

#### Schema: UpdateUserProfileDto

Sumber: `apps/be/src/modules/users/dto/user-profile.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `username` | string | Tidak | - | `IsOptional()`, `IsString()`, `MinLength(2)`, `MaxLength(100)` |
| `fullName` | string | Tidak | - | `IsOptional()`, `IsString()`, `MinLength(2)`, `MaxLength(180)` |
| `phone` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(30)` |

#### Schema: UpdateUukVersionDto

Sumber: `apps/be/src/modules/uuk/uuk.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `title` | string | Ya | - | `IsString()`, `MaxLength(300)` |
| `changeReason` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(2000)` |

#### Schema: UpdateVerificationDto

Sumber: `apps/be/src/modules/baket/baket.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `sourceReliability` | [SourceReliability](#schema-sourcereliability) | Tidak | - | `IsOptional()`, `IsEnum(SourceReliability)` |
| `informationCredibility` | [InformationCredibility](#schema-informationcredibility) | Tidak | - | `IsOptional()`, `IsEnum(InformationCredibility)` |
| `summary` | string | Tidak | - | `IsOptional()`, `IsString()` |

#### Schema: UpdateWhatsappControlDto

Sumber: `apps/be/src/modules/integrations/integration.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `name` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(180)` |
| `botLabel` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(180)` |
| `provider` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(120)` |
| `botPhoneNumber` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(30)` |
| `userId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `pairingMethod` | 'qr' \| 'code' | Tidak | - | `IsOptional()`, `IsIn(['qr', 'code'])` |
| `senderNumbers` | string[] | Tidak | - | `IsOptional()`, `IsArray()`, `IsString({ each: true })`, `Matches(/^\+?\d[\d\s-]{7,30}$/, { each: true })` |

#### Schema: UpsertSettingDto

Sumber: `apps/be/src/modules/system/system.controller.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `value` | Record<string, unknown> | Ya | - | `IsObject()` |
| `description` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(1000)` |
| `isSecret` | boolean | Ya | - | `IsBoolean()` |

#### Schema: UserProfileListQueryDto

Sumber: `apps/be/src/modules/users/dto/user-profile.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `page` | inferred | Tidak | `1` | `IsOptional()`, `IsInt()`, `Min(1)` |
| `limit` | inferred | Tidak | `20` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(100)` |
| `search` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(100)` |
| `status` | [UserProfileStatus](#schema-userprofilestatus) | Tidak | - | `IsOptional()`, `IsEnum(UserProfileStatus)` |
| `roleCode` | [RoleCode](#schema-rolecode) | Tidak | - | `IsOptional()`, `IsEnum(RoleCode)` |
| `branch` | [CommandRouteType](#schema-commandroutetype) | Tidak | - | `IsOptional()`, `IsEnum(CommandRouteType)` |
| `areaId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `includeArchived` | inferred | Tidak | `false` | `IsOptional()`, `IsBoolean()` |

#### Schema: UserProfileStatus

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type UserProfileStatus = (typeof UserProfileStatus)[keyof typeof UserProfileStatus];
```

#### Schema: UukQuery

Sumber: `apps/be/src/modules/uuk/uuk.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `page` | inferred | Tidak | `1` | `IsOptional()`, `IsInt()`, `Min(1)` |
| `limit` | inferred | Tidak | `20` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(100)` |
| `status` | [UukStrStatus](#schema-uukstrstatus) | Tidak | - | `IsOptional()`, `IsEnum(UukStrStatus)` |
| `ownerAssignmentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `directiveId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `directiveVersionIds` | string[] | Tidak | - | `IsOptional()`, `Transform(({ value }) => Array.isArray(value) ? value : String(value).split(',').filter(Boolean), )`, `IsArray()`, `IsUUID(undefined, { each: true })` |
| `search` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `sortBy` | [UukSortField](#schema-uuksortfield) | Tidak | - | `IsOptional()`, `IsEnum(UukSortField)` |
| `sortOrder` | [SortOrder](#schema-sortorder) | Tidak | - | `IsOptional()`, `IsEnum(SortOrder)` |
| `paginated` | boolean | Tidak | - | `IsOptional()`, `IsBoolean()` |

#### Schema: UukSortField

Sumber: `apps/be/src/modules/uuk/uuk.dto.ts`

Enum: `updatedAt`, `dueDate`

#### Schema: UukStrSectionType

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type UukStrSectionType = (typeof UukStrSectionType)[keyof typeof UukStrSectionType];
```

#### Schema: UukStrStatus

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type UukStrStatus = (typeof UukStrStatus)[keyof typeof UukStrStatus];
```

#### Schema: ValidateAnalysisDto

Sumber: `apps/be/src/modules/analysis/analysis.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `note` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(1000)` |

#### Schema: ValidateAssignmentScopesDto

Sumber: `apps/be/src/modules/positions/dto/position.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `areaIds` | string[] | Ya | - | `IsArray()`, `ArrayMinSize(1)`, `IsUUID(undefined, { each: true })` |

#### Schema: ValidateCoverageDto

Sumber: `apps/be/src/modules/baket/baket.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `scopeTypes` | [CoverageScopeType](#schema-coveragescopetype)[] | Ya | - | `IsArray()`, `ArrayMinSize(1)`, `IsEnum(CoverageScopeType, { each: true })` |

#### Schema: ValidateTemplateContentDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `content` | Record<string, unknown> | Ya | - | `IsObject()` |

#### Schema: VerificationQuery

Sumber: `apps/be/src/modules/baket/baket.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `limit` | inferred | Tidak | `20` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(100)` |
| `status` | [VerificationStatus](#schema-verificationstatus) | Tidak | - | `IsOptional()`, `IsEnum(VerificationStatus)` |
| `verifiedByAssignmentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `baketId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `areaId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |
| `from` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `to` | string | Tidak | - | `IsOptional()`, `IsDateString()` |
| `reliability` | [SourceReliability](#schema-sourcereliability) | Tidak | - | `IsOptional()`, `IsEnum(SourceReliability)` |
| `credibility` | [InformationCredibility](#schema-informationcredibility) | Tidak | - | `IsOptional()`, `IsEnum(InformationCredibility)` |

#### Schema: VerificationStatus

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];
```

#### Schema: VerifyEmergencyIncidentDto

Sumber: `apps/be/src/modules/intelligence-products/intelligence-products.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `note` | string | Ya | - | `IsString()` |
| `verifiedSeverity` | [AlertSeverity](#schema-alertseverity) | Ya | - | `IsEnum(AlertSeverity)` |

#### Schema: VerifyJaringReportDto

Sumber: `apps/be/src/modules/jaring/jaring.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `note` | string | Tidak | - | `IsOptional()`, `IsString()`, `MaxLength(1000)` |

#### Schema: VersionRecipientDto

Sumber: `apps/be/src/modules/directives/directive.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `targetAssignmentId` | string | Tidak | - | `IsOptional()`, `IsUUID()` |

#### Schema: ViewportBoundaryQueryDto

Sumber: `apps/be/src/modules/areas/dto/area.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `bbox` | string | Ya | - | `IsString()` |
| `level` | [AdministrativeLevel](#schema-administrativelevel) | Ya | - | `IsEnum(AdministrativeLevel)` |
| `zoom` | number | Ya | - | `IsInt()`, `Min(0)`, `Max(24)` |
| `limit` | inferred | Tidak | `200` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(1000)` |

#### Schema: WebhookDto

Sumber: `apps/be/src/modules/whatsapp/whatsapp.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `externalEventId` | string | Ya | - | `IsString()` |
| `externalMessageId` | string | Ya | - | `IsString()` |
| `senderPhone` | string | Ya | - | `IsString()` |
| `receivedAt` | string | Ya | - | `IsDateString()` |
| `content` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `latitude` | number | Tidak | - | `IsOptional()`, `IsNumber()`, `Min(-90)`, `Max(90)` |
| `longitude` | number | Tidak | - | `IsOptional()`, `IsNumber()`, `Min(-180)`, `Max(180)` |
| `gpsAccuracyMeters` | number | Tidak | - | `IsOptional()`, `IsNumber()` |
| `rawPayload` | Record<string, unknown> | Tidak | - | `IsOptional()`, `IsObject()` |

#### Schema: WebhookQuery

Sumber: `apps/be/src/modules/integrations/integration.dto.ts`

| Field | Tipe | Wajib | Default | Validasi/transformasi |
|---|---|---:|---|---|
| `limit` | inferred | Tidak | `50` | `IsOptional()`, `IsInt()`, `Min(1)`, `Max(100)` |
| `eventType` | string | Tidak | - | `IsOptional()`, `IsString()` |
| `success` | boolean | Tidak | - | `IsOptional()`, `IsBoolean()` |

#### Schema: WhatsAppMessageStatus

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type WhatsAppMessageStatus = (typeof WhatsAppMessageStatus)[keyof typeof WhatsAppMessageStatus];
```

#### Schema: WhatsAppReportSessionStatus

Sumber: `apps/be/src/generated/prisma/enums.ts`

```ts
type WhatsAppReportSessionStatus = (typeof WhatsAppReportSessionStatus)[keyof typeof WhatsAppReportSessionStatus];
```

## Verifikasi cakupan

- Total baris endpoint pada inventaris: **351**.
- Total handler route pada source: **351**.
- Selisih: **0**.
- Semua 26 file `*.controller.ts` di bawah `apps/be/src/modules` tercakup, termasuk controller yang dikecualikan dari Swagger.
- Response bisnis dapat berubah ketika service/Prisma select berubah; regenerasi/audit dokumen perlu dilakukan bersama perubahan controller, DTO, atau service.
