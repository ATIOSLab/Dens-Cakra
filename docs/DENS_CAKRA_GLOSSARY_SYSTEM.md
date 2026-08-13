# Glosarium Sistem DENS CAKRA

Status: source of truth untuk bahasa, label UI, dan istilah bisnis DENS CAKRA.

Gunakan dokumen ini setiap kali mengubah UI, copy, navigasi, filter, tabel, form, loading, empty state, error, toast, export, atau dokumentasi. Helper kode yang harus tetap selaras: `apps/fe/src/lib/domain/terminology.ts`.

Tambahan arahan user 2026-08-08: untuk entitas Jaring, label user-facing cukup "Jaring"; jangan pakai "Jaring Lapangan".

## Prinsip Bahasa

1. Bahasa utama aplikasi adalah Bahasa Indonesia.
2. Istilah Inggris boleh dipakai jika sudah lazim, berupa nama produk/brand, atau merupakan istilah teknis yang lebih jelas bila tidak diterjemahkan.
3. Jangan mencampur dua label untuk konsep yang sama di halaman berbeda.
4. Jangan menerjemahkan identifier teknis: role code, enum, route segment, field API, nama model, nama kolom database, dan nama file tetap mengikuti kode.
5. Jika satu istilah diubah, audit semua permukaan yang tersentuh: sidebar, breadcrumb, judul halaman, tab, filter, label form, kolom tabel, badge status, empty state, loading, error, toast, dialog, export, dan dokumentasi.

## Aturan Setelah Coding

Sebelum menganggap revisi selesai:

1. Cek apakah ada kata/istilah baru yang muncul di UI.
2. Cocokkan istilah itu dengan tabel glosarium ini.
3. Jika konsepnya sama, gunakan label yang sama persis.
4. Jika konsepnya berbeda, beri label yang jelas agar tidak tertukar.
5. Jika istilah baru memang dibutuhkan, tambahkan ke glosarium ini dan, bila dipakai di banyak tempat, tambahkan ke `DOMAIN_TERMS`.
6. Jalankan validasi yang relevan untuk file yang disentuh.

## Role Dan Organisasi

| Konsep | Label UI kanonis | Identifier teknis yang dipertahankan | Catatan |
| --- | --- | --- | --- |
| Deputi II | Deputi II | `executive`, `EXECUTIVE` | Label UI untuk role pusat pada dashboard Deputi II; identifier teknis tetap `executive`. |
| Komandan Regional | Komandan Regional | `regional_commander`, `REGIONAL_COMMANDER` | Jangan otomatis ganti menjadi Kabinda kecuali konteks jabatan aktual memang Kabinda. |
| Manajer Intelijen Operasional | Manajer Intelijen Operasional | `operational_intelligence_manager` | OIM boleh dipakai sebagai singkatan di ruang sempit setelah label lengkap jelas. |
| Koordinator Wilayah (Korwil) | Koordinator Wilayah (Korwil) | `field_coordinator`, `FIELD_COORDINATOR`, position code seperti `KORWIL` | Label UI untuk role/jabatan Korwil. Identifier teknis tetap dipertahankan. |
| Petugas Wilayah | Petugas Wilayah (Gaswil) | `field_officer`, `FIELD_OFFICER` | Jangan pakai Handler untuk UI. |
| Personel Lapangan | Personel Lapangan | assignment/personel operasional | Gunakan untuk label netral ketika data teknis belum membedakan Gaswil, Korwil, atau petugas organik. |
| Admin Sistem | Admin Sistem | `admin_system`, `ADMIN_SYSTEM` | Untuk role pengelola sistem. |
| Akun Sistem | Akun Sistem | akun superadmin/admin teknis | Akun khusus administrasi sistem; bukan jabatan struktural BIN. |
| Badan Intelijen Negara | Badan Intelijen Negara | sesuai data organisasi | BIN boleh dipakai setelah label lengkap jelas. |
| Kepala BIN | Kepala BIN (KaBIN) | sesuai data jabatan | Pertahankan kapitalisasi ini. |
| Kedeputian II | Kedeputian II | branch/unit teknis | Jangan ganti menjadi Deputy di UI. |
| Deputi II | Deputi II | position teknis | Label jabatan. |
| Direktorat 21-25 | Direktorat 21-25 | `DIRECTORATE` | UI memakai Direktorat, bukan Directorate. |
| Direktur 21-25 | Direktur 21-25 | position teknis | Label jabatan. |
| BIN Daerah | BIN Daerah (Binda) | branch/unit teknis | Binda boleh dipakai setelah label lengkap jelas. |
| Kepala BIN Daerah | Kepala BIN Daerah (Kabinda) | position code seperti `KABINDA` | Gunakan untuk jabatan aktual Kabinda. |

