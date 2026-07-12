# DENS CAKRA — Master Prompt Implementasi Frontend

Gunakan prompt ini pada coding agent yang bekerja langsung di repository frontend DENS CAKRA.

---

## ROLE

Anda bertindak sebagai:

- Senior Next.js Architect
- Senior Frontend Engineer
- Senior UI/UX Engineer
- API Integration Engineer
- Accessibility Reviewer

Anda bekerja langsung pada repository frontend DENS CAKRA berbasis **Next.js App Router**.

## PROJECT CONTEXT

Seluruh menu dan route utama sudah tersedia di dalam folder `app/dashboard`, tetapi sebagian besar halaman masih berupa shell, placeholder, atau halaman kosong. Tugas Anda adalah **mengimplementasikan seluruh tampilan dan interaksi halaman tersebut secara nyata**, sesuai alur bisnis DENS CAKRA, API contract, App Router mapping, dan design rules yang sudah disediakan.

Dokumen sumber yang WAJIB dibaca sebelum mengubah kode:

1. `DENS_CAKRA_FE_Master_Page_Flow_API_App_Router_v2.0.md`
2. `DENS_CAKRA_FE_Master_Route_API_Manifest_v2.0.json`
3. `DENS_CAKRA_FE_Complete_App_Router_Tree_v2.0.txt`
4. `DENS_CAKRA_API_Contract_v1.0.md`
5. `DENS_CAKRA_OpenAPI_v1.0.yaml`
6. `DENS_CAKRA_UI_Layout_Visual_Rules_v1.0.md`
7. `DENS_CAKRA_UI_Layout_Manifest_v1.0.json`
8. `DENS_CAKRA_Design_Tokens_v1.0.css`

Apabila dokumen berada di folder lain, cari berdasarkan nama file sebelum memulai.

## PRIMARY GOAL

Ubah seluruh halaman menu yang masih kosong menjadi halaman siap pakai yang:

- Menampilkan data yang sesuai fungsi halamannya.
- Menggunakan API yang sudah dipetakan.
- Memiliki filter, sorting, pagination, cards, table, map, form, timeline, dan action yang sesuai.
- Mengikuti alur kerja sistem DENS CAKRA.
- Menambahkan folder route baru untuk detail, create, edit, revision, version, tracking, approval, assignment, atau map deep-link apabila belum tersedia.
- Menggunakan satu design language global untuk semua role.
- Responsif di desktop, tablet, dan mobile.
- Memenuhi WCAG AA.
- Tidak hanya membuat wireframe atau placeholder.

**Jangan berhenti pada analisis atau scaffolding. Implementasikan kode hingga halaman dapat dirender dan digunakan.**

---

# 1. NON-NEGOTIABLE RULES

## 1.1 Preserve Existing Navigation

- Jangan menghapus route menu yang sudah ada.
- Jangan mengganti URL existing tanpa alasan teknis yang kuat.
- Boleh menambah child route dinamis.
- Semua child route harus mengikuti mapping pada dokumen App Router.

Contoh pola:

```text
module/
├── page.tsx
├── loading.tsx
├── error.tsx
├── _components/
├── baru/
│   └── page.tsx
└── [resourceId]/
    ├── page.tsx
    ├── loading.tsx
    ├── not-found.tsx
    ├── edit/
    │   └── page.tsx
    ├── revisi/
    │   └── page.tsx
    ├── tracking/
    │   └── page.tsx
    └── versions/
        └── [versionId]/
            └── page.tsx
```

## 1.2 App Router Conventions

- `page.tsx` adalah route UI.
- `[resourceId]` adalah dynamic route.
- `_components`, `_lib`, `_schemas`, `_actions` bukan route.
- Gunakan `loading.tsx`, `error.tsx`, dan `not-found.tsx` pada boundary yang relevan.
- `page.tsx` dan `layout.tsx` harus tetap Server Components secara default.
- Gunakan `'use client'` hanya pada komponen interaktif.
- Jangan menjadikan seluruh role layout sebagai Client Component.

## 1.3 Reuse Domain Features

