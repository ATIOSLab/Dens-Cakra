# DENS CAKRA - Dokumentasi Seluruh Controller API (Pasca-Pembersihan)

> Snapshot source code per 25 Agustus 2026, setelah audit pembersihan endpoint yang tidak dipakai frontend.
> Endpoint yang tercantum di bawah adalah endpoint yang **masih ada** di `apps/be/src/modules/**/*.controller.ts`.

## Ringkasan

- **27 file controller** / **29 class controller**
- **189 endpoint HTTP** (sebelumnya ±359; ±170 endpoint dihapus karena tidak dipanggil frontend/sistem eksternal).
- Route Better Auth di `/api/auth/*` tidak masuk hitungan karena dipasang langsung sebagai Express handler di `main.ts`, bukan controller NestJS.

## Konvensi URL, request, dan response

- Prefix global adalah `/api` dan URI version default adalah `v1`, sehingga route normal menjadi `/api/v1/...`.
- `StorageTransportController` bersifat version-neutral, sehingga route-nya berada di `/api/storage/...`.
- Validation global memakai `whitelist: true`, `transform: true`, dan `forbidNonWhitelisted: true`.
- Endpoint berlabel `idempotent` membutuhkan header `Idempotency-Key`.
- Response dibungkus `ApiResponseInterceptor` menjadi envelope `{ success, data, message, meta, requestId, timestamp }`.

## Inventaris endpoint yang masih ada

| # | Controller | Base route | Endpoint |
|---:|---|---|---:|
| 1 | AccessController | `/api/v1/access` | 2 |
| 2 | AnalysisController | `/api/v1` | 6 |
| 3 | AreaController | `/api/v1` | 7 |
| 4 | AuditController | `/api/v1` | 2 |
| 5 | BaketController | `/api/v1` | 14 |
| 6 | DirectiveController | `/api/v1` | 13 |
| 7 | ExecutiveDashboardController | `/api/v1/dashboard/executive` | 2 |
| 8 | ExecutivePersonnelController | `/api/v1/executive/personnel` | 3 |
| 9 | FieldCoordinatorPersonnelController | `/api/v1/field-coordinator/personnel` | 4 |
| 10 | RegionalCommanderPersonnelController | `/api/v1/regional-commander/personnel` | 4 |
| 11 | FileController | `/api/v1/files` | 3 |
| 12 | HealthController | `/api/v1/health` | 2 |
| 13 | IdentityController | `/api/v1/me` | 6 |
| 14 | StorageTransportController | `/api/storage` | 2 |
| 15 | IntegrationController | `/api/v1` | 15 |
| 16 | IntelligenceProductsController | `/api/v1` | 21 |
| 17 | JaringController | `/api/v1/jaring` | 25 |
| 18 | MapMarkersController | `/api/v1/map` | 1 |
| 19 | NotificationController | `/api/v1/notifications` | 4 |
| 20 | RbacController | `/api/v1/rbac` | 3 |
| 21 | SecurityController | `/api/v1/system/security` | 1 |
| 22 | SystemController | `/api/v1` | 3 |
| 23 | TaskController | `/api/v1` | 11 |
| 24 | UserProfileController | `/api/v1/user-profiles` | 13 |
| 25 | UukController | `/api/v1` | 6 |
| 26 | WhatsAppController | `/api/v1` | 6 |
| 27 | KpiController | `/api/v1/dashboard/kpi` | 10 |

### 1. AccessController — `/api/v1/access`

| Method | Endpoint | Ringkasan |
|---|---|---|
| GET | `/access/me` | Ambil konteks akses pengguna aktif |
| GET | `/access/assignable-assignments` | Daftar penugasan aktif dalam cakupan yang dapat ditugaskan |

### 2. AnalysisController — `/api/v1`

| Method | Endpoint | Ringkasan |
|---|---|---|
| GET | `/analysis-cases` | Daftar analysis case |
| POST | `/analysis-cases` | Buat analysis case |
| GET | `/analysis-cases/:caseId` | Detail analysis case |
| POST | `/analysis-cases/:caseId/finalize` | Finalkan analysis dan kunci versi aktif |
| GET | `/analysis-versions/:versionId` | Detail analysis version |
| PATCH | `/analysis-versions/:versionId` | Edit analysis version |