## Aturan Struktur, Role, Dan Fungsi

Dokumen ini menjadi aturan final untuk pembentukan unit organisasi, jabatan/role, cakupan wilayah, hak akses, dan workflow laporan. Saat membangun fitur baru, pisahkan empat konsep ini:

| Konsep | Makna | Aturan |
| --- | --- | --- |
| Unit organisasi/wilayah | Tempat pengguna berada. | Contoh: BIN Pusat, Kedeputian II, Direktorat 21-25, BIN Daerah (Binda), Kota/Kabupaten, Kecamatan. |
| Jabatan/role | Kedudukan pengguna dalam sistem. | Contoh: Deputi II, Komandan Regional, Manajer Intelijen Operasional (OIM), Koordinator Wilayah (Korwil), Petugas Wilayah (Gaswil), Jaring. |
| Fungsi | Tugas tambahan yang melekat pada pengguna tertentu. | Contoh: Anev Binda, Anev Direktorat, Anev Kedeputian. Fungsi bukan tingkat wilayah. |
| Cakupan akses | Wilayah data yang boleh dibaca atau dikelola. | Harus dihitung dari role, fungsi, unit organisasi, wilayah penugasan, dan kewenangan tindakan. |

Format penulisan struktur:

```text
Nama unit/tingkatan - nama pimpinan atau petugas (singkatan)
```

Contoh: `BIN Daerah (Binda) - Kepala BIN Daerah (Kabinda)`.

## Hierarki Organisasi Dan Role

| Tingkat | Unit/Tingkatan | Pimpinan atau Petugas | Cakupan |
| --- | --- | --- | --- |
| Nasional | Badan Intelijen Negara (BIN) | Kepala BIN (KaBIN) | Seluruh Indonesia |
| Kedeputian | Kedeputian II | Deputi II | Seluruh wilayah dalam domain Kedeputian II |
| Direktorat | Direktorat 21-25 | Direktur 21-25 | Beberapa provinsi sesuai supervisi |
| Provinsi | BIN Daerah (Binda) | Kepala BIN Daerah (Kabinda) | Satu provinsi |
| Kabupaten/Kota | Koordinator Wilayah Kabupaten/Kota | Koordinator Wilayah (Korwil) | Satu kabupaten/kota |
| Kecamatan | Petugas Wilayah Kecamatan | Petugas Wilayah (Gaswil) | Satu atau beberapa kecamatan |
| Lapangan | Jaring | Jaring | Wilayah atau penugasan tertentu |

Aturan penting:

- Petugas Wilayah (Gaswil) berada pada tingkat kecamatan.
- Koordinator Wilayah (Korwil) berada pada tingkat kabupaten/kota.
- Gaswil berada di bawah koordinasi Korwil.
- Korwil berada di bawah pengendalian Binda.
- Jaring berada di bawah binaan Petugas Wilayah (Gaswil).
- Label UI untuk entitas Jaring tetap `Jaring`, bukan `Jaring Lapangan`.

## Hubungan Komando Dan Supervisi