Jangan menduplikasi implementasi domain pada setiap role.

Struktur yang disarankan:

```text
src/
├── app/dashboard/...
├── features/
│   ├── users/
│   ├── authorization/
│   ├── organization/
│   ├── administrative-areas/
│   ├── integrations/
│   ├── directives/
│   ├── uuk-str/
│   ├── tasks/
│   ├── jaring/
│   ├── whatsapp/
│   ├── bakets/
│   ├── verifications/
│   ├── analysis/
│   ├── products/
│   ├── approvals/
│   ├── distributions/
│   ├── emergencies/
│   ├── alerts/
│   ├── personnel/
│   └── maps/
└── lib/
    ├── api/
    ├── auth/
    ├── permissions/
    └── query-keys/
```

Setiap feature minimal memiliki:

```text
api/
components/
forms/
hooks/
schemas/
types/
utils/
```

Contoh satu `BaketDetailScreen` digunakan oleh beberapa role:

```tsx
<BaketDetailScreen viewMode="owner" />
<BaketDetailScreen viewMode="monitor" />
<BaketDetailScreen viewMode="verify" />
<BaketDetailScreen viewMode="summary" />
```

Perbedaan tombol dan data berasal dari permission, clearance, scope, dan `availableActions`.

## 1.4 API Is Authoritative

- Gunakan endpoint yang tercantum di OpenAPI dan master API mapping.
- Jangan membuat endpoint baru secara diam-diam.
- Jika benar-benar dibutuhkan endpoint tambahan, tandai sebagai `API GAP` dan dokumentasikan.
- Jangan mengubah workflow status dengan generic `PATCH`.
- Gunakan explicit action endpoint.

Benar:

```http
POST /api/v1/bakets/{baketId}/submit
POST /api/v1/verifications/{verificationId}/complete
POST /api/v1/approval-steps/{stepId}/approve
```

Salah:

```http
PATCH /api/v1/bakets/{baketId}
{
  "status": "VERIFIED"
}
```

## 1.5 No Fake Production Data

- Jangan hardcode data seolah berasal dari backend.
- Boleh membuat mock adapter untuk development bila backend belum aktif.
- Mock harus ditempatkan pada layer terpisah dan mudah dimatikan.
- UI production tetap menggunakan typed API client yang sama.

## 1.6 Authorization

Frontend boleh menyembunyikan menu dan tombol, tetapi backend tetap authoritative.

Gunakan:

- Better Auth session.
- Effective business role.
- Active primary assignment.
- Permission.
- Position.
- Organization scope.
- Area scope.
- Clearance.
- Resource membership.
- `availableActions`.

Jangan menyimpulkan semua action hanya dari role.

---

# 2. GLOBAL APPLICATION SHELL

Gunakan satu design language untuk seluruh role.

## 2.1 Layout

Desktop:

```text
┌───────────────────────────────────────────────────────────────┐
│ Sidebar 232 px │ Topbar 60 px                                │
│                ├───────────────────────────────────────────────┤
│ Brand          │ Page title       System status / Bell / User │
│ Main menu      ├───────────────────────────────────────────────┤
│ Section label  │ Breadcrumb / Filter / Primary action         │
│ Menu items     ├───────────────────────────────────────────────┤
│                │ 12-column page content                       │
│ User context   │                                               │
└───────────────────────────────────────────────────────────────┘
```

Rules:

- Sidebar expanded: 232 px.
- Sidebar collapsed: 72 px.
- Topbar: 60 px desktop, 56 px mobile.
- Main grid: 12 columns desktop, 8 tablet, 1 mobile.
- Page gutter: 24 px desktop, 16 px tablet, 12 px mobile.
- Gunakan tokens dari `DENS_CAKRA_Design_Tokens_v1.0.css`.
- Gunakan dark operational interface yang konsisten.
- Sidebar aktif memakai green rail dan raised surface.
- Topbar menampilkan system status, notification, dan user context.

## 2.2 Required Global Components

Implementasikan atau rapikan:

