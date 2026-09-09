# Kronologi Perubahan Status Verifikasi Jaring

> Dokumen Rekap Investigasi Data Operasional  
> Tanggal Laporan: 4 September 2026  
> Basis Data Sumber: Production PostgreSQL (`148.230.98.12:5434/postgres`)  
> Periode Insiden: 31 Agustus 2026 s.d. 3 September 2026

---

## 1. Ringkasan Eksekutif

Pada laporan per **31 Agustus 2026**, tercatat total Jaring Terverifikasi aktif se-DKI Jakarta berjumlah **1.365 jaring** (dengan Jakarta Timur berjumlah **493 jaring**). Pada penarikan data terkini per **4 September 2026**, total Jaring Terverifikasi aktif berjumlah **1.363 jaring** (dengan Jakarta Timur berjumlah **491 jaring**).

Berdasarkan hasil investigasi mendalam terhadap tabel `Jaring`, `AuditLog`, berkas aset foto profil (`FileAsset`), serta aturan bisnis pada kode sumber aplikasi:

1. **Tidak ada data jaring yang terhapus (*no deletion*).**  
   Audit log terakhir untuk aksi penghapusan jaring (`JARING.DELETE`) tercatat pada **14 Agustus 2026 pukul 04:44 UTC**. Sejak tanggal tersebut hingga saat ini, tidak ada satu pun baris data yang dihapus (baik *hard delete* maupun *soft delete*).
2. **Terjadi pengurangan 2 jaring terverifikasi akibat aksi penolakan (*rejection*).**  
   Dua slot jaring di Kecamatan Duren Sawit, Jakarta Timur (`X07010` dan `X07035`) mengalami pengubahan identitas profil total oleh Petugas Wilayah (Gaswil), yang memicu sistem me-reset status verifikasinya menjadi `PENDING`. Selanjutnya, kedua pengajuan tersebut **ditolak (`REJECTED`)** oleh Koordinator Wilayah (Korwil) Jakarta Timur pada **3 September 2026 pukul 08:20 WIB**.

$$\text{1.365 (Per 31 Agustus)} - 2\text{ (Ditolak Korwil)} = \mathbf{1.363\text{ Jaring Terverifikasi Aktif}}$$

---

## 2. Rincian Perubahan Data Profil Jaring

Perubahan yang dilakukan oleh Petugas Wilayah (Gaswil) bukan sekadar perbaikan kecil (koreksi typo), melainkan **pergantian seluruh identitas orang** pada slot kode jaring yang sebelumnya sudah aktif dan terverifikasi.

### A. Jaring `X07010` (UUID: `a3e441e5-7072-4d7b-8f45-b291a72b365d`)

* **Aktor Pengubah:** Rahmat (`FIELD_OFFICER` / Petugas Wilayah Duren Sawit)
* **Waktu Pengubahan:** Kamis, 3 September 2026 pukul 07:45:39 WIB (00:45:39 UTC)

| Bidang Data (*Field*) | Data Semula (Sebelum 3 Sep 2026) | Data Baru Hasil Pengubahan (3 Sep 2026) | Analisis Perubahan |
| :--- | :--- | :--- | :--- |
| **Foto Profil** | Berkas: `Rizki Adriansyah.jpg`<br>UUID: `beaa7ff2-48d4-4710-806e-1b45c58e9914`<br>Dibuat: 29 Juli 2026 | Berkas: `1000034384.jpg`<br>UUID: `55a8afd5-e61a-48af-a9b3-f06db6fae85a`<br>Dibuat: 3 Sep 2026, 07:45:38 WIB (3,6 MB) | Foto diganti secara fisik dengan foto orang baru. |
| **Nama Lengkap** | **Rizki Adriansyah** | **Al Masyhur** | Pergantian nama personil jaring. |
| **Nomor WhatsApp** | `628138533798` | `681293617292` | Penggantian nomor ke format tidak valid (salah kode negara `68`, seharusnya `62`). |
| **Kelurahan Cakupan** | **Pondok Bambu** | **Pondok Kelapa** | Perpindahan kelurahan binaan. |
| **Tempat / Tgl Lahir** | Jakarta, 1990-an | Jakarta, 07 September 1997 | Data kelahiran diganti. |
| **Pekerjaan / Jabatan** | Karyawan Swasta | Ojol / FKDM Kelurahan Pondok Kelapa | Data profesi diganti. |
| **Alamat Domisili** | Pondok Bambu, Duren Sawit | Jl. Bina Karya No. 70 RT 006/01, Pondok Kelapa | Alamat tempat tinggal diganti. |
| **Catatan / Potensi** | Catatan personil lama | *"Sebagai anggota FKDM yang bersangkutan, mampu menjadi sumber informasi yang akurat bagi instansi terkait. Masih muda sehingga tingkat fleksibelitas tinggi"* | Catatan potensi diganti. |