| Konsep | Label UI kanonis | Catatan |
| --- | --- | --- |
| Hubungan Komando dan Supervisi | Hubungan Komando dan Supervisi | Judul diagram/halaman untuk struktur dua lajur. |
| Garis Komando Kewilayahan | Garis Komando Kewilayahan | Lajur kiri: BIN Pusat -> BIN Daerah (Binda) -> Koordinator Wilayah (Korwil) -> Petugas Wilayah (Gaswil) -> Jaring. |
| Garis Supervisi BIN Pusat | Garis Supervisi BIN Pusat | Lajur kanan: Kedeputian II -> Direktorat 21-25 -> BIN Daerah (Binda). |
| Titik temu Binda | BIN Daerah (Binda) | Binda menjadi titik temu komando kewilayahan dan supervisi Direktorat. |
| BIN Pusat | BIN Pusat | Dipimpin Kepala BIN (KaBIN), tingkat nasional. |
| Kedeputian II | Kedeputian II | Dipimpin Deputi II, cakupan nasional dalam domainnya. |
| Direktorat 21 | Direktorat 21 | Dipimpin Direktur 21. |
| Direktorat 22 | Direktorat 22 | Dipimpin Direktur 22. |
| Direktorat 23 | Direktorat 23 | Dipimpin Direktur 23. |
| Direktorat 24 | Direktorat 24 | Dipimpin Direktur 24. |
| Direktorat 25 | Direktorat 25 | Dipimpin Direktur 25. |
| WhatsApp Center | WhatsApp Center | Nama kanal/fungsi operasional; WhatsApp tetap nama produk. |

Narasi kanonis diagram: "Diagram menunjukkan dua jalur sejajar: Komando kewilayahan dari BIN Pusat -> BIN Daerah (Binda) -> Koordinator Wilayah (Korwil) -> Petugas Wilayah (Gaswil) -> Jaring; Supervisi pusat dari Kedeputian II -> Direktorat 21-25 -> BIN Daerah (Binda) sesuai pembagian provinsi. BIN Daerah (Binda) menjadi titik pertemuan antara garis komando kewilayahan dan supervisi Direktorat."

## Hubungan Direktorat Dengan Binda

Kedeputian II membawahi:

- Direktorat 21 - dipimpin Direktur 21.
- Direktorat 22 - dipimpin Direktur 22.
- Direktorat 23 - dipimpin Direktur 23.
- Direktorat 24 - dipimpin Direktur 24.
- Direktorat 25 - dipimpin Direktur 25.

Setiap Direktorat menyupervisi beberapa Binda berdasarkan pembagian provinsi. Pembagian ini harus menjadi master data dinamis sehingga Admin Sistem dapat menentukan relasi:

```text
Direktorat -> Provinsi -> Binda yang disupervisi
```

Direktorat hanya boleh melihat data dari provinsi dalam wilayah supervisinya, termasuk seluruh Korwil, Gaswil, Jaring, dan produk informasi di bawah Binda tersebut.

## Fungsi Anev

Anev adalah fungsi analisis dan evaluasi, bukan tingkat wilayah. Fungsi Anev dapat diberikan kepada pengguna tertentu tanpa mengubah unit organisasi atau role teknisnya.

| Fungsi | Tingkat | Pelaksana yang dapat ditunjuk |
| --- | --- | --- |
| Anev Kabupaten/Kota | Kabupaten/Kota | Korwil atau personel yang ditunjuk |
| Anev Binda | Provinsi | Kabaops, Kasubdit, atau personel Binda |
| Anev Direktorat | Pusat | Personel Direktorat 21-25 |
| Anev Kedeputian | Pusat | Personel Kedeputian II |

## Integrasi Dan Notifikasi

| Konsep | Label UI kanonis | Catatan |
| --- | --- | --- |
| Integrasi WhatsApp | Integrasi WhatsApp | Menu Admin Sistem untuk koneksi WhatsApp Center dan nomor pengirim. |
| Log Aktivitas WhatsApp | Log Aktivitas WhatsApp | Menu Admin Sistem untuk riwayat status login, logout, terputus, dan error sesi WhatsApp. |
| Notifikasi WhatsApp | Notifikasi WhatsApp | Menu Admin Sistem untuk penerima email notifikasi status WhatsApp. |
| Pengaturan SMTP | Pengaturan SMTP | Menu Admin Sistem untuk konfigurasi server email custom. SMTP tetap istilah teknis. |
| Role dan Hak Akses | Role dan Hak Akses | Menu Admin Sistem untuk pengelolaan role, kewenangan tindakan, dan cakupan akses. |
| Jabatan dan Alur Pelaporan | Jabatan dan Alur Pelaporan | Menu Admin Sistem untuk relasi jabatan dan alur pelaporan. |