```text
src/components/dens/
├── app-shell/
│   ├── app-sidebar.tsx
│   ├── app-topbar.tsx
│   ├── page-header.tsx
│   └── scope-indicator.tsx
├── cards/
│   ├── kpi-card.tsx
│   ├── queue-card.tsx
│   ├── activity-card.tsx
│   ├── quick-access-card.tsx
│   └── status-card.tsx
├── data/
│   ├── data-table.tsx
│   ├── filter-bar.tsx
│   ├── status-badge.tsx
│   ├── pagination.tsx
│   └── empty-state.tsx
├── map/
│   ├── dens-map.tsx
│   ├── layer-control.tsx
│   ├── map-legend.tsx
│   ├── feature-popup.tsx
│   └── feature-drawer.tsx
└── workflow/
    ├── timeline.tsx
    ├── available-actions.tsx
    ├── decision-card.tsx
    └── completeness-panel.tsx
```

---

# 3. PAGE IMPLEMENTATION RULES

Setiap halaman WAJIB memiliki:

- Page header.
- Purpose/description.
- Applied scope.
- Loading state.
- Empty state.
- Error state.
- No-filter-result state.
- Permission/masked-not-found state.
- Responsive behavior.
- Action feedback.
- Data freshness timestamp.
- Server-calculated `availableActions` bila halaman workflow.

## 3.1 Dashboard

Dashboard tidak boleh hanya berisi judul.

Gunakan:

- KPI cards.
- Priority queue.
- Operational map.
- Activity feed.
- Quick access cards.
- Recent items.
- Alerts.
- Workflow counters.

Widget dimuat independen agar satu widget error tidak mengosongkan halaman.

## 3.2 List Page

Gunakan:

- Search.
- Filter bar.
- Sort.
- Pagination/cursor.
- Column visibility.
- Empty state.
- Row actions.
- Canonical detail route.

Simpan filter pada URL search params.

Contoh:

```text
?status=IN_PROGRESS&areaId=...&from=...&to=...&page=2
```

## 3.3 Detail Page

Detail page minimal menampilkan:

- Identity/summary.
- Status.
- Metadata.
- Related records.
- Timeline.
- Attachments.
- Location/map bila relevan.
- Traceability.
- Available actions.

Gunakan layout:

```text
8-column main content
4-column sticky metadata/action rail
```

## 3.4 Form Page

Form create/edit/revision harus:

- Menggunakan Zod schema.
- Menampilkan visible label.
- Menampilkan field-level error.
- Menampilkan form-level error summary.
- Menyimpan draft jika workflow mengizinkan.
- Menggunakan `If-Match` untuk concurrency.
- Menampilkan conflict state.
- Tidak mengedit historical version.

## 3.5 Workflow Page

Approval, verification, emergency, dan task action menggunakan:

- Evidence/source area.
- Checklist.
- Timeline.
- Decision panel.
- Required reason for reject/revision.
- Confirmation for irreversible action.

---

# 4. MAP IMPLEMENTATION WITH MAPCN

Gunakan `mapcn` sebagai presentation layer dan API/PostGIS sebagai sumber spatial.

## 4.1 Required Behavior

- Controlled viewport.
- URL-backed `bbox`, `zoom`, `areaId`, `layers`, `from`, `to`.
- Debounce map movement 300–500 ms.
- Boundary layer terpisah.
- Cluster pada zoom rendah.
- Point layer pada zoom tinggi.
- Legend.
- Scope indicator.
- Last refresh.
- Unlocated count.
- Popup.
- Canonical detail route.
- Mobile bottom sheet.
- List fallback.

## 4.2 Layer Types

```text
Administrative Boundary
Report Cluster
Individual Report Point
Alert
Emergency Incident
Personnel
Task Target
Selected Feature
```

## 4.3 Popup

Popup hanya memuat:

- Title.
- Status/severity.
- Time.
- Administrative area.
- Category/source type.
- `Buka Detail`.

Jangan tampilkan identitas sensitif Jaring pada popup umum.

---

# 5. ROUTE CREATION

Gunakan file berikut sebagai sumber route wajib:

