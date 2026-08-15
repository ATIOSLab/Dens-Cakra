# DENS CAKRA — Laporan Audit & Rencana Perbaikan (2026-08-14)

Laporan audit menyeluruh codebase (backend NestJS, frontend Next.js) untuk standar
enterprise/production-ready: keamanan OWASP, clean code, UI/UX, type safety, error
handling, logging, konfigurasi, performa, dan testing. **Tidak ada perubahan fungsi
bisnis, alur, API, atau skema database** dalam rencana ini kecuali disebut eksplisit.

Acuan aturan: `DENS_CAKRA_ENGINEERING_STANDARDS.md` (baru), `DENS_CAKRA_GLOSSARY_SYSTEM.md`,
`DENS_CAKRA_VISUAL_SYSTEM.md`, `DENS_CAKRA_RBAC_SYSTEM.md`.

---

## 1. Temuan Berprioritas

### Kategori A — Keamanan (urut risiko)

| # | Risiko | Temuan | Lokasi utama |
| --- | --- | --- | --- |
| A1 | HIGH | Stored XSS via `Leaflet.bindPopup()` — data pesan WhatsApp (input user) diinterpolasi ke HTML tanpa sanitasi; tidak ada library sanitasi. | `field-officer/peta/laporan/peta-laporan-map.tsx:251`, `field-officer/peta-tugas/_components/live-personnel-map.tsx:189`, `field-officer/_components/leaflet-location-preview.tsx:54` |
| A2 | HIGH | Tidak ada `Content-Security-Policy` di FE (memperparah A1). | `apps/fe/next.config.mjs:2-31` |
| A3 | HIGH | Password default admin/superadmin/demo di-hardcode (`ChangeMe123!`, `SuperAdmin123!`, `DensCakraDemo123!`); seed bisa membuat akun aktif berkredensial publik. | `apps/be/src/lib/env.ts:128-140`, `scripts/seed-executive.ts:11`, `scripts/seed-role-accounts.ts:43` |
| A4 | MEDIUM | Tanpa global auth guard (default-deny): `SessionGuard`/`DomainAccessGuard` hanya dipasang manual per-controller. | `app.module.ts:79-86` |
| A5 | MEDIUM | `/health/ready` publik membocorkan `detail` error internal (hostname/port/path). | `modules/health/health.service.ts:16-49` |
| A6 | MEDIUM | MIME type dari klien dipercaya (MIME spoofing); fallback `CLEAN` saat clamscan tak tersedia. | `modules/files/file.service.ts:55-57,295-309` |
| A7 | MEDIUM | Error backend bocor ke user lewat proxy `/api/v1/[...path]` (tidak memask 5xx seperti `backend-api.ts`). | `src/app/api/v1/[...path]/route.ts:63-80` |
| A8 | MEDIUM | Validasi input API route hanya type assertion (tanpa zod), mis. live-location. | `src/app/api/field-officer/live-location/route.ts:14-21` |
| A9 | LOW | Rate limit endpoint sensitif (presign/upload/webhook) hanya pakai kuota global. | `app.module.ts:46-49` |
| A10 | LOW | `useSecureCookies` bergantung `NODE_ENV`; beberapa `catch {}` kosong; `RoleGuard` dead code; proxy hanya cek keberadaan cookie. | `lib/auth.ts:241`, `proxy.ts:11` |

### Kategori B — UI/UX & Design System (urut severity)

| # | Sev. | Temuan | Lokasi utama |
| --- | --- | --- | --- |
| B1 | HIGH | Warna domain di-hardcode: `sky-600/#38BDF8` (harus cyan token); `URGENCY_BADGE_STYLES` hex di OIM (NORMAL=LOW salah warna); `mapColor` hex di peta; palet tactical hex di field-officer. | `daftar-jaring`, `laporan-jaring`, `baket`, `oim-workspace-client.tsx:272`, `maps-intelijen-presentation.tsx:113`, `field-officer-operations-page.tsx` |
| B2 | HIGH | Radius/tinggi non-standar: `rounded-xl/2xl/[10/18px]` dan `h-10/min-h-11` (standar radius 4-6px, `h-9`/`h-8`). | banyak file (lihat audit) |
| B3 | MEDIUM | Tipografi: judul halaman `font-heading tracking-tight` (bukan `DC_TYPOGRAPHY.pageTitle`); header tabel `font-mono text-[10px]` (bukan `tableHeader`). | `baket-*`, `oim-workspace`, `task-clients.tsx` |
| B4 | MEDIUM | Istilah menyimpang glossary: "Open/Share/More/Previous/Next", "Edit"→"Ubah", "Baket Lapangan"→"Bahan Keterangan (Baket)", "Kembalikan untuk Revisi"→"Kembalikan untuk perbaikan". | `nav-documents.tsx:49`, `intelligence-product-client.tsx:583`, `oim-workspace-client.tsx:174` |
| B5 | MEDIUM | Duplikasi komponen: blok `FilterWilayah` ≥6 file; `EmptyState` lokal berulang. | `daftar-jaring`, `baket`, `laporan-pembinaan-jaring`, `laporan-jaring`, `executive/personil`, `dashboard-header-filter` |
| B6 | MEDIUM | Missing error state di `baket-officer-client` (gagal fetch tampil sebagai empty). | `baket-officer-client.tsx:180-182` |
| B7 | MEDIUM | A11y: tombol ikon tanpa `aria-label` (tutup modal PIN, paginasi). | `persetujuan-page.tsx:760`, `master-data/page.tsx:918` |