---

### B. Jaring `X07035` (UUID: `ca64012a-9aff-4044-8a39-0ebf9bdb8f03`)

* **Aktor Pengubah:** Rahmat (`FIELD_OFFICER` / Petugas Wilayah Duren Sawit)
* **Waktu Pengubahan:** Kamis, 3 September 2026 pukul 07:49:19 WIB (00:49:19 UTC)

| Bidang Data (*Field*) | Data Semula (Sebelum 3 Sep 2026) | Data Baru Hasil Pengubahan (3 Sep 2026) | Analisis Perubahan |
| :--- | :--- | :--- | :--- |
| **Foto Profil** | Berkas: `EKO TRIMAKNO.jpg`<br>UUID: `84057fc2-0dd6-4fff-a1c8-390f788f374e`<br>Dibuat: 30 Juli 2026 | Berkas: `1000034385.jpg`<br>UUID: `710dff02-3ecf-4faf-acb6-5eb4fd2c1560`<br>Dibuat: 3 Sep 2026, 07:49:18 WIB (44 KB) | Foto diganti secara fisik dengan foto orang baru. |
| **Nama Lengkap** | **EKO TRIMAKNO** | **Jaini** | Pergantian nama personil jaring. |
| **Nomor WhatsApp** | `6285771157005` | `6289682427528` | Penggantian nomor telepon WhatsApp. |
| **Kelurahan Cakupan** | **Pondok Bambu** | **Pondok Kelapa** | Perpindahan kelurahan binaan. |
| **Tempat / Tgl Lahir** | Jakarta, 1980-an | Jakarta, 06 April 1973 | Data kelahiran diganti. |
| **Pekerjaan / Jabatan** | Wiraswasta | Buruh Harian Lepas / FKDM Pondok Kelapa | Data profesi diganti. |
| **Alamat Domisili** | Pondok Bambu, Duren Sawit | Jl. Pondok Kelapa VII Blok C RT 10/RW 04, Pondok Kelapa | Alamat tempat tinggal diganti. |
| **Catatan / Potensi** | Catatan personil lama | *"Sebagai anggota FKDM yang bersangkutan, memahami pentingnya sinergi antara masyarakat dan aparat keamanan"* | Catatan potensi diganti. |

---

## 3. Garis Waktu Lengkap (Timeline) Berdasarkan Audit Log

```
29–30 Juli 2026      31 Agustus 2026             3 September 2026 (07:45 - 08:20 WIB)
───────┬────────────────────┬────────────────────────────────────┬────────────────────────►
       │                    │                                    │
Registrasi Awal       Rekap Bulanan Ditutup                Aksi Pengubahan Profil
(Rizki & Eko          (Total DKI: 1.365                    & Penolakan oleh Korwil
disetujui Korwil)     Jaktim: 493)                         (Total DKI menjadi 1.363)
```

