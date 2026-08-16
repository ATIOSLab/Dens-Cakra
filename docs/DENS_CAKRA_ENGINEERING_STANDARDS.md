# DENS CAKRA Engineering Standards

Status: aturan kerja code-level yang mengikat untuk seluruh perubahan di repo ini.
Dokumen ini melengkapi (bukan menggantikan) `DENS_CAKRA_GLOSSARY_SYSTEM.md`,
`DENS_CAKRA_VISUAL_SYSTEM.md`, dan `DENS_CAKRA_RBAC_SYSTEM.md`.

Setiap aturan baru yang diterapkan selama pekerjaan WAJIB dicatat di sini, sehingga
coding selanjutnya konsisten. Prinsip utama: **jangan ubah fungsi bisnis, alur, API,
atau database yang sudah berjalan** kecuali diminta eksplisit.

---

## 1. Clean Architecture & Struktur Kode

### Backend (NestJS — `apps/be`)
- Satu module per domain di `src/modules/<domain>/` (controller, service, module, DTO, spec).
- Logika bisnis di service, controller hanya orkestrasi HTTP. Controller tidak berisi
  query Prisma langsung.
- Akses DB hanya lewat `PrismaService`; query kompleks boleh `$queryRaw` dengan
  **parameterized query** (tidak pernah string-concat nilai input).
- Shared/common logic di `src/common/` (filter, interceptor, guard, middleware, utils).
- Enum/constant domain di `src/common/constants/` atau module terkait, jangan tersebar.

### Frontend (Next.js — `apps/fe`)
- Struktur co-location: komponen khusus screen di `_components/` route-nya; jangan
  pindahkan ke shared directory secara prematur.
- `page.tsx` default Server Component; interaktif/browser ke Client Component.
- Akses API lewat `src/lib/api/{server-client,browser-client}.ts` atau
  `src/server/backend-api.ts` — **jangan** fetch manual berulang di halaman.
- Istilah UI via `DOMAIN_TERMS`; ikon/warna via `DOMAIN_VISUALS` dan token terkait.

## 2. Clean Code
- Nama simbol deskriptif; hindari singkatan tak jelas; satu tanggung jawab per fungsi.
- Hindari fungsi > 40 baris; pecah ke helper kecil dengan tipe eksplisit.
- Tanpa magic number/string: pindahkan ke konstanta bernama.
- Tanpa komentar yang menceritakan ulang kode; komentar hanya menjelaskan "mengapa".

## 3. Type Safety
- TypeScript `strict`; **larang `any`** — gunakan `unknown` + narrowing atau tipe presisi.
- DTO backend dengan `class-validator` (atau Zod) untuk tiap body/query/param.
- Response API frontend diberi tipe generik (`apiServerFetch<T>`, `apiBrowserFetch<T>`).

## 4. Validasi Input
- Backend: semua endpoint menerima input lewat DTO tervalidasi. `ValidationPipe` global
  (`whitelist`, `forbidNonWhitelisted`, `transform`) tetap dipertahankan.
- Validasi `string` panjang maks, format (email, telepon, tanggal, enum) di DTO.
- Frontend form: `react-hook-form` + resolvers (zod). Jangan form tanpa validasi.

## 5. Error Handling
- Backend: lempar `ApiException`/`HttpException`; biarkan `ApiExceptionFilter` yang
  memformat. Jangan `try/catch` lalu swallow error.
- Respon error 5xx TIDAK boleh mengekspos detail internal (stack, query, path file).
- Frontend: tangani `ApiClientError`; tampilkan pesan user-friendly; jangan `console.log`
  data sensitif. `apiRouteErrorResponse` untuk route handler.

## 6. Logging & Observability
- Backend memakai logger NestJS terstruktur (JSON untuk event teknis). Log minimal:
  `requestId`, method, path, status. Log error 5xx selalu.
- **Dilarang** mencatat password, token, secret, full PII ke log.
- Frontend: tidak ada log konsol di production (`removeConsole` sudah aktif).

## 7. Konfigurasi Environment
- Semua konfigurasi lewat `apps/be/src/lib/env.ts` (validasi saat startup, gagalkan cepat
  bila ada yang hilang) atau `.env`. Jangan baca `process.env` tersebar di service.