### Kategori C — Clean Code / Type Safety / Data Layer

| # | Sev. | Temuan | Lokasi utama |
| --- | --- | --- | --- |
| C1 | MEDIUM | ~40 situs `fetch()` manual (inkonsisten dengan `src/lib/api`); error handling tidak seragam; satu tempat tanpa `credentials: include`. | `field-officer-operations-page.tsx`, `master-data/page.tsx`, `session-heartbeat.tsx:14` |
| C2 | LOW | `any` mencolok di komponen peta/tabel. | `components/map/*.ts(x)`, `oim-workspace-client.tsx:98` |
| C3 | LOW | Form validasi manual (bukan RHF+zod). | `create-coaching-report-form.tsx:87-134` |
| C4 | LOW | `NEXT_PUBLIC_BACKEND_URL` dipakai server-side tapi terbundel ke browser. | `.env.example:2`, `lib/auth/backend-url.ts` |

### Status yang sudah bersih (diverifikasi)

- SQL injection AMAN (semua raw query parameterized via `Prisma.sql`/`Prisma.join`).
- DTO validasi lengkap + `ValidationPipe` whitelist/forbidNonWhitelisted.
- Path traversal upload AMAN (HMAC signed URL + timingSafeEqual + expiry + ukuran 2 lapis).
- Webhook signature AMAN (HMAC-SHA256 + timingSafeEqual; secret terenkripsi AES-256-GCM).
- SSRF tidak ada (URL dari config env, bukan input user).
- Token session di cookie (bukan localStorage); `dangerouslySetInnerHTML` hanya 2 tempat statis.
- Secrets `.env*` ter-ignore git dengan benar.
- Helmet, CORS whitelist, throttler, idempotency, audit log, cache sudah ada.

---

## 2. Rencana Eksekusi Bertahap

Prioritas: perbaiki yang berisiko tinggi & dampak besar dulu, tanpa mengubah perilaku bisnis.

- **Fase 0** — Dokumentasi & baseline (selesai): rules file + laporan ini.
- **Fase 1 (Keamanan high)** — A1 (sanitasi popup peta), A2 (CSP), A3 (kredensial default), A7 (masking error proxy). ✅ SELESAI
- **Fase 2 (Keamanan medium)** — A4 (global auth guard default-deny), A5 (health detail), A6 (MIME magic bytes), A8 (zod route validasi). ✅ SELESAI
- **Fase 3 (Keamanan low)** — A9 (rate limit), A10 (cookie/log/catch/dead code). ✅ SELESAI
- **Fase 4 (UI/UX)** — B4 (glossary) ✅, B6 (error state) ✅, B7 (a11y) ✅, B1 (arbitrary hex + urgensi token) ✅ sebagian; B1 sisa (sky→cyan perlu keputusan produk), B2 (radius/tinggi), B3 (tipografi), B5 (ekstraksi komponen) — ⏳ menunggu/bertahap.
- **Fase 5 (Data/type)** — C4 (env) ✅, C3 (zod form) ✅; C1 (konsolidasi fetch), C2 (`any`) — ⏳.
- **Fase 6** — Validasi akhir + laporan risiko tersisa. ✅ (sebagian; lihat §4)

Setiap fase ditutup dengan validasi lint/build/test yang relevan dan catatan di `DENS_CAKRA_ENGINEERING_STANDARDS.md` bila menambah aturan baru.