Contoh pemisahan jabatan dan fungsi:

```text
Jabatan: Kasubdit
Unit: Binda Riau
Fungsi sistem: Anev Binda
Cakupan: Provinsi Riau
```

## Cakupan Hak Akses

Prinsip akses: pengguna dapat melihat data unitnya dan seluruh unsur di bawahnya, tetapi tidak dapat melihat unit lain yang sejajar atau berada di luar wilayah kewenangannya.

| Role | Data yang dapat diakses |
| --- | --- |
| Kepala BIN (KaBIN) | Seluruh data nasional |
| Deputi II | Seluruh data nasional dalam domain Kedeputian II |
| Direktur/Anev Direktorat | Seluruh data provinsi yang disupervisi Direktoratnya |
| Kabinda/Anev Binda | Seluruh data dalam satu provinsi |
| Korwil | Seluruh data dalam satu kabupaten/kota |
| Gaswil | Kecamatan penugasan dan Jaring binaannya |
| Jaring | Kiriman miliknya sendiri melalui WhatsApp Center |

### Aturan Khusus Supervisi DKI Jakarta

Aturan ini berlaku untuk hubungan supervisi Direktorat/Ditwil, bukan perubahan garis komando kewilayahan. Garis komando DKI tetap: Binda DKI/Kabinda -> Korwil -> Gaswil -> Jaring.

- Provinsi selain DKI Jakarta memakai cakupan supervisi tingkat provinsi: Direktorat/Ditwil -> Provinsi.
- Provinsi DKI Jakarta memakai cakupan supervisi tingkat kota/kabupaten administratif: Direktorat/Ditwil -> Kota/Kabupaten DKI.
- Jangan hardcode pasangan Direktorat/Ditwil dengan kota/kabupaten DKI di source code.
- Mapping supervisi DKI harus ditentukan oleh admin melalui assignment berbasis database/configuration.
- Admin dapat memberi atau memindahkan cakupan supervisi pengguna Direktorat/Ditwil ke Jakarta Selatan, Jakarta Pusat, Jakarta Barat, Jakarta Timur, Jakarta Utara, atau Kabupaten Administrasi Kepulauan Seribu sesuai data wilayah aktif.
- Simpan cakupan supervisi pengguna melalui `UserOperationalAssignment` dan `UserAreaScope`; sistem akses, filter, dashboard, laporan, dan query supervisi harus membaca cakupan aktif tersebut.
- Untuk Direktorat/Ditwil: DKI Jakarta tidak boleh dipilih sebagai provinsi tunggal. Pilih kota/kabupaten administratif DKI sebagai cakupan supervisi.

Contoh pembatasan:

- Direktorat 21 tidak dapat melihat wilayah Direktorat 22.
- Binda Riau tidak dapat melihat data Binda provinsi lain.
- Korwil Pekanbaru tidak dapat melihat kabupaten/kota lain.
- Gaswil tidak dapat melihat data Gaswil lain.
- Jaring tidak dapat melihat laporan Jaring lain.

Hak akses tidak boleh hanya ditentukan oleh nama jabatan. Sistem harus menghitung akses berdasarkan:

```text
role + fungsi + unit organisasi + wilayah penugasan + kewenangan tindakan
```

Setiap akun pengguna minimal memiliki:

```text
user_id
nama
jabatan
role
fungsi
unit_organisasi
direktorat_id
binda_id
provinsi_id
kabupaten_kota_id
kecamatan_id
wilayah_penugasan
atasan_langsung
status_akun
```

Kewenangan tindakan dipisahkan menjadi:

- Lihat.
- Buat.
- Ubah.
- Verifikasi.
- Kembalikan untuk perbaikan.
- Tolak.
- Setujui.
- Teruskan.
- Disposisi.
- Berikan arahan.
- Tutup tindak lanjut.
- Ekspor.
- Kelola pengguna.

## Entitas Operasional

