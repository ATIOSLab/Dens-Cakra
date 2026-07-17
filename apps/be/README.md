# DEN CAKRA Backend

Backend foundation for DEN CAKRA using NestJS, Prisma, PostgreSQL, and Better Auth.

## Stack

- NestJS 11
- Prisma ORM
- PostgreSQL
- Better Auth 1.6

## Included Foundation

- Better Auth mounted at `/api/auth/*`
- Role catalog aligned with DEN CAKRA documentation
- Admin System role mapped as the Better Auth admin role
- Session guard and role guard for NestJS controllers
- Prisma schema for Better Auth core tables, admin plugin fields, and an `audit_log` table
- Bootstrap admin seed script
- SMTP-backed email verification
- SMTP-backed forgot/reset password flow

## Environment Setup

Copy `.env.example` to `.env` and adjust values as needed.

Untuk setup FE-BE terpisah dengan Next.js sebagai reverse proxy:

- `BETTER_AUTH_URL` harus menunjuk ke origin frontend publik, misalnya `http://localhost:3000`
- `CORS_ORIGIN` harus mengizinkan origin frontend yang sama
- Browser mengakses auth lewat frontend `/api/auth/*`, lalu frontend meneruskan request ke backend NestJS

## Useful Commands

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:dev -- --name init_auth_foundation
npm run seed:admin
npm run start:dev
```

PowerShell di Windows kadang memblokir `npm.ps1`. Kalau command `npm ...`
terkena error Execution Policy, gunakan `npm.cmd ...` dengan command yang sama.

## Local Setup After Pulling a Branch

Jalankan dari folder `apps/be`.

1. Install dependency yang mungkin berubah:

   ```bash
   npm install
   ```

2. Pastikan file environment ada:

   ```bash
   copy .env.example .env
   ```

   Lewati langkah ini kalau `.env` lokal sudah ada dan isinya sudah benar.

3. Pastikan database PostgreSQL/PostGIS lokal hidup. Untuk helper Docker bawaan:

   ```bash
   npm run db:reset:postgis
   ```

   Command ini membutuhkan Docker Desktop dalam keadaan running dan akan mereset
   database sesuai `DATABASE_URL` di `.env`.

4. Generate Prisma client:

   ```bash
   npm run prisma:generate
   ```

5. Jalankan migration:

   ```bash
   npm run migrate:dev
   ```

   Jika membuat migration baru dari perubahan schema, beri nama:

   ```bash
   npm run migrate:dev -- --name nama_perubahan
   ```

6. Isi data awal bila database baru/reset:

   ```bash
   npm run seed:admin
   ```

7. Jalankan backend:

   ```bash
   npm run start:dev
   ```

Catatan: jangan pakai `npx run migrate dev`. Command itu menjalankan package
bernama `run`, lalu Node mencari file lokal bernama `migrate`. Untuk project ini
pakai `npm run migrate:dev`, `npm run prisma:migrate:dev`, atau langsung
`npx prisma migrate dev`.

## Dokploy Deployment

- Use compose path `apps/be/docker-compose.dokploy.yml`.
- Keep routing/domain setup in Dokploy's Domains UI instead of adding Traefik labels manually.
- Dokploy writes panel environment variables to a `.env` file; this compose loads them with `env_file: .env` and only adds a few startup defaults.
- Recommended startup flags in Dokploy:
  - `RUN_MIGRATIONS_ON_STARTUP=true`
  - `RUN_SEED_ON_STARTUP=false`
  - `RUN_JAKARTA_SEED_ON_STARTUP=false`
- `RUN_SEED_ON_STARTUP=true` runs the full baseline seed (`master -> wilayah -> accounts -> STR hierarchy -> Baket`).
- `RUN_JAKARTA_SEED_ON_STARTUP=true` runs only the DKI Jakarta presentation dataset. It requires the baseline data to exist first.
- For a fresh presentation database, set all three flags to `true` for one deployment. The baseline runs before the Jakarta seed.
- For an existing initialized database, use `RUN_SEED_ON_STARTUP=false` and `RUN_JAKARTA_SEED_ON_STARTUP=true` to add only Jakarta data.
- After the initial seed deployment, switch both seed flags back to `false` to avoid unnecessary startup work.
- The container persists upload data and WhatsApp auth state through Docker named volumes.

## Main Endpoints

- `GET /v1/health`
- `GET /v1/access/roles`
- `GET /v1/access/me`
- `GET /api/auth/*` and `POST /api/auth/*` from Better Auth

## Auth Flows Added

- Email verification is required before email/password sign-in can create a session.
- Verification email is sent automatically on sign-up.
- Password reset emails are sent through SMTP.
- Password reset revokes other active sessions.

Useful Better Auth endpoints:

- `POST /api/auth/send-verification-email`
- `POST /api/auth/request-password-reset`
- `POST /api/auth/reset-password`

## Notes

- `AUTH_DISABLE_SIGN_UP=false` is useful during initial bootstrap. Once Admin System user management is in place, you can switch it to `true`.
- The initial bootstrap admin is promoted to the `admin_system` role by the seed script.