### Status validasi (per 2026-08-14)
- Backend: `nest build` lolos; test `storage-transport` + `api-response` 12 passed.
- Frontend: `tsc --noEmit` 0 error; `biome check` tanpa error baru (hanya nursery/`noArrayIndexKey` bawaan).

---

## 3. Risiko & Keputusan yang Perlu Konfirmasi

1. **A3 kredensial default** — menghapus fallback default bisa mengubah alur lokal/seed. Perlu diputuskan apakah fallback hanya untuk development atau dihapus total.
2. **A4 global auth guard** — default-deny perlu menandai endpoint publik (`@Public()`). Perubahan struktural tapi aman bila ditandai benar.
3. **B1 palet "tactical" field-officer & "Laporan Lapangan"** — kemungkinan desain sengaja; perlu konfirmasi sebelum diubah.
4. **A1 sanitasi** — menambah dependency `dompurify` (baru) untuk sanitasi HTML popup.

## 4. Risiko Tersisa (setelah rencana ini)

- **Type safety BE tidak sepenuhnya ditegakkan**: `tsconfig.build.json` mengeset `noImplicitAny: false` dan mengecualikan `src/scripts/**`, `**/*spec.ts`, `organization/**`, `positions/**`. Banyak implicit-`any` dan beberapa komparasi tipe yang tampak tidak mungkin (`TS2367`) masih ada di `tsc -p tsconfig.json`. Perlu proyek khusus untuk mengaktifkan strict secara bertahap.
- **clamav tidak terpasang di Dockerfile** → fallback scan menandai file `CLEAN` (dengan `skipped: true`). Antivirus belum menjadi kontrol efektif. Rekomendasi: pasang clamav di image, lalu ubah fallback jadi `QUARANTINED`/`UNSCANNED`.
- **Global auth guard (`@Public()`) perlu smoke test runtime** — validasi baru di level type + build, belum dijalankan terhadap aplikasi berjalan (butuh DB & deployment).
- **Hue warna domain sky vs cyan**: token `markerColor #0ea5e9` sebenarnya adalah `sky-500` di Tailwind, sedangkan label token memakai "cyan". `text-sky-600` yang tersebar belum diubah ke cyan karena perlu keputusan produk soal hue final.
- **`trust proxy: 1` + `x-forwarded-for`** tetap bergantung pada topologi reverse-proxy yang benar.
- **`useSecureCookies`** bergantung deteksi `NODE_ENV`/https (sudah diperkuat, tapi pastikan reverse-proxy meneruskan `X-Forwarded-Proto`).
- **Biome**: ada peringatan `nursery/useSortedClasses` dan beberapa `suspicious/noArrayIndexKey` bawaan di file tertentu (bukan dari perubahan ini).
- **Tidak ada automated test FE** — belum ada runner test untuk frontend.

### Catatan investigasi B5 (2026-08-14)

Ekstraksi komponen bersama ternyata lebih kompleks dari temuan awal, perlu desain & uji tersendiri:

- **`FilterWilayah`** (≥6 file): state & cascade provinsi→kab/kota→kecamatan→kelurahan sama, TAPI berbeda di: kedalaman reset cascade (sebagian ikut reset Gaswil/Jaring, sebagian tidak), kontrol kelurahan (`NativeSelect` vs `SearchableSelect`), label "Binda"/"DKI", dan filter Gaswil/Jaring/periode yang disisipkan berbeda. Migrasi butuh komponen `AreaFilterSelects` (4 level) + penyesuaian per-role, diuji per screen.
- **`EmptyState`** (4 file): sebenarnya 4 komponen beda desain — sederhana (`title`/`children`), taktis (wajib di-preservasi), dan radar (sangat custom). Hanya 2 yang bisa disatukan, nilainya kecil.

### Catatan investigasi type safety BE (2026-08-14)

- `src/common/` dan `src/lib/` sudah bersih (0 error) — kode keamanan/intisari sudah ter-tipe penuh.
- Error tersebar ~300 di `src/modules/*` (intelligence-products 83, integrations 75, map-markers 33, baket 27, directives 26, dst.), hampir semua `TS7006` (implicit any pada callback query Prisma) + sebagian `TS7053` (indexing).
- **Bukan bug logika**: `TS2367` (perbandingan mustahil) hanya ada di `organization.service.ts` & `positions` yang sudah dikecualikan dari build (`tsconfig.build.json`).
- `tsconfig.build.json` masih `noImplicitAny: false` → error ini tidak menghalangi build/production.
- Telah diperbaiki sebagian: `authorization.service.ts`, `whatsapp.service.ts`.
- Root cause patut ditelusuri: generator Prisma 7 (`provider = "prisma-client"`) yang tidak mengetik `groupBy`/select bertingkat secara presisi di beberapa titik — ini penyebab `any` merambat.