- Secret TIDAK boleh hardcoded di source. `.env*` tidak di-commit.
- Variabel yang diekspos ke browser hanya lewat `NEXT_PUBLIC_*` dan memang boleh publik.

## 8. Performa & Skalabilitas
- Hindari N+1: gunakan `include`/JOIN/batch; jangan query di dalam loop.
- Query list wajib pagination (offset/cursor) + filter; tambah index bila perlu.
- Gunakan cache (`apiServerGet`, ApplicationCacheModule) untuk data yang jarang berubah;
  invalidasi cache saat mutasi.
- Berat di balik `Suspense`/`loading.tsx` di FE; jangan blokir render utama.

## 9. Keamanan (OWASP Top 10)
- **A01 Broken Access Control**: setiap endpoint dilindungi guard auth + izin berbasis
  `UserOperationalAssignment`/`UserAreaScope`; tidak ada trust pada role label saja.
- **A02 Cryptographic**: hash password (bcrypt/argon2 via Better Auth); key tersimpan di env.
- **A03 Injection**: Prisma parameterized; raw SQL hanya dengan parameter binding;
  validasi/sanitasi input di DTO.
- **A04 Insecure Design**: rate limit di endpoint sensitif (auth, upload); idempotency
  untuk mutasi; validasi ukuran/tipe file upload.
- **A05 Misconfiguration**: helmet + CORS origin whitelist + security headers (FE juga);
  jangan expose Swagger di production.
- **A06 Vulnerable Components**: dependency up-to-date, `npm audit` berkala.
- **A07 Auth Failure**: session cookie `httpOnly`/`secure`; batasi percobaan login.
- **A08 Data Integrity**: validasi idempotency-key; cek kepemilikan resource sebelum mutasi.
- **A09 Logging Failures**: audit log untuk akses/mutasi (sudah ada `AuditLog`).
- **A10 SSRF**: endpoint yang fetch URL dari input user harus validasi allow-list.
- **Default-deny auth**: `SessionGuard` + `DomainAccessGuard` terdaftar sebagai `APP_GUARD`
  global (default-deny). Endpoint publik wajib ditandai eksplisit `@Public()` (dari
  `apps/be/src/common/decorators/public.decorator.ts`). Controller baru TIDAK boleh
  menambah endpoint tanpa guard/tanpa `@Public()`.
- **Error tidak bocor**: endpoint publik (health probe) dan proxy `/api/v1` TIDAK boleh
  mengembalikan detail error internal (hostname/port/path/stack). Log di server, kirim
  pesan generik ke klien.
- **XSS (output encoding)**: semua data dari input user yang di-render sebagai HTML
  (termasuk `Leaflet.bindPopup`/`innerHTML`) WAJIB di-escape lewat `escapeHtml` dari
  `apps/fe/src/lib/utils.ts` (atau sanitizer HTML bila konten kaya). Jangan interpolasi
  string user langsung ke template HTML.
- **CSP**: header `Content-Security-Policy` baseline aktif di production (dikonfigurasi di
  `apps/fe/next.config.mjs`). Perubahan ke `script-src`/`connect-src` wajib diuji agar tidak
  mematahkan map/worker/websocket.
- **Secrets/seed**: TIDAK ada password default/hardcoded. Password seed (admin/superadmin/demo)
  wajib dari env lewat `requireSeedPassword(...)` dari `apps/be/src/lib/env.ts`; script seed
  gagal (fail-fast) bila env tidak diisi.

## 10. Testing
- Backend: unit test (`*.spec.ts`, Jest) untuk service kritis (domain scope, baket, jaring,
  whatsapp, dll). Pertahankan & tambah coverage pada kode baru yang non-trivial.
- Frontend: belum ada runner test — tambahkan bertahap hanya jika diminta; saat ini
  validasi lewat `biome check` + `next build` + script audit (`audit:access-control`,
  `audit:navigation`, `audit:role-navigation`).
- Setiap perubahan yang menyentuh RBAC/menu WAJIB jalankan script audit terkait.

## 11. UI/UX & Design System
- Ikuti `DENS_CAKRA_VISUAL_SYSTEM.md` + `DENS_CAKRA_GLOSSARY_SYSTEM.md` (wajib).
- Semua state: loading, empty, error, success. Kontrol standar `h-9`; radius 4-6px.
- Dropdown panjang searchable; filter wilayah berjenjang. Aksesibilitas: label form,
  aria-label untuk tombol ikon, fokus terlihat, heading hierarki.