| Konsep | Label UI kanonis | Hindari | Catatan |
| --- | --- | --- | --- |
| Jaring | Jaring | agen, handler, Jaring Lapangan | Nama entitas cukup Jaring. Jangan tambahkan "Lapangan" pada label UI. |
| Nama Jaring | Nama Jaring | nama agen | Identitas Jaring. |
| Foto Jaring | Foto Jaring | avatar agen | Untuk foto profil Jaring. |
| Nomor WhatsApp | Nomor WhatsApp | nomor WA jika ruang cukup | WhatsApp adalah nama produk, tetap Inggris. |
| Kode Jaring | Kode Jaring | pin jaring lama | Pakai hanya bila konsep kode masih aktif. |
| Laporan Jaring | Laporan Jaring | report Jaring, kategori kelengkapan | Untuk informasi masuk dari Jaring. Live location wajib saat dikirim melalui bot WhatsApp, sehingga Laporan Jaring tidak memakai kategori kelengkapan. |
| Siap Dibuat Baket | Siap Dibuat Baket | Belum diverifikasi laporan | Status proses Laporan Jaring setelah dikirim dan sebelum dibuat menjadi Baket. |
| Baket Dibuat | Baket Dibuat | Laporan terverifikasi | Status proses Laporan Jaring yang sudah memiliki Bahan Keterangan (Baket). |
| Bahan Keterangan | Bahan Keterangan (Baket) | Baket (Bahan Keterangan) | Urutan kanonis: Bahan Keterangan (Baket). |
| Draf Baket | Draf Baket | Draft Baket | Gunakan Draf untuk UI Indonesia. |
| Baket Tervalidasi | Baket Tervalidasi | Validated Baket | Sesuai state validasi aktual. |
| Riwayat Pembinaan Jaring | Riwayat Pembinaan Jaring | History Pembinaan Jaring | Hindari History di UI. |
| Peta Jejaring Intelijen | Peta Jejaring Intelijen | Maps Intelijen Network | Maps/Network jangan dipakai untuk label UI utama. |
| Integrasi WhatsApp | Integrasi WhatsApp | WA Integration | WhatsApp tetap nama produk. |
| Log Aktivitas WhatsApp | Log Aktivitas WhatsApp | WA activity log | Untuk audit aktif, logout, terputus, dan error sesi WhatsApp. |
| Notifikasi WhatsApp | Notifikasi WhatsApp | WA notification settings | Menu pengaturan penerima email notifikasi status sesi WhatsApp. |
| Produk Intelijen | Produk Intelijen | intelligence product | Untuk UI utama. |
| Laporan Informasi | Laporan Informasi | information report | Jenis Laporan Intelijen berbasis informasi dari analisis atau Baket sumber. |
| Laporan Intelijen | Laporan Intelijen | intelligence report | Label menu generik untuk akses lintas role. |
| Laporan Intelijen Binda | Laporan Intelijen Binda | regional intelligence report | Sesuai produk/laporan level Binda. |
| Laporan Intelijen Direktorat | Laporan Intelijen Direktorat | directorate intelligence report | Sesuai produk/laporan level Direktorat. |
| Produk Kedeputian II | Produk Kedeputian II | deputy product | Sesuai output level Kedeputian. |
| Direktif | Direktif | directive untuk UI | Identifier teknis tetap directive. |
| UUK/STR | UUK/STR | terjemahan bebas | Singkatan domain tetap dipertahankan. |

## Jenis Produk Informasi

| Produk | Pembuat/Pengolah | Hasil |
| --- | --- | --- |
| Laporan Jaring | Jaring melalui WhatsApp Center | Informasi awal lapangan |
| Draf Baket | Petugas Wilayah (Gaswil) atau Koordinator Wilayah (Korwil) sesuai hak akses | Penyusunan awal dari satu atau beberapa Laporan Jaring |
| Baket Tervalidasi | Koordinator Wilayah (Korwil) | Bahan Keterangan tingkat kabupaten/kota |
| Laporan Intelijen Binda | Anev Binda | Produk intelijen tingkat provinsi |
| Laporan Intelijen Direktorat | Anev Direktorat | Produk gabungan beberapa provinsi |
| Produk Kedeputian II | Kedeputian II | Produk intelijen tingkat pusat |