### 3. AreaController — `/api/v1`

| Method | Endpoint | Ringkasan |
|---|---|---|
| GET | `/administrative-areas` | Daftar/filter wilayah |
| GET | `/administrative-areas/scoped-tree` | Cascading tree wilayah sesuai scope pengguna |
| GET | `/administrative-areas/search` | Search wilayah berdasarkan nama/kode |
| GET | `/administrative-areas/boundaries` | Boundary berdasarkan viewport |
| GET | `/administrative-areas/:areaId/children` | Anak wilayah untuk cascading filter |
| GET | `/administrative-areas/:areaId/ancestors` | Breadcrumb administratif |
| GET | `/administrative-areas/:areaId/boundary` | Ambil boundary GeoJSON |

### 4. AuditController — `/api/v1`

| Method | Endpoint | Ringkasan |
|---|---|---|
| GET | `/audit-logs` | Panel pencarian dan ringkasan audit forensik |
| GET | `/audit-logs/:auditLogId` | Detail audit event forensik |

### 5. BaketController — `/api/v1`

| Method | Endpoint | Ringkasan |
|---|---|---|
| GET | `/bakets` | Daftar Baket |
| GET | `/bakets/:baketId` | Detail Baket current version |
| PATCH | `/bakets/:baketId` | Ubah metadata kategori Baket draft |
| GET | `/baket-versions/:versionId` | Detail versi Baket |
| PATCH | `/baket-versions/:versionId` | Edit versi draft |
| POST | `/bakets/:baketId/submit` | Kirim Baket ke Manajer Intelijen Operasional (OIM) |
| GET | `/verifications` | Daftar verification |
| POST | `/baket-versions/:versionId/verification` | Buat canonical verification |
| GET | `/verifications/:verificationId` | Detail verification |
| POST | `/verifications/:verificationId/start` | Mulai verification |
| PATCH | `/verifications/:verificationId` | Edit draft/in-progress verification |
| POST | `/verifications/:verificationId/complete` | Selesaikan verification valid |
| POST | `/verifications/:verificationId/needs-development` | Kembalikan untuk pengembangan |
| POST | `/verifications/:verificationId/reject` | Tolak Baket |

### 6. DirectiveController — `/api/v1`

| Method | Endpoint | Ringkasan |
|---|---|---|
| POST | `/directives/ai-recommendation` | Generate rekomendasi AI untuk Direktif Strategis |
| GET | `/directives` | Daftar direktif |
| POST | `/directives` | Buat directive dan versi awal |
| GET | `/directives/:directiveId` | Detail directive current version |
| GET | `/directive-versions/:versionId` | Detail versi directive |
| PATCH | `/directive-versions/:versionId` | Edit versi draft |
| PUT | `/directive-versions/:versionId/target-areas` | Ganti target area draft |
| PUT | `/directive-versions/:versionId/recipients` | Ganti penerima draft |
| POST | `/directive-versions/:versionId/publish` | Publish directive |
| POST | `/directive-versions/:versionId/distribute` | Distribusikan directive |
| POST | `/directive-versions/:versionId/mark-read` | Tandai directive dibaca penerima |
| GET | `/directives/:directiveId/tracking` | Tracking pelaksanaan direktif |
| POST | `/directives/:directiveId/cancel` | Batalkan directive |

### 7. ExecutiveDashboardController — `/api/v1/dashboard/executive`

| Method | Endpoint | Ringkasan |
|---|---|---|
| GET | `/dashboard/executive` | Dashboard eksekutif |
| GET | `/dashboard/executive/filters` | Filter dashboard eksekutif |

### 8–10. Personnel controllers (per role)

`/api/v1/executive/personnel`:

| Method | Endpoint |
|---|---|
| GET | `/executive/personnel` |
| GET | `/executive/personnel/map` |
| GET | `/executive/personnel/:userProfileId` |

`/api/v1/field-coordinator/personnel`:

| Method | Endpoint |
|---|---|
| GET | `/field-coordinator/personnel` |
| GET | `/field-coordinator/personnel/map` |
| GET | `/field-coordinator/personnel/area-filters` |
| GET | `/field-coordinator/personnel/:assignmentId` |

`/api/v1/regional-commander/personnel`:

| Method | Endpoint |
|---|---|
| GET | `/regional-commander/personnel` |
| GET | `/regional-commander/personnel/map` |
| GET | `/regional-commander/personnel/area-filters` |
| GET | `/regional-commander/personnel/:assignmentId` |

### 11. FileController — `/api/v1/files`

| Method | Endpoint | Ringkasan |
|---|---|---|
| POST | `/files/presign` | Minta signed upload URL |
| POST | `/files/complete` | Konfirmasi upload selesai |
| GET | `/files/:fileId/access-url` | Signed download/view URL |

### 12. HealthController — `/api/v1/health`

| Method | Endpoint | Ringkasan |
|---|---|---|
| GET | `/health/live` | Liveness probe (infrastruktur) |
| GET | `/health/ready` | Readiness probe (infrastruktur) |

### 13. IdentityController — `/api/v1/me`

| Method | Endpoint | Ringkasan |
|---|---|---|
| GET | `/me` | Ambil identitas dan profil pengguna aktif |
| PATCH | `/me/profile` | Perbarui nomor WhatsApp pada profil |
| GET | `/me/area-scopes` | Ambil wilayah yang dapat diakses pengguna |
| POST | `/me/session-network` | Simpan public IP dan kota sesi login |
| POST | `/me/session-heartbeat` | Perbarui aktivitas sesi dashboard |
| POST | `/me/session-inactive` | Tandai sesi dashboard tidak aktif |

### 14. StorageTransportController — `/api/storage` (version-neutral)

| Method | Endpoint | Ringkasan |
|---|---|---|
| PUT | `/storage/uploads/:token` | Upload file via presigned token |
| GET | `/storage/files/:token` | Ambil file via presigned token |

### 15. IntegrationController — `/api/v1`

| Method | Endpoint | Ringkasan |
|---|---|---|
| GET | `/integration-channels/whatsapp-control` | Ringkasan kontrol WhatsApp |
| GET | `/integration-channels/whatsapp-connectivity` | Status konektivitas perangkat WhatsApp |
| GET | `/integration-channels/whatsapp-activity-logs` | Log aktivitas perangkat WhatsApp |
| GET | `/integration-channels/whatsapp-message-events` | Riwayat pesan masuk WhatsApp |
| GET | `/integration-channels/whatsapp-notification-recipients` | Daftar penerima notifikasi WhatsApp |
| POST | `/integration-channels/whatsapp-notification-recipients` | Tambah penerima notifikasi WhatsApp |
| PATCH | `/integration-channels/whatsapp-notification-recipients/:recipientId` | Ubah penerima notifikasi |
| DELETE | `/integration-channels/whatsapp-notification-recipients/:recipientId` | Hapus penerima notifikasi |
| POST | `/integration-channels` | Buat channel |
| PATCH | `/integration-channels/whatsapp-control/:channelId` | Ubah bot dan nomor pengirim WhatsApp |
| POST | `/integration-channels/whatsapp-control/:channelId/request-qr` | Minta QR / pairing code baru |
| POST | `/integration-channels/:channelId/activate` | Aktifkan channel |
| POST | `/integration-channels/:channelId/deactivate` | Nonaktifkan channel |
| POST | `/integration-channels/:channelId/test` | Tes koneksi |
| DELETE | `/integration-channels/:channelId` | Hapus channel |

### 16. IntelligenceProductsController — `/api/v1`

