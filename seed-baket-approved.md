# Seed Baket Terverifikasi

## Goal

Menambahkan seed Baket nasional yang konsisten dengan klaster Jaring, kategori laporan, penugasan Field Officer, dan verifikasi OIM.

## Tasks

- [x] Audit model dan alur status Baket -> Verify: `VERIFIED` adalah status final Baket dan verifikasinya.
- [x] Tambahkan upsert klaster serta kategori -> Verify: seed dapat dijalankan ulang tanpa duplikasi.
- [x] Tambahkan Jaring dan Baket terverifikasi per rantai wilayah -> Verify: setiap Baket memiliki kategori, klaster, versi, task, dan OIM verifier.
- [x] Integrasikan `seed:baket` ke `seed:all` -> Verify: urutan berjalan setelah seed STR.
- [x] Jalankan build, lint, seed, dan query count -> Verify: data relasional dan status akhir sesuai.

## Done When

- [x] Seed menghasilkan data Baket `VERIFIED` yang tersebar pada seluruh rantai OIM aktif dan aman dijalankan berulang.

## Notes

Istilah permintaan "approved" dipetakan ke status domain Baket `VERIFIED` beserta `BaketVerification` yang selesai.