| No | Waktu (WIB) | Pengguna / Aktor | Peran (Role) | Aksi Sistem | Entitas Target | Keterangan & Rincian Aksi |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **29-07-2026 08:42** | Rahmat | `FIELD_OFFICER` | `JARING.CREATE` | `a3e441e5...` | Pendaftaran awal Jaring atas nama **Rizki Adriansyah** (foto: `Rizki Adriansyah.jpg`). |
| 2 | **30-07-2026 13:32** | FC Jakarta Timur | `FIELD_COORDINATOR` | `JARING.REGISTRATION.APPROVE` | `a3e441e5...` | Persetujuan registrasi jaring Rizki Adriansyah (Status: `APPROVED`). |
| 3 | **30-07-2026 15:11** | Rahmat | `FIELD_OFFICER` | `JARING.CREATE` | `ca64012a...` | Pendaftaran awal Jaring atas nama **EKO TRIMAKNO** (foto: `EKO TRIMAKNO.jpg`). |
| 4 | **31-07-2026 00:54** | FC Jakarta Timur | `FIELD_COORDINATOR` | `JARING.REGISTRATION.APPROVE` | `ca64012a...` | Persetujuan registrasi jaring Eko Trimakno (Status: `APPROVED`). |
| 5 | **31-08-2026 19:00** | Sistem / Admin | — | Penarikan Rekap | Wilayah DKI | Penutupan rekap bulanan Agustus 2026: **1.365 Jaring Terverifikasi** (Jaktim: 493). |
| 6 | **03-09-2026 07:45:38** | Rahmat | `FIELD_OFFICER` | `FILE.PRESIGN` & `COMPLETE` | `55a8afd5...` | Mengunggah file foto profil baru `1000034384.jpg`. |
| 7 | **03-09-2026 07:45:39** | Rahmat | `FIELD_OFFICER` | `JARING.UPDATE` & `HTTP.PATCH` | `a3e441e5...` (`X07010`) | Menyimpan pengubahan data jaring `X07010` menjadi **Al Masyhur**. Sistem otomatis mengubah status menjadi `PENDING` dan `INACTIVE`. |
| 8 | **03-09-2026 07:49:18** | Rahmat | `FIELD_OFFICER` | `FILE.PRESIGN` & `COMPLETE` | `710dff02...` | Mengunggah file foto profil baru `1000034385.jpg`. |
| 9 | **03-09-2026 07:49:19** | Rahmat | `FIELD_OFFICER` | `JARING.UPDATE` & `HTTP.PATCH` | `ca64012a...` (`X07035`) | Menyimpan pengubahan data jaring `X07035` menjadi **Jaini**. Sistem otomatis mengubah status menjadi `PENDING` dan `INACTIVE`. |
| 10 | **03-09-2026 08:20:34** | FC Jakarta Timur | `FIELD_COORDINATOR` | `JARING.REGISTRATION.REJECT` | `ca64012a...` (`X07035`) | Korwil menolak pengajuan Jaring Jaini (`REJECTED`). |
| 11 | **03-09-2026 08:20:50** | FC Jakarta Timur | `FIELD_COORDINATOR` | `JARING.REGISTRATION.REJECT` | `a3e441e5...` (`X07010`) | Korwil menolak pengajuan Jaring Al Masyhur (`REJECTED`). |

---

## 4. Mekanisme & Logika Teknis Sistem