| Method | Endpoint | Ringkasan |
|---|---|---|
| GET | `/product-types` | Daftar jenis produk intelijen |
| GET | `/product-types/:productTypeId/templates` | Daftar versi template |
| GET | `/products` | Daftar produk intelijen |
| POST | `/products` | Buat produk dan versi awal |
| GET | `/products/:productId` | Detail produk current version |
| GET | `/product-versions/:versionId` | Detail versi produk |
| POST | `/products/:productId/submit` | Submit ke approval regional |
| GET | `/approval-workflows/:workflowId` | Detail workflow approval |
| GET | `/dashboard/field-intelligence` | Panel komando BAKET dan aktivitas Jaring |
| GET | `/dashboard/kpi-engine` | KPI kualitas HUMINT berjenjang |
| GET | `/dashboard/briefing` | Briefing dashboard lintas modul |
| GET | `/map/reports` | Marker laporan pada viewport |
| GET | `/map/boundaries` | Boundary aktif sesuai zoom dan scope |
| GET | `/map/clusters` | Cluster laporan |
| GET | `/map/area-summary` | Summary area terpilih |
| GET | `/map/alerts` | Marker alert pada viewport |
| GET | `/map/emergencies` | Marker insiden darurat pada viewport |
| POST | `/personnel-location-pings` | Kirim ping lokasi personel |
| GET | `/personnel-location-pings/me/latest` | Lokasi terbaru diri sendiri |
| GET | `/personnel-location-pings/:assignmentId/latest` | Lokasi terbaru bawahan |
| GET | `/personnel-location-map` | Peta lokasi personel terbaru |

### 17. JaringController — `/api/v1/jaring`

| Method | Endpoint | Ringkasan |
|---|---|---|
| GET | `/jaring` | Daftar Jaring |
| POST | `/jaring` | Buat Jaring |
| GET | `/jaring/occupations` | Daftar pekerjaan Jaring |
| POST | `/jaring/occupations` | Buat pekerjaan Jaring |
| PATCH | `/jaring/occupations/:occupationId` | Ubah pekerjaan Jaring |
| GET | `/jaring/report-categories` | Daftar kategori Baket |
| POST | `/jaring/report-categories` | Buat kategori Baket |
| PATCH | `/jaring/report-categories/:categoryId` | Ubah kategori Baket |
| GET | `/jaring/reports` | Daftar semua laporan Jaring |
| GET | `/jaring/coaching-reports` | Daftar semua laporan pembinaan Jaring |
| GET | `/jaring/:jaringId` | Detail Jaring |
| POST | `/jaring/:jaringId/approve-registration` | Setujui registrasi Jaring |
| POST | `/jaring/:jaringId/reject-registration` | Tolak registrasi Jaring |
| PATCH | `/jaring/:jaringId` | Ubah Jaring |
| POST | `/jaring/:jaringId/activate` | Aktifkan Jaring |
| POST | `/jaring/:jaringId/deactivate` | Nonaktifkan Jaring |
| POST | `/jaring/:jaringId/delete` | Soft delete Jaring |
| GET | `/jaring/:jaringId/coaching-reports` | Daftar laporan pembinaan Jaring |
| POST | `/jaring/:jaringId/coaching-reports` | Buat laporan pembinaan Jaring |
| GET | `/jaring/:jaringId/coaching-reports/:reportId` | Detail laporan pembinaan Jaring |
| GET | `/jaring/:jaringId/reports` | Daftar laporan yang dibuat Jaring |
| GET | `/jaring/reports/:reportSessionId` | Detail laporan Jaring |
| PATCH | `/jaring/reports/:reportSessionId/read` | Tandai laporan Jaring dibaca Gaswil |
| PATCH | `/jaring/reports/:reportSessionId/metadata` | Buat/perbarui Baket dari Laporan Jaring |
| GET | `/jaring/reports/:reportSessionId/history` | Riwayat perubahan laporan Jaring |

### 18. MapMarkersController — `/api/v1/map`

| Method | Endpoint | Ringkasan |
|---|---|---|
| GET | `/map/markers` | Marker domain untuk peta |

### 19. NotificationController — `/api/v1/notifications`

| Method | Endpoint | Ringkasan |
|---|---|---|
| GET | `/notifications` | Daftar notifikasi |
| GET | `/notifications/unread-count` | Jumlah notifikasi belum dibaca |
| POST | `/notifications/:notificationId/read` | Tandai notifikasi dibaca |
| POST | `/notifications/read-all` | Tandai semua dibaca |

### 20. RbacController — `/api/v1/rbac`

