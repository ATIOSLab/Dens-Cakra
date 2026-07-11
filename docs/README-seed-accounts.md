# Backend Seed Accounts

Dokumen ini mencatat akun demo lokal hasil seed backend DEN CAKRA.

## Catatan

1. Akun-akun di bawah ditujukan untuk environment lokal/development.
2. Seluruh akun seed di-set `emailVerified = true`, jadi bisa langsung login.
3. Endpoint auth backend menggunakan Better Auth pada path `/api/auth/*`.
4. Jika akun sudah pernah ada sebelumnya dengan email yang sama, seed akan memastikan role dan profilnya sesuai, tetapi tidak mengubah password akun lama.

## Akun Tersedia

| Role | Nama | Email | Password |
|---|---|---|---|
| Executive | Executive Demo | `executive@denscakra.local` | `DensCakraDemo123!` |
| Regional Commander | Regional Commander Demo | `regional.commander@denscakra.local` | `DensCakraDemo123!` |
| Operational Intelligence Manager | Operational Intelligence Manager Demo | `oim@denscakra.local` | `DensCakraDemo123!` |
| Field Coordinator | Field Coordinator Demo | `field.coordinator@denscakra.local` | `DensCakraDemo123!` |
| Field Officer | Field Officer Bangkinang | `field.officer@denscakra.local` | `DensCakraDemo123!` |
| Field Officer | Field Officer Bangkinang | `field.officer.bangkinang@denscakra.local` | `DensCakraDemo123!` |
| Field Officer | Field Officer Pekanbaru | `field.officer.pekanbaru@denscakra.local` | `DensCakraDemo123!` |
| Admin System | Admin System DEN CAKRA | `admin@denscakra.local` | `ChangeMe123!` |

## Cara Menjalankan Seed

```bash
cd apps/be
npm run seed:roles
npm run seed:whatsapp
```

## Endpoint Login

Gunakan endpoint Better Auth berikut untuk login email/password:

```text
POST /api/auth/sign-in/email
```