## 12. Git & Proses
- Commit conventional: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`.
- Satu commit = satu concern; jangan campur refactor tak terkait.
- Jangan commit secret, `.env*`, artefak build, atau dump DB.
- Sebelum selesai: `biome check` (FE), `eslint` (BE), `next build`, `nest build`, dan
  test yang relevan — hanya bila user meminta validasi.

---

## Log Perubahan Aturan

| Tanggal | Aturan ditambahkan/diubah | Alasan |
| --- | --- | --- |
| 2026-08-14 | Dokumen dibuat sebagai baseline standar engineering. | Konsolidasi aturan agar coding selanjutnya konsisten. |
| 2026-08-14 | Fase 1: XSS output encoding (escapeHtml untuk bindPopup/innerHTML); CSP baseline di production; hapus password default seed (requireSeedPassword); proxy `/api/v1` memask 5xx. | Menutup celah XSS/CSRF/kredensial publik sesuai OWASP. |
| 2026-08-14 | Fase 2: default-deny global guard + `@Public()`; health probe tidak membocorkan detail; tolak konten HTML/script yang menyamar sebagai gambar; validasi zod pada API route live-location. | Hardening auth & input sesuai OWASP. |
| 2026-08-14 | Fase 3: `@Throttle` untuk presign/complete/upload/webhook; `useSecureCookies` deteksi https + override `AUTH_SECURE_COOKIES`; `console.error` runtime diganti Logger terstruktur; hapus `RoleGuard` dead code. | Rate limit & observability, cookie hardening. |
| 2026-08-14 | Fase 4 (sebagian): istilah UI disesuaikan glossary (Ubah/Bahan Keterangan (Baket)/Kembalikan untuk perbaikan/Sebelumnya-Berikutnya); error state di Baket officer; aria-label tombol ikon; warna urgensi OIM memakai `URGENCY_VISUALS` (NORMAL=emerald, LOW=cyan). | Konsistensi glossary, a11y, design token. |
| 2026-08-14 | Fase 4 lanjutan: hapus arbitrary hex `#38BDF8`→`sky-400` dan `#14B8FF`→`cyan-400` (named color, tanpa perubahan visual). | Larangan arbitrary hex pada visual system. |
| 2026-08-14 | C4: `.env.example` FE — hapus `NEXT_PUBLIC_BACKEND_URL` (agar URL internal tidak bocor ke bundle browser); gunakan `BACKEND_INTERNAL_URL` (server-only). | Cegah kebocoran hostname internal. |
| 2026-08-14 | C3: validasi form laporan pembinaan memakai zod (schema bersama `coaching-report-schema.ts`), menggantikan validasi manual duplikat di form & dialog; konsistensi `credentials: include` di session-heartbeat. | Validasi input terpusat & konsisten. |
| 2026-08-14 | Type safety BE: perbaiki `noImplicitAny` di `authorization.service.ts` & `whatsapp.service.ts`. | Kurangi `any` di module keamanan. |
| 2026-08-16 | RBAC: hapus role `operational_intelligence_manager` sebagai system role; OIM/Anev menjadi fungsi analis yang melekat pada Kabinda (BINDA) / Ditwil (DIRECTORATE). Endpoint & workspace `/dashboard/oim` kini milik `executive` + `regional_commander`. | Selaraskan role dengan garis komando & supervisi BIN. |
| 2026-08-16 | Migrasi DB `20260816120000_remove_oim_role`: reassign assignment OIM → REGIONAL_COMMANDER, update `User.role`, hapus RoleAreaPolicy/Role OIM, drop nilai enum. | Data aman (backup penuh 214 MB sebelum apply). |
| 2026-08-16 | Menu sidebar per role dirapikan: hapus duplikat "Beranda" (`oim-home`), bedakan judul "Produk Intelijen" (view/approval) vs "Laporan Intelijen" (workspace). | Audit RBAC 0 issue. |
| 2026-08-16 | Biome: upgrade 2.5.8 (fix panic), normalisasi format, hapus `any` peta & dashboard, warning 428 → ±295 (sisa nested ternary/ref defensive disengaja). | CI FE & BE hijau. |