| Method | Endpoint | Ringkasan |
|---|---|---|
| GET | `/rbac/roles` | Daftar role domain |
| PUT | `/rbac/roles/:roleId/permissions` | Atur permission role |
| GET | `/rbac/permissions` | Daftar permission |

> Catatan: prefix `rbac` ditambahkan agar cocok dengan pemanggilan frontend (`/rbac/roles`, `/rbac/permissions`). Sebelumnya controller terdaftar tanpa prefix sehingga route FE 404.

### 21. SecurityController — `/api/v1/system/security`

| Method | Endpoint | Ringkasan |
|---|---|---|
| GET | `/system/security/sessions` | Daftar sesi login |

### 22. SystemController — `/api/v1`

| Method | Endpoint | Ringkasan |
|---|---|---|
| GET | `/system/email-settings` | Pengaturan SMTP email |
| PUT | `/system/email-settings` | Ubah pengaturan SMTP email |
| POST | `/system/email-settings/test` | Kirim tes SMTP email |

### 23. TaskController — `/api/v1`

| Method | Endpoint | Ringkasan |
|---|---|---|
| GET | `/tasks` | Daftar tugas |
| GET | `/tasks/:taskId` | Detail tugas |
| POST | `/tasks/:taskId/assignments` | Assign tugas |
| GET | `/task-assignments/:assignmentId` | Detail task assignment |
| POST | `/task-assignments/:assignmentId/mark-read` | Tandai tugas dibaca |
| POST | `/task-assignments/:assignmentId/acknowledge` | Acknowledge tugas |
| POST | `/task-assignments/:assignmentId/start` | Mulai tugas |
| POST | `/task-assignments/:assignmentId/progress` | Update progres tugas |
| POST | `/task-assignments/:assignmentId/complete` | Selesaikan tugas |
| POST | `/task-assignments/:assignmentId/jaring-instructions` | Teruskan instruksi Gaswil ke Jaring |
| POST | `/task-assignments/:assignmentId/reassign` | Alihkan assignment |

### 24. UserProfileController — `/api/v1/user-profiles`

| Method | Endpoint | Ringkasan |
|---|---|---|
| GET | `/user-profiles` | Daftar user profile |
| POST | `/user-profiles/provision` | Provision akun, profile, role, dan cakupan wilayah |
| GET | `/user-profiles/dki-supervision` | Daftar mapping supervisi DKI Direktorat/Ditwil |
| GET | `/user-profiles/:userProfileId` | Detail user profile |
| PATCH | `/user-profiles/:userProfileId` | Ubah metadata profile |
| POST | `/user-profiles/:userProfileId/reset-password` | Reset password akun |
| POST | `/user-profiles/:userProfileId/activate` | Aktifkan profile |
| POST | `/user-profiles/:userProfileId/suspend` | Suspend akses operasional |
| POST | `/user-profiles/:userProfileId/archive` | Arsipkan personel |
| POST | `/user-profiles/:userProfileId/lock` | Operational security lock |
| POST | `/user-profiles/:userProfileId/unlock` | Lepas operational lock |
| POST | `/user-profiles/:userProfileId/change-primary-assignment` | Mutasi assignment utama |
| POST | `/user-profiles/:userProfileId/dki-supervision-scope` | Ubah cakupan supervisi DKI |

### 25. UukController — `/api/v1`

| Method | Endpoint | Ringkasan |
|---|---|---|
| GET | `/uuk-strs` | Daftar UUK/STR |
| POST | `/uuk-strs` | Buat UUK/STR versi awal |
| GET | `/uuk-strs/:uukStrId` | Detail UUK/STR |
| GET | `/uuk-str-versions/:versionId` | Detail versi UUK/STR |
| POST | `/uuk-str-versions/:versionId/publish` | Publish UUK/STR |
| POST | `/uuk-strs/:uukStrId/cancel` | Batalkan UUK/STR |

### 26. WhatsAppController — `/api/v1`

| Method | Endpoint | Ringkasan |
|---|---|---|
| POST | `/webhooks/whatsapp/:channelCode` | Webhook WhatsApp (public-signed) |
| GET | `/whatsapp-messages` | Daftar pesan WhatsApp |
| PATCH | `/whatsapp-messages/:messageId/category` | Assign kategori laporan WhatsApp |
| POST | `/whatsapp-messages/:messageId/validate` | Validasi format pesan |
| POST | `/whatsapp-messages/:messageId/mark-spam` | Tandai spam |
| POST | `/whatsapp-messages/:messageId/create-baket` | Buat Baket dari pesan |

