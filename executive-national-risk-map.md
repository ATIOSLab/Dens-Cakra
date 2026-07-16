# Penyempurnaan Peta Kerawanan Nasional

## Goal

Membuat marker peta membuka hasil analisa dalam dialog, memindahkan area bawah peta menjadi daftar Baket dua kolom, menyediakan pilihan gaya peta 2D/3D, dan menambahkan kepanjangan DENS CAKRA pada login.

## Tasks

- [x] Audit data marker, inspector, komponen peta, dan login yang aktif. Verify: route Executive memakai `NationalMap` dan login memakai header lokal.
- [x] Tambahkan pemilih Default, OpenStreetMap, dan OpenStreetMap 3D. Verify: style dan pitch berubah sesuai opsi.
- [x] Buka `MapInspector` sebagai dialog saat marker atau kartu Baket dipilih. Verify: dialog langsung tampil dan tetap menunjukkan loading/detail API.
- [x] Ganti inspector bawah peta dengan kartu Baket responsif dua kolom. Verify: kartu mengikuti filter aktif dan dapat membuka analisa.
- [x] Tambahkan kepanjangan DENS CAKRA di bawah judul login. Verify: teks tampil di dalam header kartu login.
- [x] Jalankan format, lint/type check terarah, dan build frontend. Verify: perubahan lolos pemeriksaan tanpa error baru.

## Done When

- [x] Semua perilaku baru bekerja pada route Executive tanpa mengubah kontrak backend atau primitive UI bersama.

## Notes

- Pertahankan semantic theme tokens, route, dan pola visual DENS CAKRA yang sudah ada.
- Jangan menyentuh perubahan backend yang sudah berada di working tree.
