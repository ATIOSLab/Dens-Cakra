# DENS CAKRA — Addendum Audit Ulang (2026-08-18)

Audit ulang menyeluruh pasca `DENS_CAKRA_AUDIT_2026-08-14.md`. Scope sama:
keamanan OWASP, clean code, UI/UX, type safety, error handling, logging, env,
performa, testing. **Tidak ada perubahan fungsi bisnis/API/skema database**
dalam addendum ini; temuan yang belum ada tindakan ditandai "TERSISA".

---

## 1. Verifikasi Ulang (diverifikasi HIJAU)

| Area | Status | Bukti |
| --- | --- | --- |
| Secure headers (Helmet) | ✅ | `main.ts` helmet + `crossOriginResourcePolicy: false` |
| CSP FE | ✅ | `next.config.mjs` `securityHeaders` berisi `Content-Security-Policy` |
| CORS whitelist + credentials | ✅ | `main.ts` `cors: { credentials, origin: env.corsOrigins }` |
| Input validation | ✅ | `ValidationPipe` `whitelist + transform + forbidNonWhitelisted`; DTO class-validator |
| Rate limiting | ✅ | `ThrottlerModule` `short` 20/1s + `default` 300/60s, `ThrottlerGuard` global |
| Auth | ✅ | Better Auth: `trustedOrigins`, rate-limit login 3/10s, `minPasswordLength:8`, `revokeSessionsOnPasswordReset`, audit log auth, `useSecureCookies` |
| RBAC default-deny | ✅ | 4 guard global (`Throttler`, `Session`, `DomainAccess`, `Permission`) via `APP_GUARD` |
| SQL injection | ✅ | Semua `$queryRaw` memakai `Prisma.sql` parameterized / konstanta; tidak ada interpolasi string input user |
| XSS | ✅ | `dangerouslySetInnerHTML` hanya 2 situs statis: `chart.tsx` (recharts) & `theme-boot.tsx` (boot script, ada `biome-ignore` + alasan) |
| CSRF | ✅ | Cookie SameSite + CORS preflight (JSON) + `trustedOrigins` |
| SSRF | ✅ | Tidak ada fetch URL dari input user; URL dari config env |
| Upload file | ✅ | Ukuran (env `MAX_FILE_SIZE_BYTES`), validasi deklarasi-vs-konten (`looksLikeMarkup` deteksi SVG/markup), scan `clamscan`, signed URL HMAC |
| Error handling | ✅ | `ApiExceptionFilter`: 5xx di-mask jadi pesan generik, tanpa stack trace; `requestId` korelasi |
| Secrets | ✅ | `env.ts` validasi ketat (throw bila wajib kosong), tidak ada secret hardcode; kredensial default dihapus (A3 selesai) |
| Audit log | ✅ | Modul audit + log auth event (login/logout/reset/verify) |
| Testing | ✅ | BE 27 `*.spec.ts` (jest, 169 test); FE vitest (3 file) |

## 2. Temuan Baru

### N1 — npm audit backend: 3 high (transitif, risiko praktis rendah)

```
deepmerge-ts <8.0.0 (GHSA-ggr8-5vv4-36mx) — DoS stack exhaustion
  via @prisma/config → prisma (CLI build-time)
```

- **Bukan runtime**: `deepmerge-ts` hanya dipakai Prisma CLI (alat build/migrasi), tidak tereksekusi oleh server pada request user.
- **Tidak ada fix upstream**: `@prisma/config@7.9.1` (terbaru) masih memakai `deepmerge-ts@7.1.5`. Upgrade tidak menyelesaikan; `npm audit fix --force` justru menurunkan ke `prisma@6.12.0` (breaking).
- FE: `npm audit` **0 vulnerabilities**.

Keputusan: **tidak dipaksa-upgrade** (risiko upgrade Prisma > risiko aktual advisory). Dicatat sebagai risiko tersisa + rekomendasi (lihat §4).

## 3. Item Lama yang Masih TERBUKA (dari audit 2026-08-14)

| # | Item | Status | Catatan |
| --- | --- | --- | --- |
| B1 | Hue warna `sky` vs `cyan` (token `markerColor #0ea5e9` = sky-500) | TERSISA | Butuh keputusan produk |
| B2 | Normalisasi radius/tinggi (`rounded-xl/2xl`→4-6px, `h-10`→`h-9`) | TERSISA | Refactor visual luas, butuh review |
| B3 | Tipografi (`font-heading tracking-tight` → `DC_TYPOGRAPHY.pageTitle`, header tabel `font-mono text-[10px]` → token) | TERSISA | Refactor visual luas |
| B5 | Ekstraksi `FilterWilayah` & `EmptyState` (duplikat ≥6 file) | TERSISA | Desain + uji per-screen (lihat catatan investigasi audit lama) |
| C1 | Konsolidasi ~40 `fetch()` manual ke `src/lib/api` | TERSISA | Refactor error-handling, risiko sedang |
| C2 | `any` di komponen peta/tabel | TERSISA | `noImplicitAny` BE bertahap; komponen map |
| — | clamav di Docker image + fallback `QUARANTINED` | TERSISA | Infra |
| — | `npm audit` + dependabot/renovate di CI | TERSISA | Infra |

## 4. Risiko Tersisa & Rekomendasi Lanjutan

1. **N1 deepmerge-ts** — pantau release Prisma yang menaikkan `deepmerge-ts` ke ≥8, lalu upgrade minor (7.x). Tambahkan `npm audit --omit=dev` ke CI dan dependabot.
2. **B1 hue warna** — konfirmasi hue final (sky vs cyan) sebelum refactor token.
3. **B2/B3/B5** — kerjakan bertahap per-screen dengan review visual (bukan bulk sed), karena `FilterWilayah`/`EmptyState` punya perbedaan per-role yang harus dipreservasi.
4. **C1/C2** — lanjutkan konsolidasi fetch & penghapusan `any` bertahap (mulai `common/` + `lib/`), aktifkan `noImplicitAny` bertahap.
5. **Infra** — pasang clamav di Dockerfile (ubah fallback scan → `QUARANTINED`/`UNSCANNED`), tambah automated test FE kritis (vitest + React Testing Library), tambah `npm audit` + dependabot di pipeline.

### Status validasi (2026-08-18)

- Backend: `nest build` hijau; `eslint` 0 error.
- Frontend: `next build` sukses; `tsc --noEmit` 0 error; `biome check` 0 error (294 warning pre-existing).