### 27. KpiController — `/api/v1/dashboard/kpi`

| Method | Endpoint | Ringkasan |
|---|---|---|
| GET | `/dashboard/kpi/summary` | Ringkasan KPI |
| GET | `/dashboard/kpi/filters` | Filter KPI |
| GET | `/dashboard/kpi/productivity` | Produktivitas |
| GET | `/dashboard/kpi/region-comparison` | Perbandingan wilayah |
| GET | `/dashboard/kpi/reports-baket` | Laporan & Baket |
| GET | `/dashboard/kpi/whatsapp-center` | Pusat WhatsApp |
| GET | `/dashboard/kpi/anomalies` | Anomali |
| GET | `/dashboard/kpi/trends` | Tren |
| GET | `/dashboard/kpi/detail` | Detail |
| GET | `/dashboard/kpi/export` | Export |

---

## Endpoint yang dihapus pada pembersihan ini (ringkasan per domain)

| Domain | Dihapus | Contoh yang dihapus |
|---|---:|---|
| Access | 1 | `GET /access/roles` |
| Analysis | 11 | submit-review, sources, versions, entities, relationships, validate, graph, traceability, archive |
| Areas | 12 | CRUD admin wilayah (create/update/move/boundaries/import), tree, resolve-coordinate, detail, descendants |
| Audit | 2 | audit-trail, audit-exports |
| Baket | 17 | buat manual, versions, source-messages, attachments, resolve-area, override, validate-coverage, resubmit, revision-requests, timeline, traceability, cross-references, score |
| Directives | 3 | versions, acknowledge recipient |
| Files | 2 | metadata, soft-delete |
| Identity | 2 | authorization-context, revoke-other-sessions |
| Integrations | 6 | list/detail/update channel, webhook-events, retry |
| Intelligence Products | 67 | CRUD template produk, approval (approve/reject/revision/klarifikasi), distribusi, dashboard lama, map heatmap/tasks, emergency, alert, location history |
| Jaring | 6 | caretakers, caretaker-transfer, area-coverages, messages, bakets |
| RBAC | 15 | role detail, area policies, permission CRUD, positions, supervision-assignments, organization-units |
| Security | 1 | revoke session |
| System | 5 | reference-data/enums, settings, settings/:key, diagnostics |
| Tasks | 8 | create, child-tasks, update, target-areas, assignments list, cancel, cascade, progress-summary |
| User Profiles | 1 | assignment history |
| UUK/STR | 4 | versions, edit version, sections |
| WhatsApp | 7 | detail pesan, link-jaring, resolve-area, route, mark-duplicate, routing-logs, inbox summary |

**Dipertahankan karena dipakai sistem eksternal/bukan-FE:** `GET /health/live`, `GET /health/ready` (probe infra), `POST /webhooks/whatsapp/:channelCode` (webhook WhatsApp), `PUT/GET /api/storage/*` (presigned URL upload/download).

## Perbaikan bug routing FE↔BE

1. **`RbacController` diberi prefix `rbac`** → route menjadi `/api/v1/rbac/roles`, `/api/v1/rbac/permissions`, `/api/v1/rbac/roles/:roleId/permissions`, sehingga cocok dengan pemanggilan frontend (`permission-matrix.tsx`).
2. **Halaman kabinda `Personel & Jaring`** — komponen mati (`_components/personel-jaring-page.tsx` dan `personel-jaring-client.tsx`) yang memanggil `/command-network` (endpoint dihapus saat refactor) dibuang. Route `personel-jaring` tetap ada dan me-redirect ke `/dashboard/daftar-petugas-wilayah`.
3. **`NationalMap`** — pemanggilan `/position-assignments/:assignmentId` (endpoint dihapus saat refactor) dihapus; detail personel kini memakai ping lokasi (`/personnel-location-pings/:assignmentId/latest`) dan properti fitur peta.
