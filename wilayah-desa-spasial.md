# Resolusi Wilayah Baket sampai Desa/Kelurahan

## Tujuan

Koordinat Baket harus dipetakan ke wilayah administrasi paling spesifik yang tersedia, sampai tingkat desa/kelurahan, lalu ditampilkan sebagai rantai wilayah lengkap pada jurnal Laporan Intelijen.

## Sumber data

- Hierarki dan nama wilayah: `apps/wilayah/db/wilayah.sql`.
- Batas provinsi dan kabupaten/kota: `apps/wilayah/db/wilayah_level_1_2.sql`.
- Batas kecamatan dan desa/kelurahan: `cahyadsn/wilayah_boundaries`, dipatok pada commit `a386adb9ae54245935b2ef2c8351e14a74852cad` agar impor dapat direproduksi.

## Rancangan

- Importer membaca file SQL batas per provinsi dan kabupaten/kota, mengubah pasangan koordinat `[lat, lng]` menjadi geometri PostGIS `[lng, lat]`, lalu melakukan upsert ke `AdministrativeAreaBoundary`.
- Importer dapat mengambil dataset dari clone lokal melalui `--source-dir`, atau dari raw GitHub apabila direktori lokal tidak diberikan.
- Scope `--province` disediakan agar pengisian dan pembaruan dapat dilakukan bertahap tanpa harus mengunduh seluruh Indonesia sekaligus.
- Resolver memakai `ST_Covers` dan urutan tingkat paling spesifik: desa/kelurahan, kecamatan, kabupaten/kota, lalu provinsi.
- Repair Baket memproses ulang seluruh versi yang memiliki koordinat sehingga hasil lama yang baru sampai kota dapat ditingkatkan ke desa/kelurahan setelah batas baru tersedia.
- API mengirim rantai parent sampai provinsi dan UI jurnal menampilkan rantai tersebut secara lengkap.

## Verifikasi

- Impor batas Provinsi Riau (`14`).
- Pastikan titik contoh `0.4796574, 101.4314333` tidak lagi berhenti di Kota Pekanbaru apabila poligon desa/kelurahan tersedia.
- Jalankan repair Baket dan periksa `eventAreaId`, `areaResolutionMethod`, dan label jurnal.
- Jalankan build backend, pemeriksaan TypeScript frontend, serta pengujian spasial terarah.
