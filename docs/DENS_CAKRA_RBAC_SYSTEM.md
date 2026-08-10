# DENS CAKRA RBAC System

Dokumen ini menjadi aturan kerja untuk RBAC, cakupan akses, menu, filter, dashboard, laporan, dan query data DENS CAKRA. Istilah harus tetap selaras dengan `docs/DENS_CAKRA_GLOSSARY_SYSTEM.md`.

## Prinsip Utama

Hak akses tidak boleh hanya ditentukan dari nama jabatan atau label menu. Sistem menghitung akses dari kombinasi:

- role sistem;
- fungsi operasional;
- unit organisasi;
- wilayah penugasan atau wilayah supervisi;
- kewenangan tindakan;
- status aktif assignment.

Identitas teknis seperti enum, route, field API, dan nama model database boleh tetap berbahasa Inggris untuk kompatibilitas. Label tampilan pengguna menggunakan Bahasa Indonesia sesuai glosarium.

## Hierarki Komando Kewilayahan

Garis komando kewilayahan tetap:

```text
BIN Pusat / KaBIN
-> BIN Daerah (Binda) / Kabinda
-> Koordinator Wilayah (Korwil)
-> Petugas Wilayah (Gaswil)
-> Jaring
```

Garis ini tidak berubah oleh pembagian supervisi Direktorat/Ditwil. Direktorat/Ditwil tidak menggantikan Kabinda, Korwil, atau Gaswil dalam komando kewilayahan.

## Garis Supervisi BIN Pusat

Garis supervisi pusat:

```text
Kedeputian II / Deputi II
-> Direktorat/Ditwil
-> Wilayah supervisi
```

Supervisi adalah cakupan lihat, analisis, validasi, tindak lanjut, dan pengendalian produk sesuai kewenangan. Supervisi bukan garis komando kewilayahan.

## Aturan Umum Direktorat/Ditwil

Untuk provinsi selain DKI Jakarta:

- Direktorat/Ditwil memakai cakupan supervisi level Provinsi.
- Satu Direktorat/Ditwil dapat memiliki satu atau lebih Provinsi sesuai konfigurasi Admin.
- Scope berlaku ke data Binda, Korwil, Gaswil, Jaring, Laporan Jaring, Bahan Keterangan (Baket), dan Laporan Intelijen di bawah provinsi tersebut.

Implementasi database menggunakan `UserOperationalAssignment` dan `UserAreaScope`, bukan mapping hardcoded di source code.

## Aturan Khusus Provinsi DKI Jakarta

Khusus Provinsi DKI Jakarta:

- Direktorat/Ditwil tidak memakai cakupan Provinsi DKI Jakarta.
- Cakupan supervisi Direktorat/Ditwil harus memakai level Kota/Kabupaten administratif DKI Jakarta.
- Satu pengguna Direktorat/Ditwil dapat memiliki satu atau lebih Kota/Kabupaten DKI.
- Satu Kota/Kabupaten DKI dapat berada dalam cakupan satu atau lebih pengguna Direktorat/Ditwil jika ditetapkan Admin.
- Pembagian Direktorat/Ditwil ke Kota/Kabupaten DKI wajib dapat diubah dari Pengaturan Admin.
- Source code tidak boleh mengunci Direktorat tertentu ke Kota/Kabupaten tertentu.

Relasi yang dipakai:

```text
Direktorat/Ditwil
-> UserOperationalAssignment
-> UserAreaScope
-> AdministrativeArea level CITY/REGENCY di bawah Provinsi DKI Jakarta
```

Kota/Kabupaten DKI yang dapat menjadi scope berasal dari master `AdministrativeArea`, bukan daftar hardcoded per Direktorat.

## Logika Scope

Ketika sistem menentukan cakupan Direktorat/Ditwil:

1. Ambil assignment aktif pengguna.
2. Ambil `UserAreaScope` aktif dari assignment tersebut.
3. Jika area adalah DKI Jakarta:
   - area level Provinsi DKI ditolak untuk Direktorat/Ditwil;
   - area level Kota/Kabupaten DKI diterima;
   - seluruh data descendant kota/kabupaten tersebut masuk scope.
4. Jika area bukan DKI Jakarta:
   - scope Direktorat/Ditwil harus level Provinsi;
   - seluruh data descendant provinsi tersebut masuk scope.
5. Filter, dashboard, laporan, peta, dan API wajib memakai scope yang sama.

## Kontrak Implementasi

Sumber policy backend:

- `apps/be/src/common/administrative/dki-supervision.ts`
- `apps/be/src/modules/access/domain-scope.service.ts`
- `apps/be/src/modules/users/user-profile.service.ts`

Panel Admin:

- route: `/dashboard/admin-system/supervisi-dki`
- API list: `GET /api/v1/user-profiles/dki-supervision`
- API update: `POST /api/v1/user-profiles/:userProfileId/dki-supervision-scope`

Kontrak penting:

- `DKI_SUPERVISION_RBAC_POLICY.forbidsHardcodedDirectorateCityAssignment` harus tetap `true`.
- `DKI_SUPERVISION_RBAC_POLICY.allowsMultipleRegencyCitiesPerDirectorate` harus tetap `true`.
- `DKI_SUPERVISION_RBAC_POLICY.allowsMultipleDirectoratesPerRegencyCity` harus tetap `true`.
- `UserAreaScope` adalah konfigurasi Admin yang menentukan scope aktif.
- Audit log wajib mencatat perubahan assignment/scope.

## Aturan Menu Dan Tampilan

Menu dan halaman harus mengikuti role dan scope aktif:

- Deputi II melihat cakupan nasional dalam domain Kedeputian II.
- Direktorat/Ditwil melihat cakupan supervisinya.
- Binda/Kabinda melihat cakupan provinsi komando kewilayahan.
- Korwil melihat cakupan kabupaten/kota.
- Gaswil melihat cakupan kecamatan dan Jaring binaannya.
- Jaring hanya terkait kanal pelaporan miliknya.

Filter wilayah harus berjenjang dan tidak boleh menampilkan pilihan di luar scope pengguna.

## Larangan

- Jangan hardcode `Direktorat 21 -> Jakarta Selatan` atau mapping serupa di source code.
- Jangan memakai Provinsi DKI Jakarta sebagai scope Direktorat/Ditwil.
- Jangan mencampur garis komando kewilayahan dengan garis supervisi pusat.
- Jangan menampilkan data di luar `DomainScopeService`.
- Jangan memakai istilah yang bertentangan dengan glosarium.