### A. Mengapa Status yang Sudah `APPROVED` Tidak Dapat Ditolak Langsung?
Pada berkas backend [`apps/be/src/modules/jaring/jaring.service.ts`](file:///d:/Aplikasi/Dens-Cakra/apps/be/src/modules/jaring/jaring.service.ts#L1819-L1825), diterapkan validasi integritas status:
```typescript
const existing = await this.prisma.jaring.findUniqueOrThrow({
  where: { id },
  select: { registrationStatus: true },
});
if (existing.registrationStatus === JaringRegistrationStatus.APPROVED) {
  throw new ApiException(
    'JARING_REGISTRATION_ALREADY_APPROVED',
    'Jaring yang sudah disetujui tidak dapat ditolak.',
    409,
  );
}
```
Tombol *Tolak Registrasi* pada antarmuka pengguna tidak dapat digunakan secara langsung untuk membatalkan jaring yang statusnya sudah aktif terverifikasi.

### B. Mekanisme Reset Status ke `PENDING` saat Terjadi Pengubahan Profil
Pada baris 1939–1945 berkas yang sama, sistem mendefinisikan bahwa setiap pembaruan data profil (`PATCH /api/field-officer/jaring/:id`) mewajibkan peninjauan ulang:
```typescript
await this.prisma.jaring.update({
  where: { id },
  data: {
    ...patch,
    registrationStatus: JaringRegistrationStatus.PENDING,
    status: JaringStatus.INACTIVE,
    deactivatedAt: new Date(),
    rejectionReason: null,
    reviewedAt: null,
    reviewedByAssignmentId: null,
  },
});
```
Karena statusnya di-reset menjadi `PENDING`, record tersebut kembali masuk ke daftar antrean verifikasi Koordinator Wilayah (Korwil).

### C. Hak Akses Persetujuan dan Penolakan (RBAC)
Berdasarkan kontrak API pada [`apps/be/src/modules/jaring/jaring.controller.ts`](file:///d:/Aplikasi/Dens-Cakra/apps/be/src/modules/jaring/jaring.controller.ts#L253-L269):
* Hak akses persetujuan (`approveRegistration`) dan penolakan (`rejectRegistration`) hanya diberikan kepada peran **`field_coordinator` (Koordinator Wilayah)**.
* Akun yang mengeksekusi penolakan adalah:
  * **Nama Akun:** `Field Coordinator Jakarta Timur`
  * **Email:** `fc.jakarta.timur@denscakra.local`
  * **Wilayah Wewenang:** Kota Administrasi Jakarta Timur (`31.75`)

---

## 5. Rekapitulasi Status Jaring Terkini (Per 4 September 2026)

### A. Sebaran Jaring Terverifikasi Aktif per Wilayah Administrasi DKI Jakarta

| No | Wilayah Kota / Kabupaten Administrasi | Jumlah Jaring Terverifikasi | Persentase |
| :-: | :--- | :---: | :---: |
| 1 | **Kota Administrasi Jakarta Timur** | **491** | 36,02% |
| 2 | **Kota Administrasi Jakarta Utara** | **260** | 19,08% |
| 3 | **Kota Administrasi Jakarta Pusat** | **254** | 18,64% |
| 4 | **Kota Administrasi Jakarta Selatan** | **216** | 15,85% |
| 5 | **Kota Administrasi Jakarta Barat** | **97** | 7,12% |
| 6 | **Kabupaten Administrasi Kepulauan Seribu** | **45** | 3,30% |
| | **Total Terverifikasi Aktif** | **1.363** | **100,00%** |

### B. Komposisi Seluruh Record pada Tabel Database

| Status Registrasi | Status Operasional | Status Fisik Data | Jumlah Record |
| :--- | :--- | :--- | :---: |
| **APPROVED (Terverifikasi)** | **ACTIVE** | Aktif di sistem | **1.363** |
| **APPROVED (Terverifikasi)** | ARCHIVED | Arsip lama (*soft-deleted*) | 59 |
| **PENDING (Menunggu Tinjauan)** | INACTIVE | Aktif di sistem | 6 |
| **PENDING (Menunggu Tinjauan)** | ARCHIVED | Arsip lama (*soft-deleted*) | 37 |
| **REJECTED (Ditolak)** | INACTIVE | Aktif di sistem (termasuk X07010 & X07035) | 103 |
| **REJECTED (Ditolak)** | ARCHIVED | Arsip lama (*soft-deleted*) | 22 |
| **Total Record di Database** | — | — | **1.590** |

---

## 6. Catatan dan Rekomendasi Operasional

1. **Integritas Slot Jaring vs Jaring Baru:**  
   Praktik menimpa (*overwrite*) profil orang lama yang sudah tidak aktif dengan orang baru di slot kode jaring yang sama tidak direkomendasikan. Jika personil lama nonaktif, jaring lama sebaiknya diarsipkan/dinonaktifkan secara resmi, dan personil baru didaftarkan melalui alur registrasi baru (*Create New Jaring*) agar kode dan riwayat penugasannya tetap akuntabel.
2. **Validasi Format Nomor WhatsApp:**  
   Penginputan nomor telepon pada Jaring `X07010` (`681293617292`) terindikasi salah ketik kode negara (`68` bukan `62`), yang mengakibatkan pesan laporan WhatsApp dari personil tersebut sebelumnya tidak terdeteksi oleh sistem bot (masuk kategori `TIDAK_TERDAFTAR`).
