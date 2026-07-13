# Wilayah dan Sumber Baket pada Laporan Intelijen

## Goal
Memetakan koordinat Baket ke wilayah administratif dari `apps/wilayah` dan menampilkan nama user Field Officer pengirim sebagai sumber informasi.

## Tasks
- [x] Perbaiki parser poligon wilayah sederhana pada seed PostGIS. Verify: poligon Kota Pekanbaru dari kode `14.71` terimpor.
- [x] Gunakan pencocokan point-in-polygon paling spesifik dan perbaiki Baket lama yang belum terpetakan. Verify: titik `0.4796574, 101.4314333` tersimpan sebagai Kota Pekanbaru.
- [x] Muat hierarki wilayah dan identitas user pengirim pada response analisis/produk. Verify: response memiliki wilayah beserta parent dan profil user/auth user.
- [x] Hilangkan fallback koordinat dan role dari tabel jurnal. Verify: kolom daerah berisi nama wilayah dan sumber berisi nama user.
- [x] Jalankan seed/perbaikan data serta validasi backend dan frontend. Verify: query DB, test/build backend, dan type-check/build frontend lulus.

## Done When
- [x] Preview dan PDF menampilkan `Kota Pekanbaru, Riau` serta nama user Field Officer pengirim untuk Baket contoh.

## Notes
- Data kode dan poligon bersumber dari `apps/wilayah/db/wilayah.sql` dan `apps/wilayah/db/wilayah_level_1_2.sql`.
- Koordinat tetap disimpan untuk bukti lokasi dan peta, tetapi tidak dipakai sebagai teks Daerah Kejadian.
