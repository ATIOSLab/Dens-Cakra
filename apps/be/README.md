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

## Useful Commands

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:dev -- --name init_auth_foundation
npm run seed:admin
npm run start:dev
```

## Main Endpoints

- `GET /v1/health`
- `GET /v1/auth/me`
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