Istilah baku yang digunakan:

```text
Bahan Keterangan (Baket)
```

Jangan menulis `BAKET`, `Baket (Bahan Keterangan)`, atau `Draft Baket` untuk label UI.

Aturan Laporan Jaring dan Baket:

1. Laporan Jaring tidak memakai tahap verifikasi laporan.
2. Setelah Laporan Jaring dikirim, laporan langsung berstatus `Siap Dibuat Baket` sesuai cakupan wilayah, hierarki, dan hak akses.
3. Kategori tidak menjadi milik Laporan Jaring. Kategori ditentukan saat Bahan Keterangan (Baket) dibuat atau diperbarui.
4. Relasi sumber Laporan Jaring ke Bahan Keterangan (Baket) harus tetap dapat ditelusuri melalui data sumber/versi Baket.

Urutan kategori pada seluruh filter dan pilihan kategori mengikuti IPOLEKSOSBUDHANKAM:

1. Ideologi
2. Politik
3. Ekonomi
4. Sosial
5. Budaya
6. Pertahanan
7. Keamanan

Kategori lain yang belum masuk urutan kanonis tetap ditampilkan setelah tujuh kategori tersebut secara alfabetis.

## Flow Laporan Bottom-Up

Alur informasi lapangan bergerak dari bawah ke atas:

```text
Jaring -> Petugas Wilayah (Gaswil) -> Koordinator Wilayah (Korwil) -> BIN Daerah (Binda) -> Direktorat terkait -> Kedeputian II -> Deputi II -> Kepala BIN (KaBIN)
```

Urutan proses:

1. Jaring mengirim Laporan Jaring melalui WhatsApp Center.
2. Petugas Wilayah (Gaswil) menerima, mengklarifikasi bila diperlukan, dan dapat menyusun Draf Baket sesuai wilayah penugasan.
3. Koordinator Wilayah (Korwil) mengendalikan Gaswil serta dapat menyusun atau memvalidasi Baket tingkat kabupaten/kota sesuai hak akses.
4. Baket Tervalidasi diteruskan kepada BIN Daerah (Binda).
5. Anev Binda mengolah Baket menjadi Laporan Intelijen Binda.
6. Kepala BIN Daerah (Kabinda) melakukan pengendalian atau persetujuan sesuai workflow.
7. Laporan dikirim ke Direktorat yang menyupervisi Binda tersebut.
8. Anev Direktorat mengolah laporan dari beberapa provinsi.
9. Direktur mengendalikan atau menyetujui produk Direktorat.
10. Produk diteruskan kepada Kedeputian II.
11. Deputi II memberikan persetujuan, disposisi, atau arahan lebih lanjut.
12. Produk tertentu dapat diteruskan kepada Kepala BIN (KaBIN) sesuai kewenangan.

## Flow Arahan Top-Down

Arahan perintah, supervisi, dan tindak lanjut berjalan dari atas ke bawah:

```text
Kepala BIN (KaBIN) -> Deputi II -> Direktur -> Kepala BIN Daerah (Kabinda) -> Koordinator Wilayah (Korwil) -> Petugas Wilayah (Gaswil) -> Jaring
```

Setiap arahan harus memiliki:

- Pengirim dan penerima.
- Wilayah sasaran.
- Isi arahan.
- Batas waktu.
- Status pelaksanaan.
- Bukti tindak lanjut.
- Catatan evaluasi.
- Audit trail.

## Wilayah Dan Lokasi