### TEMUAN KRITIS — migrasi `Position`→`UserOperationalAssignment` belum tuntas (2026-08-15)

**Root cause sebenarnya ditemukan** (bukan generator Prisma): `PrismaService` di `src/modules/prisma/prisma.service.ts` punya `[key: string]: any` + **semua getter model di-override dengan return `any`** (`get user(): any`, dst.). Ini menonaktifkan type safety di seluruh akses `this.prisma.*`.

Saat override `any` tersebut **dibuang** (perbaikan yang benar secara prinsip), `nest build` langsung gagal dengan **51 error tipe nyata** yang selama ini tertutup `any`. Error ini adalah **jalur kode yang mereferensikan model `Position`/`OrganizationUnit` yang sudah dihapus dari schema** (migrasi ke `Role`/`UserOperationalAssignment` belum selesai), antara lain:

- `directive.service.ts` — `position` pada `include`/`where`, akses `version.targetAreas`/`uukStrs`/`recipients` yang tidak di-`select`.
- `intelligence-products.service.ts` (~27 error) — `position.title`, `position.organizationUnit.name`, `position.reportsTo`, `positionId`, relasi `assignee`/`task`/`areaScopes`/`userProfile`/`area` yang tidak di-`select`.
- `task.service.ts` — `assignee.position.role.code`, `positionId`, `assigner.position.title`, narrowing `TaskStatus`.
- `rbac.service.ts` — `_count: { select: { positions: true } }` (relasi dihapus).
- `request-context.middleware.ts:99` — `entityId` bertipe `string[]` (perlu `String()`).

**Dampak runtime**: query dengan `include: { position: ... }` akan **throw di runtime** ("Unknown field 'position'") bila jalur tersebut dieksekusi — artinya jalur ini entah dead code atau gagal diam-diam.

**Keputusan**: override `any` dikembalikan (`git checkout` prisma.service.ts) agar build tetap hijau. Migrasi ini adalah **proyek tersendiri** yang butuh keputusan domain:
- `position.title` → `role.name` (aman).
- `position.organizationUnit.name` → ? (unit organisasi dihapus; kandidat: `branch` CommandRouteType atau cakupan area).
- `position.reportsTo` → ? (alur pelaporan belum ada padanan baru).
- `positionId` → ? (diganti `roleId`).

Rekomendasi: selesaikan migrasi di 4 service ini terlebih dahulu (dengan konfirmasi mapping), baru aktifkan type safety ketat (hapus `[key: string]: any`).

### STATUS MIGRASI: SELESAI (2026-08-15)

Migrasi `Position`/`OrganizationUnit` → `Role`/`UserOperationalAssignment` + `UserAreaScope` **tuntas**:

- `prisma.service.ts` — `[key: string]: any` + getter model `any` **dihapus**; type safety aktif penuh (base class PrismaClient yang sudah bertipe dipakai).
- `task.service.ts` — command chain: Kabinda (REGIONAL_COMMANDER, branch BINDA) → Korwil → Gaswil, via `AdministrativeAreaClosure`.
- `directive.service.ts` — `position.findMany` → `userOperationalAssignment.findMany`; `position.title/code/organizationUnit/reportsTo` → `role.name/code`, `branch`, area scope; `reportsToPositionId`/`seatCode` → null (alur pelaporan belum ada padanan).
- `intelligence-products.service.ts` — `position.title/organizationUnit/reportsTo` → `role.name/branch`; supervisor peta → null (fitur alur pelaporan ditunda).
- `rbac.service.ts` — `_count.positions` → `_count.operationalAssignments`.
- `request-context.middleware.ts` — koersi `entityId`.

**Validasi**: `nest build` lolos **dengan type safety aktif**; 169 test (26 suite) lulus.

**Sisa (bukan bug, hanya perapian tipe):** ~150 `TS7006` (implicit any) di dev config (`noImplicitAny: true`) tersebar di `integrations` (67), `access`, `executive-personnel`, `jaring`, dst. — tidak menghalangi build (`noImplicitAny: false`). `positions`/`organization` (modul lama) tetap dikecualikan dari build.