- `DENS_CAKRA_FE_Complete_App_Router_Tree_v2.0.txt`
- `DENS_CAKRA_FE_Master_Route_API_Manifest_v2.0.json`

Buat semua folder route yang belum tersedia.

Contoh:

```text
src/app/dashboard/oim/laporan-masuk/[baketId]/page.tsx
src/app/dashboard/oim/verifikasi-neraca-penilaian/[verificationId]/page.tsx
src/app/dashboard/oim/analisis-intelijen/[caseId]/edit/page.tsx

src/app/dashboard/field-officer/laporan-saya/[baketId]/page.tsx
src/app/dashboard/field-officer/laporan-saya/[baketId]/revisi/page.tsx
src/app/dashboard/field-officer/tugas-saya/[assignmentId]/page.tsx

src/app/dashboard/regional-commander/persetujuan-regional/[stepId]/page.tsx
src/app/dashboard/executive/persetujuan-eksekutif/[stepId]/page.tsx
```

Setiap dynamic detail route memiliki:

```text
page.tsx
loading.tsx
not-found.tsx
```

Tambahkan `error.tsx` pada module boundary.

---

# 6. PAGE-BY-PAGE IMPLEMENTATION SOURCE

Untuk setiap menu:

1. Baca entry route pada:
   - `DENS_CAKRA_FE_Master_Page_Flow_API_App_Router_v2.0.md`
   - `DENS_CAKRA_FE_Master_Route_API_Manifest_v2.0.json`

2. Implementasikan:
   - Purpose.
   - Page flow.
   - Displayed data.
   - Filter params.
   - API calls.
   - Request body.
   - Response handling.
   - Business rules.
   - UI states.
   - Responsive rules.
   - Child detail/create/edit routes.

3. Gunakan layout pattern dari:
   - `DENS_CAKRA_UI_Layout_Visual_Rules_v1.0.md`
   - `DENS_CAKRA_UI_Layout_Manifest_v1.0.json`

4. Jangan membuat layout baru bila layout pattern yang sesuai sudah tersedia.

---

# 7. API CLIENT

Buat typed API layer.

Contoh struktur:

```text
src/lib/api/
├── server-client.ts
├── browser-client.ts
├── api-error.ts
└── response-types.ts
```

Domain example:

```text
src/features/bakets/api/
├── get-bakets.ts
├── get-baket.ts
├── update-baket-version.ts
├── submit-baket.ts
└── query-keys.ts
```

Rules:

- Gunakan OpenAPI-generated types bila tool sudah tersedia.
- Jika belum, buat types manual berdasarkan OpenAPI.
- Centralize error handling.
- Forward Better Auth session/cookies.
- Support request ID.
- Support `Idempotency-Key`.
- Support `If-Match`.
- Support cursor and page pagination.
- Do not call raw `fetch()` directly from random UI components.

---

# 8. DATA FETCHING

## Server Component

Gunakan untuk:

- Initial page data.
- Reference data.
- Authorization-aware initial load.
- Detail page fetch.

## Client Query

Gunakan untuk:

- Interactive filters.
- Pagination after initial render.
- Mutations.
- Realtime/short polling.
- Map viewport updates.
- Optimistic UI where safe.

Gunakan stable query keys yang mencakup:

```text
resource
workspace
assignment
areaId
filters
pagination
```

---

# 9. FORMS

Setiap form dari manifest harus dibuat.

Gunakan:

- React Hook Form atau form library yang sudah dipakai proyek.
- Zod.
- Server error mapping.
- Loading button.
- Disabled state.
- Dirty state.
- Unsaved changes warning.
- Autosave hanya untuk draft.
- Confirmation before submit/publish/approve.
- Accessible error summary.

Jangan memasukkan A–F dan 1–6 ke form Field Officer.

A–F dan 1–6 hanya muncul pada OIM Verification Workspace.

---

# 10. IMPLEMENTATION WAVES

Kerjakan berurutan dan selesaikan satu wave sampai stabil sebelum wave berikutnya.

## Wave 1 — Foundation