| Konsep | Label UI kanonis | Catatan |
| --- | --- | --- |
| Wilayah Penugasan | Wilayah Penugasan | Area tugas personel atau assignment. |
| Kecamatan Penugasan | Kecamatan Penugasan | Untuk cakupan Gaswil/Petugas Wilayah (Gaswil) tingkat kecamatan. |
| Wilayah Penempatan Jaring | Wilayah Penempatan Jaring | Area registrasi/placement Jaring. |
| Lokasi Terdaftar Jaring | Lokasi Terdaftar Jaring | Alamat atau area administratif registrasi Jaring. |
| Lokasi Aktual Laporan | Lokasi Aktual Laporan | Lokasi kejadian/laporan, termasuk Live Location bila tersedia. |
| Gaswil/Wilayah Cakupan | Gaswil/Wilayah Cakupan | Gunakan saat menjelaskan coverage personel/Jaring. |
| Status Kesesuaian Lokasi dengan Wilayah Penugasan | Status Kesesuaian Lokasi dengan Wilayah Penugasan | Jangan ditebak dari string nama wilayah. |
| Kecamatan | Kecamatan | Level administratif. |
| Kelurahan/Desa | Kelurahan/Desa | Jangan ditukar dengan Kecamatan. |
| Kota/Kabupaten | Kota/Kabupaten | Gunakan sesuai data administratif. |
| Provinsi | Provinsi | Level administratif. |

## Status Dan Aksi Umum

| Konsep | Label UI kanonis | Hindari |
| --- | --- | --- |
| Sudah diverifikasi | Terverifikasi | Verified |
| Belum diverifikasi | Belum terverifikasi | Unverified |
| Menunggu | Menunggu | Pending jika bukan identifier teknis |
| Diproses | Diproses | Processing |
| Selesai | Selesai | Done/Completed |
| Ditolak | Ditolak | Rejected |
| Disetujui | Disetujui | Approved |
| Dibatalkan | Dibatalkan | Cancelled |
| Memuat data | Memuat data | Loading data |
| Memuat halaman | Memuat halaman | Loading page |
| Simpan | Simpan | Save |
| Batalkan | Batalkan | Cancel |
| Hapus | Hapus | Delete |
| Ubah | Ubah | Edit jika bukan tombol teknis umum |
| Lihat Detail | Lihat Detail | View Details |
| Coba Lagi | Coba Lagi | Retry |

## Istilah Inggris Yang Boleh Dipertahankan

| Istilah | Alasan |
| --- | --- |
| Dashboard | Sudah lazim untuk halaman ringkasan aplikasi. Pakai konsisten, jangan campur dengan Dasbor kecuali seluruh aplikasi diganti. |
| WhatsApp | Nama produk. |
| Live Location | Nama fitur WhatsApp. Jika perlu penjelasan, tulis "Live Location WhatsApp". |
| API | Istilah teknis. Jangan tampilkan ke user operasional kecuali di halaman admin/teknis. |
| Export | Boleh sebagai istilah teknis, tetapi prefer "Ekspor" untuk tombol UI. |
| Import | Boleh sebagai istilah teknis, tetapi prefer "Impor" untuk tombol UI. |
| Login | Boleh pada halaman autentikasi jika sudah konsisten; jangan campur dengan "Masuk" di halaman yang sama. |

## Larangan Konsistensi

- Jangan pakai "Handler" untuk UI Petugas Wilayah (Gaswil).
- Jangan pakai "Jaring Lapangan"; pakai "Jaring".
- Jangan pakai "Maps Intelijen Network"; pakai "Peta Jejaring Intelijen".
- Jangan pakai "History Pembinaan Jaring"; pakai "Riwayat Pembinaan Jaring".
- Jangan pakai "Baket (Bahan Keterangan)"; pakai "Bahan Keterangan (Baket)".
- Jangan menampilkan `readAt` global sebagai "dibaca petugas" bila belum ada receipt per aktor.
- Jangan menyimpulkan status lokasi dari kemiripan nama wilayah.
- Jangan mengganti role teknis karena label bisnis terlihat mirip.

## Checklist Audit Copy

Untuk setiap revisi, minimal cek file yang disentuh dan permukaan yang terkait:

- Sidebar dan role label: `apps/fe/src/navigation/sidebar/`
- Glosarium kode: `apps/fe/src/lib/domain/terminology.ts`
- Judul halaman, tab, dan breadcrumb.
- Filter, placeholder search, label form, dan helper text.
- Kolom tabel, badge, ringkasan KPI, empty/loading/error state.
- Toast/dialog/action confirmation.
- Export/import column label.
- Dokumentasi bila istilah juga muncul di docs.