**Keputusan domain yang diterapkan (mohon review):**
1. Command chain = role + cakupan area (via `AdministrativeAreaClosure`).
2. `organizationUnit` = `branch` + area (`organizationUnitName` = `${branch} ${area.name}`).
3. Alur pelaporan (`reportsTo`) = **belum ada padanan** → supervisor peta & pohon pelaporan jadi `null`. Fitur ini perlu keputusan lanjutan.

## 5. Rekomendasi Lanjutan (di luar scope saat ini)

Model lama `Position` (dari `modules/positions/dto/position.dto.ts` yang dikecualikan build): `seatCode`, `code` (PositionCode), `title`, `roleId/roleCode`, `organizationUnitId`, `reportsToPositionId`, `areaScopeIds`. Penggantinya: `Role` (code/name) + `UserOperationalAssignment` (roleId, branch) + `UserAreaScope`.

**Perbaikan yang sudah aman (sudah diterapkan):**
- `rbac.service.ts` — `_count.positions` → `_count.operationalAssignments` (relasi `positions` dihapus; FE tidak membaca `_count.positions`).
- `request-context.middleware.ts:99` — `entityId` di-koersi (Express 5 mengetik `params` sebagai `string | string[]`).
- `authorization.service.ts` + `whatsapp.service.ts` — anotasi tipe eksplisit.
- `task.service.ts` — **migrasi command-chain selesai** (2026-08-15): `position` → `role`; cek bawahan memakai `AdministrativeAreaClosure` (area assignee dalam cakupan assigner) menggantikan traversal pohon `Position.reportsToPositionId` yang sudah dihapus; `TaskStatus` narrowing; `assigner.position` → `assigner.role`.

**Mapping yang aman (belum diterapkan, menunggu penyelesaian bersama):**
- `position.title` → `role.name`.
- `position.code` / `position.role.code` → `role.code`.
- `positionId` → `assignment.id` (identitas assignment kini adalah id assignment itu sendiri).
- `position` pada `include`/`where` → relasi `role`.
- `position.organizationUnit` → `branch` (CommandRouteType) + area cakupan (`organizationUnitName` = `${branch} ${area.name}` sesuai `AuthorizationContext`).

**BUG LIVE (butuh keputusan domain, belum bisa ditebak aman):**
1. `task.service.ts` `isPositionDescendantOf` — **SUDAH DIPERBAIKI** (lihat atas).
2. `directive.service.ts` (~66 referensi `.position`/`organizationUnit`) — fitur "pelacakan arahan strategis" dibangun di atas pohon `Position`/`OrganizationUnit`; butuh reimplementasi besar, bukan field-rename. Terdapat `this.prisma.position.findMany()` yang akan throw runtime.
3. `intelligence-products.service.ts` (~27) — `position.organizationUnit.name`, `position.reportsTo` (alur pelaporan belum ada padanan → supervisor peta jadi null), `positionId`, relasi yang tidak di-`select`.

**Keputusan yang dibutuhkan dari pemilik domain:**
- Command chain: sudah diasumsikan = hierarki RoleCode + cakupan area via `AdministrativeAreaClosure` (diterapkan di task.service.ts — mohon direview).
- `organizationUnit`: apakah `branch` + area cukup mewakili "unit"?
- Alur pelaporan (reporting line): fitur ditunda/dihapus, atau ada pengganti yang belum dibangun?

## 5. Rekomendasi Lanjutan (di luar scope saat ini)

- **UI/UX sisa** (prioritas rendah, butuh review visual): normalisasi `rounded-xl/2xl` → 4-6px; `h-10` → `h-9`; `font-heading tracking-tight` → `DC_TYPOGRAPHY.pageTitle`; ekstraksi komponen `FilterWilayah` & `EmptyState` (saat ini duplikat di ≥6 file).
- **Data/type sisa**: konsolidasi ~40 `fetch()` manual ke `src/lib/api`; hapus `any` di komponen peta (`components/map/*`); migrasi form validasi manual ke `react-hook-form`+`zod`.
- Tambah vitest/jest + React Testing Library untuk komponen kritis FE.
- Tambah `npm audit` + dependabot/renovate di CI.
- Lengkapi rate limiting login terpusat & lockout akun (login sudah di-rate-limit better-auth 3/10s).
- Pertimbangkan WAF/proxy edge untuk pemantauan trafik.
- Pasang clamav di Docker image + ubah fallback scan.
- Aktifkan `noImplicitAny: true` bertahap di backend (mulai dari folder `common/` dan `lib/`).