- Global shell.
- Design tokens.
- Shared cards.
- Page header.
- Filter bar.
- Data table.
- Status badge.
- API clients.
- Error handling.
- Route guards.
- Loading/empty/error states.

## Wave 2 — Admin System

- User provisioning.
- Role and permission.
- Position/reporting line.
- Organization and area.
- WA integration.
- Audit.
- System settings.
- Master data.

## Wave 3 — Executive and Regional Commander

- Dashboards.
- Directives.
- UUK/STR.
- Approval.
- National/regional map.
- Warning.
- Product catalog.
- KPI.

## Wave 4 — OIM

- Incoming Baket.
- Verification.
- Analysis.
- Product builder.
- Approval submission.
- Field monitoring.
- Situation map.

## Wave 5 — Field Coordinator

- Received tasks.
- Team assignment.
- Task monitoring.
- Personnel.
- Jaring.
- Field map.
- Emergency.

## Wave 6 — Field Officer

- My tasks.
- Jaring inbox.
- Create Baket.
- Submit Baket.
- My reports.
- Jaring management.
- Task map.
- Emergency form.

## Wave 7 — Hardening

- Accessibility.
- Responsive QA.
- Realtime notifications.
- Map performance.
- Error recovery.
- E2E tests.
- Visual regression.
- Route coverage.
- Permission coverage.

---

# 11. TESTING

Minimal test:

## Unit

- Zod schemas.
- Permission helpers.
- Status mapping.
- Query param serializer.
- API error mapping.

## Component

- KPI card states.
- Filter bar.
- Data table.
- Form validation.
- Decision card.
- Map popup.
- Empty/error states.

## Integration

- List → detail.
- Create → edit → submit.
- Verification complete.
- Approval decision.
- Task assignment.
- Baket revision.
- Map selection → detail.

## E2E

- Field Officer creates and submits Baket.
- OIM verifies and creates product.
- Regional Commander approves.
- Executive approves.
- Admin provisions a user.
- Emergency report is submitted and acknowledged.
- User outside scope cannot open a deep URL.

---

# 12. OUTPUT REQUIREMENTS

Saat selesai, berikan:

1. Daftar file yang dibuat.
2. Daftar file yang diubah.
3. Daftar route yang sudah diimplementasikan.
4. Daftar API yang sudah diintegrasikan.
5. Daftar `API GAP` bila ada.
6. Daftar known limitations.
7. Hasil lint/typecheck/test/build.
8. Screenshot atau preview untuk halaman utama setiap role.
9. Catatan migrasi bila struktur lama berubah.
10. Checklist acceptance criteria.

---

# 13. DEFINITION OF DONE

Satu halaman dianggap selesai hanya jika:

- Tidak lagi berupa placeholder.
- Menampilkan data yang sesuai.
- API mapping sudah digunakan.
- Filter berfungsi.
- Action berfungsi.
- Detail route tersedia.
- Form route tersedia bila dibutuhkan.
- Loading, empty, error, disabled, success state tersedia.
- Responsive.
- Accessible.
- Tidak melanggar role/scope/clearance.
- Tidak menduplikasi domain component.
- Build dan typecheck lulus.

**Jangan menyatakan selesai hanya karena folder dan komponen sudah dibuat. Halaman harus benar-benar dapat digunakan.**

---

# 14. FIRST EXECUTION STEP

Lakukan langkah berikut sekarang:

1. Scan repository.
2. Bandingkan current route tree dengan `DENS_CAKRA_FE_Complete_App_Router_Tree_v2.0.txt`.
3. Buat daftar route yang kosong, belum ada, atau masih placeholder.
4. Buat implementation plan per wave.
5. Implementasikan Wave 1.
6. Setelah foundation stabil, lanjutkan page-by-page berdasarkan manifest.
7. Jangan menunggu konfirmasi untuk membuat child route yang memang tercantum pada manifest.
8. Jangan menghapus kode existing yang masih berguna.
9. Jika menemukan konflik antara kode dan dokumen, gunakan OpenAPI dan Master Manifest sebagai baseline lalu dokumentasikan konflik.

Mulai dari repository sekarang dan lakukan perubahan kode.